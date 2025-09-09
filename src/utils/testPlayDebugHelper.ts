// src/utils/testPlayDebugHelper.ts
// テストプレイ動作確認用デバッグヘルパー

export class TestPlayDebugHelper {
  private static logs: string[] = [];
  
  // デバッグログ収集
  static log(message: string, data?: any) {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    
    this.logs.push(logMessage);
    console.log(logMessage, data || '');
    
    // 最新50件のログのみ保持
    if (this.logs.length > 50) {
      this.logs = this.logs.slice(-50);
    }
  }
  
  // エラー詳細ログ
  static error(message: string, error?: any) {
    const errorDetails = {
      message: error?.message || 'Unknown error',
      stack: error?.stack?.split('\n').slice(0, 5).join('\n') || 'No stack trace',
      timestamp: new Date().toISOString()
    };
    
    this.log(`❌ ERROR: ${message}`, errorDetails);
    return errorDetails;
  }
  
  // 成功ログ
  static success(message: string, data?: any) {
    this.log(`✅ SUCCESS: ${message}`, data);
  }
  
  // 警告ログ
  static warn(message: string, data?: any) {
    this.log(`⚠️ WARNING: ${message}`, data);
  }
  
  // プロジェクトデータ検証
  static validateProject(project: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      // 基本構造チェック
      if (!project) {
        errors.push('プロジェクトデータがnullまたはundefined');
        return { isValid: false, errors };
      }
      
      if (!project.settings) {
        errors.push('project.settingsが存在しません');
      } else {
        if (!project.settings.name?.trim()) {
          errors.push('ゲーム名が設定されていません');
        }
      }
      
      if (!project.assets) {
        errors.push('project.assetsが存在しません');
      } else {
        const hasBackground = project.assets.background?.frames?.[0];
        const hasObjects = project.assets.objects?.length > 0;
        
        if (!hasBackground && !hasObjects) {
          errors.push('背景またはオブジェクトが最低1つ必要です');
        }
        
        // オブジェクトデータ検証
        if (project.assets.objects) {
          project.assets.objects.forEach((obj: any, index: number) => {
            if (!obj.id) errors.push(`オブジェクト[${index}]: IDが設定されていません`);
            if (!obj.name) errors.push(`オブジェクト[${index}]: 名前が設定されていません`);
            if (!obj.frames?.[0]?.dataUrl) errors.push(`オブジェクト[${index}]: 画像データが設定されていません`);
          });
        }
      }
      
      if (!project.script) {
        errors.push('project.scriptが存在しません');
      } else {
        if (!project.script.rules?.length) {
          errors.push('最低1つのルールが必要です');
        }
        
        // ルールデータ検証
        if (project.script.rules) {
          project.script.rules.forEach((rule: any, index: number) => {
            if (!rule.id) errors.push(`ルール[${index}]: IDが設定されていません`);
            if (!rule.targetObjectId) errors.push(`ルール[${index}]: 対象オブジェクトIDが設定されていません`);
            if (!rule.triggers?.conditions?.length) errors.push(`ルール[${index}]: 発動条件が設定されていません`);
            if (!rule.actions?.length) errors.push(`ルール[${index}]: アクションが設定されていません`);
          });
        }
      }
      
      const isValid = errors.length === 0;
      
      if (isValid) {
        this.success('プロジェクトデータ検証通過');
      } else {
        this.error('プロジェクトデータ検証失敗', { errors });
      }
      
      return { isValid, errors };
      
    } catch (error) {
      const errorMsg = 'プロジェクトデータ検証中にエラーが発生しました';
      this.error(errorMsg, error);
      errors.push(errorMsg);
      return { isValid: false, errors };
    }
  }
  
  // Canvas状態チェック
  static checkCanvasState(canvas: HTMLCanvasElement): boolean {
    try {
      if (!canvas) {
        this.error('Canvasエレメントがnull');
        return false;
      }
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        this.error('Canvas 2D contextを取得できません');
        return false;
      }
      
      if (canvas.width <= 0 || canvas.height <= 0) {
        this.error('Canvasサイズが不正', { width: canvas.width, height: canvas.height });
        return false;
      }
      
      this.success('Canvas状態チェック通過', { 
        width: canvas.width, 
        height: canvas.height,
        contextType: ctx.constructor.name 
      });
      
      return true;
    } catch (error) {
      this.error('Canvas状態チェック中にエラー', error);
      return false;
    }
  }
  
  // ゲーム実行前チェック
  static preGameCheck(project: any, canvas: HTMLCanvasElement): boolean {
    this.log('🔍 ゲーム実行前チェック開始');
    
    const projectValidation = this.validateProject(project);
    const canvasState = this.checkCanvasState(canvas);
    
    const allGood = projectValidation.isValid && canvasState;
    
    if (allGood) {
      this.success('ゲーム実行前チェック全て通過');
    } else {
      this.error('ゲーム実行前チェックで問題を検出');
    }
    
    return allGood;
  }
  
  // ゲーム実行結果分析
  static analyzeGameResult(result: any): void {
    this.log('📊 ゲーム実行結果分析');
    
    if (!result) {
      this.error('ゲーム実行結果がnull');
      return;
    }
    
    const analysis = {
      success: result.success || false,
      completed: result.completed || false,
      timeElapsed: result.timeElapsed || 0,
      score: result.score || 0,
      errorCount: result.errors?.length || 0,
      warningCount: result.warnings?.length || 0,
      objectCount: result.performance?.objectCount || 0,
      ruleExecutions: result.performance?.ruleExecutions || 0
    };
    
    if (result.success && result.completed) {
      this.success('ゲーム実行成功', analysis);
    } else if (result.success && !result.completed) {
      this.warn('ゲーム実行は成功したが完了していません', analysis);
    } else {
      this.error('ゲーム実行失敗', analysis);
      
      if (result.errors?.length) {
        result.errors.forEach((error: string, index: number) => {
          this.error(`エラー[${index}]`, error);
        });
      }
    }
    
    if (result.warnings?.length) {
      result.warnings.forEach((warning: string, index: number) => {
        this.warn(`警告[${index}]`, warning);
      });
    }
  }
  
  // 全ログ出力
  static dumpLogs(): string[] {
    return [...this.logs];
  }
  
  // ログクリア
  static clearLogs(): void {
    this.logs = [];
    this.log('🧹 ログクリア完了');
  }
  
  // テストプレイ完全実行とログ出力
  static async runFullTest(
    project: any, 
    bridge: any, 
    targetElement?: HTMLElement
  ): Promise<{ success: boolean; logs: string[]; result?: any }> {
    this.clearLogs();
    this.log('🎮 フルテストプレイ実行開始');
    
    try {
      // 事前チェック
      const canvas = document.createElement('canvas');
      canvas.width = 360;
      canvas.height = 640;
      
      if (!this.preGameCheck(project, canvas)) {
        return { success: false, logs: this.dumpLogs() };
      }
      
      // クイックテストプレイ実行
      this.log('🧪 クイックテストプレイ開始');
      const result = await bridge.quickTestPlay(project);
      
      this.analyzeGameResult(result);
      
      // UI表示テスト（オプション）
      if (targetElement && result.success) {
        this.log('🖥️ UI表示テスト開始');
        await bridge.launchFullGame(project, targetElement, (fullResult: any) => {
          this.log('🏁 フルゲーム終了', fullResult);
        });
      }
      
      return { 
        success: result.success || false, 
        logs: this.dumpLogs(),
        result 
      };
      
    } catch (error) {
      this.error('フルテストプレイ実行中にエラー', error);
      return { success: false, logs: this.dumpLogs() };
    }
  }
}

// ブラウザ環境でのグローバル公開（デバッグ用）
if (typeof window !== 'undefined') {
  (window as any).TestPlayDebugHelper = TestPlayDebugHelper;
}

export default TestPlayDebugHelper;