# 新AI生成プロセス設計書

**作成日**: 2025-12-20
**目的**: ユーザーが「面白い」と感じるゲームを確実に生成するプロセス

---

## 設計思想

### 自由と厳密の分離

| 領域 | 方針 |
|------|------|
| ゲームアイデア | **完全自由** - 制約なし、創造性最大化 |
| エディター仕様 | **厳密遵守** - 動作確認済み機能のみ使用 |

### 4つの評価基準（全ステップで適用）

1. **目標明確性**: プレイヤーは何をすべきかわかる
2. **操作明確性**: プレイヤーはどう操作すればいいかわかる
3. **判定明確性**: 成功と失敗の基準が明確
4. **納得感**: 結果に対して納得できる

---

## プロセス全体像

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: GameConceptGenerator                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 入力: 4つの評価基準（前提条件として組み込み）           │   │
│  │ 出力: 自由なゲームコンセプト                            │   │
│  │ 検証: 自己評価で全基準7点以上を必須                     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: ConceptValidator（ダブルチェック）                     │
│  → Step 1の自己評価を独立検証                                   │
│  → NG: Step 1へフィードバックして再生成                         │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: LogicGenerator                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 入力: エディター仕様書（条件・アクション完全リスト）    │   │
│  │ 出力: GameScript + アセット計画                         │   │
│  │ 前提: 即成功/即失敗/型エラーは絶対に出さない            │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 4: LogicValidator（100%成功前提のダブルチェック）         │
│  → エディター仕様との完全整合性検証                             │
│  → NG: Step 3へ戻り修正（諦めない、必ず成功させる）            │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 5: AssetGenerator                                         │
│  → Step 3のアセット計画に基づいて画像・音声生成                 │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 6: FinalAssembly                                          │
│  → JSON整合性チェック（ファイル破損防止）                       │
│  → GameProject完成                                               │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 7: QualityScore（参考情報）                                │
│  → 合否判定なし、記録のみ                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step 1: GameConceptGenerator

### 目的
4つの評価基準を**前提条件**として、自由な発想でゲームを考える

### プロンプト設計

```
あなたはスマホ向け10秒ミニゲームのゲームデザイナーです。

# 絶対に守る前提条件

以下の4つを満たさないゲームは存在価値がありません。
これらを満たした上で、自由に創造してください。

1. **目標明確性**
   プレイヤーが画面を見た瞬間に「何をすべきか」がわかる
   - ✅ 「赤いものを全部タップして消す」
   - ❌ 「画面をなんとなく触る」

2. **操作明確性**
   プレイヤーが「どう操作すればいいか」がわかる
   - ✅ 「落ちてくるリンゴの下にキャラを移動してキャッチ」
   - ❌ 「うまくやる」

3. **判定明確性**
   成功と失敗の基準が数値で明確
   - ✅ 「5個キャッチで成功、3個落としたら失敗」
   - ❌ 「なんとなく終わる」「時間切れで終了」

4. **納得感**
   結果に対してプレイヤーが納得できる
   - ✅ 自分の操作ミスで失敗 → 納得
   - ❌ 運だけで決まる、理不尽な判定 → 不満

# ゲーム基本制約
- 制限時間: 5〜15秒
- 画面: スマホ縦画面
- 操作: タッチのみ（タップ、スワイプ、ドラッグ、長押し）

# 自由に考えてよいこと
- テーマ（何でもOK: 宇宙、料理、スポーツ、抽象、ファンタジー...）
- ビジュアルスタイル（何でもOK: シンプル、派手、レトロ、モダン...）
- ゲームメカニクス（何でもOK: 既存の型にとらわれない）
- 世界観・ストーリー（何でもOK）

# 出力

## ゲームコンセプト
- title: タイトル（日本語）
- titleEn: 英語タイトル
- description: 一文でゲーム説明
- duration: 制限時間（秒）
- theme: テーマ（自由記述）
- visualStyle: ビジュアルスタイル（自由記述）

## 4つの明確性（具体的に記述）
- playerGoal: プレイヤーの目標
  例: 「画面上部から落ちてくる赤いリンゴを5個キャッチする」
- playerOperation: 具体的な操作方法
  例: 「画面下部のキャラを左右スワイプで移動、リンゴの落下位置に合わせる」
- successCondition: 成功条件（必ず数値を含む）
  例: 「リンゴを5個キャッチ」
- failureCondition: 失敗条件（必ず数値を含む）
  例: 「リンゴを3個落とす、または時間切れ」

## 自己評価（各項目1-10点、全て7点以上必須）
- goalClarity: 目標明確性
- operationClarity: 操作明確性
- judgmentClarity: 判定明確性
- acceptance: 納得感
- reasoning: なぜこの点数か（各項目について1文ずつ）
```

