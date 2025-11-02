/**
 * ロジック生成システム - LogicGenerator
 * Phase H: Claude APIでGameProject JSONを完全自動生成
 */

import Anthropic from '@anthropic-ai/sdk';
import { GameProject, createDefaultGameProject } from '../../types/editor/GameProject';
import { GameScript, GameRule, TriggerCondition, GameAction, SuccessCondition } from '../../types/editor/GameScript';
import { GameSpec, GeneratedGame } from '../types/GenerationTypes';

/**
 * LogicGenerator
 * Claude Sonnet 4を使用してゲームロジックを生成
 */
export class LogicGenerator {
  private anthropic: Anthropic;
  private model: string = 'claude-sonnet-4-20250514';
  
  constructor(apiKey: string) {
    this.anthropic = new Anthropic({
      apiKey: apiKey,
    });
  }
  
  /**
   * GameSpecからGameProjectを生成
   */
  async generateGameProject(
    spec: GameSpec,
    assetIds: {
      backgroundId?: string;
      objectIds: string[];
      textIds: string[];
      bgmId?: string;
      seIds: string[];
    }
  ): Promise<GameProject> {
    console.log(`🧠 Generating game logic for: ${spec.concept.name}`);
    
    const startTime = Date.now();
    
    try {
      // 1. ベースプロジェクト作成
      const baseProject = createDefaultGameProject(spec.concept.name);
      
      // 2. Claude APIでゲームスクリプト生成
      const gameScript = await this.generateGameScript(spec, assetIds);
      
      // 3. ゲーム設定を更新
      baseProject.settings = {
        ...baseProject.settings,
        name: spec.concept.name,
        description: this.generateDescription(spec),
        duration: {
          type: 'fixed',
          seconds: spec.concept.duration
        },
        difficulty: spec.concept.difficulty,
        publishing: {
          ...baseProject.settings.publishing,
          tags: spec.metadata.keywords,
          category: spec.concept.genre
        }
      };
      
      // 4. スクリプトを統合
      baseProject.script = gameScript;
      
      // 5. 最終更新
      baseProject.lastModified = new Date().toISOString();
      
      const duration = Date.now() - startTime;
      console.log(`✅ Game logic generated in ${duration}ms`);
      
      return baseProject;
      
    } catch (error) {
      console.error('❌ Failed to generate game logic:', error);
      throw error;
    }
  }
  
