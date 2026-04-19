# Swizzle Game Engine — 実装済み機能と制限

> 調査対象: `src/services/rule-engine/` (RuleEngine, ConditionEvaluator, ActionExecutor, PhysicsManager, EffectManager, CollisionDetector, FlagManager, CounterManager)
> 調査日: 2026-04-18

---

## 1. 条件タイプ（Conditions）

### touch
| パラメータ | 型 | 必須 | デフォルト | 説明 |
|---|---|---|---|---|
| touchType | `'down'` \| `'up'` \| `'hold'` \| `'drag'` \| `'swipe'` \| `'flick'` | ✅ | — | タッチ種別 |
| target | `'self'` \| `'stage'` \| objectId | ✅ | — | 判定対象 |
| region | `{shape:'rect'/'circle', x, y, width?, height?, radius?}` | — | なし | 領域限定（stage用） |
| dragType | `'start'` \| `'dragging'` \| `'end'` | — | — | drag 詳細 |
| direction | `'up'/'down'/'left'/'right'/'any'` | — | — | swipe/flick 方向 |
| minDistance | number | — | 100px | swipe 最小距離 |
| maxDuration | number | — | 500ms | swipe/flick 最大時間 |
| minVelocity | number | — | swipe:500 flick:1000 px/s | 最小速度 |
| holdDuration | number | — | 1000ms | hold 判定時間 |

**⚠️ 重要な制限**:
- **`touchType: 'down'` のみ動作が確認済み**。`drag`/`swipe`/`flick` は EditorGameBridge が `type='touch', touchType='down'` のみ生成するため、これらの条件は現状ではほぼ発火しない。
- **マルチタッチ非対応**: `touches[0]` のみ処理（ピンチ・回転ジェスチャー不可）。
- `region` の `shape` は `'rect'` と `'circle'` のみ（多角形不可）。

---

### collision
| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| target | `'stageArea'` \| `'other'` \| objectId | ✅ | 衝突対象 |
| collisionType | `'enter'` \| `'stay'` \| `'exit'` | ✅ | 衝突タイプ |
| checkMode | `'hitbox'` \| `'pixel'` | — | デフォルト hitbox |
| region | `{shape, x, y, width?, height?, radius?}` | — | stageArea 用領域 |

**⚠️ 制限**:
- **`checkMode: 'pixel'` は未実装**。常に AABB（矩形）当たり判定。
- オブジェクト同士は矩形ヒットボックスのみ。
- 衝突解決（押し戻し・反発）は条件側では行わない（物理アクションが別途必要）。

---

### time
| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| timeType | `'exact'` \| `'range'` \| `'interval'` | ✅ | 判定種別 |
| seconds | number | exact 時必須 | 経過秒数（±0.1秒の許容誤差あり） |
| range | `{min, max}` | range 時必須 | 範囲（秒） |
| interval | number | interval 時必須 | 繰り返し間隔（秒） |

---

### counter
| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| counterName | string | ✅ | カウンター名 |
| comparison | `'=='/'!='/'<'/'>'/'<='/>='/'between'/'notBetween'` | ✅ | 比較演算子 |
| value | number | ✅ | 比較値 |
| rangeMax | number | between 時 | 上限値 |

---

### flag
| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| flagId | string | ✅ | フラグ名 |
| condition | `'ON'/'OFF'/'CHANGED'/'ON_TO_OFF'/'OFF_TO_ON'` | ✅ | 条件種別 |

---

### position
| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| target | objectId | ✅ | 対象オブジェクト |
| area | `'inside'/'outside'/'crossing'` | ✅ | 領域の内外 |
| region | `{shape, x, y, width?, height?, radius?}` | ✅ | 判定領域（正規化座標） |

**制限**: オブジェクト中心点のみ判定（バウンディングボックス全体ではない）。

---

### animation
| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| target | objectId | ✅ | 対象オブジェクト |
| condition | `'frame'/'end'/'start'/'loop'/'playing'/'stopped'/'frameRange'` | ✅ | 判定種別 |
| frameNumber | number | frame 時 | 対象フレーム番号 |
| frameRange | `[min, max]` | frameRange 時 | フレーム範囲 |
| loopCount | number | loop 時 | ループ回数（⚠️ カウント実装に不具合あり） |

