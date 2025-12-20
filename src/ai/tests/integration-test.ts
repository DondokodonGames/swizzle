/**
 * AI Generation System - Integration Test
 *
 * 改善されたAI生成システムの統合テスト
 * 実行方法: npx ts-node src/ai/tests/integration-test.ts
 */

import { GameIdeaGenerator, GameIdea } from '../generators/GameIdeaGenerator';
import { ImprovedLogicGenerator, AssetReferences } from '../generators/ImprovedLogicGenerator';
import { ImprovedSoundGenerator } from '../generators/ImprovedSoundGenerator';
import { FunEvaluator } from '../checkers/FunEvaluator';
import { ImprovedQualityChecker } from '../checkers/ImprovedQualityChecker';
import { createDefaultGameProject } from '../../types/editor/GameProject';

// テスト用モックGameIdea
const mockIdea: GameIdea = {
  id: 'test_idea_001',
  title: 'タップでポップ',
  titleEn: 'Tap to Pop',
  description: '風船をタップして全部割ろう',
  theme: '空・雲',
  visualStyle: 'simple',
  mainMechanic: 'tap-target',
  subMechanics: ['collect-items'],
  playerGoal: '風船を全部割らなきゃ！',
  playerAction: '風船をタップして割る',
  winCondition: '5つの風船を全部割る',
  loseCondition: '3個逃したら失敗',
  duration: 10,
  difficulty: 'easy',
  objectCount: 5,
  estimatedRuleCount: 7,
  funScore: 8,
  uniqueness: '風船が動きながら上昇するので、タイミングが重要',
  targetAudience: '全年齢',
  emotionalHook: '達成感'
};

// テスト用モックアセット
const mockAssets: AssetReferences = {
  backgroundId: 'bg_sky',
  objectIds: ['balloon_red', 'balloon_blue', 'balloon_green', 'balloon_yellow', 'balloon_pink'],
  textIds: ['text_score'],
  bgmId: 'bgm_happy',
  seIds: ['se_pop', 'se_success', 'se_failure']
};

