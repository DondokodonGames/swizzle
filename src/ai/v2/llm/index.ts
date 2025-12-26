/**
 * LLM Provider Factory & Exports
 *
 * 使い方:
 * ```typescript
 * import { createLLMProvider } from './llm';
 *
 * // 環境変数から自動選択
 * const provider = createLLMProvider();
 *
 * // 明示的に指定
 * const anthropic = createLLMProvider({ provider: 'anthropic' });
 * const openai = createLLMProvider({ provider: 'openai' });
 *
 * // APIを呼び出し
 * const response = await provider.chat([
 *   { role: 'user', content: 'Hello!' }
 * ]);
 * ```
 */

import { ILLMProvider, LLMConfig, LLMProviderType, DEFAULT_MODELS } from './LLMProvider';
import { AnthropicProvider } from './AnthropicProvider';
import { OpenAIProvider } from './OpenAIProvider';

export type { ILLMProvider, LLMMessage, LLMResponse, LLMConfig } from './LLMProvider';
export type { LLMProviderType } from './LLMProvider';
export { DEFAULT_MODELS } from './LLMProvider';
export { AnthropicProvider } from './AnthropicProvider';
export { OpenAIProvider } from './OpenAIProvider';

/**
 * 環境変数からプロバイダータイプを取得
 */
export function getProviderType(): LLMProviderType {
  const envProvider = process.env.LLM_PROVIDER?.toLowerCase();
  if (envProvider === 'openai' || envProvider === 'chatgpt') {
    return 'openai';
  }
  return 'anthropic'; // デフォルトはAnthropic
}

/**
 * LLMプロバイダーを作成
 *
 * 注意: config.apiKeyは後方互換性のために残していますが、
 * 通常は環境変数を使用することを推奨します。
 * - ANTHROPIC_API_KEY: Anthropic (Claude) 用
 * - OPENAI_API_KEY: OpenAI (ChatGPT) 用
 */
export function createLLMProvider(config?: Partial<LLMConfig>): ILLMProvider {
  const providerType = config?.provider || getProviderType();

  switch (providerType) {
    case 'openai':
      // OpenAIの場合は必ずOPENAI_API_KEYを使用
      // config.apiKeyは無視（Anthropicキーが誤って渡される可能性があるため）
      return new OpenAIProvider(
        process.env.OPENAI_API_KEY,
        config?.model || DEFAULT_MODELS.openai
      );

    case 'anthropic':
    default:
      // Anthropicの場合は必ずANTHROPIC_API_KEYを使用
      return new AnthropicProvider(
        process.env.ANTHROPIC_API_KEY,
        config?.model || DEFAULT_MODELS.anthropic
      );
  }
}

/**
 * グローバルLLMプロバイダーインスタンス（シングルトン）
 */
let globalProvider: ILLMProvider | null = null;

/**
 * グローバルLLMプロバイダーを取得（なければ作成）
 */
export function getLLMProvider(config?: Partial<LLMConfig>): ILLMProvider {
  if (!globalProvider || config) {
    globalProvider = createLLMProvider(config);
  }
  return globalProvider;
}

/**
 * グローバルLLMプロバイダーをリセット
 */
export function resetLLMProvider(): void {
  globalProvider = null;
}

/**
 * 現在のプロバイダー情報を表示
 */
export function getProviderInfo(): { provider: LLMProviderType; model: string } {
  const provider = getLLMProvider();
  return {
    provider: provider.getProviderName() as LLMProviderType,
    model: provider.getDefaultModel()
  };
}
