/**
 * Step 2: GameDesignGenerator
 *
 * コンセプトからゲームデザインを生成
 * エディター仕様を意識せず、純粋なゲームデザインとして設計
 *
 * 入力: GameConcept（何をするゲームか）
 * 出力: GameDesign（どう遊ぶか、何が起きるか）
 */

import { ILLMProvider, createLLMProvider, LLMProviderType, DEFAULT_MODELS } from './llm';
import { GameConcept } from './types';
import { GenerationLogger } from './GenerationLogger';

/**
 * ゲームデザイン（純粋なゲーム設計）
 */
export interface GameDesign {
  // ★ 核心体験（このゲームが面白い理由の本質）
  coreExperience: {
    whatFeelsGood: string;      // 何が気持ちいいか
    whyItsFun: string;          // なぜ楽しいか
    keyMechanic: string;        // それを実現する核心メカニクス
  };

  // コアループ
  coreLoop: {
    description: string;  // プレイヤーが繰り返す基本行動
    duration: string;     // 1サイクルの時間感覚
  };

  // ゲーム内オブジェクト
  objects: GameDesignObject[];

  // インタラクション定義
  interactions: Interaction[];

  // 勝敗条件
  winCondition: {
    description: string;
    requirement: string;  // 具体的な達成条件
  };
  loseCondition: {
    description: string;
    trigger: string;      // 何が起きたら負けか
  };

  // 難易度調整
  difficultyFactors: string[];

  // 設計判断の記録
  designDecisions: DesignDecision[];
}

export interface GameDesignObject {
  id: string;
  name: string;
  role: 'target' | 'obstacle' | 'collectible' | 'tool' | 'decoration' | 'timer' | 'indicator';
  appearance: string;    // 見た目の説明
  behavior: string;      // どう動くか/反応するか
  importance: 'essential' | 'optional';
}

export interface Interaction {
  trigger: string;       // 何がきっかけか（自然言語）
  action: string;        // 何が起きるか（自然言語）
  feedback: string;      // プレイヤーへのフィードバック
  purpose: string;       // ゲーム的意味
}

export interface DesignDecision {
  question: string;      // 何を決めたか
  decision: string;      // どう決めたか
  reasoning: string;     // なぜそう決めたか
}

