// SpotDifferenceGame.ts
// Drop-in short game template (PixiJS + TypeScript)
// Register under key 'spot_difference' in your factory/registry.
//
// Gameplay:
// - Two panels (left/right) show similar pictures with N differences.
// - Tap a difference area on either side to mark it found.
// - Find all differences before time runs out to succeed.
//
// Compatibility constraints:
// - Do NOT narrow base types; import GameTemplate & GameSettings only.
// - Do NOT redeclare base fields like duration/difficulty/timerText.
// - Use an internal `finished` flag (avoid assuming a specific GameState union).
// - Emit results via onGameEnd(success, score).
import { Application, Container, Graphics, FederatedPointerEvent } from 'pixi.js';
import { GameTemplate, type GameSettings } from './GameTemplate';

export type Difficulty = 'easy' | 'normal' | 'hard';
export interface SpotDifferenceSettings extends GameSettings {
  differences?: number;   // how many differences to generate (default by difficulty)
  allowMiss?: boolean;    // if false, wrong taps briefly penalize (default true)
}

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

type DiffHit = {
  // normalized center (0..1 in panel-local coords) and radius
  cx: number; cy: number; r: number;
  found: boolean;
  // references to marker graphics (for both panels)
  leftMark?: Graphics;
  rightMark?: Graphics;
};

export class SpotDifferenceGame extends GameTemplate {
  public onGameEnd?: (success: boolean, score: number) => void;

  private scene = new Container();
  private leftPanel = new Container();
  private rightPanel = new Container();

  private finished = false;
  private remainMs = 30_000;

  private diffs: DiffHit[] = [];
  private goals = 5;
  private found = 0;
  private allowMiss = true;

  // layout
  private pad = 20;
  private panelW = 400;
  private panelH = 260;

  constructor(app: Application, settings: SpotDifferenceSettings) {
    super(app, settings);
  }

  async createScene(): Promise<void> {
    const s = (this as any).settings as SpotDifferenceSettings;
    const diff = getDifficulty(s);

    // duration & difficulty params
    this.remainMs = secondsToMs((s as any).duration as number, 30_000);
    if (diff === 'easy') this.goals = 5;
    else if (diff === 'hard') this.goals = 7;
    else this.goals = 6;
    if (typeof s.differences === 'number' && isFinite(s.differences)) {
      this.goals = clamp(Math.round(s.differences), 3, 10);
    }
    this.allowMiss = (typeof s.allowMiss === 'boolean') ? s.allowMiss : true;

    // layout
    const W = this.app.renderer.width, H = this.app.renderer.height;
    this.panelW = Math.max(260, Math.min(460, Math.floor((W - this.pad * 3) / 2)));
    this.panelH = Math.max(200, Math.min(360, Math.floor(H - this.pad * 2)));
    const leftX = this.pad + this.panelW / 2;
    const rightX = this.pad * 2 + this.panelW + this.panelW / 2;
    const centerY = H / 2;

    // interactive scene
    this.scene.eventMode = 'static';
    this.scene.on('pointertap', (e: FederatedPointerEvent) => this.onTap(e));

    // build panels
    this.leftPanel.x = leftX; this.leftPanel.y = centerY;
    this.rightPanel.x = rightX; this.rightPanel.y = centerY;
    this.scene.addChild(this.leftPanel, this.rightPanel);

    // draw backgrounds
    this.drawPanelFrame(this.leftPanel, 0x0ea5e9, 0x012a4a);
    this.drawPanelFrame(this.rightPanel, 0x0ea5e9, 0x012a4a);

    // generate base shapes and differences
    this.generatePictures();

    this.container.addChild(this.scene);
  }

  handleInput(_e: FederatedPointerEvent): void {
    // not used
  }

  updateGame(deltaTime: number): void {
    if (this.finished) return;
    const dtMs = deltaTime * (1000 / 60);
    this.remainMs -= dtMs;
    if (this.remainMs <= 0) {
      this.remainMs = 0;
      this.finish(false);
      return;
    }
  }

  protected showResult(result: { success: boolean; score: number }): void {
    this.onGameEnd?.(result.success, result.score);
  }

  // ---- internals ----
  private drawPanelFrame(panel: Container, tintTop: number, tintBottom: number) {
    const g = new Graphics();
    // border
    g.lineStyle(4, 0xffffff, 0.9);
    g.beginFill(0x000000, 0.18);
    g.drawRoundedRect(-this.panelW/2, -this.panelH/2, this.panelW, this.panelH, 16);
    g.endFill();
    panel.addChild(g);
  }

