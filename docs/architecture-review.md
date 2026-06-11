# Swizzle アーキテクチャレビュー報告書（WP32）

**作成**: 2026-06-11 / **担当**: Opus / **種別**: 読み取り専用レビュー（src/ 未変更）
**規模実測**: 293 ファイル / 103,946 LOC（`src/` 配下、`*.ts` + `*.tsx`）
**位置づけ**: 意思決定資料。**人間が末尾の承認シートでチェックした項目だけが WP33（リファクタ）の対象**になる。全部やる前提ではない。

---

## この報告書の読み方

各項目は次の5点で構成する。

- **現状の事実**: ファイル・行数・依存関係（裏取り済み。引用は `file:line`）
- **リスク**: 放置した場合に「ゲーム版TikTok」スケール時に何が起きるか
- **提案**: 統合 / 分割 / 削除の具体案（必要なら Before→After 構造図）
- **工数 / 順序**: S=1セッション / M=2-3 / L=4+。依存関係を明記
- **やらない選択肢**: 対応しない場合に何が許容条件になるか

> 注: 事前調査の数字と実測がずれた箇所は **太字で訂正**している（例: ReviewQueue は 962行ではなく 613行）。

---

## 0. サマリ — ホットスポット一覧

| # | 項目 | 規模 | 重大度 | 工数 | 推奨順序 |
|---|------|------|--------|------|----------|
| 1 | ゲーム読込が4経路・統一抽象なし | 4経路 | 高 | M | ② |
| 2 | GameProject vs PublicGame 不整合 / `game_data` 死蔵カラム | 2型 | 高 | S–M | ①（1とまとめて） |
| 3 | EditorGameBridge シングルトン神オブジェクト | 1,653行 | 高 | L | ④ |
| 4 | ReviewQueue 二重実装 | **613 + 698行** | 中 | S | ③ |
| 5 | AI v2 モノリス / スキーマ版管理なし | **22,113 LOC** | 中 | L | ⑥ |
| 6 | flag条件 v2/エンジン形不整合（**実バグ・稼働中**） | 数行 | 高 | S | ①（最優先） |
| 7 | エディタ巨大コンポーネント・ボイラープレート重複 | ~24.9K LOC | 中 | M–L | ⑤ |
| 8 | テスト非対称（UI層0件） | 27ファイル偏在 | 中 | M | 横断 |
| 9 | 死蔵コード（marketing 13ファイル / テーマCSS） | 3,963 LOC | 低 | S | 随時 |
| N1 | **pixi.js が未使用依存（実体は Canvas 2D）** | 依存1件 | 低–中 | S | 随時 |

重大度は「スケール時の事故確率 × 影響範囲」。工数の S/M/L は WP33 のセッション単位。

---

## 1. ゲーム読込が4経路 — 統一抽象なし

### 現状の事実
同一の「ゲームを読み込んで動かす」操作が、独立した4実装で存在する。共通の loader は無い。

| 経路 | 入口 | クエリ | 受け取る型 | 変換 |
|------|------|--------|-----------|------|
| A. ソーシャル送り | `GameSequence.tsx:150`→`SocialService.getPublicGames()` | 2段（メタ→`project_data`を別フェッチ `GameSequence.tsx:166-181`） | `PublicGame`＋後付け `projectData` | なし（直付け） |
| B. 単体プレイ | `pages/play/PlayGamePage.tsx:171-186` | 1発 `select('title,thumbnail_url,project_data')` | `GameProject`（`as` キャスト） | なし |
| C. エディタ | `EditorApp.tsx`→`ProjectStorageManager.ts:216-232` | IndexedDB→Supabaseフォールバック | `GameProject`（メタとマージ） | インラインマージ |
| D. AI生成書込 | `ai/publishers/SupabaseUploader.ts:240-260` | `insert` | `GameProject`（入力） | なし |

