/**
 * RulesToCodeConverter
 *
 * 既存のif-thenルールゲーム（GameProject）をJSコードゲームに変換するユーティリティ。
 * 完全自動変換ではなく、Claude APIを使ったセミオート変換（レビュー前提）。
 * 主な用途: IPホルダーへのデモ用移植、既存ゲームの品質向上。
 */

import { ILLMProvider } from '../v2/llm/index.js';
import { GameProject } from '../../types/editor/GameProject.js';

export interface ConversionResult {
  success: boolean;
  code?: string;
  warnings?: string[];
  error?: string;
}

const SYSTEM_PROMPT = `あなたはSwizzleのif-thenルールゲームをJavaScriptコードゲームに変換する専門家です。

## 変換先のSwizzleGameAPI
\`\`\`
game.onStart(fn)                    // ゲーム開始時に1回
game.onUpdate(fn(dt))               // 毎フレーム
game.onTap(fn(x, y))                // タップ時（canvas座標: 1080x1920）
game.onSwipe(fn(dir))               // スワイプ（'up'|'down'|'left'|'right'）
game.draw.clear(color?)             // 背景クリア
game.draw.image(id, x, y, w, h, rotation?)
game.draw.rect(x, y, w, h, color, alpha?)
game.draw.circle(x, y, r, color, alpha?)
game.draw.text(str, x, y, {size?, color?, align?, bold?})
game.audio.play(id, volume?)
game.audio.bgm(id, volume?)
game.end.success(score?)
game.end.failure()
game.random(min, max)
game.canvas.width  // 1080
game.canvas.height // 1920
game.time.elapsed  // 経過秒
game.time.delta    // 前フレームからの秒
\`\`\`

## ルール
- (function(game) { ... })(game); の形式で書く
- ゲームの挙動を忠実に再現する（ルールの条件と動作を保持）
- 座標はrules側が正規化(0-1)している場合、1080/1920を掛けて変換
- コメントは最小限にする
- JSコードのみ返す（説明文不要）`;

export class RulesToCodeConverter {
  private llm: ILLMProvider;

  constructor(llm: ILLMProvider) {
    this.llm = llm;
  }

  async convert(project: GameProject): Promise<ConversionResult> {
    const warnings: string[] = [];

    // 変換可能性チェック
    if (!project.script?.rules?.length) {
      return { success: false, error: 'ルールが存在しないゲームは変換できません' };
    }

    // 物理エンジン使用の警告
    const usesPhysics = project.script.rules.some(r =>
      r.actions?.some(a => a.type === 'applyForce' || a.type === 'applyImpulse' || a.type === 'setGravity')
    );
    if (usesPhysics) {
      warnings.push('物理アクション（applyForce/applyImpulse/setGravity）は変換後に手動調整が必要です');
    }

    // アセット情報まとめ
    const assetSummary = [
      project.assets.background ? `背景: bg_main` : '',
      ...project.assets.objects.map(o => `オブジェクト: ${o.id} (${o.name})`),
      ...project.assets.audio.se.map(s => `効果音: ${s.id}`),
      project.assets.audio.bgm ? `BGM: bgm_main` : '',
    ].filter(Boolean).join('\n');

    const userPrompt = `以下のif-thenルールゲームをSwizzleGameAPI JSコードに変換してください。

## ゲーム情報
名前: ${project.settings?.name || project.name}
説明: ${project.settings?.description || ''}
時間: ${project.settings?.duration?.seconds ?? 10}秒

## 利用可能なアセット
${assetSummary}

## ゲームのルール（JSON）
\`\`\`json
${JSON.stringify(project.script, null, 2).slice(0, 6000)}
\`\`\`

JSコードのみ返してください:`;

    try {
      const response = await this.llm.chat([
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: userPrompt },
      ], { maxTokens: 4096, temperature: 0.3 });

      let code = response.content.trim();
      code = code.replace(/^```(?:javascript|js)?\n?/i, '').replace(/\n?```$/i, '').trim();

      return { success: true, code, warnings };
    } catch (err) {
      return { success: false, error: String(err), warnings };
    }
  }
}
