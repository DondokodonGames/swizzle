// FriendlyShootGame.ts
// Drop-in short game template (PixiJS + TypeScript)
// Register under key 'friendly_shoot' in your factory/registry.
//
// Gameplay:
// - Targets pop up at random positions for a short time.
// - Tap targets to "shoot". Hitting BAD targets causes penalty (or failure if configured).
// - Reach the required number of GOOD hits before the timer ends to clear.
//
// Project compatibility notes:
// - Do NOT narrow base types; import GameTemplate & GameSettings only.
// - Do NOT redeclare base fields like duration/difficulty from GameTemplate.
// - Use an internal `finished` flag instead of relying on a specific GameState union.
// - Report results via `onGameEnd(success, score)`.
import { Application, Container, Graphics, Text, FederatedPointerEvent } from 'pixi.js';
import { GameTemplate, type GameSettings } from './GameTemplate';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface FriendlyShootSettings extends GameSettings {
  targetHits?: number;     // required number of GOOD hits to clear (defaults by difficulty)
  spawnBaseMs?: number;    // base spawn interval for targets
  lifetimeMs?: number;     // base lifetime per target
  badRatio?: number;       // 0..1 chance that a spawned target is BAD (bomb)
  allowBadMax?: number;    // max bad hits allowed before fail
  moveTargets?: boolean;   // whether targets drift slightly
  palette?: 'steel' | 'forest' | 'candy';
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

type Target = {
  g: Graphics;
  x: number;
  y: number;
  r: number;
  lifeMs: number;
  good: boolean;
  vx: number;
  vy: number;
};

export class FriendlyShootGame extends GameTemplate {
  public onGameEnd?: (success: boolean, score: number) => void;

  private scene = new Container();
  private finished = false;
  private remainMs = 30_000;

  // runtime
  private targets: Target[] = [];
  private spawnAccum = 0;
  private spawnBaseMs = 700;
  private lifetimeMs = 1200;
  private moveTargets = true;
  private badRatio = 0.2;
  private allowBadMax = 2;

  private hitsNeeded = 15;
  private goodHits = 0;
  private badHits = 0;

  // difficulty scaling
  private sizeMul = 1.0;
  private rateMul = 1.0;

  // scoring
  private score = 0;
  private combo = 0;

  // UI feedback
  private infoText!: Text;

  // colors
  private colors = {
    bgTop: 0x0b1020, bgBottom: 0x151a2b,
    good: 0x92e6a7, bad: 0xff5a5a,
    targetGood: 0xffffff, targetBad: 0xf97316,
    text: 0xffffff, dim: 0x94a3b8,
  };

  constructor(app: Application, settings: FriendlyShootSettings) {
    super(app, settings);
  }

  async createScene(): Promise<void> {
    const s = (this as any).settings as FriendlyShootSettings;
    const diff = getDifficulty(s);
    const W = this.app.renderer.width, H = this.app.renderer.height;

    // duration
    this.remainMs = secondsToMs((s as any).duration as number, 30_000);

    // difficulty presets
    if (diff === 'easy')       { this.hitsNeeded = 12; this.spawnBaseMs = 780; this.lifetimeMs = 1400; this.sizeMul = 1.15; this.rateMul = 0.95; this.allowBadMax = 3; }
    else if (diff === 'hard')  { this.hitsNeeded = 18; this.spawnBaseMs = 580; this.lifetimeMs = 1000; this.sizeMul = 0.9; this.rateMul = 1.15; this.allowBadMax = 1; }
    else                       { this.hitsNeeded = 15; this.spawnBaseMs = 680; this.lifetimeMs = 1200; this.sizeMul = 1.0; this.rateMul = 1.0; this.allowBadMax = 2; }

    // overrides
    if (typeof s.targetHits === 'number' && isFinite(s.targetHits)) this.hitsNeeded = clamp(Math.round(s.targetHits), 6, 40);
    if (typeof s.spawnBaseMs === 'number' && isFinite(s.spawnBaseMs)) this.spawnBaseMs = clamp(Math.round(s.spawnBaseMs), 120, 2000);
    if (typeof s.lifetimeMs === 'number' && isFinite(s.lifetimeMs)) this.lifetimeMs = clamp(Math.round(s.lifetimeMs), 400, 4000);
    if (typeof s.badRatio === 'number' && isFinite(s.badRatio)) this.badRatio = clamp(s.badRatio, 0, 1);
    if (typeof s.allowBadMax === 'number' && isFinite(s.allowBadMax)) this.allowBadMax = clamp(Math.round(s.allowBadMax), 0, 10);
    if (typeof s.moveTargets === 'boolean') this.moveTargets = s.moveTargets;
    if (s.palette === 'forest') {
      this.colors.bgTop = 0x0b2e20; this.colors.bgBottom = 0x03150f; this.colors.targetBad = 0x34d399;
    } else if (s.palette === 'candy') {
      this.colors.bgTop = 0x3b2240; this.colors.bgBottom = 0x1a0b1e; this.colors.targetBad = 0xff6b6b;
    }

    // background split
    const bg = new Graphics();
    bg.beginFill(this.colors.bgTop); bg.drawRect(0, 0, W, Math.floor(H * 0.45)); bg.endFill();
    bg.beginFill(this.colors.bgBottom); bg.drawRect(0, Math.floor(H * 0.45), W, H); bg.endFill();
    this.scene.addChild(bg);

    // info text (top)
    this.infoText = new Text('', {
      fontFamily: 'sans-serif', fontSize: Math.floor(Math.min(W, H) * 0.05),
      fill: this.colors.text, stroke: 0x000000, strokeThickness: 5,
    });
    this.infoText.anchor.set(0.5);
    this.infoText.x = W / 2; this.infoText.y = Math.floor(H * 0.22);
    this.scene.addChild(this.infoText);
    this.updateInfo();

    // input
    this.scene.eventMode = 'static';
    this.scene.on('pointertap', (e: FederatedPointerEvent) => this.onTap(e));

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
      this.finish(this.goodHits >= this.hitsNeeded);
      return;
    }

    // spawn
    this.spawnAccum += dtMs;
    const interval = (this.spawnBaseMs / this.rateMul);
    while (this.spawnAccum >= interval) {
      this.spawnAccum -= interval;
      this.spawnTarget();
      // ramp difficulty slightly
      this.rateMul = Math.min(1.6, this.rateMul * 1.01);
    }

    // update targets
    const alive: Target[] = [];
    for (const t of this.targets) {
      t.lifeMs -= dtMs;
      if (this.moveTargets) {
        t.x += t.vx * dt;
        t.y += t.vy * dt;
        // bounce softly at edges
        const r = t.r;
        if (t.x < r + 10 || t.x > W - r - 10) t.vx *= -1;
        if (t.y < r + 10 || t.y > H - r - 10) t.vy *= -1;
        t.g.x = t.x; t.g.y = t.y;
      }
      if (t.lifeMs <= 0) {
        // expire
        this.scene.removeChild(t.g);
      } else {
        alive.push(t);
      }
    }
    this.targets = alive;
  }

  protected showResult(result: { success: boolean; score: number }): void {
    this.onGameEnd?.(result.success, result.score);
  }

  // ---- internals ----
  private updateInfo() {
    this.infoText.text = `Hits: ${this.goodHits}/${this.hitsNeeded}  Bad: ${this.badHits}/${this.allowBadMax}`;
  }

  private spawnTarget() {
    const W = this.app.renderer.width, H = this.app.renderer.height;
    const good = Math.random() > this.badRatio;

    const rBase = Math.min(W, H) * 0.05;
    const r = clamp(rBase * (good ? 1.0 : 0.9) * this.sizeMul, 14, 46);
    const margin = 20 + r;
    const x = margin + Math.random() * (W - margin * 2);
    const y = Math.max(margin + 40, Math.min(H - margin - 20, margin + 40 + Math.random() * (H - margin * 2 - 60)));

    const g = new Graphics();
    if (good) {
      // bullseye target
      g.beginFill(0xffffff, 1); g.drawCircle(0, 0, r); g.endFill();
      g.beginFill(0x1f2937, 1); g.drawCircle(0, 0, r * 0.65); g.endFill();
      g.beginFill(0xffffff, 1); g.drawCircle(0, 0, r * 0.35); g.endFill();
    } else {
      // bomb
      g.beginFill(this.colors.targetBad, 1); g.drawCircle(0, 0, r * 0.9); g.endFill();
      // fuse
      g.beginFill(0x222222, 1); g.drawRect(-r*0.15, -r*1.1, r*0.3, r*0.35); g.endFill();
    }
    g.x = x; g.y = y;
    g.eventMode = 'passive'; // we'll handle taps at scene level

    this.scene.addChild(g);

    const vx = (Math.random() - 0.5) * (good ? 40 : 60);
    const vy = (Math.random() - 0.5) * (good ? 40 : 60);
    this.targets.push({ g, x, y, r, lifeMs: this.lifetimeMs, good, vx, vy });
  }

  private onTap(e: FederatedPointerEvent) {
    if (this.finished) return;
    const p = this.scene.toLocal(e.global);
    // check topmost first
    for (let i = this.targets.length - 1; i >= 0; i--) {
      const t = this.targets[i];
      const dx = p.x - t.x, dy = p.y - t.y;
      if (dx*dx + dy*dy <= t.r*t.r) {
        // HIT
        if (t.good) this.onGoodHit(t); else this.onBadHit(t);
        // remove
        this.scene.removeChild(t.g);
        this.targets.splice(i, 1);
        return;
      }
    }
    // tap empty space => no penalty (keeps pace fast)
  }

  private onGoodHit(t: Target) {
    this.goodHits++;
    this.combo++;
    const lifeFrac = clamp(t.lifeMs / this.lifetimeMs, 0, 1);
    const base = 280;
    const comboBonus = Math.min(8, this.combo) * 50;
    const speedBonus = Math.round(160 * lifeFrac);
    this.score += base + comboBonus + speedBonus;
    this.flashCircle(t.x, t.y, this.colors.good, t.r * 1.3);

    if (this.goodHits >= this.hitsNeeded) {
      this.finish(true);
    } else {
      this.updateInfo();
    }
  }

  private onBadHit(t: Target) {
    this.combo = 0;
    this.badHits++;
    this.score = Math.max(0, this.score - 200);
    this.flashCircle(t.x, t.y, this.colors.bad, t.r * 1.3);
    this.updateInfo();
    if (this.badHits > this.allowBadMax) {
      this.finish(false);
    }
  }

  private flashCircle(x: number, y: number, color: number, R: number) {
    const g = new Graphics();
    g.beginFill(color, 0.28); g.drawCircle(0, 0, R); g.endFill();
    g.x = x; g.y = y; this.scene.addChild(g);
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      setTimeout(() => { g.alpha = Math.max(0, 0.28 * (1 - i/steps)); if (i === steps) this.scene.removeChild(g); }, i * 30);
    }
  }

  private finish(success: boolean) {
    if (this.finished) return;
    this.finished = true;
    const timeBonus = Math.round(this.remainMs / 8);
    const hitBonus = this.goodHits * 60;
    const badPenalty = this.badHits * 120;
    const score = Math.max(0, this.score + timeBonus + hitBonus - badPenalty + (success ? 800 : 0));
    this.onGameEnd?.(success, score);
  }
}
