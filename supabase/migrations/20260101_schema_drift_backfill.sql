-- =============================================================
-- Migration: スキーマドリフト解消 — 本番稼働中だがmigrationが無かったテーブルの backfill
-- Date: 2026-07-09 (WP60 P0-5)
--
-- 背景:
--   src/lib/database.types.ts が14テーブルを定義する一方、supabase/migrations/ に
--   CREATE TABLE があるのは一部のみ。profiles / user_games を含む以下のテーブルは
--   本番では手動SQL（SUPABASE_SETUP.md等）で作成されたまま migration 化されておらず、
--   新規/クリーンなSupabaseプロジェクトに migrations を適用するだけではアプリが
--   起動しない状態だった（詳細: docs/work-plans/60-platform-gaps-roadmap.md P0-5）。
--
-- ⚠️ 重要 — 適用前に必ず確認すること:
--   このファイルは database.types.ts とコードベース中のクエリパターン（RLS要件の推定）
--   から「本番スキーマはこうなっているはず」を再構築したものであり、実際の本番DBに対して
--   `supabase db diff` で差分を取って検証していない。
--   全ての CREATE TABLE は IF NOT EXISTS、全ての CREATE POLICY は pg_policies の存在チェック
--   越しに実行されるため、既に本番にテーブルが存在する場合は安全に no-op になる設計。
--
--   実施した検証（本番DBへの接続は無いため、これで代替した）:
--   ローカルの Postgres 16 に auth スキーマ/ロール(anon/authenticated/service_role)を
--   最小限スタブした上で、supabase/migrations/ 配下の全ファイルを日付順に実際に適用し、
--   `CREATE TABLE` 22件が全てエラー無く完了することを確認済み。この過程で以下の
--   実在するバグ（本コミットで併せて修正）を発見した:
--     - 20260522_nfc_spots.sql / 20260522_sns_features.sql が
--       `game_id uuid REFERENCES user_games(id)` としていたが、user_games.id は実際は
--       TEXT（increment_game_play_count(p_game_id TEXT) 等と整合）で、型不一致により
--       CREATE TABLE 自体が失敗することを実機確認した。両ファイルの game_id を
--       text に修正済み。
--     - 20260321_* の4ファイルは全て同日付のため、素朴なファイル名アルファベット順だと
--       `billing_transition_hardening` が `pay_per_play`(credit_purchases/subscriptions
--       を作成)より先に走ってしまい失敗する。新規ブートストラップ時は
--       pay_per_play → pay_per_play_rls_hardening → billing_transition_hardening →
--       security_hardening の順で明示的に適用すること（ファイル名のリネームはしていない
--       — 本番で適用済みの migration をリネームすると Supabase のトラッキングが
--       「未適用」と誤認し、billing_transition_hardening 内の非冪等な
--       `ADD CONSTRAINT credit_purchases_stripe_session_id_unique` が再実行され
--       "constraint already exists" で本番デプロイが壊れるリスクがあるため）。
--   本番適用前には、上記に加えてステージング/クローンDBで実際の `supabase db reset` に
--   よる再検証を推奨する（今回のローカル検証はSupabase CLI自体は使っていない）。
--
-- 対象外: game_scores は database.types.ts に型があるがコード内で一切使用されていない
--   （ベストスコアは BestScoreStore.ts の localStorage のみ）ため、テーブル追加ではなく
--   型定義そのものを database.types.ts から削除した（本コミットの別ファイル差分を参照）。
-- =============================================================

-- ---------------------------------------------------------------
-- 1. profiles — ユーザープロフィール拡張（auth.users 1:1）
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id                            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username                      TEXT NOT NULL UNIQUE,
  display_name                  TEXT,
  avatar_url                    TEXT,
  bio                           TEXT,
  language                      TEXT NOT NULL DEFAULT 'en',
  age                           INTEGER,
  requires_parental_oversight   BOOLEAN NOT NULL DEFAULT false,
  is_admin                      BOOLEAN NOT NULL DEFAULT false,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- is_admin は 20260512_profiles_is_admin.sql で ADD COLUMN IF NOT EXISTS 済みだが、
-- このテーブル自体が無い新規プロジェクトのためここでも列定義に含めておく。

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: 公開プロフィール情報として全員に開放（フィード上のクリエイター表示に必須）
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_select_public') THEN
    CREATE POLICY "profiles_select_public" ON public.profiles FOR SELECT USING (true);
  END IF;
END $$;

-- INSERT: 自分の行のみ（サインアップ時の upsert）
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_insert_own') THEN
    CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;
-- profiles_update_own / profiles_select_own は 20260512_profiles_is_admin.sql が
-- is_admin 列の自己昇格防止つきで定義済み。

