# NFC タグ読み取り URL 設計 + Stripe Payment Links 登録不要課金システム 実装プラン

> 調査日: 2026-04-25  
> 前提: 既存の Stripe 統合・Supabase スキーマ・React Router を活用する

---

## 1. 全体フロー

```
[NFC タグ / QR コード]
        ↓  スキャン
/play/:gameId?price=120  ← ブラウザで開く
        ↓
  ゲームプレビュー + 「¥120 でプレイ」ボタン
        ↓
  Stripe Payment Link（登録不要・カード決済）
        ↓  Webhook: checkout.session.completed
  one_time_access テーブルに token 発行
        ↓  リダイレクト
/play/:gameId?token=xxxx  ← ゲーム起動
```

---

## 2. NFC タグ読み取り URL 設計

### 2-1. URL 方式の選定

| 方式 | 仕組み | メリット | デメリット |
|------|--------|----------|----------|
| **URL エンコード（推奨）** | NFC に URL 書き込み → ブラウザが自動で開く | すべての NFC 対応スマートフォンで動作 | QR コード兼用が容易 |
| Web NFC API | `navigator.nfc.scan()` で読み取り | データ量が大きい書き込みも可 | Chrome Android のみ対応（2026 時点） |

**推奨: NFC タグに URL を書き込む（NDEF Text Record / URI Record）**

- iOS（CoreNFC）・Android どちらも対応
- 専用アプリ不要
- QR コードと同じ URL を使い回せる

### 2-2. URL 構造

```
https://swizzle.app/play/{gameId}
```

| パラメータ | 用途 | 例 |
|------------|------|-----|
| `gameId` | ゲーム識別子（UUID） | `game_abc123` |
| `token` (オプション) | 決済後アクセストークン | `tok_xxxx` |
| `ref` (オプション) | トラッキング（タグ設置場所等） | `arcade_shibuya` |

例:
```
# タグに書き込む URL（決済前）
https://swizzle.app/play/game_abc123?ref=arcade_shibuya

# 決済完了後のリダイレクト URL
https://swizzle.app/play/game_abc123?token=tok_xxxx
```

### 2-3. NFC タグの書き込み方法

**管理者向けタグ書き込みフロー（React UI で実装）:**

```typescript
// Web NFC API で書き込む場合（Android Chrome / iOS は NFC Tools アプリを案内）
async function writeNfcTag(gameId: string, price: number) {
  const url = `https://swizzle.app/play/${gameId}?price=${price}`;
  
  if ('NDEFReader' in window) {
    // Web NFC API（Android Chrome）
    const writer = new NDEFWriter();
    await writer.write({ records: [{ recordType: "url", data: url }] });
  } else {
    // iOS / その他: QR コードを表示してアプリで書き込む
    showQRCode(url);
  }
}
```

**iOS ユーザーへの代替案:**  
「NFC Tools」「NFC TagWriter by NXP」等のアプリに URL を渡す QR コードを表示する。

### 2-4. 推奨 NFC タグ仕様

| 項目 | 推奨 |
|------|------|
| タイプ | NTAG213（最安・最普及） |
| 容量 | 144 バイト（URL 程度は十分） |
| 価格 | 1枚 50〜100 円（AliExpress 等） |
| 防水 | 屋外設置なら防水ラベル型 |

---

## 3. Stripe Payment Links を使った登録不要課金

### 3-1. Stripe Payment Links の特徴（Checkout Sessions との比較）

| | Payment Links | Checkout Sessions |
|---|---|---|
| 事前セッション作成 | 不要（URL のみ） | 必要（API 呼び出し） |
| 登録不要でのカード決済 | ✅（guest checkout） | ✅（設定次第） |
| URL の使い回し | ✅（同じゲームに同じリンク） | ❌（セッションは1回限り） |
| 価格変更 | 都度新規作成が必要 | 動的に設定可 |
| Webhook 対応 | ✅ | ✅ |
| メタデータ付与 | ✅ | ✅ |

**NFC タグとの相性: Payment Links が最適**  
タグに URL を一度書き込んだら変えられないため、Payment Links の「再利用可能な URL」は理想的。

### 3-2. Payment Link の作成（Stripe Dashboard / API）

```typescript
// supabase/functions/create-payment-link/index.ts
import Stripe from 'stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);

