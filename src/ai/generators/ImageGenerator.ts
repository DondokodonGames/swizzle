/**
 * 画像生成システム - ImageGenerator
 * Phase H: OpenAI DALL-E 3 / Replicate / Stable Diffusionでゲームアセット画像を生成
 */

import OpenAI from 'openai';
import { ImageGenerationRequest, VisualStyle } from '../types/GenerationTypes';
import { AssetFrame } from '../../types/editor/ProjectAssets';

/**
 * 画像生成プロバイダー
 */
type ImageProvider = 'openai' | 'replicate' | 'stable-diffusion';

/**
 * ImageGenerator
 * OpenAI DALL-E 3（推奨）、Replicate、Stable Diffusionをサポート
 */
export class ImageGenerator {
  private provider: ImageProvider;
  private openai?: OpenAI;
  private sdApiUrl?: string;
  private replicateApiKey?: string;
  
  constructor(config: {
    provider?: ImageProvider;
    openaiApiKey?: string;
    sdApiUrl?: string;
    replicateApiKey?: string;
  }) {
    // プロバイダー自動選択
    if (config.openaiApiKey) {
      this.provider = 'openai';
      this.openai = new OpenAI({
        apiKey: config.openaiApiKey
      });
    } else if (config.replicateApiKey) {
      this.provider = 'replicate';
      this.replicateApiKey = config.replicateApiKey;
    } else if (config.sdApiUrl) {
      this.provider = 'stable-diffusion';
      this.sdApiUrl = config.sdApiUrl;
    } else {
      // デフォルト: ダミー画像
      this.provider = 'stable-diffusion';
      this.sdApiUrl = undefined;
    }
    
    console.log(`🎨 ImageGenerator initialized with provider: ${this.provider}`);
  }
  
  /**
   * 背景画像生成
   */
  async generateBackground(
    request: ImageGenerationRequest
  ): Promise<AssetFrame[]> {
    console.log(`🎨 Generating background: ${request.prompt}`);
    
    switch (this.provider) {
      case 'openai':
        return await this.generateWithOpenAI(request);
      case 'replicate':
        return await this.generateWithReplicate(request);
      case 'stable-diffusion':
        return await this.generateWithStableDiffusion(request);
      default:
        return this.generateDummyFrames(request);
    }
  }
  
  /**
   * オブジェクト画像生成
   */
  async generateObject(
    request: ImageGenerationRequest
  ): Promise<AssetFrame[]> {
    console.log(`🎨 Generating object: ${request.prompt}`);
    
    // 透明背景を追加
    const modifiedRequest: ImageGenerationRequest = {
      ...request,
      negativePrompt: (request.negativePrompt || '') + ', background, complex background'
    };
    
    switch (this.provider) {
      case 'openai':
        return await this.generateWithOpenAI(modifiedRequest);
      case 'replicate':
        return await this.generateWithReplicate(modifiedRequest);
      case 'stable-diffusion':
        return await this.generateWithStableDiffusion(modifiedRequest);
      default:
        return this.generateDummyFrames(modifiedRequest);
    }
  }
  
