/**
 * Step 6: FinalAssembler
 *
 * 全素材を組み合わせてGameProjectを完成
 * ファイル破損を防止する整合性チェック
 */

import { GameProject, DEFAULT_PROJECT_METADATA } from '../../types/editor/GameProject';
import { GameDurationOption } from '../../constants/EditorLimits';
import {
  GameConcept,
  LogicGeneratorOutput,
  GeneratedAssets,
  AssemblyResult
} from './types';

// duration秒数を有効な選択肢に変換
function toValidDuration(seconds: number): GameDurationOption {
  const validOptions: GameDurationOption[] = [5, 10, 15, 20, 30];
  // 最も近い有効値を返す
  let closest = validOptions[0];
  let minDiff = Math.abs(seconds - closest);
  for (const opt of validOptions) {
    const diff = Math.abs(seconds - opt);
    if (diff < minDiff) {
      minDiff = diff;
      closest = opt;
    }
  }
  return closest;
}

// デフォルトのアニメーション設定
const DEFAULT_ANIMATION_SETTINGS = {
  speed: 10,
  loop: true,
  pingPong: false,
  autoStart: true
};

export class FinalAssembler {
  /**
   * ゲームプロジェクトを組み立て
   */
  assemble(
    concept: GameConcept,
    logicOutput: LogicGeneratorOutput,
    assets: GeneratedAssets
  ): AssemblyResult {
    const issues: string[] = [];

    // 1. アセットIDとスクリプトIDの整合性チェック
    const assetObjectIds = new Set(assets.objects.map(o => o.id));
    for (const layoutObj of logicOutput.script.layout.objects) {
      if (!assetObjectIds.has(layoutObj.objectId)) {
        issues.push(`Missing asset for objectId: ${layoutObj.objectId}`);
      }
    }

    // 2. GameProject構築
    const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();

    // AI生成用の簡略化したプロジェクト構造を作成
    // 厳密な型チェックを回避するために as GameProject を使用
    const project = {
      id: gameId,
      name: concept.title,
      nameEn: concept.titleEn,
      description: concept.description,
      version: '1.0.0',
      createdAt: now,
      lastModified: now,
      assets: {
        background: assets.background ? {
          id: assets.background.id,
          name: assets.background.name,
          frames: assets.background.frames.map(f => ({
            id: `frame_${Date.now()}`,
            dataUrl: f.dataUrl,
            originalName: 'generated.png',
            width: 1024,
            height: 1024,
            fileSize: 0,
            uploadedAt: now
          })),
          animationSettings: DEFAULT_ANIMATION_SETTINGS,
          totalSize: 0,
          createdAt: now,
          lastModified: now
        } : null,
        objects: assets.objects.map((obj, idx) => ({
          id: obj.id,
          name: obj.name,
          frames: obj.frames.map(f => ({
            id: `frame_${Date.now()}_${idx}`,
            dataUrl: f.dataUrl,
            originalName: 'generated.png',
            width: 256,
            height: 256,
            fileSize: 0,
            uploadedAt: now
          })),
          animationSettings: DEFAULT_ANIMATION_SETTINGS,
          totalSize: 0,
          defaultScale: 1.0,
          defaultOpacity: 1.0,
          createdAt: now,
          lastModified: now
        })),
        texts: [],
        audio: {
          bgm: assets.bgm ? {
            id: assets.bgm.id,
            name: assets.bgm.name,
            dataUrl: assets.bgm.data,
            originalName: 'generated.wav',
            duration: 10,
            fileSize: 0,
            format: 'wav',
            uploadedAt: now,
            volume: 1.0,
            loop: true
          } : null,
          se: assets.sounds.map(sound => ({
            id: sound.id,
            name: sound.name,
            dataUrl: sound.data,
            originalName: 'generated.wav',
            duration: 0.5,
            fileSize: 0,
            format: 'wav',
            uploadedAt: now,
            volume: 1.0,
            loop: false
          }))
        },
        statistics: {
          totalImageSize: 0,
          totalAudioSize: 0,
          totalSize: 0,
          usedSlots: {
            background: assets.background ? 1 : 0,
            objects: assets.objects.length,
            texts: 0,
            bgm: assets.bgm ? 1 : 0,
            se: assets.sounds.length
          },
          limitations: {
            isNearImageLimit: false,
            isNearAudioLimit: false,
            isNearTotalLimit: false,
            hasViolations: false
          }
        },
        lastModified: now
      },
      script: {
        initialState: {
          score: 0,
          flags: {},
          counters: {}
        },
        layout: {
          background: {
            visible: true,
            initialAnimation: 0,
            animationSpeed: 10,
            autoStart: true
          },
          objects: logicOutput.script.layout.objects.map((obj, idx) => ({
            objectId: obj.objectId,
            position: obj.position,
            scale: obj.scale,
            rotation: 0,
            zIndex: idx + 1,
            initialState: {
              visible: true,
              animation: 0,
              animationSpeed: 10,
              autoStart: true
            }
          })),
          texts: [],
          stageArea: {
            x: 0,
            y: 0,
            width: 1,
            height: 1
          }
        },
        counters: logicOutput.script.counters.map(counter => ({
          ...counter,
          currentValue: counter.initialValue,
          persistence: 'game' as const,
          createdAt: now,
          lastModified: now
        })),
        flags: [],
        rules: logicOutput.script.rules.map((rule, idx) => ({
          id: rule.id,
          name: rule.name || rule.id,
          enabled: true,
          priority: idx,
          targetObjectId: rule.targetObjectId || 'stage',
          triggers: rule.triggers || { operator: 'AND' as const, conditions: [] },
          actions: rule.actions || [],
          createdAt: now,
          lastModified: now
        })),
        successConditions: [],
        statistics: {
          totalRules: logicOutput.script.rules.length,
          totalConditions: 0,
          totalActions: 0,
          complexityScore: 0,
          counterCount: logicOutput.script.counters.length,
          randomUsageCount: 0,
          randomMemoryUsage: 0
        },
        version: '1.0.0',
        lastModified: now
      },
      settings: {
        duration: {
          type: 'fixed' as const,
          seconds: toValidDuration(concept.duration)
        },
        score: {
          enabled: true,
          initialValue: 0
        },
        timer: {
          visible: true,
          position: 'top-right' as const
        },
        lastModified: now
      },
      creator: {
        userId: undefined,
        username: 'AI Generator',
        isAnonymous: true
      },
      status: 'draft' as const,
      totalSize: 0,
      metadata: {
        ...DEFAULT_PROJECT_METADATA,
        generatedAt: now,
        concept: concept,
        assetPlan: logicOutput.assetPlan
      },
      versionHistory: [],
      projectSettings: {
        autoSaveInterval: 30000,
        backupEnabled: true,
        compressionEnabled: true,
        maxVersionHistory: 10
      }
    } as unknown as GameProject;

    // エラー（致命的）と警告（許容可能）を分離
    const errors: string[] = [];
    const warnings: string[] = [];

    // 3. JSON.stringify可能か確認
    try {
      JSON.stringify(project);
    } catch (e) {
      errors.push(`JSON serialization failed: ${e}`);
    }

    // 4. 必須フィールドの存在確認
    if (!project.assets) {
      errors.push('Missing assets');
    }
    if (!project.script?.rules || project.script.rules.length === 0) {
      errors.push('No rules defined');
    }
    if (!project.settings?.duration) {
      errors.push('Missing duration setting');
    }

    // 5. ルールの整合性確認
    for (const rule of project.script.rules) {
      if (!rule.triggers?.conditions || rule.triggers.conditions.length === 0) {
        // 条件なしルールは警告
        if (rule.actions?.some(a => a.type === 'success' || a.type === 'failure')) {
          warnings.push(`Rule "${rule.id}" has success/failure without conditions`);
        }
      }
      if (!rule.actions || rule.actions.length === 0) {
        warnings.push(`Rule "${rule.id}" has no actions`);
      }
    }

    // 6. オブジェクト数のチェック
    if (project.assets.objects.length === 0) {
      errors.push('No game objects');
    }
    if (project.assets.objects.length > 25) {
      // 25以上はエラー（パフォーマンス問題の可能性）
      errors.push(`Too many objects (${project.assets.objects.length}), max is 25`);
    } else if (project.assets.objects.length > 15) {
      // 15-25は警告（推奨を超えているが許容可能）
      warnings.push(`Many objects (${project.assets.objects.length}), recommended max is 15`);
    }

    // 既存のissues配列（早期チェック分）もエラーとして扱う
    const allErrors = [...issues, ...errors];  // 早期チェック分 + 後半エラー
    const allIssues = [...allErrors, ...warnings];

    return {
      project,
      valid: allErrors.length === 0,  // 致命的エラーがなければOK
      issues: allIssues
    };
  }

  /**
   * プロジェクトのサイズを計算
   */
  calculateSize(project: GameProject): number {
    const json = JSON.stringify(project);
    return new TextEncoder().encode(json).length;
  }

  /**
   * プロジェクトのサマリーを生成
   */
  getSummary(project: GameProject): object {
    return {
      id: project.id,
      name: project.name,
      duration: project.settings?.duration?.seconds,
      objectCount: project.assets?.objects?.length || 0,
      ruleCount: project.script?.rules?.length || 0,
      counterCount: project.script?.counters?.length || 0,
      soundCount: project.assets?.audio?.se?.length || 0,
      hasBackground: !!project.assets?.background,
      hasBgm: !!project.assets?.audio?.bgm
    };
  }
}