const DESIGN_PROMPT = `あなたはモバイルミニゲームのゲームデザイナーです。
与えられたゲームコンセプトを、プレイアブルなゲームデザインに展開してください。

# ★★★ 最重要: 「核心体験」を抽出し実現する ★★★

コンセプトの「言葉」ではなく「意図している体験」を理解してください。

## 核心体験とは？
プレイヤーが「おお！」と思う瞬間、そのゲームが面白い理由の本質です。

例:
- 「錠前を回転させて止める」
  - ❌ 表層解釈: 錠前の画像が回転する
  - ✅ 核心体験: 鍵穴に合わせてカチッと開く快感、正しい位置でピタッと止める緊張感

- 「金魚をすくう」
  - ❌ 表層解釈: 金魚をタップして消す
  - ✅ 核心体験: ポイで金魚をすくい上げる動作、破れそうなハラハラ感

- 「星座を見つける」
  - ❌ 表層解釈: 星をタップする
  - ✅ 核心体験: 夜空の星々から星座の形を見出す発見の喜び

## 核心体験の抽出方法
1. このゲームで「気持ちいい瞬間」は何か？
2. なぜそれが楽しいのか？（緊張→解放、発見、達成感など）
3. その体験を実現するために必要な「操作」と「フィードバック」は何か？

## 設計への反映
核心体験を実現するために:
- **操作**: その体験を引き出す最適な操作方法（回転なら回転操作、すくうならドラッグ）
- **視覚**: 体験を強化する見た目（錠前なら鍵穴の位置が見える、合うと光る）
- **フィードバック**: 成功時の快感を最大化（カチッという音、ハマる視覚効果）

# 重要な制約
- 5-10秒で完結するミニゲーム（WarioWare形式）
- タッチ操作のみ（タップ、スワイプ、ドラッグ）
- シンプルで直感的なルール

# テンプレート回避 ⚠️
コンセプトがテンプレート的な場合でも、以下のパターンに落とし込まないでください:
- ❌ 「複数のターゲットを順番にタップして消す」
- ❌ 「光った順番を覚えて同じ順番で押す」
- ❌ 「ランダムに出現するものをモグラ叩き式にタップ」

代わりに、コンセプトの**テーマ固有の楽しさ**を引き出してください。

# あなたの役割
コンセプトを「どう遊ぶか」「何が起きるか」の具体的な設計に変換します。
技術的な実装は考えず、純粋にゲームとして面白いかを考えてください。

# 設計のポイント

## 1. コアループを明確に
**コンセプトの playerOperation に基づいて**、プレイヤーが繰り返す基本行動を設計
- 1回のアクションは0.5-2秒程度
- コンセプトで指定された操作を忠実に再現

## 2. オブジェクトの役割を定義
**コンセプトに登場する要素**を全てオブジェクトとして定義:
- target: プレイヤーが操作する対象（コンセプトで操作対象になっているもの）
- obstacle: 避けるべきもの（コンセプトで障害として言及されているもの）
- collectible: 集めるもの（コンセプトで収集対象になっているもの）
- tool: 使うもの
- decoration: 雰囲気作り（テーマを表現するための装飾）
- timer/indicator: 状態表示

## 3. インタラクションを設計
**コンセプトの成功/失敗条件を実現するために必要な**インタラクションを設計
- 因果関係を明確に
- プレイヤーへのフィードバックを含める

## 4. 勝敗条件を具体化
**コンセプトの successCondition/failureCondition をそのまま使う**
- 勝手に条件を変えない
- 数値もコンセプトに従う

## 5. 設計判断を記録
重要な設計判断とその理由を記録してください。
「コンセプトのどの部分をどう実現したか」を明記。

# ゲームコンセプト（★これを忠実に実現★）
{{CONCEPT}}

# 出力形式
以下のJSON構造のみを出力。説明文は不要。

{
  "coreExperience": {
    "whatFeelsGood": "このゲームで気持ちいい瞬間（例：鍵穴にピタッとハマる瞬間）",
    "whyItsFun": "なぜそれが楽しいか（例：緊張からの解放、達成感）",
    "keyMechanic": "その体験を実現する核心メカニクス（例：回転操作で位置を合わせる）"
  },
  "coreLoop": {
    "description": "プレイヤーの基本行動",
    "duration": "1アクションあたりの時間感覚"
  },
  "objects": [
    {
      "id": "object_1",
      "name": "表示名",
      "role": "target/obstacle/collectible/tool/decoration/timer/indicator",
      "appearance": "見た目の説明",
      "behavior": "動き方・反応",
      "importance": "essential/optional"
    }
  ],
  "interactions": [
    {
      "trigger": "何がきっかけか",
      "action": "何が起きるか",
      "feedback": "プレイヤーへのフィードバック",
      "purpose": "ゲーム的意味"
    }
  ],
  "winCondition": {
    "description": "勝利条件の説明",
    "requirement": "具体的な達成条件（数値含む）"
  },
  "loseCondition": {
    "description": "敗北条件の説明",
    "trigger": "何が起きたら負けか"
  },
  "difficultyFactors": ["難易度に影響する要素"],
  "designDecisions": [
    {
      "question": "何を決める必要があったか",
      "decision": "どう決めたか",
      "reasoning": "なぜそう決めたか"
    }
  ]
}`;

export interface GameDesignGeneratorConfig {
  model?: string;
  dryRun?: boolean;
  apiKey?: string;
  llmProvider?: LLMProviderType;
}

export class GameDesignGenerator {
  private llmProvider: ILLMProvider;
  private config: Required<Omit<GameDesignGeneratorConfig, 'apiKey' | 'llmProvider'>>;
  private logger?: GenerationLogger;
  private tokensUsed: number = 0;

