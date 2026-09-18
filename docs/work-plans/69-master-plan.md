# マスタープラン — 制作リストの全ゲームが完成するまで

**以後の全セッションはこのファイルに従う。**（承認済み 2026-09-18）
進捗はここではなく `production-list.csv` の `status` 列と `game-assignments.csv` に記録する。

## 「完成」の定義

1. `production-list.csv` の全行に `tier` が付いている（1 作る / 2 候補 / 3 在庫 / discard）
2. **tier=1 と tier=2 の全行**に `play`（固有名詞なしの遊びの一文）があり、ゲームが実装され、ゲートを通り、拠点で計測されている
3. 系統ごとの再投入率が実測で出ていて、当たった系統の生成が **1日20,000本**で回る
4. 797本は削除済み、旧生成ライン（template-factories 等）は撤去済み

tier=3（在庫）と discard は作らない。数千本のうち何本が tier=1/2 になるかは Phase 1 の結果で決まる（現時点の目安: 系統14 × verdict 明/半 の割合から 2〜3万行が tier=2。**全部を手で作る前提ではない** — Phase 5 の自動化で消化する）。

## 現在地（2026-09-18）

| 済み | 未 |
|---|---|
| 制作リスト 62,705行（`games:list`、冪等） | `npm ci`（registry 503 で再試行中）→ CSV 再生成・型検査・検証コミット |
| genre 実データ 14機種、`playFamilies.ts`（14系統・verdict 既定・拠点） | 系統別件数を WP68 に貼る |
| `end.record` / 多点タッチ smoke / 運型の結果表示 | `tier1.txt`（第1波の選定） |
| SIMPLE 386本の play | I/J/K/D/Switch の**検証済み**一覧（今は `source=memory`） |
| WP56 廃止 / WP61 役割変更 / WP68 / CLAUDE.md | 797本の削除、旧ラインの撤去 |

---

## Phase 0 — 環境と検証コミット（今日）

1. `npm ci` 完了 → `npm run games:list` → `tsc` / `npm run test` / `npm run lint`
2. 系統別件数（出力の「系統:」行）を `68-game-list-policy.md` §4 に貼る
3. コミット「production-list: genre/family/verdict/tier 付与（検証済み）」→ push

**ゲート**: 冪等（2回実行で md5 一致）、`genre_source=libretro` ≒ 11,000、L 全行 `tier=discard`。

## Phase 1 — 一覧を完成させる（1〜2セッション）

| 作業 | ファイル | 完了条件 |
|---|---|---|
| 系統の既定 verdict を行単位で見直す（SIMPLE 386 は play があるので全行判定） | `sources/verdicts.tsv` | GH 386 行に verdict と why |
| 第1波の選定: 系統ごとに1〜2本、verdict=明、5〜30秒で成立、`end.record`/`touches`/`stats.label` のどれかが使える | `sources/tier1.txt` | 20〜30 id。選定理由を WP68 §5 に |
| I/J/K/D/Switch を検証済み一覧に差し替え（貼り込み。`#! source=memory` を消す） | `sources/{warioware,marioparty,rhythm,mobile,switch}.txt` | `source=memory` が 0 |
| genre が薄い機種（DS 1% / 3DS / PSP / PS / PS2 / アーケード）の推定精度を上げる | `playFamilies.ts` の keywords | `(未分類)` が全体の 20% 未満 |
| E に無い機種（PS3 以降・Switch）は貼り込みで補う | `sources/switch.txt` ほか | — |

**ゲート**: `games:list` が「貼り込み待ち」を出さない。tier=1 が確定。

## Phase 2 — 第1波（系統ごとに1本 ≒ 20〜30本、2〜3セッション）

1本のサイクル（B05 で確立した手順をそのまま。**共通テンプレを先に作って流用しない**）:

```
tier1 の行を読む → play を確認（無ければ書く）→ 終了時に何が残るかを1行で決める（点/順位/勝敗/当たり外れ）
 → 世界観を play から導出 → 様式を在庫の薄い所から（ARCADE_ART_DIRECTION）
 → 実装（examples/ ではなく src/ai/code/games/<family>/<id>.js に置く）
 → validator valid / scorer ≥80 / smoke PASS（drag・multi は inputKinds で確認）/ スクショ目視
 → production-list の status=built、assignments に wave=W1
```

**1本の完成条件（1コイン1プレイ）**: 終了画面で **正解/不正解** と **満足/不満足** が自分で言える。点・順位・勝敗・当たり外れのどれかが必ず残る。「N回できた」だけの終わりは不合格（verdict 不明扱いで作り直し）。

