// PuzzlePrincessGame.ts
// Drop-in short game template (PixiJS + TypeScript)
// Register under key 'puzzle_princess' in your factory/registry.
//
// Gameplay:
// - A "princess" illustration is split into a grid of tiles.
// - Tap two tiles to swap them. Complete the picture before time runs out to clear.
//
// Project compatibility notes:
// - Do NOT narrow base types; import GameTemplate & GameSettings only.
// - Do NOT redeclare base fields like duration/difficulty/timerText.
// - Use an internal `finished` flag (avoid relying on a specific GameState union).
// - Emit results via `onGameEnd(success, score)`.
import { Application, Container, Graphics, Text, Sprite, Texture, Rectangle, FederatedPointerEvent } from 'pixi.js';
import { GameTemplate, type GameSettings } from './GameTemplate';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface PuzzlePrincessSettings extends GameSettings {
  grid?: number;          // grid size (2..5). default by difficulty: easy=2, normal=3, hard=4
  showPreview?: boolean;  // show small preview above
  palette?: 'royal' | 'twilight' | 'forest';
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

type Tile = {
  sprite: Sprite;
  index: number;   // current tile index (0..n-1)
  correct: number; // correct index
  x0: number;      // grid x slot center
  y0: number;      // grid y slot center
};

export class PuzzlePrincessGame extends GameTemplate {
  public onGameEnd?: (success: boolean, score: number) => void;

  private scene = new Container();
  private finished = false;
  private remainMs = 30_000;

  // layout
  private grid = 3;
  private gridW = 480;
  private gridH = 480;
  private tileW = 120;
  private tileH = 120;
  private tiles: Tile[] = [];
  private boardX = 0;
  private boardY = 0;

  // selection
  private selA: Tile | null = null;
  private selBox!: Graphics;

  // art
  private artTex!: Texture;
  private artW = 480;
  private artH = 480;
  private preview!: Sprite;

  // scoring
  private moves = 0;
  private score = 0;

  // colors
  private colors = {
    bgTop: 0x301934, bgBottom: 0x1a0b1e, // twilight default
    frame: 0xf8c7ff, lines: 0xffffff,
    select: 0xffe08a,
    text: 0xffffff,
  };

  constructor(app: Application, settings: PuzzlePrincessSettings) {
    super(app, settings);
  }

  async createScene(): Promise<void> {
    const s = (this as any).settings as PuzzlePrincessSettings;
    const diff = getDifficulty(s);
    const W = this.app.renderer.width, H = this.app.renderer.height;

    // duration
    this.remainMs = secondsToMs((s as any).duration as number, 30_000);

    // difficulty defaults
    if (diff === 'easy') this.grid = 2;
    else if (diff === 'hard') this.grid = 4;
    else this.grid = 3;
    if (typeof s.grid === 'number' && isFinite(s.grid)) this.grid = clamp(Math.round(s.grid), 2, 5);
    const showPreview = (s.showPreview ?? true);

    if (s.palette === 'royal') {
      this.colors.bgTop = 0x4c1d95; this.colors.bgBottom = 0x2e1065; this.colors.frame = 0xfcd34d;
    } else if (s.palette === 'forest') {
      this.colors.bgTop = 0x14532d; this.colors.bgBottom = 0x052e16; this.colors.frame = 0x34d399;
    }

    // background split
    const bg = new Graphics();
    bg.beginFill(this.colors.bgTop); bg.drawRect(0, 0, W, Math.floor(H * 0.45)); bg.endFill();
    bg.beginFill(this.colors.bgBottom); bg.drawRect(0, Math.floor(H * 0.45), W, H); bg.endFill();
    this.scene.addChild(bg);

    // compute board size
    this.gridW = Math.min(Math.floor(W * 0.86), Math.floor(H * 0.52));
    this.gridH = this.gridW;
    this.tileW = Math.floor(this.gridW / this.grid);
    this.tileH = Math.floor(this.gridH / this.grid);
    this.boardX = Math.floor((W - this.gridW) / 2);
    this.boardY = Math.floor(H * 0.40);

    // title
    const title = new Text('Puzzle Princess', {
      fontFamily: 'serif', fontSize: Math.floor(Math.min(W, H) * 0.06),
      fill: this.colors.text, stroke: 0x000000, strokeThickness: 5,
    });
    title.anchor.set(0.5);
    title.x = W / 2; title.y = Math.floor(H * 0.18);
    this.scene.addChild(title);

    // generate princess artwork texture
    this.artW = this.gridW; this.artH = this.gridH;
    this.artTex = this.generatePrincessTexture(this.artW, this.artH);

    // preview
    if (showPreview) {
      this.preview = new Sprite(new Texture(this.artTex.baseTexture, new Rectangle(0,0,this.artW,this.artH)));
      const scale = Math.min(0.25, Math.min((W*0.32)/this.artW, (H*0.18)/this.artH));
      this.preview.scale.set(scale);
      this.preview.x = Math.floor(W/2 - (this.preview.width/2));
      this.preview.y = Math.floor(this.boardY - this.preview.height - 20);
      this.scene.addChild(this.preview);
    }

    // board frame
    const frame = new Graphics();
    frame.lineStyle(6, this.colors.frame, 0.95);
    frame.drawRoundedRect(this.boardX - 6, this.boardY - 6, this.gridW + 12, this.gridH + 12, 16);
    frame.endFill();
    this.scene.addChild(frame);

    // grid lines
    const lines = new Graphics();
    lines.lineStyle(2, this.colors.lines, 0.35);
    for (let i = 1; i < this.grid; i++) {
      const x = this.boardX + i * this.tileW;
      const y = this.boardY + i * this.tileH;
      lines.moveTo(x, this.boardY); lines.lineTo(x, this.boardY + this.gridH);
      lines.moveTo(this.boardX, y); lines.lineTo(this.boardX + this.gridW, y);
    }
    this.scene.addChild(lines);

    // tiles (shuffled)
    const order = shuffle(Array.from({ length: this.grid * this.grid }, (_, i) => i));
    // Ensure not already solved
    let isSolved = order.every((v, i) => v === i);
    if (isSolved && order.length > 1) [order[0], order[1]] = [order[1], order[0]];

    for (let idx = 0; idx < order.length; idx++) {
      const correct = idx;
      const current = order[idx];
      const col = idx % this.grid, row = Math.floor(idx / this.grid);
      const x0 = this.boardX + col * this.tileW + this.tileW / 2;
      const y0 = this.boardY + row * this.tileH + this.tileH / 2;

      const frameRect = new Rectangle(
        (current % this.grid) * this.tileW,
        Math.floor(current / this.grid) * this.tileH,
        this.tileW, this.tileH
      );
      const subTexture = new Texture(this.artTex.baseTexture, frameRect);
      const spr = new Sprite(subTexture);
      spr.anchor.set(0.5);
      spr.x = x0; spr.y = y0;
      spr.eventMode = 'static';
      spr.on('pointertap', (e: FederatedPointerEvent) => { e.stopPropagation(); this.onTapTile(tile); });

      const tile: Tile = { sprite: spr, index: current, correct, x0, y0 };
      (spr as any).__tile__ = tile;
      this.tiles.push(tile);
      this.scene.addChild(spr);
    }

    // selection box
    this.selBox = new Graphics();
    this.selBox.visible = false;
    this.scene.addChild(this.selBox);

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
  private onTapTile(tile: Tile) {
    if (this.finished) return;
    if (!this.selA) {
      this.selA = tile;
      this.drawSelection(tile);
      return;
    }
    if (this.selA === tile) {
      // deselect
      this.selA = null;
      this.selBox.visible = false;
      return;
    }
    // swap contents (update sprites' textures and index fields)
    this.swapTiles(this.selA, tile);
    this.moves++;
    this.selA = null;
    this.selBox.visible = false;

    if (this.isSolved()) {
      this.finish(true);
    }
  }

  private drawSelection(tile: Tile) {
    this.selBox.clear();
    this.selBox.lineStyle(6, this.colors.select, 0.95);
    this.selBox.drawRoundedRect(
      tile.sprite.x - this.tileW/2 - 4,
      tile.sprite.y - this.tileH/2 - 4,
      this.tileW + 8, this.tileH + 8, 12
    );
    this.selBox.endFill();
    this.selBox.visible = true;
  }

  private swapTiles(a: Tile, b: Tile) {
    // swap index (which defines which sub-rect of the texture is used)
    const ai = a.index, bi = b.index;
    if (ai === bi) return;

    a.index = bi; b.index = ai;

    const rectA = new Rectangle(
      (a.index % this.grid) * this.tileW,
      Math.floor(a.index / this.grid) * this.tileH,
      this.tileW, this.tileH
    );
    const rectB = new Rectangle(
      (b.index % this.grid) * this.tileW,
      Math.floor(b.index / this.grid) * this.tileH,
      this.tileW, this.tileH
    );
    a.sprite.texture = new Texture(this.artTex.baseTexture, rectA);
    b.sprite.texture = new Texture(this.artTex.baseTexture, rectB);
  }

  private isSolved() {
    return this.tiles.every(t => t.index === t.correct);
  }

  private generatePrincessTexture(W: number, H: number): Texture {
    // Draw a simple vector "princess": face, hair, crown, heart, shoulders
    const g = new Graphics();

    // background soft gradient blocks
    g.beginFill(0x3b2240, 1); g.drawRoundedRect(0, 0, W, H, 24); g.endFill();
    // vignette corners
    g.beginFill(0x1a0b1e, 0.55);
    g.drawCircle(-W*0.15, -H*0.10, Math.max(W,H)*0.6);
    g.drawCircle(W*1.15, -H*0.10, Math.max(W,H)*0.6);
    g.drawCircle(-W*0.10, H*1.10, Math.max(W,H)*0.6);
    g.drawCircle(W*1.10, H*1.10, Math.max(W,H)*0.6);
    g.endFill();

    // shoulders / dress
    g.beginFill(0xf472b6, 1);
    g.drawEllipse(W*0.5, H*0.82, W*0.36, H*0.22);
    g.endFill();

    // hair
    g.beginFill(0x8d5524, 1);
    g.drawEllipse(W*0.5, H*0.44, W*0.34, H*0.30);
    g.drawEllipse(W*0.30, H*0.55, W*0.16, H*0.18);
    g.drawEllipse(W*0.70, H*0.55, W*0.16, H*0.18);
    g.endFill();

    // face
    g.beginFill(0xffe0bd, 1);
    g.drawEllipse(W*0.5, H*0.46, W*0.20, H*0.18);
    g.endFill();

    // eyes
    g.beginFill(0x111111, 1);
    g.drawCircle(W*0.44, H*0.46, Math.min(W,H)*0.012);
    g.drawCircle(W*0.56, H*0.46, Math.min(W,H)*0.012);
    g.endFill();

    // mouth (heart)
    g.beginFill(0xff6b6b, 1);
    const cx = W*0.5, cy = H*0.54, r = Math.min(W,H)*0.03;
    g.moveTo(cx, cy + r*0.6);
    g.quadraticCurveTo(cx - r, cy - r*0.2, cx, cy - r*0.2);
    g.quadraticCurveTo(cx + r, cy - r*0.2, cx, cy + r*0.6);
    g.endFill();

    // crown
    g.beginFill(0xfcd34d, 1);
    const crownY = H*0.29, cw = W*0.28, ch = H*0.12;
    g.drawPolygon([
      W*0.5 - cw/2, crownY + ch,
      W*0.5 - cw*0.22, crownY + ch*0.35,
      W*0.5, crownY,
      W*0.5 + cw*0.22, crownY + ch*0.35,
      W*0.5 + cw/2, crownY + ch,
    ]);
    g.endFill();
    // crown jewels
    g.beginFill(0x93c5fd, 1); g.drawCircle(W*0.5, crownY + ch*0.55, H*0.018); g.endFill();
    g.beginFill(0xfca5a5, 1); g.drawCircle(W*0.5 - cw*0.18, crownY + ch*0.75, H*0.014); g.endFill();
    g.beginFill(0xfca5a5, 1); g.drawCircle(W*0.5 + cw*0.18, crownY + ch*0.75, H*0.014); g.endFill();

    // stars
    g.beginFill(0xfff1a6, 0.9);
    for (let i=0;i<6;i++) {
      const sx = W*(0.15 + Math.random()*0.7);
      const sy = H*(0.12 + Math.random()*0.2);
      const s = Math.min(W,H)*0.01*(0.8 + Math.random()*0.6);
      for (let k=0;k<5;k++) {
        const a = (k / 5) * Math.PI*2 - Math.PI/2;
        const rx = sx + Math.cos(a) * s * (k%2?0.6:1.1);
        const ry = sy + Math.sin(a) * s * (k%2?0.6:1.1);
        if (k===0) g.moveTo(rx, ry); else g.lineTo(rx, ry);
      }
      g.closePath();
    }
    g.endFill();

    const tex = this.app.renderer.generateTexture(g);
    return tex;
  }

  private finish(success: boolean) {
    if (this.finished) return;
    this.finished = true;
    // basic scoring: fewer moves → better
    const timeBonus = Math.round(this.remainMs / 6);
    const movePenalty = this.moves * 20;
    const base = success ? 800 : 0;
    const score = Math.max(0, base + timeBonus - movePenalty);
    this.onGameEnd?.(success, score);
  }
}
