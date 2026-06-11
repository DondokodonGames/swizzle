# WP12: 多様性メトリクス — ai:status の拡張

**担当**: Opus / **依存**: WP11（lean版の効果測定に使うため。技術的依存はなし） / **想定規模**: S

---

以下をそのまま新しいOpusセッションに貼って実行する。

## 背景

Swizzle のAI量産で「似たようなゲームが増えている」問題に対処中（WP11でプロンプトダイエット実施）。
効果を判断するための**多様性の計測**が現状欠けている。`npm run ai:status`（`src/ai/batch/status-report.ts`）は
ネタ進捗・品質スコア分布・失敗理由・審査待ち件数までは表示するが、多様性指標がない。

既存のデータソース（新規収集は不要、集計するだけ）:
- `src/ai/v2/GamePatternAnalyzer.ts` — Supabaseから既存ゲームを取得し `analyze()` でメカニクス使用頻度・テーマ・ジャンル統計を計算済み（`overusedMechanics`, `stats.topGenres` 等）
- `logs/generation/failure_patterns.json`（FailurePatternTracker）— エラーコード別・**メカニクス別**の失敗集計（byMechanic）
- `user_games` テーブル — `ai_quality_score`, `ai_image_score`, `review_status`, `template_id`, `project_data.concept`（theme/playerOperation/genre）
- Orchestratorのログで類似度ゲートのリジェクト（エラーコード `CONCEPT_TOO_SIMILAR`）が failure_patterns.json に記録される

## やること

`src/ai/batch/status-report.ts` に「多様性レポート」セクションを追加する:

1. **メカニクス分布**: 直近100件（user_games, ai_generated=true, created_at降順）の playerOperation を GamePatternAnalyzer の `extractMechanic()` 相当で分類し、上位の偏り（最頻メカニクスの占有率%）を表示
2. **テーマ/ジャンル分布**: 同様にユニークテーマ数と上位5ジャンル
3. **類似度ゲート**: failure_patterns.json から `CONCEPT_TOO_SIMILAR` の発生回数と全試行に対する率
4. **フェーズ使用率**: 直近100件のうち `project_data.script.flags` に `phase_` 始まりのフラグを持つゲームの割合（フェーズ層の浸透度）
5. **画像品質**: ai_image_score の平均と分布（null=未計測件数も）

実装方針: Supabase接続は status-report.ts 既存の `reportPendingReview()` と同じパターン
（環境変数があれば表示、なければ静かにスキップ）。GamePatternAnalyzer を直接importして再利用してよい。

## やらないこと

- 新しいDBテーブル・カラムの追加
- ダッシュボードUI（CLIテキスト出力のみ）
- 生成パイプライン本体の変更

## 受け入れ基準

- Supabase認証情報なしでも `npm run ai:status` が従来通り動く（新セクションはスキップ）
- 認証情報ありで多様性レポート5項目が表示される
- `npx tsc --noEmit --skipLibCheck` クリーン、`npm run test` 全件green

## 検証方法

1. `npm run ai:status`（認証なし）→ 既存出力が壊れていない
2. 認証ありで実行 → 5項目の表示確認
3. 完了時: 成果サマリ5行+変更ファイル一覧を出力
