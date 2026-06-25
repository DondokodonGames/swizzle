export interface TextDrawOpts {
  size?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  font?: string;
  bold?: boolean;
}

export interface SwizzleGameAPI {
  readonly canvas: { width: number; height: number };
  readonly time: { elapsed: number; delta: number };

  onStart(fn: () => void): void;
  onUpdate(fn: (dt: number) => void): void;

  onTap(fn: (x: number, y: number) => void): void;
  onSwipe(fn: (dir: 'up' | 'down' | 'left' | 'right') => void): void;
  onHold(fn: (x: number, y: number, duration: number) => void): void;

  draw: {
    clear(color?: string): void;
    image(id: string, x: number, y: number, w: number, h: number, rotation?: number): void;
    rect(x: number, y: number, w: number, h: number, color: string, alpha?: number): void;
    circle(x: number, y: number, r: number, color: string, alpha?: number): void;
    text(str: string, x: number, y: number, opts?: TextDrawOpts): void;
    line(x1: number, y1: number, x2: number, y2: number, color: string, lineWidth?: number): void;
  };

  audio: {
    play(id: string, volume?: number): void;
    bgm(id: string, volume?: number): void;
    stopBgm(): void;
  };

  end: {
    success(score?: number): void;
    failure(): void;
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
