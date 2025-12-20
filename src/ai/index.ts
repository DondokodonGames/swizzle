/**
 * AI Game Generation System
 *
 * V2 - New design based on 4 evaluation criteria
 *
 * Design philosophy:
 * - Game ideas: Complete freedom
 * - Editor specification: Strict compliance
 *
 * 7 Steps:
 * 1. GameConceptGenerator - Free ideation with 4 criteria as prerequisites
 * 2. ConceptValidator - Double check
 * 3. LogicGenerator - Strict editor spec, asset plan output
 * 4. LogicValidator - 100% success expected, double check
 * 5. AssetGenerator - Generate based on plan
 * 6. FinalAssembler - JSON integrity check
 * 7. QualityScorer - Reference information only
 *
 * Usage:
 *   npm run ai:v2:1       # Generate 1 game
 *   npm run ai:v2:10      # Generate 10 games
 *   npm run ai:v2:dry     # Dry run (no API calls)
 *   npm run ai:v2:local   # Skip upload
 */

// Re-export everything from v2
export * from './v2';

// Default export is the Orchestrator
export { default } from './v2';
