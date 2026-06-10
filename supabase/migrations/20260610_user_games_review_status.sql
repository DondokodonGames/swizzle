-- user_games にレビューステータス列を追加(AI量産の品質ゲート用)
--
-- これまでAI生成ゲームは品質スコアに関係なく is_published = true で
-- 即時公開されていた。本マイグレーション以降、Orchestrator は
-- QUALITY_PUBLISH_THRESHOLD(既定 70)未満のゲームを
-- is_published = false / review_status = 'pending_review' で保存し、
-- 管理者が GameReviewQueue(AIゲームレビューUI)で承認/却下する。
--
-- 備考: ReviewQueue(ローカルJSON / Codexフロー)経由の保存は review_status を
-- 明示しないため、列デフォルト 'approved' がそのまま適用される(従来挙動を維持)。

-- ── 1. 列追加 ───────────────────────────────────────────────────────────────
ALTER TABLE public.user_games
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS ai_image_score INTEGER,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS review_notes TEXT;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_games_review_status_check'
  ) THEN
    ALTER TABLE public.user_games
      ADD CONSTRAINT user_games_review_status_check
      CHECK (review_status IN ('pending_review', 'approved', 'rejected'));
  END IF;
END $$;

-- ── 2. バックフィル ─────────────────────────────────────────────────────────
-- 公開済みの行は事実上承認済み。未公開のAI生成行は審査キューに入れる。
UPDATE public.user_games
SET review_status = 'approved'
WHERE is_published = true AND review_status <> 'approved';

UPDATE public.user_games
SET review_status = 'pending_review'
WHERE is_published = false
  AND ai_generated = true
  AND review_status = 'approved';

-- ── 3. 審査待ち一覧用の部分インデックス ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_games_review_status
  ON public.user_games (review_status)
  WHERE review_status = 'pending_review';

-- ── 4. 管理者用RLSポリシー ──────────────────────────────────────────────────
-- 既存ポリシー(20260512_user_games_rls.sql)は「公開済み or 自分の行」しか
-- SELECT できず、UPDATE は所有者のみ。管理者がブラウザから他ユーザー
-- (MASTER_USER等)所有のAI生成ゲームを審査・承認できるよう、
-- public.is_admin()(20260512_profiles_is_admin.sql)を使ったポリシーを追加する。
-- 生成パイプライン自体は service_role キーで RLS をバイパスするため影響なし。
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_games' AND policyname = 'user_games_admin_select'
  ) THEN
    CREATE POLICY "user_games_admin_select" ON public.user_games
      FOR SELECT USING (public.is_admin());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_games' AND policyname = 'user_games_admin_update'
  ) THEN
    CREATE POLICY "user_games_admin_update" ON public.user_games
      FOR UPDATE USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;
