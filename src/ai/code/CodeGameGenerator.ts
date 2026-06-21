import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ILLMProvider } from '../v2/llm/index.js';
import { GameConcept } from '../v2/types.js';
import { CodeAssetPlan } from './CodeAssetPlanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXAMPLES_DIR = path.join(__dirname, 'examples');

function loadExample(filename: string): string {
  try {
    return fs.readFileSync(path.join(EXAMPLES_DIR, filename), 'utf-8');
  } catch {
    return '';
  }
}

function buildSystemPrompt(): string {
  const apiSpec = `
// SwizzleGameAPI — 利用可能なメソッド一覧
// canvas: { width: 1080, height: 1920 }
// time:   { elapsed: number, delta: number }

game.onStart(fn)                    // ゲーム開始時に1回
game.onUpdate(fn(dt))               // 毎フレーム（dt=秒単位の経過時間）
game.onTap(fn(x, y))                // タップ/クリック時
game.onSwipe(fn(dir))               // スワイプ時（dir: 'up'|'down'|'left'|'right'）
game.onHold(fn(x, y, duration))     // 長押し時（duration=秒）

game.draw.clear(color?)             // 背景クリア
game.draw.image(id, x, y, w, h, rotation?) // アセット画像を描画
game.draw.rect(x, y, w, h, color, alpha?)  // 矩形
game.draw.circle(x, y, r, color, alpha?)   // 円
game.draw.text(str, x, y, {size?, color?, align?, bold?, font?})
game.draw.line(x1, y1, x2, y2, color, lineWidth?)

game.audio.play(id, volume?)        // 効果音再生
game.audio.bgm(id, volume?)         // BGM再生（ループ）
game.audio.stopBgm()                // BGM停止

game.end.success(score?)            // 成功終了
game.end.failure()                  // 失敗終了

game.random(min, max)               // ランダム実数
game.time.elapsed                   // ゲーム開始からの経過秒
game.time.delta                     // 前フレームからの経過秒（onUpdateのdtと同じ）
`.trim();

  const example1 = loadExample('tap-target.js');
  const example2 = loadExample('swipe-direction.js');

  return `あなたはSwizzleミニゲームのJavaScriptコードを生成する専門家です。

## SwizzleGameAPI仕様
\`\`\`
${apiSpec}
\`\`\`

## サンプルゲーム1: タップターゲット
\`\`\`javascript
${example1}
\`\`\`

## サンプルゲーム2: スワイプ方向判定
\`\`\`javascript
${example2}
\`\`\`

## 生成ルール
1. コードは (function(game) { ... })(game); の形式で書くこと
2. game.end.success() と game.end.failure() の両方を必ず呼ぶこと
3. 5〜30秒以内に終わるゲームにすること
4. onUpdate(dt) でdtを使い、フレームレート非依存の更新にすること
5. 毎フレームclearで画面をクリアし、その後draw命令で再描画すること
6. アセットIDは必ずassetPlanに含まれるものだけ使うこと（存在しないIDを参照しない）
7. 初期のonStartでBGMを再生すること（audio.bgm('bgm_main', 0.4)）
8. 成功/失敗時は対応するSEを再生してからend.success/failureを呼ぶこと
9. コードのみを返すこと（説明文・コメントブロック・マークダウン不要）`;
}

export interface CodeGameGeneratorResult {
  code: string;
}

export class CodeGameGenerator {
  private llm: ILLMProvider;

  constructor(llm: ILLMProvider) {
    this.llm = llm;
  }

  async generate(concept: GameConcept, assetPlan: CodeAssetPlan): Promise<CodeGameGeneratorResult> {
    const assetSummary = [
      `背景: ${assetPlan.background.description}`,
      `オブジェクト: ${assetPlan.objects.map(o => `${o.id}(${o.name})`).join(', ')}`,
      `効果音: ${assetPlan.sounds.map(s => `${s.id}`).join(', ')}`,
      assetPlan.bgm ? `BGM: ${assetPlan.bgm.id}` : ''
    ].filter(Boolean).join('\n');

    const userPrompt = `以下のコンセプトとアセット計画に基づいてSwizzleミニゲームのJSコードを生成してください。

## ゲームコンセプト
タイトル: ${concept.title}
説明: ${concept.description}
プレイヤー操作: ${concept.playerOperation}
目標: ${concept.playerGoal}
成功条件: ${concept.successCondition}
失敗条件: ${concept.failureCondition}
制限時間: ${concept.duration}秒

## 利用可能なアセット
${assetSummary}

JavaScriptコードだけを返してください（\`\`\`や説明文は不要）:`;

    const response = await this.llm.chat([
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user',   content: userPrompt }
    ], { maxTokens: 4096, temperature: 0.5 });

    let code = response.content.trim();

    // コードブロックのマーカーがあれば除去
    code = code.replace(/^```(?:javascript|js)?\n?/i, '').replace(/\n?```$/i, '').trim();

    return { code };
  }
}
