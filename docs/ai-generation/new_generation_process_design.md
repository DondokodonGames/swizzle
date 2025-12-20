# 新AI生成プロセス設計書

**作成日**: 2025-12-20
**目的**: ユーザーフィードバックを反映した、正しく動作する「面白いゲーム」生成プロセスの設計

---

## 設計原則

### 現行プロセスの問題点

1. **制約による多様性の喪失**
   - visualStyle: 10種類に制限
   - mainMechanic: 19種類に制限
   - これらの制限がゲームの幅を狭めている

2. **エディター仕様との乖離**
   - LogicGeneratorがエディター仕様を正しく参照していない
   - 実行時エラーが発生するゲームが生成される

3. **評価基準の誤り**
   - 「動的要素」「フィードバック豊富さ」は面白さの本質ではない
   - PlayabilityCheckが生成後にしか行われない（手遅れ）

4. **アセット生成の無計画性**
   - 何が必要で、なぜ必要かを定義せずに生成
   - 結果としてゲームロジックと不整合

---

## 新プロセス概要

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: GameConceptGenerator（制約なし自由発想）                │
│  → ゲームコンセプト + 必要アセット計画                           │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: ConceptValidator（生成前チェック）                      │
│  → 4つの評価基準による事前検証                                   │
│  → NG なら Step 1 に戻る                                        │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: LogicGenerator（エディター仕様準拠）                    │
│  → GameScript生成（検証済みの条件/アクションのみ使用）            │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 4: LogicValidator（実行可能性検証）                        │
│  → 即成功/操作不要/失敗不可能 の検出                             │
│  → NG なら Step 3 に戻る（最大3回、それ以上は破棄）              │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 5: AssetGenerator（計画に基づく生成）                      │
│  → 画像生成（背景 + オブジェクト）                               │
│  → 音声生成（BGM + 効果音）                                     │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 6: FinalAssembly（組み立て）                               │
│  → GameProject完成                                               │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 7: QualityScore（参考スコア算出）                          │
│  → 合否判定なし、参考情報として記録                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step 1: GameConceptGenerator

### 目的
制約なしの自由発想でゲームコンセプトを生成

### 入力
- 使用済みコンセプトリスト（重複回避用、任意）

### プロンプト設計

```
あなたはスマホ向け10秒ミニゲームのゲームデザイナーです。
制約にとらわれず、自由な発想で面白いゲームを考えてください。

# ゲーム設計の4つの要素

1. **目標明確性**: プレイヤーは画面を見た瞬間に「何をすべきか」がわかる
   - 良い例: 「落ちてくるリンゴをキャッチする」
   - 悪い例: 「画面のどこかをタップする」

2. **操作明確性**: プレイヤーは「どう操作すればいいか」がわかる
   - 良い例: 「リンゴの落下位置をタップ」
   - 悪い例: 「なんとなくスワイプ」

3. **判定明確性**: 成功と失敗の基準が明確
   - 良い例: 「5個キャッチで成功、3個落としたら失敗」
   - 悪い例: 「なんとなく終わる」

4. **納得感**: 結果に対してプレイヤーが「そうだよね」と思える
   - 良い例: 自分の操作ミスで失敗した → 納得できる
   - 悪い例: 理不尽な判定で失敗 → 納得できない

# 基本制約
- 制限時間: 5〜15秒
- 画面: スマホ縦画面
- 操作: タッチのみ（タップ、スワイプ、ドラッグ、長押し）

# 出力形式

## ゲームコンセプト
- title: ゲーム名（日本語）
- titleEn: 英語タイトル
- description: 一文でゲーム説明
- duration: 制限時間（秒）

## 4つの明確性
- playerGoal: プレイヤーの目標（画面を見て思うこと）
- playerOperation: 具体的な操作方法
- successCondition: 成功条件（数値を含む）
- failureCondition: 失敗条件（数値を含む）

## アセット計画
- background: 背景の説明（なぜこの背景が必要か）
- objects: オブジェクトリスト
  - name: オブジェクト名
  - purpose: このオブジェクトの役割
  - count: 必要数
  - behavior: 動作説明
- sounds: 必要な効果音リスト
  - name: 効果音名
  - trigger: いつ鳴るか

## 自己評価
- goalClarity: 目標明確性（1-10）
- operationClarity: 操作明確性（1-10）
- judgmentClarity: 判定明確性（1-10）
- acceptance: 納得感（1-10）
- overallScore: 総合評価（1-10）
```

