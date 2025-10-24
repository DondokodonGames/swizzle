// BalanceGame.ts
// Drop-in short game template (PixiJS + TypeScript)
// Register under key 'balance' in your factory/registry.
//
// Gameplay:
// - A bar (see-saw) is centered on screen. A ball rests on it.
// - Tap/hold LEFT or RIGHT half of the screen to tilt the bar and keep the ball from falling.
// - Survive each round's timer. Clear enough rounds overall to win.
//
// Project compatibility notes:
// - Do NOT narrow base types; import GameTemplate & GameSettings only.
// - Do NOT redeclare base fields like duration/difficulty/timerText.
// - Use an internal `finished` flag (avoid relying on a specific GameState union).
// - Emit results via `onGameEnd(success, score)`.
import { Application, Container, Graphics, Text, FederatedPointerEvent } from 'pixi.js';
import { GameTemplate, type GameSettings } from './GameTemplate';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface BalanceSettings extends GameSettings {
  rounds?: number;           // rounds to clear
  roundTimeMs?: number;      // per-round time
  missesAllowed?: number;    // allowed falls/timeouts overall
  barLengthPx?: number;      // base bar length (auto scaled if omitted)
  ballRadiusPx?: number;     // ball radius
  tiltDegPerSec?: number;    // control sensitivity
  maxAngleDeg?: number;      // clamp tilt
  driftAmp?: number;         // px/s^2 along bar (external "wind"/slope drift)
  friction?: number;         // velocity damping (0..1) per second
  palette?: 'sunset' | 'forest' | 'night';
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

export class BalanceGame extends GameTemplate {
  public onGameEnd?: (success: boolean, score: number) => void;

  private scene = new Container();
  private finished = false;
  private remainMs = 30_000;

  // UI
  private infoText!: Text;
  private hintText!: Text;
  private timeBar!: Graphics;

  // geometry
  private cx = 0; private cy = 0; // pivot center
  private barLen = 420; private barH = 24;
  private bar!: Graphics;
  private ball!: Graphics;
  private ballR = 18;

  // state (bar angle & ball position along bar axis)
  private theta = 0;               // radians
  private maxAngle = Math.PI / 7;  // ~25.7deg
  private tiltRate = (Math.PI / 180) * 85; // rad/s
  private control = 0;             // -1, 0, +1

  // ball motion along bar axis (u)
  private u = 0;                   // px along bar (0 = center)
  private v = 0;                   // velocity px/s along bar
  private gravity = 800;           // px/s^2 equivalent pull along bar
  private driftAmp = 140;          // px/s^2 external bias
  private driftT = 0;              // time accumulator for drift oscillation
  private friction = 0.12;         // per second damping coefficient

  // rounds
  private roundsNeeded = 8;
  private roundsDone = 0;
  private roundTimeMs = 2800;
  private roundRemain = 2800;
  private misses = 0;
  private missesAllowed = 3;

  // scoring
  private score = 0;
  private stabilityAccum = 0; // integrates small |u|

  // colors
  private colors = {
    bgTop: 0x301934, bgBottom: 0x1a0b1e, // sunset default gradient
    bar: 0xffffff, ball: 0xffffff,
    good: 0x92e6a7, bad: 0xff5a5a,
    text: 0xffffff, deco: 0x94a3b8,
    barEdge: 0xf59e0b,
    barFill: 0xffffff,
    barShadow: 0x000000,
    barBack: 0x374151, barFillUI: 0xff6b6b,
  };

  constructor(app: Application, settings: BalanceSettings) {
    super(app, settings);
  }

  async createScene(): Promise<void> {
    const s = (this as any).settings as BalanceSettings;
    const diff = getDifficulty(s);
    const W = this.app.renderer.width, H = this.app.renderer.height;

    // overall duration
    this.remainMs = secondsToMs((s as any).duration as number, 30_000);

    // difficulty presets
    if (diff === 'easy') {
      this.roundsNeeded = 6; this.roundTimeMs = 3000; this.missesAllowed = 4;
      this.barLen = Math.min(520, Math.floor(W * 0.74)); this.ballR = 20;
      this.tiltRate = (Math.PI / 180) * 90; this.maxAngle = (Math.PI / 180) * 22;
      this.driftAmp = 110; this.friction = 0.16;
    } else if (diff === 'hard') {
      this.roundsNeeded = 10; this.roundTimeMs = 2400; this.missesAllowed = 2;
      this.barLen = Math.min(460, Math.floor(W * 0.68)); this.ballR = 18;
      this.tiltRate = (Math.PI / 180) * 80; this.maxAngle = (Math.PI / 180) * 28;
      this.driftAmp = 170; this.friction = 0.08;
    } else {
      this.roundsNeeded = 8; this.roundTimeMs = 2800; this.missesAllowed = 3;
      this.barLen = Math.min(500, Math.floor(W * 0.72)); this.ballR = 19;
      this.tiltRate = (Math.PI / 180) * 85; this.maxAngle = (Math.PI / 180) * 25;
      this.driftAmp = 140; this.friction = 0.12;
    }

    // overrides
    if (typeof s.rounds === 'number' && isFinite(s.rounds)) this.roundsNeeded = clamp(Math.round(s.rounds), 3, 30);
    if (typeof s.roundTimeMs === 'number' && isFinite(s.roundTimeMs)) this.roundTimeMs = clamp(Math.round(s.roundTimeMs), 1200, 6000);
    if (typeof s.missesAllowed === 'number' && isFinite(s.missesAllowed)) this.missesAllowed = clamp(Math.round(s.missesAllowed), 0, 10);
    if (typeof s.barLengthPx === 'number' && isFinite(s.barLengthPx)) this.barLen = clamp(Math.round(s.barLengthPx), 200, Math.floor(W * 0.9));
    if (typeof s.ballRadiusPx === 'number' && isFinite(s.ballRadiusPx)) this.ballR = clamp(Math.round(s.ballRadiusPx), 8, 40);
    if (typeof s.tiltDegPerSec === 'number' && isFinite(s.tiltDegPerSec)) this.tiltRate = (Math.PI / 180) * clamp(Math.round(s.tiltDegPerSec), 30, 180);
    if (typeof s.maxAngleDeg === 'number' && isFinite(s.maxAngleDeg)) this.maxAngle = (Math.PI / 180) * clamp(Math.round(s.maxAngleDeg), 10, 40);
    if (typeof s.driftAmp === 'number' && isFinite(s.driftAmp)) this.driftAmp = clamp(Math.round(s.driftAmp), 40, 320);
    if (typeof s.friction === 'number' && isFinite(s.friction)) this.friction = clamp(s.friction, 0.02, 0.4);

    if (s.palette === 'forest') {
      this.colors.bgTop = 0x14532d; this.colors.bgBottom = 0x052e16; this.colors.barFillUI = 0x34d399;
    } else if (s.palette === 'night') {
      this.colors.bgTop = 0x0b1020; this.colors.bgBottom = 0x151a2b; this.colors.barFillUI = 0x3b82f6;
    } else {
      this.colors.bgTop = 0x301934; this.colors.bgBottom = 0x1a0b1e; this.colors.barFillUI = 0xff6b6b;
    }

    // layout
    this.cx = Math.floor(W * 0.5);
    this.cy = Math.floor(H * 0.62);

    // background
    const bg = new Graphics();
    bg.beginFill(this.colors.bgTop); bg.drawRect(0, 0, W, Math.floor(H * 0.45)); bg.endFill();
    bg.beginFill(this.colors.bgBottom); bg.drawRect(0, Math.floor(H * 0.45), W, H); bg.endFill();
    this.scene.addChild(bg);

    // decorative lines
    for (let i = 0; i < 5; i++) {
      const d = new Graphics();
      d.lineStyle(2, this.colors.deco, 0.25);
      const x = (i + 1) * (W / 6);
      d.moveTo(x, 0); d.lineTo(x, H);
      this.scene.addChild(d);
    }

    // info
    this.infoText = new Text('', {
      fontFamily: 'sans-serif', fontSize: Math.floor(Math.min(W, H) * 0.045),
      fill: this.colors.text, stroke: 0x000000, strokeThickness: 4,
    });
    this.infoText.anchor.set(0.5);
    this.infoText.x = W / 2; this.infoText.y = Math.floor(H * 0.20);
    this.scene.addChild(this.infoText);
    this.updateInfo();

    // hint
    this.hintText = new Text('Tap LEFT/RIGHT to tilt', {
      fontFamily: 'sans-serif', fontSize: Math.floor(Math.min(W, H) * 0.04),
      fill: this.colors.text, stroke: 0x000000, strokeThickness: 4,
    });
    this.hintText.anchor.set(0.5);
    this.hintText.x = W / 2; this.hintText.y = Math.floor(H * 0.28);
    this.scene.addChild(this.hintText);

    // time bar
    this.timeBar = new Graphics();
    this.scene.addChild(this.timeBar);

    // bar graphic
    this.bar = new Graphics();
    this.drawBar();
    this.scene.addChild(this.bar);

    // ball graphic
    this.ball = new Graphics();
    this.u = 0; this.v = 0; this.theta = 0;
    this.drawBall();
    this.scene.addChild(this.ball);

    // input
    this.scene.eventMode = 'static';
    this.scene.on('pointerdown', (e: FederatedPointerEvent) => {
      const x = e.global.x;
      this.control = (x < this.app.renderer.width / 2) ? -1 : 1;
    });
    this.scene.on('pointerup', () => { this.control = 0; });
    this.scene.on('pointerupoutside', () => { this.control = 0; });

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
    const dt = dtMs / 1000;

    // overall timer
    this.remainMs -= dtMs;
    if (this.remainMs <= 0) {
      this.remainMs = 0;
      this.finish(this.roundsDone >= this.roundsNeeded);
      return;
    }

    // per-round timer
    this.roundRemain -= dtMs;
    if (this.roundRemain <= 0) {
      // survived the round
      this.roundsDone++;
      if (this.roundsDone >= this.roundsNeeded) {
        this.finish(true);
        return;
      }
      this.nextRound();
    }

    // control & tilt
    if (this.control !== 0) {
      this.theta += this.control * this.tiltRate * dt;
      this.theta = clamp(this.theta, -this.maxAngle, this.maxAngle);
      this.drawBar();
    }

    // physics on bar
    // acceleration along bar axis: gravity*sin(theta) + oscillating drift
    this.driftT += dt;
    const drift = this.driftAmp * Math.sin(this.driftT * (1.6 + Math.random() * 0.2));
    const a = this.gravity * Math.sin(this.theta) + drift;
    this.v += a * dt;
    // friction damping (exponential towards 0)
    const damp = Math.exp(-this.friction * dt);
    this.v *= damp;
    this.u += this.v * dt;

    // stability metric (reward small |u|)
    this.stabilityAccum += Math.max(0, (1.0 - Math.min(1, Math.abs(this.u) / (this.barLen * 0.5))) ) * dt;

    // fall check
    const edge = this.barLen * 0.5 - this.ballR * 0.6;
    if (Math.abs(this.u) > edge) {
      this.registerMiss();
      return;
    }

    // render
    this.drawBall();
    this.drawTimeBar();
  }

  protected showResult(result: { success: boolean; score: number }): void {
    this.onGameEnd?.(result.success, result.score);
  }

  // ---- internals ----
  private updateInfo() {
    const remainS = Math.ceil(this.remainMs / 1000);
    this.infoText.text = `Round ${this.roundsDone}/${this.roundsNeeded}   Miss ${this.misses}/${this.missesAllowed}   Time ${remainS}s`;
  }

  private drawTimeBar() {
    const W = this.app.renderer.width;
    const y = Math.floor(this.app.renderer.height * 0.34);
    const w = Math.floor(W * 0.7);
    const x = Math.floor((W - w) / 2);
    const h = 10;
    const frac = clamp(this.roundRemain / this.roundTimeMs, 0, 1);
    this.timeBar.clear();
    this.timeBar.beginFill(this.colors.barBack, 0.4); this.timeBar.drawRoundedRect(x, y, w, h, 6); this.timeBar.endFill();
    this.timeBar.beginFill(this.colors.barFillUI, 0.95); this.timeBar.drawRoundedRect(x, y, Math.floor(w * frac), h, 6); this.timeBar.endFill();
  }

  private nextRound(first = false) {
    // reset state but keep difficulty ramp via slight drift increase and maxAngle loosen (tiny)
    if (!first) {
      this.driftAmp = clamp(this.driftAmp * 1.05, 40, 360);
      this.maxAngle = clamp(this.maxAngle * 1.01, (Math.PI/180)*10, (Math.PI/180)*40);
    }
    this.u = 0; this.v = 0;
    this.theta = (Math.random() - 0.5) * this.maxAngle * 0.6; // slight random tilt start
    this.roundRemain = this.roundTimeMs;
    this.drawBar();
    this.drawBall();
    if (!first) this.updateInfo();
  }

  private drawBar() {
    const g = this.bar;
    const W = this.app.renderer.width;
    const H = this.app.renderer.height;
    this.cx = Math.floor(W * 0.5);
    this.cy = Math.floor(H * 0.62);

    g.clear();
    g.beginFill(this.colors.barShadow, 0.20);
    g.drawRoundedRect(-this.barLen/2 + 6, -this.barH/2 + 10, this.barLen - 12, this.barH, this.barH/2);
    g.endFill();

    g.beginFill(this.colors.barFill, 0.96);
    g.lineStyle(4, this.colors.barEdge, 0.9);
    g.drawRoundedRect(-this.barLen/2, -this.barH/2, this.barLen, this.barH, this.barH/2);
    g.endFill();

    g.x = this.cx; g.y = this.cy;
    g.rotation = this.theta;
  }

  private drawBall() {
    const g = this.ball;
    const nx = -Math.sin(this.theta), ny = Math.cos(this.theta); // normal
    const tx = Math.cos(this.theta), ty = Math.sin(this.theta);  // tangent
    const x = this.cx + this.u * tx + (this.barH/2 + this.ballR) * nx;
    const y = this.cy + this.u * ty + (this.barH/2 + this.ballR) * ny;

    g.clear();
    g.beginFill(this.colors.ball, 0.96);
    g.drawCircle(0, 0, this.ballR);
    g.endFill();
    // tiny shadow
    g.beginFill(0x000000, 0.18);
    g.drawEllipse(this.ballR*0.2, this.ballR*0.4, this.ballR*0.7, this.ballR*0.38);
    g.endFill();
    g.x = x; g.y = y;
  }

  private registerMiss() {
    this.misses++;
    if (this.misses > this.missesAllowed) {
      this.finish(false);
      return;
    }
    // quick reset to center & next round
    this.nextRound();
  }

  private finish(success: boolean) {
    if (this.finished) return;
    this.finished = true;
    const timeBonus = Math.round(this.remainMs / 6);
    const stabilityBonus = Math.round(this.stabilityAccum * 200);
    const missPenalty = this.misses * 120;
    const score = Math.max(0, timeBonus + stabilityBonus - missPenalty + (success ? 800 : 0));
    this.onGameEnd?.(success, score);
  }
}
