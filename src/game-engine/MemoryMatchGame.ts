import { Application, Container, Graphics, Sprite, Texture, Text, FederatedPointerEvent } from 'pixi.js';
import { GameTemplate, type GameSettings } from './GameTemplate';

// ---- Local types ----
export type Difficulty = 'easy' | 'normal' | 'hard';
export type CharacterType = 'girl' | 'animal' | 'child';

export interface MemoryMatchSettings extends GameSettings {
  cardPairs?: number;            // default 8 pairs
  characterType?: CharacterType; // girl / animal / child
}

// ---- Small utilities ----
function isDifficulty(v: unknown): v is Difficulty {
  return v === 'easy' || v === 'normal' || v === 'hard';
}

function getDifficulty(settings: GameSettings): Difficulty {
  const d = (settings as any).difficulty;
  return isDifficulty(d) ? d : 'normal';
}

function applyDifficultyToPairs(basePairs: number, diff: Difficulty): number {
  if (diff === 'easy') return Math.max(2, Math.round(basePairs * 0.7));
  if (diff === 'hard') return Math.round(basePairs * 1.5);
  return basePairs;
}

function createGradientSprite(app: Application, topHex: number, bottomHex: number, width?: number, height?: number) {
  const w = width ?? app.renderer.width;
  const h = height ?? app.renderer.height;
  const canvas = document.createElement('canvas');
  canvas.width = w; 
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
  g.addColorStop(0, hex(topHex));
  g.addColorStop(1, hex(bottomHex));
  ctx.fillStyle = g; 
  ctx.fillRect(0, 0, w, h);
  return new Sprite(Texture.from(canvas));
}

function drawRoundedRect(g: Graphics, w: number, h: number, radius = 16, color = 0xffffff, alpha = 1) {
  g.clear();
  g.beginFill(color, alpha);
  g.drawRoundedRect(-w/2, -h/2, w, h, radius);
  g.endFill();
}

// 修正: drawStarの代替実装
function drawStar(g: Graphics, x: number, y: number, points: number, radius: number, color: number) {
  const innerRadius = radius * 0.5;
  const step = (Math.PI * 2) / points;
  const halfStep = step / 2;
  
  g.beginFill(color);
  g.moveTo(x + Math.cos(-Math.PI / 2) * radius, y + Math.sin(-Math.PI / 2) * radius);
  
  for (let i = 0; i < points; i++) {
    const angle = i * step - Math.PI / 2;
    const innerAngle = angle + halfStep;
    
    // 内側の点
    g.lineTo(
      x + Math.cos(innerAngle) * innerRadius,
      y + Math.sin(innerAngle) * innerRadius
    );
    
    // 外側の点
    g.lineTo(
      x + Math.cos(angle + step) * radius,
      y + Math.sin(angle + step) * radius
    );
  }
  
  g.closePath();
  g.endFill();
}

// simple ease-out pulse
function createPulse(onUpdate: (scale: number)=>void, durationMs = 200, overshoot = 1.12) {
  let t = 0;
  let playing = true;
  const base = 1;
  return {
    update(dtMs: number) {
      if (!playing) return;
      t += dtMs;
      const p = Math.min(1, t / durationMs);
      const ease = 1 - Math.pow(1 - p, 2);
      const k = (p < 0.5) ? (ease * 2) : (2 - ease * 2);
      const s = base + (overshoot - base) * k;
      onUpdate(s);
      if (p >= 1) playing = false;
    },
    isDone() { return !playing; }
  };
}

// ---- Theme colors ----
const COLORS = {
  girl:   { primary: 0xd946ef, secondary: 0xfce7ff, accent: 0xa21caf },
  animal: { primary: 0xf97316, secondary: 0xfff7ed, accent: 0xea580c },
  child:  { primary: 0x0ea5e9, secondary: 0xf0f9ff, accent: 0x0284c7 },
} as const;

// ---- Card model ----
interface Card {
  id: number;        // pair id
  index: number;     // board index
  root: Container;   // tap target
  front: Graphics;   // face up
  back: Graphics;    // face down
  flipped: boolean;
  matched: boolean;
}

// ---- MemoryMatchGame ----
export class MemoryMatchGame extends GameTemplate {
  public onGameEnd?: (success: boolean, score: number) => void;

  // scene
  private scene = new Container();
  private cards: Card[] = [];
  private first?: Card; 
  private second?: Card;
  private gridCols = 4;
  private matchedPairs = 0;
  private targetPairs = 8;
  private anims: { update(dt: number): void; isDone(): boolean }[] = [];
  protected settings: MemoryMatchSettings;

