import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GameProject } from '../../../types/editor/GameProject';
import { GameSettings } from '../../../types/editor/GameProject';
// 🔧 追加: EditorGameBridge統合
import EditorGameBridge, { GameExecutionResult } from '../../../services/editor/EditorGameBridge';

// 🔧 Props型定義修正: onTestPlay と onSave を追加
interface SettingsTabProps {
  project: GameProject;
  onProjectUpdate: (project: GameProject) => void;
  onTestPlay?: () => void;  // 🔧 追加: 外部テストプレイ処理
  onSave?: () => void;      // 🔧 追加: 外部保存処理
}

// ゲーム時間のプリセット（無制限追加）
const DURATION_PRESETS = [
  { value: 5, label: '5秒', description: 'サクッと', emoji: '⚡', color: 'bg-yellow-100 border-yellow-300' },
  { value: 10, label: '10秒', description: 'ちょうどいい', emoji: '⏰', color: 'bg-blue-100 border-blue-300' },
  { value: 15, label: '15秒', description: 'じっくり', emoji: '🎯', color: 'bg-green-100 border-green-300' },
  { value: 30, label: '30秒', description: 'たっぷり', emoji: '🏃', color: 'bg-purple-100 border-purple-300' },
  { value: null, label: '無制限', description: '自由に', emoji: '∞', color: 'bg-gray-100 border-gray-300' }, // 🔧 追加
] as const;

// ゲームスピード設定（難易度の代替）
const GAME_SPEED_LEVELS = [
  { value: 0.7, label: 'スロー', description: 'ゆっくり楽しむ', emoji: '🐌', color: 'bg-green-100 border-green-300' },
  { value: 1.0, label: '標準', description: 'ちょうどいい速さ', emoji: '🚶', color: 'bg-blue-100 border-blue-300' },
  { value: 1.3, label: '高速', description: '挑戦的な速さ', emoji: '🏃', color: 'bg-yellow-100 border-yellow-300' },
  { value: 1.6, label: '超高速', description: '上級者向け', emoji: '⚡', color: 'bg-red-100 border-red-300' },
] as const;

