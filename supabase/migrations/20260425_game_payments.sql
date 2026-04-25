-- game_payment_config: ゲームごとの課金設定
create table if not exists game_payment_config (
  game_id text primary key references user_games(id) on delete cascade,
  price_yen integer,           -- null = 無料
  payment_link_id text,        -- Stripe Payment Link ID (plink_xxx)
  payment_link_url text,       -- Stripe Payment Link URL
  nfc_tag_ref text,            -- NFCタグ設置場所メモ
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table game_payment_config enable row level security;

create policy "game_payment_config_select" on game_payment_config
  for select using (true);

-- one_time_access: Payment Link 決済後のアクセストークン
create table if not exists one_time_access (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  game_id text not null,
  stripe_session_id text not null unique,
  amount_paid_yen integer not null,
  created_at timestamptz default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  play_count integer default 0
);

create index if not exists idx_one_time_access_token on one_time_access(token);
create index if not exists idx_one_time_access_session on one_time_access(stripe_session_id);
create index if not exists idx_one_time_access_game on one_time_access(game_id);

alter table one_time_access enable row level security;

-- トークンを知っていれば誰でも参照可（登録不要アクセスの仕組み）
create policy "one_time_access_select" on one_time_access
  for select using (true);