---

### gameState
| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| state | `'playing'/'paused'/'success'/'failure'` | ✅ | 判定状態 |
| checkType | `'is'/'not'/'became'` | — | デフォルト `'is'` |

---

### random
| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| probability | number (0.0–1.0) | ✅ | 発火確率 |
| interval | number (ms) | — | 最小チェック間隔 |
| seed | string | — | 決定論的乱数用シード |

---

### objectState — ⚠️ **型定義のみ、実装なし**
`type: 'objectState'` は GameScript.ts に型定義はあるが、ConditionEvaluator に switch ケースが存在しない。**使用不可。**

---

## 2. アクションタイプ（Actions）

### ゲーム制御
| type | 主なパラメータ | 動作 |
|---|---|---|
| `success` | `score?`, `message?` | 1秒後ゲーム成功終了 |
| `failure` | `message?` | 1秒後ゲーム失敗終了 |
| `addScore` | `points: number` | スコア加算 |

**未実装**: `pause`, `restart` は型定義のみ（switch ケースなし）。

---

### 表示
| type | 主なパラメータ | 動作 |
|---|---|---|
| `show` | `targetId` | `visible = true`。**`fadeIn`/`duration` は宣言のみで未使用** |
| `hide` | `targetId` | `visible = false`。**`fadeOut`/`duration` は宣言のみで未使用** |

---

### 移動
| type | `movement.type` | 主なパラメータ |
|---|---|---|
| `move` | `straight` | `target?`, `direction?`, `speed`, `duration?` |
| `move` | `teleport` | `target`（座標またはobjectId） |
| `move` | `wander` | `speed`（ランダム方向） |
| `move` | `stop` | — （速度 0 にリセット） |
| `move` | `swap` | `target`（objectId、位置交換） |
| `move` | `approach` | `target`, `speed`（5px 以内で停止） |
| `move` | `orbit` | `target`, `speed`（角速度） |
| `move` | `bounce` | — （キャンバス境界で反射） |
| `followDrag` | — | `targetId`, `constraint?`, `smooth?`, `smoothFactor?` |

**制限**: `easing` パラメータは宣言のみで未使用。

---

### 物理演算
| type | 主なパラメータ | 動作 |
|---|---|---|
| `applyForce` | `targetId`, `force:{x,y}` | 加速度を加算（mass 考慮） |
| `applyImpulse` | `targetId`, `impulse:{x,y}` | 速度を瞬時変更 |
| `setGravity` | `targetId`, `gravity:number` | 個別重力設定 |
| `setPhysics` | `targetId`, `physics:Partial<PhysicsProperties>` | 物理プロパティ一括設定 |

**物理タイプ**:
- `static`: 一切動かない
- `kinematic`: 速度のみ（重力・力なし）
- `dynamic`: 重力・空気抵抗・反発あり

---

### エフェクト
| type | `effect.type` | 主なパラメータ |
|---|---|---|
| `effect` | `scale` | `scaleAmount`, `duration` |
| `effect` | `flash` | `flashColor?`, `flashIntensity`, `flashFrequency` |
| `effect` | `shake` | `shakeIntensity`, `shakeDirection:'horizontal'/'vertical'/'both'` |
| `effect` | `rotate` | `rotationAmount` (度), `rotationDirection`, `duration` |
| `effect` | `particles` | `particleType`, `particleCount` 他 — **⚠️ 未実装（パーティクルシステムが接続されていない）** |

---

### 音声
| type | 動作 |
|---|---|
| `playSound` | `soundId`, `volume?` — **実装済み** |
| `stopSound`, `playBGM`, `stopBGM` | 型定義のみ、**switch ケースなし（未実装）** |

---

### カウンター・フラグ
| type | 主なパラメータ | 動作 |
|---|---|---|
| `counter` | `counterName`, `operation:'increment'/'decrement'/'set'/'add'/'subtract'/'multiply'/'reset'`, `value?` | カウンター操作 |
| `setFlag` | `flagId`, `value:boolean` | フラグ設定 |
| `toggleFlag` | `flagId` | フラグ反転 |

---

