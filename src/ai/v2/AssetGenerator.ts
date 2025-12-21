/**
 * Step 5: AssetGenerator
 *
 * アセット計画に基づいて画像・音声を生成
 */

import OpenAI from 'openai';
import { GameConcept, AssetPlan, GeneratedAssets, GeneratedObject, GeneratedSound } from './types';

// 効果音プリセット（Web Audio API用）
const SOUND_PRESETS: Record<string, { frequency: number; duration: number; type: OscillatorType; envelope: string }> = {
  tap: { frequency: 800, duration: 0.1, type: 'sine', envelope: 'pluck' },
  success: { frequency: 523, duration: 0.5, type: 'sine', envelope: 'fanfare' },
  failure: { frequency: 200, duration: 0.4, type: 'sawtooth', envelope: 'down' },
  collect: { frequency: 1000, duration: 0.15, type: 'sine', envelope: 'up' },
  pop: { frequency: 600, duration: 0.08, type: 'sine', envelope: 'pluck' },
  whoosh: { frequency: 400, duration: 0.2, type: 'sawtooth', envelope: 'sweep' },
  bounce: { frequency: 300, duration: 0.15, type: 'sine', envelope: 'bounce' },
  ding: { frequency: 1200, duration: 0.3, type: 'sine', envelope: 'bell' },
  buzz: { frequency: 150, duration: 0.2, type: 'square', envelope: 'flat' },
  splash: { frequency: 200, duration: 0.3, type: 'sawtooth', envelope: 'splash' }
};

export interface AssetGeneratorConfig {
  imageProvider: 'openai' | 'mock';
  openaiApiKey?: string;
}

export class AssetGenerator {
  private config: AssetGeneratorConfig;
  private openai?: OpenAI;

  constructor(config: AssetGeneratorConfig) {
    this.config = config;

    if (config.imageProvider === 'openai' && config.openaiApiKey) {
      this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    }
  }

  /**
   * アセットを生成
   */
  async generate(concept: GameConcept, assetPlan: AssetPlan): Promise<GeneratedAssets> {
    console.log('   🎨 Generating assets...');

    // 背景生成
    const background = await this.generateBackground(concept, assetPlan.background);

    // オブジェクト生成
    const objects = await this.generateObjects(concept, assetPlan.objects);

    // 効果音生成
    const sounds = this.generateSounds(assetPlan.sounds);

    return {
      background,
      objects,
      sounds
    };
  }

  /**
   * 背景生成
   */
  private async generateBackground(
    concept: GameConcept,
    bgPlan: AssetPlan['background']
  ): Promise<GeneratedAssets['background']> {
    const prompt = this.buildBackgroundPrompt(concept, bgPlan);

    if (this.config.imageProvider === 'openai' && this.openai) {
      try {
        const response = await this.openai.images.generate({
          model: 'dall-e-3',
          prompt,
          n: 1,
          size: '1024x1024',
          response_format: 'b64_json'
        });

        const imageData = response.data?.[0]?.b64_json;
        if (!imageData) {
          console.log('      ⚠️ Background generation returned no data');
          return this.createPlaceholderBackground(concept);
        }
        const dataUrl = `data:image/png;base64,${imageData}`;
        console.log('      ✅ Background generated');

        return {
          id: 'bg_main',
          name: `${concept.theme} 背景`,
          frames: [{ dataUrl }]
        };
      } catch (error) {
        console.log('      ⚠️ Background generation failed, using placeholder');
        return this.createPlaceholderBackground(concept);
      }
    }

    return this.createPlaceholderBackground(concept);
  }

  /**
   * オブジェクト生成
   */
  private async generateObjects(
    concept: GameConcept,
    objectPlans: AssetPlan['objects']
  ): Promise<GeneratedObject[]> {
    const objects: GeneratedObject[] = [];

    for (const plan of objectPlans) {
      const prompt = this.buildObjectPrompt(concept, plan);

      if (this.config.imageProvider === 'openai' && this.openai) {
        try {
          const response = await this.openai.images.generate({
            model: 'dall-e-3',
            prompt,
            n: 1,
            size: '1024x1024',
            response_format: 'b64_json'
          });

          const imageData = response.data?.[0]?.b64_json;
          if (!imageData) {
            console.log(`      ⚠️ Object ${plan.id} generation returned no data`);
            objects.push(this.createPlaceholderObject(plan));
            continue;
          }
          const dataUrl = `data:image/png;base64,${imageData}`;

          objects.push({
            id: plan.id,
            name: plan.name,
            imageUrl: dataUrl,
            frames: [{ dataUrl }]
          });
        } catch (error) {
          console.log(`      ⚠️ Object ${plan.id} generation failed, using placeholder`);
          objects.push(this.createPlaceholderObject(plan));
        }
      } else {
        objects.push(this.createPlaceholderObject(plan));
      }
    }

    console.log(`      ✅ ${objects.length} objects generated`);
    return objects;
  }

  /**
   * 効果音生成
   */
  private generateSounds(soundPlans: AssetPlan['sounds']): GeneratedSound[] {
    const sounds: GeneratedSound[] = [];

    for (const plan of soundPlans) {
      const preset = SOUND_PRESETS[plan.type] || SOUND_PRESETS.tap;
      const wavData = this.synthesizeSound(preset);

      sounds.push({
        id: plan.id,
        name: plan.id,
        trigger: plan.trigger,
        data: wavData
      });
    }

    console.log(`      ✅ ${sounds.length} sounds generated`);
    return sounds;
  }

