# Stripe 本番環境移行チェックリスト

このドキュメントは、Stripe決済をテスト環境から本番環境に移行する際のチェックリストです。

## 📋 事前準備

### 1. Stripe Dashboard設定

- [ ] **Stripeアカウントの本番利用申請を完了**
  - Business情報の入力
  - 銀行口座の登録と確認
  - 本人確認書類の提出

- [ ] **本番APIキーの取得**
  - [Stripe Dashboard > Developers > API keys](https://dashboard.stripe.com/apikeys)
  - `pk_live_*` (公開キー)
  - `sk_live_*` (シークレットキー)
  - ⚠️ シークレットキーは絶対に公開しないこと

### 2. 本番用プロダクトと価格の作成

- [ ] **Products の作成**
  - [Stripe Dashboard > Products](https://dashboard.stripe.com/products)
  - テスト環境と同じプラン構成を本番環境にも作成

- [ ] **Price IDs の記録**
  - 月額プラン: `price_*`
  - 年額プラン: `price_*`

### 3. Webhookエンドポイントの設定

- [ ] **本番 Webhook の登録**
  - [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks)
  - エンドポイント URL: `https://playswizzle.com/functions/v1/stripe-webhook`

- [ ] **必要なイベントの有効化**
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

- [ ] **Webhook シークレットの取得**
  - `whsec_*`

### 4. Customer Portal の設定

- [ ] **Customer Portal の有効化**
  - [Stripe Dashboard > Settings > Billing > Customer portal](https://dashboard.stripe.com/settings/billing/portal)
  - 許可する操作（プラン変更、キャンセルなど）の設定

---

## 🔧 環境変数の設定

### Supabase Edge Functions

以下の環境変数を Supabase Dashboard で設定:

```bash
# Stripe本番キー
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx

# 本番Price IDs
VITE_STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_xxxxxxxxxxxx
VITE_STRIPE_PREMIUM_YEARLY_PRICE_ID=price_xxxxxxxxxxxx

# アプリケーションURL（オープンリダイレクト対策に必須）
APP_URL=https://playswizzle.com
```

### フロントエンド (.env.production)

```bash
# Stripe本番公開キー
VITE_STRIPE_PUBLIC_KEY=pk_live_xxxxxxxxxxxx

# Price IDs
VITE_STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_xxxxxxxxxxxx
VITE_STRIPE_PREMIUM_YEARLY_PRICE_ID=price_xxxxxxxxxxxx
```

---

## ✅ デプロイ前チェック

### コードレビュー

- [ ] テスト用キーがハードコードされていないことを確認
- [ ] console.log でセンシティブな情報が出力されていないことを確認
- [ ] エラーメッセージに内部情報が含まれていないことを確認

### セキュリティ確認

- [ ] CORS設定に本番ドメインが含まれていることを確認
- [ ] リダイレクトURL検証が有効であることを確認
- [ ] レート制限が適切に設定されていることを確認
- [ ] Webhook署名検証が有効であることを確認

---

## 🚀 デプロイ手順

### 1. Edge Functions のデプロイ

```bash
# Supabase CLI でデプロイ
supabase functions deploy stripe-webhook
supabase functions deploy create-checkout-session
supabase functions deploy create-customer-portal
```

### 2. 環境変数の設定確認

```bash
# Supabase Dashboard または CLI で設定
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
# ... その他の変数
```

### 3. フロントエンドのデプロイ

```bash
# ビルドと確認
npm run build
npm run preview  # ローカルで本番ビルドを確認

# デプロイ
# (実際のデプロイコマンドはホスティングサービスに依存)
```

---

## 🧪 本番環境テスト

### Webhook テスト

```bash
# Stripe CLI でWebhookをテスト（本番キーで）
stripe listen --forward-to https://playswizzle.com/functions/v1/stripe-webhook
stripe trigger checkout.session.completed
```

### 決済フローテスト

- [ ] **Checkout フロー**
  1. テストカード `4242 4242 4242 4242` で購入
  2. Webhook が正常に処理されることを確認
  3. subscriptions テーブルが更新されることを確認

- [ ] **Customer Portal**
  1. ポータルへのリダイレクトが正常に動作
  2. プラン変更・キャンセルが反映されることを確認

- [ ] **支払い失敗シナリオ**
  1. テストカード `4000 0000 0000 0341` で失敗をテスト
  2. 適切なエラーハンドリングを確認

### エラーケーステスト

- [ ] 無効なセッションIDでの成功ページアクセス
- [ ] 認証なしでのAPI呼び出し
- [ ] 不正なリダイレクトURL

---

## 📊 モニタリング設定

### Stripe Dashboard

- [ ] **アラート設定**
  - 支払い失敗時の通知
  - 不正検出アラート
  - Webhook エラー通知

### アプリケーション監視

- [ ] **ログ監視**
  - Edge Function のエラーログ監視
  - [AUDIT] ログの確認体制

- [ ] **メトリクス**
  - Checkout 成功率
  - Webhook 処理時間
  - エラー率

---

## 🔄 ロールバック手順

万が一問題が発生した場合:

1. **Stripe Dashboard で本番Webhook を無効化**
2. **Edge Functions をテスト版に戻す**
   ```bash
   git revert HEAD
   supabase functions deploy stripe-webhook
   ```
3. **フロントエンドをテスト版に戻す**
4. **状況を確認してから再デプロイ**

---

## 📞 サポート連絡先

- **Stripe サポート**: [Stripe Support](https://support.stripe.com/)
- **Supabase サポート**: [Supabase Support](https://supabase.com/support)

---

## 履歴

| 日付 | 作業者 | 内容 |
|------|--------|------|
| 2025-12-30 | Claude | 本番環境移行完了・セキュリティ強化実装・動作確認完了 |

---

**⚠️ 重要**: 本番環境での最初の決済は、自分自身で小額のテスト購入を行い、全フローが正常に動作することを確認してください。
