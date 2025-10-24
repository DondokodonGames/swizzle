// MagicalCollectGame.ts
// Drop-in short game template (PixiJS + TypeScript)
// Register under key 'magical_collect' in your factory/registry.
//
// Gameplay:
// - Each round, a target ingredient (Fire / Water / Leaf / Star) is announced.
// - Drag your wand to collect ONLY the target ingredients. Avoid CURSED or wrong ones.
// - Reach the target count for the round before time runs out. Clear enough rounds overall.
//
// Project compatibility notes:
// - Do NOT narrow base types; import GameTemplate & GameSettings only.
// - Do NOT redeclare base fields like duration/difficulty/timerText.
// - Use an internal `finished` flag (avoid relying on a specific GameState union).
// - Emit results via `onGameEnd(success, score)`.
import { Application, Container, Graphics, Text, FederatedPointerEvent } from 'pixi.js';
import { GameTemplate, type GameSettings } from './GameTemplate';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface MagicalCollectSettings extends GameSettings {
  rounds?: number;           // total rounds to clear
  targetPerRound?: number;   // items to collect per round
  roundTimeMs?: number;      // time per round
  missesAllowed?: number;    // overall allowed wrong/cursed/timeout
  spawnBaseMs?: number;      // base spawn interval
  speedPxPerSec?: number;    // orb speed
  palette?: 'arcane' | 'forest' | 'night';
}

type Kind = 'fire' | 'water' | 'leaf' | 'star' | 'curse';

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

type Orb = {
  g: Graphics;
  x: number; y: number; r: number;
  vx: number; vy: number;
  kind: Kind;
  bornAt: number;
};

export class MagicalCollectGame extends GameTemplate {
  public onGameEnd?: (success: boolean, score: number) => void;

  private scene = new Container();
  private finished = false;
  private remainMs = 30_000;

  // UI
  private infoText!: Text;
  private promptText!: Text;
  private timeBar!: Graphics;

  // playfield / wand
  private wand!: Graphics;
  private wx = 0; private wy = 0; private wr = 34;
  private pointerDown = false;

  // runtime
  private spawnAccum = 0;
  private spawnBaseMs = 650;
  private speed = 160;
  private orbs: Orb[] = [];
  private roundsNeeded = 8;
  private roundsDone = 0;
  private roundTimeMs = 3200;
  private roundRemain = 3200;
  private targetPerRound = 8;
  private targetKind: Kind = 'fire';
  private misses = 0;
  private missesAllowed = 3;
  private score = 0;
  private combo = 0;

  // colors / theme
  private colors = {
    bgTop: 0x301934, bgBottom: 0x1a0b1e, // night-ish default
    text: 0xffffff,
    barBack: 0x374151, barFill: 0x8b5cf6,
    wand: 0xffffff,
    fire: 0xff6b6b, water: 0x3b82f6, leaf: 0x34d399, star: 0xfff1a6, curse: 0x111111,
    ring: 0xfcd34d,
  };

  constructor(app: Application, settings: MagicalCollectSettings) {
    super(app, settings);
  }

