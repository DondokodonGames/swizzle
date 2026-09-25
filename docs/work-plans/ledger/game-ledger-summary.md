# game-ledger 集計サマリ(自動生成 — 手編集禁止)

生成: 2026-09-25T06:31:11.305Z / 対象: 1419本(番号付き 797 + few-shot原型 622)

## 初回計測(2026-07)との突合

| 指標 | 現在 | 初回計測 | 差分 |
|---|---|---|---|
| MAX_TIME/TIME_LIMIT=15 のゲーム数 | 255 | 259 | -4
| NEEDED=1 のゲーム数 | 72 | 79 | -7
| 世界観コメントあり | 109 | 91 | +18
| distinct slug 数 | 565 | 565 | ±0
| scanlines 自前実装 | 797 | 797 | ±0

> v3リファクタで**意図的に変わる**指標(尺・NEEDED・世界観コメント)は、done 本数に見合った差分なら正常。
> 一方「distinct slug 数」と「scanlines 自前実装」はリファクタでは動かないはずの指標で、
> ここが動いたらリネームかパーサの退行を疑うこと。

## 様式(スタイルパック)の分布

見た目の多様性はここが担保する。未宣言が多いうちは「全ゲームが同じ見た目」に見える。

| スタイル | 本数 |
|---|---|
| 80s NEON | 4 |
| 90s 16bit | 4 |
| 2000s ARCADE POP | 3 |
| NEO-RETRO | 3 |
| 70s MONO | 2 |
| 80s ISO | 1 |
| 8bit PC MONITOR | 1 |
| 90s BIG SPRITE | 1 |
| PIXEL HD | 1 |
| 1BIT INK | 1 |
| MODERN AD-GAME | 1 |
| 8bit HOME | 1 |
| (未宣言) | 774 |
| — 次元: 2D | 23 |
| — 次元: 疑似3D | 0 |

## メカニクス分布(推定・slug単位確定後)

| mechanic | 本数 |
|---|---|
| timing_one_shot | 123 |
| judge | 82 |
| aim_shoot | 47 |
| dodge | 47 |
| guide_path | 44 |
| balance | 41 |
| spot | 37 |
| memory_sequence | 36 |
| chase | 34 |
| camera_run | 30 |
| swipe_direction | 27 |
| connect | 26 |
| rhythm | 25 |
| drag_follow | 23 |
| stack | 19 |
| count_exact | 16 |
| timing_window | 15 |
| trace | 14 |
| gap_fit | 14 |
| mash | 13 |
| slice | 11 |
| camera_climb | 10 |
| drag_sort | 10 |
| hold_charge | 6 |
| trajectory | 6 |
| pair_match | 6 |
| rub | 5 |
| size_judge | 5 |
| alternate_tap | 5 |
| reaction_duel | 4 |
| push_out | 4 |
| rotate_gesture | 3 |
| flick_launch | 3 |
| drop_timing | 2 |
| cooldown_tap | 1 |
| counting | 1 |
| slingshot | 1 |
| hold_duration | 1 |

推定確度: high 797 / med 0 / low 0(low/med は mechanic-overrides.json で確定させる)

## 族分布

| family | 本数 |
|---|---|
| C | 229 |
| A | 189 |
| F | 171 |
| E | 89 |
| D | 60 |
| B | 59 |

## MAX_TIME 分布

| 秒 | 本数 |
|---|---|
| 15 | 255 |
| 20 | 132 |
| 18 | 80 |
| 25 | 76 |
| 22 | 54 |
| 24 | 42 |
| 30 | 37 |
| 12 | 18 |
| 5 | 11 |
| 10 | 9 |
| 28 | 9 |
| 26 | 8 |
| 40 | 7 |
| 8 | 6 |
| 13 | 6 |

(未検出: 39本)

## NEEDED 分布

| 値 | 本数 |
|---|---|
| 3 | 134 |
| 8 | 79 |
| 1 | 72 |
| 2 | 60 |
| 10 | 56 |
| 6 | 54 |
| 5 | 52 |
| 12 | 43 |
| 4 | 35 |
| 15 | 12 |
| 20 | 5 |
| 100 | 2 |

## SE / BGM / v2 API 採用状況

| 指標 | 本数 |
|---|---|
| distinct SE ≥3 | 797 |
| melody 使用 | 23 |
| bgm_main 以外のBGM | 0 |
| feedback 使用 | 23 |
| sprite 使用 | 23 |
| gradient 使用 | 23 |
| game.best 使用 | 23 |
| 偽HI-SCORE疑い | 2 |
| @mechanic タグあり | 23 |

## スコア分布

| 帯 | 本数 |
|---|---|
| 50-69 | 662 |
| 70-79 | 112 |
| 80+ | 23 |

## スラグ重複グループ(上位30)

| slug | 本数 |
|---|---|
| gravity-flip | 12 |
| chain-reaction | 9 |
| bubble-pop | 8 |
| tile-flip | 8 |
| orbit-catch | 7 |
| pixel-paint | 7 |
| ice-slide | 7 |
| meteor-shield | 6 |
| color-flood | 6 |
| sand-timer | 6 |
| voltage-surge | 5 |
| shadow-match | 5 |
| hot-potato | 5 |
| shadow-puppet | 5 |
| tower-stack | 5 |
| stack-tower | 4 |
| laser-dodge | 4 |
| rope-cut | 4 |
| balance-beam | 4 |
| neon-snake | 4 |
| tempo-tap | 4 |
| firefly-catch | 4 |
| coin-flip | 4 |
| color-wave | 4 |
| magnet-pull | 4 |
| balloon-pop | 4 |
| echo-tap | 3 |
| freeze-frame | 3 |
| tower-defense | 3 |
| tug-of-war | 3 |

(重複グループ計: 117グループ / 349本)

(assignments は既存のため分布は再計算していない — --reassign で再生成)