- 全経路が `user_games` テーブルの `project_data`（JSONB）を読み書きするが、**フェッチ・キャスト・マージのロジックが各所に重複**（`project_data` 参照は実測 40+ 箇所）。
- `BridgeScreen.tsx`（1,171行）も独自に `project_data` を読む第5の準経路。
- メタデータ（title/description）の出所が「DB行 or `project_data.settings`」で経路ごとに非一貫（`ProjectStorageManager.ts:218-232` はDB行で上書き、Bは生キャスト）。

### リスク
- スケール時に「再生できないゲーム」のデバッグが地獄化。事故が4箇所に分岐し、修正が経路ごとにモグラ叩きになる。
- 認証/公開フラグ/課金ゲートのチェックが経路ごとにバラバラ → **未公開ゲームや課金ゲームの読込漏れ**がセキュリティ/課金事故に直結（Bは `is_published` を見るがCは見ない、等の差異）。
- キャッシュ戦略が経路依存（Cのみ5分TTL）。CDN/プリロード最適化を入れる際に4箇所改修が必要。

### 提案（→ 深掘り §A 参照）
`GameLoadingService` に集約。`loadGame()` を単一窓口にし、`PublicGame → GameProject` 正規化と公開/課金チェックを1箇所へ。Before→After は §A。

### 工数 / 順序
**M**。項目2・6と密接。順序②（6を最優先で潰した後）。

### やらない選択肢
4経路を**読み取り口だけ薄いアダプタ**で包み内部実装は据え置く「最小統合」も可。許容条件: 課金/公開チェックのロジックを1箇所に集約できるなら、フェッチ重複は当面放置してよい。

---

## 2. GameProject vs PublicGame スキーマ不整合 / `game_data` 死蔵カラム

### 現状の事実
- 同じゲームデータに2つの型:
  - `GameProject`（`types/editor/GameProject.ts`）= 完全な編集状態（assets / script / settings / metadata / versionHistory）
  - `PublicGame`（`social/types/SocialTypes.ts:41-60`）= ソーシャル表示メタ ＋ `projectData?: any`（**any でキャスト穴**）
- 唯一の変換器は `SocialService.convertToPublicGame()`（`SocialService.ts:1360-1388`）。`PublicGame → GameProject` の逆変換器は**存在せず**、各経路が `as GameProject` で生キャスト。
- **二重カラムの裏取り**: `user_games` に `game_data` と `project_data` の2カラムが残存。
  - `game_data` は現行コードで**常に空 `{}` を書くだけ**（`SupabaseUploader.ts:247`、`ProjectStorageManager.ts:267`）。読み出しは0。完全な死蔵カラム。
  - `project_data` が現行。`database.types.ts` に両方が型として残る。

### リスク
- `projectData: any` 経由でスキーマ違反データが実行時まで検出されない（§6 の flag バグもこの穴を通る）。
- 死蔵 `game_data` がストレージとマイグレーションの認知負荷。新メンバーが「どちらが正か」で必ず迷う。
- スケール時に行サイズ（JSONB に base64 アセットが入る経路あり、`SupabaseUploader.ts:188-226` で1MB超のみStorage化）→ DB肥大とクエリ遅延。

### 提案
1. `game_data` カラムを廃止（マイグレーションで drop、コードの空書き込み削除）。
2. `PublicGame.projectData: any` を `GameProject | null` に型付け、変換を §A の `GameLoadingService` に集約。
3. アセットは常に Storage URL 化（base64 をDBに入れない）方針へ統一。

### 工数 / 順序
**S–M**。カラム drop は migration 1本（S）。型統一は §1 と同時（M）。順序①（1とまとめて）。

### やらない選択肢
`game_data` drop だけ先行（S）、型統一は見送り可。許容条件: `projectData: any` のまま運用するなら、§A の loader で**1箇所だけ**ランタイム検証（zod等）を通すこと。それなしの放置は不可。

---

## 3. EditorGameBridge シングルトン神オブジェクト