// テスト用モックGameProject（最小限の動作するゲーム）
function createMockGameProject() {
  const project = createDefaultGameProject('テストゲーム');

  project.script = {
    layout: {
      background: { visible: true },
      objects: [
        {
          objectId: 'balloon_red',
          position: { x: 0.3, y: 0.7 },
          scale: { x: 1.0, y: 1.0 },
          rotation: 0,
          zIndex: 10,
          initialState: { visible: true, animation: 0 }
        },
        {
          objectId: 'balloon_blue',
          position: { x: 0.5, y: 0.6 },
          scale: { x: 1.0, y: 1.0 },
          rotation: 0,
          zIndex: 10,
          initialState: { visible: true, animation: 0 }
        },
        {
          objectId: 'balloon_green',
          position: { x: 0.7, y: 0.8 },
          scale: { x: 1.0, y: 1.0 },
          rotation: 0,
          zIndex: 10,
          initialState: { visible: true, animation: 0 }
        }
      ],
      texts: [],
      stage: { backgroundColor: '#87CEEB' }
    },
    counters: [
      { id: 'popped', name: '割った数', initialValue: 0, minValue: 0, maxValue: 10 }
    ],
    flags: [],
    rules: [
      // 風船上昇ルール
      {
        id: 'rule_001',
        name: '風船上昇',
        enabled: true,
        priority: 10,
        targetObjectId: 'balloon_red',
        triggers: {
          operator: 'AND',
          conditions: [
            { type: 'time', timeType: 'interval', interval: 0.1 }
          ]
        },
        actions: [
          {
            type: 'move',
            targetId: 'balloon_red',
            movement: { type: 'straight', target: { x: 0.3, y: 0.0 }, speed: 1.5 }
          }
        ],
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      },
      // タップルール
      {
        id: 'rule_002',
        name: '風船タップ',
        enabled: true,
        priority: 20,
        targetObjectId: 'balloon_red',
        triggers: {
          operator: 'AND',
          conditions: [
            { type: 'touch', target: 'self', touchType: 'down' }
          ]
        },
        actions: [
          { type: 'effect', targetId: 'balloon_red', effect: { type: 'scale', scaleAmount: 1.5, duration: 0.15 } },
          { type: 'hide', targetId: 'balloon_red' },
          { type: 'counter', counterName: 'popped', operation: 'add', value: 1 },
          { type: 'playSound', soundId: 'se_pop', volume: 0.8 }
        ],
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      },
      // クリア判定
      {
        id: 'rule_003',
        name: 'クリア判定',
        enabled: true,
        priority: 30,
        targetObjectId: 'stage',
        triggers: {
          operator: 'AND',
          conditions: [
            { type: 'counter', counterName: 'popped', comparison: 'greaterOrEqual', value: 3 }
          ]
        },
        actions: [
          { type: 'success', score: 100, message: '全部割った！' }
        ],
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      }
    ],
    successConditions: [],
    version: '1.0.0',
    lastModified: new Date().toISOString()
  } as any;

  // アセット追加（テスト用モック）
  project.assets = {
    background: null,
    objects: [
      { id: 'balloon_red', name: '赤い風船', frames: [{ dataUrl: 'data:image/svg+xml,...' }] },
      { id: 'balloon_blue', name: '青い風船', frames: [{ dataUrl: 'data:image/svg+xml,...' }] },
      { id: 'balloon_green', name: '緑の風船', frames: [{ dataUrl: 'data:image/svg+xml,...' }] }
    ],
    texts: [],
    audio: { bgm: null, se: [] },
    statistics: {
      totalImageSize: 0,
      totalAudioSize: 0,
      totalSize: 0,
      usedSlots: { background: 0, objects: 3, texts: 0, bgm: 0, se: 0 },
      limitations: { isOverSize: false, isOverSlot: false, warnings: [] }
    },
    lastModified: new Date().toISOString()
  } as any;

  return project;
}

// ==========================================
// テスト実行
// ==========================================