  constructor(config?: GameDesignGeneratorConfig, logger?: GenerationLogger) {
    const providerType = config?.llmProvider || (process.env.LLM_PROVIDER as LLMProviderType) || 'anthropic';
    const defaultModel = providerType === 'openai' ? DEFAULT_MODELS.openai : DEFAULT_MODELS.anthropic;

    this.llmProvider = createLLMProvider({
      provider: providerType,
      apiKey: config?.apiKey,
      model: config?.model || defaultModel
    });
    this.config = {
      model: config?.model || defaultModel,
      dryRun: config?.dryRun || false
    };
    this.logger = logger;
  }

  /**
   * コンセプトからゲームデザインを生成
   */
  async generate(concept: GameConcept): Promise<GameDesign> {
    this.logger?.logInput('GameDesignGenerator', 'concept', {
      title: concept.title,
      playerGoal: concept.playerGoal,
      playerOperation: concept.playerOperation
    });

    if (this.config.dryRun) {
      return this.generateMockDesign(concept);
    }

    const prompt = DESIGN_PROMPT.replace('{{CONCEPT}}', JSON.stringify(concept, null, 2));

    const response = await this.llmProvider.chat(
      [{ role: 'user', content: prompt }],
      { maxTokens: 4096, model: this.config.model }
    );

    this.tokensUsed = (response.usage?.inputTokens || 0) + (response.usage?.outputTokens || 0);

    const design = this.extractAndParseJSON(response.content);

    // ログに記録
    this.logger?.logGameDesignGeneration({
      coreLoop: design.coreLoop.description,
      mechanics: design.interactions.map(i => i.action),
      objectRoles: design.objects.map(o => ({ id: o.id, role: o.role })),
      decisions: design.designDecisions.map(d => `${d.question}: ${d.decision}`)
    });

    return design;
  }

  /**
   * モックデザイン生成（ドライラン用）
   */
  private generateMockDesign(concept: GameConcept): GameDesign {
    return {
      coreExperience: {
        whatFeelsGood: `${concept.playerGoal}を達成する瞬間`,
        whyItsFun: '目標達成の達成感',
        keyMechanic: concept.playerOperation
      },
      coreLoop: {
        description: `${concept.playerOperation}を繰り返す`,
        duration: '0.5-1秒/アクション'
      },
      objects: [
        {
          id: 'target_1',
          name: 'ターゲット',
          role: 'target',
          appearance: '丸いアイコン',
          behavior: '画面に静止している',
          importance: 'essential'
        },
        {
          id: 'target_2',
          name: 'ターゲット2',
          role: 'target',
          appearance: '丸いアイコン',
          behavior: '画面に静止している',
          importance: 'essential'
        },
        {
          id: 'target_3',
          name: 'ターゲット3',
          role: 'target',
          appearance: '丸いアイコン',
          behavior: '画面に静止している',
          importance: 'essential'
        }
      ],
      interactions: [
        {
          trigger: 'ターゲットをタップ',
          action: 'ターゲットが消える',
          feedback: 'エフェクトと効果音',
          purpose: '進捗を進める'
        }
      ],
      winCondition: {
        description: concept.successCondition,
        requirement: '全てのターゲットを消す'
      },
      loseCondition: {
        description: concept.failureCondition,
        trigger: '時間切れ'
      },
      difficultyFactors: ['ターゲットの数', '時間制限'],
      designDecisions: [
        {
          question: 'オブジェクトの数',
          decision: '3個',
          reasoning: '短時間で達成可能な数'
        }
      ]
    };
  }

  /**
   * JSONを抽出してパース
   */
  private extractAndParseJSON(text: string): GameDesign {
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
      return JSON.parse(jsonStr) as GameDesign;
    } catch (error) {
      // 修復を試みる
      let repaired = jsonStr;
      repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
      repaired = repaired.replace(/\/\/[^\n]*/g, '');

      try {
        return JSON.parse(repaired) as GameDesign;
      } catch {
        this.logger?.logError('GameDesignGenerator', `JSON parse failed: ${error}`);
        throw new Error(`JSON parse failed: ${error}`);
      }
    }
  }

  /**
   * トークン使用量を取得
   */
  getTokensUsed(): number {
    return this.tokensUsed;
  }

  /**
   * デバッグ情報
   */
  getDebugInfo(): object {
    return {
      config: this.config,
      tokensUsed: this.tokensUsed
    };
  }
}

export default GameDesignGenerator;