export async function createGamePaymentLink(gameId: string, priceYen: number) {
  // 1. Price オブジェクトを作成（ゲームごと）
  const price = await stripe.prices.create({
    currency: 'jpy',
    unit_amount: priceYen,
    product_data: {
      name: `Swizzle ゲームプレイ`,
      metadata: { game_id: gameId }
    }
  });

  // 2. Payment Link を作成
  const paymentLink = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    after_completion: {
      type: 'redirect',
      redirect: {
        // Webhook 完了後にトークン付きリダイレクト
        url: `https://swizzle.app/play/${gameId}?session_id={CHECKOUT_SESSION_ID}`
      }
    },
    metadata: { game_id: gameId },
    // 登録不要・ゲスト決済を許可
    billing_address_collection: 'auto',
    phone_number_collection: { enabled: false },
  });

  return paymentLink.url; // NFC タグに書き込む URL
}
```

### 3-3. Webhook でアクセストークンを発行

```typescript
// supabase/functions/stripe-webhook/index.ts（既存ファイルに追記）

case 'checkout.session.completed': {
  const session = event.data.object as Stripe.CheckoutSession;
  const gameId = session.metadata?.game_id;

  if (gameId) {
    // one_time_access テーブルにトークンを記録
    const token = crypto.randomUUID();
    await supabase.from('one_time_access').insert({
      token,
      game_id: gameId,
      stripe_session_id: session.id,
      amount_paid_yen: session.amount_total,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24時間有効
    });

    // ※リダイレクトは Payment Link の after_completion.redirect.url で処理済み
    // session_id → token の引き換えは別 Edge Function で対応
  }
  break;
}
```

### 3-4. session_id → token 引き換え Edge Function

```typescript
// supabase/functions/exchange-session-token/index.ts
export default async (req: Request) => {
  const { sessionId } = await req.json();

  // Stripe セッションを検証
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== 'paid') {
    return new Response(JSON.stringify({ error: 'not_paid' }), { status: 402 });
  }

  // Supabase から対応トークンを取得
  const { data } = await supabase
    .from('one_time_access')
    .select('token')
    .eq('stripe_session_id', sessionId)
    .single();

  return new Response(JSON.stringify({ token: data?.token }));
};
```

### 3-5. プレイページのトークン検証（フロントエンド）

```typescript
// src/pages/PlayPage.tsx（新規作成）
export function PlayPage() {
  const { gameId } = useParams();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const token = searchParams.get('token');

  useEffect(() => {
    if (sessionId && !token) {
      // 決済完了直後: session_id → token に引き換え
      exchangeToken(sessionId).then(({ token }) => {
        // URL をトークン付きに更新（リロード対策）
        navigate(`/play/${gameId}?token=${token}`, { replace: true });
      });
    }
  }, [sessionId]);

  if (!token) {
    return <PaymentGate gameId={gameId} />;
  }

  return <GamePlayer gameId={gameId} accessToken={token} />;
}
```

---

## 4. Supabase スキーマ追加

### 新テーブル: `one_time_access`

```sql
create table one_time_access (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  game_id text not null,
  stripe_session_id text not null unique,
  amount_paid_yen integer not null,
  created_at timestamptz default now(),
  expires_at timestamptz not null,
  used_at timestamptz,           -- 初回アクセス時刻（不正利用検出用）
  play_count integer default 0   -- 何回プレイしたか
);

-- インデックス
create index on one_time_access(token);
create index on one_time_access(stripe_session_id);
create index on one_time_access(game_id);

-- RLS: token を知っていれば誰でも read 可（登録不要）
alter table one_time_access enable row level security;
create policy "token_access" on one_time_access
  for select using (true);  -- トークン自体が認証代わり