### 現状の事実
`services/editor/EditorGameBridge.ts`（1,653行、`getInstance()` シングルトン）。
- **可変インスタンス状態16フィールド**: `ruleEngine` / `currentContext` / `currentCanvas` / 9個の `currentHandle*`（イベントハンドラ参照）/ `delayScheduler` / `inputZones` / `inputZoneOverrides` 等。
- **3利用者が単一グローバルを共有**:
  - 実プレイ: `GameSequence.tsx`
  - エディタプレビュー: `EditorApp.tsx` / `SettingsTab.tsx`
  - レビューUI: `ReviewQueue.tsx` / `GameReviewQueue.tsx`（＋ `App.tsx` がルート遷移で `stopGame()`）
- **リスナー・ライフサイクルが脆い**:
  - 登録（`:1362-1369`）は canvas と **document** の両方に add。
  - 解放が2経路（`stopGame()` `:87-105` はインスタンス状態 / 正常終了 `:1399-1404` はクロージャ局所参照）で**参照同一性キー**。
  - `executeGame()` を cleanup なしで2回呼ぶと `currentHandle*` が上書きされ**旧リスナーが孤児化**（canvas + document にリーク）。
- **描画は Canvas 2D**（`getContext('2d')`）。PixiJS は使っていない（§N1）。
- RuleEngine はゲーム毎に生成するが**破棄契約が無い**（reset 時に null 化のみ）。

### リスク
- SPA でプレイ→編集→レビューを行き来する実利用で **document レベルの mousemove/mouseup リスナーが蓄積** → 入力の二重発火・メモリリーク・「別ゲームの操作が残る」系の再現困難バグ。スケールで session 長期化すると顕在化。
- 単一グローバル状態のためテストでの分離が不可能（だから §8 でこの層のテストが薄い）。
- 1,653行に描画/入力/ルール評価/音声/ライフサイクルが同居し、変更の影響範囲が読めない。

### 提案（→ 深掘り §C 参照）
3利用者で分割し、リスナーを型で守る `ListenerRegistry` を導入。Before→After は §C。

### 工数 / 順序
**L**。1・4 の後（④）。先に利用者数を ReviewQueue 統合（§4）で減らすと分割が楽。

### やらない選択肢
全面分割せず **`ListenerRegistry` 導入＋ `executeGame` 冒頭で必ず `stopGame()` を呼ぶ防御**だけでリーク事故は止められる（S）。許容条件: テスト容易性を当面諦めるなら、分割は見送ってよい。リーク対策だけは必須。

---

## 4. ReviewQueue 二重実装

### 現状の事実
- `ReviewQueue.tsx`（**613行**、ローカルJSON前提）と `GameReviewQueue.tsx`（**698行**、Supabase）が並走。※事前調査の「962行」は誤り。
- 両者とも `EditorGameBridge` を6箇所前後から呼ぶ（§3 の利用者）。機能（一覧→試遊→合否）はほぼ同じ。

### リスク
- レビュー運用が2系統で、片方だけ直す/データソースが食い違う事故。
- §3 の分割コストを二重に押し上げる。

### 提案
Supabase 版（`GameReviewQueue`）に一本化し、`ReviewQueue.tsx`（ローカルJSON版）を削除。共通の「試遊ハーネス」を §C の `ReviewGameBridge` に寄せる。

### 工数 / 順序
**S**。③（§3 の前に利用者を減らす意味で先行が望ましい）。

### やらない選択肢
ローカルJSON版を「オフライン検証用」として残すなら削除しない。許容条件: 2つの責務（オフライン vs 本番レビュー）を README で明文化し、共通部分だけ関数抽出すること。

---

## 5. AI v2 モノリス / スキーマ版管理なし

