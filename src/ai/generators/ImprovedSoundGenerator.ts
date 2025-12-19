/**
 * ImprovedSoundGenerator
 *
 * プリセット音声を活用した効果音生成システム
 * Web Audio APIで動的に効果音を生成
 */

import { AudioAsset } from '../../types/editor/ProjectAssets';
import { GameIdea } from './GameIdeaGenerator';

// 効果音タイプ
export type SoundEffectType =
  | 'tap'        // タップ音
  | 'success'    // 成功音
  | 'failure'    // 失敗音
  | 'collect'    // アイテム取得
  | 'pop'        // ポップ音
  | 'whoosh'     // スワイプ音
  | 'ding'       // 正解音
  | 'buzz'       // 不正解音
  | 'bounce'     // バウンド音
  | 'splash';    // 水しぶき音

// BGMタイプ
export type BGMType =
  | 'happy'      // 楽しい
  | 'exciting'   // エキサイティング
  | 'calm'       // 穏やか
  | 'tense'      // 緊張
  | 'cute';      // かわいい

// サウンドアセットセット
export interface SoundAssets {
  bgm: AudioAsset | null;
  effects: AudioAsset[];
}

/**
 * Web Audio APIで効果音を生成するユーティリティ
 */
class SoundSynthesizer {
  private audioContext: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  /**
   * 基本的なトーンを生成
   */
  async generateTone(
    frequency: number,
    duration: number,
    waveType: OscillatorType = 'sine',
    envelope: { attack: number; decay: number; sustain: number; release: number }
  ): Promise<AudioBuffer> {
    const ctx = this.getContext();
    const sampleRate = ctx.sampleRate;
    const totalSamples = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, totalSamples, sampleRate);
    const data = buffer.getChannelData(0);

    const { attack, decay, sustain, release } = envelope;
    const attackSamples = Math.floor(sampleRate * attack);
    const decaySamples = Math.floor(sampleRate * decay);
    const releaseSamples = Math.floor(sampleRate * release);
    const sustainSamples = totalSamples - attackSamples - decaySamples - releaseSamples;

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      let amplitude = 0;

      // エンベロープ計算
      if (i < attackSamples) {
        amplitude = i / attackSamples;
      } else if (i < attackSamples + decaySamples) {
        const decayProgress = (i - attackSamples) / decaySamples;
        amplitude = 1 - decayProgress * (1 - sustain);
      } else if (i < attackSamples + decaySamples + sustainSamples) {
        amplitude = sustain;
      } else {
        const releaseProgress = (i - attackSamples - decaySamples - sustainSamples) / releaseSamples;
        amplitude = sustain * (1 - releaseProgress);
      }

      // 波形生成
      let wave = 0;
      switch (waveType) {
        case 'sine':
          wave = Math.sin(2 * Math.PI * frequency * t);
          break;
        case 'square':
          wave = Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1;
          break;
        case 'sawtooth':
          wave = 2 * ((frequency * t) % 1) - 1;
          break;
        case 'triangle':
          wave = 2 * Math.abs(2 * ((frequency * t) % 1) - 1) - 1;
          break;
      }

      data[i] = wave * amplitude * 0.5;
    }

    return buffer;
  }

  /**
   * AudioBufferをBase64に変換
   */
  async bufferToBase64(buffer: AudioBuffer): Promise<string> {
    // WAVフォーマットでエンコード
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2;
    const sampleRate = buffer.sampleRate;

    const wavBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(wavBuffer);

    // WAVヘッダー
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numOfChan, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numOfChan * 2, true);
    view.setUint16(32, numOfChan * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);

    // オーディオデータ
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numOfChan; channel++) {
        const sample = buffer.getChannelData(channel)[i];
        const intSample = Math.max(-1, Math.min(1, sample)) * 32767;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }

    // Base64エンコード
    const bytes = new Uint8Array(wavBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return 'data:audio/wav;base64,' + btoa(binary);
  }
}

/**
 * ImprovedSoundGenerator
 */
export class ImprovedSoundGenerator {
  private synthesizer: SoundSynthesizer;

