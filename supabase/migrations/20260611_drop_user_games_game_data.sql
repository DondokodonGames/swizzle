-- user_games から死蔵カラム game_data を廃止する（WP33 §2 / 承認シート #1+2）
--
-- 背景:
--   user_games には game_data(jsonb) と project_data(jsonb) の2カラムが残存していた。
--   現行コードは project_data のみを読み書きし、game_data を読む箇所は皆無
--   (src/ 全体で .game_data プロパティ参照 0件、convertToPublicGame も project_data のみ)。
--   通常の保存経路 (SupabaseUploader / ProjectStorageManager) は game_data に空 {} を
--   書くだけの残骸で、本マイグレーションと同じコミットで該当行を削除済み。
--   唯一 game_data に実データを書いていた SocialIntegration.publishProjectToSocial は
--   到達不能な死蔵コード(context に公開も呼び出し0)で、かつ project_data を書かないため
--   生成物は元々再生不能だった。これも同コミットで削除済み。
--
-- 注意:
--   game_data カラムを作成した元マイグレーションはこのリポジトリに存在しない
--   (テーブルは外部で作成)。本番適用前に、(a) game_data を参照する RLS/ビュー/関数が
--   無いこと、(b) 下記セーフガードが通ること(= 実データが game_data だけに残る行が無い)
--   を実 DB で確認すること。drop は不可逆。

-- ── セーフガード: game_data だけに実データを持つ行が無いことを確認 ──────────────
-- (万一 publishProjectToSocial 等で project_data=NULL かつ game_data に実体を持つ行が
--  本番に存在する場合、ここで停止して手動移行を促す。黙ってデータを破壊しない。)
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_games' AND column_name = 'game_data'
  ) THEN
    SELECT COUNT(*) INTO orphan_count
    FROM public.user_games
    WHERE project_data IS NULL
      AND game_data IS NOT NULL
      AND game_data::jsonb <> '{}'::jsonb;

    IF orphan_count > 0 THEN
      RAISE EXCEPTION
        'game_data drop 中止: project_data が空で game_data に実データを持つ行が % 件あります。先に game_data → project_data へ移行してください。', orphan_count;
    END IF;
  END IF;
END $$;

-- ── カラム削除 ───────────────────────────────────────────────────────────────
ALTER TABLE public.user_games
  DROP COLUMN IF EXISTS game_data;
