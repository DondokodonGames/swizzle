/**
 * Step 3.5: AssetPlanner
 *
 * GameDesignから必要なアセットを逆算し、AssetPlanを生成
 * AssetGeneratorへの入力を確定させる
 *
 * 入力: GameConcept + GameDesign
 * 出力: AssetPlan (強化版)
 */

import Anthropic from '@anthropic-ai/sdk';
import { GameConcept } from './types';
import { GameDesign } from './GameDesignGenerator';
import { GenerationLogger } from './GenerationLogger';

// ==========================================
// AssetPlan Types (強化版)
// ==========================================

/**
 * オブジェクトアセット定義
 */
export interface ObjectAssetPlan {
  id: string;
  name: string;
  role: 'target' | 'obstacle' | 'collectible' | 'ui' | 'effect' | 'decoration' | 'indicator';
  states: ObjectState[];           // 必要な状態（通常、被弾、消滅など）
  hitboxType: 'rect' | 'circle' | 'pixel' | 'none';
  touchable: boolean;
  zPriority: 'background' | 'default' | 'foreground' | 'overlay';
  sizeHint: 'small' | 'medium' | 'large';
  visualDescription: string;
}

export interface ObjectState {
  name: string;                    // 'normal', 'hit', 'destroy', 'selected' など
  description: string;             // 見た目の説明
  isDefault: boolean;
}

/**
 * 背景アセット定義
 */
export interface BackgroundAssetPlan {
  type: 'image' | 'color' | 'none';
  description: string;
  mood: string;
  scrollable: boolean;
}

/**
 * 音声アセット定義
 */
export interface AudioAssetPlan {
  sounds: SoundAssetPlan[];
  bgm?: BgmAssetPlan;
}

export interface SoundAssetPlan {
  id: string;
  trigger: string;                 // いつ鳴らすか
  type: 'tap' | 'success' | 'failure' | 'collect' | 'hit' | 'pop' | 'whoosh' | 'bounce' | 'ding' | 'buzz' | 'countdown' | 'warning';
  priority: 'required' | 'optional';
}

export interface BgmAssetPlan {
  id: string;
  description: string;
  mood: 'upbeat' | 'calm' | 'tense' | 'happy' | 'mysterious' | 'energetic';
  loopable: boolean;
}

/**
 * 演出アセット定義
 */
export interface EffectAssetPlan {
  id: string;
  trigger: 'success' | 'failure' | 'hit' | 'collect' | 'countdown' | 'score';
  type: 'particle' | 'overlay' | 'flash' | 'shake' | 'scale';
  description: string;
  duration: number;                // 秒
}

/**
 * アセットポリシー
 */
export interface AssetPolicy {
  imageFormat: 'svg' | 'png' | 'any';
  maxImageSize: { width: number; height: number };
  requireTransparency: boolean;
  colorPalette?: string[];         // 推奨色パレット
  styleGuide: string;              // スタイルの説明
}

/**
 * 画面構成（アセットが画面全体でどう機能するか）
 */
export interface ScreenComposition {
  layout: string;                   // 画面レイアウトの説明
  focalPoint: string;               // 視線の中心となる要素
  visualHierarchy: string[];        // 視覚的優先順位（前景→背景）
  colorScheme: string;              // 色の統一感
  overallMood: string;              // 全体の雰囲気
}

/**
 * AssetPlan (強化版)
 */
export interface EnhancedAssetPlan {
  // ★ 画面構成（アセット間の関係性）
  screenComposition: ScreenComposition;

  objects: ObjectAssetPlan[];
  background: BackgroundAssetPlan;
  audio: AudioAssetPlan;
  effects: EffectAssetPlan[];
  assetPolicy: AssetPolicy;

  // メタ情報
  totalAssetCount: number;
  planDecisions: AssetPlanDecision[];
}

export interface AssetPlanDecision {
  category: 'object' | 'audio' | 'effect' | 'policy';
  decision: string;
  reasoning: string;
}

// ==========================================
// AssetPlanner
// ==========================================

