/**
 * Prompt style switch (WP11: プロンプトダイエット)
 *
 * `PROMPT_STYLE` 環境変数で生成プロンプトのスタイルを切り替える。
 *   - 'classic' (デフォルト): 従来の肥大プロンプト。後方互換のため挙動を一切変えない。
 *   - 'lean':                ハード制約のみを簡潔に提示し、発想を縛らない軽量プロンプト。
 *
 * 守り（類似度ゲート / フェーズ層 / バリデータ / 公開ゲート）はプロンプト外に存在するため、
 * lean では「壊れたゲームは検証層が落とす」前提でモデルの発想を広げる。
 */
export type PromptStyle = 'classic' | 'lean';

export function getPromptStyle(): PromptStyle {
  return process.env.PROMPT_STYLE === 'lean' ? 'lean' : 'classic';
}
