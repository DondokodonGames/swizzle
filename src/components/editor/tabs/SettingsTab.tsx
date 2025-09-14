import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GameProject } from '../../../types/editor/GameProject';
import { GameSettings } from '../../../types/editor/GameProject';
import { useGameTheme } from '../../ui/GameThemeProvider';
import ArcadeButton from '../../ui/ArcadeButton';
// 🔧 追加: EditorGameBridge統合
import EditorGameBridge, { GameExecutionResult } from '../../../services/editor/EditorGameBridge';

// ModernCard コンポーネント（テーマ対応）
interface ModernCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  icon?: string;
}

const ModernCard: React.FC<ModernCardProps> = ({ children, className = '', title, icon }) => {
  const { currentTheme } = useGameTheme();
  
  return (
    <div 
      className={`rounded-xl border shadow-sm transition-all hover:shadow-md ${className}`}
      style={{
        background: currentTheme.colors.surface,
        borderColor: currentTheme.colors.border,
        color: currentTheme.colors.text
      }}
    >
      {title && (
        <div className="p-4 border-b" style={{ borderColor: currentTheme.colors.border }}>
          <h4 className="text-lg font-semibold flex items-center gap-2">
            {icon && <span>{icon}</span>}
            {title}
          </h4>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

// 🔧 Props型定義修正: onTestPlay と onSave を追加
interface SettingsTabProps {
  project: GameProject;
  onProjectUpdate: (project: GameProject) => void;
  onTestPlay?: () => void;
  onSave?: () => void;
}

// ゲーム時間のプリセット（テーマ対応版）
const DURATION_PRESETS = [
  { value: 5, label: '5秒', description: 'サクッと', emoji: '⚡' },
  { value: 10, label: '10秒', description: 'ちょうどいい', emoji: '⏰' },
  { value: 15, label: '15秒', description: 'じっくり', emoji: '🎯' },
  { value: 30, label: '30秒', description: 'たっぷり', emoji: '🏃' },
  { value: null, label: '無制限', description: '自由に', emoji: '∞' },
] as const;

// ゲームスピード設定（テーマ対応版）
const GAME_SPEED_LEVELS = [
  { value: 0.7, label: 'スロー', description: 'ゆっくり楽しむ', emoji: '🐌' },
  { value: 1.0, label: '標準', description: 'ちょうどいい速さ', emoji: '🚶' },
  { value: 1.3, label: '高速', description: '挑戦的な速さ', emoji: '🏃' },
  { value: 1.6, label: '超高速', description: '上級者向け', emoji: '⚡' },
] as const;

export const SettingsTab: React.FC<SettingsTabProps> = ({ 
  project, 
  onProjectUpdate, 
  onTestPlay,
  onSave
}) => {
  // テーマシステム統合
  const { currentTheme } = useGameTheme();
  
  const [isTestPlaying, setIsTestPlaying] = useState(false);
  const [testPlayResult, setTestPlayResult] = useState<'success' | 'failure' | null>(null);
  const [testPlayDetails, setTestPlayDetails] = useState<GameExecutionResult | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [generateThumbnail, setGenerateThumbnail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showFullGame, setShowFullGame] = useState(false);
  const gameTestRef = useRef<HTMLDivElement>(null);
  const fullGameRef = useRef<HTMLDivElement>(null);

  // EditorGameBridge インスタンス
  const bridgeRef = useRef<EditorGameBridge | null>(null);
  
  useEffect(() => {
    bridgeRef.current = EditorGameBridge.getInstance();
    return () => {
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
    updateProject({ name: name.slice(0, 50) });
  }, [updateSettings, updateProject]);

  // ゲーム説明の更新
  const handleDescriptionChange = useCallback((description: string) => {
    updateSettings({ description: description.slice(0, 200) });
  }, [updateSettings]);

  // ゲーム時間設定の更新（無制限対応）
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

  // ゲームスピード設定の更新
  const handleGameSpeedChange = useCallback((speed: number) => {
    updateProject({ 
      metadata: {
        ...project.metadata,
        gameSpeed: speed
      }
    });
  }, [updateProject, project.metadata]);

  // テストプレイ機能（EditorGameBridge統合）
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
      } else {
        setTestPlayResult('failure');
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

  // フルゲーム実行機能（DOM要素待機対応版）
  const handleFullGamePlay = useCallback(async () => {
    console.log('🎮 フルゲーム実行開始:', project.name);
    
    if (!bridgeRef.current) {
      alert('ゲーム実行環境が準備されていません');
      return;
    }
    
    try {
      setShowFullGame(true);
      
      // DOM要素が作成されるまで待機
      await new Promise<void>((resolve) => {
        const checkElement = () => {
          if (fullGameRef.current) {
            resolve();
          } else {
            requestAnimationFrame(checkElement);
          }
        };
        checkElement();
      });
      
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

  // 保存機能
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

  // サムネイル自動生成
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
      
      // 背景描画（テーマ対応）
      if (project.assets.background?.frames?.[0]?.dataUrl) {
        const bgImg = new Image();
        await new Promise((resolve, reject) => {
          bgImg.onload = resolve;
          bgImg.onerror = reject;
          bgImg.src = project.assets.background!.frames[0].dataUrl;
        });
        ctx.drawImage(bgImg, 0, 0, 300, 400);
      } else {
        // テーマカラーを使用したグラデーション
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, currentTheme.colors.primary);
        gradient.addColorStop(1, currentTheme.colors.secondary);
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
      
      // 統計情報（テーマ対応）
      ctx.fillStyle = currentTheme.colors.surface + 'E6';
      ctx.fillRect(20, 300, 260, 80);
      
      ctx.fillStyle = currentTheme.colors.text;
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
  }, [project, updateSettings, currentTheme]);

  // プロジェクト公開
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

  // エクスポート機能
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
    <div 
      className="settings-tab h-full overflow-auto"
      style={{ 
        background: `linear-gradient(135deg, ${currentTheme.colors.background}, ${currentTheme.colors.surface})`,
        minHeight: '100vh'
      }}
    >
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        
        {/* ゲーム基本情報 */}
        <ModernCard title="ゲーム情報" icon="🎮">
          <div className="space-y-4">
            {/* ゲーム名 */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: currentTheme.colors.text }}>
                ゲーム名 <span style={{ color: currentTheme.colors.error }}>*</span>
              </label>
              <input
                type="text"
                value={project.settings.name || ''}
                onChange={(e) => handleGameNameChange(e.target.value)}
                placeholder="素晴らしいゲーム名を入力してください"
                className="w-full px-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2"
                style={{
                  background: currentTheme.colors.background,
                  color: currentTheme.colors.text,
                  borderColor: currentTheme.colors.border
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = currentTheme.colors.primary;
                  e.target.style.boxShadow = `0 0 0 2px ${currentTheme.colors.primary}40`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = currentTheme.colors.border;
                  e.target.style.boxShadow = 'none';
                }}
                maxLength={50}
              />
              <div className="text-right text-sm mt-1" style={{ color: currentTheme.colors.textSecondary }}>
                {(project.settings.name || '').length}/50
              </div>
            </div>
            
            {/* ゲーム説明 */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: currentTheme.colors.text }}>
                ゲーム説明
              </label>
              <textarea
                value={project.settings.description || ''}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="このゲームの楽しさを説明してください"
                rows={3}
                className="w-full px-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2 resize-none"
                style={{
                  background: currentTheme.colors.background,
                  color: currentTheme.colors.text,
                  borderColor: currentTheme.colors.border
                }}
                maxLength={200}
              />
              <div className="text-right text-sm mt-1" style={{ color: currentTheme.colors.textSecondary }}>
                {(project.settings.description || '').length}/200
              </div>
            </div>
          </div>
        </ModernCard>

        {/* ゲーム設定 */}
        <ModernCard title="ゲーム設定" icon="⚙️">
          <div className="space-y-6">
            {/* ゲーム時間設定 */}
            <div>
              <label className="block text-sm font-medium mb-3" style={{ color: currentTheme.colors.text }}>
                ゲーム時間
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {DURATION_PRESETS.map((preset) => {
                  const isSelected = (preset.value === null && project.settings.duration?.type === 'unlimited') ||
                                   (preset.value !== null && project.settings.duration?.seconds === preset.value);
                  
                  return (
                    <button
                      key={preset.value || 'unlimited'}
                      onClick={() => handleDurationChange(preset.value)}
                      className="p-4 border-2 rounded-xl text-center transition-all hover:scale-105 transform"
                      style={{
                        background: isSelected ? `${currentTheme.colors.primary}20` : currentTheme.colors.background,
                        borderColor: isSelected ? currentTheme.colors.primary : currentTheme.colors.border,
                        color: currentTheme.colors.text,
                        boxShadow: isSelected ? `0 4px 12px ${currentTheme.colors.primary}30` : 'none'
                      }}
                    >
                      <div className="text-2xl mb-1">{preset.emoji}</div>
                      <div className="font-semibold">{preset.label}</div>
                      <div className="text-xs" style={{ color: currentTheme.colors.textSecondary }}>
                        {preset.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* ゲームスピード設定 */}
            <div>
              <label className="block text-sm font-medium mb-3" style={{ color: currentTheme.colors.text }}>
                ゲームスピード（挑戦レベル）
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {GAME_SPEED_LEVELS.map((level) => {
                  const isSelected = (project.metadata?.gameSpeed || 1.0) === level.value;
                  
                  return (
                    <button
                      key={level.value}
                      onClick={() => handleGameSpeedChange(level.value)}
                      className="p-4 border-2 rounded-xl text-center transition-all hover:scale-105 transform"
                      style={{
                        background: isSelected ? `${currentTheme.colors.secondary}20` : currentTheme.colors.background,
                        borderColor: isSelected ? currentTheme.colors.secondary : currentTheme.colors.border,
                        color: currentTheme.colors.text,
                        boxShadow: isSelected ? `0 4px 12px ${currentTheme.colors.secondary}30` : 'none'
                      }}
                    >
                      <div className="text-2xl mb-1">{level.emoji}</div>
                      <div className="font-semibold">{level.label}</div>
                      <div className="text-xs" style={{ color: currentTheme.colors.textSecondary }}>
                        {level.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </ModernCard>

        {/* テストプレイセクション */}
        <ModernCard title="テストプレイ" icon="🎯">
          <div className="text-center">
            {!isTestPlaying && testPlayResult === null && (
              <div className="space-y-4">
                <div className="text-6xl">🕹️</div>
                <h4 className="text-lg font-medium" style={{ color: currentTheme.colors.text }}>
                  ゲームをテストしてみましょう
                </h4>
                <p style={{ color: currentTheme.colors.textSecondary }}>
                  作成したゲームが正しく動作するか確認できます
                </p>
                <div className="flex justify-center gap-4">
                  <ArcadeButton
                    variant="secondary"
                    size="lg"
                    onClick={handleTestPlay}
                    disabled={!project.settings.name || isTestPlaying}
                    effects={{ glow: true }}
                  >
                    🧪 クイックテスト (3秒)
                  </ArcadeButton>
                  <ArcadeButton
                    variant="primary"
                    size="lg"
                    onClick={handleFullGamePlay}
                    disabled={!project.settings.name || isTestPlaying}
                    effects={{ glow: true, pulse: true }}
                  >
                    ▶️ フルゲーム実行
                  </ArcadeButton>
                </div>
              </div>
            )}
            
            {isTestPlaying && (
              <div className="space-y-4">
                <div className="text-6xl animate-bounce">🎮</div>
                <h4 className="text-lg font-medium" style={{ color: currentTheme.colors.text }}>
                  テストプレイ中...
                </h4>
                <p style={{ color: currentTheme.colors.textSecondary }}>
                  ゲームの動作を確認しています
                </p>
                <div 
                  className="w-full h-2 rounded-full"
                  style={{ background: currentTheme.colors.border }}
                >
                  <div 
                    className="h-2 rounded-full animate-pulse"
                    style={{ 
                      background: currentTheme.colors.primary,
                      width: '70%'
                    }}
                  />
                </div>
              </div>
            )}
            
            {testPlayResult === 'success' && testPlayDetails && (
              <div className="space-y-4">
                <div className="text-6xl">🎉</div>
                <h4 className="text-lg font-medium" style={{ color: currentTheme.colors.success }}>
                  テスト成功！
                </h4>
                <div 
                  className="max-w-md mx-auto p-4 rounded-lg border"
                  style={{ 
                    background: `${currentTheme.colors.success}20`,
                    borderColor: currentTheme.colors.success 
                  }}
                >
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold" style={{ color: currentTheme.colors.success }}>
                        {testPlayDetails.score || 0}
                      </div>
                      <div style={{ color: currentTheme.colors.text }}>スコア</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold" style={{ color: currentTheme.colors.success }}>
                        {testPlayDetails.timeElapsed.toFixed(1)}s
                      </div>
                      <div style={{ color: currentTheme.colors.text }}>プレイ時間</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold" style={{ color: currentTheme.colors.success }}>
                        {testPlayDetails.finalState?.objectsInteracted?.length || 0}
                      </div>
                      <div style={{ color: currentTheme.colors.text }}>操作回数</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold" style={{ color: currentTheme.colors.success }}>
                        {testPlayDetails.finalState?.rulesTriggered?.length || 0}
                      </div>
                      <div style={{ color: currentTheme.colors.text }}>ルール実行</div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center gap-3">
                  <ArcadeButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setTestPlayResult(null)}
                  >
                    もう一度テスト
                  </ArcadeButton>
                  <ArcadeButton
                    variant="primary"
                    size="sm"
                    onClick={handleFullGamePlay}
                    effects={{ glow: true }}
                  >
                    フルゲーム実行
                  </ArcadeButton>
                </div>
              </div>
            )}
            
            {testPlayResult === 'failure' && testPlayDetails && (
              <div className="space-y-4">
                <div className="text-6xl">⚠️</div>
                <h4 className="text-lg font-medium" style={{ color: currentTheme.colors.error }}>
                  テストで問題発見
                </h4>
                <div 
                  className="max-w-md mx-auto p-4 rounded-lg border text-left"
                  style={{ 
                    background: `${currentTheme.colors.error}20`,
                    borderColor: currentTheme.colors.error 
                  }}
                >
                  <div className="text-sm" style={{ color: currentTheme.colors.text }}>
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
                <ArcadeButton
                  variant="secondary"
                  size="sm"
                  onClick={() => setTestPlayResult(null)}
                >
                  もう一度テスト
                </ArcadeButton>
              </div>
            )}
          </div>
        </ModernCard>

        {/* フルゲーム表示エリア */}
        {showFullGame && (
          <ModernCard title="ゲーム実行中" icon="🎮">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-medium" style={{ color: currentTheme.colors.text }}>
                  🎮 ゲーム実行中
                </h4>
                <ArcadeButton
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowFullGame(false)}
                  style={{
                    background: currentTheme.colors.error,
                    color: 'white'
                  }}
                >
                  ✕ 終了
                </ArcadeButton>
              </div>
              <div
                ref={fullGameRef}
                className="w-full flex justify-center rounded-lg"
                style={{ 
                  minHeight: '400px',
                  background: currentTheme.colors.background,
                  border: `2px solid ${currentTheme.colors.border}`
                }}
              >
                {/* ゲームキャンバスがここに挿入される */}
              </div>
            </div>
          </ModernCard>
        )}

        {/* サムネイル設定 */}
        <ModernCard title="サムネイル" icon="📸">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-shrink-0">
              <div 
                className="w-32 h-40 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden"
                style={{ borderColor: currentTheme.colors.border }}
              >
                {project.settings.preview?.thumbnailDataUrl ? (
                  <img
                    src={project.settings.preview.thumbnailDataUrl}
                    alt="Game Thumbnail"
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="text-center" style={{ color: currentTheme.colors.textSecondary }}>
                    <div className="text-2xl mb-1">📸</div>
                    <div className="text-xs">No Thumbnail</div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <h4 className="font-medium mb-2" style={{ color: currentTheme.colors.text }}>
                ゲームサムネイル
              </h4>
              <p className="text-sm mb-4" style={{ color: currentTheme.colors.textSecondary }}>
                ゲームの魅力を伝えるサムネイルを設定します
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <ArcadeButton
                  variant="primary"
                  size="md"
                  onClick={handleGenerateThumbnail}
                  disabled={generateThumbnail}
                  effects={{ glow: !generateThumbnail }}
                >
                  {generateThumbnail ? '生成中...' : '🎨 自動生成'}
                </ArcadeButton>
                
                <label>
                  <button 
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-all cursor-pointer"
                    style={{
                      background: `linear-gradient(135deg, ${currentTheme.colors.background}, ${currentTheme.colors.surface})`,
                      color: currentTheme.colors.text,
                      border: `2px solid ${currentTheme.colors.border}`
                    }}
                  >
                    📁 アップロード
                  </button>
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
        </ModernCard>

        {/* アクションボタン */}
        <div className="flex flex-wrap gap-4 justify-center">
          <ArcadeButton
            variant="success"
            size="lg"
            onClick={handleSave}
            disabled={isSaving}
            effects={{ glow: !isSaving }}
          >
            {isSaving ? '💾 保存中...' : '💾 保存'}
          </ArcadeButton>

          <ArcadeButton
            variant="primary"
            size="lg"
            onClick={handleTestPlay}
            disabled={!project.settings.name || isTestPlaying}
            effects={{ glow: !isTestPlaying }}
          >
            🧪 クイックテスト
          </ArcadeButton>

          <ArcadeButton
            variant="secondary"
            size="lg"
            onClick={handleFullGamePlay}
            disabled={!project.settings.name || isTestPlaying}
            effects={{ pulse: true }}
          >
            🎮 フルプレイ
          </ArcadeButton>
          
          <ArcadeButton
            variant="gradient"
            size="lg"
            onClick={handlePublish}
            disabled={!project.settings.name || isPublishing || (!project.assets.objects.length && !project.assets.background)}
            effects={{ glow: true, pulse: !isPublishing }}
          >
            {isPublishing ? '公開中...' : project.settings.publishing?.isPublished ? '🔄 更新' : '🚀 公開'}
          </ArcadeButton>
          
          <ArcadeButton
            variant="secondary"
            size="lg"
            onClick={handleExport}
          >
            📦 エクスポート
          </ArcadeButton>
        </div>
        
        {/* 公開ステータス表示 */}
        {project.settings.publishing?.isPublished && (
          <div className="text-center">
            <div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border"
              style={{
                background: `${currentTheme.colors.success}20`,
                borderColor: currentTheme.colors.success,
                color: currentTheme.colors.success
              }}
            >
              <span>✅ 公開済み</span>
              {project.settings.publishing?.publishedAt && (
                <span className="text-sm">
                  {new Date(project.settings.publishing.publishedAt).toLocaleString('ja-JP')}
                </span>
              )}
            </div>
          </div>
        )}
        
        {/* エラー表示 */}
        {publishError && (
          <div 
            className="p-4 rounded-lg border text-center"
            style={{
              background: `${currentTheme.colors.error}20`,
              borderColor: currentTheme.colors.error,
              color: currentTheme.colors.error
            }}
          >
            ❌ {publishError}
          </div>
        )}
        
        {/* ゲーム統計情報 */}
        <ModernCard title="ゲーム統計" icon="📊">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: currentTheme.colors.primary }}>
                {project.assets.objects.length}
              </div>
              <div className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>
                オブジェクト
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: currentTheme.colors.secondary }}>
                {project.script.rules.length}
              </div>
              <div className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>
                ルール
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: currentTheme.colors.accent }}>
                {project.assets.texts.length}
              </div>
              <div className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>
                テキスト
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: currentTheme.colors.warning }}>
                {Math.round((project.totalSize || 0) / 1024 / 1024 * 10) / 10}MB
              </div>
              <div className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>
                総容量
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: currentTheme.colors.success }}>
                {project.metadata?.statistics?.testPlayCount || 0}
              </div>
              <div className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>
                テスト回数
              </div>
            </div>
          </div>
          
          {/* プロジェクト健全性 */}
          <div className="mt-4 pt-4 border-t" style={{ borderColor: currentTheme.colors.border }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold`} style={{ 
                  color: project.script.initialState ? currentTheme.colors.success : currentTheme.colors.warning
                }}>
                  {project.script.initialState ? '✓' : '⚠️'}
                </div>
                <div className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>初期条件</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold`} style={{ 
                  color: project.script.layout.objects.length > 0 ? currentTheme.colors.success : currentTheme.colors.warning
                }}>
                  {project.script.layout.objects.length}
                </div>
                <div className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>配置済み</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold`} style={{ 
                  color: project.script.successConditions.length > 0 ? currentTheme.colors.success : currentTheme.colors.warning
                }}>
                  {project.script.successConditions.length}
                </div>
                <div className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>成功条件</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold`} style={{ 
                  color: project.script.statistics?.complexityScore || 0 > 0 ? currentTheme.colors.success : currentTheme.colors.textSecondary
                }}>
                  {project.script.statistics?.complexityScore || 0}
                </div>
                <div className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>複雑度</div>
              </div>
            </div>
          </div>
        </ModernCard>
      </div>
    </div>
  );
};

export default SettingsTab;