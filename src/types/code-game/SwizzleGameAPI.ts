export interface TextDrawOpts {
  size?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  font?: string;
  bold?: boolean;
}

export interface SpriteDrawOpts {
  flipX?: boolean;
  flipY?: boolean;
  alpha?: number;
  anchor?: 'topleft' | 'center';
}

export interface ToneOpts {
  wave?: 'square' | 'triangle' | 'sawtooth' | 'sine';
  volume?: number;
  /** Hz を dur かけて加算(ジャンプ音などのピッチスライド) */
  slide?: number;
}

/** 音符: 音名('C4','F#3','Bb2')またはHz。'R'=休符。[note, 拍数] または note 単体(1拍) */
export type MelodyNote = string | number | [string | number, number];

export interface MelodyOpts {
  tempo?: number;
  wave?: 'square' | 'triangle' | 'sawtooth' | 'sine';
  volume?: number;
  loop?: boolean;
  bass?: MelodyNote[];
  bassWave?: 'square' | 'triangle' | 'sawtooth' | 'sine';
  bassVolume?: number;
}

export interface BurstOpts {
  color?: string;
  count?: number;
  speed?: number;
  size?: number;
  life?: number;
  gravity?: number;
}

export interface PopupOpts {
  color?: string;
  size?: number;
  life?: number;
  rise?: number;
}

export interface FeedbackOpts {
  /** ポップアップ文言。null で非表示 */
  text?: string | null;
  color?: string;
  size?: number;
  count?: number;
  sound?: string;
  volume?: number;
  flashColor?: string;
  shake?: number;
}

export interface TouchPoint {
  id: number | string;
  x: number;
  y: number;
}

export interface GameEndStats {
  [key: string]: number | string;
}

export interface SwizzleGameAPI {
  readonly canvas: { width: number; height: number };
  readonly time: { elapsed: number; delta: number };
  /** このゲームの過去ベストスコア(INIT contextで注入、無ければ0) */
  readonly best: number;
  /** 主タッチの現在状態(押しっぱなし移動用) */
  readonly input: { pressing: boolean; x: number; y: number };
  /** アクティブな全タッチ(マルチタッチ・2人対戦用) */
  readonly touches: TouchPoint[];

  onStart(fn: () => void): void;
  onUpdate(fn: (dt: number) => void): void;

  onTap(fn: (x: number, y: number) => void): void;
  onSwipe(fn: (dir: 'up' | 'down' | 'left' | 'right') => void): void;
  onHold(fn: (x: number, y: number, duration: number) => void): void;
  onPress(fn: (x: number, y: number, id: number | string) => void): void;
  onRelease(fn: (x: number, y: number, id: number | string) => void): void;
  onMove(fn: (x: number, y: number, id: number | string) => void): void;

  draw: {
    clear(color?: string): void;
    image(id: string, x: number, y: number, w: number, h: number, rotation?: number): void;
    rect(x: number, y: number, w: number, h: number, color: string, alpha?: number): void;
    circle(x: number, y: number, r: number, color: string, alpha?: number): void;
    text(str: string, x: number, y: number, opts?: TextDrawOpts): void;
    line(x1: number, y1: number, x2: number, y2: number, color: string, lineWidth?: number): void;
    /** 文字列ビットマップ+パレットのピクセルスプライト(オフスクリーンキャッシュ付き) */
    sprite(art: string[], palette: Record<string, string>, x: number, y: number, px?: number, opts?: SpriteDrawOpts): void;
    /** 縦グラデーション矩形(y0→y1、全幅)。stops: 色配列 or [位置0-1, 色] 配列 */
    gradient(y0: number, y1: number, stops: string[] | Array<[number, string]>): void;
  };

  fx: {
    burst(x: number, y: number, opts?: BurstOpts): void;
    popup(text: string | number, x: number, y: number, opts?: PopupOpts): void;
    flash(color?: string, dur?: number): void;
    shake(intensity?: number, dur?: number): void;
  };

  /** 行動フィードバックの標準文法: プレイヤーの操作の結果を1呼び出しで提示 */
  feedback: {
    good(x?: number, y?: number, opts?: FeedbackOpts): void;
    bad(x?: number, y?: number, opts?: FeedbackOpts): void;
  };

  hit: {
    circle(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): boolean;
    rect(x1: number, y1: number, w1: number, h1: number, x2: number, y2: number, w2: number, h2: number): boolean;
  };

  audio: {
    play(id: string, volume?: number): void;
    bgm(id: string, volume?: number): void;
    stopBgm(): void;
    /** 単音合成(チップチューン)。freq は Hz または音名 */
    tone(freq: number | string, dur: number, opts?: ToneOpts): void;
    /** メロディ合成。loop:true でBGMとして登録(stopBgmで停止) */
    melody(notes: MelodyNote[], opts?: MelodyOpts): void;
  };

  end: {
    success(score?: number, stats?: GameEndStats): void;
    failure(stats?: GameEndStats): void;
  };

  random(min: number, max: number): number;
}

export interface CodeGameAsset {
  id: string;
  name: string;
  dataUrl?: string;
  storageUrl?: string;
}

export interface CodeGameAudioAsset {
  id: string;
  dataUrl?: string;
  storageUrl?: string;
}

export interface CodeGameAssets {
  background?: CodeGameAsset | null;
  objects: CodeGameAsset[];
  audio: {
    bgm?: CodeGameAudioAsset | null;
    se: CodeGameAudioAsset[];
  };
}

export interface CodeGameProject {
  id: string;
  name: string;
  gameType: 'code';
  code: string;
  settings: {
    duration: { type: 'fixed' | 'unlimited'; seconds?: number; maxSeconds?: number };
    difficulty: 'easy' | 'normal' | 'hard';
    publishing: {
      isPublished: boolean;
      visibility: 'public' | 'unlisted' | 'private';
      allowComments: boolean;
      allowRemix: boolean;
      tags?: string[];
      category?: string;
    };
  };
  assets: CodeGameAssets;
  generatedBy?: 'claude' | 'openai' | 'human';
  createdAt: string;
  lastModified: string;
}