### 出力型

```typescript
interface GameConcept {
  title: string;
  titleEn: string;
  description: string;
  duration: number;
  theme: string;           // 完全自由
  visualStyle: string;     // 完全自由

  playerGoal: string;
  playerOperation: string;
  successCondition: string;
  failureCondition: string;

  selfEvaluation: {
    goalClarity: number;       // 7以上必須
    operationClarity: number;  // 7以上必須
    judgmentClarity: number;   // 7以上必須
    acceptance: number;        // 7以上必須
    reasoning: string;
  };
}
```

### 検証
- 全評価項目が7点以上でなければ、理由を示して再生成

---

## Step 2: ConceptValidator

### 目的
Step 1の自己評価が正しいかダブルチェック

### チェック内容

```typescript
function validateConcept(concept: GameConcept): ValidationResult {
  const issues: string[] = [];

  // 目標明確性チェック
  if (!concept.playerGoal.match(/[0-9]+/)) {
    issues.push('playerGoalに具体的な数値がありません');
  }
  if (concept.playerGoal.length < 15) {
    issues.push('playerGoalが短すぎます。もっと具体的に');
  }

  // 操作明確性チェック
  if (!concept.playerOperation.match(/(タップ|スワイプ|ドラッグ|長押し)/)) {
    issues.push('playerOperationに操作方法が明記されていません');
  }

  // 成功条件チェック
  if (!concept.successCondition.match(/[0-9]+/)) {
    issues.push('successConditionに数値がありません');
  }

  // 失敗条件チェック
  if (!concept.failureCondition.match(/[0-9]+/)) {
    issues.push('failureConditionに数値がありません');
  }
  if (concept.failureCondition === '時間切れ' || concept.failureCondition === 'なし') {
    issues.push('失敗条件が「時間切れ」だけでは納得感がありません');
  }

  return {
    passed: issues.length === 0,
    issues,
    feedback: issues.map(i => `修正してください: ${i}`)
  };
}
```

### 不合格時
- フィードバックをStep 1に渡して再生成

---

## Step 3: LogicGenerator

### 目的
エディター仕様に**厳密に**従ってGameScriptを生成
**即成功/即失敗/型エラーは絶対に出さない**

### エディター仕様（動作確認済みのみ使用）

#### 使用可能な条件タイプ

| タイプ | パラメータ | 説明 | 状態 |
|--------|-----------|------|------|
| touch | target, touchType | タッチ検出 | ✅確認済 |
| time | timeType, seconds/interval | 時間条件 | ✅確認済 |
| counter | counterName, comparison, value | カウンター判定 | ✅確認済 |
| collision | target, collisionType, checkMode | 衝突検出 | ✅確認済 |
| flag | flagId, value | フラグ状態 | ✅確認済 |
| gameState | - | ゲーム状態 | ✅確認済 |

**使用禁止（要検証のため）:**
- position（動作不安定）
- animation（要検証）
- random（要検証）

#### 使用可能なアクションタイプ