  /**
   * OpenAI DALL-E 3で生成
   */
  private async generateWithOpenAI(
    request: ImageGenerationRequest
  ): Promise<AssetFrame[]> {
    if (!this.openai) {
      console.warn('  ⚠️  OpenAI client not initialized');
      return this.generateDummyFrames(request);
    }
    
    console.log('  🤖 Using OpenAI DALL-E 3...');
    
    try {
      const frames: AssetFrame[] = [];
      
      // DALL-E 3は1回のリクエストで1枚のみ生成
      for (let i = 0; i < request.frameCount; i++) {
        console.log(`     Generating frame ${i + 1}/${request.frameCount}...`);
        
        // プロンプト最適化
        const optimizedPrompt = this.optimizePrompt(
          request.prompt,
          request.style,
          request.colorPalette
        );
        
        // DALL-E 3リクエスト
        const response = await this.openai.images.generate({
          model: 'dall-e-3',
          prompt: optimizedPrompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard', // 'standard' or 'hd'
          style: 'vivid', // 'vivid' or 'natural'
        });
        
                if (!response.data || response.data.length === 0) {
          throw new Error('No data in response');
        }
        
        const imageUrl = response.data[0]?.url;
        
        if (!imageUrl) {
          throw new Error('No image URL in response');
        }
        
        // URLから画像データを取得してbase64に変換
        const imageData = await this.downloadImageAsBase64(imageUrl);
        
        frames.push({
          id: `frame_${Date.now()}_${i}`,
          dataUrl: imageData,
          originalName: `${request.type}_frame_${i}.png`,
          width: request.dimensions.width,
          height: request.dimensions.height,
          fileSize: this.estimateBase64Size(imageData),
          uploadedAt: new Date().toISOString()
        });
        
        // レート制限対策: 1秒待機
        if (i < request.frameCount - 1) {
          await this.sleep(1000);
        }
      }
      
      console.log(`  ✅ Generated ${frames.length} frames with DALL-E 3`);
      return frames;
      
    } catch (error) {
      console.error('  ❌ OpenAI DALL-E 3 generation failed:', error);
      console.log('  🔄 Falling back to dummy frames');
      return this.generateDummyFrames(request);
    }
  }
  
