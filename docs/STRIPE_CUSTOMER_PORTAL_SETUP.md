# Stripe Customer Portal セットアップガイド

## 問題20: サブスクリプションキャンセル機能の設定

### 概要
Stripe Customer Portalでサブスクリプションのキャンセルボタンが表示されない場合、Stripe Dashboard側の設定が必要です。

### 設定手順

#### 1. Stripe Dashboardにアクセス
1. [Stripe Dashboard](https://dashboard.stripe.com/)にログイン
2. テスト環境で作業する場合は、画面右上の「テストモード」を有効化

#### 2. Customer Portalの設定を開く
1. 左サイドバーから「設定」（Settings）をクリック
2. 「請求」（Billing）セクションの「顧客ポータル」（Customer Portal）をクリック

#### 3. キャンセル機能を有効化
1. 「機能」（Features）タブを選択
2. 「サブスクリプションのキャンセル」（Subscription cancellation）セクションを探す
3. 以下のオプションを設定：

   **キャンセルを許可**
   - ✅ 「顧客がサブスクリプションをキャンセルできるようにする」を有効化

   **キャンセルのタイミング**
   - 推奨: 「期間終了時にキャンセル」（Cancel at period end）
   - または: 「即座にキャンセル」（Cancel immediately）

   **キャンセル理由の収集**（オプション）
   - ✅ 「キャンセル理由を尋ねる」を有効化
   - フィードバック収集に役立ちます

   **ダウングレードオプション**（オプション）
   - 必要に応じて、キャンセル前にFreeプランへのダウングレードを提案

4. 「保存」（Save）をクリック

#### 4. プラン変更の設定（オプション）
1. 同じ画面で「サブスクリプションの更新」（Subscription updates）セクションを確認
2. 以下を有効化：
   - ✅ 「顧客がプランを変更できるようにする」
   - ✅ 「顧客が数量を変更できるようにする」（該当する場合）

#### 5. 設定の確認
1. 設定を保存後、アプリケーションから「サブスクリプションを管理」ボタンをクリック
2. Customer Portalが開き、以下が表示されることを確認：
   - ✅ サブスクリプション情報
   - ✅ 「プランをキャンセル」または「サブスクリプションをキャンセル」ボタン
   - ✅ プラン変更オプション（有効化した場合）

### トラブルシューティング

#### キャンセルボタンが表示されない場合
1. **設定が保存されているか確認**
   - Customer Portal設定ページで「保存」を押したか確認

2. **テストモードと本番モードの違い**
   - テストモードと本番モードで設定が異なる場合があります
   - 両方の環境で設定を確認してください

3. **ブラウザキャッシュのクリア**
   - ブラウザのキャッシュをクリアして再度試してください

4. **セッションの再作成**
   - アプリケーションで一度ログアウトし、再度ログイン
   - Customer Portalへのリンクを再度クリック

#### エラーが発生する場合
1. **StripeのAPI接続を確認**
   - `SubscriptionService.ts`の`redirectToCustomerPortal`関数を確認
   - コンソールにエラーログが出ていないか確認

2. **Stripe Webhook設定を確認**
   - Customer Portalでの変更がWebhookで正しく処理されているか確認
   - `stripe listen --forward-to localhost:3000/api/webhooks/stripe`でテスト

### 推奨設定

本番環境では以下の設定を推奨します：

```
✅ サブスクリプションのキャンセル: 有効
   - タイミング: 期間終了時
   - 理由の収集: 有効

✅ プラン変更: 有効
   - アップグレード: 即座に適用
   - ダウングレード: 期間終了時に適用

✅ 支払い方法の更新: 有効

✅ 請求履歴の表示: 有効
```

### 関連ファイル

- `/src/services/monetization/StripeService.ts` - Customer Portal統合
- `/src/components/monetization/SubscriptionManager.tsx` - UI表示
- `/src/hooks/monetization/useSubscription.ts` - サブスクリプション管理

### 参考リンク

- [Stripe Customer Portal ドキュメント](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
- [キャンセル設定ガイド](https://stripe.com/docs/billing/subscriptions/canceling-pausing)
- [Webhook設定](https://stripe.com/docs/webhooks)

### ステータス

- ✅ コード実装完了（`SubscriptionManager.tsx`の「サブスクリプションを管理」ボタン）
- ⚠️ **Stripe Dashboard側の設定が必要**
- ⚠️ 本番環境での動作確認が必要

---

**注意**: この設定はStripe側の管理画面で行うもので、コードの変更は不要です。