| タイプ | パラメータ | 説明 | 状態 |
|--------|-----------|------|------|
| success | score?, message? | ゲームクリア | ✅確認済 |
| failure | message? | ゲームオーバー | ✅確認済 |
| hide | targetId | 非表示 | ✅確認済 |
| show | targetId | 表示 | ✅確認済 |
| move | targetId, movement | 移動 | ✅確認済 |
| counter | counterName, operation, value? | カウンター操作 | ✅確認済 |
| addScore | points | スコア加算 | ✅確認済 |
| effect | targetId, effect | エフェクト | ✅確認済 |
| setFlag | flagId, value | フラグ設定 | ✅確認済 |
| toggleFlag | flagId | フラグ切替 | ✅確認済 |

**使用禁止（要検証のため）:**
- playSound（要検証）
- switchAnimation（要検証）
- applyForce/applyImpulse（予測困難）
- randomAction（要検証）

### プロンプト設計

```
あなたはSwizzleゲームエンジンのGameScriptを生成します。

# 絶対厳守事項

## 1. 即成功を出さない
- カウンター初期値は必ず目標値より小さくする
- 成功条件には必ずプレイヤー操作（touch条件）を含むパスが必要

## 2. 即失敗を出さない
- ゲーム開始直後に失敗条件を満たさない
- 失敗カウンターの初期値は必ず閾値より小さくする

## 3. 型エラーを出さない
- objectIdはassetsに定義したものを正確に使用
- counterNameはcountersに定義したものを正確に使用
- 座標は0.0〜1.0の範囲

## 4. 使用可能な機能のみ使う
[上記の動作確認済みリストのみ使用]

# ゲームコンセプト
[GameConceptの内容]

# 出力

## GameScript
- layout: オブジェクト配置
- counters: カウンター定義
- rules: ゲームルール

## アセット計画
各オブジェクトについて:
- id: オブジェクトID
- name: 名前
- purpose: ゲーム内での役割
- visualDescription: 見た目の説明（画像生成用）
- initialPosition: 初期位置 { x, y }
- size: サイズ感（small/medium/large）

背景について:
- description: 背景の説明
- mood: 雰囲気

効果音について:
- id: 効果音ID
- trigger: いつ鳴るか
- type: 効果音の種類（tap/success/failure/collect/bounce等）

# 検証チェックリスト（生成後自己確認）
□ successアクションへのパスにtouch条件が含まれる
□ カウンター初期値 < 成功閾値
□ カウンター初期値 < 失敗閾値
□ 全てのobjectIdがassetsに存在する
□ 全てのcounterNameがcountersに存在する
□ 座標が0.0〜1.0の範囲内
□ 使用している条件・アクションは全て動作確認済みリストに含まれる
```

### 出力型

```typescript
interface LogicGeneratorOutput {
  script: {
    layout: {
      objects: Array<{
        objectId: string;
        position: { x: number; y: number };
        scale: { x: number; y: number };
      }>;
    };
    counters: Array<{
      id: string;
      name: string;
      initialValue: number;
    }>;
    rules: GameRule[];
  };

  assetPlan: {
    objects: Array<{
      id: string;
      name: string;
      purpose: string;
      visualDescription: string;
      initialPosition: { x: number; y: number };
      size: 'small' | 'medium' | 'large';
    }>;
    background: {
      description: string;
      mood: string;
    };
    sounds: Array<{
      id: string;
      trigger: string;
      type: string;
    }>;
  };

  selfCheck: {
    hasPlayerActionOnSuccessPath: boolean;
    counterInitialValuesSafe: boolean;
    allObjectIdsValid: boolean;
    allCounterNamesValid: boolean;
    coordinatesInRange: boolean;
    onlyVerifiedFeaturesUsed: boolean;
  };
}
```

---

## Step 4: LogicValidator

### 目的
100%成功が前提。エディター仕様との完全整合性を検証

### 検証内容