  // 効果音プリセット定義
  private readonly EFFECT_PRESETS: Record<SoundEffectType, {
    frequency: number;
    duration: number;
    waveType: OscillatorType;
    envelope: { attack: number; decay: number; sustain: number; release: number };
  }> = {
    tap: {
      frequency: 800,
      duration: 0.1,
      waveType: 'sine',
      envelope: { attack: 0.005, decay: 0.05, sustain: 0.1, release: 0.05 }
    },
    success: {
      frequency: 523,
      duration: 0.5,
      waveType: 'sine',
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.6, release: 0.3 }
    },
    failure: {
      frequency: 200,
      duration: 0.4,
      waveType: 'sawtooth',
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.1 }
    },
    collect: {
      frequency: 880,
      duration: 0.15,
      waveType: 'sine',
      envelope: { attack: 0.005, decay: 0.05, sustain: 0.2, release: 0.1 }
    },
    pop: {
      frequency: 600,
      duration: 0.1,
      waveType: 'sine',
      envelope: { attack: 0.001, decay: 0.05, sustain: 0.0, release: 0.05 }
    },
    whoosh: {
      frequency: 400,
      duration: 0.2,
      waveType: 'sawtooth',
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.1, release: 0.08 }
    },
    ding: {
      frequency: 1047,
      duration: 0.3,
      waveType: 'sine',
      envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.2 }
    },
    buzz: {
      frequency: 150,
      duration: 0.3,
      waveType: 'square',
      envelope: { attack: 0.01, decay: 0.15, sustain: 0.1, release: 0.05 }
    },
    bounce: {
      frequency: 300,
      duration: 0.15,
      waveType: 'sine',
      envelope: { attack: 0.005, decay: 0.08, sustain: 0.05, release: 0.02 }
    },
    splash: {
      frequency: 500,
      duration: 0.25,
      waveType: 'triangle',
      envelope: { attack: 0.01, decay: 0.15, sustain: 0.05, release: 0.05 }
    }
  };

  constructor() {
    this.synthesizer = new SoundSynthesizer();
    console.log('🔊 ImprovedSoundGenerator initialized');
  }

  /**
   * ゲームアイデアに基づいて効果音セットを生成
   */
  async generateForGame(idea: GameIdea): Promise<SoundAssets> {
    console.log(`🎵 Generating sounds for: ${idea.title}`);

    const effects: AudioAsset[] = [];

    // 基本効果音を常に生成
    const baseEffects: SoundEffectType[] = ['tap', 'success', 'failure'];

    // メカニクスに応じて追加効果音
    const mechanicEffects = this.getEffectsForMechanic(idea.mainMechanic);
    const allEffects = [...new Set([...baseEffects, ...mechanicEffects])];

    for (const effectType of allEffects) {
      try {
        const effect = await this.generateEffect(effectType);
        effects.push(effect);
      } catch (error) {
        console.warn(`効果音生成失敗: ${effectType}`, error);
      }
    }

    // BGMは現時点ではnull（今後実装）
    return {
      bgm: null,
      effects
    };
  }

  /**
   * メカニクスに対応する効果音を取得
   */
  private getEffectsForMechanic(mechanic: string): SoundEffectType[] {
    const mechanicEffects: Record<string, SoundEffectType[]> = {
      'tap-target': ['pop', 'collect'],
      'tap-avoid': ['buzz', 'whoosh'],
      'catch-falling': ['collect', 'bounce'],
      'dodge-moving': ['whoosh', 'buzz'],
      'collect-items': ['collect', 'ding'],
      'timing-action': ['ding', 'buzz'],
      'reaction-test': ['ding', 'buzz'],
      'swipe-direction': ['whoosh'],
      'drag-drop': ['pop', 'bounce'],
      'tap-sequence': ['ding', 'pop'],
      'match-pattern': ['ding', 'buzz'],
      'count-objects': ['ding'],
      'find-different': ['ding', 'buzz'],
      'memory-match': ['ding', 'buzz', 'pop'],
      'chase-target': ['whoosh', 'collect'],
      'protect-target': ['buzz', 'splash'],
      'balance-game': ['bounce', 'buzz'],
      'hold-release': ['whoosh', 'pop'],
      'tap-rhythm': ['ding', 'pop']
    };

    return mechanicEffects[mechanic] || [];
  }

  /**
   * 単一の効果音を生成
   */
  async generateEffect(type: SoundEffectType): Promise<AudioAsset> {
    const preset = this.EFFECT_PRESETS[type];

    try {
      const buffer = await this.synthesizer.generateTone(
        preset.frequency,
        preset.duration,
        preset.waveType,
        preset.envelope
      );

      const dataUrl = await this.synthesizer.bufferToBase64(buffer);

      return {
        id: `se_${type}_${Date.now()}`,
        name: type,
        dataUrl,
        originalName: `${type}.wav`,
        duration: preset.duration,
        fileSize: Math.floor(preset.duration * 44100 * 2), // 概算
        format: 'wav',
        uploadedAt: new Date().toISOString(),
        volume: 1.0,
        loop: false
      };
    } catch (error) {
      // フォールバック: 最小限のダミーデータ
      console.warn(`効果音生成フォールバック: ${type}`, error);
      return this.createFallbackEffect(type, preset.duration);
    }
  }

  /**
   * フォールバック用のダミー効果音
   */
  private createFallbackEffect(type: SoundEffectType, duration: number): AudioAsset {
    return {
      id: `se_${type}_${Date.now()}`,
      name: type,
      dataUrl: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=',
      originalName: `${type}.wav`,
      duration,
      fileSize: 44,
      format: 'wav',
      uploadedAt: new Date().toISOString(),
      volume: 1.0,
      loop: false
    };
  }

  /**
   * プリセット効果音をすべて生成（バッチ処理用）
   */
  async generateAllPresets(): Promise<Map<SoundEffectType, AudioAsset>> {
    const results = new Map<SoundEffectType, AudioAsset>();

    for (const type of Object.keys(this.EFFECT_PRESETS) as SoundEffectType[]) {
      const effect = await this.generateEffect(type);
      results.set(type, effect);
    }

    return results;
  }

  /**
   * コスト見積もり（Web Audio APIは無料）
   */
  estimateCost(): number {
    return 0;
  }

  /**
   * デバッグ情報
   */
  getDebugInfo(): object {
    return {
      availableEffects: Object.keys(this.EFFECT_PRESETS),
      estimatedCost: 0,
      description: 'Web Audio API based sound generator'
    };
  }
}

// デフォルトエクスポート
export default ImprovedSoundGenerator;
