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
  }

  getProviderName(): string {
    return 'openai';
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }
}
