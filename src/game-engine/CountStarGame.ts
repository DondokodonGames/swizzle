// CountStarGame.ts
// Drop-in short game template (PixiJS + TypeScript)
// Register under key 'count_star' in your factory/registry.
//
// Gameplay:
// - A bunch of stars appear briefly. Remember how many!
// - Stars hide, and multiple numeric options appear. Tap the correct count.
// - Clear a target number of rounds before time runs out.
//
// Project compatibility notes:
// - Do NOT narrow base types; import GameTemplate & GameSettings only.
// - Do NOT redeclare base fields like duration/difficulty/timerText.
// - Use an internal `finished` flag (no reliance on a specific GameState union).
// - Emit results via `onGameEnd(success, score)`.
import { Application, Container, Graphics, Text, FederatedPointerEvent } from 'pixi.js';
import { GameTemplate, type GameSettings } from './GameTemplate';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface CountStarSettings extends GameSettings {
  rounds?: number;          // questions to clear (default: easy=6 / normal=8 / hard=10)
  options?: number;         // number of answer options (3..6)
  showTimeMs?: number;      // how long stars are visible per round
  answerTimeMs?: number;    // time to answer after stars hide
  minStars?: number;        // optional min star count
  maxStars?: number;        // optional max star count
  missesAllowed?: number;   // max misses before fail
  palette?: 'night' | 'sunset' | 'forest';
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
function shuffle<T>(arr: T[]) { for (let i = arr.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
function uniqPush(arr: number[], v: number) { if (!arr.includes(v)) arr.push(v); }

type Tile = { root: Container; bg: Graphics; label: Text; index: number; value: number };
type Phase = 'show' | 'answer';

export class CountStarGame extends GameTemplate {
  public onGameEnd?: (success: boolean, score: number) => void;

  private scene = new Container();
  private finished = false;
  private remainMs = 30_000;

  // UI
  private titleText!: Text;
  private infoText!: Text;
  private timeBar!: Graphics;
  private tiles: Tile[] = [];
  private starsLayer = new Container();

  // layout
  private cols = 2;
  private rows = 2;
  private tileW = 160;
  private tileH = 110;
  private gapX = 18;
  private gapY = 14;

  // runtime
  private phase: Phase = 'show';
  private phaseRemain = 0; // ms remaining in current phase

  private roundsNeeded = 8;
  private roundsDone = 0;
  private optionsCount = 4;
  private missesAllowed = 3;
  private misses = 0;

  private showTimeMs = 1100;
  private answerTimeMs = 2600;

  private minStars = 5;
  private maxStars = 14;
  private currentCount = 0;
  private correctIndex = 0;

  // scoring
  private score = 0;
  private combo = 0;

  // colors
  private colors = {
    bgTop: 0x0b1020, bgBottom: 0x151a2b,
    star: 0xfff1a6, starAlt: 0xffffff,
    tile: 0xffffff, tileText: 0x1b1b1b,
    good: 0x92e6a7, bad: 0xff5a5a,
    barBack: 0x374151, barFill: 0x3b82f6,
    text: 0xffffff,
  };

  constructor(app: Application, settings: CountStarSettings) {
    super(app, settings);
  }

  async createScene(): Promise<void> {
    const s = (this as any).settings as CountStarSettings;
    const diff = getDifficulty(s);
    const W = this.app.renderer.width, H = this.app.renderer.height;

    // duration
    this.remainMs = secondsToMs((s as any).duration as number, 30_000);

    // difficulty presets
    if (diff === 'easy')       { this.roundsNeeded = 6; this.optionsCount = 3; this.missesAllowed = 4; this.showTimeMs = 1400; this.answerTimeMs = 3000; this.minStars = 3; this.maxStars = 10; }
    else if (diff === 'hard')  { this.roundsNeeded = 10; this.optionsCount = 5; this.missesAllowed = 2; this.showTimeMs = 900;  this.answerTimeMs = 2200; this.minStars = 8; this.maxStars = 18; }
    else                       { this.roundsNeeded = 8; this.optionsCount = 4; this.missesAllowed = 3; this.showTimeMs = 1100; this.answerTimeMs = 2600; this.minStars = 5; this.maxStars = 14; }

    // overrides
    if (typeof s.rounds === 'number' && isFinite(s.rounds)) this.roundsNeeded = clamp(Math.round(s.rounds), 3, 30);
    if (typeof s.options === 'number' && isFinite(s.options)) this.optionsCount = clamp(Math.round(s.options), 3, 6);
    if (typeof s.missesAllowed === 'number' && isFinite(s.missesAllowed)) this.missesAllowed = clamp(Math.round(s.missesAllowed), 0, 10);
    if (typeof s.showTimeMs === 'number' && isFinite(s.showTimeMs)) this.showTimeMs = clamp(Math.round(s.showTimeMs), 400, 5000);
    if (typeof s.answerTimeMs === 'number' && isFinite(s.answerTimeMs)) this.answerTimeMs = clamp(Math.round(s.answerTimeMs), 1000, 8000);
    if (typeof s.minStars === 'number' && isFinite(s.minStars)) this.minStars = clamp(Math.round(s.minStars), 1, 40);
    if (typeof s.maxStars === 'number' && isFinite(s.maxStars)) this.maxStars = clamp(Math.round(s.maxStars), Math.max(2, this.minStars + 1), 60);

    if (s.palette === 'forest') {
      this.colors.bgTop = 0x0b2e20; this.colors.bgBottom = 0x03150f; this.colors.barFill = 0x34d399;
    } else if (s.palette === 'sunset') {
      this.colors.bgTop = 0x301934; this.colors.bgBottom = 0x1a0b1e; this.colors.barFill = 0xff6b6b;
    } else if (s.palette === 'night') {
      this.colors.bgTop = 0x0b1020; this.colors.bgBottom = 0x151a2b; this.colors.barFill = 0x3b82f6;
    }

    // background
    const bg = new Graphics();
    bg.beginFill(this.colors.bgTop); bg.drawRect(0, 0, W, Math.floor(H * 0.45)); bg.endFill();
    bg.beginFill(this.colors.bgBottom); bg.drawRect(0, Math.floor(H * 0.45), W, H); bg.endFill();
    this.scene.addChild(bg);

    // title
    this.titleText = new Text('Count the Stars!', {
      fontFamily: 'sans-serif', fontSize: Math.floor(Math.min(W, H) * 0.06),
      fill: this.colors.text, stroke: 0x000000, strokeThickness: 5,
    });
    this.titleText.anchor.set(0.5);
    this.titleText.x = W / 2; this.titleText.y = Math.floor(H * 0.20);
    this.scene.addChild(this.titleText);

    // info
    this.infoText = new Text('', {
      fontFamily: 'sans-serif', fontSize: Math.floor(Math.min(W, H) * 0.045),
      fill: this.colors.text, stroke: 0x000000, strokeThickness: 4,
    });
    this.infoText.anchor.set(0.5);
    this.infoText.x = W / 2; this.infoText.y = Math.floor(H * 0.28);
    this.scene.addChild(this.infoText);
    this.updateInfo();

    // time bar
    this.timeBar = new Graphics();
    this.scene.addChild(this.timeBar);

    // stars layer
    this.starsLayer.y = Math.floor(H * 0.36);
    this.scene.addChild(this.starsLayer);

    // answer grid layout (prepared once)
    this.cols = Math.ceil(Math.sqrt(this.optionsCount));
    this.rows = Math.ceil(this.optionsCount / this.cols);
    const usableW = W - 80;
    const usableH = H - Math.floor(H * 0.50) - 40;
    this.tileW = Math.min(200, Math.floor(usableW / this.cols) - 16);
    this.tileH = Math.min(120, Math.floor(usableH / this.rows) - 16);
    this.gapX = Math.max(12, Math.floor((usableW - this.cols * this.tileW) / (this.cols + 1)));
    this.gapY = Math.max(10, Math.floor((usableH - this.rows * this.tileH) / (this.rows + 1)));

    const startY = Math.floor(H * 0.56);
    const startX = (W - (this.cols * this.tileW + (this.cols - 1) * this.gapX)) / 2 + this.tileW / 2;

    for (let i = 0; i < this.optionsCount; i++) {
      const root = new Container();
      const bgTile = new Graphics();
      bgTile.beginFill(this.colors.tile, 0.96);
      bgTile.drawRoundedRect(-this.tileW/2, -this.tileH/2, this.tileW, this.tileH, 16);
      bgTile.endFill();
      const label = new Text('', { fontFamily: 'sans-serif', fontSize: Math.floor(this.tileH * 0.44), fill: this.colors.tileText });
      label.anchor.set(0.5);
      root.addChild(bgTile, label);
      root.eventMode = 'static';
      const idx = i;
      root.on('pointertap', (e: FederatedPointerEvent) => { e.stopPropagation(); this.onTap(idx); });

      const c = i % this.cols; const r = Math.floor(i / this.cols);
      root.x = startX + c * (this.tileW + this.gapX);
      root.y = startY + r * (this.tileH + this.gapY);

      root.visible = false; // hidden during SHOW phase

      this.scene.addChild(root);
      this.tiles.push({ root, bg: bgTile, label, index: idx, value: 0 });
    }

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

    // overall timer
    this.remainMs -= dtMs;
    if (this.remainMs <= 0) {
      this.remainMs = 0;
      this.finish(this.roundsDone >= this.roundsNeeded);
      return;
    }

    // phase timer
    this.phaseRemain -= dtMs;
    if (this.phaseRemain <= 0) {
      if (this.phase === 'show') {
        this.switchToAnswer();
      } else {
        // answer timeout -> miss
        this.registerMiss('timeout');
      }
    }

    this.drawPhaseBar();
  }

  protected showResult(result: { success: boolean; score: number }): void {
    this.onGameEnd?.(result.success, result.score);
  }

  // ---- internals ----
  private updateInfo() {
    const remainS = Math.ceil(this.remainMs / 1000);
    this.infoText.text = `Round ${this.roundsDone}/${this.roundsNeeded}   Miss ${this.misses}/${this.missesAllowed}   Time ${remainS}s`;
  }

  private drawPhaseBar() {
    const W = this.app.renderer.width;
    const y = Math.floor(this.app.renderer.height * 0.33);
    const w = Math.floor(W * 0.7);
    const x = Math.floor((W - w) / 2);
    const h = 10;
    const total = (this.phase === 'show') ? this.showTimeMs : this.answerTimeMs;
    const frac = clamp(this.phaseRemain / total, 0, 1);
    this.timeBar.clear();
    this.timeBar.beginFill(this.colors.barBack, 0.4); this.timeBar.drawRoundedRect(x, y, w, h, 6); this.timeBar.endFill();
    this.timeBar.beginFill(this.colors.barFill, 0.95); this.timeBar.drawRoundedRect(x, y, Math.floor(w * frac), h, 6); this.timeBar.endFill();
  }

  private nextRound(first = false) {
    // choose count
    const count = (this.minStars + Math.floor(Math.random() * (this.maxStars - this.minStars + 1)));
    this.currentCount = count;

    // draw stars
    this.starsLayer.removeChildren();
    this.drawStars(count);

    // hide answers for show phase
    for (const t of this.tiles) t.root.visible = false;

    // set phase
    this.phase = 'show';
    this.phaseRemain = this.showTimeMs;
    this.drawPhaseBar();
    if (!first) this.updateInfo();
  }

  private switchToAnswer() {
    // hide stars
    this.starsLayer.visible = false;

    // build answers
    const opts: number[] = [this.currentCount];
    while (opts.length < this.optionsCount) {
      const jitter = ((Math.random() * 5) | 0) - 2; // -2..+2
      let v = this.currentCount + (jitter === 0 ? 3 : jitter);
      v = clamp(v, Math.max(1, this.minStars), this.maxStars + 4);
      uniqPush(opts, v);
    }
    shuffle(opts);
    this.correctIndex = opts.indexOf(this.currentCount);
    for (let i = 0; i < this.tiles.length; i++) {
      const t = this.tiles[i];
      t.value = opts[i] ?? 0;
      t.label.text = String(t.value);
      // reset style and show
      t.bg.clear();
      t.bg.beginFill(this.colors.tile, 0.96);
      t.bg.drawRoundedRect(-this.tileW/2, -this.tileH/2, this.tileW, this.tileH, 16);
      t.bg.endFill();
      t.root.visible = true;
    }

    this.phase = 'answer';
    this.phaseRemain = this.answerTimeMs;
    this.drawPhaseBar();
  }

  private onTap(idx: number) {
    if (this.finished || this.phase !== 'answer') return;
    const correct = (idx === this.correctIndex);
    if (correct) {
      this.roundsDone++;
      this.combo++;
      const speedFrac = clamp(this.phaseRemain / this.answerTimeMs, 0, 1);
      const base = 300, comboBonus = Math.min(7, this.combo) * 60, speedBonus = Math.round(140 * speedFrac);
      this.score += base + comboBonus + speedBonus;
      this.flashTile(this.tiles[idx], this.colors.good);
      if (this.roundsDone >= this.roundsNeeded) {
        this.finish(true);
      } else {
        // reset for next round
        this.starsLayer.visible = true;
        setTimeout(() => this.nextRound(), 180);
      }
    } else {
      this.registerMiss('wrong', idx);
    }
  }

  private registerMiss(_reason: 'wrong' | 'timeout', idx: number | null = null) {
    this.combo = 0;
    this.misses++;
    this.score = Math.max(0, this.score - 150);
    if (idx != null) this.flashTile(this.tiles[idx], this.colors.bad);
    // indicate correct tile briefly
    const c = this.tiles[this.correctIndex];
    this.flashTile(c, this.colors.good, 0.18);

    if (this.misses > this.missesAllowed) {
      this.finish(false);
    } else {
      this.starsLayer.visible = true;
      setTimeout(() => this.nextRound(), 220);
    }
  }

  private flashTile(tile: Tile, color: number, alpha = 0.28) {
    const g = new Graphics();
    g.beginFill(color, alpha);
    g.drawRoundedRect(-this.tileW/2, -this.tileH/2, this.tileW, this.tileH, 16);
    g.endFill();
    g.x = tile.root.x; g.y = tile.root.y;
    this.scene.addChild(g);
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      setTimeout(() => { g.alpha = Math.max(0, alpha * (1 - i/steps)); if (i === steps) this.scene.removeChild(g); }, i * 30);
    }
  }

  private drawStars(n: number) {
    const W = this.app.renderer.width;
    const H = this.app.renderer.height;
    const areaW = Math.floor(W * 0.76);
    const areaH = Math.floor(H * 0.16);
    const x0 = Math.floor((W - areaW) / 2);
    const y0 = Math.floor(H * 0.36);
    const minR = 8, maxR = 16;
    this.starsLayer.removeChildren();

    for (let i = 0; i < n; i++) {
      const r = Math.floor(minR + Math.random() * (maxR - minR));
      const x = x0 + r + Math.random() * (areaW - r * 2);
      const y = y0 + r + Math.random() * (areaH - r * 2);
      const star = new Graphics();
      const color = (i % 3 === 0) ? this.colors.star : this.colors.starAlt;
      this.drawStar(star, x, y, r, color);
      this.starsLayer.addChild(star);
    }
  }

  private drawStar(g: Graphics, cx: number, cy: number, R: number, color: number) {
    const spikes = 5;
    const outer = R;
    const inner = R * 0.5;
    g.beginFill(color, 1);
    for (let i = 0; i < spikes * 2; i++) {
      const ang = (Math.PI / spikes) * i - Math.PI / 2;
      const rad = (i % 2 === 0) ? outer : inner;
      const x = cx + Math.cos(ang) * rad;
      const y = cy + Math.sin(ang) * rad;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
    g.endFill();
  }

  private finish(success: boolean) {
    if (this.finished) return;
    this.finished = true;
    const timeBonus = Math.round(this.remainMs / 8);
    const roundBonus = this.roundsDone * 60;
    const missPenalty = this.misses * 120;
    const score = Math.max(0, this.score + timeBonus + roundBonus - missPenalty + (success ? 700 : 0));
    this.onGameEnd?.(success, score);
  }
}
