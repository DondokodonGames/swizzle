# WP31: Lint/CI基盤 — リファクタ前の守り

**担当**: Opus / **依存**: なし（ただしTrack 3の最初に実施） / **想定規模**: S

---

以下をそのまま新しいOpusセッションに貼って実行する。

## 背景

技術負債の整理（WP32レビュー→WP33リファクタ）に入る前に、変更を検知する守りを整える。現状:
- `package.json` に `lint` スクリプト（`eslint . --ext ts,tsx --max-warnings 0`）があるが、**ESLint設定ファイルが存在せず実行不能**（ESLint 8.57.1）
- CIが存在しない（GitHub Actionsなし）。型チェック・テスト354件・lintは手動頼み
- TODO/FIXMEコメントが40+箇所に散在し、追跡されていない（例: SocialMediaPoster.ts のTwitter API stub、TikTokAutomation.ts:103/137/162、ProjectStorage.ts:556 画像圧縮、FlagActionEditor.tsx:306 等）
- tsconfig は strict: true / noUnusedLocals / noUnusedParameters で健全

## やること

1. **ESLint設定の復旧**: `.eslintrc.cjs`（ESLint 8系のため flat configではなく従来形式）を作成。
   `@typescript-eslint` recommended + react-hooks。**既存コードが通るところから始める**:
   `npm run lint` を実行し、エラーが大量なら機械修正可能なもの（unused-vars等）は `--fix`、
   残りは個別ルールを `warn` に落として「現状green、新規違反のみ検出」の状態を作る（max-warningsは一旦外してよい）
2. **GitHub Actions CI**: `.github/workflows/ci.yml` — push/PR時に
   `npm ci` → `npx tsc --noEmit --skipLibCheck` → `npm run test` → `npm run lint`。Node 20
3. **TODO棚卸し**: `grep -rn "TODO\|FIXME\|HACK" src/ --include="*.ts" --include="*.tsx"` の全件を
   `docs/work-plans/logs/31-todo-inventory.md` に表で整理:
   `ファイル:行 / 内容の要約 / 分類（未実装機能 | 既知バグ | 改善メモ | 死んだ計画）/ 推奨対応（実装 | 削除 | WP33候補 | 放置可）`
   コード自体は変更しない（判断は人間）

## やらないこと

- リファクタ・コード整理（WP33の領域）
- lintルールの厳格化（まずgreenの基準線を引くことが目的）
- pre-commit hook（CIで十分。必要なら将来）

## 受け入れ基準

- `npm run lint` がローカルでexit 0
- CI workflow がプッシュで走り、3ステップ（tsc/test/lint）すべてgreen
- TODO棚卸し表がコミットされ、全件に分類と推奨対応が付いている
- `npm run test` 全件green（lint --fixで挙動を変えていないこと）

## 検証方法

1. ローカルで lint/test/tsc の3点セット
2. ブランチをプッシュしてActionsの実行をGitHub上で確認
3. 完了時: 成果サマリ5行+変更ファイル一覧+「lintで一時的にwarnへ落としたルール一覧」を出力
