/**
 * PromptEvolver - 自己回帰的プロンプト改善システム
 *
 * 1. ロジックのみ生成・検証（画像アセット生成なし）
 * 2. エラーパターンを収集・分析
 * 3. プロンプトを自動改善
 */

import { ILLMProvider, createLLMProvider, LLMProviderType, DEFAULT_MODELS } from './llm';
import { GameConceptGenerator } from './GameConceptGenerator';
import { ConceptValidator } from './ConceptValidator';
import { GameDesignGenerator, GameDesign } from './GameDesignGenerator';
import { AssetPlanner, EnhancedAssetPlan } from './AssetPlanner';
import { SpecificationGenerator, GameSpecification } from './SpecificationGenerator';
import { EditorMapper, EditorMapperOutput } from './EditorMapper';
import { LogicValidator } from './LogicValidator';
import { ProjectValidator } from './ProjectValidator';
import { GenerationLogger } from './GenerationLogger';
import { GameConcept } from './types';
import * as fs from 'fs';
import * as path from 'path';

// ===========================================
// エラー収集用の型定義
// ===========================================

export interface ErrorRecord {
  timestamp: string;
  gameTitle: string;
  theme: string;
  step: string;
  errorType: string;
  errorMessage: string;
  context?: Record<string, unknown>;
}

export interface ErrorPattern {
  errorType: string;
  count: number;
  examples: string[];
  suggestedFix?: string;
}

export interface EvolutionReport {
  totalRuns: number;
  successCount: number;
  failureCount: number;
  errorPatterns: ErrorPattern[];
  promptImprovements: PromptImprovement[];
}

export interface PromptImprovement {
  targetFile: string;
  section: string;
  currentIssue: string;
  suggestedAddition: string;
  priority: 'high' | 'medium' | 'low';
}

// ===========================================
// PromptEvolver
// ===========================================

export class PromptEvolver {
  private llmProvider: ILLMProvider;
  private conceptGenerator: GameConceptGenerator;
  private conceptValidator: ConceptValidator;
  private gameDesignGenerator: GameDesignGenerator;
  private assetPlanner: AssetPlanner;
  private specificationGenerator: SpecificationGenerator;
  private editorMapper: EditorMapper;
  private logicValidator: LogicValidator;
  private projectValidator: ProjectValidator;
  private logger: GenerationLogger;

  private errors: ErrorRecord[] = [];
  private successCount: number = 0;
  private failureCount: number = 0;

  constructor(apiKey?: string, llmProviderType?: LLMProviderType) {
    const providerType = llmProviderType || (process.env.LLM_PROVIDER as LLMProviderType) || 'anthropic';
    const defaultModel = providerType === 'openai' ? DEFAULT_MODELS.openai : DEFAULT_MODELS.anthropic;

    this.llmProvider = createLLMProvider({
      provider: providerType,
      apiKey: apiKey,
      model: defaultModel
    });

    this.logger = new GenerationLogger();

    this.conceptGenerator = new GameConceptGenerator({
      dryRun: false,
      apiKey,
      llmProvider: providerType
    });

    this.conceptValidator = new ConceptValidator();

    this.gameDesignGenerator = new GameDesignGenerator({
      dryRun: false,
      apiKey,
      llmProvider: providerType
    }, this.logger);

    this.assetPlanner = new AssetPlanner({
      dryRun: false,
      apiKey,
      llmProvider: providerType
    }, this.logger);

    this.specificationGenerator = new SpecificationGenerator({
      dryRun: false,
      apiKey,
      llmProvider: providerType
    }, this.logger);

    this.editorMapper = new EditorMapper({
      dryRun: false,
      apiKey,
      llmProvider: providerType
    }, this.logger);

    this.logicValidator = new LogicValidator();
    this.projectValidator = new ProjectValidator(this.logger);
  }

  /**
   * N回のロジック生成を実行し、エラーを収集
   */
  async runLogicBatch(count: number): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log('🧬 PromptEvolver - Logic-Only Batch');
    console.log('='.repeat(60));
    console.log(`   Target: ${count} games (logic only, no assets)`);
    console.log('');

    for (let i = 0; i < count; i++) {
      console.log(`\n📦 Game ${i + 1}/${count}`);

      try {
        await this.runSingleLogicGeneration();
      } catch (error) {
        console.error(`   ❌ Fatal error: ${(error as Error).message}`);
        this.recordError('Fatal', 'FATAL_ERROR', (error as Error).message, {});
      }

      // Rate limiting
      await this.delay(500);
    }