### 現状の事実
- `src/ai/` 全体 35,476 LOC。うち **`src/ai/v2/` が 22,113 LOC**（batch 11,055 / publishers 2,205 は別）。
- 巨大ファイル: `SpecificationGenerator.ts` **2,422行**（※事前調査2,303より大）/ `LogicValidator.ts` 1,933 / `EditorMapper.ts` 1,517 / `Orchestrator.ts` 1,185 / `LogicRepairer.ts` 1,154 / `DryRunSimulator.ts` 1,020。
- 生成JSONの**スキーマ・バージョニング戦略が無い**。`contract.ts` が単一の真実（WP31/CLAUDE.md）だが、過去生成物との互換管理やマイグレーション層は存在しない（§6 の flag 形ずれはこの欠如の症状）。

### リスク
- スキーマを進化させると過去生成ゲームが壊れる/壊れたか分からない。「ゲーム版TikTok」で資産（生成済みゲーム）が増えるほど不可逆になる。
- 2,000行級プロンプト生成器はプロンプト改善のたびに回帰リスク。WP11（プロンプトダイエット）と連動が必要。

### 提案
1. 生成JSONに `schemaVersion` を導入し、ロード時マイグレーション層（§6 の正規化と同じ場所）を新設。
2. `SpecificationGenerator` をセクション単位モジュールへ分割（プロンプト断片の合成器化）。
3. `LogicValidator` / `LogicRepairer` のルールをテーブル駆動へ。

### 工数 / 順序
**L**。⑥（基盤統合が済んだ後）。WP11 と調整。

### やらない選択肢
分割せず **`schemaVersion` 付与＋正規化層だけ**先行（S–M）でも、資産破壊リスクの大半は止まる。許容条件: プロンプト改善を当面しないなら大分割は不要。版管理だけは早期必須。

---

## 6. flag条件 v2/エンジン形不整合 — **実バグ・稼働中**（最優先）

### 現状の事実（裏取り済み・これは理論ではなく稼働中のバグ）
- **正典の型**（`GameScript.ts:297-301`）の flag トリガー条件は：
  ```ts
  | { type: 'flag'; flagId: string; condition: 'ON'|'OFF'|'CHANGED'|'ON_TO_OFF'|'OFF_TO_ON' }
  ```
  → `flagValue` フィールドは**存在しない**。
- **エンジン**（`FlagManager.ts:58-86`）は `condition` を switch 評価。未知/欠落なら `default: return false`。
- **AI v2 が出す形**（`EditorMapper.ts:1340-1345`、型は `ai/v2/types.ts:204-206`）：
  ```ts
  { type:'flag', flagId, flagValue: boolean }   // ← condition ではなく flagValue
  ```
  `flagValue` は本来 `SuccessCondition`（`GameScript.ts:577-578`）の形で、**トリガー条件に混入している**。
- 結果: EditorMapper 由来の非フェーズ flag 条件は `condition` 欠落で**常に false**。
- **回避が部分的にしか効いていない証拠**:
  - `PhaseCompiler.ts:9-10`（コメント）＋実装はエンジン形 `condition:'ON'` を**直接出力**して回避。フェーズ系だけ正しい。
  - `DryRunSimulator.ts:500` は `condition.condition === 'OFF' || condition.flagValue === false` と**シミュレータ内だけ互換**。実エンジンには無い。
- → **非フェーズの flag 条件は壊れたまま日次生成されている**。

### リスク
- 「フラグが立ったら成功/出現」系のゲームが**無言で機能しない**。検証層（DryRun）は互換コードで通してしまうため**検出をすり抜ける**。スケールで壊れた資産が累積。

### 提案（→ 深掘り §B。contract.ts を変えない案を優先）
`EditorMapper` 出力を正規化（`flagValue:boolean → condition:'ON'|'OFF'`）。3行規模。Before→After は §B。

### 工数 / 順序
**S**。**①（全WPの最優先）**。CI（WP31）でリグレッションテストを1本足してから着手。

