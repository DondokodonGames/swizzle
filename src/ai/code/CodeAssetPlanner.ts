import { ILLMProvider } from '../v2/llm/index.js';
import { GameConcept } from '../v2/types.js';
import { robustParseJSON } from '../v2/jsonParser.js';

export interface CodeAssetObject {
  id: string;          // 例: "obj_ball"
  name: string;        // 例: "ボール"
  description: string; // SVG生成プロンプト用
  purpose: string;     // ゲーム内の役割
}

export interface CodeAssetSound {
  id: string;   // 例: "se_tap"
  trigger: string;
  type: 'tap' | 'success' | 'failure' | 'collect' | 'pop' | 'whoosh' | 'bounce' | 'ding' | 'buzz' | 'splash';
}

export interface CodeAssetPlan {
  background: { description: string; mood: string };
  objects: CodeAssetObject[];
  sounds: CodeAssetSound[];
  bgm?: { id: string; description: string; mood: 'upbeat' | 'calm' | 'tense' | 'happy' | 'mysterious' | 'energetic' };
}

const SYSTEM_PROMPT = `あなたはミニゲームのアセット計画を立てる専門家です。
ゲームコンセプトを読み、JSゲームコードで使用するアセットを計画してください。

ルール:
- オブジェクトは最大5個（プレイに直接必要なものだけ）
- 効果音は se_tap / se_success / se_failure を必ず含める（追加は最大2つ）
- IDは "obj_xxx" / "se_xxx" / "bgm_main" の形式
- visualDescriptionはSVGイラスト生成に使う英語の説明

JSON形式で回答してください:
{
  "background": { "description": "...", "mood": "..." },
  "objects": [{ "id": "obj_xxx", "name": "...", "description": "...(英語)", "purpose": "..." }],
  "sounds": [{ "id": "se_tap", "trigger": "タップ時", "type": "tap" }],
  "bgm": { "id": "bgm_main", "description": "...", "mood": "upbeat" }
}`;

export class CodeAssetPlanner {
  private llm: ILLMProvider;

  constructor(llm: ILLMProvider) {
    this.llm = llm;
  }

  async plan(concept: GameConcept): Promise<CodeAssetPlan> {
    const response = await this.llm.chat([
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `ゲームコンセプト:\nタイトル: ${concept.title}\n説明: ${concept.description}\n操作: ${concept.playerOperation}\n目標: ${concept.playerGoal}\n成功: ${concept.successCondition}\n失敗: ${concept.failureCondition}`
      }
    ], { maxTokens: 1024, temperature: 0.3 });

    const parsed = robustParseJSON<CodeAssetPlan>(response.content);
    if (!parsed) throw new Error('CodeAssetPlanner: JSON parse failed');

    // 必須効果音を保証
    const ids = new Set(parsed.sounds.map(s => s.id));
    if (!ids.has('se_tap'))     parsed.sounds.unshift({ id: 'se_tap',     trigger: 'タップ時', type: 'tap' });
    if (!ids.has('se_success')) parsed.sounds.push({ id: 'se_success', trigger: '成功時',   type: 'success' });
    if (!ids.has('se_failure')) parsed.sounds.push({ id: 'se_failure', trigger: '失敗時',   type: 'failure' });

    return parsed;
  }
}