-- ---------------------------------------------------------------
-- 2. user_games — ユーザー作成ゲーム
--    id は UUID ではなく TEXT。根拠: 20260512_user_games_rls.sql の
--    increment_game_play_count(p_game_id TEXT) と、20260425_game_payments.sql の
--    `game_id text primary key references user_games(id)` (game_payment_config) から
--    実際の主キー型が TEXT であることが確認できる。
--
--    ai_generated / ai_quality_score は database.types.ts に無いが、
--    20260610_user_games_review_status.sql が `WHERE ai_generated = true` を
--    前提にしており、src/ai/publishers/SupabaseUploader.ts が両カラムに書き込んでいる
--    ため、後続migrationのADD COLUMNを待たず基本列としてここに含める。
--
--    RLS ポリシーはここでは作らない — 20260512_user_games_rls.sql が
--    ENABLE ROW LEVEL SECURITY + SELECT/INSERT/UPDATE/DELETE の4ポリシーを
--    (このmigrationより後の日付として) 定義するので、それに委ねて重複を避ける。
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_games (
  id                TEXT PRIMARY KEY,
  creator_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT,
  template_id       TEXT NOT NULL,
  project_data      JSONB,
  thumbnail_url     TEXT,
  is_published      BOOLEAN NOT NULL DEFAULT false,
  is_featured       BOOLEAN NOT NULL DEFAULT false,
  play_count        INTEGER NOT NULL DEFAULT 0,
  like_count        INTEGER NOT NULL DEFAULT 0,
  ai_generated      BOOLEAN NOT NULL DEFAULT false,
  ai_quality_score  INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- 3. game_favorites
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.game_favorites (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id     TEXT NOT NULL REFERENCES public.user_games(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, game_id)
);

ALTER TABLE public.game_favorites ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'game_favorites' AND policyname = 'game_favorites_select_public') THEN
    CREATE POLICY "game_favorites_select_public" ON public.game_favorites FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'game_favorites' AND policyname = 'game_favorites_write_own') THEN
    CREATE POLICY "game_favorites_write_own" ON public.game_favorites
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ---------------------------------------------------------------
-- 4. likes
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.likes (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id     TEXT NOT NULL REFERENCES public.user_games(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, game_id)
);

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'likes' AND policyname = 'likes_select_public') THEN
    CREATE POLICY "likes_select_public" ON public.likes FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'likes' AND policyname = 'likes_write_own') THEN
    CREATE POLICY "likes_write_own" ON public.likes
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ---------------------------------------------------------------
-- 5. follows
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'follows' AND policyname = 'follows_select_public') THEN
    CREATE POLICY "follows_select_public" ON public.follows FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'follows' AND policyname = 'follows_write_own') THEN
    CREATE POLICY "follows_write_own" ON public.follows
      FOR ALL USING (auth.uid() = follower_id) WITH CHECK (auth.uid() = follower_id);
  END IF;
END $$;

-- ---------------------------------------------------------------
-- 6. notifications
--    INSERT はクライアントのfan-out-on-write実装（例: いいね時に相手へ通知を作成）を
--    許可しつつ、from_user_id の成りすましだけは防止する。
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type           TEXT NOT NULL CHECK (type IN ('reaction', 'like', 'follow', 'trending', 'milestone')),
  title          TEXT NOT NULL,
  message        TEXT NOT NULL,
  icon           TEXT,
  game_id        TEXT REFERENCES public.user_games(id) ON DELETE CASCADE,
  from_user_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata       JSONB,
  is_read        BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'notifications_select_own') THEN
    CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'notifications_insert_any_recipient') THEN
    CREATE POLICY "notifications_insert_any_recipient" ON public.notifications
      FOR INSERT WITH CHECK (from_user_id IS NULL OR auth.uid() = from_user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'notifications_update_own') THEN
    CREATE POLICY "notifications_update_own" ON public.notifications
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'notifications_delete_own') THEN
    CREATE POLICY "notifications_delete_own" ON public.notifications FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ---------------------------------------------------------------
-- 7. playlists
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.playlists (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  is_public    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'playlists' AND policyname = 'playlists_select_public_or_own') THEN
    CREATE POLICY "playlists_select_public_or_own" ON public.playlists
      FOR SELECT USING (is_public = true OR auth.uid() = creator_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'playlists' AND policyname = 'playlists_write_own') THEN
    CREATE POLICY "playlists_write_own" ON public.playlists
      FOR ALL USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
  END IF;
END $$;

-- ---------------------------------------------------------------
-- 8. playlist_games
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.playlist_games (
  playlist_id  UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  game_id      TEXT NOT NULL REFERENCES public.user_games(id) ON DELETE CASCADE,
  order_index  INTEGER NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (playlist_id, game_id)
);

ALTER TABLE public.playlist_games ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'playlist_games' AND policyname = 'playlist_games_select_via_playlist') THEN
    CREATE POLICY "playlist_games_select_via_playlist" ON public.playlist_games
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.playlists p
          WHERE p.id = playlist_games.playlist_id AND (p.is_public = true OR p.creator_id = auth.uid())
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'playlist_games' AND policyname = 'playlist_games_write_via_playlist') THEN
    CREATE POLICY "playlist_games_write_via_playlist" ON public.playlist_games
      FOR ALL USING (
        EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_games.playlist_id AND p.creator_id = auth.uid())
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_games.playlist_id AND p.creator_id = auth.uid())
      );
  END IF;