### やらない選択肢
基本「やる」。ただし「flag 条件を AI に生成させない（フェーズ経由のみ許可）」運用回避も可。許容条件: `LogicValidator` で非フェーズ flag 条件を**エラーで弾く**ガードを入れ、`DryRunSimulator:500` の偽互換を**削除**して検出をすり抜けさせないこと。

---

## 7. エディタ巨大コンポーネント / ボイラープレート重複

### 現状の事実
- `src/components/editor/` だけで **24,869 LOC**。
- 巨大: `SettingsTab.tsx` 1,394 / `MoveActionEditor.tsx` 1,328 / `ScriptTab.tsx` 1,327 / `EditorApp.tsx` 1,325 / `ObjectSection.tsx` 1,037 / `EffectActionEditor.tsx` 1,002 / `ObjectStateConditionEditor.tsx` 902。
- アクションエディタ6種・条件エディタ7種（`script/actions/` `script/conditions/`）が**同型のボイラープレート**（フォーム/プレビュー/通知）を各自実装。

### リスク
- 新アクション/条件追加のたびに巨大ファイル＋重複が増殖。`contract.ts` に型を足してもエディタUIの追従コストが高い。
- UI層テスト0（§8）と相まって、編集機能の回帰が検出されない。

### 提案
1. アクション/条件エディタを **スキーマ駆動フォーム**（`contract.ts` のメタから生成）へ寄せ、ボイラープレートを共通化。
2. `SettingsTab` / `ScriptTab` をサブコンポーネント分割。

### 工数 / 順序
**M–L**。⑤。§8 のテスト土台を先に少し入れると安全。

### やらない選択肢
全面スキーマ駆動化は重い。許容条件: 共通フォーム部品の抽出（DRY化）だけ行い、巨大ファイル分割は見送り可。新規アクション追加頻度が低いなら現状維持も許容。

---

## 8. テスト非対称（UI層0件）

### 現状の事実
- テストファイル27件は **`services/rule-engine/`(12) / `ai/v2/`(11) / `types/editor/`(3) / `services/editor/`(1)** に偏在。
- **0件のディレクトリ**: `components/`(67ファイル) / `pages/`(13) / `social/`(4) / `marketing/`(13) / `hooks/`(9) / `managers/`(1)。
- ロジック層（エンジン・AI）は手厚いが、**ユーザーが触る層が無防備**。

### リスク
- §1（読込）§3（Bridge）§7（エディタ）の改修が回帰テストなしで進む。スケール時に「再生できない」「保存が消える」級の事故が無検出で本番へ。

### 提案
- WP33 の各改修に**最低限のスモークテスト**を同伴（読込経路の正規化、Bridge のリスナー解放、ReviewQueue 一本化）。
- `hooks/`（9ファイル）から着手すると費用対効果が高い（純ロジックが多くテスト容易）。

### 工数 / 順序
**M**。横断（各WPに付随）。単独の大規模テスト追加はしない。

### やらない選択肢
全UIのテスト網羅は非現実的。許容条件: 「改修した経路にだけテストを足す」差分主義を徹底するなら、既存の無テスト部分は放置可。

---

## 9. 死蔵コード（marketing / テーマCSS）

### 現状の事実
- `src/marketing/` 13ファイル・3,963 LOC（Discord 542 / Twitter 414 / Instagram 328 / TikTok 199 等）。WP31 の TODO 棚卸しで判明の通り、**外部API未統合のスタブ**（`success:false` か シミュレーションでフェイル）。`package.json` に `marketing:*` スクリプトは存在。
- **テーマCSSは既にほぼ整理済み**（実測 CSS は `index.css` 115行 ＋ `styles/theme.css` 67行のみ）。事前調査の「複数テーマCSS」は **WP22 で解消済みと見られる**（新規発見の訂正）。

### リスク
- 低。ただし 3,963 LOC のスタブが「実装済み機能」と誤認されると、マーケ施策の見積もりを誤る。