  constructor(app: Application, settings: MemoryMatchSettings) {
    // GameSettings基底型でsuperを呼ぶため型変換
    super(app, settings as GameSettings);
    this.settings = settings;
  }

  async createScene(): Promise<void> {
    const diff = getDifficulty(this.settings);
    const basePairs = this.settings.cardPairs ?? 8;
    this.targetPairs = applyDifficultyToPairs(basePairs, diff);

    // background
    const ct = (this.settings.characterType ?? 'girl') as CharacterType;
    const theme = COLORS[ct];
    const bg = createGradientSprite(this.app, theme.secondary, theme.primary);
    this.scene.addChild(bg);

    // prepare grid
    const cols = this.gridCols;
    const rows = Math.ceil((this.targetPairs * 2) / cols);
    const W = this.app.renderer.width; 
    const H = this.app.renderer.height;
    const cardW = Math.min(120, (W - 80) / cols);
    const cardH = Math.min(160, (H - 200) / rows);

    const ids: number[] = [];
    for (let i = 0; i < this.targetPairs; i++) ids.push(i, i);
    
    // shuffle
    for (let i = ids.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0; 
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }

    const grid = new Container();
    this.scene.addChild(grid);

    const gapX = (W - cols * cardW) / (cols + 1);
    const gapY = (H - 160 - rows * cardH) / (rows + 1);

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const root = new Container();
      root.eventMode = 'static';
      root.cursor = 'pointer';
      const front = new Graphics();
      const back  = new Graphics();
      
      drawRoundedRect(back,  cardW, cardH, 22, theme.accent, 1);
      drawRoundedRect(front, cardW, cardH, 22, 0xffffff, 1);

      // symbol
      const symbol = this.createCharacterSymbol(id, ct, cardW, cardH);
      front.addChild(symbol);

      front.visible = false;
      root.addChild(back, front);

      // card tap handler
      root.on('pointertap', (e: FederatedPointerEvent) => {
        e.stopPropagation();
        this.handleCardTap(i);
      });

      const col = i % cols; 
      const row = (i / cols) | 0;
      root.x = gapX + (col * (cardW + gapX)) + cardW / 2;
      root.y = 120  + (row * (cardH + gapY)) + cardH / 2;

      grid.addChild(root);
      this.cards.push({ id, index: i, root, front, back, flipped: false, matched: false });
    }

