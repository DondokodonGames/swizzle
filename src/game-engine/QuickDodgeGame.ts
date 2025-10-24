// QuickDodgeGame.ts
// Drop-in short game template (PixiJS + TypeScript)
// Register under key 'quick_dodge' in your factory/registry.
// This class avoids narrowing base types: no local `settings`/`timerText` declarations.
// It uses an internal `finished` flag instead of relying on a specific GameState union.
import { Application, Container, Graphics, Sprite, Texture, FederatedPointerEvent } from 'pixi.js';
import { GameTemplate, type GameSettings } from './GameTemplate';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface QuickDodgeSettings extends GameSettings {
  // Inherit `duration: number` from GameSettings (do NOT redeclare here).
  // Optional knobs specific to this template:
  spawnBaseMs?: number; // base spawn interval in ms (fallback 650)
  playerSpeed?: number; // pixels per second for lateral move (fallback 600)
}

// --- small helpers ---
function isDifficulty(v: unknown): v is Difficulty {
  return v === 'easy' || v === 'normal' || v === 'hard';
}
function getDifficulty(settings: GameSettings): Difficulty {
  const d = (settings as any).difficulty;
  return isDifficulty(d) ? d : 'normal';
}
function msFromSettingsSeconds(s: GameSettings, key: keyof GameSettings, fallbackMs: number) {
  const v = (s as any)?.[key];
  if (typeof v === 'number' && isFinite(v)) {
    // interpret as seconds
    return Math.max(1000, Math.round(v * 1000));
  }
  return fallbackMs;
}
function createGradientSprite(app: Application, topHex: number, bottomHex: number, width?: number, height?: number) {
  const w = width ?? app.renderer.width;
  const h = height ?? app.renderer.height;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
  g.addColorStop(0, hex(topHex)); g.addColorStop(1, hex(bottomHex));
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  return new Sprite(Texture.from(canvas));
}
function clamp(x: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, x)); }

// --- obstacle model ---
interface Obstacle {
  g: Graphics;
  vx: number;
  vy: number;
  w: number;
  h: number;
}

export class QuickDodgeGame extends GameTemplate {
  public onGameEnd?: (success: boolean, score: number) => void;

  private scene = new Container();
  private player!: Graphics;
  private obstacles: Obstacle[] = [];
  private finished = false;

  // timing
  private remainMs = 30_000;
  private spawnAccumMs = 0;
  private spawnBaseMs = 650;

  // control
  private targetX = 0;
  private playerSpeed = 600; // px/s lateral
  private playerRadius = 22;

  // difficulty
  private diffMul = 1;

  constructor(app: Application, settings: QuickDodgeSettings) {
    super(app, settings);
  }

  async createScene(): Promise<void> {
    const s = (this as any).settings as QuickDodgeSettings;
    const diff = getDifficulty(s);
    this.remainMs = msFromSettingsSeconds(s, 'duration', 30_000);
    this.spawnBaseMs = (typeof s.spawnBaseMs === 'number' && isFinite(s.spawnBaseMs)) ? Math.max(50, Math.round(s.spawnBaseMs)) : 650;
    this.playerSpeed = (typeof s.playerSpeed === 'number' && isFinite(s.playerSpeed)) ? s.playerSpeed : 600;

    // difficulty multipliers (spawn rate + speed)
    if (diff === 'easy')  this.diffMul = 0.85;
    else if (diff === 'hard') this.diffMul = 1.25;
    else this.diffMul = 1.0;

    const W = this.app.renderer.width; const H = this.app.renderer.height;

    // background
    const bg = createGradientSprite(this.app, 0x0ea5e9, 0x022c44);
    this.scene.addChild(bg);

    // player
    this.player = new Graphics();
    this.player.beginFill(0xffffff); this.player.drawCircle(0, 0, this.playerRadius); this.player.endFill();
    this.player.x = W / 2; this.player.y = H - 80;
    this.targetX = this.player.x;
    this.scene.addChild(this.player);

    // input: follow pointer X (simple, low-latency)
    const onPointerMove = (e: FederatedPointerEvent) => {
      const local = e.global;
      this.targetX = clamp(local.x, 20, W - 20);
    };
    const onPointerDown = (e: FederatedPointerEvent) => onPointerMove(e);
    this.scene.eventMode = 'static';
    this.scene.on('pointermove', onPointerMove);
    this.scene.on('pointerdown', onPointerDown);

    this.container.addChild(this.scene);
  }