### 提案
- marketing は「将来実装の保留棚」として `docs` に意図を明記、または `experimental/` へ隔離。**削除は急がない**（外部API承認待ちのため）。
- テーマCSS は対応不要（WP22 完了確認のみ）。

### 工数 / 順序
**S**。随時。

### やらない選択肢
そのまま放置で実害なし（安全側フェイル）。許容条件: README/CLAUDE.md に「marketing は未実装スタブ」と1行明記すること。

---

## N1.（新規発見）pixi.js が未使用依存 — 実体は Canvas 2D

### 現状の事実
- `package.json` は `pixi.js ^7.3.0` を依存に持ち、CLAUDE.md は「React + PixiJS 7.3」と謳う。
- しかし **`src/` 内に `pixi.js` の import は0件**。`pixi` 文字列はコメント/型名/About ページの宣伝文の6箇所のみ（`viewportUtils.ts` の `PixiAppConfig` も実 PIXI を生成しない）。
- 実際のゲーム描画は **Canvas 2D**（`EditorGameBridge.ts` ほか `getContext('2d')` 7箇所）。

### リスク
- 依存と実装の乖離は新メンバーの誤解の元（「PixiJSで最適化すれば」という的外れな提案を誘発）。バンドルに未使用の重量級依存が残る可能性。
- 逆に、もし将来 WebGL 描画へ移行する意図があるなら、現状は「未着手」を意味する重要シグナル。

### 提案
- 描画方針を確定: (a) Canvas 2D で行く → `pixi.js` 依存削除＋CLAUDE.md 修正。(b) PixiJS 移行予定 → ロードマップに明記。
- どちらにせよ CLAUDE.md の「PixiJS 7.3」記述を実態に合わせる。

### 工数 / 順序
**S**。随時。スケール時の描画性能（多数オブジェクト/エフェクト）を見据えるなら (b) の判断は早めに。

### やらない選択肢
依存を残したまま放置可。許容条件: CLAUDE.md と実態の差を1行注記し、誤解を防ぐこと。

---

# 深掘り設計判断

## §A. GameLoadingService 統一案

**目的**: 4経路（§1）を単一サービスに集約し、`PublicGame → GameProject` 正規化と公開/課金チェックを1箇所へ。`contract.ts` には影響しない。

### Before
```
GameSequence ──► SocialService.getPublicGames() ─► PublicGame(meta)
        └─► supabase.select('id,project_data') ──► 後付け projectData(any)
PlayGamePage ─► supabase.select('project_data') ─► as GameProject     ← 公開チェック有
EditorApp ───► ProjectStorageManager ─► IndexedDB→Supabase ─► merge   ← キャッシュ有
SupabaseUploader(write) ─► insert{ game_data:{}, project_data }
   ▲ 変換・チェック・キャッシュが各経路バラバラ。project_data 参照 40+箇所
```

### After
```
                     ┌──────────────────────────────────────────┐
                     │            GameLoadingService            │
  callers ──────────►│  loadForPlay(id)      : GameProject       │
  (Sequence/Play/    │  loadForEdit(id,user) : GameProject       │
   Editor/Review)    │  loadMetadata(opts)   : PublicGame[]      │
                     │  save(project)        : void              │
                     │  ─ 内部: fetch ▸ normalize(PublicGame▸    │
                     │     GameProject) ▸ publish/payment gate ▸ │
                     │     cache ▸ schemaVersion migrate(§5)     │
                     └──────────────────────────────────────────┘
                                     │ 単一の project_data I/O
                                     ▼
                               user_games(project_data)
                          （game_data は廃止 §2）
```

- 正規化器 `toGameProject(src: PublicGame | Row): GameProject` を1つだけ持ち、`as` 生キャストを撲滅。
- 公開フラグ・課金ゲートを loader に集約（経路差異による読込漏れ §1リスク を解消）。
- キャッシュ層をここへ一本化（現状 Editor のみ5分TTL）。

