# WP67: 生成ラインの棚卸し — どれが生きていて、どれが「世界観スワップ」を許しているか

**背景**: 「世界観を変えるだけでゲームシステムが同じ」を許す仕組みを全部撤去したい。
ただし生成過程が複数ラインに分かれており、まずどれが何をしているかを確定させる。

---

## 1. ライン一覧（npm script 単位）

| # | ライン | 入口 | 入力 | 出力 | 状態 | 世界観スワップ |
|---|---|---|---|---|---|---|
| 1 | ルールJSON本線 | `ai:v2:*` | ランダム発想 | `user_games`(rules) | 動く（dry確認済） | 間接（テーマ乱択） |
| 2 | ルールJSONネタ帳線 | `ai:neta:*` | `neta.json` | 同上 | 動く（dry確認済） | 間接 |
| 3 | ルールJSONアイデア線 | `ai:ideas:*` | `src/ai/batch/ideas/*.ts` → `ideas-arcade-bar.json` | 同上 | 未検証 | 間接 |
| 4 | **ファクトリー線** | `ai:build-templates` → `ai:produce-games` | `neta-all.json` 792件 | `templates/*.json` → `user_games` | **ほぼ未使用**（templates は1件のみ） | **直接（本体）** |
| 5 | コードゲーム線 | `ai:code:*` | ランダム発想 | `user_games`(code) | **dry が落ちる**（OPENAI_API_KEY必須） | 間接 |
| 6 | コードゲームネタ帳線 | `ai:code:neta:*` | `neta.json` | 同上 | 進捗ファイルなし＝未使用 | 間接 |
| 7 | examples 出荷線 | `ai:upload:examples` | `src/ai/code/examples/*.js` 800本 | `user_games` | 生きている（800本の出荷経路） | — |
| 8 | ネタ生成線 | `ai:neta:gen` / `ai:build-neta-all` / `ai:neta:trend` | ChatGPT / トレンド | `neta*.json` | trend のみ最近更新 | — |
| 9 | プロンプト進化線 | `ai:evolve` | 失敗ログ | プロンプト改善案 | 未使用 | — |
| 10 | 計測系 | `ai:status` / `ai:code:status` / `games:ledger` / `games:ip` / `ai:neta:space` / `games:dup` / `games:smoke` | — | レポート | 生きている | — |
| 11 | **人手/Codex線** | npm script ではない | 仕様書一式（WP13/24/56 + `docs/ai-generation/*`） | `examples/*.js` へ直接コミット | **これが実線** | — |

### 800本を実際に作ったのは 11 番

- `neta-progress.json` の処理済みは **1件**、`neta-code-progress.json` は**存在しない**、`templates/` は **1ファイル**
- git履歴は `Add games #618-627` … `#791-800 — COMPLETE 800 games` のように **10本ずつの手コミット**（18コミット）
- つまり自動ライン（1〜6）はほぼ空回りで、**実際の製造は人手/Codexセッション**だった

---

## 2. 「世界観だけ変えれば別ゲーム」を許している箇所

| # | 箇所 | 何をしているか | 度合い |
|---|---|---|---|
| A | `src/ai/v2/template-factories/`（8ファクトリー） | 8個の固定ロジック × 792ネタ。可変なのは `targetObjectDescription` / `backgroundDescription` / メッセージ / 回数のみ | **設計そのもの** |
| B | `run-produce-games.ts` の `--variations 5` | ヘルプに `# 1テンプレート×5テーマ` と明記。**機能として提供している** | **設計そのもの** |
| C | `run-build-templates.ts` | ネタ792件をファクトリーへ流し込む前段 | Aの供給路 |
| D | `GameConceptGenerator` の設計思想 | 「多様性は類似度ゲート＋パターン分布＋**テーマ乱択**が担保する」とコメントに明記。`themes.json` をコード側で乱択注入 | 思想レベル |
| E | `FailurePatternTracker` の `CONCEPT_TOO_SIMILAR` 指示文 | 「**テーマの切り口**・操作方法・成功条件の**いずれか**を大きく変えて差別化」＝ テーマだけ変えても可と読める | 文言レベル |
| F | WP56 + `game-assignments.csv` | メカニクスと勝敗条件は変えない、差別化は theme / variation / spice。gravity-flip 12本が全て `camera_run` のまま世界観だけ振られている | 計画レベル |