  handleInput(_event: FederatedPointerEvent): void {
    // Not used; we listen on scene for pointer events.
  }

  updateGame(deltaTime: number): void {
    if (this.finished) return;

    const dtMs = deltaTime * (1000 / 60);
    const dtSec = dtMs / 1000;
    const W = this.app.renderer.width; const H = this.app.renderer.height;

    // countdown
    this.remainMs -= dtMs;
    if (this.remainMs <= 0) {
      this.remainMs = 0;
      this.finish(true);
      return;
    }

    // spawn
    this.spawnAccumMs += dtMs;
    const interval = this.spawnBaseMs / this.diffMul;
    while (this.spawnAccumMs >= interval) {
      this.spawnAccumMs -= interval;
      this.spawnObstacle(W);
    }

    // player move towards targetX
    const dx = this.targetX - this.player.x;
    const maxStep = this.playerSpeed * dtSec;
    if (Math.abs(dx) <= maxStep) this.player.x = this.targetX;
    else this.player.x += Math.sign(dx) * maxStep;

    // update obstacles
    const survivors: Obstacle[] = [];
    for (const o of this.obstacles) {
      o.g.x += o.vx * dtSec;
      o.g.y += o.vy * dtSec;
      // bounce on sides a bit
      if (o.g.x < o.w/2 || o.g.x > W - o.w/2) o.vx *= -1;

      // collision test (circle vs AABB)
      if (this.hitCircleAABB(this.player.x, this.player.y, this.playerRadius, o)) {
        this.finish(false);
        return;
      }
      // keep if on screen
      if (o.g.y - o.h/2 <= H + 10) survivors.push(o);
      else this.scene.removeChild(o.g);
    }
    this.obstacles = survivors;
  }

  protected showResult(result: { success: boolean; score: number }): void {
    this.onGameEnd?.(result.success, result.score);
  }

  // --- internals ---
  private spawnObstacle(W: number) {
    const o = new Graphics();
    const w = 36 + Math.random() * 50;
    const h = 18 + Math.random() * 32;
    o.beginFill(0xffe08a); o.drawRoundedRect(-w/2, -h/2, w, h, 6); o.endFill();
    o.x = 30 + Math.random() * (W - 60);
    o.y = -40;

    // speed influenced by difficulty & randomness
    const vy = 220 * this.diffMul + Math.random() * 180 * this.diffMul; // downward
    const vx = (Math.random() - 0.5) * 160 * (0.7 + 0.6 * Math.random()); // lateral wobble

    this.scene.addChild(o);
    this.obstacles.push({ g: o, vx, vy, w, h });
  }

  private hitCircleAABB(cx: number, cy: number, cr: number, o: Obstacle) {
    const rx = o.g.x, ry = o.g.y, hw = o.w/2, hh = o.h/2;
    const nx = clamp(cx, rx - hw, rx + hw);
    const ny = clamp(cy, ry - hh, ry + hh);
    const dx = cx - nx, dy = cy - ny;
    return (dx*dx + dy*dy) <= (cr*cr);
  }

  private finish(success: boolean) {
    if (this.finished) return;
    this.finished = true;
    // score: based on remaining time
    const score = success ? Math.round(1000 + this.remainMs / 10) : Math.round(500 + this.remainMs / 20);
    this.showResult({ success, score });
  }
}
