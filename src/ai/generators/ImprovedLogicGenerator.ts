/**
 * ImprovedLogicGenerator
 *
 * 改善されたゲームロジック生成システム
 * - エンジン仕様に準拠した正確なJSON生成
 * - 検証済みパターンの活用
 * - GameIdeaとの統合
 * - コスト最適化（Haiku使用オプション）
 */

import Anthropic from '@anthropic-ai/sdk';
import { GameProject, createDefaultGameProject } from '../../types/editor/GameProject';
import { GameScript, GameRule, TriggerCondition, GameAction } from '../../types/editor/GameScript';
import { GameIdea, GameMechanic } from './GameIdeaGenerator';

// 生成結果
export interface LogicGenerationResult {
  project: GameProject;
  tokensUsed: number;
  generationTime: number;
  warnings: string[];
}

// アセットID情報
export interface AssetReferences {
  backgroundId?: string;
  objectIds: string[];
  textIds: string[];
  bgmId?: string;
  seIds: string[];
}

// 設定
export interface ImprovedLogicGeneratorConfig {
  model?: 'claude-sonnet-4-20250514' | 'claude-3-5-haiku-latest';
  maxRetries?: number;
  temperature?: number;
  dryRun?: boolean;
}

/**
 * ImprovedLogicGenerator
 */
export class ImprovedLogicGenerator {
  private anthropic?: Anthropic;
  private config: Required<ImprovedLogicGeneratorConfig>;

  constructor(config?: ImprovedLogicGeneratorConfig) {
    this.config = {
      model: config?.model || 'claude-3-5-haiku-latest', // コスト最適化
      maxRetries: config?.maxRetries || 2,
      temperature: config?.temperature || 0.7,
      dryRun: config?.dryRun || false
    };

    // ドライランモードではAPIクライアントを初期化しない
    if (!this.config.dryRun) {
      this.anthropic = new Anthropic();
    }

    console.log(`🧠 ImprovedLogicGenerator initialized with ${this.config.model}${this.config.dryRun ? ' (dry run)' : ''}`);
  }

  /**
   * GameIdeaからGameProjectを生成
   */
  async generateFromIdea(
    idea: GameIdea,
    assets: AssetReferences
  ): Promise<LogicGenerationResult> {
    const startTime = Date.now();

    console.log(`🎮 Generating logic for: ${idea.title}`);

    // ドライランモードの場合はモックデータを返す
    if (this.config.dryRun) {
      return this.generateMockResult(idea, assets, startTime);
    }

    const warnings: string[] = [];
    let tokensUsed = 0;

    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < this.config.maxRetries) {
      try {
        if (!this.anthropic) {
          throw new Error('Anthropic client not initialized');
        }

        // プロンプト構築
        const systemPrompt = this.buildSystemPrompt();
        const userPrompt = this.buildUserPrompt(idea, assets);

        // Claude API呼び出し
        const response = await this.anthropic.messages.create({
          model: this.config.model,
          max_tokens: 6000,
          temperature: this.config.temperature,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }]
        });

        tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

        const responseText = response.content[0].type === 'text'
          ? response.content[0].text
          : '';

        // パースと検証
        const gameScript = this.parseGameScript(responseText);
        const validationResult = this.validateGameScript(gameScript, assets);

        if (!validationResult.valid) {
          warnings.push(...validationResult.warnings);
          if (validationResult.errors.length > 0) {
            throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
          }
        }

        // GameProjectの構築
        const project = this.buildGameProject(idea, gameScript, assets);

        const generationTime = Date.now() - startTime;
        console.log(`✅ Logic generated in ${generationTime}ms (${tokensUsed} tokens)`);

