# Swizzle ゲームエンジン仕様書 v2

**作成日**: 2025-12-19
**Phase**: 1-2
**目的**: AI生成システムが正確なゲームを生成するための実装ベース仕様

---

## 1. 座標系・画面サイズ

### 1.1 画面サイズ

```
デフォルト: 1080 x 1920 px（スマホ縦画面）
アスペクト比: 9:16
```

### 1.2 座標系

```
位置表現: 正規化座標（0.0 - 1.0）
  x: 0.0 = 左端, 1.0 = 右端
  y: 0.0 = 上端, 1.0 = 下端

変換式:
  pixel_x = normalized_x * canvas.width
  pixel_y = normalized_y * canvas.height

例:
  position: { x: 0.5, y: 0.5 } → 画面中央
  position: { x: 0.0, y: 0.0 } → 左上隅
  position: { x: 1.0, y: 1.0 } → 右下隅
```

### 1.3 オブジェクトの原点

```
オブジェクト座標: 左上角が原点
中心座標計算:
  centerX = obj.x + (obj.width * scale) / 2
  centerY = obj.y + (obj.height * scale) / 2
```

---

## 2. 速度システム

### 2.1 速度の単位

```typescript
speed: number  // px/frame（フレームあたりピクセル数）
```

**重要**: 60FPS想定

### 2.2 速度計算

**直接速度指定の場合:**
```typescript
// ActionExecutor.ts より
targetObj.vx = (dx / distance) * speed;  // px/frame
targetObj.vy = (dy / distance) * speed;  // px/frame

// 位置更新（PhysicsManager.ts）
obj.x += obj.vx * deltaTime;  // deltaTime は秒単位
obj.y += obj.vy * deltaTime;
```

**duration指定の場合（自動計算）:**
```typescript
// 60FPSを想定
const targetFrames = movement.duration * 60;
effectiveSpeed = distance / targetFrames;
```

### 2.3 推奨速度値（実績ベース）

| 速度感 | speed値 | 用途例 |
|--------|---------|--------|
| 非常に遅い | 0.5-1.0 | ふわふわ浮遊、ゆっくり移動 |
| 遅い | 1.0-2.0 | 風船の上昇、緩やかな動き |
| 普通 | 2.0-4.0 | 落下物、キャラクター移動 |
| 速い | 4.0-8.0 | 弾丸、素早い敵 |
| 非常に速い | 8.0-15.0 | 瞬間移動に近い動き |

### 2.4 サンプルゲームの実測値

| ゲーム | 用途 | speed値 |
|--------|------|---------|
| 風船割り | 風船上昇 | 1.0-1.5 |
| フルーツキャッチ | りんご落下 | 2.0-4.0 |

---

## 3. 動作確認済み条件（Trigger Conditions）

### 3.1 touch - タッチ条件

```typescript
{
  type: 'touch',
  target: 'self' | 'stage' | '<objectId>',
  touchType: 'down' | 'up' | 'hold' | 'drag' | 'swipe' | 'flick'
}
```

**動作確認済み:**
- `touchType: 'down'` + `target: 'self'` ✅ 完全動作
- `touchType: 'down'` + `target: 'stage'` + `region` ✅ 完全動作

**使用例:**
```json
{
  "type": "touch",
  "target": "self",
  "touchType": "down"
}
```

### 3.2 time - 時間条件

```typescript
{
  type: 'time',
  timeType: 'exact' | 'range' | 'interval',
  seconds?: number,
  range?: { min: number, max: number },
  interval?: number
}
```

**動作確認済み:**
- `timeType: 'interval'` ✅ 完全動作（連続アニメーション用）
- `timeType: 'exact'` ✅ 完全動作（特定時間でのイベント）

**使用例:**
```json
{
  "type": "time",
  "timeType": "interval",
  "interval": 0.1
}
```

### 3.3 counter - カウンター条件

```typescript
{
  type: 'counter',
  counterName: string,
  comparison: 'equals' | 'greaterOrEqual' | 'greater' | 'less' | 'lessOrEqual',
  value: number
}
```

**動作確認済み:**
- `comparison: 'greaterOrEqual'` ✅ 完全動作

**使用例:**
```json
{
  "type": "counter",
  "counterName": "popped",
  "comparison": "greaterOrEqual",
  "value": 3
}
```

### 3.4 collision - 衝突条件

```typescript
{
  type: 'collision',
  target: 'stageArea' | 'other' | '<objectId>',
  targetObjectId?: string,
  collisionType: 'enter' | 'stay' | 'exit',
  checkMode: 'hitbox' | 'pixel'
}
```

**動作確認済み:**
- `target: '<objectId>'` + `collisionType: 'enter'` ✅ 動作確認

**使用例:**
```json
{
  "type": "collision",
  "target": "character",
  "collisionType": "enter",
  "checkMode": "hitbox"
}
```

### 3.5 その他の条件