    // attach scene to base container
    this.container.addChild(this.scene);
  }

  handleInput(_event: FederatedPointerEvent): void {
    // card-level listeners manage input
  }

  private handleCardTap(cardIndex: number) {
    if (this.gameState !== 'playing') return;
    const card = this.cards[cardIndex];
    if (!card || card.flipped || card.matched) return;

    this.flipCard(card, true);

    if (!this.first) { 
      this.first = card; 
      return; 
    }
    
    if (!this.second) {
      this.second = card;
      // lock input briefly to avoid triple taps
      const prevMode = this.container.eventMode;
      this.container.eventMode = 'none';
      setTimeout(() => {
        this.judge();
        this.container.eventMode = prevMode ?? 'auto';
      }, 500);
    }
  }

  updateGame(deltaTime: number): void {
    // lightweight animation updates
    const dtMs = deltaTime * (1000 / 60);
    this.anims = this.anims.filter(a => { 
      a.update(dtMs); 
      return !a.isDone(); 
    });
  }

  // ---- internals ----
  private flipCard(card: Card, faceUp: boolean) {
    card.flipped = faceUp;
    card.front.visible = faceUp;
    card.back.visible  = !faceUp;
    const r = card.root;
    const anim = createPulse((s) => { r.scale.set(s); }, 200, 1.10);
    this.anims.push(anim);
  }

  private judge() {
    if (!this.first || !this.second) return;
    const a = this.first, b = this.second;

    if (a.id === b.id) {
      a.matched = b.matched = true;
      this.matchedPairs++;
      // update score (100 per pair)
      this.currentScore = this.matchedPairs * 100;

      // light fade feedback
      const fade = { t: 0 };
      const anim = {
        update: (dt: number) => { 
          fade.t += dt; 
          const p = Math.min(1, fade.t / 240); 
          a.root.alpha = b.root.alpha = 1 - p * 0.2; 
        },
        isDone: () => fade.t >= 240,
      };
      this.anims.push(anim);

      // 重要: ゲーム終了条件チェック
      if (this.matchedPairs >= this.targetPairs) {
        // 少し遅延してからゲーム終了処理
        setTimeout(() => {
          this.endGame(true);
        }, 800);
      }
    } else {
      // 不一致の場合は少し待ってからカードを戻す
      setTimeout(() => {
        this.flipCard(a, false);
        this.flipCard(b, false);
      }, 800);
    }

    this.first = this.second = undefined;
  }

  // Override win condition to support "all pairs matched"
  protected checkWinCondition(): boolean {
    return this.matchedPairs >= this.targetPairs;
  }

  // 重要: showResultメソッドをオーバーライド（自動進行のため）
  protected showResult(result: { success: boolean; score: number; message: string }): void {
    console.log(`MemoryMatch Game Result: ${result.success ? 'SUCCESS' : 'FAILED'}, Score: ${result.score}`);
    
    // GameSequenceのonGameEndを呼び出し（自動進行のため）
    if (this.onGameEnd) {
      this.onGameEnd(result.success, result.score);
    }
    
    // 親クラスのshowResultは呼ばない（UIが重複するため）
    // super.showResult(result);
  }

  private createCharacterSymbol(id: number, type: CharacterType, w: number, h: number) {
    const g = new Graphics();
    const theme = COLORS[type];

    // face
    g.beginFill(0xffffff);
    g.drawCircle(0, 0, Math.min(w, h) * 0.22);
    g.endFill();

    // eyes
    g.beginFill(0x222222);
    g.drawCircle(-w * 0.06, -h * 0.02, Math.min(w, h) * 0.03);
    g.drawCircle( w * 0.06, -h * 0.02, Math.min(w, h) * 0.03);
    g.endFill();

    // ID-based variation for unique symbols
    const variation = id % 4;

    if (type === 'girl') {
      if (variation === 0) {
        drawStar(g, w * 0.1, -h * 0.15, 5, Math.min(w, h) * 0.06, theme.primary);
      } else if (variation === 1) {
        g.beginFill(theme.primary);
        g.drawCircle(w * 0.1, -h * 0.15, Math.min(w, h) * 0.04);
        g.endFill();
      } else if (variation === 2) {
        g.beginFill(theme.primary);
        g.drawRect(-Math.min(w, h) * 0.03, -h * 0.18, Math.min(w, h) * 0.06, Math.min(w, h) * 0.06);
        g.endFill();
      } else {
        g.beginFill(theme.accent);
        g.drawEllipse(0, -h * 0.15, Math.min(w, h) * 0.08, Math.min(w, h) * 0.04);
        g.endFill();
      }
    } else if (type === 'animal') {
      // ears - always present
      g.beginFill(theme.primary);
      g.drawCircle(-w * 0.12, -h * 0.2, Math.min(w, h) * 0.06);
      g.drawCircle( w * 0.12, -h * 0.2, Math.min(w, h) * 0.06);
      g.endFill();
      
      if (variation === 0) {
        // tail ellipse
        g.beginFill(theme.accent);
        g.drawEllipse(w * 0.2, 0, Math.min(w, h) * 0.05, Math.min(w, h) * 0.02);
        g.endFill();
      } else if (variation === 1) {
        // nose
        g.beginFill(theme.accent);
        g.drawCircle(0, h * 0.02, Math.min(w, h) * 0.02);
        g.endFill();
      } else if (variation === 2) {
        // stripes
        g.beginFill(theme.accent);
        for (let i = 0; i < 3; i++) {
          g.drawRect(-Math.min(w, h) * 0.15, -h * 0.05 + i * Math.min(w, h) * 0.05, Math.min(w, h) * 0.3, Math.min(w, h) * 0.02);
        }
        g.endFill();
      }
    } else if (type === 'child') {
      // outline
      g.lineStyle(3, theme.accent, 1);
      g.drawCircle(0, 0, Math.min(w, h) * 0.24);
      g.lineStyle();
      
      if (variation === 0) {
        // cheeks
        g.beginFill(theme.primary);
        g.drawCircle(-w * 0.12, h * 0.04, Math.min(w, h) * 0.025);
        g.drawCircle( w * 0.12, h * 0.04, Math.min(w, h) * 0.025);
        g.endFill();
      } else if (variation === 1) {
        // hat
        g.beginFill(theme.primary);
        g.drawRect(-Math.min(w, h) * 0.1, -h * 0.25, Math.min(w, h) * 0.2, Math.min(w, h) * 0.08);
        g.endFill();
      } else if (variation === 2) {
        // smile
        g.lineStyle(2, theme.accent, 1);
        g.arc(0, h * 0.08, Math.min(w, h) * 0.08, 0, Math.PI);
        g.lineStyle();
      }
    }

    g.x = 0; 
    g.y = 0;
    return g;
  }
}