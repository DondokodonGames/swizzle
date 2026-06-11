# WP22: サービスUI刷新 — 選定アートディレクションの適用

**担当**: Opus / **依存**: WP21完了+人間の案選定 / **想定規模**: L（必要なら2セッションに分割: ①トークン+Splash/Feed ②Sequence/Bridge）

---

以下をそのまま新しいOpusセッションに貼って実行する。冒頭に **選定された案の内容**（docs/art-direction/README.md の選定結果と該当proposalフォルダ）を読むこと。

## 背景

WP21でアートディレクションが選定された。これをサービスの主要画面に適用する。

現状の構造:
- デザイントークン: `src/constants/DesignSystem.ts`（DESIGN_TOKENS: colors/spacing/borderRadius/shadows/typography/animation、COMPONENT_STYLES、LAYOUT_UTILS）— 多くのコンポーネントが `DESIGN_TOKENS.colors.neutral[800]` 等で参照しているため、**トークンの値を差し替えれば広範囲に波及する**のが最大のテコ
- アクティブCSS: `src/styles/arcade-theme.css`（App.tsxでimport）
- 死蔵CSS: `src/styles/{dark,neon,retro,minimal,cute}-theme.css`（未import。要確認の上削除）
- 主要4画面: `src/App.tsx`内のSplashScreen（インライン<style>タグでアニメーション定義あり、266-293行付近）、`src/components/GameSequence.tsx`（28KB）、`src/components/BridgeScreen.tsx`（39KB・インラインスタイル多）、`src/components/GameFeed.tsx`（21KB）
- 共通UI: `src/components/ui/ModernButton.tsx`, `ModernCard.tsx`

## やること

1. **DESIGN_TOKENS の刷新**: 選定案のパレット/タイポ/影/角丸をトークンに反映。既存のキー構造（colors.primary[50-900]等）は維持して値だけ差し替え（参照箇所を壊さない）。新フォントはindex.htmlまたはCSSの@importで読み込み
2. **arcade-theme.css を選定案のグローバルCSSに置き換え**（ファイル名は `theme.css` 等にリネームし、App.tsxのimportを更新）。bodyの背景・スクロールバー・選択色などのベース定義
3. **主要4画面の適用**: SplashScreen / GameSequence のUIオーバーレイ / BridgeScreen / GameFeed。インラインスタイルのうち**色・影・角丸・フォントのハードコード値をトークン参照に置換**（レイアウト数値はそのままでよい — 全面書き直しはしない）。WP21のモックHTMLを見た目の正とする
4. **共通UIコンポーネント**（ModernButton/ModernCard）をトークン準拠に更新
5. **死蔵テーマCSS5つを削除**（事前に `grep -r "dark-theme\|neon-theme\|retro-theme\|minimal-theme\|cute-theme" src/` でimportゼロを確認）

## やらないこと

- エディタ（src/components/editor/ 67ファイル）のスタイル変更 → 影響大なので別WP（Track 3後）
- レイアウト構造・コンポーネント分割の変更（見た目の差し替えに徹する。リファクタはWP33）
- ルーティング・機能の変更
- ゲームアセット側のアートディレクション（WP23の領域）

## 受け入れ基準

- 4画面+共通UIが選定案の見た目になっている（モックHTMLとの目視比較）
- DESIGN_TOKENSのキー構造が後方互換（既存の参照箇所がコンパイルエラーにならない）
- 死蔵CSS5ファイルが削除されている
- `npx tsc --noEmit --skipLibCheck` クリーン、`npm run test` 全件green
- `npm run build` が通る

## 検証方法

1. `npm run dev` で起動し、Splash→GameSequence→BridgeScreen→GameFeed を実際に遷移して目視確認（スマホ幅のレスポンシブも）
2. エディタ画面（未対象）が壊れていないことを開いて確認
3. ビルド+テスト
4. 完了時: 成果サマリ5行+変更ファイル一覧+**ビフォーアフターのスクリーンショット**を出力
