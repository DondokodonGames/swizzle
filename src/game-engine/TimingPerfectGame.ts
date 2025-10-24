// TimingPerfectGame.ts
// Drop-in short game template (PixiJS + TypeScript)
// Register under key 'timing_perfect' in your factory/registry.
//
// Gameplay:
// - A needle spins around a circle.
// - Tap when the needle is inside the highlighted target arc.
// - Tighter center "perfect" sub-arc yields higher score and combo.
// - Clear when you reach the target number of hits before time runs out.
//
// Design constraints for compatibility with your project:
// - Do NOT narrow base types or redeclare GameTemplate fields (like duration/difficulty).
// - Use an internal `finished` flag instead of relying on specific GameState unions.
// - Expose results via `onGameEnd(success, score)` callback.
import { Application, Container, Graphics, FederatedPointerEvent } from 'pixi.js';
import { GameTemplate, type GameSettings } from './GameTemplate';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface TimingPerfectSettings extends GameSettings {
  // Inherit: duration (seconds), difficulty
  rounds?: number;       // hits required to clear (defaults vary by difficulty)
  baseSpeedDeg?: number; // base angular speed in deg/sec (default by difficulty)
  zoneSizeDeg?: number;  // target arc size in degrees (default by difficulty)
  perfectDeg?: number;   // perfect window size (<= zoneSizeDeg). default fraction by difficulty
  rotateDir?: 'cw' | 'ccw' | 'alternate'; // spin direction policy. default 'alternate'
}

// ---- helpers ----
function isDifficulty(v: unknown): v is Difficulty {
  return v === 'easy' || v === 'normal' || v === 'hard';
}
function getDifficulty(settings: GameSettings): Difficulty {
  const d = (settings as any).difficulty;
  return isDifficulty(d) ? d : 'normal';
}
const DEG2RAD = Math.PI / 180;
function wrapDeg(a: number) { a %= 360; if (a < 0) a += 360; return a; }
function angleInRangeDeg(a: number, start: number, end: number) {
  // normalize and handle wrap-around (e.g., 350..20)
  a = wrapDeg(a); start = wrapDeg(start); end = wrapDeg(end);
  if (start <= end) return a >= start && a <= end;
  return a >= start || a <= end;
}
function clamp(x: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, x)); }

export class TimingPerfectGame extends GameTemplate {
  public onGameEnd?: (success: boolean, score: number) => void;

  private scene = new Container();

  // visuals
  private ring!: Graphics;
  private zone!: Graphics;
  private perfectZone!: Graphics;
  private needle!: Graphics;
  private hitFlash!: Graphics;

  // runtime
  private finished = false;
  private remainMs = 30_000;

  // geometry & motion
  private cx = 0; private cy = 0; private R = 160;
  private angleDeg = 0;
  private speedDeg = 180;
  private dir = 1; // 1=cw, -1=ccw, will alternate if configured

  // target windows
  private zoneSize = 40;     // deg
  private perfectSize = 16;  // deg
  private zoneStart = 0;     // deg, zone is [start..start+size]
  private roundsNeeded = 8;
  private roundsDone = 0;

  // scoring & combo
  private combo = 0;
  private score = 0;

  // config
  private rotatePolicy: 'cw' | 'ccw' | 'alternate' = 'alternate';

  constructor(app: Application, settings: TimingPerfectSettings) {
    super(app, settings);
  }

