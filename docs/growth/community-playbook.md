# コミュニティ立ち上げプレイブック（WP43）

**ステータス**: ドラフト（Opus 作成） / **実行者**: 人間 / **更新日**: 2026-06-12

> Discord を一次コミュニティとする（Bot 無料・クリエイター文化と相性◎・
> `docs/marketing/current_status.md` のコスト試算でも追加費用ゼロ）。
> 自動化（`src/marketing/discord/DiscordBot.ts`）は**使わない** — 立ち上げは全て手動運用。
> 効果が見えてから自動化WPを検討する（→ sns-playbook.md §4 と同方針）。

---

## 1. Discord サーバー構成案

「クリエイターファースト」を構造で表現する。閲覧専門ユーザーも作る側に引き込む導線を最上段に置く。

### カテゴリ / チャンネル設計

```
📢 INFORMATION
  #welcome          ... ルール・自己紹介の入口（オンボーディング）
  #announcements    ... 運営告知（審査通過ゲーム・週間ベスト・アップデート）※運営のみ投稿

🎮 SHOWCASE（作品共有）
  #new-games        ... 審査通過ゲームの自動/手動紹介フィード（GameReviewQueue連動, §3）
  #share-your-game  ... クリエイターが自作を投稿（プレイURL + 一言）
  #weekly-best      ... 週間ベストゲーム発表（運営＋投票, §2）

🛠 CREATE（作る人の場）
  #feedback         ... 「このゲームどう？」フィードバック募集
  #neta-ideas       ... ネタ募集（AI生成のネタ帳にも還元できる素材）
  #help-and-bugs    ... エディタの使い方・不具合報告

💬 COMMUNITY
  #general          ... 雑談
  #off-topic        ... 雑談（ゲーム以外）
```

### ロール設計（最小）
- `@Creator` … 1本以上公開したユーザー（自己申告→運営確認 or 後日自動付与）
- `@Featured` … 週間ベスト/紹介された人（称賛の可視化 = 金銭分配の代替, monetization §4.5）
- `@Moderator` … 運営・初期コアメンバー

---

## 2. 初週の運営タスク（Day 0–7）

| 日 | タスク | 完了チェック |
|---|---|---|
| Day 0 | サーバー作成・上記チャンネル/ロール作成・`#welcome` にルールとリンク（プレイURL/エディタ） | [ ] |
| Day 0 | ロゴ（`public/logo-large.png`）をサーバーアイコンに設定 | [ ] |
| Day 1 | 既存サンプル/AI生成ゲームから運営が3–5本を `#new-games` に手動投稿（場を“空っぽにしない”） | [ ] |
| Day 1 | 初期コアメンバー（5–10人）を個別招待（友人・既存ユーザー） | [ ] |
| Day 2–3 | `#neta-ideas` でネタコンテストを告知（§2施策3） | [ ] |
| Day 4–5 | フィードバックに運営が必ず1次反応（“見られている”体験を作る） | [ ] |
| Day 7 | 第1回 `#weekly-best` を発表（投票 or 運営選定）。`@Featured` 付与 | [ ] |

### 「クリエイターファースト」初期施策
1. **審査通過ゲームの紹介**: GameReviewQueue で `approved` になったゲームを `#new-games` で紹介（§3 手順）。
   作者をメンションして「公開おめでとう」を可視化。
2. **週間ベストゲーム**: 毎週、完走率/いいねの高いゲーム（WP41 §4 クエリ）＋運営の目利きで1–3本選出。
   `@Featured` ロール付与。金銭分配を始める前の**称賛による動機づけ**（monetization §4.5）。
3. **ネタコンテスト**: `#neta-ideas` で週替わりテーマ（例「3秒で笑えるゲーム」）。
   優秀ネタは AI 生成のネタ帳（`src/ai/v2/neta.json`）に取り込み、生成ゲームを逆紹介して循環を作る。

---

## 3. GameReviewQueue 審査フロー × コミュニティ接続（手動運用）

既存の審査フロー（`src/components/editor/GameReviewQueue.tsx`）の状態遷移:

```
ゲーム公開申請 → review_status = 'pending_review'（審査待ち）
  管理者が GameReviewQueue で判定:
    pass → is_published = true,  review_status = 'approved'   ← ここを Discord 告知のトリガーにする
    fail → is_published = false, review_status = 'rejected'
    fix  → pending のまま review_notes を保存
```

### 接続手順（当面は手動）
1. 管理者が GameReviewQueue で `approved` 判定
2. 同じ管理者が `#new-games` に手動投稿: **サムネ画像 + タイトル + プレイURL（`/play/{id}`）+ 作者メンション**
3. 反応（いいね/コメント）が良いものを `#weekly-best` 候補としてメモ
4. （将来）この 1→2 を `DiscordBot.ts` で自動化する条件は sns-playbook.md §4 と同じ
   （**手動運用で週次の告知が定着し、`approved` が週 5本以上**になってから）

> 自動化を急がない理由: 立ち上げ初期は告知文の温度感・作者への声かけが価値の中心で、
> テンプレ自動投稿はむしろコミュニティの体温を下げる。

---

## 4. 人間が次にやる具体的アクション（チェックリスト）
- [ ] Discord サーバーを作成し §1 のチャンネル/ロールを構築
- [ ] §2 の Day 0–7 タスクを実行（特に Day 1 の“場を空にしない”初期投稿）
- [ ] 初期コアメンバー 5–10人を個別招待
- [ ] GameReviewQueue の `approved` → `#new-games` 手動告知を**運用ルール化**（誰が・いつ）
- [ ] 第1回 `#weekly-best` を Day 7 に発表、`@Featured` を付与
- [ ] 4週間運用して「週次告知の定着」「週 approved 5本以上」を満たしたら Discord 自動化WPの起票を検討
