# WP68: ゲーム一覧の方針 — 多様性と「1コイン1プレイ」の判定

**目的**: `production-list.csv`（62,705行）を「題名の在庫」から「作るべきゲームの一覧」にする。
**生成**: `npm run games:list`（`scripts/build-production-list.ts` + `src/ai/code/playFamilies.ts`）
**列辞書**: `docs/work-plans/ledger/sources/README.md`

## 1. 前提の変更（2026-09-18）

| 変更 | 理由 |
|---|---|
| 既存797本（`src/ai/code/examples/*.js`）は**破棄** | 成功条件589通り・失敗条件408通りが、数値を正規化すると「時間内にN回・Nミスで終了」の1種に潰れる。磨いても多様性は出ない。`tier=discard`、比較にも使わない |
| マネタイズの基準は「限界の上で死ぬ」ではなく **1コイン1プレイ** | 1プレイの終わりに、自分のプレイについて **正解／不正解** と **満足／不満足** が明確に分かること。これを `verdict` 列にする |
| 多様性は**業界の分布**に対して測る | 797本との差（gap）は測らない |

## 2. 業界の多様性（実データ）

libretro-database の `metadat/genre/`（14機種）。リージョン違いを名寄せして **12,336本・31ジャンル**。

| ジャンル | 本数 | ジャンル | 本数 |
|---|---|---|---|
| Platform | 1,959 | Beat'em Up | 259 |
| Action | 1,827 | Compilation | 245 |
| Sports | 1,782 | Gambling | 178 |
| Role-playing (RPG) | 1,079 | Educational | 95 |
| Racing | 675 | Hunting and Fishing | 79 |
| Strategy | 659 | Card | 70 |
| Puzzle | 631 | Sports with Animals | 69 |
| Adventure | 605 | Pinball | 62 |
| Shoot'em Up | 418 | Quiz | 61 |
| Board | 414 | Various | 52 |
| Shooter | 407 | Casual Game | 40 |
| Fighting | 304 | Music / Dancing | 38 |
| Simulation | 275 | Lightgun Shooter | 30 |
| （Adult 11 / Thinking 6 / Demo 4 / Music 1 / N/A 1） | | | |

機種別の付与率（E 側の題名との突合）: SFC 92% / A2600 89% / N64 88% / PCE 87% / GBA 86% / GG 85% / GB 79% / MD 79% / FC 70% / GBC 67% / SMS 65% / **DS 1%**（libretro 側が薄い）。3DS / PSP は 0。ジャンルが無い行は題名のキーワードから推定し `genre_source=inferred` で区別する。

## 3. 系統（family）— 分布を見てから起こした

5〜30秒で成立する「核」でジャンルを束ねた。規則は `src/ai/code/playFamilies.ts`。

| 系統 | 束ねたジャンル | verdict（既定） | なぜ | 拠点 |
|---|---|---|---|---|
| 撃つ | Shoot'em Up / Shooter / Lightgun | **明** | 撃墜数・点が残る。外した弾も見える | bar / 観光 |
| 殴る・斬る | Fighting / Beat'em Up | **明** | 勝敗が出る。何を食らったかも見える | bar |
| 競う速さ | Racing | **明** | タイム・順位が残る | bar / 観光 |
| 球技・スポーツ | Sports / Sports with Animals | **明** | 得点・勝敗。入った/外したが一目 | bar / 食堂 |
| 賭け・運 | Gambling / Pinball（+占い） | **明** | 当たり外れが一瞬で出る。腕に関係なく満足/不満足が決まる | bar / 食堂 / 観光 |
| 答える | Quiz / Educational | **明** | 正誤が即出る | 食堂 |
| 音に乗る | Music / Dancing | **明** | 拍ごとに良し悪し。画面を見なくても分かる | bar / 観光 |
| 狩る・釣る | Hunting and Fishing | **明** | 釣れた/逃した。大きさで満足 | 食堂 / 観光 |
| 盤・札 | Board / Card / Strategy | 半 | 勝敗は明だが、1手で満足したかは局面次第 | bar / 食堂 |
| 解く | Puzzle / Thinking / Casual | 半 | 解けた/解けないは明。時間内の出来は見せ方次第 | 食堂 / 観光 |
| 走る・跳ぶ | Platform / Action | 半 | どこまで行けたかは残る。満足はコース次第 | 観光 |
| 探す・選ぶ | Adventure / RPG | 不明 | 1プレイでは何も定まらない | — |
| 育てる・回す | Simulation | 不明 | 積み上げ型。1プレイの終わりに正誤が出ない | — |
| その他 | Compilation / Various / Adult / Demo | 不明 | 1つの遊びに絞れない | — |

**verdict の判定基準**（1コイン1プレイ）:
- **明** = 終わった瞬間に、点・順位・勝敗・当たり外れのどれかが残り、「何が正解で何が不正解だったか」と「満足したか」の両方が自分で言える
- **半** = 片方だけ（例: 勝ち負けは出たが、自分の手が良かったかは分からない）
- **不明** = 「N回できた」しか残らない（797本がこれ）

系統の既定値は行単位で `sources/verdicts.tsv`（`id<TAB>verdict<TAB>why`）で上書きできる。

## 4. 一覧の見方

<!-- family-counts -->（`npm run games:list` の出力を貼る。手で数字を書かない）

- `tier=1` 作る（`sources/tier1.txt` に id を列挙。系統ごとに1本、verdict=明）
- `tier=2` 候補（verdict 明・半）
- `tier=3` 在庫（verdict 不明・未分類）
- `tier=discard` 797本

## 5. 施策

1. **第1波** — 系統ごとに1本、verdict=明。題材は SIMPLE 386本の play（固有名詞なしで書けている）から選ぶ。終了画面に点・順位・勝敗・当たり外れのどれかを必ず出す（`end.record` / `game.touches` / `stats.label` はその手段）
2. **拠点で測る** — `nfc_spot_games` に載せ、`admin_spot_game_stats` で系統別の再投入率を取る。判定は実測だけ
3. **第2波** — 再投入率の高い系統を厚くし、低い系統を在庫へ。ここで初めて量産
4. **20,000本/日** — 第2波で当たった系統に絞って自動化

## 6. やらないこと

- 62,705行すべてに play を書く（tier=1 だけ）
- 軸を先に決める（family は分布から）
- 記憶で題名を足す
- 797本を参照・比較に使う
