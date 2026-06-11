# WP42: マネタイズ活性化チェックリスト — 実装済み基盤を動かす

**担当**: 人間（主）+ Opus（小タスク1件） / **依存**: なし / **想定規模**: S

---

## 背景

調査の結果、マネタイズは「アイデア止まり」ではなく**大部分が実装済み**だった:

| 機能 | 状態 | 場所 |
|------|------|------|
| Stripe Checkout/Customer Portal/Webhook | ✅ 実装済み（本番チェックリスト完了 2025-12-30） | src/services/monetization/StripeService.ts, docs/STRIPE_PRODUCTION_CHECKLIST.md |
| ウォレット Pay-Per-Play（100プレイ無料→1円=1プレイ、チャージ4段階） | ✅ 実装済み | 20260321_pay_per_play.sql, WalletService.ts, TopUpButton.tsx, PlayGamePage.tsx |
| Free/Premiumサブスク（$4.99/月） | ✅ 実装済み | Pricing.tsx, SubscriptionManager.tsx, useSubscription.ts |
| NFC/QR + Payment Links（物理ロケーション） | ✅ ゲーム側UI完成 | NfcSetupPage.tsx, 20260425_game_payments*.sql |
| AdSense広告 | ⚠️ コンポーネントのみ（スロット未設定） | src/components/monetization/AdUnit.tsx |
| アナリティクス | ❌ なし | → WP41 |
| クリエイター分配 / SNS自動化 | ❌ なし | → WP43で設計のみ |

未稼働の原因は実装ではなく**設定と確認**。このWPはそれを潰すチェックリスト。

## 人間のチェックリスト

- [ ] **AdSense**: AdSense管理画面でスロット3種を発行し、`VITE_ADSENSE_SLOT_GAME_BRIDGE` / `VITE_ADSENSE_SLOT_GAME_LIST` / `VITE_ADSENSE_SLOT_EDITOR` をデプロイ環境に設定（AdUnit.tsxはスロット未設定だとプレースホルダー表示になる仕様）
- [ ] **Stripe本番**: docs/STRIPE_PRODUCTION_CHECKLIST.md を再確認（Webhookエンドポイント・Customer Portal設定・本番キー）。テストカードで topup→ウォレット残高反映、subscribe→Premium反映を通す
- [ ] **動作確認シナリオ**: 新規アカウントで 無料100プレイのカウントダウン→枯渇→ペイメントゲート表示→¥100チャージ→プレイ再開、の一連を実機で確認
- [ ] **価格の意思決定**: 1円=1プレイ と $4.99サブスクの並存が意図通りか再確認（どちらを主軸にするかは WP43 の意思決定資料を参照）

## Opusへの小タスク（1セッション・S）

```
src/components/monetization/AdUnit.tsx に AdSenseクライアントID（ca-pub-5097371063240942）が
ハードコードされている。これを VITE_ADSENSE_CLIENT_ID 環境変数参照に変更し（未設定時は現行値に
フォールバック）、.env.example（なければ作成）に VITE_ADSENSE_* 4変数を記載すること。
受け入れ基準: tsc/test/lint green、env未設定時の挙動が従来と同一。
```

## 成功基準

- Free ユーザーに広告が表示され、Premiumでは非表示（AdUnit.tsxの既存ロジック）
- チャージ→残高反映→プレイ消費 が本番環境で一巡する
- WP41のアナリティクスで topup_complete イベントが記録される（WP41完了後）
