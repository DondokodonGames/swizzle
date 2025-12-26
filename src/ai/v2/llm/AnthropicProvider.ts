/**
 * Anthropic (Claude) LLM Provider
 */

import Anthropic from '@anthropic-ai/sdk';
import { ILLMProvider, LLMMessage, LLMResponse, DEFAULT_MODELS } from './LLMProvider';

export class AnthropicProvider implements ILLMProvider {
  private client: Anthropic;
  private defaultModel: string;

  constructor(apiKey?: string, model?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    });
    this.defaultModel = model || DEFAULT_MODELS.anthropic;
  }

  async chat(messages: LLMMessage[], options?: {
    maxTokens?: number;
    temperature?: number;
    model?: string;
  }): Promise<LLMResponse> {
    // システムメッセージを分離
    const systemMessages = messages.filter(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');

    // Anthropic形式に変換
    const anthropicMessages = chatMessages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }));

    const response = await this.client.messages.create({
      model: options?.model || this.defaultModel,
      max_tokens: options?.maxTokens || 4096,
      temperature: options?.temperature,
      system: systemMessages.length > 0 ? systemMessages.map(m => m.content).join('\n\n') : undefined,
      messages: anthropicMessages
    });

    // レスポンスからテキストを抽出
    const textContent = response.content.find((block: { type: string }) => block.type === 'text');
    const content = textContent && 'text' in textContent ? (textContent as { text: string }).text : '';

    return {
      content,
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens
      }
    };
  }

  getProviderName(): string {
    return 'anthropic';
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }
}