  async createScene(): Promise<void> {
    const s = (this as any).settings as TimingPerfectSettings;
    const diff = getDifficulty(s);
    const W = this.app.renderer.width, H = this.app.renderer.height;
    this.cx = W / 2; this.cy = H / 2; this.R = Math.min(W, H) * 0.34;

    // duration
    const rawDuration = (s as any).duration as number;
    this.remainMs = (typeof rawDuration === 'number' && isFinite(rawDuration)) ? Math.max(1000, Math.round(rawDuration * 1000)) : 30_000;

    // difficulty defaults
    if (diff === 'easy') {
      this.roundsNeeded = 6;
      this.speedDeg = s.baseSpeedDeg ?? 160;
      this.zoneSize = s.zoneSizeDeg ?? 60;
      this.perfectSize = s.perfectDeg ?? Math.floor(this.zoneSize * 0.45);
    } else if (diff === 'hard') {
      this.roundsNeeded = 10;
      this.speedDeg = s.baseSpeedDeg ?? 240;
      this.zoneSize = s.zoneSizeDeg ?? 28;
      this.perfectSize = s.perfectDeg ?? Math.max(8, Math.floor(this.zoneSize * 0.35));
    } else {
      this.roundsNeeded = 8;
      this.speedDeg = s.baseSpeedDeg ?? 180;
      this.zoneSize = s.zoneSizeDeg ?? 40;
      this.perfectSize = s.perfectDeg ?? Math.floor(this.zoneSize * 0.40);
    }
    this.zoneSize = clamp(this.zoneSize, 8, 120);
    this.perfectSize = clamp(this.perfectSize, 4, Math.max(6, this.zoneSize - 4));

    // rotation policy
    this.rotatePolicy = s.rotateDir ?? 'alternate';
    if (this.rotatePolicy === 'cw') this.dir = 1;
    else if (this.rotatePolicy === 'ccw') this.dir = -1;
    else this.dir = Math.random() < 0.5 ? 1 : -1;

    this.scene.eventMode = 'static';
    this.scene.on('pointerdown', (e: FederatedPointerEvent) => {
      e.stopPropagation();
      this.onTap();
    });

    // draw base ring
    this.ring = new Graphics();
    this.drawRing();
    this.scene.addChild(this.ring);

    // draw zones
    this.zone = new Graphics();
    this.perfectZone = new Graphics();
    this.randomizeZone(true);
    this.scene.addChild(this.zone, this.perfectZone);

    // needle
    this.needle = new Graphics();
    this.drawNeedle();
    this.scene.addChild(this.needle);

    // hit flash
    this.hitFlash = new Graphics();
    this.hitFlash.alpha = 0;
    this.scene.addChild(this.hitFlash);

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
      this.finish(false);
      return;
    }

    // rotate
    this.angleDeg = wrapDeg(this.angleDeg + this.dir * this.speedDeg * dt);
    this.drawNeedle();

