/**
 * OpenAI (ChatGPT) LLM Provider
 */

import OpenAI from 'openai';
import { ILLMProvider, LLMMessage, LLMResponse, DEFAULT_MODELS } from './LLMProvider';

export class OpenAIProvider implements ILLMProvider {
  private client: OpenAI;
  private defaultModel: string;

  constructor(apiKey?: string, model?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY
    });
    this.defaultModel = model || DEFAULT_MODELS.openai;
  }

  async chat(messages: LLMMessage[], options?: {
    maxTokens?: number;
    temperature?: number;
    model?: string;
  }): Promise<LLMResponse> {
    // OpenAI形式に変換
    const openaiMessages = messages.map(m => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content
    }));

    const maxRetries = 5;
    let lastError: unknown;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await this.client.chat.completions.create({
          model: options?.model || this.defaultModel,
          max_tokens: options?.maxTokens || 4096,
          temperature: options?.temperature,
          messages: openaiMessages
        });

        const choice = response.choices[0];
        const content = choice?.message?.content || '';

        return {
          content,
          model: response.model,
          usage: response.usage ? {
            inputTokens: response.usage.prompt_tokens,
            outputTokens: response.usage.completion_tokens
          } : undefined
        };
      } catch (error: unknown) {
        lastError = error;
        const apiError = error as { status?: number; message?: string };
        if (apiError?.status === 429) {
          // retry-after-ms ヘッダーまたはエラーメッセージから待機時間を取得
          const msgMatch = apiError?.message?.match(/try again in (\d+)ms/i);
          const waitMs = msgMatch
            ? Math.max(parseInt(msgMatch[1]) + 200, 500)
            : Math.min(1000 * Math.pow(2, attempt), 30000);
          console.log(`      ⏳ Rate limited (attempt ${attempt + 1}/${maxRetries}), retrying in ${waitMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitMs));
          continue;
        }
        throw error;
      }
    }

    throw lastError;
  }

  getProviderName(): string {
    return 'openai';
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }
}
