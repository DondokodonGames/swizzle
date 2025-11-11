/**
 * AI自動ゲーム生成システム - 型定義
 * Phase H: 245種類のゲームを完全自動生成
 */

import { GameProject } from '../../types/editor/GameProject';
import { GameScript, TriggerCondition, GameAction } from '../../types/editor/GameScript';

// ==========================================
// 🎮 ゲーム仕様（AI生成入力）
// ==========================================

/**
 * AI生成用ゲーム仕様
 * Claude APIへの入力として使用
 */
export interface GameSpec {
  // ゲームコンセプト
  concept: {
    name: string;                           // ゲーム名
    theme: string;                          // テーマ（例: "宇宙", "海", "森"）
    genre: GameGenre;                       // ジャンル
    mechanic: GameMechanic;                 // 主要メカニクス
    difficulty: 'easy' | 'normal' | 'hard'; // 難易度
    duration: 5 | 10 | 15 | 20 | 30;       // プレイ時間（秒）
  };
  
  // ビジュアル要件
  visual: {
    style: VisualStyle;                     // アートスタイル
    colorPalette: string[];                 // カラーパレット（hex）
    objectCount: number;                    // オブジェクト数（1-15）
    backgroundType: 'static' | 'animated';  // 背景タイプ
  };
  
  // ゲームプレイ要件
  gameplay: {
    primaryCondition: TriggerCondition['type']; // 主要条件タイプ
    primaryAction: GameAction['type'];          // 主要アクションタイプ
    complexityLevel: 1 | 2 | 3 | 4 | 5;        // 複雑度（1=シンプル、5=複雑）
    successCriteria: string;                    // 成功条件の説明
  };
  
  // メタデータ
  metadata: {
    targetAudience: 'kids' | 'teens' | 'adults' | 'all'; // 対象年齢
    keywords: string[];                         // キーワード（検索用）
    inspirations?: string[];                    // インスピレーション元
  };
}

/**
 * ゲームジャンル
 */
export type GameGenre = 
  | 'action'          // アクション
  | 'puzzle'          // パズル
  | 'timing'          // タイミング
  | 'reflex'          // 反射神経
  | 'memory'          // 記憶
  | 'collection'      // 収集
  | 'avoidance'       // 回避
  | 'shooter'         // シューター
  | 'endless'         // エンドレス
  | 'rhythm';         // リズム

/**
 * ゲームメカニクス
 */
export type GameMechanic = 
  | 'tap'             // タップ
  | 'swipe'           // スワイプ
  | 'drag'            // ドラッグ
  | 'hold'            // 長押し
  | 'timing'          // タイミング
  | 'matching'        // マッチング
  | 'collecting'      // 収集
  | 'dodging'         // 回避
  | 'shooting'        // 射撃
  | 'jumping';        // ジャンプ

/**
 * ビジュアルスタイル
 */
export type VisualStyle = 
  | 'minimal'         // ミニマル
  | 'cute'            // かわいい
  | 'retro'           // レトロ
  | 'neon'            // ネオン
  | 'nature'          // 自然
  | 'space'           // 宇宙
  | 'underwater'      // 水中
  | 'abstract'        // 抽象
  | 'geometric'       // 幾何学
  | 'pixel';          // ピクセルアート

// ==========================================
// 🎨 アセット生成要件
// ==========================================

/**
 * 画像生成要件
 */
export interface ImageGenerationRequest {
  type: 'background' | 'object';
  prompt: string;                             // Stable Diffusion用プロンプト
  negativePrompt?: string;                    // ネガティブプロンプト
  style: VisualStyle;                         // スタイル
  colorPalette: string[];                     // カラーパレット
  dimensions: { width: number; height: number }; // サイズ
  frameCount: number;                         // フレーム数（1-8）
  seed?: number;                              // シード値（再現性）
}

/**
 * 音声生成要件
 */
export interface SoundGenerationRequest {
  type: 'bgm' | 'se';
  category: SoundCategory;                    // カテゴリ
  duration: number;                           // 長さ（秒）
  mood: 'happy' | 'tense' | 'calm' | 'exciting'; // 雰囲気
  instrument?: string[];                      // 使用楽器（BGMの場合）
  volume: number;                             // 音量（0.0-1.0）
}

/**
 * 音声カテゴリ
 */
export type SoundCategory = 
  | 'jump'            // ジャンプ音
  | 'collect'         // 収集音
  | 'success'         // 成功音
  | 'failure'         // 失敗音
  | 'tap'             // タップ音
  | 'explosion'       // 爆発音
  | 'whoosh'          // ヒュー音
  | 'ambient'         // 環境音
  | 'melody';         // メロディ

// ==========================================
// 📊 品質評価
// ==========================================

/**
 * 動的品質評価結果
 */
export interface QualityEvaluation {
  // 総合スコア（95点満点）
  totalScore: number;
  
  // 相対評価（50点）
  relativeScore: {
    diversity: number;                      // 多様性スコア（0-20点）
    densityPenalty: number;                 // 密集ペナルティ（0--10点）
    gapFilling: number;                     // 空白埋めボーナス（0-10点）
    balance: number;                        // バランス貢献（0-10点）
    subtotal: number;                       // 小計（0-50点）
  };
  