### 出力

```typescript
interface GameConcept {
  // 基本情報
  title: string;
  titleEn: string;
  description: string;
  duration: number;

  // 4つの明確性
  playerGoal: string;
  playerOperation: string;
  successCondition: string;
  failureCondition: string;

  // アセット計画
  assetPlan: {
    background: {
      description: string;
      reason: string;
    };
    objects: Array<{
      name: string;
      purpose: string;
      count: number;
      behavior: string;
    }>;
    sounds: Array<{
      name: string;
      trigger: string;
    }>;
  };

  // 自己評価
  selfEvaluation: {
    goalClarity: number;
    operationClarity: number;
    judgmentClarity: number;
    acceptance: number;
    overallScore: number;
  };
}
```

### チェック
- 全ての自己評価が7以上でなければ再生成

---

## Step 2: ConceptValidator

### 目的
生成前にコンセプトの問題を検出（失敗するゲームを作らない）

### チェック項目

| チェック | 内容 | 不合格条件 |
|----------|------|-----------|
| 目標明確性 | playerGoalが具体的か | 「タップする」「操作する」など曖昧な表現 |
| 操作明確性 | playerOperationが具体的か | 何をどこにどうするか不明 |
| 成功条件 | successConditionに数値があるか | 数値がない、または0 |
| 失敗条件 | failureConditionが実現可能か | 「なし」「時間切れのみ」は要注意 |
| アセット整合性 | objects全てにpurposeがあるか | 目的不明のオブジェクト |

### 実装

```typescript
interface ValidationResult {
  passed: boolean;
  issues: string[];
  suggestions: string[];
}

function validateConcept(concept: GameConcept): ValidationResult {
  const issues: string[] = [];

  // 目標明確性チェック
  if (concept.playerGoal.length < 10) {
    issues.push('目標が短すぎます。具体的に記述してください');
  }
  if (/タップ|操作|触/.test(concept.playerGoal) && !/を|に|で/.test(concept.playerGoal)) {
    issues.push('目標が曖昧です。「何を」「どうする」を明確にしてください');
  }

  // 成功条件チェック
  if (!/\d+/.test(concept.successCondition)) {
    issues.push('成功条件に具体的な数値がありません');
  }

  // 失敗条件チェック
  if (concept.failureCondition === 'なし' || concept.failureCondition === '') {
    issues.push('失敗条件がありません。失敗しないゲームは面白くありません');
  }

  // アセット整合性チェック
  for (const obj of concept.assetPlan.objects) {
    if (!obj.purpose || obj.purpose.length < 5) {
      issues.push(`オブジェクト「${obj.name}」の目的が不明確です`);
    }
  }

  return {
    passed: issues.length === 0,
    issues,
    suggestions: issues.map(i => `修正: ${i}`)
  };
}
```

---

## Step 3: LogicGenerator

### 目的
エディター仕様に準拠したGameScriptを生成

### エディター仕様（実証済み）

#### 使用可能な条件タイプ

| タイプ | パラメータ | 説明 |
|--------|-----------|------|
| touch | objectId, touchType | オブジェクトへのタッチ |
| time | seconds, comparison | 経過時間による判定 |
| counter | counterId, value, comparison | カウンター値の判定 |
| collision | objectId, targetId | 衝突検出 |
| flag | flagId, value | フラグ状態の判定 |

#### 使用可能なアクションタイプ

| タイプ | パラメータ | 説明 |
|--------|-----------|------|
| success | - | ゲームクリア |
| failure | - | ゲームオーバー |
| hide | objectId | オブジェクト非表示 |
| show | objectId | オブジェクト表示 |
| move | objectId, x, y, duration | 移動 |
| counter | counterId, operation, value | カウンター操作 |
| addScore | value | スコア加算 |
| effect | type, x, y | エフェクト表示 |
| playSound | soundId | 効果音再生 |
| setFlag | flagId, value | フラグ設定 |

### プロンプト設計

