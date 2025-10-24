// DreamyJumpGame.ts
// Drop-in short game template (PixiJS + TypeScript)
// Register under key 'dreamy_jump' in your factory/registry.
//
// Gameplay:
// - Vertical jumper. Land on clouds to bounce upward and keep ascending.
// - Tap LEFT/RIGHT half to nudge horizontal movement.
// - Survive (don't fall off-screen) until the timer ends to clear.
//
// Project compatibility notes:
// - Do NOT narrow base types; import GameTemplate & GameSettings only.
// - Do NOT redeclare base fields like duration/difficulty/timerText.
// - Use an internal `finished` flag (avoid relying on a specific GameState union).
// - Emit results via `onGameEnd(success, score)`.
import { Application, Container, Graphics, Text, FederatedPointerEvent } from 'pixi.js';
import { GameTemplate, type GameSettings } from './GameTemplate';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface DreamyJumpSettings extends GameSettings {
  gravity?: number;         // px/s^2
  jumpVel?: number;         // px/s (upward, positive number)
  moveSpeed?: number;       // px/s horizontal speed
  cloudGapY?: number;       // average vertical gap between clouds
  wrapHorizontal?: boolean; // wrap from left to right edges
  palette?: 'dawn' | 'twilight' | 'night';
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

type Cloud = {
  g: Graphics;
  x: number;   // world center x
  y: number;   // world center y
  w: number;
  h: number;
};

export class DreamyJumpGame extends GameTemplate {
  public onGameEnd?: (success: boolean, score: number) => void;

  private scene = new Container();
  private finished = false;
  private remainMs = 30_000;

  // camera/world
  private cameraY = 0;

  // player
  private player!: Graphics;
  private px = 0; private py = 0; // world pos
  private pw = 42; private ph = 48;
  private vx = 0; private vy = 0;
  private gravity = 1500;
  private jumpVel = 700;
  private moveSpeed = 180;
  private wrap = true;

  // clouds
  private clouds: Cloud[] = [];
  private cloudGapY = 120;
  private cloudW = 120; private cloudH = 28;
  private topSpawnY = 0;
  private bottomCullY = 0;

  // scoring / progress
  private maxHeight = 0; // lowest py value (higher up is smaller y)
  private bounces = 0;
  private score = 0;

  // UI
  private infoText!: Text;

  // colors
  private colors = {
    bgTop: 0xffd6a5, bgBottom: 0xf15bb5, // dawn default
    cloud: 0xffffff,
    player: 0xffffff,
    good: 0x92e6a7, bad: 0xff5a5a,
    text: 0xffffff, deco: 0x94a3b8,
  };

  constructor(app: Application, settings: DreamyJumpSettings) {
    super(app, settings);
  }

  async createScene(): Promise<void> {
    const s = (this as any).settings as DreamyJumpSettings;
    const diff = getDifficulty(s);
    const W = this.app.renderer.width, H = this.app.renderer.height;

    // duration
    this.remainMs = secondsToMs((s as any).duration as number, 30_000);

    // difficulty presets
    if (diff === 'easy')       { this.gravity = 1450; this.jumpVel = 680; this.moveSpeed = 170; this.cloudGapY = 130; this.wrap = true; }
    else if (diff === 'hard')  { this.gravity = 1600; this.jumpVel = 720; this.moveSpeed = 200; this.cloudGapY = 110; this.wrap = false; }
    else                       { this.gravity = 1500; this.jumpVel = 700; this.moveSpeed = 180; this.cloudGapY = 120; this.wrap = true; }

    // overrides
    if (typeof s.gravity === 'number' && isFinite(s.gravity)) this.gravity = clamp(s.gravity, 900, 2400);
    if (typeof s.jumpVel === 'number' && isFinite(s.jumpVel)) this.jumpVel = clamp(s.jumpVel, 480, 1000);
    if (typeof s.moveSpeed === 'number' && isFinite(s.moveSpeed)) this.moveSpeed = clamp(s.moveSpeed, 100, 360);
    if (typeof s.cloudGapY === 'number' && isFinite(s.cloudGapY)) this.cloudGapY = clamp(s.cloudGapY, 80, 200);
    if (typeof s.wrapHorizontal === 'boolean') this.wrap = s.wrapHorizontal;

    if (s.palette === 'twilight') {
      this.colors.bgTop = 0x301934; this.colors.bgBottom = 0x1a0b1e;
    } else if (s.palette === 'night') {
      this.colors.bgTop = 0x0b1020; this.colors.bgBottom = 0x151a2b;
    }

    // background split
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
    this.updateInfo(0);

    // player init
    this.pw = Math.min(64, Math.floor(W * 0.08));
    this.ph = Math.floor(this.pw * 1.15);
    this.px = W / 2;
    this.py = H - 80; // world coords start near bottom
    this.vx = 0; this.vy = 0;
    this.cameraY = 0;
    this.maxHeight = this.py;

    this.player = new Graphics();
    this.drawPlayer();
    this.scene.addChild(this.player);

    // initial clouds
    this.cloudW = Math.min(140, Math.floor(W * 0.34));
    this.cloudH = Math.max(22, Math.floor(this.cloudW * 0.22));
    this.topSpawnY = this.py - 40;
    this.bottomCullY = this.py + H + 100;

    // ground cloud platform
    this.spawnCloud(W/2, this.py + 30, this.cloudW * 1.2);

    // fill upward
    while (this.topSpawnY > this.py - H * 1.5) {
      this.spawnNextAbove();
    }

    // input: left/right tap
    this.scene.eventMode = 'static';
    this.scene.on('pointertap', (e: FederatedPointerEvent) => {
      const x = e.global.x;
      if (x < W / 2) this.vx = -this.moveSpeed;
      else this.vx = this.moveSpeed;
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
    const W = this.app.renderer.width, H = this.app.renderer.height;

    // time
    this.remainMs -= dtMs;
    if (this.remainMs <= 0) {
      this.remainMs = 0;
      this.finish(true);
      return;
    }

    // physics
    this.vy += this.gravity * dt;
    this.py += this.vy * dt;
    this.px += this.vx * dt;

    // wrap/edges
    if (this.wrap) {
      if (this.px < -this.pw/2) this.px = W + this.pw/2;
      if (this.px > W + this.pw/2) this.px = -this.pw/2;
    } else {
      this.px = clamp(this.px, this.pw/2, W - this.pw/2);
    }

    // collide with clouds only when falling
    if (this.vy > 0) {
      const footY = this.py + this.ph/2;
      for (const c of this.clouds) {
        const cx = c.x, cy = c.y, cw = c.w, ch = c.h;
        // AABB broad-phase
        if (Math.abs(this.px - cx) < (this.pw/2 + cw/2) && Math.abs(footY - cy) < (this.ph/2 + ch/2)) {
          // ensure coming from above and foot is near top surface
          const top = cy - ch/2;
          if (footY >= top - 8 && footY <= top + 14) {
            // bounce
            this.py = top - this.ph/2;
            this.vy = -this.jumpVel * (0.96 + Math.random() * 0.08);
            this.bounces++;
            this.score += 40;
            break;
          }
        }
      }
    }

    // camera follows upward movement
    const screenY = this.py - this.cameraY;
    const targetScreenY = H * 0.42;
    if (screenY < targetScreenY) {
      const dy = targetScreenY - screenY;
      this.cameraY -= dy; // move camera up
    }

    // update max height & score bonus
    if (this.py < this.maxHeight) {
      const gain = this.maxHeight - this.py;
      this.maxHeight = this.py;
      this.score += Math.round(gain * 0.1);
    }

    // spawn new clouds above as camera rises
    while (this.topSpawnY > this.cameraY - H * 0.5) {
      this.spawnNextAbove();
    }

    // cull clouds below
    const cullBelow = this.cameraY + H + 60;
    const survivors: Cloud[] = [];
    for (const c of this.clouds) {
      if (c.y < cullBelow) survivors.push(c);
      else this.scene.removeChild(c.g);
    }
    this.clouds = survivors;

    // check fail: fell off bottom of screen
    if (this.py - this.cameraY > H + 40) {
      this.finish(false);
      return;
    }

    // render
    this.drawPlayer();
    this.updateInfo(dtMs);
    this.layoutClouds();
  }

  protected showResult(result: { success: boolean; score: number }): void {
    this.onGameEnd?.(result.success, result.score);
  }

  // ---- internals ----
  private updateInfo(_dtMs: number) {
    const remainS = Math.ceil(this.remainMs / 1000);
    const height = Math.max(0, Math.round((this.clouds.length > 0 ? (this.clouds[0].y - this.py) : 0) * 0.02) + Math.round((this.maxHeight > 0 ? 0 : -this.maxHeight) * 0.01));
    this.infoText.text = `Bounces ${this.bounces}   Time ${remainS}s`;
  }

  private drawPlayer() {
    const g = this.player;
    const W = this.app.renderer.width;
    const H = this.app.renderer.height;
    const sx = this.px;
    const sy = this.py - this.cameraY;

    g.clear();
    // cloud-like "dreamling" sprite
    g.beginFill(this.colors.player, 0.95);
    g.drawRoundedRect(sx - this.pw/2, sy - this.ph/2, this.pw, this.ph, 12);
    g.endFill();
    // eyes
    g.beginFill(0x111111, 0.9);
    g.drawCircle(sx - this.pw*0.18, sy - this.ph*0.10, Math.max(2, Math.floor(this.pw*0.07)));
    g.drawCircle(sx + this.pw*0.10, sy - this.ph*0.12, Math.max(2, Math.floor(this.pw*0.07)));
    g.endFill();
  }

  private layoutClouds() {
    // project world y -> screen y
    for (const c of this.clouds) {
      c.g.x = c.x;
      c.g.y = c.y - this.cameraY;
    }
  }

  private spawnNextAbove() {
    const W = this.app.renderer.width;
    const nextY = this.topSpawnY - (this.cloudGapY * (0.9 + Math.random() * 0.3));
    const w = this.cloudW * (0.8 + Math.random() * 0.6);
    const x = Math.max(w/2 + 10, Math.min(W - w/2 - 10, (Math.random() * W)));
    this.spawnCloud(x, nextY, w);
  }

  private spawnCloud(x: number, y: number, w: number) {
    const h = this.cloudH * (0.9 + Math.random() * 0.3);
    const g = new Graphics();
    this.drawCloudShape(g, w, h);
    this.scene.addChild(g);
    this.clouds.push({ g, x, y, w, h });
    this.topSpawnY = Math.min(this.topSpawnY, y);
  }

  private drawCloudShape(g: Graphics, w: number, h: number) {
    const r = h * 0.6;
    g.clear();
    g.beginFill(this.colors.cloud, 0.96);
    // three puffs
    g.drawEllipse(-w/4, 0, w*0.32, h);
    g.drawEllipse(0, 0, w*0.42, h*1.2);
    g.drawEllipse(w/4, 0, w*0.32, h);
    // base
    g.drawRoundedRect(-w/2, -h/2, w, h, h/2);
    g.endFill();
  }

  private finish(success: boolean) {
    if (this.finished) return;
    this.finished = true;
    const timeBonus = Math.round(this.remainMs / 6);
    const bounceBonus = this.bounces * 30;
    const altitudeBonus = Math.max(0, Math.round((-this.maxHeight) * 0.2));
    const score = Math.max(0, this.score + timeBonus + bounceBonus + altitudeBonus + (success ? 800 : 0));
    this.onGameEnd?.(success, score);
  }
}
