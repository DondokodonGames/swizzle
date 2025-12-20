/**
 * AI Game Generation v2
 *
 * 新設計に基づくゲーム自動生成システム
 *
 * 設計思想:
 * - ゲームアイデア: 完全自由
 * - エディター仕様: 厳密遵守
 *
 * 7ステップ:
 * 1. GameConceptGenerator - 4つの評価基準を前提に自由発想
 * 2. ConceptValidator - ダブルチェック
 * 3. LogicGenerator - エディター仕様厳密、アセット計画出力
 * 4. LogicValidator - 100%成功前提のダブルチェック
 * 5. AssetGenerator - 計画に基づく生成
 * 6. FinalAssembler - JSON整合性チェック
 * 7. QualityScorer - 参考情報
 */

// Types
export * from './types';

// Steps
export { GameConceptGenerator } from './GameConceptGenerator';
export { ConceptValidator } from './ConceptValidator';
export { LogicGenerator } from './LogicGenerator';
export { LogicValidator } from './LogicValidator';
export { AssetGenerator } from './AssetGenerator';
export { FinalAssembler } from './FinalAssembler';
export { QualityScorer } from './QualityScorer';

// Orchestrator
export { Orchestrator } from './Orchestrator';
export { default } from './Orchestrator';
