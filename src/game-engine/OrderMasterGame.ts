// OrderMasterGame.ts
// Drop-in short game template (PixiJS + TypeScript)
// Register under key 'order_master' in your factory/registry.
//
// Gameplay:
// - N number cards appear in random order.
// - Drag & drop cards to reorder them into ascending order before time runs out.
// - Clear multiple rounds depending on difficulty/rounds setting.
//
// Constraints for project compatibility:
// - Do NOT narrow base types; import GameTemplate & GameSettings only.
// - Do NOT redeclare base fields like duration/difficulty.
// - Use an internal `finished` flag rather than relying on a specific GameState union.
// - Emit results via `onGameEnd(success, score)`.
import { Application, Container, Graphics, Text, FederatedPointerEvent } from 'pixi.js';
import { GameTemplate, type GameSettings } from './GameTemplate';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface OrderMasterSettings extends GameSettings {
  itemCount?: number;  // number of cards per round (defaults by difficulty)
  rounds?: number;     // rounds to clear (defaults by difficulty)
  palette?: 'cool' | 'warm' | 'forest';
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

type Card = {
  root: Container;
  bg: Graphics;
  label: Text;
  value: number;
  slotIndex: number; // current slot index in layout
  dragging?: boolean;
  dragOffX?: number;
  dragOffY?: number;
};

export class OrderMasterGame extends GameTemplate {
  public onGameEnd?: (success: boolean, score: number) => void;

  private scene = new Container();
  private finished = false;
  private remainMs = 30_000;

  // layout
  private cards: Card[] = [];
  private slots: Graphics[] = [];
  private slotX0 = 0;
  private slotY = 0;
  private slotW = 120;
  private slotH = 160;
  private gap = 18;

  // runtime
  private itemCount = 6;
  private roundsNeeded = 2;
  private roundsDone = 0;

  // score
  private score = 0;
  private combo = 0;

  // palette
  private colors = {
    bgTop: 0x0ea5e9, bgBottom: 0x022c44,
    card: 0xffffff, cardEdge: 0x0ea5e9, text: 0x1b1b1b,
    slot: 0xffffff,
    good: 0x92e6a7, bad: 0xff5a5a,
  };

  constructor(app: Application, settings: OrderMasterSettings) {
    super(app, settings);
  }

  async createScene(): Promise<void> {
    const s = (this as any).settings as OrderMasterSettings;
    const diff = getDifficulty(s);

    // duration
    this.remainMs = secondsToMs((s as any).duration as number, 30_000);

    // difficulty presets
    if (diff === 'easy') { this.itemCount = 5; this.roundsNeeded = 1; }
    else if (diff === 'hard') { this.itemCount = 7; this.roundsNeeded = 3; }
    else { this.itemCount = 6; this.roundsNeeded = 2; }

    if (typeof s.itemCount === 'number' && isFinite(s.itemCount)) this.itemCount = clamp(Math.round(s.itemCount), 3, 10);
    if (typeof s.rounds === 'number' && isFinite(s.rounds)) this.roundsNeeded = clamp(Math.round(s.rounds), 1, 6);

    if (s.palette === 'warm') {
      this.colors.bgTop = 0xffa94d; this.colors.bgBottom = 0x5a2a00; this.colors.cardEdge = 0xff8787;
    } else if (s.palette === 'forest') {
      this.colors.bgTop = 0x14532d; this.colors.bgBottom = 0x052e16; this.colors.cardEdge = 0x34d399;
    }

    const W = this.app.renderer.width, H = this.app.renderer.height;

    // background split tint
    const bg = new Graphics();
    bg.beginFill(this.colors.bgTop); bg.drawRect(0, 0, W, Math.floor(H*0.55)); bg.endFill();
    bg.beginFill(this.colors.bgBottom); bg.drawRect(0, Math.floor(H*0.55), W, H); bg.endFill();
    this.scene.addChild(bg);

    // layout slots horizontally centered
    this.slotW = Math.min(140, Math.floor((W - 80) / this.itemCount));
    this.slotH = Math.min(180, Math.floor(H * 0.42));
    this.gap = Math.min(22, Math.max(12, Math.floor((W - this.itemCount * this.slotW) / (this.itemCount + 1))));
    this.slotY = Math.floor(H * 0.62);
    this.slotX0 = this.gap + this.slotW/2;

    for (let i = 0; i < this.itemCount; i++) {
      const slot = new Graphics();
      slot.lineStyle(3, 0xffffff, 0.65);
      slot.beginFill(this.colors.slot, 0.06);
      slot.drawRoundedRect(-this.slotW/2, -this.slotH/2, this.slotW, this.slotH, 18);
      slot.endFill();
      slot.x = this.slotX0 + i * (this.slotW + this.gap);
      slot.y = this.slotY;
      this.scene.addChild(slot);
      this.slots.push(slot);
    }

    // cards
    this.generateRound();

    // pointer events
    this.scene.eventMode = 'static';
    this.scene.on('pointerdown', (e: FederatedPointerEvent) => this.onDown(e));
    this.scene.on('pointermove', (e: FederatedPointerEvent) => this.onMove(e));
    this.scene.on('pointerup',   (e: FederatedPointerEvent) => this.onUp(e));
    this.scene.on('pointerupoutside', (e: FederatedPointerEvent) => this.onUp(e));

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
  private generateRound() {
    // clear existing cards if any
    for (const c of this.cards) this.scene.removeChild(c.root);
    this.cards = [];

    // produce numbers 1..itemCount randomized
    const values = shuffle(Array.from({ length: this.itemCount }, (_, i) => i + 1));
    for (let i = 0; i < this.itemCount; i++) {
      const root = new Container();
      const bg = new Graphics();
      bg.beginFill(this.colors.card, 1);
      bg.lineStyle(6, this.colors.cardEdge, 0.95);
      bg.drawRoundedRect(-this.slotW/2, -this.slotH/2, this.slotW, this.slotH, 18);
      bg.endFill();
      const label = new Text(String(values[i]), { fontFamily: 'sans-serif', fontSize: Math.floor(this.slotH * 0.48), fill: 0x1b1b1b });
      label.anchor.set(0.5);
      root.addChild(bg, label);

      root.x = this.slots[i].x;
      root.y = this.slots[i].y;
      root.eventMode = 'static';
      (root as any).__card__ = true;

      this.scene.addChild(root);
      this.cards.push({ root, bg, label, value: values[i], slotIndex: i });
    }
  }

  private onDown(e: FederatedPointerEvent) {
    if (this.finished) return;
    const localPt = this.scene.toLocal(e.global);
    // find topmost card under pointer
    for (let i = this.cards.length - 1; i >= 0; i--) {
      const c = this.cards[i];
      const b = c.root.getBounds();
      if (localPt.x >= b.x && localPt.x <= b.x + b.width && localPt.y >= b.y && localPt.y <= b.y + b.height) {
        c.dragging = true;
        c.dragOffX = localPt.x - c.root.x;
        c.dragOffY = localPt.y - c.root.y;
        // bring to front
        this.scene.removeChild(c.root); this.scene.addChild(c.root);
        return;
      }
    }
  }

  private onMove(e: FederatedPointerEvent) {
    if (this.finished) return;
    const localPt = this.scene.toLocal(e.global);
    for (const c of this.cards) {
      if (!c.dragging) continue;
      c.root.x = localPt.x - (c.dragOffX ?? 0);
      c.root.y = localPt.y - (c.dragOffY ?? 0);
    }
  }

  private onUp(e: FederatedPointerEvent) {
    if (this.finished) return;
    const dragging = this.cards.find(c => c.dragging);
    if (!dragging) return;

    dragging.dragging = false;

    // snap to nearest slot by x
    const idx = this.nearestSlotIndex(dragging.root.x);
    this.placeCardAtIndex(dragging, idx);

    // check success
    if (this.isSorted()) {
      this.roundsDone++;
      this.combo++;
      const roundScore = 800 + this.combo * 120 + Math.round(this.remainMs / 12);
      this.score += roundScore;
      // short flash on slots
      this.flashSlots(0x92e6a7);
      if (this.roundsDone >= this.roundsNeeded) {
        this.finish(true);
      } else {
        // next round
        setTimeout(() => this.generateRound(), 220);
      }
    }
  }

  private nearestSlotIndex(x: number) {
    // choose closest by distance
    let best = 0, bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < this.slots.length; i++) {
      const d = Math.abs(this.slots[i].x - x);
      if (d < bestDist) { best = i; bestDist = d; }
    }
    return best;
  }

  private placeCardAtIndex(card: Card, targetIdx: number) {
    targetIdx = clamp(targetIdx, 0, this.cards.length - 1);
    // compute current order by slotIndex
    // remove card from its old position and insert into new
    const order = this.cards.slice().sort((a, b) => a.slotIndex - b.slotIndex);
    const curPos = order.indexOf(card);
    if (curPos < 0) return;

    order.splice(curPos, 1);
    order.splice(targetIdx, 0, card);

    // reassign slotIndex according to new order and move
    for (let i = 0; i < order.length; i++) {
      const c = order[i];
      c.slotIndex = i;
      // snap move
      c.root.x = this.slots[i].x;
      c.root.y = this.slots[i].y;
    }

    // also update this.cards array order to maintain draw order coherence
    this.cards = order;
  }

  private isSorted() {
    // sorted ascending by card.value according to slotIndex
    for (let i = 0; i < this.cards.length; i++) {
      // the card with value (i+1) should be at slot i
      const expected = i + 1;
      const cardAtSlotI = this.cards.find(c => c.slotIndex === i);
      if (!cardAtSlotI || cardAtSlotI.value !== expected) return false;
    }
    return true;
  }

  private flashSlots(color: number) {
    for (const s of this.slots) {
      const g = new Graphics();
      g.beginFill(color, 0.28);
      g.drawRoundedRect(-this.slotW/2, -this.slotH/2, this.slotW, this.slotH, 18);
      g.endFill();
      g.x = s.x; g.y = s.y;
      this.scene.addChild(g);
      // fade out
      const steps = 8;
      for (let i = 1; i <= steps; i++) {
        setTimeout(() => { g.alpha = Math.max(0, 0.28 * (1 - i/steps)); if (i === steps) this.scene.removeChild(g); }, i * 30);
      }
    }
  }

  private finish(success: boolean) {
    if (this.finished) return;
    this.finished = true;
    const timeBonus = Math.round(this.remainMs / 10);
    const roundsBonus = this.roundsDone * 150;
    const score = Math.max(0, this.score + timeBonus + roundsBonus + (success ? 800 : 0));
    this.onGameEnd?.(success, score);
  }
}