  /**
   * URLから画像をダウンロードしてbase64に変換
   */
  private async downloadImageAsBase64(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      return `data:image/png;base64,${base64}`;
    } catch (error) {
      console.error('Failed to download image:', error);
      throw error;
    }
  }
  
  /**
   * base64サイズ見積もり
   */
  private estimateBase64Size(dataUrl: string): number {
    // "data:image/png;base64," を除いた部分の長さ
    const base64String = dataUrl.split(',')[1] || '';
    // base64は元のバイト数の約133%なので、逆算
    return Math.floor((base64String.length * 3) / 4);
  }
  
  /**
   * スリープ
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Stable Diffusion APIで生成（ローカル）
   */
  private async generateWithStableDiffusion(
    request: ImageGenerationRequest
  ): Promise<AssetFrame[]> {
    // TODO: APIキー取得後に実装
    console.log('  ⏳ Stable Diffusion generation not yet implemented');
    console.log(`  📝 Would generate ${request.frameCount} frames`);
    console.log(`  📐 Dimensions: ${request.dimensions.width}x${request.dimensions.height}`);
    
    // 仮実装: ダミーデータを返す
    return this.generateDummyFrames(request);
  }
  
  /**
   * Replicate APIで生成
   */
  private async generateWithReplicate(
    request: ImageGenerationRequest
  ): Promise<AssetFrame[]> {
    // TODO: APIキー取得後に実装
    console.log('  ⏳ Replicate API generation not yet implemented');
    console.log(`  📝 Would generate ${request.frameCount} frames`);
    
    // 仮実装: ダミーデータを返す
    return this.generateDummyFrames(request);
  }
  
  /**
   * ダミーフレーム生成（テスト用）
   * Node.js環境でも動作する色付きプレースホルダー画像を生成
   */
  private generateDummyFrames(request: ImageGenerationRequest): AssetFrame[] {
    const frames: AssetFrame[] = [];
    const { width, height } = request.dimensions;

    // タイプに応じたプレースホルダー色を決定
    const placeholderColors = request.type === 'background'
      ? ['#4A90D9', '#5BA55B', '#D97B4A', '#9B59B6'] // 背景用の落ち着いた色
      : ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3', '#A8D8EA']; // オブジェクト用の明るい色

    for (let i = 0; i < request.frameCount; i++) {
      const color = request.colorPalette[i % request.colorPalette.length]
        || placeholderColors[i % placeholderColors.length];

      // SVGでプレースホルダー画像を生成（Node.js互換）
      const svgDataUrl = this.createPlaceholderSVG(width, height, color, request.type, i);

      frames.push({
        id: `frame_${Date.now()}_${i}`,
        dataUrl: svgDataUrl,
        originalName: `${request.type}_frame_${i}.svg`,
        width: width,
        height: height,
        fileSize: svgDataUrl.length,
        uploadedAt: new Date().toISOString()
      });
    }

    console.log(`  ✅ Generated ${frames.length} placeholder frames (SVG)`);
    return frames;
  }

  /**
   * SVGプレースホルダー画像を生成（Node.js互換）
   */
  private createPlaceholderSVG(
    width: number,
    height: number,
    color: string,
    type: string,
    index: number
  ): string {
    // 背景用SVG（グラデーション付き）
    if (type === 'background') {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:${this.lightenColor(color, 30)};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${color};stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#bg)"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
              fill="white" font-size="48" font-family="Arial" opacity="0.5">
          🎮 Background
        </text>
      </svg>`;
      return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    }

    // オブジェクト用SVG（丸い形状）
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <radialGradient id="obj${index}" cx="30%" cy="30%" r="70%">
          <stop offset="0%" style="stop-color:${this.lightenColor(color, 40)};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color};stop-opacity:1" />
        </radialGradient>
        <filter id="shadow${index}" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="4" dy="4" stdDeviation="8" flood-opacity="0.3"/>
        </filter>
      </defs>
      <circle cx="${width/2}" cy="${height/2}" r="${Math.min(width, height) * 0.4}"
              fill="url(#obj${index})" filter="url(#shadow${index})"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
            fill="white" font-size="40" font-family="Arial">
        ${index + 1}
      </text>
    </svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }

  /**
   * 色を明るくする
   */
  private lightenColor(color: string, percent: number): string {
    // HEXカラーを解析
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // 明るくする
    const newR = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
    const newG = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
    const newB = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));

    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  }
  
  /**
   * プロンプト最適化
   */
  optimizePrompt(
    basePrompt: string,
    style: VisualStyle,
    colorPalette: string[]
  ): string {
    const styleModifiers: Record<VisualStyle, string> = {
      minimal: 'minimalist, clean, simple shapes',
      cute: 'kawaii, adorable, soft colors, rounded shapes',
      retro: '8-bit, pixel art, retro gaming aesthetic',
      neon: 'neon lights, cyberpunk, glowing colors',
      nature: 'natural, organic, earthy tones',
      space: 'cosmic, stars, planets, sci-fi',
      underwater: 'aquatic, ocean, marine life',
      abstract: 'abstract art, geometric patterns',
      geometric: 'geometric shapes, clean lines, modern',
      pixel: 'pixel art, 8-bit, retro game graphics'
    };
    
    const colorText = colorPalette.length > 0 
      ? `color palette: ${colorPalette.join(', ')}`
      : '';
    
    return `${basePrompt}, ${styleModifiers[style]}, ${colorText}, game asset, transparent background, high quality`;
  }
  
  /**
   * ネガティブプロンプト生成
   */
  generateNegativePrompt(type: 'background' | 'object'): string {
    const common = 'low quality, blurry, distorted, ugly, bad anatomy';
    
    if (type === 'object') {
      return `${common}, background, complex background, text, watermark`;
    }
    
    return `${common}, characters, people, text, watermark`;
  }
  
  /**
   * 画像最適化
   */
  async optimizeImage(
    dataUrl: string,
    maxSize: number = 512000 // 512KB
  ): Promise<string> {
    // TODO: 実装
    // Sharp.jsを使用して画像を圧縮・最適化
    console.log('  🔧 Image optimization not yet implemented');
    return dataUrl;
  }
  
  /**
   * コスト見積もり
   */
  estimateCost(frameCount: number): number {
    switch (this.provider) {
      case 'openai':
        // DALL-E 3: $0.04/画像（1024x1024）
        return frameCount * 0.04;
      case 'replicate':
        // Replicate: $0.01/画像
        return frameCount * 0.01;
      case 'stable-diffusion':
        // Stable Diffusion（ローカル）: 電気代のみ（無視）
        return 0;
      default:
        return 0;
    }
  }
  
  /**
   * プロバイダー情報取得
   */
  getProvider(): ImageProvider {
    return this.provider;
  }
}