    // fade hit flash
    if (this.hitFlash.alpha > 0) {
      this.hitFlash.alpha = Math.max(0, this.hitFlash.alpha - 3 * dt);
    }
  }

  protected showResult(result: { success: boolean; score: number }): void {
    this.onGameEnd?.(result.success, result.score);
  }

  // ---- internals ----
  private drawRing() {
    const g = this.ring;
    g.clear();
    g.lineStyle(10, 0x124559, 1);
    g.drawCircle(this.cx, this.cy, this.R);
    g.lineStyle(2, 0x88c0d0, 0.5);
    g.drawCircle(this.cx, this.cy, this.R * 0.75);
  }

  private drawZone() {
    const outerR = this.R * 0.95;
    const innerR = this.R * 0.65;
    const start = this.zoneStart * DEG2RAD;
    const end = (this.zoneStart + this.zoneSize) * DEG2RAD;

    const pgSize = this.perfectSize;
    const pStart = (this.zoneStart + (this.zoneSize - pgSize) / 2) * DEG2RAD;
    const pEnd = (this.zoneStart + (this.zoneSize + pgSize) / 2) * DEG2RAD;

    // main zone (soft green)
    const z = this.zone;
    z.clear();
    z.beginFill(0x92e6a7, 0.5);
    z.moveTo(this.cx + innerR * Math.cos(start), this.cy + innerR * Math.sin(start));
    z.arc(this.cx, this.cy, outerR, start, end);
    z.lineTo(this.cx + innerR * Math.cos(end), this.cy + innerR * Math.sin(end));
    z.arc(this.cx, this.cy, innerR, end, start, true);
    z.closePath();
    z.endFill();

    // perfect zone (bright)
    const p = this.perfectZone;
    p.clear();
    p.beginFill(0xffe08a, 0.9);
    p.moveTo(this.cx + innerR * Math.cos(pStart), this.cy + innerR * Math.sin(pStart));
    p.arc(this.cx, this.cy, outerR, pStart, pEnd);
    p.lineTo(this.cx + innerR * Math.cos(pEnd), this.cy + innerR * Math.sin(pEnd));
    p.arc(this.cx, this.cy, innerR, pEnd, pStart, true);
    p.closePath();
    p.endFill();
  }

  private drawNeedle() {
    const g = this.needle;
    const a = this.angleDeg * DEG2RAD;
    const x1 = this.cx + Math.cos(a) * (this.R * 0.1);
    const y1 = this.cy + Math.sin(a) * (this.R * 0.1);
    const x2 = this.cx + Math.cos(a) * (this.R * 1.02);
    const y2 = this.cy + Math.sin(a) * (this.R * 1.02);

    g.clear();
    g.lineStyle(6, 0xffffff, 1);
    g.moveTo(this.cx, this.cy);
    g.lineTo(x2, y2);
    g.lineStyle(10, 0xffffff, 0.2);
    g.moveTo(x1, y1);
    g.lineTo(this.cx, this.cy);

    // center dot
    g.beginFill(0xffffff);
    g.drawCircle(this.cx, this.cy, 6);
    g.endFill();
  }

  private onTap() {
    if (this.finished) return;
    const a = wrapDeg(this.angleDeg);
    const zStart = this.zoneStart;
    const zEnd = this.zoneStart + this.zoneSize;
    const inZone = angleInRangeDeg(a, zStart, zEnd);

    const pHalf = this.perfectSize / 2;
    const pStart = this.zoneStart + (this.zoneSize / 2) - pHalf;
    const pEnd = this.zoneStart + (this.zoneSize / 2) + pHalf;
    const inPerfect = angleInRangeDeg(a, pStart, pEnd);

    if (!inZone) {
      // miss
      this.combo = 0;
      this.score = Math.max(0, this.score - 150);
      this.flash(0xff5a5a);
      // small speed assist (optional): slow down a bit after miss
      this.speedDeg = Math.max(120, this.speedDeg * 0.97);
      return;
    }

    // hit!
    this.roundsDone++;
    if (inPerfect) {
      this.combo++;
      const bonus = 600 + Math.min(8, this.combo) * 80;
      this.score += bonus;
      this.flash(0xfff1a6);
    } else {
      this.combo = 0;
      this.score += 300;
      this.flash(0x92e6a7);
    }

    // dynamic difficulty: zone shrinks slightly, speed up slightly
    this.zoneSize = clamp(this.zoneSize * 0.985, 10, 120);
    this.speedDeg = clamp(this.speedDeg * 1.02, 100, 420);

    if (this.roundsDone >= this.roundsNeeded) {
      this.finish(true);
      return;
    }

    // reposition zone & maybe flip direction
    this.randomizeZone(this.rotatePolicy === 'alternate');
  }

  private randomizeZone(flipDir: boolean) {
    // pick a new start far enough from current needle to avoid trivial hit
    const forbidden = this.angleDeg;
    let start = Math.random() * 360;
    const tries = 20;
    for (let i = 0; i < tries; i++) {
      const cand = Math.random() * 360;
      // ensure at least 25deg away from current needle
      if (Math.abs(wrapDeg(cand - forbidden)) > 25) { start = cand; break; }
    }
    this.zoneStart = wrapDeg(start);
    if (flipDir) this.dir *= -1;
    this.drawZone();
  }

  private flash(color: number) {
    const g = this.hitFlash;
    g.clear();
    g.beginFill(color, 0.35);
    g.drawCircle(this.cx, this.cy, this.R * 1.08);
    g.endFill();
    g.alpha = 1;
  }

  private finish(success: boolean) {
    if (this.finished) return;
    this.finished = true;
    const timeBonus = Math.round(this.remainMs / 8);
    const roundsBonus = this.roundsDone * 120;
    const score = Math.max(0, this.score + timeBonus + roundsBonus + (success ? 800 : 0));
    this.onGameEnd?.(success, score);
  }
}