```typescript
interface LogicValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  type: 'critical' | 'warning';
  code: string;
  message: string;
  fix?: string;
}

function validateLogic(output: LogicGeneratorOutput): LogicValidationResult {
  const errors: ValidationError[] = [];

  // 1. オブジェクトID整合性
  const definedObjectIds = new Set(output.assetPlan.objects.map(o => o.id));
  for (const layoutObj of output.script.layout.objects) {
    if (!definedObjectIds.has(layoutObj.objectId)) {
      errors.push({
        type: 'critical',
        code: 'INVALID_OBJECT_ID',
        message: `objectId "${layoutObj.objectId}" がアセット計画に存在しません`,
        fix: `アセット計画に "${layoutObj.objectId}" を追加するか、正しいIDに修正してください`
      });
    }
  }

  // 2. カウンター名整合性
  const definedCounterNames = new Set(output.script.counters.map(c => c.id));
  for (const rule of output.script.rules) {
    // ルール内のcounter条件をチェック
    for (const condition of rule.triggers?.conditions || []) {
      if (condition.type === 'counter' && !definedCounterNames.has(condition.counterName)) {
        errors.push({
          type: 'critical',
          code: 'INVALID_COUNTER_NAME',
          message: `counterName "${condition.counterName}" が定義されていません`,
          fix: `countersに "${condition.counterName}" を追加してください`
        });
      }
    }
  }

  // 3. 即成功チェック
  const successRules = output.script.rules.filter(r =>
    r.actions?.some(a => a.type === 'success')
  );
  for (const rule of successRules) {
    const counterCondition = rule.triggers?.conditions?.find(c => c.type === 'counter');
    if (counterCondition) {
      const counter = output.script.counters.find(c => c.id === counterCondition.counterName);
      if (counter && counter.initialValue >= counterCondition.value) {
        errors.push({
          type: 'critical',
          code: 'INSTANT_WIN',
          message: `即成功: カウンター "${counter.id}" の初期値(${counter.initialValue})が目標値(${counterCondition.value})以上`,
          fix: `initialValueを${counterCondition.value - 1}以下に設定してください`
        });
      }
    }
  }

  // 4. 即失敗チェック
  const failureRules = output.script.rules.filter(r =>
    r.actions?.some(a => a.type === 'failure')
  );
  for (const rule of failureRules) {
    const counterCondition = rule.triggers?.conditions?.find(c => c.type === 'counter');
    if (counterCondition) {
      const counter = output.script.counters.find(c => c.id === counterCondition.counterName);
      if (counter && counter.initialValue >= counterCondition.value) {
        errors.push({
          type: 'critical',
          code: 'INSTANT_LOSE',
          message: `即失敗: カウンター "${counter.id}" の初期値(${counter.initialValue})が失敗閾値(${counterCondition.value})以上`,
          fix: `initialValueを${counterCondition.value - 1}以下に設定してください`
        });
      }
    }
  }

  // 5. 座標範囲チェック
  for (const obj of output.script.layout.objects) {
    if (obj.position.x < 0 || obj.position.x > 1 || obj.position.y < 0 || obj.position.y > 1) {
      errors.push({
        type: 'critical',
        code: 'INVALID_COORDINATES',
        message: `座標範囲外: ${obj.objectId} (${obj.position.x}, ${obj.position.y})`,
        fix: `座標を0.0〜1.0の範囲に修正してください`
      });
    }
  }

  // 6. 使用禁止機能チェック
  const forbiddenConditions = ['position', 'animation', 'random'];
  const forbiddenActions = ['playSound', 'switchAnimation', 'applyForce', 'applyImpulse', 'randomAction'];

  for (const rule of output.script.rules) {
    for (const condition of rule.triggers?.conditions || []) {
      if (forbiddenConditions.includes(condition.type)) {
        errors.push({
          type: 'critical',
          code: 'FORBIDDEN_CONDITION',
          message: `使用禁止の条件タイプ: ${condition.type}`,
          fix: `動作確認済みの条件タイプに置き換えてください`
        });
      }
    }
    for (const action of rule.actions || []) {
      if (forbiddenActions.includes(action.type)) {
        errors.push({
          type: 'critical',
          code: 'FORBIDDEN_ACTION',
          message: `使用禁止のアクションタイプ: ${action.type}`,
          fix: `動作確認済みのアクションタイプに置き換えてください`
        });
      }
    }
  }

  // 7. 成功パスにプレイヤー操作が必要
  let hasPlayerActionOnSuccessPath = false;
  for (const rule of successRules) {
    if (rule.triggers?.conditions?.some(c => c.type === 'touch')) {
      hasPlayerActionOnSuccessPath = true;
      break;
    }
  }
  // カウンター経由の場合もチェック
  if (!hasPlayerActionOnSuccessPath) {
    for (const rule of output.script.rules) {
      if (rule.triggers?.conditions?.some(c => c.type === 'touch') &&
          rule.actions?.some(a => a.type === 'counter')) {
        hasPlayerActionOnSuccessPath = true;
        break;
      }
    }
  }
  if (!hasPlayerActionOnSuccessPath) {
    errors.push({
      type: 'critical',
      code: 'NO_PLAYER_ACTION',
      message: '成功へのパスにプレイヤー操作が含まれていません',
      fix: 'touch条件を持つルールを追加してください'
    });
  }

  return {
    valid: errors.filter(e => e.type === 'critical').length === 0,
    errors
  };
}
```

