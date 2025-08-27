// OppositeActionGame.ts
// Drop-in short game template (PixiJS + TypeScript)
// Register under key 'opposite_action' in your factory/registry.
//
// Gameplay summary:
// - The game shows a LEFT or RIGHT cue (text + arrow).
// - Player must tap the OPPOSITE side (right for LEFT cue, left for RIGHT cue).
// - Each cue has a short reaction window. Successes required before time runs out.
//
// Project compatibility notes:
// - Do NOT narrow base types; we import GameTemplate & GameSettings only.
// - Do NOT redeclare base fields like `duration` or `difficulty` here.
// - Internal `finished` flag avoids relying on a specific GameState union.
// - Results are emitted via `onGameEnd(success, score)`.
import { Application, Container, Graphics, Text, FederatedPointerEvent } from 'pixi.js';
import { GameTemplate, type GameSettings } from './GameTemplate';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface OppositeActionSettings extends GameSettings {
  rounds?: number;        // number of successful opposite taps needed (defaults by difficulty)
  windowMs?: number;      // reaction window per cue in ms (defaults by difficulty)
  missesAllowed?: number; // max misses before fail (defaults by difficulty)
  palette?: 'cool' | 'warm'; // optional color theme
}

// ---- helpers ----
function isDifficulty(v: unknown): v is Difficulty {
  return v === 'easy' || v === 'normal' || v === 'hard';
}
function getDifficulty(settings: GameSettings): Difficulty {
  const d = (settings as any).difficulty;
  return isDifficulty(d) ? d : 'normal';
}
function secondsToMs(s: number | undefined, fallbackMs: number) {
  if (typeof s === 'number' && isFinite(s)) return Math.max(1000, Math.round(s * 1000));
  return fallbackMs;
}
function clamp(x: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, x)); }

export class OppositeActionGame extends GameTemplate {
  public onGameEnd?: (success: boolean, score: number) => void;

  private scene = new Container();
  private finished = false;
  private remainMs = 30_000;

  // layout & UI
  private leftZone!: Graphics;
  private rightZone!: Graphics;
  private cueText!: Text;
  private cueArrow!: Graphics;

  // runtime
  private roundsNeeded = 10;
  private roundsDone = 0;
  private missesAllowed = 2;
  private misses = 0;
  private windowMs = 1200;
  private cueRemainMs = 0;
  private awaiting = false;
  private requiredSide: 'left' | 'right' = 'left'; // opposite of displayed cue
  private displayedSide: 'left' | 'right' = 'left';

  // scoring
  private score = 0;
  private combo = 0;

  // palette
  private colors = {
    bgTop: 0x0ea5e9,
    bgBottom: 0x022c44,
    left: 0x0ea5e9,
    right: 0xf97316,
    good: 0x92e6a7,
    bad: 0xff5a5a,
    text: 0xffffff,
  };

  constructor(app: Application, settings: OppositeActionSettings) {
    super(app, settings);
  }