### アニメーション
| type | 主なパラメータ |
|---|---|
| `playAnimation` | `targetId`, `play:boolean` |
| `setAnimationSpeed` | `targetId`, `speed:number` (fps) |
| `setAnimationFrame` | `targetId`, `frame:number` |
| `switchAnimation` | `targetId`, `animationIndex`, `speed?`, `autoPlay?`, `loop?`, `startFrame?` |

---

### ランダムアクション
| type | 主なパラメータ |
|---|---|
| `randomAction` | `actions:[]`, `weights?:[]`, `selectionMode?:'weighted'/'probability'/'uniform'` |

---

## 3. できないこと（重要）

### ❌ NPCの自律移動（AIステアリング）
`move: wander` は「ルール実行のたびにランダム方向へ動く」だけ。
- 「プレイヤーを追いかける」「障害物を避けながら移動する」「特定のパスを巡回する」は不可。
- 実現可能な代替: `wander` や `straight` をランダム条件で定期的に発火させる。

### ❌ 物理演算（オブジェクト間）
- オブジェクト同士の衝突応答（押し戻し・反発）は未実装。
- 重力は常に下方向のみ（方向変更不可）。
- ジョイント・バネ・コンストレイント不可。

### ❌ パーティクルエフェクト
`effect.type: 'particles'` は型定義済みだが実際には描画されない。

### ❌ フェードイン/フェードアウト
`show` と `hide` の `fadeIn`/`fadeOut`/`duration` パラメータは宣言のみで無視される。

### ❌ 複数オブジェクトへの一括ルール適用
1ルール = 1オブジェクト。`forEach` 的な一括適用は不可。
N個のオブジェクトにはN個のルールが必要。

### ❌ マルチタッチ
`touches[0]` のみ処理。ピンチ・2本指ジェスチャー不可。

### ❌ swipe/flick/drag 条件（現状）
EditorGameBridge が `touchType: 'down'` イベントのみ生成するため、これらの条件は発火しない。
`followDrag` アクションは動作する（別途ドラッグ位置を追跡するため）。

### ❌ pause / restart アクション
型定義のみ。実行時に何も起きない。

### ❌ stopSound / playBGM / stopBGM アクション
型定義のみ。実行時に何も起きない。

### ❌ キーボード入力・加速度センサー
実装なし。

---

## 4. LLMへの制約プロンプト（EditorMapper / GameConceptGenerator 用）

```
# エンジン実装済み機能（使ってよいもの）

## タッチ入力
- touch, touchType: 'down' → オブジェクトをタップ（最も確実）
- touch, touchType: 'up'   → タップ離し
- touch, touchType: 'hold' → 長押し（holdDuration指定）
- followDrag アクション    → オブジェクトをドラッグで動かす

## 当たり判定
- collision, 'enter'/'stay'/'exit' → AABB矩形当たり判定
- position, 'inside'/'outside' → 領域判定（オブジェクト中心点）

## ゲーム制御
- success / failure → ゲーム終了
- time, 'exact'/'interval' → タイマー発火
- counter, increment/decrement/set → カウンター操作
- flag, setFlag/toggleFlag → フラグ管理

## 移動
- move: straight / teleport / wander / bounce / approach / orbit / swap
- followDrag（ドラッグ追従）

## 物理（単体オブジェクト）
- dynamic physics: 重力・空気抵抗・反発（キャンバス底面のみ）
- applyImpulse / applyForce

## エフェクト（視覚）
- effect: scale / flash / shake / rotate（particles は不可）
- playSound

# エンジン未実装機能（絶対に使わないこと）

❌ swipe / flick 条件 → 発火しない（followDragアクションは使える）
❌ particles エフェクト → 描画されない
❌ fadeIn / fadeOut → show/hideのパラメータとして宣言があるが無視される
❌ pause / restart アクション → 何も起きない
❌ stopSound / playBGM / stopBGM → 何も起きない
❌ objectState 条件 → 未実装
❌ NPC追跡AI・経路探索 → wander（ランダム方向）しかない
❌ オブジェクト間物理応答 → 当たった際に押し戻しや反発はない（ルールで明示的に対応が必要）
❌ 物理重力の方向変更 → 常に下方向のみ
❌ 複数オブジェクトへの一括ルール → N個には必ずN個のルール
❌ マルチタッチ・ピンチ操作 → touches[0]のみ
```