  async createScene(): Promise<void> {
    const s = (this as any).settings as MagicalCollectSettings;
    const diff = getDifficulty(s);
    const W = this.app.renderer.width, H = this.app.renderer.height;

    // overall duration
    this.remainMs = secondsToMs((s as any).duration as number, 30_000);

    // difficulty presets
    if (diff === 'easy') {
      this.roundsNeeded = 6; this.targetPerRound = 6; this.roundTimeMs = 3600; this.missesAllowed = 4;
      this.spawnBaseMs = 720; this.speed = 140; this.wr = 38;
    } else if (diff === 'hard') {
      this.roundsNeeded = 10; this.targetPerRound = 9; this.roundTimeMs = 2800; this.missesAllowed = 2;
      this.spawnBaseMs = 560; this.speed = 180; this.wr = 30;
    } else {
      this.roundsNeeded = 8; this.targetPerRound = 8; this.roundTimeMs = 3200; this.missesAllowed = 3;
      this.spawnBaseMs = 650; this.speed = 160; this.wr = 34;
    }

    // overrides
    if (typeof s.rounds === 'number' && isFinite(s.rounds)) this.roundsNeeded = clamp(Math.round(s.rounds), 3, 30);
    if (typeof s.targetPerRound === 'number' && isFinite(s.targetPerRound)) this.targetPerRound = clamp(Math.round(s.targetPerRound), 2, 30);
    if (typeof s.roundTimeMs === 'number' && isFinite(s.roundTimeMs)) this.roundTimeMs = clamp(Math.round(s.roundTimeMs), 1200, 8000);
    if (typeof s.missesAllowed === 'number' && isFinite(s.missesAllowed)) this.missesAllowed = clamp(Math.round(s.missesAllowed), 0, 10);
    if (typeof s.spawnBaseMs === 'number' && isFinite(s.spawnBaseMs)) this.spawnBaseMs = clamp(Math.round(s.spawnBaseMs), 200, 2000);
    if (typeof s.speedPxPerSec === 'number' && isFinite(s.speedPxPerSec)) this.speed = clamp(Math.round(s.speedPxPerSec), 60, 360);

    if (s.palette === 'forest') {
      this.colors.bgTop = 0x14532d; this.colors.bgBottom = 0x052e16; this.colors.barFill = 0x34d399;
    } else if (s.palette === 'arcane') {
      this.colors.bgTop = 0x1d243b; this.colors.bgBottom = 0x0c1020; this.colors.barFill = 0x8b5cf6;
    } else if (s.palette === 'night') {
      this.colors.bgTop = 0x0b1020; this.colors.bgBottom = 0x151a2b; this.colors.barFill = 0x3b82f6;
    }

    // background
    const bg = new Graphics();
    bg.beginFill(this.colors.bgTop); bg.drawRect(0, 0, W, Math.floor(H * 0.45)); bg.endFill();
    bg.beginFill(this.colors.bgBottom); bg.drawRect(0, Math.floor(H * 0.45), W, H); bg.endFill();
    this.scene.addChild(bg);

    // info text
    this.infoText = new Text('', {
      fontFamily: 'sans-serif', fontSize: Math.floor(Math.min(W, H) * 0.045),
      fill: this.colors.text, stroke: 0x000000, strokeThickness: 4,
    });
    this.infoText.anchor.set(0.5);
    this.infoText.x = W / 2; this.infoText.y = Math.floor(H * 0.18);
    this.scene.addChild(this.infoText);
    this.updateInfo();

    // prompt
    this.promptText = new Text('Ready?', {
      fontFamily: 'sans-serif', fontSize: Math.floor(Math.min(W, H) * 0.08),
      fill: this.colors.text, stroke: 0x000000, strokeThickness: 6,
    });
    this.promptText.anchor.set(0.5);
    this.promptText.x = W / 2; this.promptText.y = Math.floor(H * 0.28);
    this.scene.addChild(this.promptText);

    // time bar
    this.timeBar = new Graphics();
    this.scene.addChild(this.timeBar);

    // wand
    this.wx = W / 2; this.wy = Math.floor(H * 0.70);
    this.wand = new Graphics();
    this.drawWand();
    this.scene.addChild(this.wand);

    // input (drag to move wand)
    this.scene.eventMode = 'static';
    this.scene.on('pointerdown', (e: FederatedPointerEvent) => { this.pointerDown = true; const p = this.scene.toLocal(e.global); this.wx = p.x; this.wy = p.y; this.drawWand(); });
    this.scene.on('pointermove', (e: FederatedPointerEvent) => { if (!this.pointerDown) return; const p = this.scene.toLocal(e.global); this.wx = p.x; this.wy = p.y; this.clampWand(); this.drawWand(); });
    this.scene.on('pointerup',   () => { this.pointerDown = false; });
    this.scene.on('pointerupoutside', () => { this.pointerDown = false; });

    this.container.addChild(this.scene);

    // begin first round
    this.nextRound(true);
  }

  handleInput(_e: FederatedPointerEvent): void {
    // not used
  }

  updateGame(deltaTime: number): void {
    if (this.finished) return;
    const dtMs = deltaTime * (1000 / 60);
    const dt = dtMs / 1000;
    const W = this.app.renderer.width, H = this.app.renderer.height;

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
      // timeout -> miss
      this.registerMiss('timeout');
    }

