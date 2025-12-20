/**
 * Step 6: FinalAssembler
 *
 * 全素材を組み合わせてGameProjectを完成
 * ファイル破損を防止する整合性チェック
 */

import { GameProject } from '../../types/editor/GameProject';
import {
  GameConcept,
  LogicGeneratorOutput,
  GeneratedAssets,
  AssemblyResult
} from './types';

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

    const project: GameProject = {
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
          frames: assets.background.frames,
          createdAt: now,
          lastModified: now
        } : null,
        objects: assets.objects.map(obj => ({
          id: obj.id,
          name: obj.name,
          frames: obj.frames,
          createdAt: now,
          lastModified: now
        })),
        texts: [],
        audio: {
          bgm: assets.bgm ? {
            id: assets.bgm.id,
            name: assets.bgm.name,
            data: assets.bgm.data,
            createdAt: now,
            lastModified: now
          } : null,
          se: assets.sounds.map(sound => ({
            id: sound.id,
            name: sound.name,
            data: sound.data,
            createdAt: now,
            lastModified: now
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
        layout: {
          objects: logicOutput.script.layout.objects.map(obj => ({
            objectId: obj.objectId,
            position: obj.position,
            scale: obj.scale
          })),
          texts: [],
          stageArea: {
            x: 0,
            y: 0,
            width: 1,
            height: 1
          }
        },
        counters: logicOutput.script.counters,
        flags: [],
        rules: logicOutput.script.rules.map(rule => ({
          id: rule.id,
          name: rule.name || rule.id,
          enabled: true,
          targetObjectId: rule.targetObjectId,
          triggers: rule.triggers,
          actions: rule.actions || []
        })),
        lastModified: now
      },
      settings: {
        duration: {
          type: 'fixed',
          seconds: concept.duration
        },
        score: {
          enabled: true,
          initialValue: 0
        },
        timer: {
          visible: true,
          position: 'top-right'
        },
        lastModified: now
      },
      metadata: {
        generatedAt: now,
        concept: concept,
        assetPlan: logicOutput.assetPlan
      }
    };

    // 3. JSON.stringify可能か確認
    try {
      JSON.stringify(project);
    } catch (e) {
      issues.push(`JSON serialization failed: ${e}`);
    }

    // 4. 必須フィールドの存在確認
    if (!project.assets) {
      issues.push('Missing assets');
    }
    if (!project.script?.rules || project.script.rules.length === 0) {
      issues.push('No rules defined');
    }
    if (!project.settings?.duration) {
      issues.push('Missing duration setting');
    }

    // 5. ルールの整合性確認
    for (const rule of project.script.rules) {
      if (!rule.triggers?.conditions || rule.triggers.conditions.length === 0) {
        // 条件なしルールは警告
        if (rule.actions?.some(a => a.type === 'success' || a.type === 'failure')) {
          issues.push(`Rule "${rule.id}" has success/failure without conditions`);
        }
      }
      if (!rule.actions || rule.actions.length === 0) {
        issues.push(`Rule "${rule.id}" has no actions`);
      }
    }

    // 6. オブジェクト数のチェック
    if (project.assets.objects.length === 0) {
      issues.push('No game objects');
    }
    if (project.assets.objects.length > 15) {
      issues.push(`Too many objects (${project.assets.objects.length}), max recommended is 15`);
    }

    return {
      project,
      valid: issues.length === 0,
      issues
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
