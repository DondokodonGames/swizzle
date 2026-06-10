/**
 * GamePatternAnalyzer
 *
 * Supabaseから既存ゲームを分析し、動的にパターンを学習する
 * - 類似ゲームの検出
 * - 高評価ゲームのパターン抽出
 * - 避けるべきパターンの特定
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GameConcept } from './types';

// ==========================================
// Types
// ==========================================

export interface GamePattern {
  id: string;
  title: string;
  description: string;
  theme: string;
  genre: string;
  playerGoal: string;
  playerOperation: string;
  successCondition: string;
  failureCondition: string;
  qualityScore: number;
  likeCount: number;
  playCount: number;
  createdAt: string;
}

export interface PatternAnalysis {
  // 避けるべきパターン（最近生成された類似ゲーム）
  recentPatterns: string[];

  // 参考にすべきパターン（高評価ゲームのメカニクス）
  successfulMechanics: string[];

  // 使いすぎているメカニクス
  overusedMechanics: { mechanic: string; count: number }[];

  // 未使用のテーマ（多様性確保）
  unusedThemes: string[];

  // 統計情報
  stats: {
    totalGames: number;
    avgQualityScore: number;
    topGenres: { genre: string; count: number }[];
  };
}

export interface SimilarityResult {
  isSimilar: boolean;
  similarityScore: number;
  similarGames: {
    id: string;
    title: string;
    similarity: number;
    reason: string;
  }[];
}

// ==========================================
// GamePatternAnalyzer
// ==========================================

export class GamePatternAnalyzer {
  private client: SupabaseClient;
  private cache: {
    patterns: GamePattern[];
    lastFetch: number;
    ttl: number; // キャッシュ有効期限（ミリ秒）
  };

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('⚠️ Supabase credentials not found. GamePatternAnalyzer will use fallback mode.');
      this.client = null as any;
    } else {
      this.client = createClient(supabaseUrl, supabaseKey);
    }

    this.cache = {
      patterns: [],
      lastFetch: 0,
      ttl: 5 * 60 * 1000 // 5分間キャッシュ
    };
  }

  /**
   * 既存ゲームパターンを取得（キャッシュ付き）
   */
  async fetchPatterns(limit: number = 500): Promise<GamePattern[]> {
    // キャッシュが有効な場合はキャッシュを返す
    if (this.cache.patterns.length > 0 &&
        Date.now() - this.cache.lastFetch < this.cache.ttl) {
      return this.cache.patterns;
    }

    if (!this.client) {
      return [];
    }

    try {
      const { data, error } = await this.client
        .from('user_games')
        .select(`
          id,
          title,
          description,
          template_id,
          project_data,
          ai_quality_score,
          like_count,
          play_count,
          created_at
        `)
        // 公開ゲートで pending_review のまま未公開のゲームも類似度コーパスに含める
        // （除外すると審査待ちキューに近似ゲームが溜まり続ける）。rejected のみ除外。
        .eq('ai_generated', true)
        .neq('review_status', 'rejected')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to fetch patterns:', error);
        return [];
      }

      // パターンを抽出
      const patterns: GamePattern[] = (data || [])
        .filter((game: any) => game.project_data)
        .map((game: any) => {
          const projectData = game.project_data as any;
          const concept = projectData?.concept || projectData?.metadata?.concept || {};

          return {
            id: game.id,
            title: game.title || concept.title || '',
            description: game.description || concept.description || '',
            theme: concept.theme || '',
            genre: concept.genre || '',
            playerGoal: concept.playerGoal || '',
            playerOperation: concept.playerOperation || '',
            successCondition: concept.successCondition || '',
            failureCondition: concept.failureCondition || '',
            qualityScore: game.ai_quality_score || 0,
            likeCount: game.like_count || 0,
            playCount: game.play_count || 0,
            createdAt: game.created_at
          };
        });

      // キャッシュを更新
      this.cache.patterns = patterns;
      this.cache.lastFetch = Date.now();

      console.log(`   📊 Fetched ${patterns.length} game patterns from Supabase`);
      return patterns;
    } catch (error) {
      console.error('Error fetching patterns:', error);
      return [];
    }
  }

  /**
   * コンセプトの類似度をチェック
   */
  async checkSimilarity(concept: GameConcept): Promise<SimilarityResult> {
    const patterns = await this.fetchPatterns();

    if (patterns.length === 0) {
      return { isSimilar: false, similarityScore: 0, similarGames: [] };
    }

    const similarGames: SimilarityResult['similarGames'] = [];

    for (const pattern of patterns) {
      const similarity = this.calculateSimilarity(concept, pattern);

      if (similarity.score > 0.7) { // 70%以上類似
        similarGames.push({
          id: pattern.id,
          title: pattern.title,
          similarity: similarity.score,
          reason: similarity.reason
        });
      }
    }

    // 類似度順にソート
    similarGames.sort((a, b) => b.similarity - a.similarity);

    return {
      isSimilar: similarGames.length > 0,
      similarityScore: similarGames.length > 0 ? similarGames[0].similarity : 0,
      similarGames: similarGames.slice(0, 5) // 上位5件
    };
  }

  /**
   * 2つのコンセプト間の類似度を計算
   */
  private calculateSimilarity(concept: GameConcept, pattern: GamePattern): { score: number; reason: string } {
    let score = 0;
    const reasons: string[] = [];

    // 1. テーマの類似度（重み: 0.2）
    if (concept.theme && pattern.theme) {
      const themeSimilarity = this.textSimilarity(concept.theme, pattern.theme);
      if (themeSimilarity > 0.8) {
        score += 0.2;
        reasons.push('同じテーマ');
      }
    }

    // 2. 操作方法の類似度（重み: 0.3）
    if (concept.playerOperation && pattern.playerOperation) {
      const operationSimilarity = this.textSimilarity(concept.playerOperation, pattern.playerOperation);
      if (operationSimilarity > 0.6) {
        score += 0.3 * operationSimilarity;
        reasons.push('類似した操作方法');
      }
    }

    // 3. 目標の類似度（重み: 0.3）
    if (concept.playerGoal && pattern.playerGoal) {
      const goalSimilarity = this.textSimilarity(concept.playerGoal, pattern.playerGoal);
      if (goalSimilarity > 0.6) {
        score += 0.3 * goalSimilarity;
        reasons.push('類似した目標');
      }
    }

    // 4. ジャンルの一致（重み: 0.2）
    if (concept.genre && pattern.genre && concept.genre === pattern.genre) {
      score += 0.2;
      reasons.push('同じジャンル');
    }

    return {
      score: Math.min(score, 1.0),
      reason: reasons.join('、')
    };
  }

  /**
   * テキストの類似度を計算（Jaccard係数ベース）
   */
  private textSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/[\s、。]+/).filter(w => w.length > 1));
    const words2 = new Set(text2.toLowerCase().split(/[\s、。]+/).filter(w => w.length > 1));

    if (words1.size === 0 || words2.size === 0) return 0;

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * パターン分析を実行（プロンプト生成用）
   */
  async analyze(): Promise<PatternAnalysis> {
    const patterns = await this.fetchPatterns();

    if (patterns.length === 0) {
      return this.getDefaultAnalysis();
    }

    // 最近24時間のパターン
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentPatterns = patterns
      .filter(p => new Date(p.createdAt).getTime() > oneDayAgo)
      .map(p => `「${p.title}」: ${p.playerOperation}`)
      .slice(0, 10);

    // 高評価ゲームのメカニクス（スコア80以上 or いいね10以上）
    const successfulPatterns = patterns
      .filter(p => p.qualityScore >= 80 || p.likeCount >= 10)
      .slice(0, 20);

    const successfulMechanics = [...new Set(
      successfulPatterns.map(p => p.playerOperation).filter(Boolean)
    )].slice(0, 10);

    // メカニクスの使用頻度を集計
    const mechanicCounts = new Map<string, number>();
    for (const pattern of patterns) {
      const mechanic = this.extractMechanic(pattern.playerOperation);
      if (mechanic) {
        mechanicCounts.set(mechanic, (mechanicCounts.get(mechanic) || 0) + 1);
      }
    }

    // 使いすぎているメカニクス（5回以上使用）
    const overusedMechanics = Array.from(mechanicCounts.entries())
      .filter(([, count]) => count >= 5)
      .map(([mechanic, count]) => ({ mechanic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 使用済みテーマを集計
    const usedThemes = new Set(patterns.map(p => p.theme).filter(Boolean));

    // 未使用テーマの候補
    const allThemes = ['宇宙', '深海', '忍者', '妖怪', 'ロボット', '音楽', '数学',
                       '植物', '天気', '宝石', '時間', '記憶', '影', '鏡', '夢'];
    const unusedThemes = allThemes.filter(t => !usedThemes.has(t));

    // ジャンル統計
    const genreCounts = new Map<string, number>();
    for (const pattern of patterns) {
      if (pattern.genre) {
        genreCounts.set(pattern.genre, (genreCounts.get(pattern.genre) || 0) + 1);
      }
    }
    const topGenres = Array.from(genreCounts.entries())
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 平均品質スコア
    const avgQualityScore = patterns.length > 0
      ? patterns.reduce((sum, p) => sum + p.qualityScore, 0) / patterns.length
      : 0;

    return {
      recentPatterns,
      successfulMechanics,
      overusedMechanics,
      unusedThemes,
      stats: {
        totalGames: patterns.length,
        avgQualityScore: Math.round(avgQualityScore * 10) / 10,
        topGenres
      }
    };
  }

  /**
   * メカニクスを抽出（キーワードベース）
   */
  private extractMechanic(operation: string): string | null {
    if (!operation) return null;

    const keywords = [
      '順番', 'タップ', 'スワイプ', 'ドラッグ', '長押し', 'フリック',
      '選ぶ', '避ける', '集める', '配置', '回転', '傾け', '線を引',
      'タイミング', '記憶', 'もぐら', '落ちてくる', '受ける'
    ];

    for (const keyword of keywords) {
      if (operation.includes(keyword)) {
        return keyword;
      }
    }
    return null;
  }

  /**
   * デフォルトの分析結果（Supabase接続なし時）
   */
  private getDefaultAnalysis(): PatternAnalysis {
    return {
      recentPatterns: [],
      successfulMechanics: [
        '正しい場所を1回でタップ',
        '動いているものが特定位置に来た瞬間にタップ',
        'オブジェクトを正しい場所にドラッグ',
        '正しい方向にスワイプ'
      ],
      overusedMechanics: [
        { mechanic: '順番', count: 10 },
        { mechanic: 'タップ', count: 10 },
        { mechanic: '落ちてくる', count: 10 }
      ],
      unusedThemes: ['影', '鏡', '夢', '時間', '記憶'],
      stats: {
        totalGames: 0,
        avgQualityScore: 0,
        topGenres: []
      }
    };
  }

  /**
   * プロンプト用のコンテキストを生成
   */
  async generatePromptContext(): Promise<string> {
    const analysis = await this.analyze();

    let context = '';

    // 最近生成されたゲーム（避けるべき）
    if (analysis.recentPatterns.length > 0) {
      context += `\n# 最近24時間で生成されたゲーム（類似を避けてください）\n`;
      context += analysis.recentPatterns.map(p => `- ${p}`).join('\n');
      context += '\n';
    }

    // 使いすぎているメカニクス
    if (analysis.overusedMechanics.length > 0) {
      context += `\n# 使いすぎているメカニクス（避けてください）\n`;
      context += analysis.overusedMechanics.map(m => `- ${m.mechanic}（${m.count}回使用）`).join('\n');
      context += '\n';
    }

    // 成功しているメカニクス
    if (analysis.successfulMechanics.length > 0) {
      context += `\n# 高評価ゲームで使われているメカニクス（参考に）\n`;
      context += analysis.successfulMechanics.map(m => `- ${m}`).join('\n');
      context += '\n';
    }

    // 未使用テーマ
    if (analysis.unusedThemes.length > 0) {
      context += `\n# まだ使われていないテーマ（試してみてください）\n`;
      context += analysis.unusedThemes.join('、');
      context += '\n';
    }

    return context;
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.patterns = [];
    this.cache.lastFetch = 0;
  }

  /**
   * デバッグ情報
   */
  getDebugInfo(): object {
    return {
      cacheSize: this.cache.patterns.length,
      cacheAge: Date.now() - this.cache.lastFetch,
      hasClient: !!this.client
    };
  }
}

export default GamePatternAnalyzer;