**工数 M / 順序②**。§6（最優先）と §2（カラム廃止）の後。

---

## §B. flag条件不整合の恒久対応

**方針**: `contract.ts` / `GameScript.ts`（正典）は `condition` 形が正しい。**生成側を正典に合わせる**のが最小。優先度順に3案。

### 案1（推奨）: EditorMapper 出力を正規化
```
Before  EditorMapper.ts:1340  ▶  { type:'flag', flagId, flagValue:boolean }   ✗ engine=false
After   EditorMapper.ts:1340  ▶  { type:'flag', flagId,
                                    condition: value === false ? 'OFF' : 'ON' } ✓
```
- 変更3行。`contract.ts` 不変。全下流（FinalAssembler/エンジン）が即正しくなる。
- 同時に `LogicValidator` に「トリガー条件に `flagValue` があれば error」ガードを追加し再発防止。
- `DryRunSimulator.ts:500` の偽互換（`|| condition.flagValue === false`）を**削除**し、検出のすり抜けを止める。

### 案2: FinalAssembler に変換層
```
EditorMapper(flagValue) ─► FinalAssembler.normalizeFlags() ─► engine形 ─► 保存
```
- 中央集約で確実だが ~20行。生成器が壊れた形を出し続ける構造は温存される。

### 案3（非推奨）: ConditionEvaluator に互換
```
engine ConditionEvaluator ─► if flagValue!==undefined ▸ map to condition
```
- 毎フレーム互換判定のコスト＋アーキ債務の隠蔽。採らない。

**結論**: 案1。**工数 S / 順序①**。WP31 CI にリグレッションテスト1本を先に追加。

---

## §C. EditorGameBridge の分割方針

**目的**: 単一シングルトン（§3）を3利用者で分離し、リスナー・ライフサイクルを型で守る。

### Before
```
            ┌──────────── EditorGameBridge (singleton, 1653行) ────────────┐
GameSequence│ 16可変フィールド / 描画(Canvas2D) / 入力 / ルール評価 / 音声  │
EditorApp ─►│ currentHandle*×9 を参照同一性で add/remove(2経路) ─► 孤児化  │
SettingsTab │ document mousemove/mouseup が解放漏れ ─► リーク              │
Review×2 ──►│ RuleEngine は破棄契約なし                                   │
            └──────────────────────────────────────────────────────────────┘
```

### After
```
   ┌─────────────────────── GameRuntime (共通コア・非シングルトン) ───────────────────────┐
   │  new GameRuntime(canvas, project)                                                     │
   │   ├ RuleEngine（生成〜破棄を所有）                                                    │
   │   ├ ListenerRegistry（add時に記録 ▸ disposeAll()で全解除。参照漏れ不可能に）          │
   │   └ dispose(): 冪等。RAF/timer/audio/listener を確実に解放                            │
   └──────────────────────────────────────────────────────────────────────────────────────┘
        ▲ 利用者は薄いラッパで「モード固有の都合」だけ持つ（状態は GameRuntime にカプセル化）
        │
   ┌────┴─────────┐   ┌──────────────┐   ┌───────────────────────┐
   │ PlayRuntime  │   │ PreviewRuntime│   │ ReviewRuntime          │
   │ (GameSequence)│   │ (Editor/Settings)│ (GameReviewQueue 一本化 §4)│
   │ 単発・確実teardown│ │ 反復start/stop  │ │ バッチ順次・合否記録    │
   └──────────────┘   └──────────────┘   └───────────────────────┘
```

- `ListenerRegistry`: `register(el,type,handler)` で内部に記録、`disposeAll()` で全解除。**参照同一性キーの2経路解放を廃し**、孤児化を構造的に不可能化。
- 各 Runtime は **インスタンス**（シングルトン廃止）→ テストで分離可能（§8 が前進）。
- 先に §4 で利用者を ReviewQueue 1本へ減らしてから着手すると分割が軽い。