> 区別: `ARCADE_ART_DIRECTION.md` のスタイルパックや `themes.json` 自体は
> **見た目の統一のための語彙**であって、遊びの差別化手段ではない。撤去対象は
> 「テーマを変えれば別ゲームとして成立させてよい」という**仕組みと文言**の方。

---

## 3. 棚卸しで見つかった別の問題

1. **コード線がルール線の制約を継承している**
   `CodeOrchestrator` は Step 1 で `GameConceptGenerator` を再利用する。そのプロンプトには
   「物理演算なし / NPCのAI追尾なし / シングルタッチのみ」というハード制約が入っている。
   これは**ルールエンジンの限界**であって、JSサンドボックス（`iframeTemplate.ts`）には当てはまらない。
   実際 examples には重力反転も跳ね返りも多点入力もある。
   → コードゲームの発想段階で、無関係な制約により単純なタップ系へ削られている。**収束の一因**。
2. **dry run が動かないラインがある**
   `ai:code:dry` は `DRY_RUN=true` でも OPENAI_API_KEY を要求して落ちる。
   `ai:produce-games:dry` も ANTHROPIC_API_KEY で落ちる。乾式で構造だけ検証できない。
3. **ネタ帳が23ファイル・延べ2384件（ユニーク1428）** に分裂。どのラインがどれを読むかがバラバラ
   （`neta.json` / `neta-all.json` / `ideas-arcade-bar.json` / `neta_01..20` / `neta-trend.json`）。

---

## 4. 撤去は保留（2026-08-18 決定）

自動ラインは800本の製造に関与していなかった＝**今の収束の原因ではない**ため、撤去は急がない。

> **保留条件**: ゲームのクオリティが安定したら着手する。
> 安定の目安 = v3書き換えが一定量進み、新規生成が v3 ゲート（validator+scorer≥80+smoke）を
> 安定して通るようになった時点。そこで初めて「世界観スワップを許す仕組み」を消しても
> 代替の作り方が確立している状態になる。

撤去対象と手順は下記に残す（着手時にそのまま使う）。

## 5. 整理案（保留中。着手は上記条件を満たしてから）

### 撤去する（世界観スワップの実体）
- `src/ai/v2/template-factories/`（8ファクトリー + FACTORY_MAP + types + index）
- `src/ai/v2/run-build-templates.ts` / `src/ai/v2/run-produce-games.ts` / `src/ai/v2/ParameterExtractor.ts`
- `src/ai/v2/templates/`（生成物1件）
- npm scripts: `ai:build-templates` / `ai:produce-games` / `ai:produce-games:dry` / `ai:produce-games:mock`

### 文言・思想を直す（撤去ではなく書き換え）
- `GameConceptGenerator`: 「テーマ乱択が多様性を担保する」という設計思想を捨て、
  **遊びの型（メカニクス）で差別化する**に置き換える。テーマ注入は見た目の語彙としてのみ残す
- `FailurePatternTracker` の `CONCEPT_TOO_SIMILAR` 指示: 「テーマを変える」を差別化手段から外し、
  **操作・勝敗条件・プレッシャーのいずれかを変える**に限定する
- WP56 の「メカニクスを変えない」: 重複群に限り解除（WP66 の振り替え案と接続）

### 直す（撤去とは別件）
- コード線の発想プロンプトを、ルールエンジンの制約から切り離す
- `ai:code:dry` / `ai:produce-games:dry` の DRY_RUN 対応
- ネタ帳の統合（WP66 参照）

### 判断が要るもの
- ライン 1・2・3（ルールJSON線）を残すか。コードゲームが本線になった今、
  ルールJSON線は**エディタでユーザーが作る**ための資産でもあるため、生成ラインとしてだけ止める選択もある
