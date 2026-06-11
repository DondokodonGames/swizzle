# WP31: TODO/FIXME/HACK 棚卸し

`grep -rn "TODO\|FIXME\|HACK" src/ --include="*.ts" --include="*.tsx"` の全件一覧（2026-06-11 時点）。

実際にヒットしたのは **11 件**（すべて `TODO`、`FIXME`/`HACK` は 0 件）。
`se_xxx` / `rule_xxx` 等のプレースホルダ表記は marker ではないため除外済み。

WP31 ではコードは変更しない（判断は人間）。下表は WP33（リファクタ）での仕分け材料。

## 分類の定義

- **未実装機能**: 設計済みだが本実装が残っている箇所（プレースホルダ／シミュレーション）
- **既知バグ**: 現状の挙動が誤っている／不完全
- **改善メモ**: 動くが将来良くしたいメモ
- **死んだ計画**: もう実施予定のない、削除候補のメモ

## 推奨対応の定義

- **実装**: 本実装する（別 WP / プロダクト判断）
- **削除**: コメント／関連コードを消す
- **WP33候補**: 今回のリファクタ枠で対応
- **放置可**: 当面そのままで害がない

---

## 一覧

| # | ファイル:行 | 内容の要約 | 分類 | 推奨対応 |
|---|---|---|---|---|
| 1 | `src/components/editor/script/actions/FlagActionEditor.tsx:306` | フラグアクションのプレビュー機能（「Phase D で実装」）。現状は通知を出すのみ | 未実装機能 | 放置可（プロダクト判断で実装。エディタ機能の将来拡張） |
| 2 | `src/components/editor/script/actions/SoundActionEditor.tsx:172` | サウンドアクションのプレビュー再生（「Phase C Step2 で実装予定」）。現状は通知のみ | 未実装機能 | 放置可（同上。音プレビューは UX 改善枠） |
| 3 | `src/ai/publishers/SocialMediaPoster.ts:90` | 実投稿が Twitter API 未統合で `simulateTwitterPost()` を呼ぶシミュレーション | 未実装機能 | 実装（マーケ施策が動く時点で。`AutoPublisher` から実利用される） |
| 4 | `src/ai/publishers/SocialMediaPoster.ts:226` | `simulateTwitterPost()` 本体 — Twitter API 統合の TODO（#3 の実体） | 未実装機能 | 実装（#3 と同件。統合時にまとめて対応） |
| 5 | `src/ai/publishers/SocialMediaPoster.ts:283` | `getStatistics()` が Supabase 未接続でゼロ値を返すシミュレーション | 未実装機能 | 実装（投稿統計を使う段階で。それまで害なし） |
| 6 | `src/services/editor/ErrorHandlingSystem.tsx:423` | 「再保存」リカバリで本来の保存リトライ処理が無く `onRecover()` のみ | 既知バグ | WP33候補（リカバリ動作が name 通りに動いていない。要レビュー） |
| 7 | `src/services/editor/ErrorHandlingSystem.tsx:454` | 「ゲーム再開」リカバリで本来の再開処理が無く `onRecover()` のみ | 既知バグ | WP33候補（#6 と同種。`createErrorHandler` 一帯が未配線） |
| 8 | `src/services/editor/ProjectStorage.ts:556` | `optimizeAssets()` が画像圧縮・リサイズ未実装で `console.log` のみ通過 | 未実装機能 | WP33候補（フレームワークだけ存在。実装 or 機能ごと削除を判断） |
| 9 | `src/marketing/tiktok/TikTokAutomation.ts:103` | TikTok 投稿の実 API 未実装（API 承認待ちのプレースホルダ、`success:false` を返す） | 未実装機能 | 放置可（外部 API 承認待ちのため。承認後に実装） |
| 10 | `src/marketing/tiktok/TikTokAutomation.ts:137` | マイルストーン動画の生成・投稿が未実装 | 未実装機能 | 放置可（#9 の TikTok 統合に従属） |
| 11 | `src/marketing/tiktok/TikTokAutomation.ts:162` | 週間サマリー動画の生成・投稿が未実装 | 未実装機能 | 放置可（#9 の TikTok 統合に従属） |

---

## 補足メモ（WP33 への申し送り）

- **#6 / #7 `ErrorHandlingSystem.tsx` の `createErrorHandler`**: この関数は実質カスタムフック
  （内部で `useErrorHandling()` を呼ぶ）だが `use` プレフィックスが無く、`react-hooks/rules-of-hooks`
  に違反する。WP31 ではルールを `error` のまま維持し、当該 1 行のみ `eslint-disable-next-line` で
  明示的に無効化した。さらに **`createErrorHandler` には呼び出し元が 1 件も無い（デッドコード）**。
  WP33 では「`useErrorHandler` へのリネーム」ではなく **関数ごと削除**が妥当な可能性が高い（#6/#7 の
  未配線リカバリも一緒に消える）。
- **#3〜#5 / #9〜#11 のマーケティング系**は外部 API 統合待ちで、いずれも安全側（シミュレーション or
  `success:false`）にフェイルする。プロダクトがその施策を実行する判断をした時点でまとめて実装するのが効率的。
- **#1 / #2 のエディタ・プレビュー**は「Phase C/D」という旧計画の名残。Phase 体系が現在も生きているか
  要確認。死んでいれば「死んだ計画」として削除候補に降格してよい。
