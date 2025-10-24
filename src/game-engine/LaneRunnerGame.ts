// LaneRunnerGame.ts
// Drop-in short game template (PixiJS + TypeScript)
// Register under key 'lane_runner' in your factory/registry.
//
// Gameplay:
// - Player runs forward on N lanes (3 default).
// - Tap LEFT/RIGHT side to switch lanes. Avoid oncoming obstacles.
// - Survive until the timer ends to win.
//
// Project compatibility:
// - Do NOT narrow base types. Import GameTemplate & GameSettings only.
// - Do NOT redeclare base fields like duration/difficulty.
// - Use an internal `finished` flag (no reliance on specific GameState unions).
// - Emit results via `onGameEnd(success, score)`.
import { Application, Container, Graphics, Text, FederatedPointerEvent } from 'pixi.js';
import { GameTemplate, type GameSettings } from './GameTemplate';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface LaneRunnerSettings extends GameSettings {
  laneCount?: number;      // 3..5 lanes (default by difficulty)
  spawnBaseMs?: number;    // base obstacle spawn interval (ms)
  speedPxPerSec?: number;  // base obstacle speed downward
  playerLerp?: number;     // 0..1 smoothing factor for lane snap (default 0.25)
  palette?: 'city' | 'forest' | 'sunset';
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

type Obstacle = {
  g: Graphics;
  lane: number;
  y: number;
  w: number;
  h: number;
  vy: number; // px/s
};

export class LaneRunnerGame extends GameTemplate {
  public onGameEnd?: (success: boolean, score: number) => void;

  private scene = new Container();
  private finished = false;
  private remainMs = 30_000;

  // lanes
  private laneCount = 3;
  private laneW = 100;
  private laneX0 = 0;  // x-center of lane 0
  private laneGap = 0;

  // player
  private player!: Graphics;
  private playerLane = 1;
  private targetLane = 1;
  private playerY = 0;
  private playerW = 56;
  private playerH = 56;
  private playerLerp = 0.25; // smoothing

  // obstacles
  private obstacles: Obstacle[] = [];
  private spawnAccum = 0;
  private spawnBaseMs = 700;
  private baseSpeed = 320; // px/s
  private speedMul = 1;

  // scoring
  private passed = 0;
  private score = 0;

  // colors
  private colors = {
    bgTop: 0x0b1020, bgBottom: 0x151a2b,
    lane: 0x2d3748, divider: 0x94a3b8,
    player: 0xffffff, obstacle: 0xf97316,
    good: 0x92e6a7, bad: 0xff5a5a,
    text: 0xffffff,
  };

  constructor(app: Application, settings: LaneRunnerSettings) {
    super(app, settings);
  }

  async createScene(): Promise<void> {
    const s = (this as any).settings as LaneRunnerSettings;
    const diff = getDifficulty(s);
    const W = this.app.renderer.width, H = this.app.renderer.height;

    // duration
    this.remainMs = secondsToMs((s as any).duration as number, 30_000);

    // difficulty presets
    if (diff === 'easy')       { this.laneCount = 3; this.spawnBaseMs = 820; this.baseSpeed = 300; this.speedMul = 0.9; }
    else if (diff === 'hard')  { this.laneCount = 4; this.spawnBaseMs = 620; this.baseSpeed = 360; this.speedMul = 1.2; }
    else                       { this.laneCount = 3; this.spawnBaseMs = 720; this.baseSpeed = 330; this.speedMul = 1.0; }

    // overrides
    if (typeof s.laneCount === 'number' && isFinite(s.laneCount)) this.laneCount = clamp(Math.round(s.laneCount), 3, 5);
    if (typeof s.spawnBaseMs === 'number' && isFinite(s.spawnBaseMs)) this.spawnBaseMs = clamp(Math.round(s.spawnBaseMs), 200, 2000);
    if (typeof s.speedPxPerSec === 'number' && isFinite(s.speedPxPerSec)) this.baseSpeed = clamp(Math.round(s.speedPxPerSec), 120, 600);
    if (typeof s.playerLerp === 'number' && isFinite(s.playerLerp)) this.playerLerp = clamp(s.playerLerp, 0.05, 0.6);

    if (s.palette === 'forest') {
      this.colors.bgTop = 0x0b2e20; this.colors.bgBottom = 0x03150f; this.colors.obstacle = 0x34d399;
      this.colors.lane = 0x0f3d2e; this.colors.divider = 0x91f2c3;
    } else if (s.palette === 'sunset') {
      this.colors.bgTop = 0x301934; this.colors.bgBottom = 0x1a0b1e; this.colors.obstacle = 0xff6b6b;
      this.colors.lane = 0x3b2240; this.colors.divider = 0xf8c7ff;
    }

    // layout lanes
    this.laneW = Math.min(160, Math.floor((W - 80) / this.laneCount));
    this.laneGap = Math.floor((W - this.laneW * this.laneCount) / (this.laneCount + 1));
    this.laneX0 = this.laneGap + this.laneW / 2;

    // background
    const bg = new Graphics();
    bg.beginFill(this.colors.bgTop); bg.drawRect(0, 0, W, Math.floor(H * 0.45)); bg.endFill();
    bg.beginFill(this.colors.bgBottom); bg.drawRect(0, Math.floor(H * 0.45), W, H); bg.endFill();
    this.scene.addChild(bg);

    // draw lane rectangles & dividers
    for (let i = 0; i < this.laneCount; i++) {
      const x = this.laneCenterX(i);
      const rect = new Graphics();
      rect.beginFill(this.colors.lane, 0.14);
      rect.drawRoundedRect(x - this.laneW/2, 0, this.laneW, H, 18);
      rect.endFill();
      this.scene.addChild(rect);

      if (i < this.laneCount - 1) {
        const d = new Graphics();
        d.lineStyle(2, this.colors.divider, 0.35);
        const xd = x + (this.laneW/2) + this.laneGap/2;
        d.moveTo(xd, 20); d.lineTo(xd, H - 20);
        this.scene.addChild(d);
      }
    }

    // player
    this.playerLane = Math.floor(this.laneCount / 2);
    this.targetLane = this.playerLane;
    this.playerY = H - 90;
    this.playerW = Math.min(70, Math.floor(this.laneW * 0.55));
    this.playerH = this.playerW;
    this.player = new Graphics();
    this.drawPlayer();
    this.scene.addChild(this.player);

    // input zones: left/right half tap
    this.scene.eventMode = 'static';
    this.scene.on('pointertap', (e: FederatedPointerEvent) => {
      const x = e.global.x;
      if (x < W/2) this.moveLeft();
      else this.moveRight();
    });

    this.container.addChild(this.scene);
  }

  handleInput(_e: FederatedPointerEvent): void {
    // not used
  }

  updateGame(deltaTime: number): void {
    if (this.finished) return;
    const dtMs = deltaTime * (1000 / 60);
    const dt = dtMs / 1000;
    const H = this.app.renderer.height;

    // time
    this.remainMs -= dtMs;
    if (this.remainMs <= 0) {
      this.remainMs = 0;
      this.finish(true);
      return;
    }

    // spawn
    this.spawnAccum += dtMs;
    const interval = this.spawnBaseMs / this.speedMul;
    while (this.spawnAccum >= interval) {
      this.spawnAccum -= interval;
      this.spawnObstacle();
      // ramp difficulty: slightly faster over time
      this.speedMul = Math.min(1.6, this.speedMul * 1.012);
    }

    // move player toward lane center
    const targetX = this.laneCenterX(this.targetLane);
    const curX = this.player.x;
    this.player.x = curX + (targetX - curX) * this.playerLerp;

    // move obstacles
    const survivors: Obstacle[] = [];
    for (const o of this.obstacles) {
      o.y += o.vy * this.speedMul * dt;
      o.g.y = o.y;

      // collision with player?
      if (o.lane === this.playerLaneOrTarget() && this.intersectAABB(
        this.player.x - this.playerW/2, this.playerY - this.playerH/2, this.playerW, this.playerH,
        this.laneCenterX(o.lane) - o.w/2, o.y - o.h/2, o.w, o.h
      )) {
        this.finish(false);
        return;
      }

      if (o.y - o.h/2 > H + 10) {
        // passed successfully
        this.scene.removeChild(o.g);
        this.passed++;
        this.score += 40;
      } else {
        survivors.push(o);
      }
    }
    this.obstacles = survivors;

    // update current lane index based on proximity to centers (for collision)
    const nearest = this.nearestLaneIndex(this.player.x);
    this.playerLane = nearest;
  }

  protected showResult(result: { success: boolean; score: number }): void {
    this.onGameEnd?.(result.success, result.score);
  }

  // ---- internals ----
  private laneCenterX(i: number) {
    return this.laneX0 + i * (this.laneW + this.laneGap);
  }

  private nearestLaneIndex(x: number) {
    let best = 0, bestDist = Infinity;
    for (let i=0;i<this.laneCount;i++) {
      const d = Math.abs(this.laneCenterX(i) - x);
      if (d < bestDist) { best = i; bestDist = d; }
    }
    return best;
  }

  private playerLaneOrTarget() {
    // use nearest to reflect current visual position for collision fairness
    return this.nearestLaneIndex(this.player.x);
  }

  private drawPlayer() {
    const x = this.laneCenterX(this.playerLane);
    this.player.clear();
    this.player.beginFill(this.colors.player, 0.95);
    this.player.drawRoundedRect(x - this.playerW/2, this.playerY - this.playerH/2, this.playerW, this.playerH, 12);
    this.player.endFill();
    this.player.x = x; // initial anchoring for lerp
  }

  private spawnObstacle() {
    const H = this.app.renderer.height;
    const lane = (Math.random() * this.laneCount) | 0;
    const w = Math.min(this.laneW * 0.7, 80);
    const h = Math.min(80, Math.max(36, Math.round(this.playerH * (0.8 + Math.random() * 0.6))));
    const yStart = -h;
    const xCenter = this.laneCenterX(lane);

    const g = new Graphics();
    g.beginFill(this.colors.obstacle, 0.95);
    g.drawRoundedRect(xCenter - w/2, -h/2, w, h, 10);
    g.endFill();
    g.y = yStart;
    this.scene.addChild(g);

    const vy = this.baseSpeed * (0.9 + Math.random() * 0.3);
    this.obstacles.push({ g, lane, y: yStart, w, h, vy });
  }

  private intersectAABB(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  private moveLeft() {
    if (this.targetLane > 0) this.targetLane--;
  }
  private moveRight() {
    if (this.targetLane < this.laneCount - 1) this.targetLane++;
  }

  private finish(success: boolean) {
    if (this.finished) return;
    this.finished = true;
    const timeBonus = Math.round(this.remainMs / 8);
    const passBonus = this.passed * 20;
    const score = Math.max(0, this.score + timeBonus + passBonus + (success ? 700 : 0));
    this.onGameEnd?.(success, score);
  }
}
