# Swizzle バッチ生成 コーディングルール

## アーキテクチャ概要

```
run.ts
  ├── patterns/arcade.ts  → generateArcadeGames() → GameConfig[]
  ├── patterns/bar.ts     → generateBarGames()    → GameConfig[]
  └── BatchRunner.ts      → run(arcadeGames, barGames)
        └── GameBuilder.ts → buildGame(cfg) → Swizzle JSON
              └── SvgLibrary.ts → SVG生成ユーティリティ
```

## GameConfig インターフェース

```typescript
interface GameConfig {
  id: string;              // 一意ID。例: "arcade-tap-float-0", "bar-speed-0"
  title: string;           // ゲーム名 (1-50文字)
  description: string;     // 説明文 (0-200文字)
  category: 'arcade' | 'bar';
  duration: number;        // 固定秒数: 5 | 10 | 15 | 20 | 30 のいずれか
  difficulty: 'easy' | 'normal' | 'hard';
  backgroundColor: string; // BG_COLORSから選択
  objects: ObjectDef[];    // 最大15個
  counters: CounterDef[];  // 個数制限なし（パフォーマンス注意）
  rules: RuleDef[];        // 個数制限なし（パフォーマンス注意）
  tags?: string[];
}
```

## ObjectDef インターフェース

```typescript
interface ObjectDef {
  id: string;              // 一意ID。例: "obj-0", "tap-target", "mover"
  name: string;            // 表示名
  dataUrl: string;         // SVGのBase64 dataUrl（SvgLibraryで生成）
  width: number;           // SVGピクセル幅
  height: number;          // SVGピクセル高さ
  defaultScale?: number;   // スケール倍率 (デフォルト: 2.0)
  position: { x: number; y: number }; // 0.0-1.0 正規化座標
  visible?: boolean;       // デフォルト: true
  zIndex?: number;         // デフォルト: 1
}
```

## SvgLibrary 使用法

```typescript
import {
  circle, ellipse, rect, star, diamond, triangle,
  balloon, face, basket, button, coin, bomb,
  svgToDataUrl,
  COLORS, BG_COLORS,
} from '../SvgLibrary';

// 使用例
const redCircle = circle(COLORS.red, 100);                    // 赤い円
const blueRect  = rect(COLORS.blue, 120, 60);                 // 青い矩形
const tapBtn    = button('TAP!', COLORS.green, '#fff', 200, 80); // ボタン
```

### 利用可能な図形関数

| 関数 | 引数 | 説明 |
|------|------|------|
| `circle(color, size, opts?)` | size=100 | 円 |
| `ellipse(color, w, h, opts?)` | w=100, h=120 | 楕円 |
| `rect(color, w, h, opts?)` | w=100, h=80, rx=8 | 角丸矩形 |
| `star(color, size)` | size=100 | 星形 |
| `diamond(color, size)` | size=100 | ひし形 |
| `triangle(color, size)` | size=100 | 三角形 |
| `balloon(color, w, h)` | w=100, h=120 | 風船 |
| `face(color, size, smile?)` | size=100, smile=true | 顔 |
| `basket(color, w, h)` | color='#8B4513', w=140, h=80 | バスケット |
| `button(label, color, textColor, w, h)` | w=200, h=80 | テキスト付きボタン |
| `coin(color, size)` | color='#FFD700', size=80 | コイン |
| `bomb(size)` | size=90 | 爆弾 |

## ルール定義パターン

### タッチでタップ・非表示・カウント

```typescript
function tapHideRule(objId: string, counterName: string, score = 10): RuleDef {
  return {
    id: `tap-${objId}`,
    name: `${objId}をタップ`,
    targetObjectId: objId,
    priority: 2,
    conditions: [{ type: 'touch', target: 'self', touchType: 'down' }],
    actions: [
      { type: 'effect', targetId: objId, effect: { type: 'scale', scaleAmount: 1.4, duration: 0.12 } },
      { type: 'hide', targetId: objId },
      { type: 'counter', counterName, operation: 'add', value: 1 },
      { type: 'addScore', points: score },
    ],
  };
}
```

### カウンター達成でクリア

