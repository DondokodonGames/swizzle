-- Supabase Storage バケット設定
-- ゲームアセット（画像・音声）用ストレージ
--
-- このスクリプトをSupabase SQL Editorで実行してください
-- https://supabase.com/dashboard → SQL Editor → New Query
--
-- 注意: バケットが既に存在する場合はエラーになります

-- ========================================
-- game-assets バケットの作成
-- ========================================

-- 1. バケットを作成（公開アクセス可能）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'game-assets',
  'game-assets',
  true,  -- 公開バケット（ゲームプレイ時にアクセス可能）
  52428800,  -- 50MB制限
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/webm'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/webm'
  ];

-- ========================================
-- RLSポリシー設定
-- ========================================

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Service role can upload" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete" ON storage.objects;

-- 2. 公開読み取りアクセス（ゲームプレイ用）
CREATE POLICY "Public read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'game-assets');

-- 3. サービスロールのみアップロード可能（AI生成システム用）
CREATE POLICY "Service role can upload"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'game-assets');

-- 4. サービスロールのみ削除可能（ゲーム削除時）
CREATE POLICY "Service role can delete"
ON storage.objects
FOR DELETE
TO service_role
USING (bucket_id = 'game-assets');

-- ========================================
-- thumbnails バケットの作成（オプション）
-- ========================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'thumbnails',
  'thumbnails',
  true,
  1048576,  -- 1MB制限
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 1048576,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

-- thumbnails用ポリシー
DROP POLICY IF EXISTS "Public read thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Service role upload thumbnails" ON storage.objects;

CREATE POLICY "Public read thumbnails"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'thumbnails');

CREATE POLICY "Service role upload thumbnails"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'thumbnails');

-- ========================================
-- 確認クエリ
-- ========================================

-- バケット一覧を確認
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('game-assets', 'thumbnails');

-- ポリシーを確認
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects';
