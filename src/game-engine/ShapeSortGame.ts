// ShapeSortGame.ts
// Drop-in short game template (PixiJS + TypeScript)
// Register under key 'shape_sort' in your factory/registry.
//
// Gameplay:
// - A shape appears at the center. Player must tap LEFT or RIGHT according to rules:
//   LEFT: ROUND shapes, RIGHT: ANGLED shapes (by default).
// - Each cue has a short reaction window. Reach the target number of correct sorts before time runs out.
//
// Compatibility notes:
// - Do NOT narrow base types (use GameTemplate & GameSettings only).
// - Do NOT redeclare base fields like duration/difficulty.
// - Use an internal `finished` flag instead of relying on a specific GameState union.
// - Report results via `onGameEnd(success, score)`.
import { Application, Container, Graphics, Text, FederatedPointerEvent } from 'pixi.js';
import { GameTemplate, type GameSettings } from './GameTemplate';

export type Difficulty = 'easy' | 'normal' | 'hard';
type Side = 'left' | 'right';
type ShapeKind = 'circle' | 'square' | 'triangle' | 'diamond' | 'star';

export interface ShapeSortSettings extends GameSettings {
  rounds?: number;         // correct sorts required (defaults by difficulty)
  windowMs?: number;       // reaction window per shape (defaults by difficulty)
  missesAllowed?: number;  // max misses before fail (defaults by difficulty)
  mapping?: 'fixed' | 'alternate' | 'random'; // how LEFT/RIGHT rules are mapped (default 'fixed')
  palette?: 'cool' | 'warm' | 'forest';       // optional color theme
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
function isRoundShape(k: ShapeKind) { return k === 'circle'; } // only circles are ROUND; others are ANGLED

export class ShapeSortGame extends GameTemplate {
  public onGameEnd?: (success: boolean, score: number) => void;

  private scene = new Container();
  private finished = false;
  private remainMs = 30_000;

  // UI
  private leftZone!: Graphics;
  private rightZone!: Graphics;
  private ruleText!: Text;
  private shapeG!: Graphics;

  // runtime
  private roundsNeeded = 12;
  private roundsDone = 0;
  private missesAllowed = 2;
  private misses = 0;
  private windowMs = 1100;
  private cueRemainMs = 0;
  private awaiting = false;
  private currentShape: ShapeKind = 'circle';

  // mapping
  private mappingPolicy: 'fixed' | 'alternate' | 'random' = 'fixed';
  private leftMeans: 'round' | 'angled' = 'round'; // default
  private rightMeans: 'round' | 'angled' = 'angled';

  // scoring
  private score = 0;
  private combo = 0;

  // palette
  private colors = {
    bgTop: 0x0ea5e9, bgBottom: 0x022c44,
    left: 0x0ea5e9, right: 0xf97316,
    good: 0x92e6a7, bad: 0xff5a5a,
    shape: 0xffffff, text: 0xffffff,
  };

  constructor(app: Application, settings: ShapeSortSettings) {
    super(app, settings);
  }