END $$;

-- ---------------------------------------------------------------
-- 9. game_shares
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.game_shares (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  game_id    TEXT NOT NULL REFERENCES public.user_games(id) ON DELETE CASCADE,
  platform   TEXT NOT NULL,
  shared_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.game_shares ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'game_shares' AND policyname = 'game_shares_select_public') THEN
    CREATE POLICY "game_shares_select_public" ON public.game_shares FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'game_shares' AND policyname = 'game_shares_insert_any') THEN
    -- 匿名シェアも計測したいため user_id IS NULL を許可しつつ、成りすましは防止
    CREATE POLICY "game_shares_insert_any" ON public.game_shares
      FOR INSERT WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
  END IF;
END $$;

-- ---------------------------------------------------------------
-- 10. activities (UserActivityFeed)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activities (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type  TEXT NOT NULL CHECK (activity_type IN (
                   'game_created', 'game_liked', 'game_shared', 'user_followed',
                   'achievement', 'comment', 'reaction', 'milestone', 'collaboration'
                 )),
  target_type    TEXT CHECK (target_type IN ('game', 'user')),
  target_id      TEXT,
  content        TEXT,
  metadata       JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_public      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activities' AND policyname = 'activities_select_public_or_own') THEN
    CREATE POLICY "activities_select_public_or_own" ON public.activities
      FOR SELECT USING (is_public = true OR auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activities' AND policyname = 'activities_insert_own') THEN
    CREATE POLICY "activities_insert_own" ON public.activities FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ---------------------------------------------------------------
-- 11. reactions (SimpleReactionSystem)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id        TEXT NOT NULL REFERENCES public.user_games(id) ON DELETE CASCADE,
  reaction_type  TEXT NOT NULL CHECK (reaction_type IN ('completed', 'fun', 'amazing', 'difficult', 'addictive', 'creative')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, game_id, reaction_type)
);

ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reactions' AND policyname = 'reactions_select_public') THEN
    CREATE POLICY "reactions_select_public" ON public.reactions FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reactions' AND policyname = 'reactions_write_own') THEN
    CREATE POLICY "reactions_write_own" ON public.reactions
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- reaction_counts ビュー: 20260428_fix_reaction_counts_security.sql が
-- `ALTER VIEW public.reaction_counts SET (security_invoker = true)` を実行するため、
-- ビュー自体がここで存在しないと新規プロジェクトではそのmigrationが失敗する。
-- アプリコードからの参照は無い(未使用)ため集計内容は保守的な最小構成にしてある。
CREATE OR REPLACE VIEW public.reaction_counts AS
SELECT game_id, reaction_type, COUNT(*) AS count
FROM public.reactions
GROUP BY game_id, reaction_type;

-- ---------------------------------------------------------------
-- 12. user_preferences (ContentDiscovery)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  favorite_categories   TEXT[] NOT NULL DEFAULT '{}',
  play_time             TEXT NOT NULL DEFAULT 'medium' CHECK (play_time IN ('short', 'medium', 'long')),
  difficulty            TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  gameplay_style        TEXT[] NOT NULL DEFAULT '{}',
  interaction_history    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_preferences' AND policyname = 'user_preferences_own_only') THEN
    CREATE POLICY "user_preferences_own_only" ON public.user_preferences
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ---------------------------------------------------------------
-- 13. subscriptions — Stripeサブスクリプション（webhook = service_role専用の書き込み）
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type              TEXT NOT NULL CHECK (plan_type IN ('free', 'premium')),
  status                 TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'trialing')),
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id        TEXT,
  current_period_start   TIMESTAMPTZ,
  current_period_end     TIMESTAMPTZ,
  trial_end              TIMESTAMPTZ,
  cancel_at              TIMESTAMPTZ,
  canceled_at            TIMESTAMPTZ,
  metadata               JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions (stripe_customer_id);

-- RLS: ENABLE のみここで行い、ポリシー自体は 20260321_billing_transition_hardening.sql
-- (このmigrationより後の日付) が SELECT/INSERT/UPDATE/DELETE を一括で定義するため委ねる。
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- 14. payments — 決済履歴（webhook = service_role専用の書き込み）
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount                    INTEGER NOT NULL,
  currency                  TEXT NOT NULL DEFAULT 'jpy',
  payment_type              TEXT NOT NULL CHECK (payment_type IN ('subscription', 'one_time', 'credit_topup', 'refund')),
  stripe_payment_intent_id  TEXT,
  stripe_charge_id          TEXT,
  stripe_invoice_id         TEXT,
  status                    TEXT NOT NULL CHECK (status IN ('succeeded', 'pending', 'failed', 'refunded', 'disputed')),
  description               TEXT,
  metadata                  JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id ON public.payments (stripe_payment_intent_id);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'payments_select_own') THEN
    CREATE POLICY "payments_select_own" ON public.payments FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;