  private generatePictures() {
    // Draw identical base art into both panels, then introduce differences into right panel.
    const baseLeft = new Graphics();
    const baseRight = new Graphics();
    this.drawBaseScene(baseLeft);
    this.drawBaseScene(baseRight);

    // differences: randomly add or tweak shapes on right only; also record hit regions
    this.diffs = [];
    for (let i = 0; i < this.goals; i++) {
      const d = this.createOneDifference(baseRight);
      this.diffs.push(d);
    }

    this.leftPanel.addChild(baseLeft);
    this.rightPanel.addChild(baseRight);

    // create invisible hit areas for each diff on BOTH panels so a tap either side counts
    for (const d of this.diffs) {
      const l = new Graphics();
      const r = new Graphics();
      l.beginFill(0xffffff, 0.001);
      l.drawCircle(this.localX(d.cx, true), this.localY(d.cy), d.r * this.panelW);
      l.endFill();
      r.beginFill(0xffffff, 0.001);
      r.drawCircle(this.localX(d.cx, false), this.localY(d.cy), d.r * this.panelW);
      r.endFill();
      l.eventMode = 'static'; r.eventMode = 'static';
      // store for marking later
      d.leftMark = new Graphics(); d.rightMark = new Graphics();
      this.leftPanel.addChild(l, d.leftMark);
      this.rightPanel.addChild(r, d.rightMark);

      // attach metadata
      (l as any).__diff__ = d;
      (r as any).__diff__ = d;
    }

    // global miss overlay (feedback)
    const miss = new Graphics();
    miss.beginFill(0xff5a5a, 0.0);
    miss.drawRoundedRect(-this.panelW/2, -this.panelH/2, this.panelW, this.panelH, 16);
    miss.endFill();
    miss.name = 'missOverlay';
    this.leftPanel.addChild(miss);
    const miss2 = miss.clone();
    this.rightPanel.addChild(miss2);
  }

  private drawBaseScene(g: Graphics) {
    const W = this.panelW, H = this.panelH;

    // sky
    g.beginFill(0x87ceeb, 1); g.drawRoundedRect(-W/2 + 6, -H/2 + 6, W - 12, H - 12, 12); g.endFill();

    // hills
    g.beginFill(0x2a9d8f, 1);
    g.drawEllipse(-W*0.15,  H*0.35, W*0.45, H*0.25);
    g.drawEllipse( W*0.25,  H*0.32, W*0.55, H*0.28);
    g.endFill();

    // sun
    g.beginFill(0xffe08a, 1); g.drawCircle(W*0.28, -H*0.25, Math.min(W,H)*0.08); g.endFill();

    // house
    const houseX = -W*0.18, houseY = H*0.10, hw = W*0.22, hh = H*0.18;
    g.beginFill(0xffc6a5, 1); g.drawRoundedRect(houseX - hw/2, houseY - hh/2, hw, hh, 10); g.endFill();
    // roof
    g.beginFill(0x9d4edd, 1);
    g.moveTo(houseX - hw/2 - 8, houseY - hh/2);
    g.lineTo(houseX, houseY - hh/2 - hh*0.55);
    g.lineTo(houseX + hw/2 + 8, houseY - hh/2);
    g.lineTo(houseX - hw/2 - 8, houseY - hh/2);
    g.endFill();

    // tree
    const tx = W*0.05, ty = H*0.15;
    g.beginFill(0x8d5524, 1); g.drawRoundedRect(tx-8, ty, 16, H*0.18, 6); g.endFill();
    g.beginFill(0x2a9d8f, 1); g.drawCircle(tx, ty, H*0.14); g.endFill();

    // clouds
    g.beginFill(0xffffff, 1);
    g.drawCircle(-W*0.28, -H*0.28, H*0.05);
    g.drawCircle(-W*0.24, -H*0.26, H*0.06);
    g.drawCircle(-W*0.20, -H*0.29, H*0.04);
    g.endFill();
  }

