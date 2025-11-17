-- Supabase RLS (Row Level Security) Policies
-- 問題16対応: ユーザー認証とゲームの紐づけ
--
-- このスクリプトをSupabase SQL Editorで実行してください
-- https://supabase.com/dashboard → SQL Editor → New Query

-- ========================================
-- user_games テーブルのRLSポリシー
-- ========================================

-- 1. RLSを有効化
ALTER TABLE user_games ENABLE ROW LEVEL SECURITY;

-- 2. ユーザーは自分のゲームのみ閲覧可能（SELECT）
CREATE POLICY "Users can view their own games"
ON user_games
FOR SELECT
TO authenticated
USING (creator_id = auth.uid());

-- 3. 公開されたゲームは誰でも閲覧可能（SELECT）
CREATE POLICY "Public games are viewable by everyone"
ON user_games
FOR SELECT
TO authenticated, anon
USING (is_published = true);

-- 4. ユーザーは自分のゲームのみ作成可能（INSERT）
CREATE POLICY "Users can create their own games"
ON user_games
FOR INSERT
TO authenticated
WITH CHECK (creator_id = auth.uid());

-- 5. ユーザーは自分のゲームのみ更新可能（UPDATE）
CREATE POLICY "Users can update their own games"
ON user_games
FOR UPDATE
TO authenticated
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());

-- 6. ユーザーは自分のゲームのみ削除可能（DELETE）
CREATE POLICY "Users can delete their own games"
ON user_games
FOR DELETE
TO authenticated
USING (creator_id = auth.uid());

-- ========================================
-- profiles テーブルのRLSポリシー
-- ========================================

-- 7. RLSを有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 8. すべてのプロフィールは閲覧可能（SELECT）
CREATE POLICY "Profiles are viewable by everyone"
ON profiles
FOR SELECT
TO authenticated, anon
USING (true);

-- 9. ユーザーは自分のプロフィールのみ更新可能（UPDATE）
CREATE POLICY "Users can update their own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ========================================
-- likes テーブルのRLSポリシー
-- ========================================

-- 10. RLSを有効化
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- 11. すべてのいいねは閲覧可能（SELECT）
CREATE POLICY "Likes are viewable by everyone"
ON likes
FOR SELECT
TO authenticated, anon
USING (true);

-- 12. ユーザーは自分のいいねのみ作成可能（INSERT）
CREATE POLICY "Users can create their own likes"
ON likes
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 13. ユーザーは自分のいいねのみ削除可能（DELETE）
CREATE POLICY "Users can delete their own likes"
ON likes
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ========================================
-- follows テーブルのRLSポリシー
-- ========================================

-- 14. RLSを有効化
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- 15. すべてのフォロー情報は閲覧可能（SELECT）
CREATE POLICY "Follows are viewable by everyone"
ON follows
FOR SELECT
TO authenticated, anon
USING (true);

-- 16. ユーザーは自分のフォローのみ作成可能（INSERT）
CREATE POLICY "Users can create their own follows"
ON follows
FOR INSERT
TO authenticated
WITH CHECK (follower_id = auth.uid());

-- 17. ユーザーは自分のフォローのみ削除可能（DELETE）
CREATE POLICY "Users can delete their own follows"
ON follows
FOR DELETE
TO authenticated
USING (follower_id = auth.uid());

-- ========================================
-- notifications テーブルのRLSポリシー
-- ========================================

-- 18. RLSを有効化
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 19. ユーザーは自分の通知のみ閲覧可能（SELECT）
CREATE POLICY "Users can view their own notifications"
ON notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 20. ユーザーは自分の通知のみ更新可能（UPDATE - 既読管理）
CREATE POLICY "Users can update their own notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ========================================
-- game_favorites テーブルのRLSポリシー
-- ========================================

-- 21. RLSを有効化
ALTER TABLE game_favorites ENABLE ROW LEVEL SECURITY;

-- 22. ユーザーは自分のお気に入りのみ閲覧可能（SELECT）
CREATE POLICY "Users can view their own favorites"
ON game_favorites
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 23. ユーザーは自分のお気に入りのみ作成可能（INSERT）
CREATE POLICY "Users can create their own favorites"
ON game_favorites
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 24. ユーザーは自分のお気に入りのみ削除可能（DELETE）
CREATE POLICY "Users can delete their own favorites"
ON game_favorites
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ========================================
-- 確認クエリ
-- ========================================

-- RLSが有効になっているか確認
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_games', 'profiles', 'likes', 'follows', 'notifications', 'game_favorites');

-- 設定されたポリシーを確認
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