```typescript
function winRule(counterName: string, target: number, message = 'クリア！'): RuleDef {
  return {
    id: 'win-condition',
    name: 'クリア判定',
    targetObjectId: 'stage',
    priority: 10,
    conditions: [{ type: 'counter', counterName, comparison: 'greaterOrEqual', value: target }],
    actions: [{ type: 'success', score: 100, message }],
  };
}
```

### 時間インターバルで移動

```typescript
function floatRule(objId: string, targetX: number, speed: number): RuleDef {
  return {
    id: `float-${objId}`,
    name: `${objId}移動`,
    targetObjectId: objId,
    priority: 1,
    conditions: [{ type: 'time', timeType: 'interval', interval: 0.1 }],
    actions: [{ type: 'move', targetId: objId, movement: { type: 'straight', target: { x: targetX, y: -0.2 }, speed } }],
  };
}
```

### 衝突判定

```typescript
{
  id: 'catch-collision',
  name: 'キャッチ判定',
  targetObjectId: 'item',
  priority: 2,
  conditions: [{ type: 'collision', target: 'other', targetObjectId: 'catcher', collisionType: 'enter', checkMode: 'hitbox' }],
  actions: [
    { type: 'hide', targetId: 'item' },
    { type: 'counter', counterName: 'caught', operation: 'add', value: 1 },
    { type: 'addScore', points: 15 },
  ],
}
```

## 座標系ガイドライン

- `x: 0.1, y: 0.5` — 左端付近、中段
- `x: 0.5, y: 0.5` — 画面中央
- `x: 0.5, y: 0.85` — 下部中央（プレイヤー位置など）
- `x: 0.5, y: 0.1` — 上部中央
- 複数オブジェクト横並び: `[0.15, 0.38, 0.62, 0.85]`
- 3オブジェクト横並び: `[0.2, 0.5, 0.8]`

## 命名規則

- **GameConfig.id**: `{category}-{templateName}-{index}` 例: `arcade-tap-float-0`, `bar-speed-3`
- **ObjectDef.id**: 短く機能を示す名前 例: `tap-target`, `mover`, `zone`, `item`, `catcher`, `bomb`
- **RuleDef.id**: `{動詞}-{対象}` 例: `tap-obj-0`, `fall-item`, `win-condition`
- **カウンターID**: 短い英語名 例: `hit`, `popped`, `taps`, `caught`, `hits`

## duration の制約

`duration` は必ず以下のいずれかの整数:
- `5`, `10`, `15`, `20`, `30`

「unlimited」タイプの場合は GameConfig では表現できない（BatchRunnerが固定時間のみ対応）。

## カテゴリー別ガイドライン

### arcade カテゴリー
- テンプレート化: タップ系 / 落下系 / 連打系 / タイミング系 / キャッチ系
- difficulty のバリエーションを持たせる
- 背景色: 暗め・鮮やか系 (night, dusk, forest, dark, sky, ocean)

### bar カテゴリー
- 会話・パーティゲーム系（複数人で楽しむ）
- シンプルなインタラクション重視
- difficulty は基本 'easy'
- 背景色: 落ち着き系 (lavender, cream, dark, bright)
- 大きいボタン UI (button関数、width=200〜280, height=80〜120)

## バッチ生成の注意点

1. **同一IDの重複禁止**: `id` はユニークである必要がある
2. **オブジェクト数上限**: `objects` は最大15個
3. **dataUrl は Base64 SVG**: `SvgLibrary` の関数を必ず使うこと
4. **`targetObjectId: 'stage'`** — ステージ全体を対象にするルールで使用
5. **priority**: 高い数値ほど優先（1=低, 10=高）
6. **scale のデフォルト**: ObjectDef.defaultScale のデフォルト値は 2.0
7. **BatchRunner の再実行**: `batch-progress.json` をリセットしてから実行すること

## 環境変数（.env.local）

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...（service_role キー）
MASTER_USER_ID=（ゲームを所有させるユーザーのUUID）
SKIP_UPLOAD=true   # ドライランの場合のみ
```

## 実行コマンド

```bash
npm run ai:batch           # 本番実行（Supabase書き込みあり）
npm run ai:batch:dry       # ドライラン（DB書き込みなし）
npm run ai:batch:status    # 進捗確認のみ
```