  // 絶対評価（45点）
  absoluteScore: {
    basicQuality: number;                   // 基本品質（0-15点）
    playability: number;                    // プレイアビリティ（0-15点）
    predictedSatisfaction: number;          // 予測満足度（0-15点）
    subtotal: number;                       // 小計（0-45点）
  };
  
  // 合格判定
  passed: boolean;                          // 95点中95点以上で合格
  
  // 詳細情報
  details: {
    playabilityIssues: string[];            // プレイアビリティの問題
    diversityAnalysis: string;              // 多様性分析
    recommendations: string[];              // 改善提案
  };
}

/**
 * ゲームベクトル（40次元）
 */
export interface GameVector {
  // ゲームプレイ特性（10次元）
  gameplay: {
    playTime: number;                       // 平均プレイ時間
    interactionFrequency: number;           // 操作頻度
    difficulty: number;                     // 難易度
    skillCeiling: number;                   // スキル上達余地
    complexity: number;                     // 複雑度
    replayability: number;                  // リプレイ性
    accessibility: number;                  // アクセシビリティ
    learningCurve: number;                  // 学習曲線
    pace: number;                           // ペース
    tension: number;                        // 緊張感
  };
  
  // ビジュアル特性（10次元）
  visual: {
    colorIntensity: number;                 // 色彩強度
    visualComplexity: number;               // 視覚的複雑度
    brightness: number;                     // 明るさ
    contrast: number;                       // コントラスト
    saturation: number;                     // 彩度
    objectDensity: number;                  // オブジェクト密度
    animationAmount: number;                // アニメーション量
    effectIntensity: number;                // エフェクト強度
    artStyleIndex: number;                  // アートスタイル（0-1エンコード）
    symmetry: number;                       // 対称性
  };
  
  // ルール特性（10次元）
  rules: {
    ruleCount: number;                      // ルール数
    conditionDiversity: number;             // 条件多様性
    actionDiversity: number;                // アクション多様性
    conditionComplexity: number;            // 条件複雑度
    actionComplexity: number;               // アクション複雑度
    ruleInteraction: number;                // ルール間相互作用
    randomness: number;                     // ランダム性
    determinism: number;                    // 決定論性
    feedbackLoop: number;                   // フィードバックループ
    emergentComplexity: number;             // 創発的複雑性
  };
  
  // インタラクション特性（10次元）
  interaction: {
    touchBased: number;                     // タッチベース（0/1）
    timingBased: number;                    // タイミングベース（0/1）
    memoryBased: number;                    // 記憶ベース（0/1）
    reflexBased: number;                    // 反射ベース（0/1）
    strategyBased: number;                  // 戦略ベース（0/1）
    precisionBased: number;                 // 精密性ベース（0/1）
    rhythmBased: number;                    // リズムベース（0/1）
    spatialBased: number;                   // 空間認識ベース（0/1）
    patternBased: number;                   // パターン認識ベース（0/1）
    reactionBased: number;                  // 反応速度ベース（0/1）
  };
}

// ==========================================
// 🔄 生成モード
// ==========================================

/**
 * 生成モード（探索 vs 活用）
 */
export interface GenerationMode {
  type: 'exploration' | 'exploitation';     // 探索 or 活用
  target?: string;                          // 目標（探索の場合: 探索する領域）
  epsilon: number;                          // ε値（0.0-1.0）
  reason: string;                           // このモードを選択した理由
}

// ==========================================
// 🎯 生成結果
// ==========================================

/**
 * 生成されたゲーム（完全版）
 */
export interface GeneratedGame {
  // GameProject（エディター互換）
  project: GameProject;
  
  // メタデータ
  metadata: {
    generationId: string;                   // 生成ID
    generatedAt: string;                    // 生成日時
    generationMode: GenerationMode;         // 生成モード
    spec: GameSpec;                         // 入力仕様
    
    // 生成プロセス
    generationProcess: {
      specGenerationTime: number;           // 仕様生成時間（ms）
      assetGenerationTime: number;          // アセット生成時間（ms）
      logicGenerationTime: number;          // ロジック生成時間（ms）
      totalTime: number;                    // 合計時間（ms）
    };
    
    // コスト
    cost: {
      claudeTokens: number;                 // Claudeトークン数
      stableDiffusionImages: number;        // SD画像生成数
      estimatedCostUSD: number;             // 推定コスト（USD）
    };
  };
  
  // 品質評価
  quality: QualityEvaluation;
  
  // ゲームベクトル
  vector: GameVector;
}

/**
 * 生成失敗情報
 */
export interface GenerationFailure {
  generationId: string;
  failedAt: string;                         // 失敗日時
  stage: 'spec' | 'assets' | 'logic' | 'quality'; // 失敗ステージ
  error: Error;
  spec?: GameSpec;                          // 仕様（あれば）
  retryCount: number;                       // リトライ回数
}