| 条件タイプ | 動作状況 | 備考 |
|------------|----------|------|
| flag | ✅ 動作確認済み | フラグ状態チェック |
| gameState | ✅ 動作確認済み | ゲーム状態チェック |
| position | ⚠️ 要検証 | 領域内外判定 |
| animation | ⚠️ 要検証 | アニメーション状態 |
| random | ⚠️ 要検証 | 確率条件 |

---

## 4. 動作確認済みアクション（Game Actions）

### 4.1 success - ゲームクリア

```typescript
{
  type: 'success',
  score?: number,
  message?: string
}
```

**動作確認済み** ✅

**使用例:**
```json
{
  "type": "success",
  "score": 100,
  "message": "クリア！"
}
```

### 4.2 hide - オブジェクト非表示

```typescript
{
  type: 'hide',
  targetId: string,
  fadeOut?: boolean,
  duration?: number
}
```

**動作確認済み** ✅

**使用例:**
```json
{
  "type": "hide",
  "targetId": "balloon-red"
}
```

### 4.3 move - 移動

```typescript
{
  type: 'move',
  targetId: string,
  movement: {
    type: 'straight' | 'teleport' | 'wander' | 'stop',
    target?: { x: number, y: number } | '<objectId>',
    speed?: number,
    duration?: number,
    direction?: 'up' | 'down' | 'left' | 'right' | ...
  }
}
```

**動作確認済み:**
- `movement.type: 'straight'` + `target` ✅
- `movement.type: 'teleport'` + `target` ✅

**使用例:**
```json
{
  "type": "move",
  "targetId": "balloon-red",
  "movement": {
    "type": "straight",
    "target": { "x": 0.2, "y": 0.0 },
    "speed": 1.5
  }
}
```

### 4.4 counter - カウンター操作

```typescript
{
  type: 'counter',
  counterName: string,
  operation: 'increment' | 'decrement' | 'set' | 'add' | 'subtract',
  value?: number
}
```

**動作確認済み** ✅

**使用例:**
```json
{
  "type": "counter",
  "counterName": "popped",
  "operation": "add",
  "value": 1
}
```

### 4.5 addScore - スコア加算

```typescript
{
  type: 'addScore',
  points: number
}
```

**動作確認済み** ✅

### 4.6 effect - エフェクト

```typescript
{
  type: 'effect',
  targetId: string,
  effect: {
    type: 'flash' | 'shake' | 'scale' | 'rotate' | 'particles',
    duration: number,
    intensity?: number,
    scaleAmount?: number,
    ...
  }
}
```

**動作確認済み:**
- `effect.type: 'scale'` ✅

**使用例:**
```json
{
  "type": "effect",
  "targetId": "balloon-red",
  "effect": {
    "type": "scale",
    "scaleAmount": 1.5,
    "duration": 0.15
  }
}
```

### 4.7 その他のアクション

| アクションタイプ | 動作状況 | 備考 |
|------------------|----------|------|
| failure | ✅ 動作確認済み | ゲームオーバー |
| show | ✅ 動作確認済み | オブジェクト表示 |
| playSound | ⚠️ 要検証 | 効果音再生 |
| setFlag/toggleFlag | ✅ 動作確認済み | フラグ操作 |
| switchAnimation | ⚠️ 要検証 | アニメーション切替 |
| applyForce/applyImpulse | ⚠️ 要検証 | 物理演算 |
| randomAction | ⚠️ 要検証 | ランダム選択 |

---

## 5. 実装パターン集

### 5.1 パターン1: タップカウントゲーム

**概要**: オブジェクトをタップして消し、全部消したらクリア

```json
{
  "counters": [
    { "id": "tapped", "name": "タップ数", "initialValue": 0 }
  ],
  "rules": [
    {
      "id": "tap-obj",
      "name": "オブジェクトタップ",
      "triggers": {
        "operator": "AND",
        "conditions": [
          { "type": "touch", "target": "self", "touchType": "down" }
        ]
      },
      "actions": [
        { "type": "hide", "targetId": "object-1" },
        { "type": "counter", "counterName": "tapped", "operation": "add", "value": 1 }
      ]
    },
    {
      "id": "win",
      "name": "クリア判定",
      "triggers": {
        "operator": "AND",
        "conditions": [
          { "type": "counter", "counterName": "tapped", "comparison": "greaterOrEqual", "value": 5 }
        ]
      },
      "actions": [
        { "type": "success", "message": "全部タップした！" }
      ]
    }
  ]
}
```

### 5.2 パターン2: 浮遊物タップゲーム

**概要**: 上に浮かんでいくオブジェクトをタップして消す

