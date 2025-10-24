// CollectItemsGame.ts
// Drop-in short game template (PixiJS + TypeScript)
// Register under key 'collect_items' in your factory/registry.
//
// Design goals:
// - 30s one-shot play (duration from GameSettings.seconds)
// - Move a basket to collect GOOD items, avoid BAD items
// - Success if collected enough GOOD items before time runs out
// - Do not narrow base types; do not redeclare duration/difficulty locally
// - Internal `finished` flag instead of relying on GameState
//
import { Application, Container, Graphics, Sprite, Texture, FederatedPointerEvent } from 'pixi.js';
import { GameTemplate, type GameSettings } from './GameTemplate';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface CollectItemsSettings extends GameSettings {
  // Inherit: duration (seconds), difficulty from GameSettings
  spawnBaseMs?: number;   // base interval between spawns (ms). default 700
  badRatio?: number;      // probability of bad item [0..1]. default 0.35
  targetGood?: number;    // how many good items needed to succeed. default by difficulty
  playerSpeed?: number;   // basket lateral speed (px/s). default 700
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

// Item model (circle approximations for simplicity)
interface Item {
  g: Graphics;
  good: boolean;
  x: number;
  y: number;
  r: number;  // radius for bounds
  vx: number;
  vy: number;
}

export class CollectItemsGame extends GameTemplate {
  public onGameEnd?: (success: boolean, score: number) => void;

  private scene = new Container();
  private basket!: Graphics;
  private basketW = 140;
  private basketH = 24;
  private targetX = 0;
  private playerSpeed = 700;

  private items: Item[] = [];
  private finished = false;

  // timing
  private remainMs = 30_000;
  private spawnAccum = 0;
  private spawnBaseMs = 700;

  // goals & difficulty
  private goodNeeded = 12;
  private goodCount = 0;
  private badCount = 0;
  private badRatio = 0.35;
  private diffMul = 1;
  private maxBad = 2;

  constructor(app: Application, settings: CollectItemsSettings) {
    super(app, settings);
  }

  async createScene(): Promise<void> {
    const s = (this as any).settings as CollectItemsSettings;
    const diff = getDifficulty(s);

    // duration & params
    this.remainMs = secondsToMs((s as any).duration as number, 30_000);
    this.spawnBaseMs = (typeof s.spawnBaseMs === 'number' && isFinite(s.spawnBaseMs)) ? Math.max(50, Math.round(s.spawnBaseMs)) : 700;
    this.playerSpeed = (typeof s.playerSpeed === 'number' && isFinite(s.playerSpeed)) ? s.playerSpeed : 700;
    this.badRatio = (typeof s.badRatio === 'number' && isFinite(s.badRatio)) ? clamp(s.badRatio, 0, 1) : 0.35;

    // difficulty scaling
    if (diff === 'easy')  { this.diffMul = 0.85; this.maxBad = 3; this.goodNeeded = 10; }
    else if (diff === 'hard') { this.diffMul = 1.25; this.maxBad = 1; this.goodNeeded = 14; }
    else { this.diffMul = 1.0; this.maxBad = 2; this.goodNeeded = 12; }

    if (typeof s.targetGood === 'number' && isFinite(s.targetGood)) this.goodNeeded = Math.max(1, Math.round(s.targetGood));

    const W = this.app.renderer.width; const H = this.app.renderer.height;

    // background
    const bg = createGradientSprite(this.app, 0x14532d, 0x052e16);
    this.scene.addChild(bg);

    // basket
    this.basket = new Graphics();
    this.basket.beginFill(0xffffff, 0.95);
    this.basket.drawRoundedRect(-this.basketW/2, -this.basketH/2, this.basketW, this.basketH, 10);
    this.basket.endFill();
    this.basket.x = W / 2; this.basket.y = H - 70;
    this.targetX = this.basket.x;
    this.scene.addChild(this.basket);

    // input
    const onPointerMove = (e: FederatedPointerEvent) => {
      const local = e.global;
      this.targetX = clamp(local.x, this.basketW/2 + 10, W - this.basketW/2 - 10);
    };
    const onPointerDown = (e: FederatedPointerEvent) => onPointerMove(e);
    this.scene.eventMode = 'static';
    this.scene.on('pointermove', onPointerMove);
    this.scene.on('pointerdown', onPointerDown);

    this.container.addChild(this.scene);
  }

  handleInput(_e: FederatedPointerEvent): void {
    // not used
  }

  updateGame(deltaTime: number): void {
    if (this.finished) return;
    const dtMs = deltaTime * (1000 / 60);
    const dt = dtMs / 1000;
    const W = this.app.renderer.width; const H = this.app.renderer.height;

    // time
    this.remainMs -= dtMs;
    if (this.remainMs <= 0) {
      this.remainMs = 0;
      // success by goal
      this.finish(this.goodCount >= this.goodNeeded);
      return;
    }

    // spawn
    this.spawnAccum += dtMs;
    const interval = this.spawnBaseMs / this.diffMul;
    while (this.spawnAccum >= interval) {
      this.spawnAccum -= interval;
      this.spawnItem(W);
    }

    // move basket towards target
    const dx = this.targetX - this.basket.x;
    const maxStep = this.playerSpeed * dt;
    if (Math.abs(dx) <= maxStep) this.basket.x = this.targetX;
    else this.basket.x += Math.sign(dx) * maxStep;

    // update items
    const bLeft = this.basket.x - this.basketW/2;
    const bRight = this.basket.x + this.basketW/2;
    const bTop = this.basket.y - this.basketH/2;
    const bBottom = this.basket.y + this.basketH/2;

    const alive: Item[] = [];
    for (const it of this.items) {
      it.x += it.vx * dt;
      it.y += it.vy * dt;
      it.g.x = it.x; it.g.y = it.y;

      // catch? (circle vs rect)
      const nx = clamp(it.x, bLeft, bRight);
      const ny = clamp(it.y, bTop, bBottom);
      const dx2 = it.x - nx, dy2 = it.y - ny;
      const catchHit = (dx2*dx2 + dy2*dy2) <= (it.r*it.r);

      if (catchHit) {
        if (it.good) this.goodCount++; else this.badCount++;
        this.scene.removeChild(it.g);
        // early terminate success
        if (it.good && this.goodCount >= this.goodNeeded) {
          this.finish(true);
          return;
        }
        // too many bads -> fail
        if (!it.good && this.badCount > this.maxBad) {
          this.finish(false);
          return;
        }
        continue; // consumed
      }

      // off-screen?
      if (it.y - it.r > H + 10) {
        this.scene.removeChild(it.g);
        continue;
      }
      alive.push(it);
    }
    this.items = alive;
  }

  protected showResult(result: { success: boolean; score: number }): void {
    this.onGameEnd?.(result.success, result.score);
  }

  // ---- internals ----
  private spawnItem(W: number) {
    const good = Math.random() > this.badRatio;
    const g = new Graphics();
    let r = 18 + Math.random() * 10;
    if (good) {
      // good: circle (yellow-ish)
      g.beginFill(0xfff1a6); g.drawCircle(0, 0, r); g.endFill();
    } else {
      // bad: triangle (red-ish)
      r = 20;
      g.beginFill(0xff5a5a);
      g.moveTo(0, -r);
      g.lineTo(r * 0.9, r);
      g.lineTo(-r * 0.9, r);
      g.lineTo(0, -r);
      g.endFill();
    }
    const x = 20 + Math.random() * (W - 40);
    const y = -30;
    g.x = x; g.y = y;

    // velocity
    const vy = (good ? 260 : 300) * this.diffMul + Math.random() * 120 * this.diffMul;
    const vx = (Math.random() - 0.5) * 60;

    this.scene.addChild(g);
    this.items.push({ g, good, x, y, r, vx, vy });
  }

  private finish(success: boolean) {
    if (this.finished) return;
    this.finished = true;
    // score: 100 per good, penalty 200 per bad, time bonus
    const base = this.goodCount * 100 - this.badCount * 200;
    const bonus = Math.round(this.remainMs / 20);
    const score = Math.max(0, base + bonus + (success ? 500 : 0));
    this.onGameEnd?.(success, score);
  }
}
