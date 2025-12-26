/**
 * Step 5: AssetGenerator
 *
 * アセット計画に基づいて画像・音声を生成
 */

import OpenAI from 'openai';
import { GameConcept, AssetPlan, GeneratedAssets, GeneratedObject, GeneratedSound, BgmPlan } from './types';

// BGMプリセット（各ムードに対応した音楽パラメータ）
const BGM_PRESETS: Record<string, { baseFreq: number; tempo: number; pattern: string }> = {
  upbeat: { baseFreq: 440, tempo: 140, pattern: 'bounce' },
  calm: { baseFreq: 330, tempo: 80, pattern: 'smooth' },
  tense: { baseFreq: 220, tempo: 120, pattern: 'pulse' },
  happy: { baseFreq: 523, tempo: 130, pattern: 'bounce' },
  mysterious: { baseFreq: 277, tempo: 90, pattern: 'drift' },
  energetic: { baseFreq: 392, tempo: 160, pattern: 'pulse' }
};

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

    // BGM生成
    const bgm = assetPlan.bgm ? this.generateBGM(assetPlan.bgm) : undefined;

    return {
      background,
      objects,
      sounds,
      bgm
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
   * BGM生成
   */
  private generateBGM(bgmPlan: BgmPlan): GeneratedAssets['bgm'] {
    const preset = BGM_PRESETS[bgmPlan.mood] || BGM_PRESETS.upbeat;
    const wavData = this.synthesizeBGM(preset, 10); // 10秒のループBGM

    console.log(`      ✅ BGM generated (mood: ${bgmPlan.mood})`);

    return {
      id: bgmPlan.id,
      name: bgmPlan.description || 'Background Music',
      data: wavData
    };
  }

  /**
   * BGM合成（シンプルなループ音楽を生成）
   */
  private synthesizeBGM(
    preset: { baseFreq: number; tempo: number; pattern: string },
    durationSeconds: number
  ): string {
    const sampleRate = 44100;
    const numSamples = Math.floor(sampleRate * durationSeconds);
    const buffer = new Float32Array(numSamples);

    const beatsPerSecond = preset.tempo / 60;
    const samplesPerBeat = sampleRate / beatsPerSecond;

    // 和音の周波数比（メジャーコード）
    const chordRatios = [1, 1.25, 1.5]; // ルート、3度、5度

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const beatPosition = (i % samplesPerBeat) / samplesPerBeat;
      const measurePosition = ((i / samplesPerBeat) % 4) / 4;

      let sample = 0;

      // ベースライン
      const bassFreq = preset.baseFreq / 2;
      sample += Math.sin(2 * Math.PI * bassFreq * t) * 0.2;

      // コード（パターンに応じて）
      for (const ratio of chordRatios) {
        const chordFreq = preset.baseFreq * ratio;
        let chordVolume = 0.1;

        switch (preset.pattern) {
          case 'bounce':
            chordVolume = 0.1 * (1 - beatPosition * 0.5);
            break;
          case 'smooth':
            chordVolume = 0.08;
            break;
          case 'pulse':
            chordVolume = beatPosition < 0.25 ? 0.12 : 0.05;
            break;
          case 'drift':
            chordVolume = 0.08 * (0.5 + 0.5 * Math.sin(measurePosition * Math.PI * 2));
            break;
        }

        sample += Math.sin(2 * Math.PI * chordFreq * t) * chordVolume;
      }

      // メロディライン（シンプルなアルペジオ）
      const melodyIndex = Math.floor((i / samplesPerBeat) % 4);
      const melodyRatios = [1, 1.5, 2, 1.5];
      const melodyFreq = preset.baseFreq * melodyRatios[melodyIndex];
      const melodyEnvelope = Math.exp(-beatPosition * 3);
      sample += Math.sin(2 * Math.PI * melodyFreq * t) * 0.08 * melodyEnvelope;

      // フェードイン/フェードアウト
      const fadeInSamples = sampleRate * 0.5;
      const fadeOutSamples = sampleRate * 0.5;
      let fadeMultiplier = 1;
      if (i < fadeInSamples) {
        fadeMultiplier = i / fadeInSamples;
      } else if (i > numSamples - fadeOutSamples) {
        fadeMultiplier = (numSamples - i) / fadeOutSamples;
      }

      buffer[i] = sample * fadeMultiplier * 0.6; // 全体音量調整
    }

    return this.floatArrayToWavBase64(buffer, sampleRate);
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
    // 背景スタイルのバリエーション
    const bgStyleVariations = this.getBackgroundStyle(bgPlan.mood, concept.visualStyle);

    return `Mobile game background for "${concept.theme}":
Scene: ${bgPlan.description}
Mood: ${bgPlan.mood}
Style: ${concept.visualStyle}

BACKGROUND STYLE:
${bgStyleVariations}

CRITICAL REQUIREMENTS:
- NO characters, NO game objects, NO icons, NO UI elements, NO text
- Central area (middle 60% of screen) must be clear for game objects
- Vertical mobile format composition (portrait orientation)
- Depth through atmospheric perspective

FORBIDDEN:
- No foreground elements that would overlap with game objects
- No busy patterns in the central play area
- No photorealistic style (unless specifically requested)`;
  }

  /**
   * 背景スタイルのバリエーション生成
   * 固定的な背景ではなく、moodとstyleに基づいて多様な背景を生成
   */
  private getBackgroundStyle(mood: string, visualStyle: string): string {
    const moodStyles: Record<string, string> = {
      '緊張': `
- Dark, dramatic lighting with deep shadows
- Muted color palette with occasional red or orange accents
- Subtle vignette effect around edges
- Architectural or industrial elements in background`,
      '楽しい': `
- Bright, cheerful colors with warm lighting
- Playful shapes and patterns (polka dots, stripes, confetti)
- Soft pastel or vivid saturated colors
- Whimsical elements (clouds, stars, balloons) in corners`,
      '神秘的': `
- Deep blues and purples with glowing accents
- Starfield or cosmic patterns
- Ethereal mist or aurora effects
- Ancient symbols or magical runes as subtle decoration`,
      '和風': `
- Traditional Japanese color palette (indigo, vermillion, gold)
- Subtle paper texture or watercolor effect
- Cherry blossoms, waves, or cloud patterns
- Asymmetric composition with empty space (ma)`,
      'ポップ': `
- Bold, saturated colors with high contrast
- Geometric patterns (circles, triangles, zigzags)
- Gradient transitions between bright colors
- Memphis-style decorative elements`,
      'ナチュラル': `
- Earthy tones with natural lighting
- Organic textures (wood grain, stone, leaves)
- Soft gradients mimicking sky or water
- Nature elements (trees, flowers) at edges`,
      'レトロ': `
- Vintage color palette (orange, teal, cream)
- Halftone dots or scan line effects
- Retro typography-inspired patterns
- Nostalgic textures (old paper, worn edges)`,
      'サイバー': `
- Neon colors on dark backgrounds
- Digital grid or circuit patterns
- Glowing lines and holographic effects
- Futuristic cityscape silhouettes`,
    };

    // moodまたはvisualStyleに基づいてスタイルを選択
    const selectedStyle = moodStyles[mood] || moodStyles[visualStyle] ||
      `- Soft gradients with subtle patterns
- Muted, desaturated colors
- Minimal decoration, focus on atmosphere
- Clean, modern digital illustration style`;

    return selectedStyle;
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

    // スタイルシート情報を構築
    const styleSheet = this.buildStyleSheet(concept);

    return `Game sprite object for mobile game: ${objPlan.visualDescription}

PURPOSE: ${objPlan.purpose}
SIZE: ${sizeDesc}
STYLE: ${concept.visualStyle}

${styleSheet}

CRITICAL REQUIREMENTS:
- MUST have fully transparent background (PNG with alpha channel)
- Clear, distinct silhouette that's easily recognizable
- Bold colors and strong contrast for visibility
- Simple, clean design suitable for mobile game

VIEW REQUIREMENTS (VERY IMPORTANT):
- FRONT-FACING VIEW ONLY - show the object from the front/main angle
- NOT a technical drawing, NOT a blueprint, NOT a 3D model sheet
- NOT multi-angle view, NOT orthographic projection, NOT isometric
- NOT a diagram or schematic
- Just ONE single view of the object as it would appear in game

FORBIDDEN:
- NO background elements
- NO shadows on ground
- NO text or labels
- NO multiple views of the same object
- NO construction lines or measurements
- NO top/side/front view combinations

OUTPUT:
- Single isolated object, centered in frame
- Cartoon/game art style, not photorealistic
- Ready to use as a game sprite`;
  }

  /**
   * スタイルシート生成
   * 全オブジェクトで統一感を持たせるためのスタイル情報
   */
  private buildStyleSheet(concept: GameConcept): string {
    // テーマに基づいた色パレットを提案
    const colorPalettes: Record<string, string> = {
      '和風': 'Primary: crimson red (#DC143C), Secondary: gold (#FFD700), Accent: deep navy (#1B2838)',
      'ポップ': 'Primary: hot pink (#FF69B4), Secondary: cyan (#00FFFF), Accent: lime (#32CD32)',
      'ファンタジー': 'Primary: royal purple (#7B68EE), Secondary: gold (#FFD700), Accent: emerald (#50C878)',
      'レトロ': 'Primary: orange (#FF8C00), Secondary: teal (#008080), Accent: cream (#FFFDD0)',
      'サイバー': 'Primary: neon blue (#00BFFF), Secondary: magenta (#FF00FF), Accent: black (#000000)',
      'ナチュラル': 'Primary: forest green (#228B22), Secondary: earth brown (#8B4513), Accent: sky blue (#87CEEB)',
    };

    // デフォルトパレット
    const palette = colorPalettes[concept.visualStyle] ||
      'Primary: bright and saturated, Secondary: complementary, Accent: contrasting';

    return `STYLE SHEET (apply to ALL sprites in this game):
Color Palette: ${palette}
Line Style: ${concept.visualStyle.includes('フラット') ? 'no outlines, flat colors' : 'bold 2-3px outlines, clean edges'}
Texture: ${concept.visualStyle.includes('リアル') ? 'subtle texture allowed' : 'flat colors, minimal gradients'}
Shape Language: ${concept.visualStyle.includes('かわいい') || concept.visualStyle.includes('ポップ') ? 'rounded, soft curves' : 'geometric, clean shapes'}`;
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
