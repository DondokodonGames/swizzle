/**
 * GameProjectCopier.ts - ゲームプロジェクトコピーサービス
 * 🔧 audio プロパティエラー修正版（2箇所修正）
 * 
 * 機能:
 * - ゲームプロジェクト全体のディープコピー
 * - ルール・スクリプトはそのまま保持
 * - アセット（画像）のみクリア
 * - 音声データはコピー
 * - 新しいIDとメタデータの生成
 */

import { GameProject } from '../../types/editor/GameProject';
import { DEFAULT_PROJECT_METADATA } from '../../types/editor/GameProject';

export class GameProjectCopier {
  private static instance: GameProjectCopier | null = null;

  private constructor() {}

  /**
   * シングルトンインスタンス取得
   */
  public static getInstance(): GameProjectCopier {
    if (!GameProjectCopier.instance) {
      GameProjectCopier.instance = new GameProjectCopier();
    }
    return GameProjectCopier.instance;
  }

  /**
   * ゲームプロジェクトをコピー（アセット以外）
   * 
   * @param sourceProject コピー元のGameProject
   * @returns コピーされた新しいGameProject
   */
  public copyProject(sourceProject: GameProject): GameProject {
    console.log('🔄 ゲームプロジェクトをコピー中:', sourceProject.name);

    // データ構造の検証
    if (!sourceProject) {
      throw new Error('コピー元プロジェクトが存在しません');
    }
    
    if (!sourceProject.script) {
      throw new Error('スクリプトデータが存在しません');
    }

    // 1. ディープコピー（完全なクローン作成）
    const copiedProject: GameProject = JSON.parse(JSON.stringify(sourceProject));

    // 2. 新しいIDを付与
    copiedProject.id = crypto.randomUUID();
    copiedProject.name = `${sourceProject.name} のコピー`;
    
    // 3. 日時情報を更新
    const now = new Date().toISOString();
    copiedProject.createdAt = now;
    copiedProject.lastModified = now;
    copiedProject.status = 'draft';

    // 4. アセットをクリア（画像だけ差し替えるため）
    const audioSize = this.calculateAudioSize(sourceProject);
    
    copiedProject.assets = {
      background: null,
      objects: [],
      texts: [],
      audio: sourceProject.assets && sourceProject.assets.audio ? sourceProject.assets.audio : { bgm: null, se: [] }, // 🎵 音声はコピー
      statistics: {
        totalImageSize: 0,
        totalAudioSize: audioSize,
        totalSize: audioSize,
        usedSlots: {
          background: 0,
          objects: 0,
          texts: 0,
          bgm: (sourceProject.assets && sourceProject.assets.audio && sourceProject.assets.audio.bgm) ? 1 : 0,
          se: (sourceProject.assets && sourceProject.assets.audio && sourceProject.assets.audio.se) ? sourceProject.assets.audio.se.length : 0
        },
        limitations: {
          isNearImageLimit: false,
          isNearAudioLimit: false,
          isNearTotalLimit: false,
          hasViolations: false
        }
      },
      lastModified: now
    };

    // 5. スクリプト（ルール）はそのままコピー（既にディープコピー済み）
    // ✅ これが重要！ルールはそのまま使う
    const rulesCount = copiedProject.script.rules ? copiedProject.script.rules.length : 0;
    const countersCount = copiedProject.script.counters ? copiedProject.script.counters.length : 0;
    const successConditionsCount = copiedProject.script.successConditions ? copiedProject.script.successConditions.length : 0;
    
    console.log('✅ ルールをコピー:', rulesCount, '個');
    console.log('✅ カウンターをコピー:', countersCount, '個');
    console.log('✅ 成功条件をコピー:', successConditionsCount, '個');

    // 6. 設定を初期化
    copiedProject.settings = {
      ...sourceProject.settings,
      name: `${sourceProject.settings.name} のコピー`,
      publishing: {
        ...sourceProject.settings.publishing,
        isPublished: false,
        publishedAt: undefined,
        visibility: 'private',
        allowComments: true,
        allowRemix: false
      }
    };

    // 7. メタデータをクリア
    copiedProject.metadata = {
      ...DEFAULT_PROJECT_METADATA,
      statistics: {
        totalEditTime: 0,
        saveCount: 0,
        testPlayCount: 0,
        publishCount: 0
      },
      usage: {
        lastOpened: now,
        totalOpenCount: 1,
        averageSessionTime: 0
      },
      performance: {
        lastBuildTime: 0,
        averageFPS: 60,
        memoryUsage: 0
      }
    };

    // データベース関連メタデータをクリア
    if (copiedProject.metadata) {
      copiedProject.metadata.databaseId = undefined;
      copiedProject.metadata.lastSyncedAt = undefined;
    }

    // 8. エディター状態をリセット
    if (copiedProject.editorState) {
      copiedProject.editorState.lastSaved = now;
      copiedProject.editorState.tabStates.settings.lastTestResult = null;
    }

    // 9. バージョン履歴をクリア
    copiedProject.versionHistory = [];

    // 10. 総容量を再計算
    copiedProject.totalSize = audioSize;

    // 11. 作成者情報を更新（元の作成者情報は保持しない）
    copiedProject.creator = {
      userId: undefined,
      username: undefined,
      isAnonymous: true
    };

    console.log('✅ コピー完了:', {
      newId: copiedProject.id,
      newName: copiedProject.name,
      rulesCount: copiedProject.script.rules ? copiedProject.script.rules.length : 0,
      countersCount: copiedProject.script.counters ? copiedProject.script.counters.length : 0,
      totalSize: copiedProject.totalSize
    });

    return copiedProject;
  }

