# コスト・速度最適化戦略

**作成日**: 2025-12-19
**Phase**: 2-3
**目的**: 1000ゲーム/日を$500以下、20分以内で実現

---

## 1. 現状分析

### 1.1 コスト内訳（1ゲームあたり）

| 項目 | 現状コスト | 備考 |
|------|------------|------|
| Claude API (LogicGenerator) | $0.024 | ~6000トークン |
| DALL-E 3 (背景) | $0.04 | 1024x1024 |
| DALL-E 3 (オブジェクト×5) | $0.20 | 5枚想定 |
| 音声生成 | $0 | 未実装 |
| **合計** | **$0.26-0.30** | |

### 1.2 時間内訳（1ゲームあたり）

| 処理 | 現状時間 | 備考 |
|------|----------|------|
| GameSpec生成 | 1秒 | ランダムのみ |
| 画像生成 | 60-90秒 | 6枚 × 10-15秒 |
| ロジック生成 | 10-20秒 | Claude API |
| 品質チェック | 5-10秒 | シミュレーション |
| **合計** | **~2-3分** | シーケンシャル |

### 1.3 1000ゲーム生成時

| 項目 | 現状 | 目標 |
|------|------|------|
| コスト | $260-300 | $500以下 |
| 時間（並列なし） | 33-50時間 | - |
| 時間（50並列） | 40-60分 | 20分 |

---

## 2. コスト最適化

### 2.1 画像生成コスト削減

**現状**: DALL-E 3 @ $0.04/枚

**最適化案**:

| 方法 | コスト | 品質 | 推奨 |
|------|--------|------|------|
| DALL-E 2 (512x512) | $0.018/枚 | 中 | △ |
| Stable Diffusion (Self-hosted) | $0.002/枚 | 高 | ○ |
| Replicate (SDXL) | $0.003/枚 | 高 | ◎ |
| SVGテンプレート | $0 | 低 | △ |
| Flux.1 (Replicate) | $0.003/枚 | 最高 | ◎ |

**推奨**: Replicate (Flux.1 or SDXL)

```typescript
// Replicate API コスト例
// flux-1.1-pro: $0.04/image
// flux-schnell: $0.003/image (高速・安価)
// sdxl: $0.003/image
```

**改善後コスト**:
- 6枚 × $0.003 = **$0.018/ゲーム**
- 現状比: 90%削減

### 2.2 LLM APIコスト削減

**現状**: Claude Sonnet @ $0.024/ゲーム

**最適化案**:

| 用途 | モデル | コスト/1K tokens | 推奨 |
|------|--------|------------------|------|
| GameIdea生成 | GPT-4o-mini | $0.15/1M入力 | ◎ |
| Logic生成 | Claude Haiku | $0.25/1M入力 | ◎ |
| 品質評価 | GPT-4o-mini | $0.15/1M入力 | ◎ |

**改善後コスト**:
- GameIdea: 2000トークン × $0.60/1M = $0.0012
- Logic: 6000トークン × $1.00/1M = $0.006
- Quality: 1000トークン × $0.60/1M = $0.0006
- **合計: ~$0.008/ゲーム**
- 現状比: 67%削減

### 2.3 音声生成コスト

**方針**: プリセット音声を使用（追加コストなし）

```typescript
// Base64埋め込みの効果音テンプレート
const SOUND_PRESETS = {
  tap: '...base64...',      // 汎用タップ音
  success: '...base64...',  // 成功ジングル
  failure: '...base64...',  // 失敗音
  // テーマ別BGM
  bgm_action: '...base64...',
  bgm_puzzle: '...base64...',
  bgm_cute: '...base64...',
};
```

**コスト**: $0/ゲーム

### 2.4 コスト最適化サマリー

| 項目 | 現状 | 最適化後 | 削減率 |
|------|------|----------|--------|
| 画像生成 | $0.24 | $0.018 | 93% |
| LLM API | $0.024 | $0.008 | 67% |
| 音声 | $0 | $0 | - |
| **合計** | **$0.26** | **$0.026** | **90%** |

**1000ゲーム**: $26 + バッファ = **$50-100**

---

## 3. 速度最適化

### 3.1 並列処理設計

```typescript
class ParallelExecutor {
  private readonly MAX_CONCURRENCY = 50;
  private readonly RATE_LIMITS = {
    openai: { rpm: 500, tpm: 150000 },
    anthropic: { rpm: 1000, tpm: 100000 },
    replicate: { concurrent: 100 }
  };

  async generateGames(count: number): Promise<Game[]> {
    const batches = Math.ceil(count / this.MAX_CONCURRENCY);
    const results: Game[] = [];

    for (let i = 0; i < batches; i++) {
      const batchSize = Math.min(
        this.MAX_CONCURRENCY,
        count - i * this.MAX_CONCURRENCY
      );

      const batchPromises = Array(batchSize)
        .fill(null)
        .map(() => this.generateSingleGame());

      const batchResults = await Promise.allSettled(batchPromises);

      // 成功したゲームのみ追加
      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
        }
      }

      // レート制限対策で1秒待機
      await this.delay(1000);
    }

    return results;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 3.2 パイプライン最適化

**現状**: 完全シーケンシャル

```
GameSpec → 画像 → ロジック → 品質チェック → 保存
  1秒      90秒    15秒       10秒         2秒  = 118秒
