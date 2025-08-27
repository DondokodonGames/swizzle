// SpeedFriendGame.ts
// Drop-in short game template (PixiJS + TypeScript)
// Register under key 'speed_friend' in your factory/registry.
//
// Gameplay:
// - Quick-fire quiz. A short question is shown with multiple choices.
// - Tap the correct answer before the per-question timer ends.
// - Reach target number of correct answers before overall time runs out to clear.
//
// Project compatibility notes:
// - Do NOT narrow base types; import GameTemplate & GameSettings only.
// - Do NOT redeclare base fields like duration/difficulty/timerText.
// - Use an internal `finished` flag (avoid relying on a specific GameState union).
// - Emit results via `onGameEnd(success, score)`.
import { Application, Container, Graphics, Text, FederatedPointerEvent } from 'pixi.js';
import { GameTemplate, type GameSettings } from './GameTemplate';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface SpeedFriendSettings extends GameSettings {
  options?: number;        // options per question (defaults: easy=3, normal=4, hard=5)
  targetCorrect?: number;  // required correct answers to clear (defaults: 8/10/12)
  questionTimeMs?: number; // per-question time limit
  missesAllowed?: number;  // number of misses allowed before fail
  palette?: 'classic' | 'forest' | 'sunset';
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

type Tile = { root: Container; bg: Graphics; label: Text; index: number; };
type Q = { prompt: string; options: string[]; correct: number };

export class SpeedFriendGame extends GameTemplate {
  public onGameEnd?: (success: boolean, score: number) => void;

  private scene = new Container();
  private finished = false;
  private remainMs = 30_000;

  // UI
  private promptText!: Text;
  private infoText!: Text;
  private tiles: Tile[] = [];
  private timeBar!: Graphics;

  // layout
  private cols = 2;
  private rows = 2;
  private tileW = 220;
  private tileH = 120;
  private gapX = 18;
  private gapY = 16;

  // runtime
  private optionsCount = 4;
  private targetCorrect = 10;
  private missesAllowed = 3;
  private correctSoFar = 0;
  private misses = 0;
  private questionTimeMs = 3000;
  private questionRemain = 3000;
  private awaiting = false;
  private currentQ!: Q;
  private score = 0;
  private combo = 0;

  // colors
  private colors = {
    bgTop: 0x0b1020, bgBottom: 0x151a2b,
    tile: 0xffffff, tileText: 0x1b1b1b,
    good: 0x92e6a7, bad: 0xff5a5a,
    text: 0xffffff,
    barBack: 0x374151, barFill: 0x3b82f6,
  };

  constructor(app: Application, settings: SpeedFriendSettings) {
    super(app, settings);
  }

  async createScene(): Promise<void> {
    const s = (this as any).settings as SpeedFriendSettings;
    const diff = getDifficulty(s);
    const W = this.app.renderer.width, H = this.app.renderer.height;

    // duration
    this.remainMs = secondsToMs((s as any).duration as number, 30_000);

    // difficulty presets
    if (diff === 'easy')       { this.optionsCount = 3; this.targetCorrect = 8;  this.missesAllowed = 4; this.questionTimeMs = 3600; }
    else if (diff === 'hard')  { this.optionsCount = 5; this.targetCorrect = 12; this.missesAllowed = 2; this.questionTimeMs = 2600; }
    else                       { this.optionsCount = 4; this.targetCorrect = 10; this.missesAllowed = 3; this.questionTimeMs = 3000; }

    // overrides
    if (typeof s.options === 'number' && isFinite(s.options)) this.optionsCount = clamp(Math.round(s.options), 3, 5);
    if (typeof s.targetCorrect === 'number' && isFinite(s.targetCorrect)) this.targetCorrect = clamp(Math.round(s.targetCorrect), 4, 30);
    if (typeof s.missesAllowed === 'number' && isFinite(s.missesAllowed)) this.missesAllowed = clamp(Math.round(s.missesAllowed), 0, 10);
    if (typeof s.questionTimeMs === 'number' && isFinite(s.questionTimeMs)) this.questionTimeMs = clamp(Math.round(s.questionTimeMs), 800, 6000);

    if (s.palette === 'forest') {
      this.colors.bgTop = 0x0b2e20; this.colors.bgBottom = 0x03150f; this.colors.barFill = 0x34d399;
    } else if (s.palette === 'sunset') {
      this.colors.bgTop = 0x301934; this.colors.bgBottom = 0x1a0b1e; this.colors.barFill = 0xff6b6b;
    }

    // background
    const bg = new Graphics();
    bg.beginFill(this.colors.bgTop); bg.drawRect(0, 0, W, Math.floor(H * 0.45)); bg.endFill();
    bg.beginFill(this.colors.bgBottom); bg.drawRect(0, Math.floor(H * 0.45), W, H); bg.endFill();
    this.scene.addChild(bg);

    // info
    this.infoText = new Text('', {
      fontFamily: 'sans-serif', fontSize: Math.floor(Math.min(W, H) * 0.05),
      fill: this.colors.text, stroke: 0x000000, strokeThickness: 5,
    });
    this.infoText.anchor.set(0.5);
    this.infoText.x = W / 2; this.infoText.y = Math.floor(H * 0.20);
    this.scene.addChild(this.infoText);
    this.updateInfo();

    // prompt
    this.promptText = new Text('Ready?', {
      fontFamily: 'sans-serif', fontSize: Math.floor(Math.min(W, H) * 0.09),
      fill: this.colors.text, stroke: 0x000000, strokeThickness: 6,
    });
    this.promptText.anchor.set(0.5);
    this.promptText.x = W / 2; this.promptText.y = Math.floor(H * 0.35);
    this.scene.addChild(this.promptText);

    // time bar
    this.timeBar = new Graphics();
    this.scene.addChild(this.timeBar);

    // grid layout
    this.cols = Math.ceil(Math.sqrt(this.optionsCount));
    this.rows = Math.ceil(this.optionsCount / this.cols);
    const usableW = W - 80;
    const usableH = H - Math.floor(H * 0.48) - 40;
    this.tileW = Math.min(240, Math.floor(usableW / this.cols) - 16);
    this.tileH = Math.min(140, Math.floor(usableH / this.rows) - 16);
    this.gapX = Math.max(12, Math.floor((usableW - this.cols * this.tileW) / (this.cols + 1)));
    this.gapY = Math.max(10, Math.floor((usableH - this.rows * this.tileH) / (this.rows + 1)));

    const startY = Math.floor(H * 0.48);
    const startX = (W - (this.cols * this.tileW + (this.cols - 1) * this.gapX)) / 2 + this.tileW / 2;

    // tiles
    for (let i = 0; i < this.optionsCount; i++) {
      const root = new Container();
      const bgTile = new Graphics();
      bgTile.beginFill(this.colors.tile, 0.96);
      bgTile.drawRoundedRect(-this.tileW/2, -this.tileH/2, this.tileW, this.tileH, 16);
      bgTile.endFill();
      const label = new Text('', { fontFamily: 'sans-serif', fontSize: Math.floor(this.tileH * 0.34), fill: this.colors.tileText });
      label.anchor.set(0.5);
      root.addChild(bgTile, label);
      root.eventMode = 'static';
      const idx = i;
      root.on('pointertap', (e: FederatedPointerEvent) => { e.stopPropagation(); this.onTap(idx); });

      const c = i % this.cols; const r = Math.floor(i / this.cols);
      root.x = startX + c * (this.tileW + this.gapX);
      root.y = startY + r * (this.tileH + this.gapY);

      this.scene.addChild(root);
      this.tiles.push({ root, bg: bgTile, label, index: idx });
    }

    this.container.addChild(this.scene);

    // start first question
    this.nextQuestion(true);
  }

  handleInput(_e: FederatedPointerEvent): void {
    // not used
  }

  updateGame(deltaTime: number): void {
    if (this.finished) return;
    const dtMs = deltaTime * (1000 / 60);

    // overall time
    this.remainMs -= dtMs;
    if (this.remainMs <= 0) {
      this.remainMs = 0;
      this.finish(this.correctSoFar >= this.targetCorrect);
      return;
    }

    if (this.awaiting) {
      this.questionRemain -= dtMs;
      this.drawTimeBar();
      if (this.questionRemain <= 0) {
        this.registerMiss('timeout');
      }
    }
  }

  protected showResult(result: { success: boolean; score: number }): void {
    this.onGameEnd?.(result.success, result.score);
  }

  // ---- internals ----
  private updateInfo() {
    const remainS = Math.ceil(this.remainMs / 1000);
    this.infoText.text = `Correct ${this.correctSoFar}/${this.targetCorrect}  Miss ${this.misses}/${this.missesAllowed}  Time ${remainS}s`;
  }

  private drawTimeBar() {
    const W = this.app.renderer.width;
    const y = Math.floor(this.app.renderer.height * 0.44);
    const w = Math.floor(W * 0.7);
    const x = Math.floor((W - w) / 2);
    const h = 10;
    const frac = clamp(this.questionRemain / this.questionTimeMs, 0, 1);
    this.timeBar.clear();
    this.timeBar.beginFill(this.colors.barBack, 0.4); this.timeBar.drawRoundedRect(x, y, w, h, 6); this.timeBar.endFill();
    this.timeBar.beginFill(this.colors.barFill, 0.95); this.timeBar.drawRoundedRect(x, y, Math.floor(w * frac), h, 6); this.timeBar.endFill();
  }

  private nextQuestion(first = false) {
    this.currentQ = this.generateQuestion(this.optionsCount);
    this.promptText.text = this.currentQ.prompt;
    for (let i = 0; i < this.tiles.length; i++) {
      const t = this.tiles[i];
      const txt = this.currentQ.options[i] ?? '';
      t.label.text = txt;
      // reset bg
      t.bg.clear();
      t.bg.beginFill(this.colors.tile, 0.96);
      t.bg.drawRoundedRect(-this.tileW/2, -this.tileH/2, this.tileW, this.tileH, 16);
      t.bg.endFill();
    }
    this.questionRemain = this.questionTimeMs;
    this.awaiting = true;
    this.drawTimeBar();
    if (!first) this.updateInfo();
  }

  private onTap(idx: number) {
    if (!this.awaiting || this.finished) return;
    const correct = (idx === this.currentQ.correct);
    if (correct) {
      this.awaiting = false;
      this.correctSoFar++;
      this.combo++;
      const speedFrac = clamp(this.questionRemain / this.questionTimeMs, 0, 1);
      const base = 300, comboBonus = Math.min(7, this.combo) * 60, speedBonus = Math.round(140 * speedFrac);
      this.score += base + comboBonus + speedBonus;
      this.flashTile(this.tiles[idx], this.colors.good);
      if (this.correctSoFar >= this.targetCorrect) {
        this.finish(true);
      } else {
        setTimeout(() => this.nextQuestion(), 120);
      }
    } else {
      this.registerMiss('wrong', idx);
    }
  }

  private registerMiss(_reason: 'wrong' | 'timeout', idx: number | null = null) {
    if (!this.awaiting || this.finished) return;
    this.awaiting = false;
    this.combo = 0;
    this.misses++;
    this.score = Math.max(0, this.score - 150);
    if (idx != null) this.flashTile(this.tiles[idx], this.colors.bad);
    // briefly mark the correct tile
    const c = this.tiles[this.currentQ.correct];
    this.flashTile(c, this.colors.good, 0.18);
    if (this.misses > this.missesAllowed) {
      this.finish(false);
    } else {
      setTimeout(() => this.nextQuestion(), 200);
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

  // Question generator: basic numeracy & patterns suitable for quick taps.
  private generateQuestion(nOpts: number): Q {
    const pick = Math.random();
    if (pick < 0.22) return this.qAdd(nOpts);
    if (pick < 0.44) return this.qSub(nOpts);
    if (pick < 0.62) return this.qMax(nOpts);
    if (pick < 0.80) return this.qEven(nOpts);
    return this.qSequence(nOpts);
  }

  private qAdd(nOpts: number): Q {
    const a = 2 + ((Math.random() * 8) | 0);
    const b = 1 + ((Math.random() * 8) | 0);
    const ans = a + b;
    const opts: number[] = [ans];
    while (opts.length < nOpts) {
      const off = ((Math.random() * 5) | 0) - 2; // -2..+2
      const v = ans + (off === 0 ? 3 : off);
      uniqPush(opts, v);
    }
    shuffle(opts);
    return { prompt: `${a} + ${b} = ?`, options: opts.map(String), correct: opts.indexOf(ans) };
  }

  private qSub(nOpts: number): Q {
    const a = 6 + ((Math.random() * 10) | 0);
    const b = 1 + ((Math.random() * Math.min(8, a-1)) | 0);
    const ans = a - b;
    const opts: number[] = [ans];
    while (opts.length < nOpts) {
      const v = ans + (((Math.random() * 5) | 0) - 2);
      uniqPush(opts, Math.max(0, v));
    }
    shuffle(opts);
    return { prompt: `${a} - ${b} = ?`, options: opts.map(String), correct: opts.indexOf(ans) };
  }

  private qMax(nOpts: number): Q {
    const opts: number[] = [];
    while (opts.length < nOpts) {
      const v = 1 + ((Math.random() * 40) | 0);
      uniqPush(opts, v);
    }
    const max = Math.max(...opts);
    shuffle(opts);
    return { prompt: `Which is the largest?`, options: opts.map(String), correct: opts.indexOf(max) };
  }

  private qEven(nOpts: number): Q {
    const opts: number[] = [];
    let evenCount = 0;
    while (opts.length < nOpts) {
      let v = 1 + ((Math.random() * 40) | 0);
      if (Math.random() < 0.4) v += v % 2; // sometimes force even
      uniqPush(opts, v);
    }
    for (const v of opts) if (v % 2 === 0) evenCount++;
    if (evenCount === 0) opts[(Math.random()*opts.length)|0]++; // force at least one even
    const correctIndex = opts.findIndex(v => v % 2 === 0);
    return { prompt: `Which number is even?`, options: opts.map(String), correct: correctIndex };
  }

  private qSequence(nOpts: number): Q {
    const start = 1 + ((Math.random() * 8) | 0);
    const step = 1 + ((Math.random() * 5) | 0);
    const seq = [start, start + step, start + step * 2];
    const ans = start + step * 3;
    const opts: number[] = [ans];
    while (opts.length < nOpts) {
      const v = ans + (((Math.random() * 6) | 0) - 3);
      uniqPush(opts, v);
    }
    shuffle(opts);
    return { prompt: `Next: ${seq.join(', ')}, ?`, options: opts.map(String), correct: opts.indexOf(ans) };
  }

  private finish(success: boolean) {
    if (this.finished) return;
    this.finished = true;
    const timeBonus = Math.round(this.remainMs / 8);
    const correctBonus = this.correctSoFar * 70;
    const missPenalty = this.misses * 120;
    const score = Math.max(0, this.score + timeBonus + correctBonus - missPenalty + (success ? 700 : 0));
    this.onGameEnd?.(success, score);
  }
}