    console.log('\n' + '='.repeat(60));
    console.log(`📊 Batch Complete: ${this.successCount} success, ${this.failureCount} failures`);
    console.log('='.repeat(60));
  }

  /**
   * 単一ゲームのロジック生成・検証
   */
  private async runSingleLogicGeneration(): Promise<void> {
    let concept: GameConcept | null = null;
    let design: GameDesign | null = null;
    let assetPlan: EnhancedAssetPlan | null = null;
    let spec: GameSpecification | null = null;
    let mapperOutput: EditorMapperOutput | null = null;

    try {
      // Step 1: Concept
      console.log('   📋 Step 1: Generating concept...');
      concept = await this.conceptGenerator.generate();
      console.log(`      Title: ${concept.title} (Theme: ${concept.theme})`);

      // Step 2: Validate concept
      const conceptValidation = this.conceptValidator.validate(concept);
      if (!conceptValidation.passed) {
        for (const issue of conceptValidation.issues) {
          this.recordError('ConceptValidator', 'CONCEPT_VALIDATION', issue, {
            title: concept.title,
            theme: concept.theme
          });
        }
      }

      // Step 3: Game Design
      console.log('   🎯 Step 3: Generating design...');
      design = await this.gameDesignGenerator.generate(concept);
      console.log(`      Objects: ${design.objects?.length || 0}, Interactions: ${design.interactions?.length || 0}`);

      // Step 3.5: Asset Plan
      console.log('   🎨 Step 3.5: Planning assets...');
      assetPlan = await this.assetPlanner.plan(concept, design);
      console.log(`      Objects: ${assetPlan.objects?.length || 0}`);

      // Step 4: Specification
      console.log('   📝 Step 4: Generating specification...');
      spec = await this.specificationGenerator.generate(concept, design, assetPlan);
      console.log(`      Rules: ${spec.rules?.length || 0}, Counters: ${spec.stateManagement?.counters?.length || 0}`);

      // Step 5: Editor Mapping
      console.log('   🔄 Step 5: Mapping to editor format...');
      mapperOutput = await this.editorMapper.map(concept, spec);

      // Step 6: Logic Validation
      console.log('   ✓ Step 6: Validating logic...');
      const logicValidation = this.logicValidator.validate(mapperOutput.logicOutput);

      if (!logicValidation.valid) {
        for (const error of logicValidation.errors) {
          this.recordError('LogicValidator', error.code || 'LOGIC_ERROR', error.message, {
            title: concept.title,
            theme: concept.theme,
            ruleCount: spec.rules.length
          });
        }
        console.log(`      ⚠️ Logic errors: ${logicValidation.errors.length}`);
      }

      // Step 6.5: Project Validation
      console.log('   🔍 Step 6.5: Validating project...');
      const projectValidation = this.projectValidator.validate(
        mapperOutput.logicOutput,
        assetPlan,
        spec
      );

      if (projectValidation.errors.length > 0) {
        for (const error of projectValidation.errors) {
          this.recordError('ProjectValidator', error.code, error.message, {
            title: concept.title,
            theme: concept.theme,
            severity: error.severity
          });
        }
        console.log(`      ⚠️ Project errors: ${projectValidation.errors.length}`);
        this.failureCount++;
        console.log(`   ❌ Failed: ${concept.title}`);
      } else {
        this.successCount++;
        console.log(`   ✅ Passed: ${concept.title}`);
      }

    } catch (error) {
      const step = this.determineFailedStep(concept, design, assetPlan, spec, mapperOutput);
      this.recordError(step, 'GENERATION_ERROR', (error as Error).message, {
        title: concept?.title,
        theme: concept?.theme
      });
      this.failureCount++;
      console.log(`   ❌ Error at ${step}: ${(error as Error).message}`);
    }
  }

  /**
   * エラーを記録
   */
  private recordError(
    step: string,
    errorType: string,
    message: string,
    context: Record<string, unknown>
  ): void {
    this.errors.push({
      timestamp: new Date().toISOString(),
      gameTitle: (context.title as string) || 'Unknown',
      theme: (context.theme as string) || 'Unknown',
      step,
      errorType,
      errorMessage: message,
      context
    });
  }

  /**
   * 失敗したステップを特定
   */
  private determineFailedStep(
    concept: GameConcept | null,
    design: GameDesign | null,
    assetPlan: EnhancedAssetPlan | null,
    spec: GameSpecification | null,
    mapperOutput: EditorMapperOutput | null
  ): string {
    if (!concept) return 'ConceptGenerator';
    if (!design) return 'GameDesignGenerator';
    if (!assetPlan) return 'AssetPlanner';
    if (!spec) return 'SpecificationGenerator';
    if (!mapperOutput) return 'EditorMapper';
    return 'Unknown';
  }

  /**
   * エラーパターンを分析
   */
  analyzeErrorPatterns(): ErrorPattern[] {
    const patternMap = new Map<string, { count: number; examples: string[] }>();

    for (const error of this.errors) {
      const key = `${error.step}:${error.errorType}`;
      const existing = patternMap.get(key) || { count: 0, examples: [] };
      existing.count++;
      if (existing.examples.length < 3) {
        existing.examples.push(error.errorMessage);
      }
      patternMap.set(key, existing);
    }

    const patterns: ErrorPattern[] = [];
    for (const [key, data] of patternMap) {
      const [step, errorType] = key.split(':');
      patterns.push({
        errorType: `${step}:${errorType}`,
        count: data.count,
        examples: data.examples
      });
    }

    // Sort by count descending
    patterns.sort((a, b) => b.count - a.count);

    return patterns;
  }

  /**
   * プロンプト改善提案を生成（AI使用）
   */
  async generatePromptImprovements(): Promise<PromptImprovement[]> {
    const patterns = this.analyzeErrorPatterns();

    if (patterns.length === 0) {
      console.log('✅ No errors to analyze');
      return [];
    }

    console.log('\n🔬 Analyzing error patterns with AI...');

    // 上位10パターンを分析
    const topPatterns = patterns.slice(0, 10);
    const patternSummary = topPatterns.map(p =>
      `- ${p.errorType} (${p.count}回): ${p.examples[0]}`
    ).join('\n');

    const prompt = `あなたはゲーム生成AIのプロンプトエンジニアです。
以下のエラーパターンを分析し、プロンプトの改善提案を生成してください。

# 生成結果
- 成功: ${this.successCount}
- 失敗: ${this.failureCount}
- 成功率: ${((this.successCount / (this.successCount + this.failureCount)) * 100).toFixed(1)}%

# エラーパターン（頻度順）
${patternSummary}

# 現在のプロンプト構成
- GameConceptGenerator: ゲームコンセプト生成
- GameDesignGenerator: ゲームデザイン生成（coreExperience含む）
- AssetPlanner: アセット計画
- SpecificationGenerator: ルール仕様生成
- EditorMapper: エディター形式変換

# 出力形式
以下のJSON形式で改善提案を出力してください:
{
  "improvements": [
    {
      "targetFile": "SpecificationGenerator.ts",
      "section": "ルール仕様",
      "currentIssue": "カウンターが定義されているが操作されていない",
      "suggestedAddition": "## カウンター使用ルール\\nカウンターを定義する場合は必ず:\\n1. 操作するルール（increment/decrement）\\n2. チェックするルール（条件）\\nの両方を定義してください。",
      "priority": "high"
    }
  ]
}

JSON形式のみ出力してください。`;

    try {
      const response = await this.llmProvider.chat(
        [{ role: 'user', content: prompt }],
        {}
      );

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const result = JSON.parse(jsonMatch[0]);
      return result.improvements || [];

    } catch (error) {
      console.error('Error generating improvements:', error);
      return [];
    }
  }

  /**
   * レポートを生成・保存
   */
  async generateReport(): Promise<EvolutionReport> {
    const patterns = this.analyzeErrorPatterns();
    const improvements = await this.generatePromptImprovements();

    const report: EvolutionReport = {
      totalRuns: this.successCount + this.failureCount,
      successCount: this.successCount,
      failureCount: this.failureCount,
      errorPatterns: patterns,
      promptImprovements: improvements
    };

    // Save report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(process.cwd(), 'output', `evolution_report_${timestamp}.json`);

    // Ensure output directory exists
    const outputDir = path.dirname(reportPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved: ${reportPath}`);

    // Save raw errors
    const errorsPath = path.join(process.cwd(), 'output', `errors_${timestamp}.json`);
    fs.writeFileSync(errorsPath, JSON.stringify(this.errors, null, 2));
    console.log(`📄 Errors saved: ${errorsPath}`);

    return report;
  }

  /**
   * レポートを表示
   */
  printReport(report: EvolutionReport): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Evolution Report');
    console.log('='.repeat(60));

    console.log(`\n📈 Statistics:`);
    console.log(`   Total runs: ${report.totalRuns}`);
    console.log(`   Success: ${report.successCount} (${((report.successCount / report.totalRuns) * 100).toFixed(1)}%)`);
    console.log(`   Failure: ${report.failureCount}`);

    console.log(`\n🔴 Top Error Patterns:`);
    for (const pattern of report.errorPatterns.slice(0, 10)) {
      console.log(`   ${pattern.errorType}: ${pattern.count}回`);
      console.log(`      例: ${pattern.examples[0]?.substring(0, 80)}...`);
    }

    console.log(`\n💡 Prompt Improvements:`);
    for (const improvement of report.promptImprovements) {
      console.log(`\n   [${improvement.priority.toUpperCase()}] ${improvement.targetFile}`);
      console.log(`   Issue: ${improvement.currentIssue}`);
      console.log(`   Fix: ${improvement.suggestedAddition.substring(0, 100)}...`);
    }

    console.log('\n' + '='.repeat(60));
  }

  /**
   * 改善提案を適用（手動確認後）
   */
  async applyImprovements(improvements: PromptImprovement[]): Promise<void> {
    console.log('\n🔧 Applying improvements...');

    for (const improvement of improvements) {
      console.log(`\n   📝 ${improvement.targetFile} - ${improvement.section}`);
      console.log(`   Current issue: ${improvement.currentIssue}`);
      console.log(`   Suggested fix:\n${improvement.suggestedAddition}`);

      // Note: Actual file modification would require reading the file,
      // finding the right location, and inserting the text.
      // For safety, we just output the suggestions.
    }

    console.log('\n⚠️ Improvements printed above. Manual review and application recommended.');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * エラーをクリア
   */
  clearErrors(): void {
    this.errors = [];
    this.successCount = 0;
    this.failureCount = 0;
  }
}

export default PromptEvolver;
