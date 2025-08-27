// RainbowMatchGame.ts
// Drop-in short game template (PixiJS + TypeScript)
// Register under key 'rainbow_match' in your factory/registry.
//
// Gameplay:
// - A rule tells you what to match: MEANING (word) or INK (font color).
// - A target (e.g., "BLUE") is shown. Several tiles show color names with colored fills.
// - Tap the tile that satisfies the current rule. Reach target hits before time runs out.
//
// Project compatibility:
// - Do NOT narrow base types: import GameTemplate & GameSettings only.
// - Do NOT redeclare base fields like duration/difficulty/timerText.
// - Use an internal `finished` flag (avoid assuming a specific GameState union).
// - Emit results via `onGameEnd(success, score)`.
import { Application, Container, Graphics, Text, FederatedPointerEvent } from 'pixi.js';
import { GameTemplate, type GameSettings } from './GameTemplate';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface RainbowMatchSettings extends GameSettings {
  options?: number;          // number of option tiles per round (default by difficulty)
  targetHits?: number;       // hits required to clear (default by difficulty)
  mode?: 'meaning' | 'ink' | 'mixed'; // selection rule policy (default 'mixed')
  palette?: 'classic' | 'warm' | 'cool'; // optional color set
}

// ---- helpers ----
function isDifficulty(v: unknown): v is Difficulty { return v === 'easy' || v === 'normal' || v === 'hard'; }
function getDifficulty(settings: GameSettings): Difficulty {
  const d = (settings as any).difficulty;
  return isDifficulty(d) ? d : 'normal';
}
function secondsToMs(s: number | undefined, fallbackMs: number) {
  if (typeof s === 'number' && isFinite(s)) return Math.max(1000, Math.round(s * 1000));
  return fallbackMs;
}
function clamp(x: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, x)); }
function shuffle<T>(arr: T[]) { for (let i = arr.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

type ColorDef = { name: string; hex: number; };

const PALETTES: Record<string, ColorDef[]> = {
  classic: [
    { name: 'RED',    hex: 0xef4444 },
    { name: 'BLUE',   hex: 0x3b82f6 },
    { name: 'GREEN',  hex: 0x22c55e },
    { name: 'YELLOW', hex: 0xf59e0b },
    { name: 'PURPLE', hex: 0xa855f7 },
    { name: 'PINK',   hex: 0xec4899 },
  ],
  warm: [
    { name: 'ORANGE', hex: 0xf97316 },
    { name: 'RED',    hex: 0xef4444 },
    { name: 'PINK',   hex: 0xec4899 },
    { name: 'YELLOW', hex: 0xf59e0b },
    { name: 'BROWN',  hex: 0x8b5a2b },
    { name: 'PURPLE', hex: 0xa855f7 },
  ],
  cool: [
    { name: 'BLUE',    hex: 0x3b82f6 },
    { name: 'CYAN',    hex: 0x06b6d4 },
    { name: 'GREEN',   hex: 0x22c55e },
    { name: 'TEAL',    hex: 0x14b8a6 },
    { name: 'INDIGO',  hex: 0x6366f1 },
    { name: 'PURPLE',  hex: 0xa855f7 },
  ],
};

type Tile = {
  root: Container;
  bg: Graphics;
  label: Text;
  fillHex: number;
  name: string;
  index: number;
};

export class RainbowMatchGame extends GameTemplate {
  public onGameEnd?: (success: boolean, score: number) => void;

  private scene = new Container();
  private finished = false;
  private remainMs = 30_000;

  // UI
  private ruleText!: Text;
  private cueText!: Text;
  private tiles: Tile[] = [];

  // layout
  private cols = 2;
  private rows = 2;
  private tileW = 180;
  private tileH = 140;
  private gapX = 20;
  private gapY = 16;

  // runtime
  private palette: ColorDef[] = PALETTES.classic;
  private mode: 'meaning' | 'ink' | 'mixed' = 'mixed';
  private options = 4;
  private targetHits = 10;
  private hits = 0;
  private misses = 0;
  private missesAllowed = 3;
  private correctIndex = 0;
  private currentRule: 'meaning' | 'ink' = 'meaning';
  private targetColor!: ColorDef;

  // scoring
  private score = 0;
  private combo = 0;

  constructor(app: Application, settings: RainbowMatchSettings) {
    super(app, settings);
  }

  async createScene(): Promise<void> {
    const s = (this as any).settings as RainbowMatchSettings;
    const diff = getDifficulty(s);
    const W = this.app.renderer.width, H = this.app.renderer.height;

    // duration
    this.remainMs = secondsToMs((s as any).duration as number, 30_000);

    // difficulty presets
    if (diff === 'easy') { this.options = 3; this.targetHits = 8; this.missesAllowed = 4; }
    else if (diff === 'hard') { this.options = 5; this.targetHits = 12; this.missesAllowed = 2; }
    else { this.options = 4; this.targetHits = 10; this.missesAllowed = 3; }

    // user overrides
    if (typeof s.options === 'number' && isFinite(s.options)) this.options = clamp(Math.round(s.options), 3, 6);
    if (typeof s.targetHits === 'number' && isFinite(s.targetHits)) this.targetHits = clamp(Math.round(s.targetHits), 4, 30);
    this.mode = s.mode ?? 'mixed';
    this.palette = PALETTES[s.palette ?? 'classic'] ?? PALETTES.classic;

    // layout grid
    this.cols = Math.ceil(Math.sqrt(this.options));
    this.rows = Math.ceil(this.options / this.cols);
    const usableW = W - 80;
    const usableH = H - 220;
    this.tileW = Math.min(220, Math.floor(usableW / this.cols) - 16);
    this.tileH = Math.min(160, Math.floor(usableH / this.rows) - 16);
    this.gapX = Math.max(12, Math.floor((usableW - this.cols * this.tileW) / (this.cols + 1)));
    this.gapY = Math.max(10, Math.floor((usableH - this.rows * this.tileH) / (this.rows + 1)));

    // background
    const bg = new Graphics();
    bg.beginFill(0x0b1020); bg.drawRect(0,0,W,H); bg.endFill();
    this.scene.addChild(bg);

    // rule + cue
    this.ruleText = new Text('Rule: MEANING', {
      fontFamily: 'sans-serif', fontSize: Math.floor(Math.min(W,H) * 0.05),
      fill: 0xffffff, stroke: 0x000000, strokeThickness: 4,
    });
    this.ruleText.anchor.set(0.5, 0.5);
    this.ruleText.x = W/2; this.ruleText.y = 40 + this.ruleText.height/2;
    this.scene.addChild(this.ruleText);

    this.cueText = new Text('BLUE', {
      fontFamily: 'sans-serif', fontSize: Math.floor(Math.min(W,H) * 0.1),
      fill: 0xffffff, stroke: 0x000000, strokeThickness: 6,
    });
    this.cueText.anchor.set(0.5, 0.5);
    this.cueText.x = W/2; this.cueText.y = Math.floor(H * 0.28);
    this.scene.addChild(this.cueText);

    // build tiles
    for (let i=0;i<this.options;i++) {
      const root = new Container();
      const bgTile = new Graphics();
      const label = new Text('COLOR', { fontFamily: 'sans-serif', fontSize: Math.floor(this.tileH*0.38), fill: 0x111111 });
      label.anchor.set(0.5);
      bgTile.beginFill(0xffffff, 0.95);
      bgTile.drawRoundedRect(-this.tileW/2, -this.tileH/2, this.tileW, this.tileH, 16);
      bgTile.endFill();
      root.addChild(bgTile, label);
      root.eventMode = 'static';
      const idx = i;
      root.on('pointertap', (e: FederatedPointerEvent) => { e.stopPropagation(); this.onTap(idx); });
      this.scene.addChild(root);
      this.tiles.push({ root, bg: bgTile, label, fillHex: 0xffffff, name: 'COLOR', index: idx });
    }

    this.positionTiles(W, H);

    this.container.addChild(this.scene);

    // start first round
    this.nextRound(true);
  }

  handleInput(_e: FederatedPointerEvent): void {
    // not used
  }

  updateGame(deltaTime: number): void {
    if (this.finished) return;
    const dtMs = deltaTime * (1000 / 60);
    this.remainMs -= dtMs;
    if (this.remainMs <= 0) {
      this.remainMs = 0;
      this.finish(this.hits >= this.targetHits);
      return;
    }
  }

  protected showResult(result: { success: boolean; score: number }): void {
    this.onGameEnd?.(result.success, result.score);
  }

  // ---- internals ----
  private positionTiles(W: number, H: number) {
    const startX = (W - (this.cols * this.tileW + (this.cols - 1) * this.gapX)) / 2 + this.tileW/2;
    const startY = Math.floor(H * 0.46);
    for (let i = 0; i < this.tiles.length; i++) {
      const c = i % this.cols;
      const r = Math.floor(i / this.cols);
      const x = startX + c * (this.tileW + this.gapX);
      const y = startY + r * (this.tileH + this.gapY);
      const t = this.tiles[i];
      t.root.x = x; t.root.y = y;
    }
  }

  private nextRound(first = false) {
    // choose rule
    this.currentRule = (this.mode === 'mixed') ? (Math.random() < 0.5 ? 'meaning' : 'ink') : this.mode;
    this.ruleText.text = 'Rule: ' + (this.currentRule === 'meaning' ? 'MEANING (word)' : 'INK (color)');
    // choose target color name
    const palette = this.palette.slice();
    shuffle(palette);
    this.targetColor = palette[0];
    // cue text with possibly incongruent ink color to mislead
    const incongruent = palette[1];
    this.cueText.text = this.targetColor.name;
    this.cueText.style = {
      fontFamily: 'sans-serif',
      fontSize: this.cueText.style['fontSize'] || Math.floor(Math.min(this.app.renderer.width, this.app.renderer.height) * 0.1),
      fill: (this.currentRule === 'ink') ? incongruent.hex : 0xffffff,
      stroke: 0x000000, strokeThickness: 6,
    };

    // Build options so that exactly one is correct per rule
    const options: { name: string; hex: number }[] = [];
    // Ensure correct one present
    if (this.currentRule === 'meaning') {
      options.push({ name: this.targetColor.name, hex: palette[1]?.hex ?? this.targetColor.hex }); // word matches, ink may differ
    } else {
      options.push({ name: palette[1]?.name ?? this.targetColor.name, hex: this.targetColor.hex }); // ink matches, word may differ
    }
    // Fill rest with mismatches
    let idx = 2;
    while (options.length < this.options) {
      const p = palette[idx % palette.length];
      const alt = { name: p.name, hex: palette[(idx+1) % palette.length].hex };
      // prevent accidental correct duplicates
      if (this.currentRule === 'meaning') {
        if (alt.name === this.targetColor.name) { idx++; continue; }
      } else {
        if (alt.hex === this.targetColor.hex) { idx++; continue; }
      }
      options.push(alt);
      idx++;
    }
    shuffle(options);

    // assign to tiles and find correctIndex
    this.correctIndex = 0;
    for (let i = 0; i < this.tiles.length; i++) {
      const t = this.tiles[i];
      const o = options[i];
      t.fillHex = o.hex; t.name = o.name;
      t.bg.clear();
      t.bg.beginFill(o.hex, 0.95);
      t.bg.drawRoundedRect(-this.tileW/2, -this.tileH/2, this.tileW, this.tileH, 16);
      t.bg.endFill();
      t.label.text = o.name;
      t.label.style = { fontFamily: 'sans-serif', fontSize: Math.floor(this.tileH*0.34), fill: 0x111111, stroke: 0xffffff, strokeThickness: 2 };
      // determine correctness
      const isCorrect = (this.currentRule === 'meaning') ? (o.name === this.targetColor.name) : (o.hex === this.targetColor.hex);
      if (isCorrect) this.correctIndex = i;
    }
  }

  private onTap(idx: number) {
    if (this.finished) return;
    const correct = (idx === this.correctIndex);
    if (correct) {
      this.hits++;
      this.combo++;
      const fastBonus = 60; // lightweight constant; can expand to time-based if desired
      const base = 300;
      this.score += base + Math.min(8, this.combo) * 50 + fastBonus;
      // visual flash on correct tile
      this.flashTile(this.tiles[idx], 0x92e6a7);
      if (this.hits >= this.targetHits) {
        this.finish(true);
        return;
      }
      setTimeout(() => this.nextRound(), 120);
    } else {
      this.combo = 0;
      this.misses++;
      this.score = Math.max(0, this.score - 120);
      this.flashTile(this.tiles[idx], 0xff5a5a);
      if (this.misses > this.missesAllowed) {
        this.finish(false);
        return;
      }
    }
  }

  private flashTile(tile: Tile, color: number) {
    const g = new Graphics();
    g.beginFill(color, 0.28);
    g.drawRoundedRect(-this.tileW/2, -this.tileH/2, this.tileW, this.tileH, 16);
    g.endFill();
    g.x = tile.root.x; g.y = tile.root.y;
    this.scene.addChild(g);
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      setTimeout(() => { g.alpha = Math.max(0, 0.28 * (1 - i/steps)); if (i === steps) this.scene.removeChild(g); }, i * 30);
    }
  }

  private finish(success: boolean) {
    if (this.finished) return;
    this.finished = true;
    const timeBonus = Math.round(this.remainMs / 8);
    const hitBonus = this.hits * 80;
    const missPenalty = this.misses * 100;
    const score = Math.max(0, this.score + timeBonus + hitBonus - missPenalty + (success ? 700 : 0));
    this.onGameEnd?.(success, score);
  }
}
