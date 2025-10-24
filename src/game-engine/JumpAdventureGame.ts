// JumpAdventureGame.ts
// Drop-in short game template (PixiJS + TypeScript)
// Register under key 'jump_adventure' in your factory/registry.
//
// Gameplay:
// - Auto-runner. Obstacles approach from the right.
// - Tap to jump. Hold to jump higher (limited boost time).
// - Avoid obstacles until the timer ends to clear.
//
// Project compatibility notes:
// - Do NOT narrow base types; import GameTemplate & GameSettings only.
// - Do NOT redeclare base fields like duration/difficulty/timerText.
// - Use an internal `finished` flag (avoid relying on a specific GameState union).
// - Emit results via `onGameEnd(success, score)`.

import { Application, Container, Graphics, FederatedPointerEvent } from 'pixi.js';
import { GameTemplate, type GameSettings } from './GameTemplate';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface JumpAdventureSettings extends GameSettings {
  spawnBaseMs?: number;     // base ms between obstacles (default by difficulty)
  speedPxPerSec?: number;   // world scroll speed (default by difficulty)
  gravity?: number;         // px/s^2
  jumpVel?: number;         // initial jump velocity (px/s upward, positive number)
  holdBoostMs?: number;     // max ms of additional upward acceleration while holding
  allowDouble?: boolean;    // allow a single double-jump midair
  palette?: 'dawn' | 'forest' | 'night';
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

type Obstacle = {
  g: Graphics;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number; // leftward px/s
};

export class JumpAdventureGame extends GameTemplate {
  public onGameEnd?: (success: boolean, score: number) => void;

  private scene = new Container();
  private finished = false;
  private remainMs = 30_000;

  // world
  private groundY = 0;
  private worldSpeed = 320; // px/s
  private spawnBaseMs = 780;
  private spawnAccum = 0;

  // player
  private player!: Graphics;
  private px = 0;
  private py = 0;
  private pw = 50;
  private ph = 58;
  private vy = 0;
  private gravity = 1600;
  private jumpVel = 620;
  private holdBoostMs = 140;
  private holdRemain = 0;
  private holding = false;
  private onGround = true;
  private allowDouble = false;
  private hasDouble = true;

  // obstacles
  private obstacles: Obstacle[] = [];

  // difficulty
  private speedMul = 1.0;
  private sizeMul = 1.0;

  // scoring
  private passed = 0;
  private score = 0;

  // palette
  private colors = {
    bgTop: 0x87ceeb, bgBottom: 0x1f7aa8,
    ground: 0x0f1b2d,
    deco: 0xffffff,
    player: 0xffffff,
    obstacle: 0xf97316,
    good: 0x92e6a7, bad: 0xff5a5a,
  };

  constructor(app: Application, settings: JumpAdventureSettings) {
    super(app, settings);
  }

  async createScene(): Promise<void> {
    const s = (this as any).settings as JumpAdventureSettings;
    const diff = getDifficulty(s);
    const W = this.app.renderer.width, H = this.app.renderer.height;

    // duration
    this.remainMs = secondsToMs((s as any).duration as number, 30_000);

    // difficulty presets
    if (diff === 'easy') {
      this.worldSpeed = 300; this.spawnBaseMs = 860;
      this.gravity = 1500; this.jumpVel = 600; this.holdBoostMs = 170;
      this.speedMul = 0.95; this.sizeMul = 0.95; this.allowDouble = true;
    } else if (diff === 'hard') {
      this.worldSpeed = 360; this.spawnBaseMs = 680;
      this.gravity = 1700; this.jumpVel = 650; this.holdBoostMs = 120;
      this.speedMul = 1.1; this.sizeMul = 1.1; this.allowDouble = false;
    } else {
      this.worldSpeed = 330; this.spawnBaseMs = 760;
      this.gravity = 1600; this.jumpVel = 620; this.holdBoostMs = 140;
      this.speedMul = 1.0; this.sizeMul = 1.0; this.allowDouble = true;
    }

    // overrides
    if (typeof s.speedPxPerSec === 'number' && isFinite(s.speedPxPerSec)) this.worldSpeed = clamp(Math.round(s.speedPxPerSec), 180, 520);
    if (typeof s.spawnBaseMs === 'number' && isFinite(s.spawnBaseMs)) this.spawnBaseMs = clamp(Math.round(s.spawnBaseMs), 220, 2000);
    if (typeof s.gravity === 'number' && isFinite(s.gravity)) this.gravity = clamp(s.gravity, 800, 2600);
    if (typeof s.jumpVel === 'number' && isFinite(s.jumpVel)) this.jumpVel = clamp(s.jumpVel, 380, 980);
    if (typeof s.holdBoostMs === 'number' && isFinite(s.holdBoostMs)) this.holdBoostMs = clamp(Math.round(s.holdBoostMs), 60, 400);
    if (typeof s.allowDouble === 'boolean') this.allowDouble = s.allowDouble;

    if (s.palette === 'night') {
      this.colors.bgTop = 0x0b1020; this.colors.bgBottom = 0x151a2b; this.colors.ground = 0x101522; this.colors.deco = 0x94a3b8;
    } else if (s.palette === 'forest') {
      this.colors.bgTop = 0x14532d; this.colors.bgBottom = 0x052e16; this.colors.ground = 0x0b2e20; this.colors.obstacle = 0x34d399;
    } else if (s.palette === 'dawn') {
      this.colors.bgTop = 0xffd6a5; this.colors.bgBottom = 0xf15bb5; this.colors.ground = 0x5a2a00; this.colors.obstacle = 0xff8787;
    }

    // layout
    this.groundY = Math.floor(H * 0.78);
    this.pw = Math.min(70, Math.floor(W * 0.09));
    this.ph = Math.floor(this.pw * 1.1);
    this.px = Math.floor(W * 0.22);
    this.py = this.groundY - this.ph / 2;
    this.vy = 0;
    this.onGround = true;
    this.hasDouble = this.allowDouble;

    // background
    const bg = new Graphics();
    bg.beginFill(this.colors.bgTop); bg.drawRect(0, 0, W, Math.floor(H * 0.45)); bg.endFill();
    bg.beginFill(this.colors.bgBottom); bg.drawRect(0, Math.floor(H * 0.45), W, H); bg.endFill();
    this.scene.addChild(bg);

    // ground
    const ground = new Graphics();
    ground.beginFill(this.colors.ground, 1);
    ground.drawRect(0, this.groundY, W, H - this.groundY);
    ground.endFill();
    // decorations
    for (let i = 0; i < 6; i++) {
      const d = new Graphics();
      d.lineStyle(2, this.colors.deco, 0.25);
      const x = (i + 1) * (W / 7);
      d.moveTo(x, this.groundY); d.lineTo(x, H);
      this.scene.addChild(d);
    }
    this.scene.addChild(ground);

    // player
    this.player = new Graphics();
    this.drawPlayer();
    this.scene.addChild(this.player);

    // input
    this.scene.eventMode = 'static';
    this.scene.on('pointerdown', (e: FederatedPointerEvent) => { e.stopPropagation(); this.onDown(); });
    this.scene.on('pointerup',   (e: FederatedPointerEvent) => { e.stopPropagation(); this.onUp(); });
    this.scene.on('pointerupoutside', (e: FederatedPointerEvent) => { e.stopPropagation(); this.onUp(); });

    this.container.addChild(this.scene);
  }

  handleInput(_event: FederatedPointerEvent): void {
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

    // spawn obstacles
    this.spawnAccum += dtMs;
    const interval = this.spawnBaseMs / this.speedMul;
    while (this.spawnAccum >= interval) {
      this.spawnAccum -= interval;
      this.spawnObstacle();
      // ramp a touch
      this.speedMul = Math.min(1.5, this.speedMul * 1.01);
    }

    // player physics
    // hold boost: gentle upward acceleration while holding & holdRemain > 0
    if (this.holding && this.holdRemain > 0) {
      const boost = Math.min(this.holdRemain, dtMs);
      this.vy -= (this.gravity * 0.5) * (boost / 1000); // counteract gravity partially
      this.holdRemain -= boost;
    }

    // apply gravity
    this.vy += this.gravity * dt;
    this.py += this.vy * dt;

    // ground collision
    const footY = this.py + this.ph / 2;
    if (footY >= this.groundY) {
      this.py = this.groundY - this.ph / 2;
      this.vy = 0;
      if (!this.onGround) {
        this.onGround = true;
        this.hasDouble = this.allowDouble; // refresh double on landing
      }
    } else {
      this.onGround = false;
    }

    // update player graphic
    this.drawPlayer();

    // update obstacles
    const survivors: Obstacle[] = [];
    for (const o of this.obstacles) {
      o.x -= this.worldSpeed * this.speedMul * dt;
      o.g.x = o.x;
      // AABB vs player
      if (this.intersectAABB(
        this.px - this.pw/2, this.py - this.ph/2, this.pw, this.ph,
        o.x - o.w/2, o.y - o.h/2, o.w, o.h
      )) {
        this.finish(false);
        return;
      }
      // passed?
      if (o.x + o.w/2 < this.px - this.pw/2 && !(o as any).__counted) {
        (o as any).__counted = true;
        this.passed++;
        this.score += 30;
      }
      // offscreen
      if (o.x + o.w/2 > -20) survivors.push(o);
      else this.scene.removeChild(o.g);
    }
    this.obstacles = survivors;
  }

  protected showResult(result: { success: boolean; score: number }): void {
    this.onGameEnd?.(result.success, result.score);
  }

  // ---- internals ----
  private drawPlayer() {
    const g = this.player;
    g.clear();
    // body
    g.beginFill(this.colors.player, 0.95);
    g.drawRoundedRect(this.px - this.pw/2, this.py - this.ph/2, this.pw, this.ph, 12);
    g.endFill();
    // simple "eye"
    g.beginFill(0x111111, 0.9);
    g.drawCircle(this.px + this.pw*0.18, this.py - this.ph*0.15, Math.max(2, Math.floor(this.pw*0.07)));
    g.endFill();
  }

  private tryJump() {
    if (this.onGround) {
      this.vy = -this.jumpVel;
      this.holdRemain = this.holdBoostMs;
      this.onGround = false;
    } else if (this.allowDouble && this.hasDouble) {
      // double jump
      this.vy = -this.jumpVel * 0.9;
      this.holdRemain = Math.floor(this.holdBoostMs * 0.6);
      this.hasDouble = false;
    }
  }

  private onDown() {
    if (this.finished) return;
    this.holding = true;
    this.tryJump();
  }

  private onUp() {
    if (this.finished) return;
    this.holding = false;
    this.holdRemain = 0; // stop boost early for variable height
  }

  private spawnObstacle() {
    const W = this.app.renderer.width;
    // obstacle types: low hurdle, tall block, stacked smalls
    const t = Math.random();
    const baseH = Math.max(24, Math.floor(this.ph * (0.5 + Math.random() * 0.9) * this.sizeMul));
    const baseW = Math.max(24, Math.floor(this.pw * (0.8 + Math.random() * 0.9) * this.sizeMul));

    const h = clamp(baseH, 20, this.ph * 1.4);
    const w = clamp(baseW, 24, this.pw * 1.6);

    const g = new Graphics();
    g.beginFill(this.colors.obstacle, 0.95);
    let x = W + w/2 + 10;
    let y = this.groundY - h/2;

    if (t > 0.7) {
      // stacked double smalls (creates a tricky high jump)
      const h2 = Math.floor(h * 0.6);
      const w2 = Math.floor(w * 0.8);
      // bottom
      g.drawRoundedRect(-w/2, -h/2, w, h, 8);
      // top small
      g.drawRoundedRect(-w2/2, -h/2 - h2 - 6, w2, h2, 8);
      y = this.groundY - (h + h2 + 6)/2;
    } else {
      g.drawRoundedRect(-w/2, -h/2, w, h, 8);
    }

    g.x = x; g.y = y;
    this.scene.addChild(g);

    this.obstacles.push({ g, x, y, w, h, vx: -this.worldSpeed });
  }

  private intersectAABB(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  private finish(success: boolean) {
    if (this.finished) return;
    this.finished = true;
    const timeBonus = Math.round(this.remainMs / 8);
    const passBonus = this.passed * 25;
    const score = Math.max(0, this.score + timeBonus + passBonus + (success ? 800 : 0));
    this.onGameEnd?.(success, score);
  }
}