### 不合格時の対応
- **諦めない**: エラー内容をStep 3に渡して修正
- 修正を繰り返し、必ず有効なGameScriptを出力する

---

## Step 5: AssetGenerator

### 目的
Step 3のアセット計画に基づいて画像・音声を生成

### 画像生成

```typescript
async function generateAssets(assetPlan: AssetPlan, concept: GameConcept): Promise<GeneratedAssets> {
  // 背景生成
  const bgPrompt = buildBackgroundPrompt(assetPlan.background, concept);
  const background = await generateImage(bgPrompt, '1024x1024');

  // オブジェクト生成
  const objects: GeneratedObject[] = [];
  for (const objPlan of assetPlan.objects) {
    const prompt = buildObjectPrompt(objPlan, concept);
    const image = await generateImage(prompt, '512x512');
    objects.push({
      id: objPlan.id,
      name: objPlan.name,
      imageUrl: image.url
    });
  }

  // 音声生成
  const sounds = await generateSounds(assetPlan.sounds);

  return { background, objects, sounds };
}

function buildBackgroundPrompt(bg: BackgroundPlan, concept: GameConcept): string {
  return `${bg.description}, ${bg.mood} mood, ${concept.visualStyle} style, game background, mobile game, high quality`;
}

function buildObjectPrompt(obj: ObjectPlan, concept: GameConcept): string {
  return `${obj.visualDescription}, ${concept.visualStyle} style, game sprite, transparent background, ${obj.size} size`;
}
```

---

## Step 6: FinalAssembly

### 目的
全素材を組み合わせてGameProjectを完成
**ファイル破損を防止する整合性チェック**

### 整合性チェック

```typescript
function assembleAndValidate(
  concept: GameConcept,
  script: GameScript,
  assets: GeneratedAssets
): { project: GameProject; valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // 1. アセットIDとスクリプトIDの整合性
  const assetObjectIds = new Set(assets.objects.map(o => o.id));
  for (const layoutObj of script.layout.objects) {
    if (!assetObjectIds.has(layoutObj.objectId)) {
      issues.push(`Missing asset for objectId: ${layoutObj.objectId}`);
    }
  }

  // 2. JSON構造の妥当性
  const project: GameProject = {
    id: generateId(),
    name: concept.title,
    nameEn: concept.titleEn,
    description: concept.description,
    assets: {
      background: assets.background,
      objects: assets.objects.map(o => ({
        id: o.id,
        type: 'image',
        frames: [{ dataUrl: o.imageUrl }]
      }))
    },
    script: script,
    settings: {
      duration: { type: 'fixed', seconds: concept.duration }
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      concept: concept
    }
  };

  // 3. JSON.stringify可能か確認
  try {
    JSON.stringify(project);
  } catch (e) {
    issues.push(`JSON serialization failed: ${e}`);
  }

  // 4. 必須フィールドの存在確認
  if (!project.assets?.background) issues.push('Missing background');
  if (!project.script?.rules?.length) issues.push('No rules defined');
  if (!project.settings?.duration) issues.push('Missing duration');

  return {
    project,
    valid: issues.length === 0,
    issues
  };
}
```