**ゲート（波の終わり）**: 全本ゲート通過、`games:ledger` 再生成、`games:ip` error 0、tsc/test/lint、コミット・push。

## Phase 3 — 拠点で測る（実運用・2〜4週）

| 作業 | どこ |
|---|---|
| 第1波を拠点のラインナップに載せる | `nfc_spot_games`（管理UI） |
| 1本あたりの **再投入率**（同一端末で同ゲームを続けて遊んだ率）と 1プレイ売上 を系統別に取る | `admin_spot_game_stats` / `analytics_events.spot_id` |
| Bar / 食堂 / 観光 で系統の効き方の差を見る | `admin_spot_audience_stats` |
| Stripe Payment Link → webhook → `purchase(spot_id)` を実決済で1回確認 | `stripe-webhook` |

**ゲート**: 系統別に「再投入率」「1拠点あたり月額」が数字で出る。これが第2波の唯一の判断材料。**数字が出るまで第2波を始めない。**

## Phase 4 — 第2波以降（当たった系統を厚くする）

- 再投入率 上位の系統 → tier=2 の行を上から作る（1波 = 10本 = 1セッション、Phase 2 の手順）
- 下位の系統 → tier=3（在庫）へ戻す。作らない
- 各波の終わりに Phase 3 の計測を繰り返す（波ごとに数字を更新）
- **手作りの目安**: 当たった系統 × 各20本まで（≒100〜200本）。ここまでは人が1本ずつ作る。これ以上は Phase 5

## Phase 5 — 自動化（生成システム + 監査システム）→ 20,000本/日

前提: Phase 4 で「この系統は、こう作ると再投入される」が**実測**で分かっていること。それを教師にする。

| 生成 | 監査 |
|---|---|
| 入力 = production-list の tier=2 行（play が空なら題名→play をまず生成） | `CodeGameValidator`（権利 + 文法 + `end.record`/`touches`/`label` のいずれか必須） |
| 系統ごとに Phase 4 の当たり本を few-shot（固定ペアではなく系統ローテ: WP64） | `CodeQualityScorer` ≥80 |
| 出力は `src/ai/code/games/<family>/` | smoke（drag / multi / 音の判定を含む） |
| 1日20,000本 = 系統14 × 並列。`ai:*` の旧ラインは使わず、新しい `games:gen` を作る | **verdict 監査**（新規）: 終了画面に点/順位/勝敗/当たり外れが出るかを静的 + 実行で検査 |
| | 拠点計測（実測が最終審判。自動生成分も系統別に再投入率を取る） |

**ゲート**: 1日分のバッチが全ゲートを通り、拠点の再投入率が手作り分と同水準。

## Phase 6 — 撤去（品質が安定してから・既決）

1. `src/ai/code/examples/*.js` 797本を削除（few-shot 原型3本と `__tests__/fixtures` は残す。`CodeGameGenerator` が読む `tap-target.js` / `swipe-direction.js` は `games/` の当たり本に差し替え）
2. `template-factories/` / `run-build-templates.ts` / `run-produce-games.ts` / `ParameterExtractor.ts` / `templates/` と関連 npm script を削除
3. `game-ledger.csv` / `game-assignments.csv` は計測記録として凍結

## 毎セッションの型

1. `git fetch && git merge --ff-only`（環境が再作成されることがある。`node_modules` が無ければ `npm ci`）
2. このファイルの Phase を確認 → `production-list.csv` の `status` で現在地を見る
3. 1セッション = 1波（10本）か、Phase 1/3/5 の1項目
4. 終わりに: `games:list` / `games:ledger` 再生成 → tsc / test / lint / `games:ip` → コミット → push
5. 判断（verdict の上書き、系統の変更、tier の変更）は必ず `sources/*.tsv` か WP68 に理由つきで残す

## やらないこと

- tier=3 / discard を作る
- 797本を参照・比較・磨く
- 軸を先に決めて量産する（系統は分布から、当たりは実測から）
- 記憶で題名を足す（貼り込みか実データ）
- 数字が出る前に第2波・自動化を始める
- 共通テンプレを先に作って10本にスタンプする

## 検証（プラン全体）

- Phase 0: `games:list` 冪等、tsc/test/lint 通過
- Phase 1: `source=memory` 0、`(未分類)` < 20%、tier=1 確定
- Phase 2: 第1波 全本 validator/scorer/smoke 通過、終了画面に判定が出る
- Phase 3: 系統別の再投入率・拠点月額が `admin_spot_game_stats` から取れる
- Phase 4〜5: 波ごとに同じ数字を更新。自動生成分の再投入率が手作りと同水準
- Phase 6: 削除後に `npm run test` / `tsc` / few-shot 読み込みが通る