```
あなたはSwizzleゲームエンジン用のGameScriptを生成します。

# エディター仕様（厳守）

## 座標系
- 正規化座標: 0.0〜1.0
- (0, 0) = 左上
- (1, 1) = 右下
- 中央 = (0.5, 0.5)

## 速度の目安
- 遅い: 0.5〜1.0 単位/秒
- 普通: 1.0〜2.0 単位/秒
- 速い: 2.0〜4.0 単位/秒

## 使用可能な条件
[上記の表を挿入]

## 使用可能なアクション
[上記の表を挿入]

# ゲームコンセプト
[GameConceptの内容を挿入]

# 必須要件

1. **successアクションが必ず存在すること**
   - 成功条件を満たしたときにsuccessを発動

2. **failureアクションが必ず存在すること**
   - 失敗条件を満たしたときにfailureを発動

3. **初期状態で成功条件を満たしていないこと**
   - カウンターの初期値 < 目標値

4. **プレイヤー操作が必須であること**
   - 成功へのパスにtouch条件が含まれる

# 出力形式
[GameScript JSONスキーマ]
```

---

## Step 4: LogicValidator

### 目的
生成されたGameScriptの実行可能性を検証

### チェック項目

```typescript
interface LogicValidationResult {
  isPlayable: boolean;
  issues: {
    hasInstantWin: boolean;      // 即成功
    requiresAction: boolean;     // 操作必須
    canFail: boolean;            // 失敗可能
    hasClearGoal: boolean;       // 明確なゴール
  };
  details: string[];
}

function validateLogic(script: GameScript): LogicValidationResult {
  const issues = {
    hasInstantWin: false,
    requiresAction: false,
    canFail: false,
    hasClearGoal: false
  };
  const details: string[] = [];

  // 即成功チェック
  const successRules = script.rules.filter(r =>
    r.actions?.some(a => a.type === 'success')
  );

  for (const rule of successRules) {
    // 条件なしでsuccess
    if (!rule.triggers?.conditions || rule.triggers.conditions.length === 0) {
      issues.hasInstantWin = true;
      details.push('条件なしでsuccessが発動します');
    }

    // カウンター初期値 >= 目標値
    const counterCondition = rule.triggers?.conditions?.find(c => c.type === 'counter');
    if (counterCondition) {
      const counter = script.counters?.find(c => c.id === counterCondition.counterId);
      if (counter && counter.initialValue >= counterCondition.value) {
        issues.hasInstantWin = true;
        details.push(`カウンター「${counter.id}」の初期値(${counter.initialValue})が目標値(${counterCondition.value})以上です`);
      }
    }
  }

  // 操作必須チェック
  const touchRulesOnSuccessPath = successRules.some(r =>
    r.triggers?.conditions?.some(c => c.type === 'touch')
  );
  issues.requiresAction = touchRulesOnSuccessPath;
  if (!issues.requiresAction) {
    details.push('成功へのパスにプレイヤー操作が含まれていません');
  }

  // 失敗可能チェック
  const failureRules = script.rules.filter(r =>
    r.actions?.some(a => a.type === 'failure')
  );
  issues.canFail = failureRules.length > 0;
  if (!issues.canFail) {
    details.push('failureアクションがありません');
  }

  // 明確なゴールチェック
  issues.hasClearGoal = successRules.length > 0;
  if (!issues.hasClearGoal) {
    details.push('successアクションがありません');
  }

  const isPlayable =
    !issues.hasInstantWin &&
    issues.requiresAction &&
    issues.canFail &&
    issues.hasClearGoal;

  return { isPlayable, issues, details };
}
```

### 不合格時の対応
- Step 3に戻って再生成（最大3回）
- 3回失敗したら、そのコンセプトを破棄してStep 1からやり直し

---

## Step 5: AssetGenerator

### 目的
アセット計画に基づいて画像・音声を生成

### 画像生成

```typescript
async function generateImages(concept: GameConcept): Promise<GameAssets> {
  const { assetPlan } = concept;

  // 背景生成
  const backgroundPrompt = buildBackgroundPrompt(assetPlan.background);
  const background = await generateImage(backgroundPrompt, '1024x1024');

  // オブジェクト生成
  const objects: GeneratedObject[] = [];
  for (const objPlan of assetPlan.objects) {
    const prompt = buildObjectPrompt(objPlan, concept);
    const image = await generateImage(prompt, '512x512');
    objects.push({
      id: generateObjectId(objPlan.name),
      name: objPlan.name,
      purpose: objPlan.purpose,
      imageUrl: image.url
    });
  }

  return { background, objects };
}

function buildBackgroundPrompt(bg: { description: string; reason: string }): string {
  return `${bg.description}, game background, mobile game, high quality, ${bg.reason}`;
}

function buildObjectPrompt(obj: ObjectPlan, concept: GameConcept): string {
  return `${obj.name}, ${obj.purpose}, game sprite, transparent background, ${concept.titleEn} style`;
}
```