**工数 L / 順序④**。最小対応（`ListenerRegistry` ＋ `executeGame` 冒頭で必ず `stopGame()`）だけなら S で事故を止められる（§3 やらない選択肢）。

---

## 推奨実行順序（依存グラフ）

```
① §6 flag恒久対応(S) ─┬─► ② §1+§2 GameLoadingService/カラム廃止(M)
   （+CI回帰テスト）   │
                      └─► ③ §4 ReviewQueue一本化(S) ─► ④ §3 Bridge分割(L)
                                                          │
   ⑤ §7 エディタ共通化(M-L) ◄───────────────────────────┘
   ⑥ §5 AI v2版管理+分割(L)
   横断: §8 テストは各WPに同伴 / §9・N1 は随時(S)
```

理由: §6 は数行で実害が大きく最優先。§1/§2 の基盤統合が他を楽にする。§4 で Bridge 利用者を減らしてから §3 を割る。§5 は基盤が固まった後。

---

# 承認シート

**チェックを入れた項目だけが WP33 の対象**になる。各項目「やる / 最小だけ / やらない」を選択。

| ✓ | # | 項目 | 推奨 | 工数 | 判断（やる / 最小 / やらない） |
|---|---|------|------|------|------|
| ✓ | 6 | flag条件 恒久対応（EditorMapper正規化＋ガード＋偽互換削除） | **やる（最優先）** | S | |
| ✓ | 1+2 | GameLoadingService 統一 ＋ `game_data` カラム廃止 | やる | M | |
| ✓ | 4 | ReviewQueue を Supabase版に一本化・ローカルJSON版削除 | やる | S | |
| ✓ | 3 | EditorGameBridge 分割（GameRuntime + ListenerRegistry） | やる（最小=リーク対策のみ可） | L / 最小S | |
| ✓ | 7 | エディタ・アクション/条件エディタの共通化・分割 | 最小（DRY化）から | M–L | |
| ✓ | 5 | AI v2 schemaVersion 導入 ＋ 大ファイル分割 | 版管理を先行 | L / 版管理M | |
| ✓ | 8 | 改修経路へのスモークテスト同伴（hooks から） | 横断で実施 | M | |
| ✓ | 9 | marketing スタブを保留棚として明記（削除は急がない） | 明記のみ | S | |
| Canvas2D継続 | N1 | 描画方針確定（Canvas2D継続 or PixiJS移行）＋ CLAUDE.md 修正 | 方針決定 | S | |

> 承認後の WP33 は、チェック項目を上の依存グラフ順に S/M 単位で着手する。各改修には §8 のスモークテストを同伴し、WP31 の CI（tsc / test / lint）でガードする。

---

## 付録: 実測サマリ（裏取りの根拠）

- 総量: 293ファイル / 103,946 LOC（`src`）。ディレクトリ別: `ai/` 35,476・`components/` 33,769・`services/` 11,369・`pages/` 5,038・`types/` 4,069・`marketing/` 3,963・`social/` 2,834・`hooks/` 2,767。
- 巨大ファイル top: SpecificationGenerator 2,422 / LogicValidator 1,933 / EditorGameBridge 1,653 / EditorMapper 1,517 / SocialService 1,422 / SettingsTab 1,394 / MoveActionEditor 1,328 / ScriptTab 1,327 / EditorApp 1,325。
- テスト27件: rule-engine 12 / ai-v2 11 / types-editor 3 / services-editor 1。UI層（components/pages/social/marketing/hooks/managers）は **0**。
- 事前調査からの訂正: ReviewQueue は **613行**（962ではない）/ テーマCSSは **WP22で整理済み**（残り theme.css 67行）/ AI v2 は **22,113 LOC**（src/ai 全体が35K）/ flag条件の `flagValue` は正典 `TriggerCondition` に存在せず `SuccessCondition` 由来の混入。
- 新規発見: **pixi.js 未使用（Canvas 2D 実体）**（N1）。