// ==========================================
// 📈 ポートフォリオ
// ==========================================

/**
 * ゲームポートフォリオ（既存ゲーム群）
 */
export interface GamePortfolio {
  games: GeneratedGame[];                   // 生成済みゲーム
  
  // 統計情報
  statistics: {
    totalGames: number;                     // 総ゲーム数
    averageQuality: number;                 // 平均品質スコア
    diversityScore: number;                 // 全体の多様性スコア（0-1）
    
    // カテゴリ分布
    genreDistribution: Record<GameGenre, number>;
    mechanicDistribution: Record<GameMechanic, number>;
    difficultyDistribution: Record<'easy' | 'normal' | 'hard', number>;
    
    // 品質分布
    qualityDistribution: {
      excellent: number;                    // 95点以上
      good: number;                         // 85-94点
      acceptable: number;                   // 75-84点
      poor: number;                         // 75点未満
    };
  };
  
  // ポートフォリオ健全性
  health: {
    isBalanced: boolean;                    // バランスが取れているか
    hasCoverage: boolean;                   // カバレッジが十分か
    needsExploration: string[];             // 探索が必要な領域
  };
}

// ==========================================
// 🤖 AI生成統計
// ==========================================

/**
 * 生成統計（日次・累計）
 */
export interface GenerationStatistics {
  // 生成数
  generated: number;                        // 生成試行数
  passed: number;                           // 合格数
  failed: number;                           // 失敗数
  passRate: number;                         // 合格率（0-1）
  
  // 品質
  averageQuality: number;                   // 平均品質スコア
  maxQuality: number;                       // 最高品質スコア
  minQuality: number;                       // 最低品質スコア
  
  // 多様性
  diversityScore: number;                   // 多様性スコア（0-1）
  uniqueGenres: number;                     // ユニークなジャンル数
  uniqueMechanics: number;                  // ユニークなメカニクス数
  
  // 時間・コスト
  averageGenerationTime: number;            // 平均生成時間（ms）
  totalCostUSD: number;                     // 累計コスト（USD）
  costPerGame: number;                      // ゲームあたりコスト（USD）
  
  // 探索・活用
  explorationCount: number;                 // 探索モード実行数
  exploitationCount: number;                // 活用モード実行数
  currentEpsilon: number;                   // 現在のε値
}

// ==========================================
// 🎮 ユーザーフィードバック
// ==========================================

/**
 * ユーザーフィードバック
 */
export interface UserFeedback {
  gameId: string;                           // ゲームID
  userId?: string;                          // ユーザーID（匿名可）
  
  // 評価
  rating: number;                           // 評価（1-5）
  playTime: number;                         // プレイ時間（秒）
  completed: boolean;                       // クリアしたか
  retryCount: number;                       // リトライ回数
  
  // フィードバック
  liked: boolean | null;                    // いいね（null=未評価）
  comments?: string;                        // コメント
  
  // タイムスタンプ
  createdAt: string;                        // フィードバック日時
}

/**
 * フィードバック集計
 */
export interface FeedbackAggregate {
  gameId: string;
  
  // 集計
  totalFeedbacks: number;                   // 総フィードバック数
  averageRating: number;                    // 平均評価（1-5）
  likeRate: number;                         // いいね率（0-1）
  completionRate: number;                   // クリア率（0-1）
  averagePlayTime: number;                  // 平均プレイ時間（秒）
  
  // 分析
  popularityScore: number;                  // 人気スコア（0-100）
  engagementScore: number;                  // エンゲージメントスコア（0-100）
  qualityScore: number;                     // 品質スコア（0-100）
}

// ==========================================
// 🔧 設定
// ==========================================

/**
 * AI生成システム設定
 */
export interface AIGenerationConfig {
  // API設定
  api: {
    anthropicApiKey: string;
    openaiApiKey?: string;                  // OpenAI API Key（DALL-E 3用）
    imageProvider?: 'openai' | 'replicate' | 'stable-diffusion'; // 画像生成プロバイダー
    stableDiffusionUrl?: string;            // Stable Diffusion URL
    replicateApiKey?: string;               // Replicate API（代替）
  };
  
  // Supabase設定
  supabase: {
    url: string;
    serviceKey: string;
    masterEmail: string;
    masterPassword: string;
  };
  
  // Twitter設定（オプション）
  twitter?: {
    apiKey: string;
    apiSecret: string;
    accessToken: string;
    accessSecret: string;
  };
  
  // 生成設定
  generation: {
    targetGamesCount: number;               // 目標ゲーム数
    dailyGenerationLimit: number;           // 日次生成上限
    qualityThreshold: number;               // 品質閾値（95点満点）
    maxRetries: number;                     // 最大リトライ回数
    explorationRate: number;                // 探索率（0-1）
  };
  
  // パフォーマンス設定
  performance: {
    parallelGeneration: boolean;            // 並列生成
    maxConcurrent: number;                  // 最大同時実行数
    batchSize: number;                      // バッチサイズ
    cacheEnabled: boolean;                  // キャッシュ有効
  };
  

}