        return {
          project,
          tokensUsed,
          generationTime,
          warnings
        };

      } catch (error) {
        lastError = error as Error;
        console.warn(`Logic generation attempt ${attempts + 1} failed:`, error);
        attempts++;
      }
    }

    throw new Error(`Failed to generate logic after ${this.config.maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * モック結果生成（ドライランテスト用）
   */
  private generateMockResult(
    idea: GameIdea,
    assets: AssetReferences,
    startTime: number
  ): LogicGenerationResult {
    const now = new Date().toISOString();

    // モックGameScriptを生成（ドライランテスト用の最小限データ）
    const mockScript = {
      layout: {
        background: { visible: true, initialAnimation: 0, animationSpeed: 0, autoStart: false },
        objects: assets.objectIds.map((id, index) => ({
          objectId: id,
          position: { x: 0.2 + (index * 0.2), y: 0.5 },
          scale: { x: 1.0, y: 1.0 },
          rotation: 0,
          zIndex: 10 + index,
          initialState: { visible: true, animation: 0, animationSpeed: 0, autoStart: false }
        })),
        texts: [],
        stage: { backgroundColor: '#87CEEB' }
      },
      counters: [
        { id: 'score', name: 'スコア', initialValue: 0, currentValue: 0, min: 0, max: 999, persistence: 'game', createdAt: now, lastModified: now }
      ],
      flags: [],
      rules: [
        {
          id: 'rule_001',
          name: 'タップで得点',
          targetObjectId: assets.objectIds[0] || 'obj1',
          triggers: {
            operator: 'AND',
            conditions: [
              { type: 'touch', target: 'self', touchType: 'down' }
            ]
          },
          actions: [
            { type: 'effect', targetId: assets.objectIds[0], effect: { type: 'scale', scaleAmount: 1.2, duration: 0.15, intensity: 1.0 } },
            { type: 'hide', targetId: assets.objectIds[0] },
            { type: 'counter', counterName: 'score', operation: 'add', value: 1 },
            { type: 'playSound', soundId: 'se_tap', volume: 0.8 }
          ],
          enabled: true,
          priority: 10,
          createdAt: now,
          lastModified: now
        },
        {
          id: 'rule_002',
          name: 'クリア判定',
          targetObjectId: 'stage',
          triggers: {
            operator: 'AND',
            conditions: [
              { type: 'counter', counterName: 'score', comparison: 'greaterOrEqual', value: 3 }
            ]
          },
          actions: [
            { type: 'success', score: 100, message: 'クリア！' }
          ],
          enabled: true,
          priority: 5,
          createdAt: now,
          lastModified: now
        }
      ],
      successConditions: [],
      version: '1.0.0',
      lastModified: now
    };

    const project = this.buildGameProject(idea, mockScript as unknown as GameScript, assets);
    const generationTime = Date.now() - startTime;

    console.log(`✅ Mock logic generated in ${generationTime}ms`);

    return {
      project,
      tokensUsed: 0,
      generationTime,
      warnings: ['Dry run mode - mock data generated']
    };
  }

  /**
   * システムプロンプト - エンジン仕様を含む
   */
  private buildSystemPrompt(): string {
    return `あなたはSwizzleゲームエンジン専門のロジック生成AIです。
正確なGameScript JSONを生成してください。

# Swizzleエンジン仕様

## 座標系
- 正規化座標: 0.0～1.0
  - x: 0.0=左端, 1.0=右端
  - y: 0.0=上端, 1.0=下端
- 画面サイズ: 1080×1920px（縦画面）
- オブジェクト原点: 左上角

## 速度パラメータ（px/frame, 60FPS）
| 速度感 | speed値 | 用途例 |
|--------|---------|--------|
| 遅い | 1.0-2.0 | 風船上昇、ゆっくり移動 |
| 普通 | 2.0-4.0 | 落下物、キャラ移動 |
| 速い | 4.0-8.0 | 素早い敵、弾丸 |

## 検証済み条件タイプ（これのみ使用可能）
1. touch: タッチ検出
   {type:"touch", target:"self"|"stage"|"<objectId>", touchType:"down"|"up"|"hold"}

2. time: 時間条件
   {type:"time", timeType:"interval", interval:0.1} // 連続移動用
   {type:"time", timeType:"exact", seconds:5} // 特定時間

3. counter: カウンター比較
   {type:"counter", counterName:"count", comparison:"greaterOrEqual"|"equals"|"less", value:3}

4. collision: 衝突判定
   {type:"collision", target:"<objectId>", collisionType:"enter", checkMode:"hitbox"}

5. flag: フラグ状態
   {type:"flag", flagId:"cleared", condition:"ON"|"OFF"}

6. random: ランダム（低優先度）
   {type:"random", probability:0.3, checkInterval:1000}

## 検証済みアクションタイプ（これのみ使用可能）
1. success: ゲームクリア
   {type:"success", score:100, message:"クリア！"}

2. failure: ゲームオーバー
   {type:"failure", message:"失敗..."}

3. hide: 非表示
   {type:"hide", targetId:"object1"}

4. show: 表示
   {type:"show", targetId:"object1"}

5. move: 移動
   {type:"move", targetId:"obj", movement:{type:"straight", target:{x:0.5,y:0.0}, speed:1.5}}
   {type:"move", targetId:"obj", movement:{type:"teleport", target:{x:0.3,y:0.8}}}

6. counter: カウンター操作
   {type:"counter", counterName:"score", operation:"add", value:1}

7. addScore: スコア加算
   {type:"addScore", points:10}

8. effect: エフェクト
   {type:"effect", targetId:"obj", effect:{type:"scale", scaleAmount:1.5, duration:0.15}}

9. playSound: 効果音
   {type:"playSound", soundId:"se_tap", volume:0.8}

10. setFlag: フラグ設定
    {type:"setFlag", flagId:"hit", value:true}

## ルール設計の原則
1. ルール数: 5-10個（シンプルに）
2. 条件数: 1ルールあたり1-2個
3. アクション数: 1ルールあたり2-4個
4. 必須: 成功条件を持つルール、タイムアウト対応

## 出力形式
純粋なJSONのみを出力。説明文は不要。`;
  }

  /**
   * ユーザープロンプト - GameIdeaに基づく
   */
  private buildUserPrompt(idea: GameIdea, assets: AssetReferences): string {
    // メカニクスに応じたパターン提案
    const pattern = this.getPatternForMechanic(idea.mainMechanic);
    // メカニクスに必須の条件/アクション
    const requirements = this.getMechanicRequirements(idea.mainMechanic);

    return `# ゲーム仕様

## 基本情報
タイトル: ${idea.title}
テーマ: ${idea.theme}
メカニクス: ${idea.mainMechanic}
難易度: ${idea.difficulty}
時間: ${idea.duration}秒

## ゲームプレイ
勝利条件: ${idea.winCondition}
敗北条件: ${idea.loseCondition}
説明: ${idea.description}

## 利用可能アセット
オブジェクト: ${assets.objectIds.join(', ')}
効果音: ${assets.seIds.join(', ')}
背景: ${assets.backgroundId || 'なし'}

## 🔴 必須条件・アクション（${idea.mainMechanic}）
このメカニクスでは以下を必ずルール内に含めてください：
${requirements}

## 実装パターン
${pattern}

## その他の必須要件
1. objectId は上記アセットのみ使用可能
2. 座標は0.0-1.0の範囲
3. speedは1.0-8.0の範囲
4. 少なくとも1つのsuccessアクションを含むルール
5. counterで進捗を管理

## 出力
以下の構造でGameScript JSONを出力:

{
  "layout": {
    "background": {"visible":true},
    "objects": [
      {"objectId":"${assets.objectIds[0] || 'obj1'}", "position":{"x":0.5,"y":0.5}, "scale":{"x":1.0,"y":1.0}, "rotation":0, "zIndex":10, "initialState":{"visible":true,"animation":0}}
    ],
    "texts": [],
    "stage": {"backgroundColor":"#87CEEB"}
  },
  "counters": [
    {"id":"score","name":"スコア","initialValue":0,"minValue":0,"maxValue":999}
  ],
  "flags": [],
  "rules": [
    {
      "id": "rule_001",
      "name": "ルール名",
      "targetObjectId": "対象オブジェクトID",
      "triggers": {
        "operator": "AND",
        "conditions": [
          {"type":"touch","target":"self","touchType":"down"}
        ]
      },
      "actions": [
        {"type":"hide","targetId":"obj1"}
      ],
      "enabled": true,
      "priority": 10,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "lastModified": "2025-01-01T00:00:00.000Z"
    }
  ],
  "successConditions": [],
  "version": "1.0.0"
}

⚠️ 重要: rulesの各ルールは必ず triggers.conditions の構造を使用すること。conditionsを直接ルールに置かないこと。`;
  }

  /**
   * メカニクス別のパターン提案
   */
  private getPatternForMechanic(mechanic: GameMechanic): string {
    const patterns: Record<string, string> = {
      'tap-target': `
### タップカウントパターン
オブジェクトをタップして消し、全部消したらクリア

ルール構成:
1. [オブジェクト毎] タップで消去 + カウント
   条件: touch(target:self, touchType:down)
   アクション: effect(scale), hide, counter(add), playSound

2. クリア判定
   条件: counter(score, greaterOrEqual, 目標値)
   アクション: success`,

      'tap-avoid': `
### タップ回避パターン
正しいオブジェクトだけをタップ、間違いはペナルティ

ルール構成:
1. [正解オブジェクト] タップで得点
   条件: touch(target:self, touchType:down)
   アクション: effect(scale), hide, counter(add), playSound

2. [不正解オブジェクト] タップでペナルティ
   条件: touch(target:self, touchType:down)
   アクション: effect(shake), failure`,

      'catch-falling': `
### キャッチパターン
落下物をキャラクターでキャッチ

ルール構成:
1. [落下物] 連続落下
   条件: time(interval:0.1)
   アクション: move(straight, target:{x:現在x,y:0.95}, speed:3.0)

2. [キャラ] 左移動
   条件: touch(target:btn-left, touchType:down)
   アクション: move(teleport, target:{x:0.2,y:0.8})

3. [落下物] キャッチ判定
   条件: collision(target:character, enter)
   アクション: hide, counter(add), addScore, playSound`,

      'dodge-moving': `
### 回避パターン
動く障害物を避けながら生き残る

ルール構成:
1. [障害物] 移動
   条件: time(interval:0.1)
   アクション: move(straight, target:ランダム方向, speed:4.0)

2. [プレイヤー] 衝突でゲームオーバー
   条件: collision(target:obstacle, enter)
   アクション: effect(shake), failure

3. 生き残りクリア
   条件: time(exact, seconds:10)
   アクション: success`,

      'timing-action': `
### タイミングパターン
ぴったりのタイミングでタップ

ルール構成:
1. [ターゲット] 移動
   条件: time(interval:0.1)
   アクション: move(往復)

2. [ターゲット] 成功エリアでタップ
   条件: touch + position(inside success-area)
   アクション: success

3. [ターゲット] 失敗エリアでタップ
   条件: touch + position(outside success-area)
   アクション: failure`
    };

    return patterns[mechanic] || patterns['tap-target'];
  }

  /**
   * メカニクス別の必須要件を取得
   */
  private getMechanicRequirements(mechanic: GameMechanic): string {
    const requirements: Record<string, { conditions: string[]; actions: string[]; description: string }> = {
      'tap-target': {
        conditions: ['touch（タップ検出）'],
        actions: ['hide（消去）', 'success（クリア判定）'],
        description: 'オブジェクトをタップして消すゲーム'
      },
      'tap-avoid': {
        conditions: ['touch（タップ検出）'],
        actions: ['failure（不正解判定）'],
        description: '正しいオブジェクトだけをタップ、間違いはペナルティ'
      },
      'tap-sequence': {
        conditions: ['touch（タップ検出）', 'counter（順番管理）'],
        actions: ['counter（カウント更新）', 'success（クリア判定）'],
        description: '正しい順番でタップするゲーム'
      },
      'tap-rhythm': {
        conditions: ['touch（タップ検出）', 'time（タイミング判定）'],
        actions: ['success（成功判定）', 'failure（失敗判定）'],
        description: 'リズムに合わせてタップするゲーム'
      },
      'swipe-direction': {
        conditions: ['touch（スワイプ検出）'],
        actions: ['move（移動）'],
        description: 'スワイプで方向を操作するゲーム'
      },
      'drag-drop': {
        conditions: ['touch（ドラッグ検出）'],
        actions: ['move（移動）'],
        description: 'ドラッグ&ドロップで配置するゲーム'
      },
      'hold-release': {
        conditions: ['touch（長押し検出）'],
        actions: ['success（成功判定）'],
        description: '長押しして離すタイミングを競うゲーム'
      },
      'catch-falling': {
        conditions: ['time（落下制御）', 'collision（衝突判定）'],
        actions: ['move（落下移動）', 'hide（キャッチ時消去）'],
        description: '落下物をキャッチするゲーム'
      },
      'dodge-moving': {
        conditions: ['time（移動制御）', 'collision（衝突判定）'],
        actions: ['move（障害物移動）', 'failure（衝突時失敗）'],
        description: '動く障害物を避けるゲーム'
      },
      'match-pattern': {
        conditions: ['touch（選択検出）'],
        actions: ['success（正解判定）', 'failure（不正解判定）'],
        description: 'パターンをマッチさせるゲーム'
      },
      'count-objects': {
        conditions: ['touch（回答選択）'],
        actions: ['success（正解判定）', 'failure（不正解判定）'],
        description: 'オブジェクトを数えて答えるゲーム'
      },
      'find-different': {
        conditions: ['touch（選択検出）'],
        actions: ['success（正解判定）', 'failure（不正解判定）'],
        description: '仲間はずれを探すゲーム'
      },
      'memory-match': {
        conditions: ['touch（選択検出）', 'flag（記憶状態管理）'],
        actions: ['show（表示）', 'hide（非表示）', 'success（クリア判定）'],
        description: '記憶マッチングゲーム'
      },
      'timing-action': {
        conditions: ['touch（タイミング検出）', 'time（移動制御）'],
        actions: ['success（成功判定）', 'failure（失敗判定）'],
        description: 'タイミングを合わせてアクションするゲーム'
      },
      'chase-target': {
        conditions: ['time（移動制御）', 'collision（接触判定）'],
        actions: ['move（追跡移動）', 'success（捕獲成功）'],
        description: 'ターゲットを追いかけるゲーム'
      },
      'collect-items': {
        conditions: ['touch（収集検出）', 'counter（収集カウント）'],
        actions: ['hide（収集時消去）', 'counter（カウント更新）', 'success（全収集でクリア）'],
        description: 'アイテムを集めるゲーム'
      },
      'protect-target': {
        conditions: ['collision（衝突判定）'],
        actions: ['failure（ターゲット被弾時失敗）', 'success（生存でクリア）'],
        description: 'ターゲットを守るゲーム'
      },
      'balance-game': {
        conditions: ['touch（バランス調整）', 'time（継続判定）'],
        actions: ['move（バランス移動）', 'success（維持成功）', 'failure（バランス崩壊）'],
        description: 'バランスを保つゲーム'
      },
      'reaction-test': {
        conditions: ['touch（反応検出）', 'time（タイミング制御）'],
        actions: ['success（素早い反応で成功）', 'failure（遅い反応で失敗）'],
        description: '反射神経を試すゲーム'
      }
    };

    const req = requirements[mechanic] || requirements['tap-target'];

    return `**必須条件（triggers.conditions）:**
${req.conditions.map(c => `- ${c}`).join('\n')}

**必須アクション（actions）:**
${req.actions.map(a => `- ${a}`).join('\n')}

※これらが1つでも欠けると不合格になります。`;
  }

  /**
   * レスポンスからGameScriptをパース
   */
  private parseGameScript(responseText: string): GameScript {
    // JSONブロックを抽出
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const gameScript = JSON.parse(jsonMatch[0]) as GameScript;
    const now = new Date().toISOString();

    // 日時フィールドを自動設定
    if (!gameScript.lastModified) {
      gameScript.lastModified = now;
    }

    if (gameScript.rules) {
      gameScript.rules.forEach((rule: any, index) => {
        if (!rule.id) rule.id = `rule_${String(index + 1).padStart(3, '0')}`;
        if (!rule.createdAt) rule.createdAt = now;
        if (!rule.lastModified) rule.lastModified = now;
        if (rule.enabled === undefined) rule.enabled = true;
        if (!rule.priority) rule.priority = 10;

        // 🔧 ルール構造の自動修正: conditions → triggers.conditions
        if (rule.conditions && !rule.triggers) {
          console.warn(`   ⚠️ ルール構造を修正: ${rule.id} (conditions → triggers.conditions)`);
          rule.triggers = {
            operator: 'AND',
            conditions: rule.conditions
          };
          delete rule.conditions;
        }

        // triggers.operatorがない場合は追加
        if (rule.triggers && !rule.triggers.operator) {
          rule.triggers.operator = 'AND';
        }

        // targetObjectIdがない場合はデフォルト設定
        if (!rule.targetObjectId) {
          rule.targetObjectId = 'stage';
        }

        // nameがない場合はidを使用
        if (!rule.name) {
          rule.name = rule.id;
        }
      });
    }

    if (gameScript.flags) {
      gameScript.flags.forEach(flag => {
        if (!flag.createdAt) flag.createdAt = now;
      });
    }

    return gameScript;
  }

  /**
   * GameScriptを検証
   */
  private validateGameScript(
    gameScript: GameScript,
    assets: AssetReferences
  ): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 基本構造チェック
    if (!gameScript.layout) errors.push('Missing layout');
    if (!gameScript.rules || !Array.isArray(gameScript.rules)) {
      errors.push('Missing or invalid rules array');
    }

    // ルール数チェック
    if (gameScript.rules) {
      if (gameScript.rules.length === 0) {
        errors.push('No rules defined');
      } else if (gameScript.rules.length > 15) {
        warnings.push(`Many rules: ${gameScript.rules.length} (recommended <= 10)`);
      }

      // successアクションの存在確認
      const hasSuccessAction = gameScript.rules.some(rule =>
        rule.actions?.some(action => action.type === 'success')
      );
      if (!hasSuccessAction) {
        errors.push('No success action found in any rule');
      }
    }

    // オブジェクトIDの検証
    const validIds = new Set(['stage', ...assets.objectIds, ...assets.textIds]);

    if (gameScript.layout?.objects) {
      gameScript.layout.objects.forEach((obj, index) => {
        if (!assets.objectIds.includes(obj.objectId)) {
          warnings.push(`Unknown objectId in layout: ${obj.objectId}`);
        }
        // 座標範囲チェック
        if (obj.position) {
          if (obj.position.x < 0 || obj.position.x > 1 ||
              obj.position.y < 0 || obj.position.y > 1) {
            warnings.push(`Position out of range for ${obj.objectId}`);
          }
        }
      });
    }

    // ルール内のターゲット検証
    if (gameScript.rules) {
      gameScript.rules.forEach((rule, index) => {
        if (rule.targetObjectId && !validIds.has(rule.targetObjectId)) {
          warnings.push(`Unknown targetObjectId in rule ${index}: ${rule.targetObjectId}`);
        }

        // 速度値の検証
        rule.actions?.forEach(action => {
          if (action.type === 'move' && action.movement?.speed) {
            if (action.movement.speed < 0.5 || action.movement.speed > 15) {
              warnings.push(`Speed out of recommended range in rule ${index}: ${action.movement.speed}`);
            }
          }
        });
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * GameProjectを構築
   */
  private buildGameProject(
    idea: GameIdea,
    gameScript: GameScript,
    assets: AssetReferences
  ): GameProject {
    const baseProject = createDefaultGameProject(idea.title);

    // durationを有効な値に変換（5, 10, 15, 20, 30のいずれか）
    const validDurations = [5, 10, 15, 20, 30] as const;
    const closestDuration = validDurations.reduce((prev, curr) =>
      Math.abs(curr - idea.duration) < Math.abs(prev - idea.duration) ? curr : prev
    );

    baseProject.settings = {
      ...baseProject.settings,
      name: idea.title,
      description: idea.description,
      duration: {
        type: 'fixed',
        seconds: closestDuration
      },
      difficulty: idea.difficulty,
      publishing: {
        ...baseProject.settings.publishing,
        tags: [idea.theme, idea.mainMechanic, idea.visualStyle],
        category: 'action'
      }
    };

    baseProject.script = gameScript;
    baseProject.lastModified = new Date().toISOString();

    return baseProject;
  }

  /**
   * コスト見積もり
   */
  estimateCost(): { inputCost: number; outputCost: number; total: number } {
    // Haiku: $0.25/1M input, $1.25/1M output
    // Sonnet: $3/1M input, $15/1M output
    const isHaiku = this.config.model.includes('haiku');
    const estimatedInputTokens = 2500;
    const estimatedOutputTokens = 3000;

    if (isHaiku) {
      return {
        inputCost: estimatedInputTokens * 0.25 / 1000000,
        outputCost: estimatedOutputTokens * 1.25 / 1000000,
        total: (estimatedInputTokens * 0.25 + estimatedOutputTokens * 1.25) / 1000000
      };
    } else {
      return {
        inputCost: estimatedInputTokens * 3 / 1000000,
        outputCost: estimatedOutputTokens * 15 / 1000000,
        total: (estimatedInputTokens * 3 + estimatedOutputTokens * 15) / 1000000
      };
    }
  }

  /**
   * デバッグ情報
   */
  getDebugInfo(): object {
    return {
      model: this.config.model,
      maxRetries: this.config.maxRetries,
      temperature: this.config.temperature,
      estimatedCost: this.estimateCost()
    };
  }
}

// デフォルトエクスポート
export default ImprovedLogicGenerator;