```json
{
  "rules": [
    {
      "id": "float-up",
      "name": "上昇",
      "triggers": {
        "operator": "AND",
        "conditions": [
          { "type": "time", "timeType": "interval", "interval": 0.1 }
        ]
      },
      "actions": [
        {
          "type": "move",
          "targetId": "balloon",
          "movement": {
            "type": "straight",
            "target": { "x": 0.5, "y": 0.0 },
            "speed": 1.5
          }
        }
      ]
    },
    {
      "id": "tap-pop",
      "name": "タップで消す",
      "triggers": {
        "operator": "AND",
        "conditions": [
          { "type": "touch", "target": "self", "touchType": "down" }
        ]
      },
      "actions": [
        { "type": "effect", "targetId": "balloon", "effect": { "type": "scale", "scaleAmount": 1.5, "duration": 0.15 } },
        { "type": "hide", "targetId": "balloon" },
        { "type": "addScore", "points": 10 }
      ]
    }
  ]
}
```

### 5.3 パターン3: キャッチゲーム

**概要**: 落ちてくるオブジェクトをキャラクターでキャッチ

```json
{
  "rules": [
    {
      "id": "fall",
      "name": "落下",
      "triggers": {
        "operator": "AND",
        "conditions": [
          { "type": "time", "timeType": "interval", "interval": 0.1 }
        ]
      },
      "actions": [
        {
          "type": "move",
          "targetId": "apple",
          "movement": {
            "type": "straight",
            "target": { "x": 0.5, "y": 0.9 },
            "speed": 3.0
          }
        }
      ]
    },
    {
      "id": "move-left",
      "name": "左へ移動",
      "triggers": {
        "operator": "AND",
        "conditions": [
          { "type": "touch", "target": "btn-left", "touchType": "down" }
        ]
      },
      "actions": [
        {
          "type": "move",
          "targetId": "character",
          "movement": { "type": "teleport", "target": { "x": 0.2, "y": 0.8 } }
        }
      ]
    },
    {
      "id": "catch",
      "name": "キャッチ判定",
      "triggers": {
        "operator": "AND",
        "conditions": [
          { "type": "collision", "target": "character", "collisionType": "enter", "checkMode": "hitbox" }
        ]
      },
      "actions": [
        { "type": "hide", "targetId": "apple" },
        { "type": "addScore", "points": 10 }
      ]
    }
  ]
}
```

---

## 6. 制約事項・避けるべき実装

### 6.1 避けるべきパターン

1. **複雑なposition条件**
   - 動作が不安定な場合あり
   - 代替: collision条件を使用

2. **多数のtime interval条件**
   - パフォーマンス低下の可能性
   - 推奨: 1ゲームあたり5個以下

3. **深いネスト構造**
   - randomAction内にrandomAction等
   - デバッグが困難

4. **物理演算の多用**
   - 複雑な挙動は予測困難
   - 単純な move で代替可能な場合はそちらを使用

### 6.2 ルール数の目安

| ゲームタイプ | 推奨ルール数 | 上限 |
|--------------|--------------|------|
| シンプルゲーム | 3-7 | 10 |
| 中程度ゲーム | 7-12 | 15 |
| 複雑なゲーム | 12-20 | 25 |

### 6.3 オブジェクト数の目安

| タイプ | 推奨数 | 上限 |
|--------|--------|------|
| キャラクター | 1-2 | 3 |
| インタラクト対象 | 3-8 | 15 |
| UI要素 | 0-3 | 5 |

---

## 7. JSON構造リファレンス

### 7.1 最小限の動作するゲーム

```json
{
  "project": {
    "id": "minimal-game",
    "name": "タップゲーム",
    "assets": {
      "objects": [
        {
          "id": "target",
          "frames": [{ "dataUrl": "..." }]
        }
      ]
    },
    "script": {
      "layout": {
        "objects": [
          {
            "objectId": "target",
            "position": { "x": 0.5, "y": 0.5 },
            "scale": { "x": 1.0, "y": 1.0 }
          }
        ]
      },
      "counters": [],
      "rules": [
        {
          "id": "tap-win",
          "triggers": {
            "operator": "AND",
            "conditions": [
              { "type": "touch", "target": "self", "touchType": "down" }
            ]
          },
          "targetObjectId": "target",
          "actions": [
            { "type": "success" }
          ]
        }
      ]
    },
    "settings": {
      "duration": { "type": "fixed", "seconds": 10 }
    }
  }
}
```

---

## 8. AI生成時の注意点

### 8.1 必須チェック項目

1. **勝利条件の存在**
   - 少なくとも1つのsuccessアクションを持つルール

2. **タイムアウト対応**
   - 時間切れ = 失敗（または成功）の処理

3. **オブジェクトIDの整合性**
   - assetsに定義されたIDをlayout/rulesで使用

4. **座標の範囲**
   - 0.0-1.0の範囲内（画面外に出ない）

5. **速度の妥当性**
   - 0.5-10.0の範囲を推奨

### 8.2 品質向上ポイント

1. **エフェクトの追加**
   - タップ時にscaleエフェクト追加で手応え感UP

2. **スコアシステム**
   - addScoreアクションでプレイヤーのモチベーション向上

3. **複数オブジェクト**
   - 同種オブジェクト3-5個で適度な難易度