const ASSET_PLAN_PROMPT = `あなたはゲームアセットプランナーです。
ゲームデザインを分析し、必要なアセットを漏れなく列挙してください。

# ★★★ 最重要: 「画面構成」としてアセットを設計する ★★★

個々のアセットを独立に考えるのではなく、**ゲーム画面全体で見たときにどう機能するか**を考えてください。

## 画面構成の考え方

**例: 「錠前を回して開ける」ゲーム**
画面に必要な要素:
- 中央: 錠前本体（鍵穴が見える、プレイヤーが回転操作する対象）
- 錠前の上: 鍵穴マーク（正解の位置を示す目印）
- 背景: 古びた扉や宝箱（テーマを伝える）
→ これらが**一枚の絵として成立**するようにデザイン

**例: 「金魚をすくう」ゲーム**
画面に必要な要素:
- 下部: 水面（金魚が泳ぐ領域）
- 水中: 金魚たち（すくう対象）
- プレイヤー手元: ポイ（操作するツール）
- 背景: 屋台の雰囲気
→ 縁日の金魚すくいの**一場面**として成立

## アセット設計の原則

### 1. 役割と配置を同時に考える
各アセットが画面のどこに配置され、何のために存在するかを明確に:
- 「このアセットはプレイヤーの操作対象？それとも背景の一部？」
- 「画面のどのあたりに配置される？」
- 「他のアセットとの位置関係は？」

### 2. 視覚的階層を意識する
- **前景（操作対象）**: 目立つ色、大きめ、輪郭明確
- **中景（環境要素）**: 操作対象を邪魔しない
- **背景**: 雰囲気を伝えるが主張しすぎない

### 3. 統一感のある見た目
同じ画面に出るアセットは統一されたスタイルで:
- 色味（暖色系で統一、寒色系で統一など）
- 線の太さ・質感
- デフォルメの度合い

## コンセプト固有のアセット
汎用的なアセットではなく、このゲーム固有のアセットを作ります。
- ✅ 正しい: lock_body, keyhole, key（錠前ゲーム用）
- ❌ 間違い: target_1, circle_1（汎用すぎる）

# 重要な原則

## 1. 体験に必要なアセットを逆算する
コアループとフィードバック仕様から「何が必要か」を導出：
- 操作対象 → **テーマに合った**視覚的に識別可能なオブジェクト
- フィードバック → 視覚エフェクト + 効果音
- 状態変化 → 状態別の見た目

## 2. 必須フィードバックを強制
以下は必ずアセットを用意：
- タップ反応（押せた感）
- 成功演出（達成感）
- 失敗演出（終了の明示）
- 主要アクションごとの音

## 3. 状態の網羅
オブジェクトが取りうる状態をすべて列挙：
- 通常状態
- 操作中/選択中
- 変化後（消滅、獲得、被弾など）

## 4. visualDescriptionを具体的に
画像生成AIへの指示になるため、詳細に記述:
- 色、形、サイズ感、向き、表情
- テーマに合ったスタイル（和風、ポップ、リアルなど）
- 例: 「オレンジ色の金魚、目が大きく愛らしい表情、横向き、ヒレがひらひら」

## 5. アセットポリシーの明確化
生成時の制約を明示：
- 画像フォーマット（SVG推奨、PNG許可など）
- サイズ制約
- 透過背景の要否
- スタイルガイド（テーマに合ったスタイルを記述）

# ゲームコンセプト
{{CONCEPT}}

# ゲームデザイン
{{DESIGN}}

# 出力形式
以下のJSON構造のみを出力。説明コメントは含めないでください。

{
  "screenComposition": {
    "layout": "画面レイアウトの説明（例：中央に錠前、上部に鍵穴マーク、背景に宝箱）",
    "focalPoint": "視線の中心（例：錠前の鍵穴部分）",
    "visualHierarchy": ["操作対象（最前面）", "UI要素", "環境要素", "背景"],
    "colorScheme": "色の統一感（例：ゴールドと茶色のアンティーク調）",
    "overallMood": "全体の雰囲気（例：神秘的で少し緊張感のある宝探し）"
  },
  "objects": [
    {
      "id": "door_1",
      "name": "次元の扉1",
      "role": "target",
      "states": [
        { "name": "normal", "description": "通常状態の見た目", "isDefault": true },
        { "name": "active", "description": "光っている状態", "isDefault": false }
      ],
      "hitboxType": "rect",
      "touchable": true,
      "zPriority": "foreground",
      "sizeHint": "medium",
      "visualDescription": "紫色に輝く異次元への扉、中央に渦巻き模様"
    }
  ],
  "background": {
    "type": "image",
    "description": "背景の説明",
    "mood": "雰囲気",
    "scrollable": false
  },
  "audio": {
    "sounds": [
      { "id": "se_tap", "trigger": "タップ時", "type": "tap", "priority": "required" },
      { "id": "se_success", "trigger": "成功時", "type": "success", "priority": "required" },
      { "id": "se_failure", "trigger": "失敗時", "type": "failure", "priority": "required" }
    ],
    "bgm": {
      "id": "bgm_main",
      "description": "BGMの説明",
      "mood": "mysterious",
      "loopable": true
    }
  },
  "effects": [
    {
      "id": "effect_success",
      "trigger": "success",
      "type": "particle",
      "description": "演出の説明",
      "duration": 1.0
    }
  ],
  "assetPolicy": {
    "imageFormat": "png",
    "maxImageSize": { "width": 512, "height": 512 },
    "requireTransparency": true,
    "styleGuide": "スタイルの説明（例：フラットデザイン、丸みを帯びた形状）"
  },
  "totalAssetCount": 10,
  "planDecisions": [
    {
      "category": "object",
      "decision": "何を決めたか",
      "reasoning": "なぜ"
    }
  ]
}

注意: role は target/obstacle/collectible/ui/effect/decoration/indicator から選択
注意: hitboxType は rect/circle/pixel/none から選択
注意: zPriority は background/default/foreground/overlay から選択
注意: sizeHint は small/medium/large から選択
注意: type(effect) は particle/overlay/flash/shake/scale から選択
注意: mood(bgm) は upbeat/calm/tense/happy/mysterious/energetic から選択

## サウンドアセットの重要なルール ★★★

### 1. 必須サウンド（削除禁止）
以下の3つは必ず含める:
- se_tap: タップ時の効果音 (type: "tap")
- se_success: 成功時の効果音 (type: "success")
- se_failure: 失敗時の効果音 (type: "failure")

### 2. サウンドタイプの制限
sound.type は以下のみ使用可能:
✅ 有効: tap, success, failure, collect, hit, pop, whoosh, bounce, ding, buzz, countdown, warning
❌ 無効: indicator, voice, ambient など（エラーになります）

### 3. サウンドIDの命名規則
- se_xxx: 効果音（例: se_tap, se_collect）
- bgm_xxx: BGM（例: bgm_main）
- この命名規則を守らないとLogicOutputで正しく生成されません

### 4. 追加サウンドを定義したら必ず使う
ここで定義したサウンドはSpecificationGeneratorで参照されます。
使わないサウンドは定義しないでください。`;