  /**
   * GameScriptを生成（Claude API使用）
   */
  private async generateGameScript(
    spec: GameSpec,
    assetIds: {
      backgroundId?: string;
      objectIds: string[];
      textIds: string[];
      bgmId?: string;
      seIds: string[];
    }
  ): Promise<GameScript> {
    // システムプロンプト
    const systemPrompt = this.buildSystemPrompt();
    
    // ユーザープロンプト
    const userPrompt = this.buildUserPrompt(spec, assetIds);
    
    console.log('  📤 Sending request to Claude API...');
    
    // Claude API呼び出し
    const message = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 8000,
      temperature: 0.8, // 創造性を高める
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    });
    
    console.log('  📥 Response received from Claude API');
    
    // レスポンスからJSONを抽出
    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text 
      : '';
    
    const gameScript = this.parseGameScriptFromResponse(responseText);
    
    // 検証
    this.validateGameScript(gameScript, assetIds);
    
    return gameScript;
  }
  
  /**
   * システムプロンプト構築
   */
  private buildSystemPrompt(): string {
    return `あなたは短時間で遊べるシンプルなゲームのロジック生成専門AIです。

# あなたの役割
GameProject形式のJSONを生成し、以下の条件・アクションシステムを使って面白いゲームロジックを作成してください。

# 利用可能な条件タイプ（9種類）
1. touch: タッチ操作（target, touchType: down/up/hold）
2. collision: 衝突判定（target, collisionType: enter/stay/exit）
3. animation: アニメーション状態（target, condition: frame/end/start/loop）
4. time: 時間経過（timeType: exact/range/interval）
5. flag: フラグ状態（flagId, condition: ON/OFF/CHANGED）
6. gameState: ゲーム状態（state: success/failure/playing）
7. position: 位置判定（target, area: inside/outside/crossing）
8. counter: カウンター比較（counterName, comparison, value）
9. random: ランダム条件（probability: 0.0-1.0）

# 利用可能なアクション（13種類）
1. success: ゲームクリア（score?, message?）
2. failure: ゲームオーバー（message?）
3. playSound: 音再生（soundId, volume?）
4. show: 表示（targetId, fadeIn?, duration?）
5. hide: 非表示（targetId, fadeOut?, duration?）
6. switchAnimation: アニメ切替（targetId, animationIndex, speed?）
7. move: 移動（targetId, movement: {type, target?, speed?, duration?}）
8. effect: エフェクト（targetId, effect: {type, duration, intensity}）
9. setFlag: フラグ設定（flagId, value）
10. toggleFlag: フラグ反転（flagId）
11. counter: カウンター操作（operation, counterName, value?）
12. randomAction: ランダムアクション（actions: [...], weights?）
13. addScore: スコア加算（points）

# ゲームロジック設計の原則
1. **シンプル**: ルール数は3-8個、1ルールあたり条件1-3個、アクション1-5個
2. **明確**: プレイヤーが何をすべきか直感的にわかる
3. **フィードバック**: 操作に対して即座に反応（音・エフェクト）
4. **進行感**: 時間経過やカウンターで進行を実感
5. **成功条件**: 明確なクリア条件を設定

# 出力形式
必ずJSON形式で、GameScript型に準拠した構造を出力してください。
JSONの前後に説明文は不要です。純粋なJSONのみを出力してください。`;
  }
  
  /**
   * ユーザープロンプト構築
   */
  private buildUserPrompt(
    spec: GameSpec,
    assetIds: {
      backgroundId?: string;
      objectIds: string[];
      textIds: string[];
      bgmId?: string;
      seIds: string[];
    }
  ): string {
    return `# ゲーム仕様
名前: ${spec.concept.name}
テーマ: ${spec.concept.theme}
ジャンル: ${spec.concept.genre}
メカニクス: ${spec.concept.mechanic}
難易度: ${spec.concept.difficulty}
プレイ時間: ${spec.concept.duration}秒

# ビジュアル
スタイル: ${spec.visual.style}
カラーパレット: ${spec.visual.colorPalette.join(', ')}
オブジェクト数: ${spec.visual.objectCount}

# ゲームプレイ
主要条件: ${spec.gameplay.primaryCondition}
主要アクション: ${spec.gameplay.primaryAction}
複雑度: ${spec.gameplay.complexityLevel}/5
成功条件: ${spec.gameplay.successCriteria}

# 利用可能なアセットID
背景: ${assetIds.backgroundId || 'なし'}
オブジェクト: ${assetIds.objectIds.join(', ')}
テキスト: ${assetIds.textIds.join(', ')}
BGM: ${assetIds.bgmId || 'なし'}
SE: ${assetIds.seIds.join(', ')}

# 指示
上記の仕様に基づいて、GameScript型に準拠したゲームロジックをJSON形式で生成してください。

重要な要件:
1. rules配列: 3-8個のルールを作成
2. 各ルール: targetObjectId（オブジェクトIDまたは'stage'）、triggers（条件）、actions（アクション）
3. successConditions: クリア条件を1-2個設定
4. layout: オブジェクトの初期配置（position: {x: 0-1, y: 0-1}）
5. flags: 必要に応じてカスタムフラグを定義
6. counters: スコアやライフ管理にカウンターを使用

JSON出力例の構造:
{
  "initialState": {
    "layout": { "background": {...}, "objects": [...], "texts": [...] },
    "audio": { "bgm": null, "masterVolume": 0.8, "seVolume": 0.8 },
    "gameState": { "flags": {}, "score": 0, "counters": {} },
    "autoRules": [],
    "metadata": { "version": "1.0.0", "createdAt": "...", "lastModified": "..." }
  },
  "layout": {
    "background": { "visible": true, "initialAnimation": 0, "animationSpeed": 12, "autoStart": false },
    "objects": [
      {
        "objectId": "${assetIds.objectIds[0]}",
        "position": { "x": 0.5, "y": 0.8 },
        "scale": { "x": 1.0, "y": 1.0 },
        "rotation": 0,
        "zIndex": 10,
        "initialState": { "visible": true, "animation": 0, "animationSpeed": 12, "autoStart": false }
      }
    ],
    "texts": [],
    "stage": { "backgroundColor": "#87CEEB" }
  },
  "flags": [],
  "counters": [
    { "id": "score", "name": "スコア", "initialValue": 0, "minValue": 0, "maxValue": 9999 }
  ],
  "rules": [
    {
      "id": "rule_001",
      "name": "タップでジャンプ",
      "enabled": true,
      "priority": 10,
      "targetObjectId": "${assetIds.objectIds[0]}",
      "triggers": {
        "operator": "OR",
        "conditions": [
          { "type": "touch", "target": "stage", "touchType": "down" }
        ]
      },
      "actions": [
        { "type": "playSound", "soundId": "${assetIds.seIds[0] || 'se_001'}", "volume": 0.8 },
        { "type": "move", "targetId": "${assetIds.objectIds[0]}", "movement": { "type": "straight", "speed": 500, "duration": 0.5 } }
      ],
      "createdAt": "...",
      "lastModified": "..."
    }
  ],
  "successConditions": [
    {
      "id": "success_001",
      "name": "スコア目標達成",
      "operator": "AND",
      "conditions": [
        { "type": "counter", "counterName": "score", "counterComparison": "greaterOrEqual", "counterValue": 100 }
      ],
      "successSettings": { "autoEnd": true, "delay": 1, "score": 1000 }
    }
  ],
  "statistics": {
    "totalRules": 1,
    "totalConditions": 1,
    "totalActions": 2,
    "complexityScore": 20,
    "usedTriggerTypes": ["touch"],
    "usedActionTypes": ["playSound", "move"],
    "flagCount": 0,
    "counterCount": 1,
    "usedCounterOperations": [],
    "usedCounterComparisons": ["greaterOrEqual"],
    "randomConditionCount": 0,
    "randomActionCount": 0,
    "totalRandomChoices": 0,
    "averageRandomProbability": 0,
    "estimatedCPUUsage": "low",
    "estimatedMemoryUsage": 5,
    "maxConcurrentEffects": 2,
    "randomEventsPerSecond": 0,
    "randomMemoryUsage": 0
  },
  "version": "1.0.0",
  "lastModified": "..."
}

必ず上記の構造に従って、完全なGameScript JSONを出力してください。`;
  }
  
  /**
   * レスポンスからGameScriptをパース
   */
  private parseGameScriptFromResponse(responseText: string): GameScript {
    try {
      // JSONブロックを探す
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const jsonText = jsonMatch[0];
      const gameScript = JSON.parse(jsonText) as GameScript;
      
      // 日時フィールドを自動生成
      const now = new Date().toISOString();
      
      // initialStateのメタデータ
      if (gameScript.initialState && gameScript.initialState.metadata) {
        gameScript.initialState.metadata.createdAt = now;
        gameScript.initialState.metadata.lastModified = now;
      }
      
      // rulesの日時
      if (gameScript.rules) {
        gameScript.rules.forEach(rule => {
          if (!rule.createdAt) rule.createdAt = now;
          if (!rule.lastModified) rule.lastModified = now;
        });
      }
      
      // flagsの日時
      if (gameScript.flags) {
        gameScript.flags.forEach(flag => {
          if (!flag.createdAt) flag.createdAt = now;
        });
      }
      
      // lastModified
      gameScript.lastModified = now;
      
      return gameScript;
      
    } catch (error) {
      console.error('❌ Failed to parse GameScript from response:', error);
      console.error('Response text:', responseText);
      throw new Error(`Failed to parse GameScript: ${error}`);
    }
  }
  
  /**
   * GameScriptを検証
   */
  private validateGameScript(
    gameScript: GameScript,
    assetIds: {
      backgroundId?: string;
      objectIds: string[];
      textIds: string[];
      bgmId?: string;
      seIds: string[];
    }
  ): void {
    const errors: string[] = [];
    
    // 1. 基本構造チェック
    if (!gameScript.layout) errors.push('Missing layout');
    if (!gameScript.rules) errors.push('Missing rules');
    if (!Array.isArray(gameScript.rules)) errors.push('rules must be array');
    
    // 2. ルール数チェック
    if (gameScript.rules.length === 0) {
      errors.push('No rules defined');
    } else if (gameScript.rules.length > 16) {
      errors.push(`Too many rules: ${gameScript.rules.length} (max 16)`);
    }
    
    // 3. アセットID参照チェック
    if (gameScript.layout && gameScript.layout.objects) {
      gameScript.layout.objects.forEach((obj, index) => {
        if (!assetIds.objectIds.includes(obj.objectId)) {
          errors.push(`Invalid objectId in layout.objects[${index}]: ${obj.objectId}`);
        }
      });
    }
    
    // 4. ルール内のtargetObjectIdチェック
    if (gameScript.rules) {
      gameScript.rules.forEach((rule, index) => {
        if (rule.targetObjectId !== 'stage' && !assetIds.objectIds.includes(rule.targetObjectId)) {
          errors.push(`Invalid targetObjectId in rules[${index}]: ${rule.targetObjectId}`);
        }
      });
    }
    
    // 5. エラーがあれば例外
    if (errors.length > 0) {
      throw new Error(`GameScript validation failed:\n${errors.join('\n')}`);
    }
    
    console.log('  ✅ GameScript validation passed');
  }
  
  /**
   * ゲーム説明文生成
   */
  private generateDescription(spec: GameSpec): string {
    const mechanicDescriptions: Record<string, string> = {
      tap: 'タップして',
      swipe: 'スワイプして',
      drag: 'ドラッグして',
      hold: '長押しして',
      timing: 'タイミングよく',
      matching: 'マッチングして',
      collecting: '集めて',
      dodging: '避けて',
      shooting: '撃って',
      jumping: 'ジャンプして'
    };
    
    const mechanic = mechanicDescriptions[spec.concept.mechanic] || '';
    
    return `${spec.concept.theme}の世界で${mechanic}遊ぶ${spec.concept.genre}ゲーム。${spec.concept.duration}秒間のショートゲーム体験！`;
  }
  
  /**
   * トークン数見積もり
   */
  estimateTokens(spec: GameSpec): number {
    // システムプロンプト: 約1500トークン
    // ユーザープロンプト: 約500トークン
    // レスポンス: 約4000トークン（GameScript JSON）
    return 6000;
  }
}