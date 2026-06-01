# Swizzle JSON仕様書 v1.0

**最終更新: 2026-01-03**

この文書は、Swizzleゲームエディターにインポート可能なJSONファイルの完全な仕様書です。ChatGPTや他のAIツールでSwizzle用のゲームJSONを生成する際に参照してください。

---

## 📋 目次

1. [概要](#概要)
2. [クイックリファレンス](#クイックリファレンス)
3. [トップレベル構造](#トップレベル構造)
4. [基本情報 (project)](#基本情報-project)
5. [アセット (assets)](#アセット-assets)
6. [スクリプト (script)](#スクリプト-script)
7. [ゲーム設定 (settings)](#ゲーム設定-settings)
8. [制限事項](#制限事項)
9. [サンプルコード](#サンプルコード)
10. [⚠️ 重要な注意事項：混同されやすいフィールド](#️-重要な注意事項混同されやすいフィールド)
11. [📚 アクション完全リファレンス](#-アクション完全リファレンス)
12. [📚 条件完全リファレンス](#-条件完全リファレンス)
13. [📚 MovementPattern完全リファレンス](#-movementpattern完全リファレンス)
14. [📚 EffectPattern完全リファレンス](#-effectpattern完全リファレンス)
15. [トラブルシューティング](#トラブルシューティング)
16. [ChatGPT向けプロンプトテンプレート](#chatgpt向けプロンプトテンプレート)

---

## 概要

Swizzle JSONフォーマットは、ゲームプロジェクト全体を1つのJSONファイルで表現する形式です。画像や音声データはbase64エンコードで埋め込まれます。

### 基本構造

```json
{
  "project": { /* ゲームプロジェクトデータ */ },
  "metadata": { /* プロジェクトメタデータ（オプション） */ },
  "exportedAt": "2025-01-03T00:00:00.000Z",
  "version": "1.0.0"
}
```

---

## クイックリファレンス

### 最小限の有効なJSON

```json
{
  "project": {
    "id": "my-game",
    "name": "マイゲーム",
    "createdAt": "2025-01-03T00:00:00.000Z",
    "lastModified": "2025-01-03T00:00:00.000Z",
    "version": "1.0.0",
    "creator": { "isAnonymous": true },
    "status": "draft",
    "totalSize": 0,
    "assets": {
      "background": null,
      "objects": [],
      "texts": [],
      "audio": { "bgm": null, "se": [] },
      "statistics": {
        "totalImageSize": 0,
        "totalAudioSize": 0,
        "totalSize": 0,
        "usedSlots": { "background": 0, "objects": 0, "texts": 0, "bgm": 0, "se": 0 },
        "limitations": { "isNearImageLimit": false, "isNearAudioLimit": false, "isNearTotalLimit": false, "hasViolations": false }
      },
      "lastModified": "2025-01-03T00:00:00.000Z"
    },
    "script": {
      "initialState": {
        "layout": {
          "background": { "visible": false, "frameIndex": 0, "animationSpeed": 12, "autoStart": false },
          "objects": [],
          "texts": []
        },
        "audio": { "bgm": null, "masterVolume": 0.8, "seVolume": 0.8 },
        "gameState": { "score": 0, "counters": {}, "flags": {} },
        "autoRules": [],
        "metadata": { "version": "1.0.0", "createdAt": "2025-01-03T00:00:00.000Z", "lastModified": "2025-01-03T00:00:00.000Z" }
      },
      "layout": {
        "background": { "visible": false, "initialAnimation": 0, "animationSpeed": 12, "autoStart": false },
        "objects": [],
        "texts": [],
        "stage": { "backgroundColor": "#87CEEB" }
      },
      "flags": [],
      "counters": [],
      "rules": [],
      "successConditions": [],
      "statistics": {
        "totalRules": 0, "totalConditions": 0, "totalActions": 0, "complexityScore": 0,
        "usedTriggerTypes": [], "usedActionTypes": [], "flagCount": 0,
        "estimatedCPUUsage": "low", "estimatedMemoryUsage": 0, "maxConcurrentEffects": 0,
        "counterCount": 0, "usedCounterOperations": [], "usedCounterComparisons": [],
        "randomConditionCount": 0, "randomActionCount": 0, "totalRandomChoices": 0,
        "averageRandomProbability": 0, "randomEventsPerSecond": 0, "randomMemoryUsage": 0
      },
      "version": "1.0.0",
      "lastModified": "2025-01-03T00:00:00.000Z"
    },
    "settings": {
      "name": "マイゲーム",
      "duration": { "type": "fixed", "seconds": 10 },
      "difficulty": "normal",
      "publishing": {
        "isPublished": false,
        "visibility": "private",
        "allowComments": true,
        "allowRemix": false
      },
      "preview": {},
      "export": {
        "includeSourceData": true,
        "compressionLevel": "medium",
        "format": "json"
      }
    },
    "editorState": {
      "activeTab": "assets",
      "lastSaved": "2025-01-03T00:00:00.000Z",
      "autoSaveEnabled": true,
      "tabStates": {
        "assets": { "selectedAssetType": null, "selectedAssetId": null, "showAnimationEditor": false },
        "script": { "mode": "layout", "selectedObjectId": null, "selectedRuleId": null, "showRuleEditor": false },
        "settings": { "showTestPlay": false, "lastTestResult": null }
      },
      "ui": { "sidebarCollapsed": false, "previewVisible": true, "capacityMeterExpanded": false }
    },
    "metadata": {
      "statistics": { "totalEditTime": 0, "saveCount": 0, "testPlayCount": 0, "publishCount": 0 },
      "usage": { "lastOpened": "2025-01-03T00:00:00.000Z", "totalOpenCount": 1, "averageSessionTime": 0 },
      "performance": { "lastBuildTime": 0, "averageFPS": 60, "memoryUsage": 0 }
    },
    "versionHistory": [],
    "projectSettings": {
      "autoSaveInterval": 30000,
      "backupEnabled": true,
      "compressionEnabled": false,
      "maxVersionHistory": 10
    }
  }
}
```

### よく使う座標値

| 位置 | x | y |
|------|---|---|
| 左上 | 0.0 | 0.0 |
| 中央上 | 0.5 | 0.0 |
| 右上 | 1.0 | 0.0 |
| 左中 | 0.0 | 0.5 |
| 中央 | 0.5 | 0.5 |
| 右中 | 1.0 | 0.5 |
| 左下 | 0.0 | 1.0 |
| 中央下 | 0.5 | 1.0 |
| 右下 | 1.0 | 1.0 |

### よく使うアクション

```json
// スコア加算
{ "type": "addScore", "points": 10 }

// オブジェクト非表示
{ "type": "hide", "targetId": "object-1" }

// カウンター操作
{ "type": "counter", "counterName": "count", "operation": "add", "value": 1 }

// 移動
{ "type": "move", "targetId": "object-1", "movement": { "type": "straight", "target": { "x": 0.5, "y": 0.2 }, "speed": 1.5 } }

// ゲーム成功
{ "type": "success", "score": 100, "message": "クリア！" }
```

### よく使う条件

```json
// タップ検出
{ "type": "touch", "target": "self", "touchType": "down" }

// 時間間隔
{ "type": "time", "timeType": "interval", "interval": 0.1 }

// 衝突検出
{ "type": "collision", "target": "other", "targetObjectId": "wall", "collisionType": "enter", "checkMode": "hitbox" }

// カウンター条件
{ "type": "counter", "counterName": "count", "comparison": "greaterOrEqual", "value": 5 }
```

---

## トップレベル構造

### ProjectExportData

```typescript
{
  "project": GameProject,      // メインプロジェクトデータ（**必須**）
  "metadata": ProjectMetadata, // メタデータ（オプション、省略時は自動生成）
  "exportedAt": string,        // ISO日時文字列（オプション）
  "version": string            // フォーマットバージョン（オプション、推奨: "1.0.0"）
}
```

**重要:**
- `project`フィールドのみが必須です
- `metadata`, `exportedAt`, `version`は省略可能（エディターが自動補完）
- インポート時に新しいプロジェクトIDが自動生成されます
- プロジェクトステータスは自動的に`"draft"`にリセットされます

---

## 基本情報 (project)

### GameProject 型

```json
{
  "id": "unique-project-id",
  "name": "ゲーム名",
  "description": "ゲームの説明",
  "createdAt": "2025-01-03T00:00:00.000Z",
  "lastModified": "2025-01-03T00:00:00.000Z",
  "version": "1.0.0",
  "status": "draft",
  "totalSize": 5000,
  "thumbnailDataUrl": "data:image/png;base64,...",
  "creator": {
    "isAnonymous": true
  },
  "assets": { /* アセットデータ */ },
  "script": { /* スクリプトデータ */ },
  "settings": { /* ゲーム設定 */ },
  "editorState": { /* エディター状態（オプション） */ },
  "metadata": { /* プロジェクトメタデータ */ },
  "versionHistory": [],
  "projectSettings": {
    "autoSaveInterval": 30000,
    "backupEnabled": true,
    "compressionEnabled": false,
    "maxVersionHistory": 10
  }
}
```

### 必須フィールド

以下のフィールドは、`project`オブジェクト内で必須です：

- `id`: 一意のプロジェクトID（任意の文字列、インポート時に自動的に新しいUUIDに置き換えられます）
- `name`: プロジェクト名
- `createdAt`, `lastModified`: ISO 8601形式の日時文字列
- `version`: バージョン番号（"1.0.0"など）
- `status`: プロジェクトステータス（"draft", "testing", "published"）
- `totalSize`: 総容量（bytes）
- `creator`: 作成者情報
  - `isAnonymous`: 匿名作成者かどうか（boolean）
- `assets`: アセット情報（ProjectAssets型）
- `script`: スクリプト情報（GameScript型）
- `settings`: ゲーム設定（GameSettings型）
- `metadata`: プロジェクトメタデータ
- `versionHistory`: バージョン履歴配列
- `projectSettings`: プロジェクト設定

### インポート時の自動処理

エディターにインポートする際、以下の値は自動的に上書きされます：

- `id`: 新しいUUID（crypto.randomUUID()）に置き換え
- `createdAt`: 現在時刻に更新
- `lastModified`: 現在時刻に更新
- `status`: 強制的に`"draft"`に設定
- `metadata.databaseId`: クリア（undefined）
- `metadata.lastSyncedAt`: クリア（undefined）

これにより、インポートしたプロジェクトは既存プロジェクトと競合せず、新規プロジェクトとして扱われます。

---

## アセット (assets)

### ProjectAssets 型

```json
{
  "background": BackgroundAsset | null,
  "objects": ObjectAsset[],
  "texts": TextAsset[],
  "audio": {
    "bgm": AudioAsset | null,
    "se": AudioAsset[]
  },
  "statistics": {
    "totalImageSize": 1500,
    "totalAudioSize": 0,
    "totalSize": 1500,
    "usedSlots": {
      "background": 0,
      "objects": 3,
      "texts": 0,
      "bgm": 0,
      "se": 0
    },
    "limitations": {
      "isNearImageLimit": false,
      "isNearAudioLimit": false,
      "isNearTotalLimit": false,
      "hasViolations": false
    }
  },
  "lastModified": "2025-01-03T00:00:00.000Z"
}
```

### ObjectAsset（オブジェクトアセット）

**制限: 最大15個**

```json
{
  "id": "object-id-1",
  "name": "オブジェクト名",
  "frames": [
    {
      "id": "frame-1",
      "dataUrl": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIi...",
      "originalName": "object.svg",
      "width": 100,
      "height": 120,
      "size": 500
    }
  ],
  "animationSettings": {
    "speed": 12,
    "loop": true,
    "pingPong": false,
    "autoPlay": false
  },
  "totalSize": 500,
  "createdAt": "2025-01-03T00:00:00.000Z",
  "lastModified": "2025-01-03T00:00:00.000Z",
  "defaultScale": 2.2,
  "defaultOpacity": 1.0
}
```

#### AssetFrame（画像フレーム）

**制限: オブジェクトごとに最大8フレーム、背景は最大4フレーム**

- `dataUrl`: base64エンコードされた画像データ
  - 形式: `data:image/[type];base64,[data]`
  - 対応形式: svg+xml, png, jpeg, gif
- `width`, `height`: 画像サイズ（ピクセル）
- `size`: ファイルサイズ（bytes）

### BackgroundAsset（背景アセット）

**制限: 1個のみ**

```json
{
  "id": "background-id",
  "name": "背景名",
  "frames": [ /* AssetFrameの配列（最大4個） */ ],
  "animationSettings": {
    "speed": 12,
    "loop": true,
    "pingPong": false,
    "autoStart": false
  },
  "totalSize": 1000,
  "createdAt": "2025-01-03T00:00:00.000Z",
  "lastModified": "2025-01-03T00:00:00.000Z",
  "defaultScale": 1.0
}
```

### TextAsset（テキストアセット）

**制限: 最大5個、各8文字以内**

```json
{
  "id": "text-id-1",
  "content": "スコア",
  "style": {
    "fontSize": 24,
    "color": "#ffffff",
    "fontWeight": "bold",
    "outline": {
      "color": "#000000",
      "thickness": 2
    }
  },
  "createdAt": "2025-01-03T00:00:00.000Z",
  "lastModified": "2025-01-03T00:00:00.000Z"
}
```

### AudioAsset（音声アセット）

**制限: BGM 1個、SE 最大15個**

```json
{
  "id": "audio-id-1",
  "name": "効果音名",
  "dataUrl": "data:audio/mp3;base64,//uQx...",
  "originalName": "sound.mp3",
  "duration": 1.5,
  "fileSize": 24000,
  "format": "mp3",
  "uploadedAt": "2025-01-03T00:00:00.000Z",
  "volume": 0.8,
  "loop": false,
  "autoPlay": false
}
```

---

## スクリプト (script)

### GameScript 型

```json
{
  "initialState": { /* 初期状態 */ },
  "layout": { /* レイアウト設定 */ },
  "flags": [ /* フラグ定義 */ ],
  "counters": [ /* カウンター定義 */ ],
  "rules": [ /* ゲームルール */ ],
  "successConditions": [ /* 成功条件 */ ],
  "statistics": { /* スクリプト統計 */ },
  "version": "1.0.0",
  "lastModified": "2025-01-03T00:00:00.000Z"
}
```

### GameInitialState（初期状態）

```json
{
  "layout": {
    "background": {
      "visible": false,
      "frameIndex": 0,
      "animationSpeed": 12,
      "autoStart": false
    },
    "objects": [
      {
        "id": "object-id-1",
        "position": { "x": 0.5, "y": 0.5 },
        "visible": true,
        "scale": { "x": 1.0, "y": 1.0 },
        "rotation": 0,
        "zIndex": 1,
        "animationIndex": 0,
        "animationSpeed": 12,
        "autoStart": false
      }
    ],
    "texts": []
  },
  "audio": {
    "bgm": null,
    "masterVolume": 0.8,
    "seVolume": 0.8
  },
  "gameState": {
    "score": 0,
    "counters": {},
    "flags": {}
  },
  "autoRules": [],
  "metadata": {
    "version": "1.0.0",
    "createdAt": "2025-01-03T00:00:00.000Z",
    "lastModified": "2025-01-03T00:00:00.000Z"
  }
}
```

**重要:** `position`の座標は0.0～1.0の正規化座標です。
- `x: 0.0` = 左端、`x: 1.0` = 右端
- `y: 0.0` = 上端、`y: 1.0` = 下端
- `x: 0.5, y: 0.5` = 画面中央

### GameLayout（レイアウト）

```json
{
  "background": {
    "visible": false,
    "initialAnimation": 0,
    "animationSpeed": 12,
    "autoStart": false
  },
  "objects": [
    {
      "objectId": "object-id-1",
      "position": { "x": 0.5, "y": 0.8 },
      "scale": { "x": 2.0, "y": 2.0 },
      "rotation": 0,
      "zIndex": 1,
      "initialState": {
        "visible": true,
        "animation": 0,
        "animationSpeed": 12,
        "autoStart": false
      }
    }
  ],
  "texts": [],
  "stage": {
    "backgroundColor": "#87CEEB"
  }
}
```

### GameCounter（カウンター）

```json
{
  "id": "counter-id-1",
  "name": "割った数",
  "initialValue": 0,
  "minValue": 0,
  "maxValue": 100
}
```

### GameFlag（フラグ）

```json
{
  "id": "flag-id-1",
  "name": "クリア済み",
  "initialValue": false,
  "description": "ゲームをクリアしたかどうか",
  "createdAt": "2025-01-03T00:00:00.000Z"
}
```

### GameRule（ゲームルール）

ゲームルールは「トリガー条件」と「アクション」で構成されます。

```json
{
  "id": "rule-id-1",
  "name": "風船タップ処理",
  "enabled": true,
  "priority": 2,
  "targetObjectId": "balloon-red",
  "triggers": {
    "operator": "AND",
    "conditions": [
      {
        "type": "touch",
        "target": "self",
        "touchType": "down"
      }
    ]
  },
  "actions": [
    {
      "type": "hide",
      "targetId": "balloon-red"
    },
    {
      "type": "counter",
      "counterName": "popped",
      "operation": "add",
      "value": 1
    },
    {
      "type": "addScore",
      "points": 10
    }
  ],
  "createdAt": "2025-01-03T00:00:00.000Z",
  "lastModified": "2025-01-03T00:00:00.000Z"
}
```

### トリガー条件 (TriggerCondition)

#### タッチ条件

```json
{
  "type": "touch",
  "target": "self",
  "touchType": "down"
}
```

- `target`: "self" | "stage" | オブジェクトID
- `touchType`: "down" | "up" | "hold" | "drag" | "swipe" | "flick"

#### 衝突条件

```json
{
  "type": "collision",
  "target": "other",
  "targetObjectId": "wall",
  "collisionType": "enter",
  "checkMode": "hitbox"
}
```

- `target`: "stageArea" | "other" | オブジェクトID
- `collisionType`: "enter" | "stay" | "exit"
- `checkMode`: "hitbox" | "pixel"

#### 時間条件

```json
{
  "type": "time",
  "timeType": "interval",
  "interval": 0.1
}
```

- `timeType`: "exact" | "range" | "interval"
- `interval`: 繰り返し間隔（秒）

#### カウンター条件

```json
{
  "type": "counter",
  "counterName": "popped",
  "comparison": "greaterOrEqual",
  "value": 3
}
```

- `comparison`: "equal" | "notEqual" | "greater" | "less" | "greaterOrEqual" | "lessOrEqual" | "between" | "notBetween"

#### フラグ条件

```json
{
  "type": "flag",
  "flagId": "game-started",
  "condition": "ON"
}
```

- `condition`: "ON" | "OFF" | "CHANGED" | "ON_TO_OFF" | "OFF_TO_ON"

#### 位置条件

```json
{
  "type": "position",
  "target": "player",
  "area": "inside",
  "region": {
    "shape": "rect",
    "x": 0.2,
    "y": 0.2,
    "width": 0.6,
    "height": 0.6
  }
}
```

- `area`: "inside" | "outside" | "crossing"
- `shape`: "rect" | "circle"

### アクション (GameAction)

#### ゲーム制御

```json
{ "type": "success", "score": 100, "message": "クリア！" }
{ "type": "failure", "message": "ゲームオーバー" }
{ "type": "pause", "duration": 1.0 }
{ "type": "restart" }
```

#### 音響制御

```json
{ "type": "playSound", "soundId": "se-1", "volume": 0.8 }
{ "type": "stopSound", "soundId": "se-1" }
{ "type": "playBGM", "volume": 0.5 }
{ "type": "stopBGM" }
```

#### フラグ制御

```json
{ "type": "setFlag", "flagId": "flag-1", "value": true }
{ "type": "toggleFlag", "flagId": "flag-1" }
```

#### オブジェクト制御

```json
{ "type": "show", "targetId": "object-1", "fadeIn": true, "duration": 0.5 }
{ "type": "hide", "targetId": "object-1", "fadeOut": true, "duration": 0.5 }
{ "type": "switchAnimation", "targetId": "object-1", "animationIndex": 1 }
```

#### 移動制御

```json
{
  "type": "move",
  "targetId": "object-1",
  "movement": {
    "type": "straight",
    "target": { "x": 0.8, "y": 0.2 },
    "speed": 1.5,
    "easing": "linear"
  }
}
```

**MovementPattern types:**
- `straight`: 直線移動
- `teleport`: 瞬間移動
- `wander`: ランダム徘徊
- `stop`: 停止
- `swap`: 位置交換
- `approach`: ターゲットに接近
- `orbit`: 周回
- `bounce`: バウンド

#### エフェクト

```json
{
  "type": "effect",
  "targetId": "object-1",
  "effect": {
    "type": "scale",
    "scaleAmount": 1.5,
    "duration": 0.15
  }
}
```

**EffectPattern types:**
- `flash`: 点滅
- `shake`: 振動
- `scale`: スケール変化
- `rotate`: 回転
- `particles`: パーティクル効果

#### スコア

```json
{ "type": "addScore", "points": 10 }
```

> ⚠️ `showMessage` アクションは廃止されました（エンジンに実装がありません）。
> メッセージ表示が必要な場合は `effect`（flash/scale 等）や `playSound` で代替してください。

#### カウンター操作

```json
{
  "type": "counter",
  "counterName": "popped",
  "operation": "add",
  "value": 1
}
```

**CounterOperation types:**
- `set`: 値を設定
- `add`: 加算
- `subtract`: 減算
- `multiply`: 乗算
- `divide`: 除算
- `increment`: +1
- `decrement`: -1
- `reset`: リセット

### SuccessCondition（成功条件）

```json
{
  "id": "success-1",
  "name": "全部割った",
  "operator": "AND",
  "conditions": [
    {
      "type": "counter",
      "counterName": "popped",
      "counterComparison": "greaterOrEqual",
      "counterValue": 3
    }
  ],
  "successSettings": {
    "autoEnd": true,
    "delay": 0,
    "message": "全部割れた！",
    "score": 100
  }
}
```

> ✅ `successConditions` は実行時に毎フレーム評価され、成立すると `successSettings.delay` 秒後に
> クリア扱いでゲームが終了します（`successSettings.score` は加算）。`success` アクションを
> 明示しなくてもクリアにできます。対応する条件タイプ: `flag` / `score` / `time` / `counter` /
> `objectState`（visible/hidden）。

### ScriptStatistics（スクリプト統計）

```json
{
  "totalRules": 7,
  "totalConditions": 7,
  "totalActions": 16,
  "complexityScore": 15,
  "usedTriggerTypes": ["time", "touch", "counter"],
  "usedActionTypes": ["move", "hide", "counter", "success", "addScore", "effect"],
  "flagCount": 0,
  "estimatedCPUUsage": "low",
  "estimatedMemoryUsage": 0,
  "maxConcurrentEffects": 3,
  "counterCount": 1,
  "usedCounterOperations": ["add"],
  "usedCounterComparisons": ["greaterOrEqual"],
  "randomConditionCount": 0,
  "randomActionCount": 0,
  "totalRandomChoices": 0,
  "averageRandomProbability": 0,
  "randomEventsPerSecond": 0,
  "randomMemoryUsage": 0
}
```

---

## ゲーム設定 (settings)

### GameSettings 型

```json
{
  "name": "風船割り",
  "description": "ふわふわ浮かぶ風船を全部割ろう！",
  "duration": {
    "type": "fixed",
    "seconds": 15
  },
  "difficulty": "easy",
  "publishing": {
    "isPublished": false,
    "visibility": "private",
    "allowComments": true,
    "allowRemix": false,
    "tags": ["タップ", "風船", "簡単"],
    "category": "action"
  },
  "preview": {},
  "export": {
    "includeSourceData": true,
    "compressionLevel": "medium",
    "format": "json"
  }
}
```

### duration（ゲーム時間設定）

```json
{
  "type": "fixed",
  "seconds": 10
}
```

または

```json
{
  "type": "unlimited",
  "maxSeconds": 300
}
```

- `type`: "fixed" | "unlimited"
- `seconds`: 固定時間の場合（5, 10, 15, 20, 30のいずれか）
- `maxSeconds`: 無制限の場合の安全措置（60-300）

### difficulty（難易度）

- `"easy"`: 簡単
- `"normal"`: 普通
- `"hard"`: 難しい

### publishing（公開設定）

```json
{
  "isPublished": false,
  "visibility": "private",
  "allowComments": true,
  "allowRemix": false,
  "tags": ["アクション", "パズル"],
  "category": "action"
}
```

- `visibility`: "public" | "unlisted" | "private"
- `category`: "action" | "puzzle" | "adventure" | "education" など

---

## 制限事項

### アセット制限

| アセット種類 | 最大数 | 備考 |
|------------|-------|------|
| 背景 | 1個 | 最大4フレーム |
| オブジェクト | 15個 | 各最大8フレーム |
| テキスト | 5個 | 各8文字以内 |
| BGM | 1個 | - |
| SE | 15個 | - |

### サイズ制限

- **画像容量制限**: 推奨50MB以下
- **音声容量制限**: 推奨50MB以下
- **総容量制限**: 推奨50MB以下

### その他の制限

- **ゲーム名**: 1-50文字
- **説明文**: 0-200文字
- **フラグ数**: 制限なし（パフォーマンスに注意）
- **カウンター数**: 制限なし（パフォーマンスに注意）
- **ルール数**: 制限なし（パフォーマンスに注意）

---

## サンプルコード

### 最小限のゲームJSON

```json
{
  "project": {
    "id": "minimal-game",
    "name": "最小ゲーム",
    "description": "最小限のゲーム",
    "createdAt": "2025-01-03T00:00:00.000Z",
    "lastModified": "2025-01-03T00:00:00.000Z",
    "version": "1.0.0",
    "creator": {
      "isAnonymous": true
    },
    "status": "draft",
    "totalSize": 0,
    "assets": {
      "background": null,
      "objects": [],
      "texts": [],
      "audio": {
        "bgm": null,
        "se": []
      },
      "statistics": {
        "totalImageSize": 0,
        "totalAudioSize": 0,
        "totalSize": 0,
        "usedSlots": {
          "background": 0,
          "objects": 0,
          "texts": 0,
          "bgm": 0,
          "se": 0
        },
        "limitations": {
          "isNearImageLimit": false,
          "isNearAudioLimit": false,
          "isNearTotalLimit": false,
          "hasViolations": false
        }
      },
      "lastModified": "2025-01-03T00:00:00.000Z"
    },
    "script": {
      "initialState": {
        "layout": {
          "background": {
            "visible": false,
            "frameIndex": 0,
            "animationSpeed": 12,
            "autoStart": false
          },
          "objects": [],
          "texts": []
        },
        "audio": {
          "bgm": null,
          "masterVolume": 0.8,
          "seVolume": 0.8
        },
        "gameState": {
          "score": 0,
          "counters": {},
          "flags": {}
        },
        "autoRules": [],
        "metadata": {
          "version": "1.0.0",
          "createdAt": "2025-01-03T00:00:00.000Z",
          "lastModified": "2025-01-03T00:00:00.000Z"
        }
      },
      "layout": {
        "background": {
          "visible": false,
          "initialAnimation": 0,
          "animationSpeed": 12,
          "autoStart": false
        },
        "objects": [],
        "texts": [],
        "stage": {
          "backgroundColor": "#87CEEB"
        }
      },
      "flags": [],
      "counters": [],
      "rules": [],
      "successConditions": [],
      "statistics": {
        "totalRules": 0,
        "totalConditions": 0,
        "totalActions": 0,
        "complexityScore": 0,
        "usedTriggerTypes": [],
        "usedActionTypes": [],
        "flagCount": 0,
        "estimatedCPUUsage": "low",
        "estimatedMemoryUsage": 0,
        "maxConcurrentEffects": 0,
        "counterCount": 0,
        "usedCounterOperations": [],
        "usedCounterComparisons": [],
        "randomConditionCount": 0,
        "randomActionCount": 0,
        "totalRandomChoices": 0,
        "averageRandomProbability": 0,
        "randomEventsPerSecond": 0,
        "randomMemoryUsage": 0
      },
      "version": "1.0.0",
      "lastModified": "2025-01-03T00:00:00.000Z"
    },
    "settings": {
      "name": "最小ゲーム",
      "description": "最小限のゲーム",
      "duration": {
        "type": "fixed",
        "seconds": 10
      },
      "difficulty": "normal",
      "publishing": {
        "isPublished": false,
        "visibility": "private",
        "allowComments": true,
        "allowRemix": false
      },
      "preview": {},
      "export": {
        "includeSourceData": true,
        "compressionLevel": "medium",
        "format": "json"
      }
    },
    "editorState": {
      "activeTab": "assets",
      "lastSaved": "2025-01-03T00:00:00.000Z",
      "autoSaveEnabled": true,
      "tabStates": {
        "assets": {
          "selectedAssetType": null,
          "selectedAssetId": null,
          "showAnimationEditor": false
        },
        "script": {
          "mode": "layout",
          "selectedObjectId": null,
          "selectedRuleId": null,
          "showRuleEditor": false
        },
        "settings": {
          "showTestPlay": false,
          "lastTestResult": null
        }
      },
      "ui": {
        "sidebarCollapsed": false,
        "previewVisible": true,
        "capacityMeterExpanded": false
      }
    },
    "metadata": {
      "statistics": {
        "totalEditTime": 0,
        "saveCount": 0,
        "testPlayCount": 0,
        "publishCount": 0
      },
      "usage": {
        "lastOpened": "2025-01-03T00:00:00.000Z",
        "totalOpenCount": 1,
        "averageSessionTime": 0
      },
      "performance": {
        "lastBuildTime": 0,
        "averageFPS": 60,
        "memoryUsage": 0
      }
    },
    "versionHistory": [],
    "projectSettings": {
      "autoSaveInterval": 30000,
      "backupEnabled": true,
      "compressionEnabled": false,
      "maxVersionHistory": 10
    }
  },
  "metadata": {
    "id": "minimal-game",
    "name": "最小ゲーム",
    "lastModified": "2025-01-03T00:00:00.000Z",
    "status": "draft",
    "size": 0,
    "version": "1.0.0"
  },
  "exportedAt": "2025-01-03T00:00:00.000Z",
  "version": "1.0.0"
}
```

### 実用的なゲーム例

完全な例は以下のサンプルファイルを参照してください：

- `/public/sample-games/002-balloon-pop.json` - 風船割りゲーム（16KB）
- `/public/sample-games/003-whack-a-mole.json` - モグラたたきゲーム（30KB）
- `/public/sample-games/004-fruit-catch.json` - フルーツキャッチゲーム（26KB）
- `/public/sample-games/005-count-apples.json` - りんご数えゲーム（14KB）
- `/public/sample-games/006-number-order.json` - 数字順序ゲーム（17KB）

これらのサンプルは、Swizzleエディターでそのままインポートして動作確認できます。

---

## ⚠️ 重要な注意事項：混同されやすいフィールド

### 🔴 `move.rotate` フィールドは存在しません！

**よくある間違い:**
```json
// ❌ 間違い: rotateフィールドは存在しない
{
  "type": "move",
  "targetId": "object-1",
  "movement": {
    "type": "straight",
    "rotate": 360  // ← このフィールドは存在しない！
  }
}
```

**正しい実装:**

円軌道移動（オブジェクトを円を描くように移動）をしたい場合は、`type: 'orbit'`を使用してください：

```json
// ✅ 正しい: orbitタイプで円軌道移動
{
  "type": "move",
  "targetId": "object-1",
  "movement": {
    "type": "orbit",
    "target": { "x": 0.5, "y": 0.5 },  // 中心座標
    "orbitRadius": 100,                 // 周回半径（px）
    "speed": 2.0                        // 角速度
  }
}
```

スプライトの**視覚的な回転**（見た目を回転）をしたい場合は、`effect`アクションを使用してください：

```json
// ✅ 正しい: エフェクトとして回転
{
  "type": "effect",
  "targetId": "object-1",
  "effect": {
    "type": "rotate",
    "rotationAmount": 360,              // 回転角度（度）
    "rotationSpeed": 180,               // 回転速度（度/秒）
    "rotationDirection": "clockwise",   // 回転方向
    "duration": 2.0
  }
}
```

### 🟡 rotation vs rotate の違い

| フィールド | 場所 | 意味 | 効果 |
|-----------|------|------|------|
| `rotation` | `layout.objects[].rotation` | オブジェクトの**初期回転角度**（degree、0-360） | 配置時の向きを設定、移動経路には影響しない |
| `rotate` | `effect.type = 'rotate'` | **エフェクトとしての回転** | スプライトを一時的に回転させるアニメーション |
| `rotate` | `movement.rotate` | **存在しない** | ❌ 使用不可（混乱の原因） |
| `orbit` | `movement.type = 'orbit'` | **円軌道移動** | オブジェクトを円を描くように移動 |

### 🟡 animation条件 vs objectState条件

| 条件タイプ | 用途 | 推奨用途 |
|-----------|------|---------|
| `animation` | アニメーションの再生状態を監視 | アニメーションの終了、特定フレーム到達を検出 |
| `objectState` | オブジェクトの表示状態 + アニメーション状態 | オブジェクトの表示/非表示を検出、またはアニメーション状態も含めて監視 |

**推奨：** アニメーション関連の条件には`animation`を使用し、表示状態の監視には`objectState`を使用してください。

### 🟡 applyForce vs applyImpulse

| アクション | 効果 | 用途 |
|-----------|------|------|
| `applyForce` | **継続的な力**を加える | 風、重力、推進力など |
| `applyImpulse` | **瞬間的な衝撃**を与える | ジャンプ、爆発、衝突時の反発 |

**物理的な違い：**
- `applyForce`: F = ma （力 = 質量 × 加速度）で徐々に速度が変化
- `applyImpulse`: 即座に速度が変化（p = mv、運動量保存則）

---

## 📚 アクション完全リファレンス

### ゲーム制御アクション

#### success（成功）
```json
{
  "type": "success",
  "score": 100,                // オプション: 追加スコア
  "message": "クリア！"         // オプション: 成功メッセージ
}
```

#### failure（失敗）
```json
{
  "type": "failure",
  "message": "ゲームオーバー"   // オプション: 失敗メッセージ
}
```

#### pause（一時停止）
```json
{
  "type": "pause",
  "duration": 2.0              // オプション: 一時停止時間（秒）
}
```

#### restart（再開）
```json
{
  "type": "restart"
}
```

### 音響制御アクション

#### playSound（効果音再生）
```json
{
  "type": "playSound",
  "soundId": "se-1",           // 必須: 効果音ID
  "volume": 0.8                // オプション: 音量（0.0-1.0）
}
```

#### stopSound（効果音停止）
```json
{
  "type": "stopSound",
  "soundId": "se-1"            // 必須: 停止する効果音ID
}
```

#### playBGM（BGM再生）
```json
{
  "type": "playBGM",
  "volume": 0.5                // オプション: 音量（0.0-1.0）
}
```

#### stopBGM（BGM停止）
```json
{
  "type": "stopBGM"
}
```

### フラグ制御アクション

#### setFlag（フラグ設定）
```json
{
  "type": "setFlag",
  "flagId": "flag-1",          // 必須: フラグID
  "value": true                // 必須: 設定値（true/false）
}
```

#### toggleFlag（フラグ切り替え）
```json
{
  "type": "toggleFlag",
  "flagId": "flag-1"           // 必須: フラグID
}
```

### オブジェクト制御アクション

#### show（表示）
```json
{
  "type": "show",
  "targetId": "object-1",      // 必須: 対象オブジェクトID
  "fadeIn": true,              // オプション: フェードイン有効化
  "duration": 0.5              // オプション: フェード時間（秒）
}
```

#### hide（非表示）
```json
{
  "type": "hide",
  "targetId": "object-1",      // 必須: 対象オブジェクトID
  "fadeOut": true,             // オプション: フェードアウト有効化
  "duration": 0.5              // オプション: フェード時間（秒）
}
```

#### switchAnimation（アニメーション切り替え）
```json
{
  "type": "switchAnimation",
  "targetId": "object-1",      // 必須: 対象オブジェクトID
  "animationIndex": 1,         // 必須: アニメーション番号（0-7）
  "speed": 12,                 // オプション: 再生速度（fps）
  "autoPlay": true,            // オプション: 自動再生
  "loop": true,                // オプション: ループ再生
  "startFrame": 0,             // オプション: 開始フレーム
  "reverse": false             // オプション: 逆再生
}
```

### アニメーション制御アクション

#### playAnimation（アニメーション再生/停止）
```json
{
  "type": "playAnimation",
  "targetId": "object-1",      // 必須: 対象オブジェクトID
  "play": true                 // 必須: true=再生、false=停止
}
```

#### setAnimationSpeed（アニメーション速度変更）
```json
{
  "type": "setAnimationSpeed",
  "targetId": "object-1",      // 必須: 対象オブジェクトID
  "speed": 24                  // 必須: 再生速度（fps）
}
```

#### setAnimationFrame（フレーム設定）
```json
{
  "type": "setAnimationFrame",
  "targetId": "object-1",      // 必須: 対象オブジェクトID
  "frame": 5                   // 必須: フレーム番号
}
```

### 移動制御アクション

#### move（移動）
```json
{
  "type": "move",
  "targetId": "object-1",      // 必須: 対象オブジェクトID
  "movement": {                // 必須: MovementPattern（後述）
    "type": "straight",
    "target": { "x": 0.8, "y": 0.2 },
    "speed": 1.5
  }
}
```

詳細は「MovementPattern完全リファレンス」を参照してください。

#### followDrag（ドラッグ追従）
```json
{
  "type": "followDrag",
  "targetId": "object-1",      // 必須: 対象オブジェクトID
  "offset": { "x": 0, "y": 0 }, // オプション: オフセット
  "constraint": "horizontal",   // オプション: 制約（'horizontal' | 'vertical' | 'none'）
  "smooth": true,               // オプション: スムーズ追従
  "smoothFactor": 0.2           // オプション: スムーズ係数（0.0-1.0）
}
```

### エフェクトアクション

#### effect（エフェクト）
```json
{
  "type": "effect",
  "targetId": "object-1",      // 必須: 対象オブジェクトID
  "effect": {                  // 必須: EffectPattern（後述）
    "type": "scale",
    "scaleAmount": 1.5,
    "duration": 0.15
  }
}
```

詳細は「EffectPattern完全リファレンス」を参照してください。

### 物理演算アクション

#### applyForce（力の適用）
```json
{
  "type": "applyForce",
  "targetId": "object-1",      // 必須: 対象オブジェクトID
  "force": { "x": 100, "y": -200 }, // 必須: 力ベクトル（px/s²）
  "point": { "x": 0.5, "y": 0.5 },  // オプション: 作用点
  "duration": 1.0              // オプション: 継続時間（秒）
}
```

#### applyImpulse（衝撃の適用）
```json
{
  "type": "applyImpulse",
  "targetId": "object-1",      // 必須: 対象オブジェクトID
  "impulse": { "x": 500, "y": -1000 } // 必須: 衝撃ベクトル（px/s）
}
```

#### setGravity（重力変更）
```json
{
  "type": "setGravity",
  "targetId": "object-1",      // 必須: 対象オブジェクトID
  "gravity": 980               // 必須: 重力加速度（px/s²）
}
```

#### setPhysics（物理設定変更）
```json
{
  "type": "setPhysics",
  "targetId": "object-1",      // 必須: 対象オブジェクトID
  "physics": {                 // 必須: 物理プロパティ（部分更新可）
    "gravity": 980,
    "mass": 2.0,
    "friction": 0.5,
    "restitution": 0.8
  }
}
```

### スコア・UIアクション

#### addScore（スコア加算）
```json
{
  "type": "addScore",
  "points": 10                 // 必須: 加算するポイント
}
```

> ⚠️ **`showMessage` は廃止されました。** エンジンに実装がなく、生成しても無視されます。
> メッセージ表示が必要な場合は `effect`（flash/scale 等）や `playSound` で演出してください。

### カウンターアクション

#### counter（カウンター操作）
```json
{
  "type": "counter",
  "counterName": "popped",     // 必須: カウンター名
  "operation": "add",          // 必須: 操作タイプ
  "value": 1,                  // オプション: 操作値
  "notification": {            // オプション: 通知設定
    "enabled": true,
    "message": "+1",
    "duration": 0.5
  }
}
```

**CounterOperation types:**
- `set`: 値を設定
- `add`: 加算
- `subtract`: 減算
- `multiply`: 乗算
- `divide`: 除算
- `increment`: +1（value不要）
- `decrement`: -1（value不要）
- `reset`: リセット（value不要）

### ランダムアクション

#### randomAction（ランダムアクション選択）
```json
{
  "type": "randomAction",
  "actions": [                 // 必須: 選択肢アクション配列
    {
      "action": { "type": "addScore", "points": 10 },
      "weight": 2              // オプション: 重み
    },
    {
      "action": { "type": "addScore", "points": 5 },
      "weight": 3
    }
  ],
  "selectionMode": "weighted", // オプション: 選択方式（'weighted' | 'probability' | 'uniform'）
  "executionLimit": {          // オプション: 実行制限
    "maxExecutions": 10,
    "cooldown": 1000,
    "resetOnGameRestart": true
  }
}
```

---

## 📚 条件完全リファレンス

### タッチ条件

#### touch（タッチ検出）
```json
{
  "type": "touch",
  "target": "self",            // 必須: 'self' | 'stage' | オブジェクトID
  "touchType": "down",         // 必須: 'down' | 'up' | 'hold' | 'drag' | 'swipe' | 'flick'
  "holdDuration": 1.0,         // オプション: ホールド時間（秒、holdの場合）
  "region": {                  // オプション: ステージ範囲指定（targetが'stage'の場合）
    "shape": "rect",
    "x": 0.2,
    "y": 0.2,
    "width": 0.6,
    "height": 0.6
  }
}
```

**touchType詳細:**
- `down`: タッチ開始
- `up`: タッチ終了
- `hold`: 長押し（holdDuration必須）
- `drag`: ドラッグ中
- `swipe`: スワイプ（direction, minDistance等が使用可能）
- `flick`: フリック（maxDistance等が使用可能）

### 衝突条件

#### collision（衝突検出）
```json
{
  "type": "collision",
  "target": "other",           // 必須: 'stageArea' | 'other' | オブジェクトID
  "targetObjectId": "wall",    // オプション: target='other'の場合に指定
  "collisionType": "enter",    // 必須: 'enter' | 'stay' | 'exit'
  "checkMode": "hitbox"        // 必須: 'hitbox' | 'pixel'
}
```

**collisionType詳細:**
- `enter`: 衝突開始時
- `stay`: 衝突中
- `exit`: 衝突終了時

### アニメーション条件

#### animation（アニメーション状態）
```json
{
  "type": "animation",
  "target": "object-1",        // 必須: オブジェクトID
  "condition": "end",          // 必須: 'frame' | 'end' | 'start' | 'loop' | 'playing' | 'stopped' | 'frameRange'
  "animationIndex": 0,         // オプション: 対象アニメーション
  "frameNumber": 5             // オプション: 特定フレーム番号（condition='frame'の場合）
}
```

### オブジェクト状態条件

#### objectState（オブジェクト状態）
```json
{
  "type": "objectState",
  "target": "object-1",        // 必須: オブジェクトID
  "stateType": "visible",      // 必須: 'visible' | 'hidden' | 'animation'
  "animationIndex": 0,         // オプション: stateType='animation'の場合
  "condition": "playing"       // オプション: stateType='animation'の場合
}
```

### 時間条件

#### time（時間条件）
```json
{
  "type": "time",
  "timeType": "interval",      // 必須: 'exact' | 'range' | 'interval'
  "interval": 0.1              // オプション: 間隔（秒、timeType='interval'の場合）
}
```

**timeType詳細:**
- `exact`: 正確な秒数（seconds必須）
- `range`: 時間範囲（range必須）
- `interval`: 繰り返し間隔（interval必須）

### フラグ条件

#### flag（フラグ条件）
```json
{
  "type": "flag",
  "flagId": "flag-1",          // 必須: フラグID
  "condition": "ON"            // 必須: 'ON' | 'OFF' | 'CHANGED' | 'ON_TO_OFF' | 'OFF_TO_ON'
}
```

### ゲーム状態条件

#### gameState（ゲーム状態）
```json
{
  "type": "gameState",
  "state": "playing",          // 必須: 'success' | 'failure' | 'playing' | 'paused'
  "checkType": "is"            // 必須: 'is' | 'not' | 'became'
}
```

### 位置条件

#### position（位置条件）
```json
{
  "type": "position",
  "target": "object-1",        // 必須: オブジェクトID
  "area": "inside",            // 必須: 'inside' | 'outside' | 'crossing'
  "region": {                  // 必須: 判定領域
    "shape": "rect",
    "x": 0.2,
    "y": 0.2,
    "width": 0.6,
    "height": 0.6
  }
}
```

### カウンター条件

#### counter（カウンター条件）
```json
{
  "type": "counter",
  "counterName": "popped",     // 必須: カウンター名
  "comparison": "greaterOrEqual", // 必須: 比較演算子
  "value": 5                   // 必須: 比較値
}
```

**CounterComparison types:**
- `equals`: 等しい
- `notEquals`: 等しくない
- `greater`: より大きい
- `greaterOrEqual`: 以上
- `less`: より小さい
- `lessOrEqual`: 以下
- `between`: 範囲内（rangeMax必須）
- `notBetween`: 範囲外（rangeMax必須）
- `changed`: 変更された

### ランダム条件

#### random（ランダム条件）
```json
{
  "type": "random",
  "probability": 0.3,          // 必須: 確率（0.0-1.0）
  "interval": 1000,            // オプション: 判定間隔（ミリ秒）
  "maxEventsPerSecond": 10     // オプション: 秒間最大イベント数
}
```

---

## 📚 MovementPattern完全リファレンス

### straight（直線移動）

**座標指定:**
```json
{
  "type": "straight",
  "target": { "x": 0.8, "y": 0.2 }, // 目標座標（0.0-1.0）
  "speed": 2.0,                      // 移動速度（px/秒）
  "duration": 1.5,                   // オプション: 移動時間（秒）
  "easing": "ease-in"                // オプション: イージング
}
```

**8方向指定:**
```json
{
  "type": "straight",
  "direction": "down",               // 方向: 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right'
  "speed": 3.0                       // 移動速度（px/秒）
}
```

### teleport（瞬間移動）

```json
{
  "type": "teleport",
  "target": { "x": 0.5, "y": 0.5 }  // 目標座標（0.0-1.0）
}
```

### wander（ランダム徘徊）

```json
{
  "type": "wander",
  "wanderRadius": 100,               // 徘徊半径（ピクセル）
  "speed": 1.5                       // 移動速度（px/秒）
}
```

### stop（停止）

```json
{
  "type": "stop"                     // パラメータ不要
}
```

### swap（位置交換）

```json
{
  "type": "swap",
  "target": "object-2"               // 交換相手のオブジェクトID
}
```

### approach（ターゲットに接近）

```json
{
  "type": "approach",
  "target": { "x": 0.5, "y": 0.5 },  // 目標座標 or オブジェクトID
  "speed": 2.0                       // 移動速度（px/秒）
}
```

### orbit（円軌道移動）⭐

**重要:** これが円運動の正しい実装方法です！

```json
{
  "type": "orbit",
  "target": { "x": 0.5, "y": 0.5 },  // 中心座標 or オブジェクトID
  "orbitRadius": 150,                // オプション: 周回半径（省略時は現在の距離を使用）
  "speed": 2.0                       // 角速度に換算される
}
```

**動作:**
- オブジェクトは`target`を中心として円を描きます
- `orbitRadius`を省略すると、現在の位置からの距離が半径になります
- `speed`は角速度に変換されます（speed * 0.01 rad/frame）

### bounce（バウンド）

```json
{
  "type": "bounce",
  "bounceStrength": 0.8,             // 反発係数（0.0-1.0）
  "speed": 2.0                       // 移動速度（px/秒）
}
```

### 共通パラメータ

#### easing（イージング）

全移動タイプで使用可能：
- `linear`: 等速
- `ease-in`: 加速
- `ease-out`: 減速
- `bounce`: バウンス

#### repeat（リピート設定）

```json
{
  "type": "straight",
  "target": { "x": 0.8, "y": 0.8 },
  "speed": 2.0,
  "repeat": {
    "count": 3,                      // 繰り返し回数（'infinite'で無限）
    "delay": 1.0                     // 繰り返し間隔（秒）
  }
}
```

---

## 📚 EffectPattern完全リファレンス

### flash（点滅）

```json
{
  "type": "flash",
  "duration": 0.5,                   // エフェクト時間（秒）
  "flashColor": "#FFFFFF",           // 点滅色
  "flashIntensity": 0.8,             // 点滅強度（0.0-1.0）
  "flashFrequency": 5                // 点滅周波数（Hz）
}
```

### shake（振動）

```json
{
  "type": "shake",
  "duration": 0.3,                   // エフェクト時間（秒）
  "shakeIntensity": 10,              // 震え強度（ピクセル）
  "shakeFrequency": 20,              // 震え周波数（Hz）
  "shakeDirection": "both"           // 震え方向: 'horizontal' | 'vertical' | 'both'
}
```

### scale（スケール変化）

```json
{
  "type": "scale",
  "duration": 0.2,                   // エフェクト時間（秒）
  "scaleAmount": 1.5,                // スケール倍率
  "easing": "ease-out"               // オプション: イージング
}
```

### rotate（回転）⭐

**重要:** これがスプライトの視覚的な回転の正しい実装方法です！

```json
{
  "type": "rotate",
  "duration": 2.0,                   // エフェクト時間（秒）
  "rotationAmount": 360,             // 回転角度（度）
  "rotationSpeed": 180,              // 回転速度（度/秒）
  "rotationDirection": "clockwise"   // 回転方向: 'clockwise' | 'counterclockwise'
}
```

**注意:** これは移動経路を回転するのではなく、スプライトの**見た目**を回転させます。

### particles（パーティクル効果）

```json
{
  "type": "particles",
  "duration": 1.0,                   // エフェクト時間（秒）
  "particleType": "star",            // パーティクル種類
  "particleCount": 20,               // パーティクル数
  "particleSize": 10,                // サイズ（ピクセル）
  "particleColor": "#FFD700",        // 色（単色 or 配列）
  "particleSpread": 100,             // 拡散範囲（ピクセル）
  "particleSpeed": 200,              // 速度（px/秒）
  "particleGravity": true            // 重力適用
}
```

**particleType:**
- `star`: 星
- `confetti`: 紙吹雪
- `explosion`: 爆発
- `splash`: 飛沫
- `hearts`: ハート
- `sparkle`: キラキラ

### 共通パラメータ

#### intensity（強度）

全エフェクトで使用可能：
```json
{
  "type": "flash",
  "duration": 0.5,
  "intensity": 0.8                   // 強度（0.0-1.0）
}
```

#### overlay（重複実行）

```json
{
  "type": "scale",
  "duration": 0.3,
  "scaleAmount": 1.2,
  "overlay": true                    // 他エフェクトと同時実行可能
}
```

---

## トラブルシューティング

### よくあるエラー

#### 1. "無効なプロジェクトファイルです"

- `project`フィールドが存在しない
- JSONフォーマットが不正

**解決策:**
- トップレベルに`project`フィールドがあることを確認
- JSON構文エラーをチェック（末尾のカンマなど）

#### 2. アセットがインポートされない

- base64データが不正
- `dataUrl`のフォーマットが間違っている

**解決策:**
- `dataUrl`は`data:image/[type];base64,[data]`形式
- base64エンコードが正しいか確認

#### 3. ルールが動作しない

- `targetObjectId`が存在しないオブジェクトを参照
- 条件設定が不完全

**解決策:**
- `targetObjectId`がアセットの`id`と一致するか確認
- 必須フィールドがすべて設定されているか確認

#### 4. 座標がおかしい

- `position`が正規化座標（0.0-1.0）になっていない
- ピクセル座標を使用している

**解決策:**
- すべての座標を0.0～1.0の範囲に変換
- 画面中央は`{ "x": 0.5, "y": 0.5 }`

### デバッグのヒント

1. **サンプルファイルから始める**: `/public/sample-games/`のファイルをベースに編集
2. **段階的にテスト**: 最小限のJSONから始めて、徐々に要素を追加
3. **JSONバリデーター使用**: オンラインツールでJSON構文をチェック
4. **統計情報の整合性**: `statistics`の値が実際のアセット数と一致するか確認

---

## ChatGPT向けプロンプトテンプレート

ChatGPTでSwizzle用のゲームJSONを生成する際の推奨プロンプトテンプレートです。

### 基本的なプロンプト例

```
あなたはSwizzleゲームエディター用のJSON生成アシスタントです。
以下の仕様に従って、ゲームJSONファイルを生成してください。

【仕様書URL】
/home/user/swizzle/SWIZZLE_JSON_SPEC.md

【ゲームの内容】
- ゲーム名: [ゲーム名]
- ゲーム説明: [簡単な説明]
- ゲームの種類: [アクション/パズル/教育など]
- 主な要素: [オブジェクトや動きの説明]

【要件】
1. 画像はSVG形式でbase64エンコードして dataUrl に埋め込む
2. 座標は0.0～1.0の正規化座標を使用
3. すべての必須フィールドを含める
4. JSONとして正しくフォーマットする

【出力形式】
完全なSwizzle JSON形式で出力してください。
コードブロックで囲んで、そのままファイルに保存できる形式にしてください。
```

### 具体的なゲーム生成例

```
【例: りんごキャッチゲーム】

以下の要件でSwizzle用のゲームJSONを生成してください：

ゲーム名: りんごキャッチ
説明: 落ちてくるりんごをバスケットでキャッチするゲーム

オブジェクト:
1. りんご（赤いSVG、画面上部からランダムに落下）
2. バスケット（茶色のSVG、画面下部、ドラッグで左右移動可能）

ルール:
1. りんごは0.1秒ごとに上から下に移動
2. バスケットはドラッグで横方向に追従
3. りんごとバスケットが衝突したら:
   - りんごを非表示
   - スコア+10
   - カウンター「キャッチ数」+1
4. キャッチ数が5以上になったら成功

設定:
- 制限時間: 15秒
- 難易度: 普通
- 背景色: 水色（#87CEEB）

すべてのSVG画像はシンプルな図形で作成し、base64エンコードしてください。
```

### 生成後のチェックリスト

ChatGPTが生成したJSONをインポートする前に確認：

- [ ] `project`フィールドが存在する
- [ ] すべての`dataUrl`が`data:image/svg+xml;base64,`形式
- [ ] 座標がすべて0.0～1.0の範囲内
- [ ] オブジェクトIDがルール内で正しく参照されている
- [ ] JSON構文エラーがない（末尾カンマなど）
- [ ] 必須フィールドがすべて存在する

---

## 付録: 型定義参照

完全な型定義は以下のファイルを参照してください：

- `/src/types/editor/GameProject.ts` - プロジェクト全体の型
- `/src/types/editor/ProjectAssets.ts` - アセット関連の型
- `/src/types/editor/GameScript.ts` - スクリプト関連の型
- `/src/types/editor/GameSettings.ts` - 設定関連の型

---

## バージョン履歴

- **v1.0** (2026-01-03): 初版作成

---

## ライセンス

この仕様書はSwizzleプロジェクトの一部です。

---

**問題が発生した場合は、このスレッドで報告してください。**