  async createScene(): Promise<void> {
    const s = (this as any).settings as ShapeSortSettings;
    const diff = getDifficulty(s);

    // duration
    this.remainMs = secondsToMs((s as any).duration as number, 30_000);

    // difficulty presets
    if (diff === 'easy')       { this.roundsNeeded = 10; this.windowMs = 1200; this.missesAllowed = 3; }
    else if (diff === 'hard')  { this.roundsNeeded = 14; this.windowMs = 900;  this.missesAllowed = 1; }
    else                       { this.roundsNeeded = 12; this.windowMs = 1100; this.missesAllowed = 2; }

    // overrides
    if (typeof s.rounds === 'number' && isFinite(s.rounds)) this.roundsNeeded = clamp(Math.round(s.rounds), 4, 30);
    if (typeof s.windowMs === 'number' && isFinite(s.windowMs)) this.windowMs = clamp(Math.round(s.windowMs), 400, 4000);
    if (typeof s.missesAllowed === 'number' && isFinite(s.missesAllowed)) this.missesAllowed = clamp(Math.round(s.missesAllowed), 0, 10);
    this.mappingPolicy = s.mapping ?? 'fixed';

    if (s.palette === 'warm') {
      this.colors.bgTop = 0xffa94d; this.colors.bgBottom = 0x5a2a00;
      this.colors.left = 0xffc078; this.colors.right = 0xff8787;
    } else if (s.palette === 'forest') {
      this.colors.bgTop = 0x14532d; this.colors.bgBottom = 0x052e16;
      this.colors.left = 0x34d399; this.colors.right = 0x166534;
    }

    const W = this.app.renderer.width, H = this.app.renderer.height;

    // background split tint
    const bg = new Graphics();
    bg.beginFill(this.colors.bgTop); bg.drawRect(0, 0, W, H/2); bg.endFill();
    bg.beginFill(this.colors.bgBottom); bg.drawRect(0, H/2, W, H/2); bg.endFill();
    this.scene.addChild(bg);

    // left/right zones
    this.leftZone = new Graphics();
    this.leftZone.beginFill(this.colors.left, 0.12); this.leftZone.drawRect(0, 0, W/2, H); this.leftZone.endFill();
    this.leftZone.eventMode = 'static';
    this.leftZone.on('pointertap', (e: FederatedPointerEvent) => { e.stopPropagation(); this.onTap('left'); });
    this.scene.addChild(this.leftZone);

    this.rightZone = new Graphics();
    this.rightZone.beginFill(this.colors.right, 0.12); this.rightZone.drawRect(W/2, 0, W/2, H); this.rightZone.endFill();
    this.rightZone.eventMode = 'static';
    this.rightZone.on('pointertap', (e: FederatedPointerEvent) => { e.stopPropagation(); this.onTap('right'); });
    this.scene.addChild(this.rightZone);

    // rule text
    this.ruleText = new Text('', {
      fontFamily: 'sans-serif', fontSize: Math.floor(Math.min(W, H) * 0.06),
      fill: this.colors.text, stroke: 0x000000, strokeThickness: 5,
    });
    this.ruleText.anchor.set(0.5);
    this.ruleText.x = W / 2; this.ruleText.y = Math.floor(H * 0.22);
    this.scene.addChild(this.ruleText);

    // shape graphics
    this.shapeG = new Graphics();
    this.scene.addChild(this.shapeG);

    this.container.addChild(this.scene);

    // init mapping & first cue
    this.updateRuleText();
    this.nextCue(true);
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
  private updateRuleText() {
    const text = `LEFT: ${this.leftMeans.toUpperCase()}    RIGHT: ${this.rightMeans.toUpperCase()}`;
    this.ruleText.text = text;
  }

  private randomizeMappingIfNeeded() {
    if (this.mappingPolicy === 'fixed') return;
    if (this.mappingPolicy === 'alternate') {
      // swap left/right meaning each cue
      const tmp = this.leftMeans; this.leftMeans = this.rightMeans; this.rightMeans = tmp;
    } else {
      // random (but ensure different from previous to reduce confusion)
      const wasLeft = this.leftMeans;
      if (Math.random() < 0.5) { this.leftMeans = 'round'; this.rightMeans = 'angled'; }
      else { this.leftMeans = 'angled'; this.rightMeans = 'round'; }
      if (this.leftMeans === wasLeft) {
        // force flip occasionally
        const tmp = this.leftMeans; this.leftMeans = this.rightMeans; this.rightMeans = tmp;
      }
    }
    this.updateRuleText();
  }

  private nextCue(first = false) {
    // mapping update
    if (!first) this.randomizeMappingIfNeeded();

    // choose a shape
    const shapes: ShapeKind[] = ['circle', 'square', 'triangle', 'diamond', 'star'];
    this.currentShape = shapes[(Math.random() * shapes.length) | 0];

    this.drawCurrentShape();

    this.cueRemainMs = this.windowMs;
    this.awaiting = true;
  }

  private onTap(side: Side) {
    if (!this.awaiting || this.finished) return;
    const isRound = isRoundShape(this.currentShape);
    const sideMeansRound = (side === 'left') ? (this.leftMeans === 'round') : (this.rightMeans === 'round');
    const correct = (isRound && sideMeansRound) || (!isRound && !sideMeansRound);

    if (correct) {
      this.awaiting = false;
      this.roundsDone++;
      this.combo++;
      const base = 300;
      const comboBonus = Math.min(7, this.combo) * 60;
      const timeFrac = this.cueRemainMs / this.windowMs;
      const speedBonus = Math.round(120 * timeFrac);
      this.score += base + comboBonus + speedBonus;
      this.flashSide(side, this.colors.good);
      // tighten window
      this.windowMs = clamp(this.windowMs * 0.985, 500, 4000);
      if (this.roundsDone >= this.roundsNeeded) {
        this.finish(true);
      } else {
        setTimeout(() => this.nextCue(), 100);
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
    // flash both sides subtly to indicate confusion
    this.flashSide('left', this.colors.bad, 0.18);
    this.flashSide('right', this.colors.bad, 0.18);
    if (this.misses > this.missesAllowed) {
      this.finish(false);
    } else {
      setTimeout(() => this.nextCue(), 140);
    }
  }

  private drawCurrentShape() {
    const W = this.app.renderer.width, H = this.app.renderer.height;
    const cx = W / 2, cy = Math.floor(H * 0.58);
    const R = Math.min(W, H) * 0.14;
    const g = this.shapeG;
    g.clear();
    g.beginFill(this.colors.shape, 0.95);

    if (this.currentShape === 'circle') {
      g.drawCircle(cx, cy, R);
    } else if (this.currentShape === 'square') {
      const s = R * 1.5;
      g.drawRoundedRect(cx - s/2, cy - s/2, s, s, 8);
    } else if (this.currentShape === 'triangle') {
      const s = R * 1.7;
      g.moveTo(cx, cy - s*0.58);
      g.lineTo(cx + s*0.58, cy + s*0.58);
      g.lineTo(cx - s*0.58, cy + s*0.58);
      g.lineTo(cx, cy - s*0.58);
    } else if (this.currentShape === 'diamond') {
      const s = R * 1.7;
      g.moveTo(cx, cy - s*0.6);
      g.lineTo(cx + s*0.6, cy);
      g.lineTo(cx, cy + s*0.6);
      g.lineTo(cx - s*0.6, cy);
      g.lineTo(cx, cy - s*0.6);
    } else if (this.currentShape === 'star') {
      const spikes = 5;
      const outer = R * 1.2;
      const inner = R * 0.5;
      for (let i = 0; i < spikes * 2; i++) {
        const ang = (Math.PI / spikes) * i - Math.PI / 2;
        const rad = (i % 2 === 0) ? outer : inner;
        const x = cx + Math.cos(ang) * rad;
        const y = cy + Math.sin(ang) * rad;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.closePath();
    }
    g.endFill();
  }

  private flashSide(side: Side, color: number, alpha = 0.28) {
    const W = this.app.renderer.width, H = this.app.renderer.height;
    const overlay = new Graphics();
    overlay.beginFill(color, alpha);
    if (side === 'left') overlay.drawRect(0, 0, W/2, H); else overlay.drawRect(W/2, 0, W/2, H);
    overlay.endFill();
    this.scene.addChild(overlay);
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      setTimeout(() => { overlay.alpha = Math.max(0, alpha * (1 - i/steps)); if (i === steps) this.scene.removeChild(overlay); }, i * 30);
    }
  }

  private finish(success: boolean) {
    if (this.finished) return;
    this.finished = true;
    const timeBonus = Math.round(this.remainMs / 8);
    const roundBonus = this.roundsDone * 80;
    const missPenalty = this.misses * 120;
    const score = Math.max(0, this.score + timeBonus + roundBonus - missPenalty + (success ? 700 : 0));
    this.onGameEnd?.(success, score);
  }
}