```

**最適化後**: 並列パイプライン

```
GameIdea生成 (2秒)
    │
    ├─→ 画像生成 (並列) ─┐
    │      15秒          │
    │                    │
    └─→ ロジック生成 ───┼─→ 統合 → 品質チェック → 保存
           10秒          │     2秒      5秒       2秒
                         │
    ┌────────────────────┘
    │
    └─→ 音声選択 (0.1秒)

合計: ~20秒/ゲーム (最長パス: 画像生成)
```

### 3.3 キャッシュ戦略

```typescript
class GenerationCache {
  // 類似GameIdeaのキャッシュ（重複防止用）
  private ideaHashes: Set<string> = new Set();

  // 画像プロンプトキャッシュ（類似画像の再利用）
  private imageCache: Map<string, string> = new Map();

  // テーマ別背景キャッシュ
  private backgroundCache: Map<string, string> = new Map();

  isIdeaDuplicate(idea: GameIdea): boolean {
    const hash = this.hashIdea(idea);
    if (this.ideaHashes.has(hash)) {
      return true;
    }
    this.ideaHashes.add(hash);
    return false;
  }

  private hashIdea(idea: GameIdea): string {
    return `${idea.mainMechanic}-${idea.theme}-${idea.winCondition}`;
  }
}
```

### 3.4 速度最適化サマリー

| 項目 | 現状 | 最適化後 | 改善 |
|------|------|----------|------|
| 1ゲーム生成 | 120秒 | 20秒 | 6倍 |
| 並列度 | 1 | 50 | 50倍 |
| 1000ゲーム | 33時間 | **7分** | 280倍 |

---

## 4. 最終コスト・時間見積もり

### 4.1 1000ゲーム生成

| 項目 | 値 |
|------|-----|
| 画像コスト | 6000枚 × $0.003 = $18 |
| LLM コスト | 1000回 × 3API × $0.003 = $9 |
| バッファ（再生成分） | $23 × 2 = $46 |
| **合計コスト** | **$50-100** |

| 項目 | 値 |
|------|-----|
| 1バッチ（50並列） | 20秒 |
| バッチ数 | 20バッチ |
| 合計時間 | 400秒 + 待機時間 |
| **合計時間** | **~10分** |

### 4.2 現状 vs 最適化後

| 指標 | 現状 | 最適化後 | 改善率 |
|------|------|----------|--------|
| コスト | $260 | $50-100 | 80% |
| 時間 | 33時間 | 10分 | 99.5% |
| 品質（合格率） | 5% | 50% | 10倍 |
| 面白さ率 | 2% | 35% | 17倍 |

---

## 5. 実装タスク

### 5.1 インフラ変更

1. **Replicate APIセットアップ**
   - flux-schnell または sdxl モデル
   - 並列リクエスト設定

2. **GPT-4o-mini導入**
   - GameIdea生成用
   - 品質評価用

3. **Claude Haiku導入**
   - ロジック生成用（軽量版）

### 5.2 コード変更

1. **ImageGenerator改修**
   - Replicateプロバイダー追加
   - 並列生成対応

2. **ParallelExecutor新規作成**
   - 50並列実行
   - レート制限管理

3. **キャッシュシステム構築**
   - 重複検出
   - 背景キャッシュ

---

## 6. リスクと対策

### 6.1 API Rate Limit

**リスク**: 50並列でレート制限に達する可能性

**対策**:
- 指数バックオフ
- バッチ間に1秒待機
- 複数APIキーのローテーション

### 6.2 品質低下

**リスク**: 安価なモデルで品質が下がる可能性

**対策**:
- 品質チェックの閾値を維持
- 不合格は再生成
- 最終的な人間チェック（サンプリング）

### 6.3 コスト超過

**リスク**: 再生成が多いとコスト増

**対策**:
- 再生成上限を設定（3回）
- リアルタイムコストモニタリング
- アラート設定

---

## 7. 監視・レポート

### 7.1 リアルタイム監視項目

```typescript
interface GenerationMetrics {
  totalGenerated: number;
  successfulGames: number;
  failedGames: number;
  totalCost: number;
  averageTimePerGame: number;
  currentConcurrency: number;
  queueSize: number;
  errorRate: number;
}
```

### 7.2 日次レポート

```typescript
interface DailyReport {
  date: string;
  gamesGenerated: number;
  gamesPublished: number;
  totalCost: number;
  averageQualityScore: number;
  topGames: GameSummary[];
  issuesEncountered: Issue[];
  recommendations: string[];
}
```