    // spawn
    this.spawnAccum += dtMs;
    while (this.spawnAccum >= this.spawnBaseMs) {
      this.spawnAccum -= this.spawnBaseMs;
      this.spawnOrb();
    }

    // move orbs + bounce on edges
    const survivors: Orb[] = [];
    for (const o of this.orbs) {
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      if (o.x - o.r < 6) { o.x = o.r + 6; o.vx = Math.abs(o.vx); }
      if (o.x + o.r > W - 6) { o.x = W - o.r - 6; o.vx = -Math.abs(o.vx); }
      if (o.y - o.r < Math.floor(H * 0.40)) { o.y = Math.floor(H * 0.40) + o.r; o.vy = Math.abs(o.vy); }
      if (o.y + o.r > H - 10) { o.y = H - 10 - o.r; o.vy = -Math.abs(o.vy); }

      // collect?
      const dx = o.x - this.wx, dy = o.y - this.wy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist <= o.r + this.wr) {
        this.onCollect(o);
        continue;
      }

      // lifetime cull (keep scene light)
      if (performance.now() - o.bornAt < 12000) survivors.push(o);
      else this.scene.removeChild(o.g);
    }
    this.orbs = survivors;

    // redraw ui
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
    const y = Math.floor(this.app.renderer.height * 0.36);
    const w = Math.floor(W * 0.7);
    const x = Math.floor((W - w) / 2);
    const h = 10;
    const frac = clamp(this.roundRemain / this.roundTimeMs, 0, 1);
    this.timeBar.clear();
    this.timeBar.beginFill(this.colors.barBack, 0.4); this.timeBar.drawRoundedRect(x, y, w, h, 6); this.timeBar.endFill();
    this.timeBar.beginFill(this.colors.barFill, 0.95); this.timeBar.drawRoundedRect(x, y, Math.floor(w * frac), h, 6); this.timeBar.endFill();
  }

  private drawWand() {
    const g = this.wand;
    g.clear();
    g.lineStyle(4, this.colors.ring, 0.9);
    g.drawCircle(this.wx, this.wy, this.wr);
    g.endFill();
    g.beginFill(this.colors.wand, 0.6);
    g.drawCircle(this.wx, this.wy, Math.max(6, Math.floor(this.wr * 0.18)));
    g.endFill();
  }

  private clampWand() {
    const W = this.app.renderer.width, H = this.app.renderer.height;
    const top = Math.floor(H * 0.40);
    this.wx = clamp(this.wx, this.wr + 6, W - this.wr - 6);
    this.wy = clamp(this.wy, top + this.wr + 6, H - this.wr - 8);
  }

  private nextRound(first = false) {
    // pick target kind
    const kinds: Kind[] = ['fire', 'water', 'leaf', 'star'];
    this.targetKind = kinds[(Math.random() * kinds.length) | 0];
    this.promptText.text = `Collect ${this.targetKind.toUpperCase()} × ${this.targetPerRound}`;

    // reset
    this.roundRemain = this.roundTimeMs;
    this.combo = 0;
    // clear orbs
    for (const o of this.orbs) this.scene.removeChild(o.g);
    this.orbs = [];

    if (!first) this.updateInfo();
    this.drawTimeBar();
  }

  private spawnOrb() {
    const W = this.app.renderer.width, H = this.app.renderer.height;
    // bias: 45% target, 35% other goods, 20% curse
    const r = Math.random();
    let kind: Kind;
    if (r < 0.45) kind = this.targetKind;
    else if (r < 0.80) {
      const goods: Kind[] = ['fire', 'water', 'leaf', 'star'].filter(k => k !== this.targetKind) as Kind[];
      kind = goods[(Math.random() * goods.length) | 0];
    } else kind = 'curse';

    const g = new Graphics();
    const rad = 16 + Math.random() * 10;
    // draw shape by kind
    if (kind === 'fire') {
      g.beginFill(this.colors.fire, 0.95);
      g.drawCircle(0, 0, rad);
      g.endFill();
      // flame tip
      g.beginFill(0xffffff, 0.6);
      g.drawCircle(rad*0.2, -rad*0.2, rad*0.35);
      g.endFill();
    } else if (kind === 'water') {
      g.beginFill(this.colors.water, 0.95);
      g.drawEllipse(0, 0, rad*0.86, rad);
      g.endFill();
    } else if (kind === 'leaf') {
      g.beginFill(this.colors.leaf, 0.95);
      g.drawPolygon([-rad, 0, 0, -rad*0.9, rad, 0, 0, rad*0.9]);
      g.endFill();
    } else if (kind === 'star') {
      g.beginFill(this.colors.star, 0.95);
      const spikes = 5, outer = rad, inner = rad*0.5;
      for (let i = 0; i < spikes * 2; i++) {
        const ang = (Math.PI / spikes) * i - Math.PI / 2;
        const rr = (i % 2 === 0) ? outer : inner;
        const x = Math.cos(ang) * rr, y = Math.sin(ang) * rr;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.closePath(); g.endFill();
    } else {
      g.beginFill(this.colors.curse, 0.95);
      g.drawPolygon([-rad, -rad, rad, -rad, rad, rad, -rad, rad]);
      g.endFill();
    }

    const marginX = 12, top = Math.floor(H * 0.42), bottom = H - 14;
    let x = marginX + Math.random() * (W - marginX * 2);
    let y = top + Math.random() * (bottom - top);
    g.x = x; g.y = y;
    this.scene.addChild(g);

    const angle = Math.random() * Math.PI * 2;
    const speed = this.speed * (0.7 + Math.random() * 0.6);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    this.orbs.push({ g, x, y, r: rad, vx, vy, kind, bornAt: performance.now() });
  }

  private onCollect(o: Orb) {
    // remove from scene
    this.scene.removeChild(o.g);

    if (o.kind === this.targetKind) {
      this.targetPerRound--;
      this.combo++;
      const speedFrac = clamp(this.roundRemain / this.roundTimeMs, 0, 1);
      const base = 120, comboBonus = Math.min(10, this.combo) * 20, speedBonus = Math.round(60 * speedFrac);
      this.score += base + comboBonus + speedBonus;
      this.flash(this.wx, this.wy, 0x92e6a7);
      if (this.targetPerRound <= 0) {
        // round cleared
        this.roundsDone++;
        if (this.roundsDone >= this.roundsNeeded) {
          this.finish(true);
        } else {
          // restore target count for next round
          const s = (this as any).settings as MagicalCollectSettings;
          const diff = getDifficulty(s);
          const def = diff === 'easy' ? 6 : diff === 'hard' ? 9 : 8;
          const cfg = (typeof s.targetPerRound === 'number' && isFinite(s.targetPerRound)) ? clamp(Math.round(s.targetPerRound), 2, 30) : def;
          this.targetPerRound = cfg;
          setTimeout(() => this.nextRound(), 180);
        }
      }
    } else {
      // wrong or cursed -> miss
      this.registerMiss(o.kind === 'curse' ? 'curse' : 'wrong');
    }
  }

  private registerMiss(_why: 'wrong' | 'curse' | 'timeout') {
    this.combo = 0;
    this.misses++;
    this.score = Math.max(0, this.score - 150);
    this.flash(this.wx, this.wy, 0xff5a5a);
    if (this.misses > this.missesAllowed) {
      this.finish(false);
    } else {
      setTimeout(() => this.nextRound(), 220);
    }
  }

  private flash(x: number, y: number, color: number) {
    const g = new Graphics();
    g.beginFill(color, 0.22);
    g.drawCircle(0, 0, this.wr * 1.6);
    g.endFill();
    g.x = x; g.y = y;
    this.scene.addChild(g);
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      setTimeout(() => { g.alpha = Math.max(0, 0.22 * (1 - i/steps)); if (i === steps) this.scene.removeChild(g); }, i * 30);
    }
  }

  private finish(success: boolean) {
    if (this.finished) return;
    this.finished = true;
    const timeBonus = Math.round(this.remainMs / 6);
    const roundBonus = this.roundsDone * 60;
    const missPenalty = this.misses * 120;
    const score = Math.max(0, this.score + timeBonus + roundBonus - missPenalty + (success ? 800 : 0));
    this.onGameEnd?.(success, score);
  }
}
