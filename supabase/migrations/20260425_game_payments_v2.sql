-- game_payment_config にプレイ上限カラムを追加
alter table game_payment_config
  add column if not exists max_play_count integer not null default 3;
