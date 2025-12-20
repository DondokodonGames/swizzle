/**
 * AI生成システム用の型定義
 * Phase H: 自動公開システム
 */

import { GameProject } from '../../types/editor/GameProject';

/**
 * ゲームジャンル
 */
export type GameGenre =
  | 'action'
  | 'puzzle'
  | 'rhythm'
  | 'reflex'
  | 'memory'
  | 'arcade'
  | 'casual'
  | 'timing'
  | 'other';

/**
 * ゲームメカニクス
 */
export type GameMechanic =
  | 'tap'
  | 'swipe'
  | 'drag'
  | 'hold'
  | 'avoid'
  | 'collect'
  | 'match'
  | 'aim'
  | 'balance'
  | 'timing'
  | 'other';

/**
 * ゲームコンセプト仕様
 */
export interface GameConceptSpec {
  genre: GameGenre;
  mechanic: GameMechanic;
  theme: string;
  title: string;
  description: string;
  duration: number;
}

/**
 * ゲームメタデータ
 */
export interface GameMetadata {
  spec: {
    concept: GameConceptSpec;
  };
  generatedAt: string;
  version: string;
}

/**
 * ゲームベクトル（特徴量）
 */
export interface GameVector {
  rules: {
    ruleCount: number;
    conditionTypes: string[];
    actionTypes: string[];
  };
  objects: {
    objectCount: number;
    hasBackground: boolean;
    hasSounds: boolean;
  };
  complexity: number;
}

/**
 * 品質評価結果
 */
export interface GameQuality {
  totalScore: number;
  passed: boolean;
  scores: {
    goalClarity: number;
    operationClarity: number;
    judgmentClarity: number;
    acceptance: number;
  };
}

/**
 * 生成されたゲーム
 */
export interface GeneratedGame {
  id: string;
  project: GameProject;
  metadata: GameMetadata;
  vector: GameVector;
  quality: GameQuality;
  qualityScore: number;
  createdAt: string;
}