---

## Step 7: QualityScore

### 目的
参考情報として記録（合否判定には使用しない）

### 記録内容

```typescript
interface QualityScore {
  // 4つの明確性（コンセプト時点の自己評価を転記）
  goalClarity: number;
  operationClarity: number;
  judgmentClarity: number;
  acceptance: number;

  // 技術的指標
  ruleCount: number;
  objectCount: number;
  validationPassedFirstTry: boolean;

  // タイムスタンプ
  generatedAt: string;
}
```

---

## エディター仕様 完全リファレンス

### 座標系

```
画面サイズ: 1080 x 1920 px（9:16）
座標: 正規化（0.0〜1.0）
  x: 0.0=左端, 1.0=右端
  y: 0.0=上端, 1.0=下端
オブジェクト原点: 左上角
```

### 速度

```
単位: px/frame（60FPS想定）
  非常に遅い: 0.5-1.0
  遅い: 1.0-2.0
  普通: 2.0-4.0
  速い: 4.0-8.0
  非常に速い: 8.0-15.0
```

### 条件タイプ（✅のみ使用可）

| タイプ | パラメータ | 状態 |
|--------|-----------|------|
| touch | target: 'self'/'stage'/objectId, touchType: 'down'/'up'/'hold'/'drag'/'swipe'/'flick' | ✅ |
| time | timeType: 'exact'/'range'/'interval', seconds?, interval? | ✅ |
| counter | counterName, comparison: 'equals'/'greaterOrEqual'/'greater'/'less'/'lessOrEqual', value | ✅ |
| collision | target: 'stageArea'/'other'/objectId, collisionType: 'enter'/'stay'/'exit', checkMode: 'hitbox'/'pixel' | ✅ |
| flag | flagId, value | ✅ |
| gameState | - | ✅ |
| position | - | ⚠️禁止 |
| animation | - | ⚠️禁止 |
| random | - | ⚠️禁止 |

### アクションタイプ（✅のみ使用可）

| タイプ | パラメータ | 状態 |
|--------|-----------|------|
| success | score?, message? | ✅ |
| failure | message? | ✅ |
| hide | targetId, fadeOut?, duration? | ✅ |
| show | targetId | ✅ |
| move | targetId, movement: { type: 'straight'/'teleport'/'wander'/'stop', target?, speed?, duration?, direction? } | ✅ |
| counter | counterName, operation: 'increment'/'decrement'/'set'/'add'/'subtract', value? | ✅ |
| addScore | points | ✅ |
| effect | targetId, effect: { type: 'flash'/'shake'/'scale'/'rotate'/'particles', duration, intensity?, scaleAmount? } | ✅ |
| setFlag | flagId, value | ✅ |
| toggleFlag | flagId | ✅ |
| playSound | - | ⚠️禁止 |
| switchAnimation | - | ⚠️禁止 |
| applyForce | - | ⚠️禁止 |
| applyImpulse | - | ⚠️禁止 |
| randomAction | - | ⚠️禁止 |

---

## 実装ガイドライン

### 推奨ルール数
- シンプル: 3-7
- 中程度: 7-12
- 複雑: 12-20（上限25）

### 推奨オブジェクト数
- キャラクター: 1-2（上限3）
- インタラクト対象: 3-8（上限15）
- UI要素: 0-3（上限5）