  /**
   * 音声データのサイズを計算
   * @private
   */
  private calculateAudioSize(project: GameProject): number {
    let totalAudioSize = 0;

    // データ構造の存在確認
    if (!project.assets || !project.assets.audio) {
      return 0;
    }

    // 🔧 修正箇所1: BGMのサイズ（184-186行目）
    // ✅ 修正: オプショナルチェーン追加
    if (project.assets.audio?.bgm?.dataUrl) {
      totalAudioSize += this.estimateBase64Size(project.assets.audio.bgm.dataUrl);
    }

    // 🔧 修正箇所2: SEのサイズ（189行目）
    // ✅ 修正: オプショナルチェーン追加
    if (project.assets.audio?.se && Array.isArray(project.assets.audio.se)) {
      for (const se of project.assets.audio.se) {
        if (se && se.dataUrl) {
          totalAudioSize += this.estimateBase64Size(se.dataUrl);
        }
      }
    }

    return totalAudioSize;
  }

  /**
   * Base64データURLのサイズを推定
   * @private
   */
  private estimateBase64Size(dataUrl: string): number {
    if (!dataUrl || dataUrl.indexOf('base64,') === -1) {
      return 0;
    }

    // "data:audio/mp3;base64," の部分を除去
    const base64Data = dataUrl.split('base64,')[1];
    if (!base64Data) {
      return 0;
    }

    // Base64は約1.33倍のサイズになるため、元のサイズに戻す
    const actualSize = (base64Data.length * 3) / 4;
    
    // パディング（=）を考慮
    const padding = (base64Data.match(/=/g) || []).length;
    return Math.floor(actualSize - padding);
  }

  /**
   * プロジェクトがコピー可能かチェック
   * @param project チェック対象のGameProject
   * @returns コピー可能な場合true
   */
  public canCopy(project: GameProject): boolean {
    // データ構造の安全性チェック
    if (!project) {
      console.warn('⚠️ プロジェクトがnullまたはundefinedです');
      return false;
    }
    
    if (!project.script) {
      console.warn('⚠️ project.scriptが存在しません');
      return false;
    }
    
    if (!project.script.rules) {
      console.warn('⚠️ project.script.rulesが存在しません');
      return false;
    }
    
    if (!Array.isArray(project.script.rules)) {
      console.warn('⚠️ project.script.rulesが配列ではありません');
      return false;
    }
    
    // ルールが1つ以上存在するプロジェクトのみコピー可能
    const hasRules = project.script.rules.length > 0;
    
    if (!hasRules) {
      console.warn('⚠️ ルールが0個です - コピーできません');
    }
    
    return hasRules;
  }

  /**
   * コピーされたプロジェクトかどうか判定
   * （エディター画面でガイダンス表示用）
   */
  public isCopiedProject(project: GameProject): boolean {
    if (!project) return false;
    if (!project.assets) return false;
    if (!project.script || !project.script.rules) return false;
    
    return (
      project.status === 'draft' &&
      !project.assets.background &&
      (!project.assets.objects || project.assets.objects.length === 0) &&
      project.script.rules.length > 0
    );
  }

  /**
   * プロジェクトコピー情報を取得
   */
  public getCopyInfo(project: GameProject): {
    isCopied: boolean;
    rulesCount: number;
    countersCount: number;
    needsAssets: string[];
  } {
    const isCopied = this.isCopiedProject(project);
    
    const needsAssets: string[] = [];
    if (!project.assets || !project.assets.background) needsAssets.push('背景');
    if (!project.assets || !project.assets.objects || project.assets.objects.length === 0) needsAssets.push('オブジェクト');

    const rulesCount = (project.script && project.script.rules) ? project.script.rules.length : 0;
    const countersCount = (project.script && project.script.counters) ? project.script.counters.length : 0;

    return {
      isCopied,
      rulesCount,
      countersCount,
      needsAssets
    };
  }
}