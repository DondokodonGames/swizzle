/**
 * LLM Provider Abstraction Layer
 *
 * Claude API と OpenAI API を切り替え可能にする抽象化レイヤー
 */

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface LLMConfig {
  provider: 'anthropic' | 'openai';
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * LLMプロバイダーの抽象インターフェース
 */
export interface ILLMProvider {
  /**
   * メッセージを送信してレスポンスを取得
   */
  chat(messages: LLMMessage[], options?: {
    maxTokens?: number;
    temperature?: number;
    model?: string;
  }): Promise<LLMResponse>;

  /**
   * プロバイダー名を取得
   */
  getProviderName(): string;

  /**
   * デフォルトモデル名を取得
   */
  getDefaultModel(): string;
}

/**
 * デフォルトのモデル設定
 */
export const DEFAULT_MODELS = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o'
} as const;

/**
 * プロバイダータイプ
 */
export type LLMProviderType = 'anthropic' | 'openai';
