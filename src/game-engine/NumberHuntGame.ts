// NumberHuntGame.ts
// Drop-in short game template (PixiJS + TypeScript)
// Register under key 'number_hunt' in your factory/registry.
//
// Gameplay:
// - A grid of digits appears. A target number is announced (e.g., "Find all 7!").
// - Tap all tiles matching the target before the per-round timer ends.
// - Clear enough rounds before the overall timer ends.
//
// Project compatibility notes:
// - Do NOT narrow base types; import GameTemplate & GameSettings only.
// - Do NOT redeclare base fields like duration/difficulty/timerText.
// - Use an internal `finished` flag (no reliance on a specific GameState union).
// - Emit results via `onGameEnd(success, score)`.
import { Application, Container, Graphics, Text, FederatedPointerEvent } from 'pixi.js';
import { GameTemplate, type GameSettings } from './GameTemplate';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface NumberHuntSettings extends GameSettings {
  rounds?: number;          // rounds to clear (default by difficulty)
  gridCols?: number;        // 3..6
  gridRows?: number;        // 3..6
  digitsMax?: number;       // max digit (3..9) inclusive
  targetsPerRound?: number; // number of target tiles per round (auto if undefined)
  roundTimeMs?: number;     // time per round
  missesAllowed?: number;   // overall wrong-tap/timeouts allowed before fail
  palette?: 'night' | 'forest' | 'sunset';
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

type Tile = { root: Container; bg: Graphics; label: Text; value: number; found: boolean; index: number };

export class NumberHuntGame extends GameTemplate {
  public onGameEnd?: (success: boolean, score: number) => void;

  private scene = new Container();
  private finished = false;
  private remainMs = 30_000;

  // UI
  private titleText!: Text;
  private infoText!: Text;
  private promptText!: Text;
  private timeBar!: Graphics;
  private tiles: Tile[] = [];

  // layout
  private cols = 4;
  private rows = 4;
  private tileW = 120;
  private tileH = 120;
  private gapX = 16;
  private gapY = 16;

  // runtime
  private roundsNeeded = 8;
  private roundsDone = 0;
  private missesAllowed = 3;
  private misses = 0;
  private digitsMax = 9;
  private targetsPerRound: number | null = null;

  private currentTarget = 0;
  private remainingTargets = 0;
  private roundTimeMs = 3000;
  private roundRemain = 3000;
  private awaiting = false;

  // scoring
  private score = 0;
  private combo = 0;

  // colors
  private colors = {
    bgTop: 0x0b1020, bgBottom: 0x151a2b,
    tile: 0xffffff, tileText: 0x1b1b1b,
    good: 0x92e6a7, bad: 0xff5a5a,
    barBack: 0x374151, barFill: 0x3b82f6,
    text: 0xffffff,
  };

  constructor(app: Application, settings: NumberHuntSettings) {
    super(app, settings);
  }

  async createScene(): Promise<void> {
    const s = (this as any).settings as NumberHuntSettings;
    const diff = getDifficulty(s);
    const W = this.app.renderer.width, H = this.app.renderer.height;

    // duration
    this.remainMs = secondsToMs((s as any).duration as number, 30_000);

    // difficulty presets
    if (diff === 'easy')       { this.roundsNeeded = 6; this.cols = 3; this.rows = 3; this.digitsMax = 6; this.missesAllowed = 4; this.roundTimeMs = 3600; }
    else if (diff === 'hard')  { this.roundsNeeded = 10; this.cols = 5; this.rows = 5; this.digitsMax = 9; this.missesAllowed = 2; this.roundTimeMs = 2800; }
    else                       { this.roundsNeeded = 8; this.cols = 4; this.rows = 4; this.digitsMax = 8; this.missesAllowed = 3; this.roundTimeMs = 3200; }

    // overrides
    if (typeof s.rounds === 'number' && isFinite(s.rounds)) this.roundsNeeded = clamp(Math.round(s.rounds), 3, 30);
    if (typeof s.gridCols === 'number' && isFinite(s.gridCols)) this.cols = clamp(Math.round(s.gridCols), 3, 6);
    if (typeof s.gridRows === 'number' && isFinite(s.gridRows)) this.rows = clamp(Math.round(s.gridRows), 3, 6);
    if (typeof s.digitsMax === 'number' && isFinite(s.digitsMax)) this.digitsMax = clamp(Math.round(s.digitsMax), 3, 9);
    if (typeof s.targetsPerRound === 'number' && isFinite(s.targetsPerRound)) this.targetsPerRound = clamp(Math.round(s.targetsPerRound), 1, Math.max(1, Math.floor((this.cols * this.rows) * 0.5)));
    if (typeof s.roundTimeMs === 'number' && isFinite(s.roundTimeMs)) this.roundTimeMs = clamp(Math.round(s.roundTimeMs), 1200, 6000);
    if (typeof s.missesAllowed === 'number' && isFinite(s.missesAllowed)) this.missesAllowed = clamp(Math.round(s.missesAllowed), 0, 10);

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

    // title
    this.titleText = new Text('Number Hunt', {
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
    this.infoText.x = W / 2; this.infoText.y = Math.floor(H * 0.27);
    this.scene.addChild(this.infoText);
    this.updateInfo();

    // prompt
    this.promptText = new Text('Ready?', {
      fontFamily: 'sans-serif', fontSize: Math.floor(Math.min(W, H) * 0.09),
      fill: this.colors.text, stroke: 0x000000, strokeThickness: 6,
    });
    this.promptText.anchor.set(0.5);
    this.promptText.x = W / 2; this.promptText.y = Math.floor(H * 0.36);
    this.scene.addChild(this.promptText);

    // time bar
    this.timeBar = new Graphics();
    this.scene.addChild(this.timeBar);

    // grid layout
    const usableW = W - 80;
    const usableH = H - Math.floor(H * 0.50) - 40;
    this.tileW = Math.min(200, Math.floor(usableW / this.cols) - 16);
    this.tileH = Math.min(160, Math.floor(usableH / this.rows) - 16);
    this.gapX = Math.max(12, Math.floor((usableW - this.cols * this.tileW) / (this.cols + 1)));
    this.gapY = Math.max(10, Math.floor((usableH - this.rows * this.tileH) / (this.rows + 1)));

    const startY = Math.floor(H * 0.52);
    const startX = (W - (this.cols * this.tileW + (this.cols - 1) * this.gapX)) / 2 + this.tileW / 2;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const idx = r * this.cols + c;
        const root = new Container();
        const bgTile = new Graphics();
        bgTile.beginFill(this.colors.tile, 0.96);
        bgTile.drawRoundedRect(-this.tileW/2, -this.tileH/2, this.tileW, this.tileH, 16);
        bgTile.endFill();
        const label = new Text('', { fontFamily: 'sans-serif', fontSize: Math.floor(this.tileH * 0.50), fill: this.colors.tileText });
        label.anchor.set(0.5);
        root.addChild(bgTile, label);
        root.eventMode = 'static';
        root.on('pointertap', (e: FederatedPointerEvent) => { e.stopPropagation(); this.onTap(idx); });

        root.x = startX + c * (this.tileW + this.gapX);
        root.y = startY + r * (this.tileH + this.gapY);

        this.scene.addChild(root);
        this.tiles.push({ root, bg: bgTile, label, value: 0, found: false, index: idx });
      }
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

    // per-round timer
    if (this.awaiting) {
      this.roundRemain -= dtMs;
      this.drawTimeBar();
      if (this.roundRemain <= 0) {
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
    this.infoText.text = `Round ${this.roundsDone}/${this.roundsNeeded}   Miss ${this.misses}/${this.missesAllowed}   Time ${remainS}s`;
  }

  private drawTimeBar() {
    const W = this.app.renderer.width;
    const y = Math.floor(this.app.renderer.height * 0.47);
    const w = Math.floor(W * 0.7);
    const x = Math.floor((W - w) / 2);
    const h = 10;
    const frac = clamp(this.roundRemain / this.roundTimeMs, 0, 1);
    this.timeBar.clear();
    this.timeBar.beginFill(this.colors.barBack, 0.4); this.timeBar.drawRoundedRect(x, y, w, h, 6); this.timeBar.endFill();
    this.timeBar.beginFill(this.colors.barFill, 0.95); this.timeBar.drawRoundedRect(x, y, Math.floor(w * frac), h, 6); this.timeBar.endFill();
  }

  private nextRound(first = false) {
    // choose target digit and how many of them
    this.currentTarget = (Math.random() * (this.digitsMax + 1)) | 0;
    const totalTiles = this.cols * this.rows;
    const autoTargets = clamp(Math.round(totalTiles * (0.18 + Math.random() * 0.12)), 1, Math.max(1, Math.floor(totalTiles * 0.4)));
    this.remainingTargets = this.targetsPerRound ?? autoTargets;

    // assign numbers
    const indices = Array.from({ length: totalTiles }, (_, i) => i);
    shuffle(indices);
    const targetIdxs = indices.slice(0, this.remainingTargets);
    for (let i = 0; i < this.tiles.length; i++) {
      const t = this.tiles[i];
      t.found = false;
      // reset style
      t.bg.clear();
      t.bg.beginFill(this.colors.tile, 0.96);
      t.bg.drawRoundedRect(-this.tileW/2, -this.tileH/2, this.tileW, this.tileH, 16);
      t.bg.endFill();
      // assign value
      if (targetIdxs.includes(i)) t.value = this.currentTarget;
      else {
        // ensure not target
        let v = (Math.random() * (this.digitsMax + 1)) | 0;
        if (v === this.currentTarget) v = (v + 1 + ((Math.random() * this.digitsMax) | 0)) % (this.digitsMax + 1);
        t.value = v;
      }
      t.label.text = String(t.value);
      t.label.style = { fontFamily: 'sans-serif', fontSize: Math.floor(this.tileH * 0.50), fill: this.colors.tileText };
    }

    this.promptText.text = `Find all ${this.currentTarget}!`;
    this.roundRemain = this.roundTimeMs;
    this.awaiting = true;
    this.drawTimeBar();
    if (!first) this.updateInfo();
  }

  private onTap(idx: number) {
    if (!this.awaiting || this.finished) return;
    const t = this.tiles[idx];
    if (t.found) return; // already solved
    const correct = (t.value === this.currentTarget);
    if (correct) {
      t.found = true;
      this.remainingTargets--;
      this.combo++;
      const speedFrac = clamp(this.roundRemain / this.roundTimeMs, 0, 1);
      const base = 120, comboBonus = Math.min(10, this.combo) * 20, speedBonus = Math.round(60 * speedFrac);
      this.score += base + comboBonus + speedBonus;
      this.flashTile(t, this.colors.good);
      // mark visually
      t.label.style = { fontFamily: 'sans-serif', fontSize: Math.floor(this.tileH * 0.50), fill: 0x0f5132 };
      if (this.remainingTargets <= 0) {
        this.awaiting = false;
        this.roundsDone++;
        if (this.roundsDone >= this.roundsNeeded) {
          this.finish(true);
        } else {
          setTimeout(() => this.nextRound(), 160);
        }
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
    if (this.misses > this.missesAllowed) {
      this.finish(false);
    } else {
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

  private finish(success: boolean) {
    if (this.finished) return;
    this.finished = true;
    const timeBonus = Math.round(this.remainMs / 8);
    const roundBonus = this.roundsDone * 70;
    const missPenalty = this.misses * 120;
    const score = Math.max(0, this.score + timeBonus + roundBonus - missPenalty + (success ? 700 : 0));
    this.onGameEnd?.(success, score);
  }
}
