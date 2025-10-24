// AnimalChaseGame.ts
// Drop-in short game template (PixiJS + TypeScript)
// Register under key 'animal_chase' in your factory/registry.
//
// Gameplay:
// - A cute "animal" runs along a winding path.
// - Player must keep their pointer/finger near the animal (within tolerance) while holding down.
// - Accumulate enough "in-range" time before the overall timer ends to clear.
//
// Project compatibility notes:
// - Do NOT narrow base types; import GameTemplate & GameSettings only.
// - Do NOT redeclare base fields like duration/difficulty.
// - Use an internal `finished` flag (no reliance on specific GameState unions).
// - Emit results via `onGameEnd(success, score)`.
import { Application, Container, Graphics, Text, FederatedPointerEvent } from 'pixi.js';
import { GameTemplate, type GameSettings } from './GameTemplate';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface AnimalChaseSettings extends GameSettings {
  targetChaseSec?: number;   // seconds of in-range tracking required to clear
  tolerancePx?: number;      // distance tolerance from animal center
  allowStrayMs?: number;     // cumulative ms allowed out of range before fail
  speedPxPerSec?: number;    // animal speed along path
  pathComplexity?: number;   // number of turns/segments (3..12)
  hidePath?: boolean;        // if true, hide the guidance path (hard mode spice)
  palette?: 'meadow' | 'ocean' | 'twilight';
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

type P = { x: number; y: number; d?: number };

export class AnimalChaseGame extends GameTemplate {
  public onGameEnd?: (success: boolean, score: number) => void;

  private scene = new Container();
  private finished = false;
  private remainMs = 30_000;

  // visuals
  private pathG!: Graphics;
  private animalG!: Graphics;
  private pointerDot!: Graphics;
  private infoText!: Text;

  // path + motion
  private path: P[] = [];
  private pathIdx = 0;
  private speed = 220; // px/s
  private animalR = 18;

  // tracking
  private pointerDown = false;
  private ptrX = 0;
  private ptrY = 0;
  private tolerance = 40;
  private targetChase = 12_000; // ms
  private chasedMs = 0;
  private strayMs = 0;
  private strayMax = 3000; // ms

  // scoring
  private score = 0;
  private combo = 0;

  // palette
  private colors = {
    bgTop: 0x14532d, bgBottom: 0x052e16, // meadow default
    path: 0x91f2c3,
    animal: 0xffffff,
    halo: 0xfff1a6,
    good: 0x92e6a7, bad: 0xff5a5a,
    text: 0xffffff,
  };

  constructor(app: Application, settings: AnimalChaseSettings) {
    super(app, settings);
  }

  async createScene(): Promise<void> {
    const s = (this as any).settings as AnimalChaseSettings;
    const diff = getDifficulty(s);
    const W = this.app.renderer.width, H = this.app.renderer.height;

    // duration
    this.remainMs = secondsToMs((s as any).duration as number, 30_000);

    // difficulty presets
    if (diff === 'easy') {
      this.targetChase = 10_000; this.tolerance = 48; this.strayMax = 5000; this.speed = 200;
    } else if (diff === 'hard') {
      this.targetChase = 14_000; this.tolerance = 34; this.strayMax = 2500; this.speed = 250;
    } else {
      this.targetChase = 12_000; this.tolerance = 40; this.strayMax = 3000; this.speed = 220;
    }

    // overrides
    if (typeof s.targetChaseSec === 'number' && isFinite(s.targetChaseSec)) this.targetChase = clamp(Math.round(s.targetChaseSec * 1000), 2000, 60000);
    if (typeof s.tolerancePx === 'number' && isFinite(s.tolerancePx)) this.tolerance = clamp(Math.round(s.tolerancePx), 12, 120);
    if (typeof s.allowStrayMs === 'number' && isFinite(s.allowStrayMs)) this.strayMax = clamp(Math.round(s.allowStrayMs), 500, 15000);
    if (typeof s.speedPxPerSec === 'number' && isFinite(s.speedPxPerSec)) this.speed = clamp(Math.round(s.speedPxPerSec), 80, 400);
    const complexity = clamp(Math.round((s.pathComplexity ?? (diff === 'easy' ? 4 : diff === 'hard' ? 8 : 6))), 3, 12);
    const hidePath = !!s.hidePath;

    if (s.palette === 'ocean') {
      this.colors.bgTop = 0x0ea5e9; this.colors.bgBottom = 0x022c44; this.colors.path = 0xb6e3ff;
    } else if (s.palette === 'twilight') {
      this.colors.bgTop = 0x301934; this.colors.bgBottom = 0x1a0b1e; this.colors.path = 0xf8c7ff;
    }

    // background
    const bg = new Graphics();
    bg.beginFill(this.colors.bgTop); bg.drawRect(0, 0, W, Math.floor(H * 0.45)); bg.endFill();
    bg.beginFill(this.colors.bgBottom); bg.drawRect(0, Math.floor(H * 0.45), W, H); bg.endFill();
    this.scene.addChild(bg);

    // info text
    this.infoText = new Text('', {
      fontFamily: 'sans-serif', fontSize: Math.floor(Math.min(W, H) * 0.05),
      fill: this.colors.text, stroke: 0x000000, strokeThickness: 5,
    });
    this.infoText.anchor.set(0.5);
    this.infoText.x = W / 2; this.infoText.y = Math.floor(H * 0.20);
    this.scene.addChild(this.infoText);
    this.updateInfo();

    // build path
    this.path = this.generatePath(W, H, complexity);
    // draw path
    this.pathG = new Graphics();
    if (!hidePath) {
      this.drawPath();
      this.scene.addChild(this.pathG);
    }

    // animal
    this.animalG = new Graphics();
    this.drawAnimal(this.path[0].x, this.path[0].y);
    this.scene.addChild(this.animalG);

    // pointer dot (feedback)
    this.pointerDot = new Graphics();
    this.pointerDot.alpha = 0;
    this.scene.addChild(this.pointerDot);

    // input
    this.scene.eventMode = 'static';
    this.scene.on('pointerdown', (e: FederatedPointerEvent) => { e.stopPropagation(); this.onDown(e); });
    this.scene.on('pointermove', (e: FederatedPointerEvent) => { e.stopPropagation(); this.onMove(e); });
    this.scene.on('pointerup',   (e: FederatedPointerEvent) => { e.stopPropagation(); this.onUp(); });
    this.scene.on('pointerupoutside', (e: FederatedPointerEvent) => { e.stopPropagation(); this.onUp(); });

    this.container.addChild(this.scene);
  }

  handleInput(_e: FederatedPointerEvent): void {
    // not used
  }

  updateGame(deltaTime: number): void {
    if (this.finished) return;
    const dtMs = deltaTime * (1000 / 60);
    const dt = dtMs / 1000;

    // time
    this.remainMs -= dtMs;
    if (this.remainMs <= 0) {
      this.remainMs = 0;
      this.finish(this.chasedMs >= this.targetChase);
      return;
    }

    // advance along path
    const stepPix = this.speed * dt;
    this.advanceAlongPath(stepPix);

    // pointer feedback & progress
    if (this.pointerDown) {
      const ax = this.animalG.x, ay = this.animalG.y;
      const dx = this.ptrX - ax, dy = this.ptrY - ay;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const inRange = dist <= this.tolerance;

      if (inRange) {
        this.chasedMs += dtMs;
        this.combo++;
        // periodic scoring while in range
        if (this.combo % 6 === 0) this.score += 10;
        this.flashRing(ax, ay, this.colors.good, Math.max(this.animalR + 6, this.tolerance * 0.7), 0.10);
      } else {
        this.strayMs += dtMs;
        this.combo = 0;
        // red blink when far
        if (this.strayMs % 400 < dtMs) this.flashRing(ax, ay, this.colors.bad, this.tolerance, 0.10);
        if (this.strayMs > this.strayMax) {
          this.finish(false);
          return;
        }
      }
      this.updateInfo();
    }
  }

  protected showResult(result: { success: boolean; score: number }): void {
    this.onGameEnd?.(result.success, result.score);
  }

  // ---- internals ----
  private generatePath(W: number, H: number, complexity: number) {
    // generate smooth polyline from left to right with random vertical wiggle
    const marginX = 40, marginY = Math.floor(H * 0.22), usableY = H - marginY - 40;
    const pts: P[] = [];
    for (let i = 0; i <= complexity; i++) {
      const x = marginX + (i / complexity) * (W - marginX * 2);
      const yBase = H / 2;
      const amp = usableY * 0.35;
      const y = yBase + (Math.sin(i * 1.2) + (Math.random() - 0.5) * 1.0) * amp * (i === 0 || i === complexity ? 0.4 : 1.0);
      pts.push({ x, y });
    }
    // resample into dense points
    const dense: P[] = [];
    const step = 6; // px target between samples
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.sqrt(dx*dx + dy*dy);
      const n = Math.max(1, Math.round(len / step));
      for (let j = 0; j < n; j++) {
        const t = j / n;
        dense.push({ x: a.x + dx * t, y: a.y + dy * t });
      }
    }
    dense.push(pts[pts.length - 1]);
    // cache distances
    for (let i = 1; i < dense.length; i++) {
      const dx = dense[i].x - dense[i-1].x;
      const dy = dense[i].y - dense[i-1].y;
      dense[i].d = Math.sqrt(dx*dx + dy*dy);
    }
    return dense;
  }

  private drawPath() {
    const g = this.pathG;
    g.clear();
    g.lineStyle(6, this.colors.path, 0.8);
    if (this.path.length === 0) return;
    g.moveTo(this.path[0].x, this.path[0].y);
    for (let i = 1; i < this.path.length; i++) g.lineTo(this.path[i].x, this.path[i].y);
  }

  private drawAnimal(x: number, y: number) {
    const g = this.animalG;
    g.clear();
    // body
    g.beginFill(this.colors.animal, 1);
    g.drawCircle(0, 0, this.animalR);
    g.endFill();
    // ear
    g.beginFill(0x111111, 0.9);
    g.drawCircle(this.animalR * 0.35, -this.animalR * 0.65, this.animalR * 0.28);
    g.endFill();
    // eye
    g.beginFill(0x111111, 0.9);
    g.drawCircle(this.animalR * 0.35, -this.animalR * 0.10, this.animalR * 0.12);
    g.endFill();
    g.x = x; g.y = y;
  }

  private advanceAlongPath(stepPix: number) {
    if (this.path.length < 2) return;
    let need = stepPix;
    while (need > 0 && this.pathIdx < this.path.length - 1) {
      const seg = this.path[this.pathIdx + 1];
      const d = seg.d || 0;
      if (d <= need) {
        need -= d;
        this.pathIdx++;
      } else {
        // interpolate within this segment
        const cur = this.path[this.pathIdx];
        const nx = cur.x + (seg.x - cur.x) * (need / d);
        const ny = cur.y + (seg.y - cur.y) * (need / d);
        this.drawAnimal(nx, ny);
        return;
      }
    }
    // reached or passed the end
    const last = this.path[this.path.length - 1];
    this.drawAnimal(last.x, last.y);
    // loop back to start for continuous chase
    if (this.pathIdx >= this.path.length - 1) this.pathIdx = 0;
  }

  private onDown(e: FederatedPointerEvent) {
    if (this.finished) return;
    const p = this.scene.toLocal(e.global);
    this.pointerDown = true;
    this.ptrX = p.x; this.ptrY = p.y;
    this.renderPointerDot();
  }

  private onMove(e: FederatedPointerEvent) {
    if (this.finished) return;
    const p = this.scene.toLocal(e.global);
    this.ptrX = p.x; this.ptrY = p.y;
    if (this.pointerDown) this.renderPointerDot();
  }

  private onUp() {
    if (this.finished) return;
    this.pointerDown = false;
    this.pointerDot.alpha = 0;
  }

  private renderPointerDot() {
    const g = this.pointerDot;
    g.clear();
    g.beginFill(this.colors.halo, 0.8);
    g.drawCircle(this.ptrX, this.ptrY, 6);
    g.endFill();
    g.alpha = 1;
  }

  private flashRing(x: number, y: number, color: number, R: number, alpha = 0.18) {
    const g = new Graphics();
    g.beginFill(color, alpha);
    g.drawCircle(0, 0, R);
    g.endFill();
    g.x = x; g.y = y;
    this.scene.addChild(g);
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      setTimeout(() => { g.alpha = Math.max(0, alpha * (1 - i/steps)); if (i === steps) this.scene.removeChild(g); }, i * 30);
    }
  }

  private updateInfo() {
    const remainS = Math.ceil(this.remainMs / 1000);
    const chasedS = Math.floor(this.chasedMs / 1000);
    const targetS = Math.floor(this.targetChase / 1000);
    this.infoText.text = `Chase ${chasedS}/${targetS}s   Time ${remainS}s`;
  }

  private finish(success: boolean) {
    if (this.finished) return;
    this.finished = true;
    const timeBonus = Math.round(this.remainMs / 8);
    const chaseBonus = Math.round(this.chasedMs / 20);
    const strayPenalty = Math.round(this.strayMs / 15);
    const score = Math.max(0, this.score + timeBonus + chaseBonus - strayPenalty + (success ? 700 : 0));
    this.onGameEnd?.(success, score);
  }
}
