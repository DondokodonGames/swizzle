# WP32: アーキテクチャレビュー報告書 — 読み取り専用

**担当**: Opus / **依存**: WP31（CIがあると以後の検証が楽） / **想定規模**: M / **完了後**: 人間が項目を承認 → WP33へ

---

以下をそのまま新しいOpusセッションに貼って実行する。**このWPではsrc/のコードを一切変更しない**（報告書の作成のみ）。

## 背景

Swizzle はチャット生成コードのコピペ時代から成長し、103K LOC・291ファイルに達した。
「ゲーム版TikTok」としてスケールさせる前に、全体のソースレビューと整理方針を固める。

事前調査で判明しているホットスポット（このレビューで深掘り・裏取りする）:
1. **ゲーム読込が4経路**: GameSequence→SocialService.getPublicGames() / PlayGamePage→直接ID / EditorApp→ProjectStorageManager（localStorage+Supabase）/ AIパイプライン→SupabaseUploader。統一抽象なし
2. **GameProject vs PublicGame のスキーマ不整合**: 同じゲームデータに2つの形があり、変換が経路ごとにバラバラ。`game_data`（旧・空）と `project_data`（現行）の二重カラムも残存
3. **EditorGameBridge シングルトン**（src/services/editor/EditorGameBridge.ts 1,653行）: 可変グローバル状態・イベントリスナーのライフサイクルが脆い・テスト困難
4. **ReviewQueue 二重実装**: ReviewQueue.tsx（ローカルJSON、962行）と GameReviewQueue.tsx（Supabase）が並走
5. **AI v2 モノリス**（35K LOC）: SpecificationGenerator 2,303行・LogicValidator 1,933行等。スキーマ進化のバージョニング戦略なし
6. **flag条件のv2/エンジン形不整合**（既知の潜在バグ）: LLMが書く `flagValue` 形のflag条件はエンジン（FlagManager）で常にfalse評価される。PhaseCompilerはエンジン形を直接出力して回避済みだが、非フェーズのflag条件は壊れたまま
7. **エディタの巨大コンポーネント**: SettingsTab 1,394行 / ScriptTab 1,327行 / MoveActionEditor 1,328行。アクション/条件エディタごとのボイラープレート重複
8. **テスト非対称**: src/components/ 67ファイル・src/pages/ 13ファイルにテスト0件
9. **死蔵コード**: src/marketing/（TikTok/Twitter自動化のstub 13ファイル）、複数テーマCSS（WP22で削除予定）

## やること

`docs/architecture-review.md` として報告書を作成する。各項目につき:
- **現状の事実**（ファイル・行数・依存関係。上記の裏取り+見落としの追加発見）
- **リスク**（このまま放置すると何が起きるか。「ゲーム版TikTok」のスケール観点で）
- **提案**（具体的な統合/分割/削除案。Before→Afterの構造図）
- **工数見積**（S: 1セッション / M: 2-3 / L: 4+）と**順序**（依存関係）
- **やらない選択肢**（対応しない場合の許容条件も書く — 全部やる前提にしない）

特に深掘りすべき設計判断3つ:
- **GameLoadingService 統一案**: 4経路を `loadGame(id | project | publicGame) → GameProject` の単一サービスに集約する設計（PublicGame→GameProject変換の正規化を含む）
- **flag条件不整合の恒久対応**: EditorMapper出力をエンジン形に正規化するか、FinalAssemblerに変換層を入れるか、エンジン側のConditionEvaluatorに互換を足すか（contract.tsに影響しない案を優先）
- **EditorGameBridge の分割方針**: 実プレイ/エディタプレビュー/レビューUIの3利用者を整理し、リスナーライフサイクルを型で守る案

最後に**承認シート**（チェックボックス付きの項目一覧）を報告書末尾に置き、人間がチェックした項目だけがWP33の対象になることを明記する。

## やらないこと

- src/ 以下の一切の変更（grep/読み取りのみ）
- 実装詳細レベルの全コード列挙（報告書は意思決定資料。コードリーディングの転記ではない）

## 受け入れ基準

- docs/architecture-review.md がコミットされ、上記9項目+新規発見の各項目に事実/リスク/提案/工数/順序がある
- 設計判断3つにBefore→After構造図がある
- 承認シートがある
- git diff が docs/ のみ

## 検証方法

1. 報告書を人間が読み、承認シートにチェックを入れる
2. 完了時: 成果サマリ5行を出力（報告書自体が成果物）