  /**
   * 背景プロンプト生成
   *
   * ゲーム用背景は以下の要件を満たす必要がある:
   * - オブジェクトが上に配置されるため、シンプルで邪魔にならない
   * - キャラクターやゲーム要素を含まない
   * - 均一な領域があり、オブジェクトの視認性が確保される
   */
  private buildBackgroundPrompt(concept: GameConcept, bgPlan: AssetPlan['background']): string {
    return `Mobile game background for "${concept.theme}":
Scene: ${bgPlan.description}
Mood: ${bgPlan.mood}
Style: ${concept.visualStyle}

CRITICAL REQUIREMENTS:
- Abstract, minimal background with soft gradients and subtle patterns
- NO characters, NO game objects, NO icons, NO UI elements, NO text
- Central area must be clear and uniform for game objects to be placed on top
- Use muted, desaturated colors that won't compete with foreground sprites
- Vertical mobile format composition (portrait orientation)
- Simple, clean digital illustration style
- Depth through subtle atmospheric perspective, not detailed elements`;
  }

  /**
   * オブジェクトプロンプト生成
   *
   * ゲームオブジェクトの要件:
   * - 透明背景で、他の要素と重ねやすい
   * - はっきりしたシルエットで視認性が高い
   * - ゲームスプライトとして機能する
   */
  private buildObjectPrompt(concept: GameConcept, objPlan: AssetPlan['objects'][0]): string {
    const sizeDesc = objPlan.size === 'small' ? 'small compact icon (64px style)' :
                     objPlan.size === 'large' ? 'large prominent sprite (192px style)' :
                     'medium sized sprite (128px style)';
    return `Game sprite object: ${objPlan.visualDescription}
Purpose: ${objPlan.purpose}
Size: ${sizeDesc}
Style: ${concept.visualStyle}

CRITICAL REQUIREMENTS:
- MUST have fully transparent background (PNG with alpha channel)
- Clear, distinct silhouette that's easily recognizable
- Bold colors and strong contrast for visibility
- Simple, clean design suitable for mobile game
- NO background elements, NO shadows on ground, NO text
- Single isolated object, centered in frame
- Cartoon/game art style, not photorealistic`;
  }

  /**
   * プレースホルダー背景生成
   */
  private createPlaceholderBackground(concept: GameConcept): GeneratedAssets['background'] {
    // SVGプレースホルダー
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#4a90d9;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1a365d;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#bg)"/>
      <text x="540" y="960" text-anchor="middle" fill="white" font-size="48" font-family="sans-serif">${concept.theme}</text>
    </svg>`;

    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

    return {
      id: 'bg_main',
      name: `${concept.theme} 背景`,
      frames: [{ dataUrl }]
    };
  }

  /**
   * プレースホルダーオブジェクト生成
   * 透明な画像を生成（後で実画像に差し替え可能）
   */
  private createPlaceholderObject(plan: AssetPlan['objects'][0]): GeneratedObject {
    const size = plan.size === 'small' ? 64 : plan.size === 'large' ? 192 : 128;

    // 完全に透明なSVG（後で画像差し替え用）
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="transparent" opacity="0"/>
    </svg>`;

    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

    return {
      id: plan.id,
      name: plan.name,
      imageUrl: dataUrl,
      frames: [{ dataUrl }]
    };
  }

  /**
   * 名前から色を生成
   */
  private getColorFromName(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 50%)`;
  }

  /**
   * 効果音合成（Web Audio API形式のWAVデータ生成）
   */
  private synthesizeSound(preset: typeof SOUND_PRESETS[string]): string {
    const sampleRate = 44100;
    const duration = preset.duration;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const normalizedT = t / duration;

      // 基本波形
      let sample = 0;
      switch (preset.type) {
        case 'sine':
          sample = Math.sin(2 * Math.PI * preset.frequency * t);
          break;
        case 'square':
          sample = Math.sign(Math.sin(2 * Math.PI * preset.frequency * t));
          break;
        case 'sawtooth':
          sample = 2 * ((preset.frequency * t) % 1) - 1;
          break;
        case 'triangle':
          sample = 2 * Math.abs(2 * ((preset.frequency * t) % 1) - 1) - 1;
          break;
      }

      // エンベロープ適用
      let envelope = 1;
      switch (preset.envelope) {
        case 'pluck':
          envelope = Math.exp(-normalizedT * 10);
          break;
        case 'up':
          envelope = Math.min(normalizedT * 5, 1) * Math.exp(-normalizedT * 3);
          break;
        case 'down':
          envelope = (1 - normalizedT) * Math.exp(-normalizedT * 2);
          break;
        case 'bell':
          envelope = Math.exp(-normalizedT * 5) * (1 + Math.sin(normalizedT * Math.PI * 4) * 0.3);
          break;
        case 'bounce':
          envelope = Math.abs(Math.sin(normalizedT * Math.PI * 3)) * Math.exp(-normalizedT * 5);
          break;
        case 'fanfare':
          envelope = Math.min(normalizedT * 10, 1) * (1 - normalizedT * 0.5);
          break;
        case 'sweep':
          envelope = Math.exp(-normalizedT * 4);
          break;
        case 'splash':
          envelope = Math.exp(-normalizedT * 3) * (1 + Math.random() * 0.2);
          break;
        default:
          envelope = 1 - normalizedT;
      }

      buffer[i] = sample * envelope * 0.5; // 音量調整
    }

    // WAVフォーマットに変換
    return this.floatArrayToWavBase64(buffer, sampleRate);
  }

  /**
   * Float配列をWAV Base64に変換
   */
  private floatArrayToWavBase64(samples: Float32Array, sampleRate: number): string {
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = samples.length * bytesPerSample;
    const bufferSize = 44 + dataSize;

    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);

    // WAVヘッダー
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // fmtチャンクサイズ
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // サンプルデータ
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }

    // Base64エンコード
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return `data:audio/wav;base64,${Buffer.from(binary, 'binary').toString('base64')}`;
  }

  private writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }
}