  async createScene(): Promise<void> {
    const s = (this as any).settings as OppositeActionSettings;
    const diff = getDifficulty(s);

    // duration
    this.remainMs = secondsToMs((s as any).duration as number, 30_000);

    // difficulty presets
    if (diff === 'easy') {
      this.roundsNeeded = 8; this.windowMs = 1400; this.missesAllowed = 3;
    } else if (diff === 'hard') {
      this.roundsNeeded = 12; this.windowMs = 900; this.missesAllowed = 1;
    } else {
      this.roundsNeeded = 10; this.windowMs = 1200; this.missesAllowed = 2;
    }
    // user overrides
    if (typeof s.rounds === 'number' && isFinite(s.rounds)) this.roundsNeeded = clamp(Math.round(s.rounds), 4, 30);
    if (typeof s.windowMs === 'number' && isFinite(s.windowMs)) this.windowMs = clamp(Math.round(s.windowMs), 400, 4000);
    if (typeof s.missesAllowed === 'number' && isFinite(s.missesAllowed)) this.missesAllowed = clamp(Math.round(s.missesAllowed), 0, 10);
    if (s.palette === 'warm') {
      this.colors.bgTop = 0xffa94d; this.colors.bgBottom = 0x5a2a00;
      this.colors.left = 0xffc078; this.colors.right = 0xff8787;
    }

    const W = this.app.renderer.width, H = this.app.renderer.height;

    // background (simple split tint)
    const bg = new Graphics();
    bg.beginFill(this.colors.bgTop); bg.drawRect(0, 0, W, H/2); bg.endFill();
    bg.beginFill(this.colors.bgBottom); bg.drawRect(0, H/2, W, H/2); bg.endFill();
    this.scene.addChild(bg);

    // left/right hit zones (semi-transparent overlays)
    this.leftZone = new Graphics();
    this.leftZone.beginFill(this.colors.left, 0.12);
    this.leftZone.drawRect(0, 0, W/2, H);
    this.leftZone.endFill();
    this.leftZone.eventMode = 'static';
    this.leftZone.on('pointertap', (e: FederatedPointerEvent) => { e.stopPropagation(); this.onTap('left'); });
    this.scene.addChild(this.leftZone);

    this.rightZone = new Graphics();
    this.rightZone.beginFill(this.colors.right, 0.12);
    this.rightZone.drawRect(W/2, 0, W/2, H);
    this.rightZone.endFill();
    this.rightZone.eventMode = 'static';
    this.rightZone.on('pointertap', (e: FederatedPointerEvent) => { e.stopPropagation(); this.onTap('right'); });
    this.scene.addChild(this.rightZone);

    // cue text
    this.cueText = new Text('READY', {
      fontFamily: 'sans-serif', fontSize: Math.floor(Math.min(W, H) * 0.08),
      fill: this.colors.text, stroke: 0x000000, strokeThickness: 5,
    });
    this.cueText.anchor.set(0.5);
    this.cueText.x = W / 2; this.cueText.y = H * 0.28;
    this.scene.addChild(this.cueText);

    // arrow
    this.cueArrow = new Graphics();
    this.scene.addChild(this.cueArrow);

    this.container.addChild(this.scene);

    // start first cue
    this.nextCue();
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
      // win if already met roundsNeeded, else fail
      this.finish(this.roundsDone >= this.roundsNeeded);
      return;
    }
    if (this.awaiting) {
      this.cueRemainMs -= dtMs;
      if (this.cueRemainMs <= 0) {
        this.registerMiss('timeout');
      }
    }
  }

  protected showResult(result: { success: boolean; score: number }): void {
    this.onGameEnd?.(result.success, result.score);
  }

  // ---- internals ----
  private nextCue() {
    const W = this.app.renderer.width, H = this.app.renderer.height;
    // randomly choose a displayed side; required is opposite
    this.displayedSide = Math.random() < 0.5 ? 'left' : 'right';
    this.requiredSide = this.displayedSide === 'left' ? 'right' : 'left';

    // text + arrow
    this.cueText.text = this.displayedSide.toUpperCase();
    this.drawArrow(this.displayedSide === 'left' ? -1 : 1, W, H);

    this.cueRemainMs = this.windowMs;
    this.awaiting = true;
  }

  private onTap(side: 'left' | 'right') {
    if (!this.awaiting || this.finished) return;
    if (side === this.requiredSide) {
      // success
      this.awaiting = false;
      this.roundsDone++;
      this.combo++;
      const base = 300;
      const comboBonus = Math.min(7, this.combo) * 60;
      const timeFrac = this.cueRemainMs / this.windowMs; // faster -> more
      const speedBonus = Math.round(120 * timeFrac);
      this.score += base + comboBonus + speedBonus;
      // slightly tighten window over time
      this.windowMs = clamp(this.windowMs * 0.985, 550, 4000);
      // visual feedback (flash zone)
      this.flashZone(side, this.colors.good);
      // goal reached?
      if (this.roundsDone >= this.roundsNeeded) {
        this.finish(true);
      } else {
        setTimeout(() => this.nextCue(), 80);
      }
    } else {
      this.registerMiss('wrong');
    }
  }

  private registerMiss(_reason: 'wrong' | 'timeout') {
    if (!this.awaiting || this.finished) return;
    this.awaiting = false;
    this.combo = 0;
    this.misses++;
    this.score = Math.max(0, this.score - 120);
    const badSide = this.requiredSide === 'left' ? 'right' : 'left'; // the tapped/would-be side
    this.flashZone(badSide as any, this.colors.bad);
    if (this.misses > this.missesAllowed) {
      this.finish(false);
    } else {
      setTimeout(() => this.nextCue(), 120);
    }
  }

  private drawArrow(dir: -1 | 1, W: number, H: number) {
    const g = this.cueArrow;
    g.clear();
    const len = Math.min(W, H) * 0.25;
    const cx = W / 2; const cy = H * 0.58;
    const shaftW = Math.max(10, Math.floor(len * 0.08));
    const head = Math.max(20, Math.floor(len * 0.22));

    // shaft
    g.lineStyle(shaftW, 0xffffff, 0.95);
    g.moveTo(cx - dir * len * 0.5, cy);
    g.lineTo(cx + dir * len * 0.5, cy);

    // arrow head (triangle)
    g.beginFill(0xffffff, 0.95);
    if (dir < 0) {
      g.moveTo(cx - len * 0.5, cy);
      g.lineTo(cx - len * 0.5 + head, cy - head * 0.7);
      g.lineTo(cx - len * 0.5 + head, cy + head * 0.7);
    } else {
      g.moveTo(cx + len * 0.5, cy);
      g.lineTo(cx + len * 0.5 - head, cy - head * 0.7);
      g.lineTo(cx + len * 0.5 - head, cy + head * 0.7);
    }
    g.closePath(); g.endFill();
  }

  private flashZone(side: 'left' | 'right', color: number) {
    const W = this.app.renderer.width, H = this.app.renderer.height;
    const panel = new Graphics();
    panel.beginFill(color, 0.28);
    if (side === 'left') panel.drawRect(0, 0, W/2, H);
    else panel.drawRect(W/2, 0, W/2, H);
    panel.endFill();
    this.scene.addChild(panel);
    // fade out
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      setTimeout(() => { panel.alpha = Math.max(0, 0.28 * (1 - i/steps)); if (i === steps) this.scene.removeChild(panel); }, i * 30);
    }
  }

  private finish(success: boolean) {
    if (this.finished) return;
    this.finished = true;
    const timeBonus = Math.round(this.remainMs / 8);
    const roundBonus = this.roundsDone * 100;
    const missPenalty = this.misses * 120;
    const score = Math.max(0, this.score + timeBonus + roundBonus - missPenalty + (success ? 600 : 0));
    this.onGameEnd?.(success, score);
  }
}