  private createOneDifference(baseRight: Graphics): DiffHit {
    // pick a random type of difference and area
    const cx = Math.random() * 0.75 + 0.125;   // avoid extreme borders
    const cy = Math.random() * 0.70 + 0.15;
    const r = Math.random() * 0.05 + 0.035;    // relative radius

    // randomly alter the right panel drawing in that area (extra shape or color patch)
    const g = new Graphics();
    const px = this.localX(cx, false);
    const py = this.localY(cy);
    const R = r * this.panelW;
    const t = Math.random();
    if (t < 0.33) {
      // add extra star-like flower
      g.beginFill(0xfff1a6, 1);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const x = px + Math.cos(a) * R * (i % 2 === 0 ? 0.8 : 0.3);
        const y = py + Math.sin(a) * R * (i % 2 === 0 ? 0.8 : 0.3);
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.closePath(); g.endFill();
    } else if (t < 0.66) {
      // paint a colored patch
      g.beginFill(0xe76f51, 0.9);
      g.drawRoundedRect(px - R*0.8, py - R*0.5, R*1.6, R*1.0, R*0.3);
      g.endFill();
    } else {
      // draw a ring
      g.lineStyle(Math.max(2, R*0.15), 0x264653, 1);
      g.drawCircle(px, py, R*0.8);
    }
    baseRight.addChild(g);

    return { cx, cy, r, found: false };
  }

  private onTap(e: FederatedPointerEvent) {
    if (this.finished) return;
    const global = e.global;
    // transform global to panel-local for both panels
    const localL = this.leftPanel.toLocal(global);
    const localR = this.rightPanel.toLocal(global);
    const hitOnLeft = this.pointInsidePanel(localL.x, localL.y);
    const hitOnRight = this.pointInsidePanel(localR.x, localR.y);
    let hitAny = false;
    if (hitOnLeft) hitAny = this.tryHit(localL.x, localL.y, true) || hitAny;
    if (hitOnRight) hitAny = this.tryHit(localR.x, localR.y, false) || hitAny;

    if (!hitAny && !this.allowMiss) {
      // brief red flash on both panels
      this.flashMiss(this.leftPanel);
      this.flashMiss(this.rightPanel);
    }
  }

  private pointInsidePanel(x: number, y: number) {
    return Math.abs(x) <= this.panelW/2 && Math.abs(y) <= this.panelH/2;
  }

  private tryHit(xLocal: number, yLocal: number, isLeft: boolean) {
    // convert to normalized
    const cx = (xLocal + this.panelW/2) / this.panelW;
    const cy = (yLocal + this.panelH/2) / this.panelH;
    for (const d of this.diffs) {
      if (d.found) continue;
      const dx = this.localX(d.cx, true) - xLocal; // use left-panel mapping for distance (radius is relative to W)
      const dy = this.localY(d.cy) - yLocal;
      const rr = d.r * this.panelW;
      if (dx*dx + dy*dy <= rr*rr) {
        this.markFound(d);
        return true;
      }
    }
    return false;
  }

  private markFound(d: DiffHit) {
    d.found = true;
    this.found++;

    const drawMark = (panel: 'left' | 'right') => {
      const mark = (panel === 'left' ? d.leftMark! : d.rightMark!);
      const x = this.localX(d.cx, panel === 'left');
      const y = this.localY(d.cy);
      const r = d.r * this.panelW;
      mark.clear();
      mark.lineStyle(Math.max(3, r*0.18), 0x00ff88, 0.9);
      mark.drawCircle(x, y, r * 0.9);
      // cross
      mark.lineStyle(Math.max(3, r*0.12), 0xffffff, 0.9);
      mark.moveTo(x - r*0.6, y - r*0.0);
      mark.lineTo(x + r*0.6, y + r*0.0);
      mark.moveTo(x, y - r*0.6);
      mark.lineTo(x, y + r*0.6);
    };
    drawMark('left');
    drawMark('right');

    if (this.found >= this.goals) {
      this.finish(true);
    }
  }

  private flashMiss(panel: Container) {
    const overlay = panel.getChildByName('missOverlay') as Graphics | undefined;
    if (!overlay) return;
    overlay.alpha = 0.35;
    // simple fade-out using requestAnimationFrame-ish via Pixi ticker through updateGame not guaranteed here,
    // so just setTimeout chain for simplicity:
    const steps = 6;
    for (let i = 1; i <= steps; i++) {
      setTimeout(() => { overlay.alpha = Math.max(0, 0.35 * (1 - i/steps)); }, i * 40);
    }
  }

  private localX(normX: number, isLeft: boolean) {
    // map normalized [0..1] to panel local coords (-W/2 .. +W/2)
    return -this.panelW/2 + normX * this.panelW;
    // identical for both panels; difference content is on right only
  }
  private localY(normY: number) {
    return -this.panelH/2 + normY * this.panelH;
  }

  private finish(success: boolean) {
    if (this.finished) return;
    this.finished = true;
    const timeBonus = Math.round(this.remainMs / 10);
    const score = Math.max(0, this.found * 400 + timeBonus + (success ? 800 : 0));
    this.onGameEnd?.(success, score);
  }
}
