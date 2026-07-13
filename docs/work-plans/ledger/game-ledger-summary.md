# game-ledger 集計サマリ(自動生成 — 手編集禁止)

生成: 2026-07-13T03:00:20.073Z / 対象: 800本(番号付き 797 + few-shot原型 3)

## 既知事実との突合(検証)

| 指標 | 計測値 | 既知値 | 一致 |
|---|---|---|---|
| MAX_TIME/TIME_LIMIT=15 のゲーム数 | 259 | 259 | ✅
| NEEDED=1 のゲーム数 | 79 | 79 | ✅
| 世界観コメントあり | 91 | 91 | ✅
| distinct slug 数 | 565 | 565 | ✅
| scanlines 自前実装 | 797 | 797 | ✅

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
| 15 | 259 |
| 20 | 135 |
| 18 | 78 |
| 25 | 75 |
| 22 | 54 |
| 24 | 42 |
| 30 | 39 |
| 12 | 21 |
| 5 | 13 |
| 28 | 9 |
| 26 | 8 |
| 40 | 7 |
| 8 | 5 |
| 10 | 4 |
| 35 | 3 |

(未検出: 41本)

## NEEDED 分布

| 値 | 本数 |
|---|---|
| 3 | 136 |
| 1 | 79 |
| 8 | 78 |
| 2 | 61 |
| 10 | 54 |
| 6 | 53 |
| 5 | 50 |
| 12 | 42 |
| 4 | 30 |
| 15 | 12 |
| 20 | 5 |
| 100 | 2 |

## SE / BGM / v2 API 採用状況

| 指標 | 本数 |
|---|---|
| distinct SE ≥3 | 797 |
| melody 使用 | 0 |
| bgm_main 以外のBGM | 0 |
| feedback 使用 | 0 |
| sprite 使用 | 0 |
| gradient 使用 | 0 |
| game.best 使用 | 0 |
| 偽HI-SCORE疑い | 2 |
| @mechanic タグあり | 0 |

## スコア分布

| 帯 | 本数 |
|---|---|
| 50-69 | 684 |
| 70-79 | 113 |

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
