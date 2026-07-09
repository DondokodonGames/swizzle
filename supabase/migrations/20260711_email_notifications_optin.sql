-- WP60 P2-4: メール通知（フォロー/いいね/週間ダイジェスト）のオプトイン列
--
-- 既定値は false（オプトイン）。既存の NotificationSettings.emailNotifications は
-- localStorage のみでサーバーから見えず、実際にメールを送るには使えなかったため、
-- profiles にサーバー側で参照できるフラグを追加する。

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN NOT NULL DEFAULT false;
