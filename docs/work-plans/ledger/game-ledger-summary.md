# game-ledger 集計サマリ(自動生成 — 手編集禁止)

生成: 2026-07-11T11:04:43.206Z / 対象: 800本(番号付き 797 + few-shot原型 3)

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
| 50-69 | 623 |
| 70-79 | 174 |

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

## 割当の分布(assignments)

### スタイルパック(目標: 各130〜190本)

| pack | 本数 |
|---|---|
| 90s 16bit | 221 |
| 2000s ARCADE POP | 166 |
| NEO-RETRO | 148 |
| 80s NEON | 140 |
| 70s MONO | 122 |

### テーマ

| theme | 本数 |
|---|---|
| custom | 67 |
| space | 34 |
| factory | 32 |
| circus | 32 |
| school | 32 |
| ninja | 31 |
| ocean | 31 |
| night_city | 31 |
| robot | 31 |
| dungeon | 31 |
| music | 31 |
| candy | 31 |
| farm | 30 |
| sports | 30 |
| witch | 30 |
| cat | 30 |
| samurai | 30 |
| dino | 30 |
| forest | 30 |
| western | 29 |
| insect | 29 |
| ghost | 29 |
| pirate | 29 |
| snow | 29 |
| kitchen | 28 |

### 優先度 / Wave

| priority | 本数 |
|---|---|
| P1 | 378 |
| P2 | 338 |
| P3 | 81 |

| wave | 本数 |
|---|---|
| Wave 2 | 100 |
| Wave 7 | 100 |
| Wave 3 | 100 |
| Wave 4 | 100 |
| Wave 5 | 100 |
| Wave 1 | 100 |
| Wave 6 | 100 |
| Wave 8 | 84 |
| Wave 0 | 13 |

### 尺の目標分布(duration_target — 帯域内分散の確認)

| 秒 | 本数 |
|---|---|
| 15 | 155 |
| 10 | 124 |
| 13 | 120 |
| 8 | 85 |
| 18 | 77 |
| 22 | 76 |
| 25 | 69 |
| 17 | 26 |
| 20 | 24 |

### 変化軸の分布

| プレッシャー型 | 本数 |
|---|---|
| 物量型(対象の数が増えていく) | 176 |
| 精度型(判定幅/隙間が狭まっていく) | 164 |
| フェイント型(偽の予兆・ダミーが混ざる) | 158 |
| 変拍子型(間隔・速度が不規則に揺れる) | 153 |
| 加速型(テンポが徐々に上がる) | 146 |

| スパイス | 本数 |
|---|---|
| フィーバータイム(中盤数秒の得点倍増) | 149 |
| 黄金ターゲット(稀に高得点のレアが出る) | 141 |
| サドンデス演出(達成目前の1ミスの緊張を煽る) | 136 |
| 二重課題(終盤たまに2つ同時に来る) | 131 |
| 逆転ボーナス(残り3秒は得点2倍) | 124 |
| コンボ倍率(連続成功でx2→x4→x8) | 116 |

### バッチ多様性検査(クローン量産の構造的防止)

- バッチ数: 80 / バッチ内の distinct メカニクス平均: 9.2
- 同一メカニクスの1バッチ内最大本数: 2(目標≤3)
- 同一slugの1バッチ内最大本数: 1(目標1)
- バッチ内テーマ重複(custom除く): 0件(目標0)
