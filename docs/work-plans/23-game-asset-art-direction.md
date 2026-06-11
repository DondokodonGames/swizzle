# WP23: ゲームアセットのアートディレクション機構 — Codexが様式に従えるようにする

**担当**: Opus / **依存**: WP21完了+人間の案選定（WP22とは独立に進行可） / **想定規模**: M

---

以下をそのまま新しいOpusセッションに貼って実行する。冒頭に **選定された案**（docs/art-direction/README.md）の「ゲームアセット様式見本」を読むこと。

## 背景

AI生成ゲームの画像アセットに統一アートディレクションが存在しない。現状:
- `src/ai/v2/AssetGenerator.ts` の `buildStyleSheet()` が **コード内ハードコードのテーマ別固定パレット**（和風/ポップ/ファンタジー等6種）を返し、`buildObjectPrompt()` / `buildBackgroundPrompt()` がそれをDALL-Eプロンプトに埋め込む
- `src/ai/v2/ImageQualityChecker.ts`（Claude visionによる画像QA）は buildObjectPrompt と同じ制約文言で採点する設計（白背景・単一オブジェクト・フラット）が、**様式（アートディレクション）レベルの採点基準は持たない**
- Codex（外部生成）はSWIZZLE_JSON_SPEC.mdを読んでSVG/画像込みのJSONを作るが、**従うべき様式の定義がドキュメントに存在しない** ← ユーザーの要望の核心
- ゲーム側の様式とサービスUI（WP22）の世界観が揃うことで「プラットフォームとしての見た目」が成立する

## やること

1. **アートディレクション定義ファイルの新設**: `src/ai/v2/art-direction.json`
   ```json
   {
     "version": "1.0",
     "name": "<選定案の名前>",
     "rendering": "flat vector / bold outline 2-4px / minimal shading",  // 全アセット共通の描法
     "palettes": {
       "default": { "primary": "#..", "secondary": "#..", "accent": "#..", "forbidden": ["#.."] },
       "<テーマ名>": { ... }   // テーマ別の派生（基調は共通、アクセントだけ変える）
     },
     "shapeLanguage": "rounded / geometric / ...",
     "background": { "style": "...", "centerPolicy": "open and uncluttered" },
     "promptFragments": {
       "objectStyle": "<DALL-Eプロンプトに挿入する様式文>",
       "backgroundStyle": "<同上>",
       "negative": "<禁止事項文>"
     }
   }
   ```
   内容はWP21選定案の「ゲームアセット様式見本」から起こす
2. **AssetGenerator の接続**: `buildStyleSheet()` のハードコードパレットを art-direction.json 参照に置換。`buildObjectPrompt()` / `buildBackgroundPrompt()` / `getBackgroundStyle()` のスタイル文も promptFragments から組み立てる（テーマ別ムード差分は残してよいが、基調は定義ファイルが支配する）
3. **ImageQualityChecker の接続**: `checkObjectImage()` の採点基準文に art-direction.json の rendering / palette / negative を含め、**様式逸脱が styleMatch / paletteAdherence の減点として効く**ようにする（生成側と採点側が同じ定義を参照する一貫性が重要）
4. **Codex向けドキュメント**: SWIZZLE_JSON_SPEC.md に「## アセット様式（アートディレクション）」節を追加 — art-direction.json の内容を人間/Codexが読める形で転記（パレットHEX表・描法・禁止事項・SVGで作る場合の指針）。CODEX_GENERATION_GUIDE.md のワークフローに「様式節に従うこと」を1ステップ追加
5. **claude-svg / プレースホルダーへの反映**: `buildClaudeSVGPrompt()` と `createPlaceholderObject()` の配色も定義ファイルのパレットから引く（getColorFromNameのランダムHSLをパレットスナップに変更）

## やらないこと

- サービスUI側の変更（WP22の領域）
- 既存ゲームのアセット再生成（新規生成からの適用。再生成バッチは将来検討）
- 画像後処理（リサイズ・透過抽出）の追加

## 受け入れ基準

- art-direction.json が単一の様式定義源になっている（AssetGenerator・ImageQualityChecker・SPECドキュメントの3者が同じ内容を参照/転記）
- `IMAGE_PROVIDER=mock SKIP_UPLOAD=true DRY_RUN=true npm run ai:v2:1` が通る
- 既存テスト全件green + AssetGenerator/ImageQualityCheckerのテストに「様式定義が読み込まれる」ケースを追加
- `npx tsc --noEmit --skipLibCheck` クリーン

## 検証方法

1. テスト+型チェック+DRY_RUNスモーク
2. （APIキーがあれば）実生成1本で、DALL-Eプロンプトに様式文が入っていること・画像QAの採点に様式基準が含まれることをログで確認
3. 完了時: 成果サマリ5行+変更ファイル一覧を出力 → **WP24（Codexバッチ）へ**