```

### 既存テーブル: `games`（追加カラム）

```sql
alter table games add column if not exists
  payment_link_url text,      -- Stripe Payment Link URL
  price_yen integer,          -- プレイ価格（null = 無料）
  nfc_tag_ref text;           -- タグ設置場所等のメモ
```

---

## 5. ルーティング追加

```typescript
// src/App.tsx（既存 router に追加）
<Route path="/play/:gameId" element={<PlayPage />} />
<Route path="/admin/games/:gameId/nfc" element={<NfcSetupPage />} />
```

---

## 6. 実装ファイル一覧

| ファイル | 種別 | 内容 |
|----------|------|------|
| `supabase/functions/create-payment-link/index.ts` | 新規 | Payment Link 生成 API |
| `supabase/functions/exchange-session-token/index.ts` | 新規 | session_id → token 引き換え |
| `supabase/functions/stripe-webhook/index.ts` | 変更 | `checkout.session.completed` に game access 処理追加 |
| `supabase/migrations/YYYYMMDD_one_time_access.sql` | 新規 | `one_time_access` テーブル作成 |
| `src/pages/PlayPage.tsx` | 新規 | プレイページ（トークン検証・ゲーム起動） |
| `src/pages/NfcSetupPage.tsx` | 新規 | 管理者向け NFC タグ書き込み UI |
| `src/components/PaymentGate.tsx` | 新規 | 「¥XX でプレイ」ボタン + Payment Link へ誘導 |
| `src/App.tsx` | 変更 | `/play/:gameId` ルート追加 |

---

## 7. 工数見積もり

| タスク | 工数 |
|--------|------|
| Supabase スキーマ + RLS | 0.5 日 |
| `create-payment-link` Edge Function | 1 日 |
| `exchange-session-token` Edge Function | 0.5 日 |
| stripe-webhook 変更 | 0.5 日 |
| `PlayPage.tsx`（決済ゲート含む） | 2 日 |
| `NfcSetupPage.tsx`（QR 表示 + Web NFC） | 1 日 |
| テスト（Stripe test mode + NFC タグ実機確認） | 1 日 |
| **合計** | **約 6.5 日（1.5 週間）** |

---

## 8. 段階的リリース案

### Step 1（3 日）: URL 共有 + Payment Links のみ
- `/play/:gameId` ルートを実装
- QR コードで URL を共有
- Stripe Payment Links で決済

### Step 2（2 日）: NFC タグ書き込み UI
- `NfcSetupPage.tsx` で管理者が NFC タグに URL を書き込めるようにする
- iOS 向けに NFC Tools へのリンク付き QR を表示

### Step 3（1.5 日）: アクセス制御強化
- トークン有効期限 + play_count 上限（例: 24 時間有効・3 回まで）
- 不正利用検出ログ

---

## 9. セキュリティ考慮事項

| リスク | 対策 |
|--------|------|
| トークンの URL 共有・転送 | `play_count` に上限、`used_at` で初回記録 |
| Stripe Webhook の偽造 | 既存の `stripe-webhook-secret` 署名検証を継続 |
| session_id の総当たり | Stripe Session ID は十分に長い（推測不可能） |
| Payment Link の不正利用 | Stripe の不正検知（Radar）に委任 |
| NFC タグの差し替え | 物理的なタンパー対策（ラベルの上に透明フィルム等） |

---

## 10. Stripe ダッシュボードでの設定

1. **Payment Links 作成**: Stripe Dashboard → Payment Links → New
   - または API（`create-payment-link` Edge Function）で自動生成
2. **Guest Checkout 有効化**: Payment Link 設定 → 「顧客にアカウントなしでの決済を許可」
3. **Webhook エンドポイント追加**: `checkout.session.completed` を既存 webhook に追加（設定済みの場合は確認のみ）
4. **テスト**: Stripe test モードで `4242 4242 4242 4242`（テストカード）を使って確認

---

*参照: `src/services/StripeService.ts`、`supabase/functions/stripe-webhook/`、`docs/STRIPE_PRODUCTION_CHECKLIST.md`*