// 🔧 Props受け取り修正
export const SettingsTab: React.FC<SettingsTabProps> = ({ 
  project, 
  onProjectUpdate, 
  onTestPlay,  // 🔧 追加
  onSave       // 🔧 追加
}) => {
  const [isTestPlaying, setIsTestPlaying] = useState(false);
  const [testPlayResult, setTestPlayResult] = useState<'success' | 'failure' | null>(null);
  const [testPlayDetails, setTestPlayDetails] = useState<GameExecutionResult | null>(null); // 🔧 追加
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [generateThumbnail, setGenerateThumbnail] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // 🔧 追加
  const [showFullGame, setShowFullGame] = useState(false); // 🔧 追加: フルゲーム表示
  const gameTestRef = useRef<HTMLDivElement>(null);
  const fullGameRef = useRef<HTMLDivElement>(null); // 🔧 追加

  // 🔧 EditorGameBridge インスタンス
  const bridgeRef = useRef<EditorGameBridge | null>(null);
  
  useEffect(() => {
    bridgeRef.current = EditorGameBridge.getInstance();
    return () => {
      // クリーンアップ
      bridgeRef.current?.reset();
    };
  }, []);

  // プロジェクト更新ヘルパー
  const updateProject = useCallback((updates: Partial<GameProject>) => {
    onProjectUpdate({ ...project, ...updates });
  }, [project, onProjectUpdate]);

  // 設定更新ヘルパー
  const updateSettings = useCallback((updates: Partial<GameSettings>) => {
    const newSettings = { ...project.settings, ...updates };
    updateProject({ settings: newSettings });
  }, [project.settings, updateProject]);

  // ゲーム名の更新
  const handleGameNameChange = useCallback((name: string) => {
    updateSettings({ name: name.slice(0, 50) });
    updateProject({ name: name.slice(0, 50) }); // プロジェクト名も同期
  }, [updateSettings, updateProject]);

  // ゲーム説明の更新
  const handleDescriptionChange = useCallback((description: string) => {
    updateSettings({ description: description.slice(0, 200) });
  }, [updateSettings]);

  // 🔧 ゲーム時間設定の更新（無制限対応）
  const handleDurationChange = useCallback((seconds: number | null) => {
    updateSettings({
      duration: seconds === null ? {
        type: 'unlimited',
        seconds: undefined,
        maxSeconds: undefined
      } : {
        type: 'fixed',
        seconds: seconds as 5 | 10 | 15 | 20 | 30,
        maxSeconds: undefined
      }
    });
  }, [updateSettings]);

  // 🔧 ゲームスピード設定の更新（難易度の代替）
  const handleGameSpeedChange = useCallback((speed: number) => {
    updateProject({ 
      metadata: {
        ...project.metadata,
        gameSpeed: speed
      }
    });
  }, [updateProject, project.metadata]);

  // 🔧 強化されたテストプレイ機能（EditorGameBridge統合）
  const handleTestPlay = useCallback(async () => {
    console.log('🧪 テストプレイ開始:', project.name);
    setIsTestPlaying(true);
    setTestPlayResult(null);
    setTestPlayDetails(null);
    
    try {
      // プロジェクトバリデーション
      const validationErrors: string[] = [];
      
      if (!project.settings.name?.trim()) {
        validationErrors.push('ゲーム名を入力してください');
      }
      
      if (!project.assets.objects.length && !project.assets.background) {
        validationErrors.push('最低1つのオブジェクトまたは背景を追加してください');
      }
      
      if (!project.script.rules.length) {
        validationErrors.push('最低1つのルールを設定してください');
      }
      
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join('\n'));
      }

      // 🔧 EditorGameBridge を使用したテストプレイ実行
      const bridge = bridgeRef.current;
      if (!bridge) {
        throw new Error('ゲームエンジンが初期化されていません');
      }

      console.log('🔄 EditorGameBridge でテストプレイ実行...');
      const result = await bridge.quickTestPlay(project);
      
      console.log('📊 テストプレイ結果:', result);
      setTestPlayDetails(result);
      
      if (result.success && result.completed) {
        setTestPlayResult('success');
        console.log('✅ テストプレイ成功:', {
          score: result.score,
          timeElapsed: result.timeElapsed,
          objectsInteracted: result.finalState?.objectsInteracted?.length || 0,
          rulesTriggered: result.finalState?.rulesTriggered?.length || 0
        });
      } else {
        setTestPlayResult('failure');
        console.warn('⚠️ テストプレイ失敗:', {
          errors: result.errors,
          warnings: result.warnings
        });
        if (result.errors.length > 0) {
          alert(`テストプレイで問題が発生しました:\n${result.errors.join('\n')}`);
        }
      }
      
      // 統計更新
      updateProject({
        metadata: {
          ...project.metadata,
          statistics: {
            ...project.metadata.statistics,
            testPlayCount: (project.metadata.statistics.testPlayCount || 0) + 1
          }
        }
      });
      
    } catch (error) {
      console.error('❌ テストプレイエラー:', error);
      setTestPlayResult('failure');
      setTestPlayDetails({
        success: false,
        timeElapsed: 0,
        completed: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        performance: { averageFPS: 0, memoryUsage: 0, renderTime: 0, objectCount: 0, ruleExecutions: 0 }
      });
      alert(`テストプレイエラー:\n${error instanceof Error ? error.message : 'テストプレイに失敗しました'}`);
    } finally {
      setIsTestPlaying(false);
    }
  }, [project, updateProject]);

  // 🔧 修正: フルゲーム実行機能（DOM要素待機対応版）
  const handleFullGamePlay = useCallback(async () => {
    console.log('🎮 フルゲーム実行開始:', project.name);
    
    // 🔧 修正: bridgeRef のみをチェック（fullGameRef は後で確認）
    if (!bridgeRef.current) {
      alert('ゲーム実行環境が準備されていません');
      return;
    }
    
    try {
      // 🔧 修正: まず UI を表示状態にする
      setShowFullGame(true);
      
      // 🔧 修正: DOM要素が作成されるまで待機
      await new Promise<void>((resolve) => {
        const checkElement = () => {
          if (fullGameRef.current) {
            resolve();
          } else {
            // requestAnimationFrame で次のレンダリングサイクルを待つ
            requestAnimationFrame(checkElement);
          }
        };
        checkElement();
      });
      
      // 🔧 修正: 再度確認（安全措置）
      if (!fullGameRef.current) {
        throw new Error('DOM要素の作成に失敗しました');
      }
      
      console.log('✅ DOM要素準備完了、ゲーム実行開始');
      
      await bridgeRef.current.launchFullGame(
        project,
        fullGameRef.current,
        (result) => {
          console.log('🏁 フルゲーム終了:', result);
          setShowFullGame(false);
          
          if (result.success) {
            alert(`ゲーム完了！\nスコア: ${result.score || 0}\n時間: ${result.timeElapsed.toFixed(1)}秒`);
          } else {
            alert(`ゲームエラー:\n${result.errors.join('\n')}`);
          }
        }
      );
      
    } catch (error) {
      console.error('❌ フルゲーム実行エラー:', error);
      setShowFullGame(false);
      alert(`フルゲーム実行エラー:\n${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [project]);

  // 🔧 強化された保存機能
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    
    try {
      if (onSave) {
        await onSave();
      } else {
        // フォールバック保存処理
        const projectData = {
          ...project,
          lastModified: new Date().toISOString(),
          metadata: {
            ...project.metadata,
            statistics: {
              ...project.metadata.statistics,
              saveCount: (project.metadata.statistics.saveCount || 0) + 1
            }
          }
        };
        
        const savedProjects = JSON.parse(localStorage.getItem('editor_projects') || '[]');
        const existingIndex = savedProjects.findIndex((p: any) => p.id === project.id);
        
        if (existingIndex !== -1) {
          savedProjects[existingIndex] = projectData;
        } else {
          savedProjects.push(projectData);
        }
        
        localStorage.setItem('editor_projects', JSON.stringify(savedProjects));
        console.log('💾 プロジェクト保存完了:', project.name);
      }
    } catch (error) {
      console.error('保存エラー:', error);
      alert(`保存エラー:\n${error instanceof Error ? error.message : '保存に失敗しました'}`);
    } finally {
      setIsSaving(false);
    }
  }, [project, onSave]);

  // サムネイル自動生成（既存のまま）
  const handleGenerateThumbnail = useCallback(async () => {
    setGenerateThumbnail(true);
    
    try {
      console.log('サムネイル生成開始');
      
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Canvas context を取得できません');
      }
      
      // 背景描画
      if (project.assets.background?.frames?.[0]?.dataUrl) {
        const bgImg = new Image();
        await new Promise((resolve, reject) => {
          bgImg.onload = resolve;
          bgImg.onerror = reject;
          bgImg.src = project.assets.background!.frames[0].dataUrl;
        });
        ctx.drawImage(bgImg, 0, 0, 300, 400);
      } else {
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, '#3B82F6');
        gradient.addColorStop(1, '#1D4ED8');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 300, 400);
      }
      
      // ゲーム名表示
      ctx.fillStyle = 'white';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText(project.settings.name || 'My Game', 150, 50);
      ctx.shadowBlur = 0;
      
      // 統計情報
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(20, 300, 260, 80);
      
      ctx.fillStyle = '#333333';
      ctx.font = '16px Arial';
      ctx.fillText(`${project.assets.objects.length} Objects`, 150, 325);
      ctx.fillText(`${project.script.rules.length} Rules`, 150, 345);
      const duration = project.settings.duration?.seconds 
        ? `${project.settings.duration.seconds}s` 
        : 'Unlimited';
      ctx.fillText(duration, 150, 365);
      
      const thumbnailDataUrl = canvas.toDataURL('image/png');
      
      updateSettings({
        preview: {
          ...project.settings.preview,
          thumbnailDataUrl
        }
      });
      
      console.log('サムネイル生成完了');
    } catch (error) {
      console.error('サムネイル生成エラー:', error);
      alert(`サムネイル生成エラー:\n${error instanceof Error ? error.message : 'サムネイル生成に失敗しました'}`);
    } finally {
      setGenerateThumbnail(false);
    }
  }, [project, updateSettings]);

  // プロジェクト公開（既存のまま）
  const handlePublish = useCallback(async () => {
    setIsPublishing(true);
    setPublishError(null);
    
    try {
      console.log('公開処理開始');
      
      const errors: string[] = [];
      
      if (!project.settings.name?.trim()) {
        errors.push('ゲーム名を入力してください');
      }
      
      if (!project.assets.objects.length && !project.assets.background) {
        errors.push('最低1つのオブジェクトまたは背景を追加してください');
      }
      
      if (errors.length > 0) {
        throw new Error(errors.join('\n'));
      }
      
      const projectData = {
        ...project,
        publishedAt: new Date().toISOString(),
        version: project.version ? `${project.version}.1` : '1.0.0'
      };
      
      const projectId = project.id || `project_${Date.now()}`;
      const savedProjects = JSON.parse(localStorage.getItem('savedProjects') || '[]');
      
      const existingIndex = savedProjects.findIndex((p: any) => p.id === projectId);
      if (existingIndex !== -1) {
        savedProjects[existingIndex] = projectData;
      } else {
        savedProjects.push(projectData);
      }
      
      localStorage.setItem('savedProjects', JSON.stringify(savedProjects));
      
      const publishedGames = JSON.parse(localStorage.getItem('publishedGames') || '[]');
      const publishedGame = {
        id: projectId,
        name: project.settings.name,
        description: project.settings.description || '',
        thumbnailUrl: project.settings.preview?.thumbnailDataUrl || '',
        author: 'Current User',
        publishedAt: new Date().toISOString(),
        stats: { plays: 0, likes: 0, shares: 0 }
      };
      
      const existingPublishedIndex = publishedGames.findIndex((g: any) => g.id === projectId);
      if (existingPublishedIndex !== -1) {
        publishedGames[existingPublishedIndex] = publishedGame;
      } else {
        publishedGames.push(publishedGame);
      }
      
      localStorage.setItem('publishedGames', JSON.stringify(publishedGames));
      
      updateSettings({
        publishing: {
          ...project.settings.publishing,
          isPublished: true,
          publishedAt: new Date().toISOString(),
          visibility: project.settings.publishing?.visibility || 'public'
        }
      });
      
      updateProject({ 
        status: 'published' as const,
        id: projectId,
        version: projectData.version
      });
      
      console.log('公開完了:', { projectId, name: project.settings.name });
      alert(`ゲーム "${project.settings.name}" を公開しました！`);
      
    } catch (error) {
      console.error('公開エラー:', error);
      setPublishError(error instanceof Error ? error.message : '公開に失敗しました');
    } finally {
      setIsPublishing(false);
    }
  }, [project, updateSettings, updateProject]);

  // エクスポート機能（既存のまま）
  const handleExport = useCallback(async () => {
    try {
      console.log('エクスポート開始');
      
      const exportData = {
        ...project,
        exportedAt: new Date().toISOString(),
        exportSettings: {
          format: 'json',
          version: '1.0.0',
          platform: 'web'
        }
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.settings.name || 'my-game'}.json`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('エクスポート完了');
      alert(`ゲーム "${project.settings.name}" をエクスポートしました！`);
      
    } catch (error) {
      console.error('エクスポートエラー:', error);
      alert(`エクスポートエラー:\n${error instanceof Error ? error.message : 'エクスポートに失敗しました'}`);
    }
  }, [project]);

  return (
    <div className="settings-tab h-full overflow-auto">
      <div className="max-w-4xl mx-auto p-6">
        
        {/* ゲーム基本情報 */}
        <section className="mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            🎮 ゲーム情報
          </h3>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            {/* ゲーム名 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ゲーム名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={project.settings.name || ''}
                onChange={(e) => handleGameNameChange(e.target.value)}
                placeholder="素晴らしいゲーム名を入力してください"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={50}
              />
              <div className="text-right text-sm text-gray-500 mt-1">
                {(project.settings.name || '').length}/50
              </div>
            </div>
            
            {/* ゲーム説明 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ゲーム説明
              </label>
              <textarea
                value={project.settings.description || ''}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="このゲームの楽しさを説明してください"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                maxLength={200}
              />
              <div className="text-right text-sm text-gray-500 mt-1">
                {(project.settings.description || '').length}/200
              </div>
            </div>
          </div>
        </section>

        {/* ゲーム設定 */}
        <section className="mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            ⚙️ ゲーム設定
          </h3>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {/* 🔧 ゲーム時間設定（無制限追加） */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                ゲーム時間
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {DURATION_PRESETS.map((preset) => (
                  <button
                    key={preset.value || 'unlimited'}
                    onClick={() => handleDurationChange(preset.value)}
                    className={`p-4 border-2 rounded-lg text-center transition-all hover:scale-105 ${
                      (preset.value === null && project.settings.duration?.type === 'unlimited') ||
                      (preset.value !== null && project.settings.duration?.seconds === preset.value)
                        ? preset.color + ' border-current shadow-lg'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{preset.emoji}</div>
                    <div className="font-semibold">{preset.label}</div>
                    <div className="text-xs text-gray-600">{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* 🔧 ゲームスピード設定（難易度の代替） */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                ゲームスピード（挑戦レベル）
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {GAME_SPEED_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => handleGameSpeedChange(level.value)}
                    className={`p-4 border-2 rounded-lg text-center transition-all hover:scale-105 ${
                      (project.metadata?.gameSpeed || 1.0) === level.value
                        ? level.color + ' border-current shadow-lg'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{level.emoji}</div>
                    <div className="font-semibold">{level.label}</div>
                    <div className="text-xs text-gray-600">{level.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 🔧 強化: テストプレイセクション */}
        <section className="mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            🎯 テストプレイ
          </h3>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex flex-col items-center text-center">
              {!isTestPlaying && testPlayResult === null && (
                <>
                  <div className="text-6xl mb-4">🕹️</div>
                  <h4 className="text-lg font-medium text-gray-800 mb-2">
                    ゲームをテストしてみましょう
                  </h4>
                  <p className="text-gray-600 mb-6">
                    作成したゲームが正しく動作するか確認できます
                  </p>
                  <div className="flex gap-4">
                    <button
                      onClick={handleTestPlay}
                      disabled={!project.settings.name || isTestPlaying}
                      className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-medium transition-colors"
                    >
                      🧪 クイックテスト (3秒)
                    </button>
                    <button
                      onClick={handleFullGamePlay}
                      disabled={!project.settings.name || isTestPlaying}
                      className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-medium transition-colors"
                    >
                      ▶️ フルゲーム実行
                    </button>
                  </div>
                </>
              )}
              
              {isTestPlaying && (
                <>
                  <div className="text-6xl mb-4 animate-bounce">🎮</div>
                  <h4 className="text-lg font-medium text-gray-800 mb-2">
                    テストプレイ中...
                  </h4>
                  <p className="text-gray-600">ゲームの動作を確認しています</p>
                  <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
                  </div>
                </>
              )}
              
              {testPlayResult === 'success' && testPlayDetails && (
                <>
                  <div className="text-6xl mb-4">🎉</div>
                  <h4 className="text-lg font-medium text-green-600 mb-2">
                    テスト成功！
                  </h4>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 max-w-md">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{testPlayDetails.score || 0}</div>
                        <div className="text-green-700">スコア</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{testPlayDetails.timeElapsed.toFixed(1)}s</div>
                        <div className="text-green-700">プレイ時間</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{testPlayDetails.finalState?.objectsInteracted?.length || 0}</div>
                        <div className="text-green-700">操作回数</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{testPlayDetails.finalState?.rulesTriggered?.length || 0}</div>
                        <div className="text-green-700">ルール実行</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setTestPlayResult(null)}
                      className="text-blue-500 hover:text-blue-700 font-medium"
                    >
                      もう一度テスト
                    </button>
                    <button
                      onClick={handleFullGamePlay}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium"
                    >
                      フルゲーム実行
                    </button>
                  </div>
                </>
              )}
              
              {testPlayResult === 'failure' && testPlayDetails && (
                <>
                  <div className="text-6xl mb-4">⚠️</div>
                  <h4 className="text-lg font-medium text-red-600 mb-2">
                    テストで問題発見
                  </h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 max-w-md">
                    <div className="text-sm text-red-700">
                      <strong>エラー:</strong>
                      <ul className="list-disc list-inside mt-2">
                        {testPlayDetails.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                      {testPlayDetails.warnings.length > 0 && (
                        <>
                          <strong className="block mt-3">警告:</strong>
                          <ul className="list-disc list-inside mt-2">
                            {testPlayDetails.warnings.map((warning, index) => (
                              <li key={index}>{warning}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setTestPlayResult(null)}
                      className="text-blue-500 hover:text-blue-700 font-medium"
                    >
                      もう一度テスト
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* 🔧 フルゲーム表示エリア */}
        {showFullGame && (
          <section className="mb-8">
            <div className="bg-black rounded-lg border border-gray-400 p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-white">🎮 ゲーム実行中</h4>
                <button
                  onClick={() => setShowFullGame(false)}
                  className="text-white hover:text-gray-300 px-3 py-1 rounded bg-red-600 hover:bg-red-700"
                >
                  ✕ 終了
                </button>
              </div>
              <div
                ref={fullGameRef}
                className="w-full flex justify-center"
                style={{ minHeight: '400px' }}
              >
                {/* ゲームキャンバスがここに挿入される */}
              </div>
            </div>
          </section>
        )}

        {/* サムネイル設定 */}
        <section className="mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            📸 サムネイル
          </h3>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-6">
              <div className="flex-shrink-0">
                <div className="w-32 h-40 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                  {project.settings.preview?.thumbnailDataUrl ? (
                    <img
                      src={project.settings.preview.thumbnailDataUrl}
                      alt="Game Thumbnail"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-gray-500">
                      <div className="text-2xl mb-1">📸</div>
                      <div className="text-xs">No Thumbnail</div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex-1">
                <h4 className="font-medium text-gray-800 mb-2">ゲームサムネイル</h4>
                <p className="text-sm text-gray-600 mb-4">
                  ゲームの魅力を伝えるサムネイルを設定します
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={handleGenerateThumbnail}
                    disabled={generateThumbnail}
                    className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    {generateThumbnail ? '生成中...' : '🎨 自動生成'}
                  </button>
                  
                  <label className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer">
                    📁 アップロード
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (e) => {
                            const thumbnailDataUrl = e.target?.result as string;
                            updateSettings({
                              preview: {
                                ...project.settings.preview,
                                thumbnailDataUrl
                              }
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* アクションボタン */}
        <section className="flex flex-wrap gap-4 justify-center">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {isSaving ? '💾 保存中...' : '💾 保存'}
          </button>

          <button
            onClick={handleTestPlay}
            disabled={!project.settings.name || isTestPlaying}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            🧪 クイックテスト
          </button>

          <button
            onClick={handleFullGamePlay}
            disabled={!project.settings.name || isTestPlaying}
            className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            🎮 フルプレイ
          </button>
          
          <button
            onClick={handlePublish}
            disabled={!project.settings.name || isPublishing || (!project.assets.objects.length && !project.assets.background)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {isPublishing ? '公開中...' : project.settings.publishing?.isPublished ? '🔄 更新' : '🚀 公開'}
          </button>
          
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            📦 エクスポート
          </button>
        </section>
        
        {/* 公開ステータス表示 */}
        {project.settings.publishing?.isPublished && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 px-4 py-2 rounded-lg">
              <span className="text-green-600">✅ 公開済み</span>
              {project.settings.publishing?.publishedAt && (
                <span className="text-green-600 text-sm">
                  {new Date(project.settings.publishing.publishedAt).toLocaleString('ja-JP')}
                </span>
              )}
            </div>
          </div>
        )}
        
        {/* 🔧 強化: ゲーム統計情報 */}
        <section className="mt-8 bg-gray-50 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-800 mb-4">📊 ゲーム統計</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {project.assets.objects.length}
              </div>
              <div className="text-sm text-gray-600">オブジェクト</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {project.script.rules.length}
              </div>
              <div className="text-sm text-gray-600">ルール</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {project.assets.texts.length}
              </div>
              <div className="text-sm text-gray-600">テキスト</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round((project.totalSize || 0) / 1024 / 1024 * 10) / 10}MB
              </div>
              <div className="text-sm text-gray-600">総容量</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">
                {project.metadata?.statistics?.testPlayCount || 0}
              </div>
              <div className="text-sm text-gray-600">テスト回数</div>
            </div>
          </div>
          
          {/* 🔧 追加: 初期条件・プロジェクト健全性 */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${project.script.initialState ? 'text-green-600' : 'text-orange-600'}`}>
                  {project.script.initialState ? '✓' : '⚠️'}
                </div>
                <div className="text-sm text-gray-600">初期条件</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${project.script.layout.objects.length > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                  {project.script.layout.objects.length}
                </div>
                <div className="text-sm text-gray-600">配置済み</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${project.script.successConditions.length > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                  {project.script.successConditions.length}
                </div>
                <div className="text-sm text-gray-600">成功条件</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${project.script.statistics?.complexityScore || 0 > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                  {project.script.statistics?.complexityScore || 0}
                </div>
                <div className="text-sm text-gray-600">複雑度</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsTab;