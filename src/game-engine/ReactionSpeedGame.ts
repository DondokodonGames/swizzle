// ReactionSpeedGame.ts
// Drop-in short game template (PixiJS + TypeScript)
// Register under key 'reaction_speed' in your factory/registry.
//
// Gameplay:
// - Repeated trials measure reaction time.
// - Screen shows "WAIT..." for a random delay. If you tap early → MISS.
// - When it flashes "TAP!", tap as fast as possible. Slow or timeouts → MISS.
// - Clear enough valid trials before overall timer ends.
//
// Project compatibility notes:
// - Do NOT narrow base types; import GameTemplate & GameSettings only.
// - Do NOT redeclare base fields like duration/difficulty/timerText.
// - Use an internal `finished` flag (avoid relying on a specific GameState union).
// - Emit results via `onGameEnd(success, score)`.
import { Application, Container, Graphics, Text, FederatedPointerEvent } from 'pixi.js';
import { GameTemplate, type GameSettings } from './GameTemplate';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface ReactionSpeedSettings extends GameSettings {
  trials?: number;        // number of successful trials needed
  minDelayMs?: number;    // random wait lower bound (before "TAP!")
  maxDelayMs?: number;    // random wait upper bound
  timeoutMs?: number;     // max allowed reaction time after signal
  missesAllowed?: number; // early taps / timeouts allowed overall
  resultShowMs?: number;  // how long to show result per trial
  palette?: 'neon' | 'forest' | 'night';
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

type Phase = 'ready' | 'waiting' | 'go' | 'result';

export class ReactionSpeedGame extends GameTemplate {
  public onGameEnd?: (success: boolean, score: number) => void;

  private scene = new Container();
  private finished = false;
  private remainMs = 30_000;

  // UI
  private titleText!: Text;
  private infoText!: Text;
  private promptText!: Text;
  private smallText!: Text;
  private bar!: Graphics;
  private bg!: Graphics;

  // trial runtime
  private phase: Phase = 'ready';
  private phaseRemain = 0;
  private minDelay = 800;
  private maxDelay = 2200;
  private timeoutMs = 1200;
  private resultShowMs = 700;

  private trialsNeeded = 7;
  private successes = 0;
  private misses = 0;
  private missesAllowed = 3;

  private bestMs = Infinity;
  private lastMs = 0;
  private goElapsed = 0;
  private waitTarget = 0; // randomized wait before "go"

  // scoring
  private score = 0;

  // colors
  private colors = {
    bgWaitTop: 0x0b1020, bgWaitBottom: 0x151a2b,
    bgGoTop: 0x16a34a, bgGoBottom: 0x065f46,
    bad: 0xef4444, text: 0xffffff,
    barBack: 0x374151, barFill: 0x3b82f6,
  };

  constructor(app: Application, settings: ReactionSpeedSettings) {
    super(app, settings);
  }

  async createScene(): Promise<void> {
    const s = (this as any).settings as ReactionSpeedSettings;
    const diff = getDifficulty(s);
    const W = this.app.renderer.width, H = this.app.renderer.height;

    // overall duration
    this.remainMs = secondsToMs((s as any).duration as number, 30_000);

    // presets
    if (diff === 'easy') {
      this.trialsNeeded = 5; this.missesAllowed = 4;
      this.minDelay = 700; this.maxDelay = 2000; this.timeoutMs = 1400;
      this.resultShowMs = 800;
    } else if (diff === 'hard') {
      this.trialsNeeded = 9; this.missesAllowed = 2;
      this.minDelay = 900; this.maxDelay = 2600; this.timeoutMs = 1000;
      this.resultShowMs = 600;
    } else {
      this.trialsNeeded = 7; this.missesAllowed = 3;
      this.minDelay = 800; this.maxDelay = 2200; this.timeoutMs = 1200;
      this.resultShowMs = 700;
    }

    // overrides
    if (typeof s.trials === 'number' && isFinite(s.trials)) this.trialsNeeded = clamp(Math.round(s.trials), 3, 30);
    if (typeof s.minDelayMs === 'number' && isFinite(s.minDelayMs)) this.minDelay = clamp(Math.round(s.minDelayMs), 200, 4000);
    if (typeof s.maxDelayMs === 'number' && isFinite(s.maxDelayMs)) this.maxDelay = clamp(Math.round(s.maxDelayMs), this.minDelay + 200, 8000);
    if (typeof s.timeoutMs === 'number' && isFinite(s.timeoutMs)) this.timeoutMs = clamp(Math.round(s.timeoutMs), 400, 6000);
    if (typeof s.missesAllowed === 'number' && isFinite(s.missesAllowed)) this.missesAllowed = clamp(Math.round(s.missesAllowed), 0, 10);
    if (typeof s.resultShowMs === 'number' && isFinite(s.resultShowMs)) this.resultShowMs = clamp(Math.round(s.resultShowMs), 200, 4000);

    if (s.palette === 'forest') {
      this.colors.bgWaitTop = 0x14532d; this.colors.bgWaitBottom = 0x052e16;
      this.colors.bgGoTop = 0x22c55e; this.colors.bgGoBottom = 0x166534;
      this.colors.barFill = 0x34d399;
    } else if (s.palette === 'neon') {
      this.colors.bgWaitTop = 0x1f1147; this.colors.bgWaitBottom = 0x0b032d;
      this.colors.bgGoTop = 0xd946ef; this.colors.bgGoBottom = 0x7c3aed;
      this.colors.barFill = 0xa78bfa;
    } else if (s.palette === 'night') {
      this.colors.bgWaitTop = 0x0b1020; this.colors.bgWaitBottom = 0x151a2b;
      this.colors.bgGoTop = 0x1d4ed8; this.colors.bgGoBottom = 0x1e3a8a;
      this.colors.barFill = 0x3b82f6;
    }

    // background graphic (we'll redraw color blocks depending on phase)
    this.bg = new Graphics();
    this.scene.addChild(this.bg);

    // title
    this.titleText = new Text('Reaction Speed', {
      fontFamily: 'sans-serif', fontSize: Math.floor(Math.min(W, H) * 0.06),
      fill: this.colors.text, stroke: 0x000000, strokeThickness: 5,
    });
    this.titleText.anchor.set(0.5);
    this.titleText.x = W / 2; this.titleText.y = Math.floor(H * 0.18);
    this.scene.addChild(this.titleText);

    // info
    this.infoText = new Text('', {
      fontFamily: 'sans-serif', fontSize: Math.floor(Math.min(W, H) * 0.045),
      fill: this.colors.text, stroke: 0x000000, strokeThickness: 4,
    });
    this.infoText.anchor.set(0.5);
    this.infoText.x = W / 2; this.infoText.y = Math.floor(H * 0.26);
    this.scene.addChild(this.infoText);

    // prompt
    this.promptText = new Text('Ready?', {
      fontFamily: 'sans-serif', fontSize: Math.floor(Math.min(W, H) * 0.12),
      fill: this.colors.text, stroke: 0x000000, strokeThickness: 8,
    });
    this.promptText.anchor.set(0.5);
    this.promptText.x = W / 2; this.promptText.y = Math.floor(H * 0.46);
    this.scene.addChild(this.promptText);

    // small text
    this.smallText = new Text('Tap when it says TAP!', {
      fontFamily: 'sans-serif', fontSize: Math.floor(Math.min(W, H) * 0.035),
      fill: this.colors.text, stroke: 0x000000, strokeThickness: 3,
    });
    this.smallText.anchor.set(0.5);
    this.smallText.x = W / 2; this.smallText.y = Math.floor(H * 0.58);
    this.scene.addChild(this.smallText);

    // time bar (only meaningful during "go")
    this.bar = new Graphics();
    this.scene.addChild(this.bar);

    // input
    this.scene.eventMode = 'static';
    this.scene.on('pointerdown', (e: FederatedPointerEvent) => { e.stopPropagation(); this.onTap(); });

    this.container.addChild(this.scene);

    // start first trial
    this.nextTrial(true);
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
      this.finish(this.successes >= this.trialsNeeded);
      return;
    }

    // phase timer
    this.phaseRemain -= dtMs;
    if (this.phase === 'waiting') {
      if (this.phaseRemain <= 0) {
        this.switchToGo();
      }
    } else if (this.phase === 'go') {
      this.goElapsed += dtMs;
      if (this.goElapsed > this.timeoutMs) {
        // too slow
        this.registerMiss('timeout');
      }
    } else if (this.phase === 'result') {
      if (this.phaseRemain <= 0) {
        this.nextTrial();
      }
    }

    this.drawBackground();
    this.drawBar();
    this.updateInfo();
  }

  protected showResult(result: { success: boolean; score: number }): void {
    this.onGameEnd?.(result.success, result.score);
  }

  // ---- internals ----
  private updateInfo() {
    const remainS = Math.ceil(this.remainMs / 1000);
    const best = isFinite(this.bestMs) ? `${this.bestMs | 0}ms` : '—';
    this.infoText.text = `Success ${this.successes}/${this.trialsNeeded}   Miss ${this.misses}/${this.missesAllowed}   Best ${best}   Time ${remainS}s`;
  }

  private drawBackground() {
    const W = this.app.renderer.width, H = this.app.renderer.height;
    const top = (this.phase === 'go') ? this.colors.bgGoTop : this.colors.bgWaitTop;
    const bottom = (this.phase === 'go') ? this.colors.bgGoBottom : this.colors.bgWaitBottom;
    this.bg.clear();
    this.bg.beginFill(top); this.bg.drawRect(0, 0, W, Math.floor(H * 0.45)); this.bg.endFill();
    this.bg.beginFill(bottom); this.bg.drawRect(0, Math.floor(H * 0.45), W, H); this.bg.endFill();
  }

  private drawBar() {
    const W = this.app.renderer.width;
    const y = Math.floor(this.app.renderer.height * 0.66);
    const w = Math.floor(W * 0.7);
    const x = Math.floor((W - w) / 2);
    const h = 12;

    this.bar.clear();
    if (this.phase === 'go') {
      const frac = clamp(1 - (this.goElapsed / this.timeoutMs), 0, 1);
      this.bar.beginFill(0x374151, 0.35); this.bar.drawRoundedRect(x, y, w, h, 6); this.bar.endFill();
      this.bar.beginFill(this.colors.barFill, 0.95); this.bar.drawRoundedRect(x, y, Math.floor(w * frac), h, 6); this.bar.endFill();
    }
  }

  private nextTrial(first = false) {
    // reset
    this.phase = 'waiting';
    this.waitTarget = this.minDelay + Math.random() * (this.maxDelay - this.minDelay);
    this.phaseRemain = this.waitTarget;
    this.goElapsed = 0;
    this.promptText.text = 'WAIT...';
    this.smallText.text = 'Don’t tap early!';
    if (!first) this.updateInfo();
  }

  private switchToGo() {
    this.phase = 'go';
    this.goElapsed = 0;
    this.promptText.text = 'TAP!';
    this.smallText.text = 'Tap now!';
  }

  private onTap() {
    if (this.finished) return;
    if (this.phase === 'waiting') {
      // false start
      this.registerMiss('early');
    } else if (this.phase === 'go') {
      // success
      const rt = Math.max(0, Math.round(this.goElapsed));
      this.lastMs = rt;
      this.bestMs = Math.min(this.bestMs, rt);
      this.successes++;
      // score: faster = more. 800 for instant → down to 100 at timeout.
      const speedScore = clamp(800 - rt, 100, 800);
      this.score += speedScore;
      this.promptText.text = `${rt} ms`;
      this.smallText.text = 'Nice!';
      // result phase
      this.phase = 'result';
      this.phaseRemain = this.resultShowMs;
      // clear condition
      if (this.successes >= this.trialsNeeded) {
        this.finish(true);
      }
    } else if (this.phase === 'result') {
      // ignore taps during result phase
    } else if (this.phase === 'ready') {
      this.nextTrial();
    }
  }

  private registerMiss(reason: 'early' | 'timeout') {
    this.misses++;
    const msg = (reason === 'early') ? 'EARLY!' : 'TOO SLOW!';
    this.promptText.text = msg;
    this.smallText.text = (reason === 'early') ? 'Wait for TAP!' : 'Try to react faster';
    // penalty
    this.score = Math.max(0, this.score - 120);
    // brief result phase
    this.phase = 'result';
    this.phaseRemain = Math.max(400, this.resultShowMs - 200);
    // fail condition
    if (this.misses > this.missesAllowed) {
      this.finish(false);
    }
  }

  private finish(success: boolean) {
    if (this.finished) return;
    this.finished = true;
    const timeBonus = Math.round(this.remainMs / 6);
    const successBonus = this.successes * 60;
    const missPenalty = this.misses * 140;
    const bestBonus = isFinite(this.bestMs) ? clamp(500 - this.bestMs, 0, 420) : 0;
    const score = Math.max(0, this.score + timeBonus + successBonus + bestBonus - missPenalty + (success ? 700 : 0));
    this.onGameEnd?.(success, score);
  }
}