### 音声生成

```typescript
async function generateSounds(concept: GameConcept): Promise<GameSounds> {
  const { assetPlan } = concept;
  const sounds: GeneratedSound[] = [];

  for (const soundPlan of assetPlan.sounds) {
    const preset = mapToPreset(soundPlan.name);
    const soundData = await synthesizeSound(preset);
    sounds.push({
      id: generateSoundId(soundPlan.name),
      name: soundPlan.name,
      trigger: soundPlan.trigger,
      data: soundData
    });
  }

  // BGM生成
  const bgm = await generateBGM(concept.duration);

  return { sounds, bgm };
}

function mapToPreset(name: string): SoundPreset {
  const presetMap: Record<string, SoundPreset> = {
    'タップ': 'tap',
    '成功': 'success',
    '失敗': 'failure',
    '収集': 'collect',
    'ポップ': 'pop',
    '跳ねる': 'bounce'
    // ... 他のプリセット
  };
  return presetMap[name] || 'tap';
}
```

---

## Step 6: FinalAssembly

### 目的
全ての素材を組み合わせてGameProjectを完成

```typescript
function assembleGame(
  concept: GameConcept,
  script: GameScript,
  assets: GameAssets,
  sounds: GameSounds
): GameProject {
  return {
    id: generateGameId(),
    title: concept.title,
    titleEn: concept.titleEn,
    description: concept.description,
    settings: {
      duration: {
        seconds: concept.duration,
        showTimer: true
      }
    },
    assets: {
      background: assets.background,
      objects: assets.objects.map(obj => ({
        id: obj.id,
        type: 'image',
        src: obj.imageUrl
      }))
    },
    sounds: sounds,
    script: script,
    metadata: {
      generatedAt: new Date().toISOString(),
      concept: concept,
      evaluationScores: concept.selfEvaluation
    }
  };
}
```

---

## Step 7: QualityScore（参考情報）

### 目的
参考情報としてスコアを記録（合否判定には使用しない）

### スコア項目

| 項目 | 重み | 内容 |
|------|------|------|
| 目標明確性 | 25% | playerGoalの具体性 |
| 操作明確性 | 25% | playerOperationの具体性 |
| 判定明確性 | 25% | success/failureの明確さ |
| 納得感 | 25% | 理不尽さがないか |

### 合否判定

```typescript
// Step 4 (LogicValidator) を通過したゲームは全て公開対象
// QualityScoreは参考情報として記録するのみ
const passed = logicValidation.isPlayable;  // これが唯一の合否基準
```

---

## 実装優先度

### Phase 1（最優先）
1. GameConceptGeneratorの実装
2. ConceptValidatorの実装
3. LogicGeneratorのプロンプト修正（エディター仕様準拠）
4. LogicValidatorの実装

### Phase 2
5. AssetGeneratorの計画ベース化
6. FinalAssemblyの整理

### Phase 3
7. QualityScoreの参考情報化
8. バイアス検出・補正機能

---

## 現行コードからの変更点

| 現行 | 新設計 |
|------|--------|
| visualStyle: 10種類固定 | 自由記述 |
| mainMechanic: 19種類固定 | 自由記述 |
| 画像生成 → ロジック生成 | ロジック生成 → 画像生成 |
| SpecificationComplianceChecker | 廃止（LogicValidatorに統合） |
| FunEvaluator (funScore >= 50) | LogicValidator.isPlayable |
| 動的要素・フィードバック評価 | 4つの明確性評価 |

---

## 期待される改善効果

1. **多様性向上**: 制約なしでゲームの幅が広がる
2. **実行可能性向上**: エディター仕様準拠で実行エラー減少
3. **面白さ向上**: 4つの明確性に基づく設計
4. **無駄削減**: 実行不可能なゲームを早期に排除