async function runTests() {
  console.log('=' .repeat(60));
  console.log('🧪 AI Generation System - Integration Test');
  console.log('='.repeat(60));

  let passedTests = 0;
  let failedTests = 0;

  // -----------------------------------------
  // Test 1: FunEvaluator
  // -----------------------------------------
  console.log('\n📌 Test 1: FunEvaluator');
  try {
    const funEvaluator = new FunEvaluator();
    const mockProject = createMockGameProject();
    const funResult = funEvaluator.evaluate(mockProject, mockIdea);

    console.log(`   Fun Score: ${funResult.funScore}/100`);
    console.log(`   Passed: ${funResult.passed}`);
    console.log(`   Breakdown:`, funResult.breakdown);

    if (funResult.funScore > 0 && typeof funResult.passed === 'boolean') {
      console.log('   ✅ FunEvaluator Test PASSED');
      passedTests++;
    } else {
      throw new Error('Invalid FunEvaluator result');
    }
  } catch (error) {
    console.log(`   ❌ FunEvaluator Test FAILED: ${(error as Error).message}`);
    failedTests++;
  }

  // -----------------------------------------
  // Test 2: ImprovedQualityChecker
  // -----------------------------------------
  console.log('\n📌 Test 2: ImprovedQualityChecker');
  try {
    const qualityChecker = new ImprovedQualityChecker();
    const mockProject = createMockGameProject();
    const qualityResult = qualityChecker.check(mockProject, mockIdea);

    console.log(`   Total Score: ${qualityResult.totalScore.toFixed(1)}/100`);
    console.log(`   Technical: ${qualityResult.technicalScore.toFixed(1)}/35`);
    console.log(`   Fun: ${qualityResult.funScore.toFixed(1)}/50`);
    console.log(`   Diversity: ${qualityResult.diversityScore.toFixed(1)}/15`);
    console.log(`   Passed: ${qualityResult.passed}`);

    if (qualityResult.totalScore > 0 && typeof qualityResult.passed === 'boolean') {
      console.log('   ✅ ImprovedQualityChecker Test PASSED');
      passedTests++;
    } else {
      throw new Error('Invalid QualityChecker result');
    }
  } catch (error) {
    console.log(`   ❌ ImprovedQualityChecker Test FAILED: ${(error as Error).message}`);
    failedTests++;
  }

  // -----------------------------------------
  // Test 3: ImprovedSoundGenerator
  // -----------------------------------------
  console.log('\n📌 Test 3: ImprovedSoundGenerator');
  try {
    const soundGenerator = new ImprovedSoundGenerator();
    const sounds = await soundGenerator.generateForGame(mockIdea);

    console.log(`   Effects Generated: ${sounds.effects.length}`);
    console.log(`   Effect Names: ${sounds.effects.map(e => e.name).join(', ')}`);

    if (sounds.effects.length > 0) {
      console.log('   ✅ ImprovedSoundGenerator Test PASSED');
      passedTests++;
    } else {
      throw new Error('No effects generated');
    }
  } catch (error) {
    console.log(`   ❌ ImprovedSoundGenerator Test FAILED: ${(error as Error).message}`);
    failedTests++;
  }

  // -----------------------------------------
  // Test 4: GameIdeaGenerator (Structure Only - No API)
  // -----------------------------------------
  console.log('\n📌 Test 4: GameIdeaGenerator Structure');
  try {
    // APIを呼ばずに構造だけテスト
    const ideaGenerator = new GameIdeaGenerator({
      provider: 'openai',
      minFunScore: 7
    });

    const debugInfo = ideaGenerator.getDebugInfo();
    console.log(`   Provider: ${(debugInfo as any).provider}`);
    console.log(`   Model: ${(debugInfo as any).model}`);
    console.log(`   MinFunScore: ${(debugInfo as any).minFunScore}`);

    if ((debugInfo as any).provider && (debugInfo as any).model) {
      console.log('   ✅ GameIdeaGenerator Structure Test PASSED');
      passedTests++;
    } else {
      throw new Error('Invalid GameIdeaGenerator structure');
    }
  } catch (error) {
    console.log(`   ❌ GameIdeaGenerator Structure Test FAILED: ${(error as Error).message}`);
    failedTests++;
  }

  // -----------------------------------------
  // Test 5: ImprovedLogicGenerator (Structure Only - No API)
  // -----------------------------------------
  console.log('\n📌 Test 5: ImprovedLogicGenerator Structure');
  try {
    const logicGenerator = new ImprovedLogicGenerator({
      model: 'claude-3-5-haiku-latest'
    });

    const debugInfo = logicGenerator.getDebugInfo();
    console.log(`   Model: ${(debugInfo as any).model}`);
    console.log(`   Estimated Cost: $${(debugInfo as any).estimatedCost.total.toFixed(6)}`);

    if ((debugInfo as any).model) {
      console.log('   ✅ ImprovedLogicGenerator Structure Test PASSED');
      passedTests++;
    } else {
      throw new Error('Invalid LogicGenerator structure');
    }
  } catch (error) {
    console.log(`   ❌ ImprovedLogicGenerator Structure Test FAILED: ${(error as Error).message}`);
    failedTests++;
  }

  // -----------------------------------------
  // Summary
  // -----------------------------------------
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`   Total Tests: ${passedTests + failedTests}`);
  console.log(`   Passed: ${passedTests} ✅`);
  console.log(`   Failed: ${failedTests} ❌`);
  console.log(`   Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);

  if (failedTests === 0) {
    console.log('\n🎉 All tests passed! System is ready for integration.');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the issues above.');
  }

  return { passed: passedTests, failed: failedTests };
}

// 実行
runTests().catch(console.error);