export interface AssetPlannerConfig {
  model?: string;
  dryRun?: boolean;
  apiKey?: string;
}

export class AssetPlanner {
  private client: Anthropic;
  private config: Required<Omit<AssetPlannerConfig, 'apiKey'>>;
  private logger?: GenerationLogger;
  private tokensUsed: number = 0;

  constructor(config?: AssetPlannerConfig, logger?: GenerationLogger) {
    this.client = new Anthropic({
      apiKey: config?.apiKey || process.env.ANTHROPIC_API_KEY
    });
    this.config = {
      model: config?.model || 'claude-sonnet-4-20250514',
      dryRun: config?.dryRun || false
    };
    this.logger = logger;
  }

  /**
   * アセットプランを生成
   */
  async plan(concept: GameConcept, design: GameDesign): Promise<EnhancedAssetPlan> {
    this.logger?.logInput('AssetPlanner', 'inputs', {
      conceptTitle: concept.title,
      designObjectCount: design.objects.length,
      designInteractionCount: design.interactions.length
    });

    if (this.config.dryRun) {
      return this.generateMockPlan(concept, design);
    }

    const prompt = ASSET_PLAN_PROMPT
      .replace('{{CONCEPT}}', JSON.stringify(concept, null, 2))
      .replace('{{DESIGN}}', JSON.stringify(design, null, 2));

    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    });

    this.tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const plan = this.extractAndParseJSON(content.text);

    // 必須アセットの検証
    this.validateRequiredAssets(plan);

    // ログに記録
    this.logger?.log('AssetPlanner', 'output', 'Asset plan generated', {
      objectCount: plan.objects.length,
      soundCount: plan.audio.sounds.length,
      effectCount: plan.effects.length,
      policy: plan.assetPolicy.imageFormat,
      decisions: plan.planDecisions.map(d => `[${d.category}] ${d.decision}`)
    });

    return plan;
  }

  /**
   * 必須アセットの検証
   */
  private validateRequiredAssets(plan: EnhancedAssetPlan): void {
    const errors: string[] = [];

    // 必須SE確認
    const requiredSounds = ['se_tap', 'se_success', 'se_failure'];
    for (const soundId of requiredSounds) {
      if (!plan.audio.sounds.some(s => s.id === soundId)) {
        errors.push(`Missing required sound: ${soundId}`);
      }
    }

    // 必須エフェクト確認
    const requiredEffects = ['success', 'failure'];
    for (const trigger of requiredEffects) {
      if (!plan.effects.some(e => e.trigger === trigger)) {
        // 警告として追加（エラーではない）
        this.logger?.log('AssetPlanner', 'validation', `Warning: No effect for ${trigger}`, {});
      }
    }

    // touchableオブジェクトが1つ以上あるか
    const touchableObjects = plan.objects.filter(o => o.touchable);
    if (touchableObjects.length === 0) {
      errors.push('No touchable objects defined');
    }

    if (errors.length > 0) {
      this.logger?.logError('AssetPlanner', `Validation errors: ${errors.join(', ')}`);
      // エラーがあっても続行（警告として扱う）
    }
  }

  /**
   * モックプラン生成（ドライラン用）
   */
  private generateMockPlan(concept: GameConcept, design: GameDesign): EnhancedAssetPlan {
    const objects: ObjectAssetPlan[] = design.objects.map(obj => ({
      id: obj.id,
      name: obj.name,
      role: this.mapRoleToAssetRole(obj.role),
      states: [
        { name: 'normal', description: obj.appearance, isDefault: true },
        ...(obj.role === 'target' ? [
          { name: 'hit', description: `${obj.appearance}（タップ時）`, isDefault: false }
        ] : [])
      ],
      hitboxType: 'rect' as const,
      touchable: obj.role === 'target' || obj.role === 'collectible',
      zPriority: 'default' as const,
      sizeHint: 'medium' as const,
      visualDescription: obj.appearance
    }));

    return {
      screenComposition: {
        layout: `${concept.theme}をテーマにした画面構成`,
        focalPoint: objects[0]?.name || 'メインオブジェクト',
        visualHierarchy: ['操作対象', 'UI要素', '背景'],
        colorScheme: `${concept.visualStyle}に合った配色`,
        overallMood: concept.visualStyle
      },
      objects,
      background: {
        type: 'image',
        description: `${concept.theme}をテーマにした背景`,
        mood: concept.visualStyle,
        scrollable: false
      },
      audio: {
        sounds: [
          { id: 'se_tap', trigger: 'タップ時', type: 'tap', priority: 'required' },
          { id: 'se_success', trigger: '成功時', type: 'success', priority: 'required' },
          { id: 'se_failure', trigger: '失敗時', type: 'failure', priority: 'required' },
          { id: 'se_collect', trigger: 'アイテム取得時', type: 'collect', priority: 'optional' }
        ],
        bgm: {
          id: 'bgm_main',
          description: `${concept.theme}に合った${concept.visualStyle}なBGM`,
          mood: 'upbeat',
          loopable: true
        }
      },
      effects: [
        { id: 'effect_success', trigger: 'success', type: 'particle', description: '成功時のパーティクル', duration: 1.5 },
        { id: 'effect_failure', trigger: 'failure', type: 'shake', description: '失敗時の画面揺れ', duration: 0.5 },
        { id: 'effect_collect', trigger: 'collect', type: 'scale', description: '獲得時の拡大縮小', duration: 0.2 }
      ],
      assetPolicy: {
        imageFormat: 'svg',
        maxImageSize: { width: 512, height: 512 },
        requireTransparency: true,
        styleGuide: 'フラットデザイン、丸みを帯びた形状、明るい色使い'
      },
      totalAssetCount: objects.length + 4 + 3 + 1, // objects + sounds + effects + background
      planDecisions: [
        { category: 'object', decision: `${objects.length}個のオブジェクトを定義`, reasoning: 'デザインの要件に基づく' },
        { category: 'audio', decision: '必須SE3つ + オプションSE1つ', reasoning: '最低限のフィードバック確保' },
        { category: 'policy', decision: 'SVG形式を採用', reasoning: 'スケーラブルで軽量' }
      ]
    };
  }

  /**
   * デザインの役割をアセット役割にマッピング
   */
  private mapRoleToAssetRole(role: string): ObjectAssetPlan['role'] {
    const mapping: Record<string, ObjectAssetPlan['role']> = {
      'target': 'target',
      'obstacle': 'obstacle',
      'collectible': 'collectible',
      'tool': 'target',
      'decoration': 'decoration',
      'timer': 'indicator',
      'indicator': 'indicator'
    };
    return mapping[role] || 'decoration';
  }

  /**
   * JSONを抽出してパース
   */
  private extractAndParseJSON(text: string): EnhancedAssetPlan {
    let jsonStr = text;

    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    } else {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
    }

    if (!jsonStr || !jsonStr.startsWith('{')) {
      throw new Error('No JSON found in response');
    }

    try {
      return JSON.parse(jsonStr) as EnhancedAssetPlan;
    } catch (error) {
      let repaired = jsonStr;
      repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
      repaired = repaired.replace(/\/\/[^\n]*/g, '');

      try {
        return JSON.parse(repaired) as EnhancedAssetPlan;
      } catch {
        this.logger?.logError('AssetPlanner', `JSON parse failed: ${error}`);
        throw new Error(`JSON parse failed: ${error}`);
      }
    }
  }

  getTokensUsed(): number {
    return this.tokensUsed;
  }

  getDebugInfo(): object {
    return {
      config: this.config,
      tokensUsed: this.tokensUsed
    };
  }
}

export default AssetPlanner;
