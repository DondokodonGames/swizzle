// src/components/editor/EditorApp.tsx
// Phase 1-C版: EditorGameBridge統合・実際のテストプレイ機能実装
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GameProject } from '../../types/editor/GameProject';
import { GameEditor } from './GameEditor';
import { ProjectSelector } from './ProjectSelector';
import { useGameProject } from '../../hooks/editor/useGameProject';
import { DEFAULT_EDITOR_TABS, getProgressTabConfig } from './common/TabNavigation';
import { DESIGN_TOKENS } from '../../constants/DesignSystem';
import { ModernButton } from '../ui/ModernButton';
import { ModernCard } from '../ui/ModernCard';
import { EditorGameBridge, GameExecutionResult } from '../../services/editor/EditorGameBridge';

type AppMode = 'selector' | 'editor' | 'testplay';

interface EditorAppProps {
  onClose?: () => void;
  initialProjectId?: string;
  className?: string;
}

export const EditorApp: React.FC<EditorAppProps> = ({
  onClose,
  initialProjectId,
  className = ''
}) => {
  const [mode, setMode] = useState<AppMode>('selector');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    id: string;
  } | null>(null);
  
  // 🔧 テストプレイ関連状態追加
  const [isTestPlaying, setIsTestPlaying] = useState(false);
  const [testPlayResult, setTestPlayResult] = useState<GameExecutionResult | null>(null);
  const testPlayContainerRef = useRef<HTMLDivElement>(null);
  const gameBridge = useRef(EditorGameBridge.getInstance());

  const {
    currentProject,
    loading,
    error,
    hasUnsavedChanges,
    createProject,
    loadProject,
    saveProject,
    updateProject,
    deleteProject,
    duplicateProject,
    getTotalSize,
    getValidationErrors
  } = useGameProject();

  // 初期化処理
  useEffect(() => {
    if (initialProjectId) {
      handleProjectSelect({ id: initialProjectId } as GameProject);
    }
  }, [initialProjectId]);

  // 通知表示
  const showNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const notificationId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setNotification({ type, message, id: notificationId });
    setTimeout(() => {
      setNotification(prev => prev?.id === notificationId ? null : prev);
    }, 5000);
  }, []);

  // プロジェクト選択
  const handleProjectSelect = useCallback(async (project: GameProject) => {
    try {
      await loadProject(project.id);
      setMode('editor');
      showNotification('success', `「${project.name}」を開きました`);
    } catch (error: any) {
      showNotification('error', `プロジェクトの読み込みに失敗しました: ${error.message}`);
    }
  }, [loadProject, showNotification]);

  // 新規プロジェクト作成
  const handleCreateNew = useCallback(async (name: string) => {
    try {
      const newProject = await createProject(name);
      setMode('editor');
      showNotification('success', `「${name}」を作成しました`);
    } catch (error: any) {
      showNotification('error', `プロジェクトの作成に失敗しました: ${error.message}`);
    }
  }, [createProject, showNotification]);

  // 🔧 強化されたプロジェクト保存
  const handleSave = useCallback(async () => {
    if (!currentProject) return;

    try {
      // プロジェクトの最終チェック
      const errors = getValidationErrors();
      if (errors.length > 0) {
        console.warn('保存時に警告があります:', errors);
      }

      await saveProject();
      showNotification('success', 'プロジェクトを保存しました');
      
      // 保存後にメタデータ更新
      updateProject({
        metadata: {
          ...currentProject.metadata,
          statistics: {
            ...currentProject.metadata.statistics,
            saveCount: (currentProject.metadata.statistics.saveCount || 0) + 1
          }
        }
      });
    } catch (error: any) {
      showNotification('error', `保存に失敗しました: ${error.message}`);
    }
  }, [currentProject, saveProject, getValidationErrors, updateProject, showNotification]);

  // 🔧 修正: 実際のテストプレイ機能実装（DOM要素待機対応版）
  const handleTestPlay = useCallback(async () => {
    if (!currentProject) return;

    const errors = getValidationErrors();
    if (errors.length > 0) {
      showNotification('error', `テストプレイできません: ${errors[0]}`);
      return;
    }

    // 基本的な要件チェック
    if (!currentProject.settings.name?.trim()) {
      showNotification('error', 'ゲーム名を入力してください');
      return;
    }

    if (!currentProject.assets.objects.length && !currentProject.assets.background) {
      showNotification('error', '最低1つのオブジェクトまたは背景を追加してください');
      return;
    }

    setIsTestPlaying(true);
    showNotification('info', 'テストプレイを開始します...');

    try {
      // 🔧 修正: まずモード切り替え
      setMode('testplay');
      
      // 🔧 修正: DOM要素が作成されるまで待機
      await new Promise<void>((resolve) => {
        const checkElement = () => {
          if (testPlayContainerRef.current) {
            resolve();
          } else {
            // requestAnimationFrame で次のレンダリングサイクルを待つ
            requestAnimationFrame(checkElement);
          }
        };
        checkElement();
      });

      // 🔧 修正: 再度確認（安全措置）
      if (!testPlayContainerRef.current) {
        throw new Error('テストプレイ画面の準備に失敗しました');
      }

      console.log('✅ テストプレイ画面準備完了、ゲーム実行開始');

      // 🔧 EditorGameBridge経由でテストプレイ実行
      await gameBridge.current.launchFullGame(
        currentProject,
        testPlayContainerRef.current,
        (result: GameExecutionResult) => {
          setTestPlayResult(result);
          setIsTestPlaying(false);
          
          if (result.success) {
            showNotification('success', `テストプレイ完了！スコア: ${result.score || 0}`);
          } else {
            showNotification('error', `テストプレイエラー: ${result.errors.join(', ')}`);
          }

          // プレイ統計更新
          updateProject({
            metadata: {
              ...currentProject.metadata,
              statistics: {
                ...currentProject.metadata.statistics,
                testPlayCount: (currentProject.metadata.statistics.testPlayCount || 0) + 1
              },
              performance: {
                ...currentProject.metadata.performance,
                lastBuildTime: result.performance.renderTime,
                averageFPS: result.performance.averageFPS,
                memoryUsage: result.performance.memoryUsage
              }
            }
          });
        }
      );
    } catch (error: any) {
      console.error('テストプレイエラー:', error);
      setIsTestPlaying(false);
      showNotification('error', `テストプレイに失敗しました: ${error.message}`);
      setMode('editor');
    }
  }, [currentProject, getValidationErrors, updateProject, showNotification]);

  // 🔧 テストプレイ終了
  const handleTestPlayEnd = useCallback(() => {
    setMode('editor');
    setTestPlayResult(null);
    gameBridge.current.reset();
    showNotification('info', 'エディターに戻りました');
  }, [showNotification]);

  // プロジェクト公開
  const handlePublish = useCallback(async () => {
    if (!currentProject) return;

    const errors = getValidationErrors();
    if (errors.length > 0) {
      showNotification('error', `公開できません: ${errors[0]}`);
      return;
    }

    try {
      // 公開前に自動保存
      await saveProject();

      // 公開状態に更新
      updateProject({
        status: 'published',
        settings: {
          ...currentProject.settings,
          publishing: {
            ...currentProject.settings.publishing,
            isPublished: true,
            publishedAt: new Date().toISOString()
          }
        },
        metadata: {
          ...currentProject.metadata,
          statistics: {
            ...currentProject.metadata.statistics,
            publishCount: (currentProject.metadata.statistics.publishCount || 0) + 1
          }
        }
      });

      // 再保存
      await saveProject();

      showNotification('success', 'ゲームを公開しました！');
    } catch (error: any) {
      showNotification('error', `公開に失敗しました: ${error.message}`);
    }
  }, [currentProject, getValidationErrors, saveProject, updateProject, showNotification]);

  // エディターから戻る処理
  const handleBackToSelector = useCallback(async () => {
    if (hasUnsavedChanges) {
      const shouldSave = window.confirm('未保存の変更があります。保存してから戻りますか？\n\n「OK」→保存して戻る\n「キャンセル」→保存せずに戻る');
      
      if (shouldSave) {
        try {
          await handleSave();
          showNotification('success', '保存完了');
        } catch (error) {
          console.error('Save failed:', error);
        }
      }
    }
    
    setMode('selector');
    gameBridge.current.reset();
    showNotification('info', 'プロジェクト一覧に戻りました');
  }, [hasUnsavedChanges, handleSave, showNotification]);

  // アプリ全体を閉じる処理
  const handleExitToMain = useCallback(async () => {
    if (hasUnsavedChanges) {
      const shouldSave = window.confirm('未保存の変更があります。保存してから終了しますか？\n\n「OK」→保存して終了\n「キャンセル」→保存せずに終了');
      
      if (shouldSave) {
        try {
          await handleSave();
          showNotification('success', '保存完了');
          setTimeout(() => {
            if (onClose) onClose();
          }, 1000);
          return;
        } catch (error) {
          console.error('Save failed:', error);
        }
      }
    }
    
    gameBridge.current.reset();
    
    if (onClose) {
      onClose();
    } else {
      showNotification('info', 'メイン画面に戻ります...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }, [hasUnsavedChanges, handleSave, showNotification, onClose]);

  // プロジェクト削除
  const handleProjectDelete = useCallback(async (projectId: string) => {
    try {
      await deleteProject(projectId);
      showNotification('success', 'プロジェクトを削除しました');
    } catch (error: any) {
      showNotification('error', `削除に失敗しました: ${error.message}`);
    }
  }, [deleteProject, showNotification]);

  // プロジェクト複製
  const handleProjectDuplicate = useCallback(async (projectId: string) => {
    try {
      const originalProject = currentProject || { name: 'コピー' } as GameProject;
      const newName = `${originalProject.name} のコピー`;
      const duplicated = await duplicateProject(projectId, newName);
      showNotification('success', `「${duplicated.name}」を作成しました`);
    } catch (error: any) {
      showNotification('error', `複製に失敗しました: ${error.message}`);
    }
  }, [currentProject, duplicateProject, showNotification]);

  // エクスポート処理
  const handleExport = useCallback(async (projectId: string) => {
    try {
      if (currentProject) {
        // 🔧 実際のエクスポート処理
        const exportData = {
          ...currentProject,
          exportedAt: new Date().toISOString(),
          exportSettings: {
            format: 'json',
            version: '1.0.0',
            platform: 'web',
            creator: 'Swizzle Game Editor'
          }
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
          type: 'application/json' 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(currentProject.settings.name || 'my-game').replace(/[^a-zA-Z0-9]/g, '_')}.json`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('success', 'プロジェクトをエクスポートしました');
      }
    } catch (error: any) {
      showNotification('error', `エクスポートに失敗しました: ${error.message}`);
    }
  }, [currentProject, showNotification]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+S で保存
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if ((mode === 'editor' || mode === 'testplay') && currentProject) {
          handleSave();
        }
      }
      
      // Esc でプロジェクトセレクターに戻る（エディター時のみ）
      if (event.key === 'Escape') {
        if (mode === 'testplay') {
          handleTestPlayEnd();
        } else if (mode === 'editor') {
          handleBackToSelector();
        }
      }

      // Ctrl+Q でメイン画面に戻る
      if ((event.ctrlKey || event.metaKey) && event.key === 'q') {
        event.preventDefault();
        handleExitToMain();
      }

      // 🔧 Ctrl+T でテストプレイ（エディター時のみ）
      if ((event.ctrlKey || event.metaKey) && event.key === 't') {
        event.preventDefault();
        if (mode === 'editor' && currentProject && !isTestPlaying) {
          handleTestPlay();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, currentProject, isTestPlaying, handleSave, handleBackToSelector, handleExitToMain, handleTestPlay, handleTestPlayEnd]);

  // ウィンドウ閉じる前の確認
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '未保存の変更があります。本当に閉じますか？';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return (
    <div 
      className={`editor-app ${className}`}
      style={{
        minHeight: '100vh',
        backgroundColor: DESIGN_TOKENS.colors.neutral[50],
        fontFamily: DESIGN_TOKENS.typography.fontFamily.sans.join(', ')
      }}
    >
      {/* ローディング表示 */}
      {loading && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: DESIGN_TOKENS.zIndex.modal,
            backdropFilter: 'blur(4px)'
          }}
        >
          <ModernCard variant="elevated" size="lg">
            <div style={{ textAlign: 'center' }}>
              <div 
                style={{
                  width: '48px',
                  height: '48px',
                  border: '4px solid transparent',
                  borderTop: `4px solid ${DESIGN_TOKENS.colors.primary[500]}`,
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: `0 auto ${DESIGN_TOKENS.spacing[4]} auto`
                }}
              />
              <p 
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                  color: DESIGN_TOKENS.colors.neutral[800],
                  margin: 0
                }}
              >
                読み込み中...
              </p>
            </div>
          </ModernCard>
        </div>
      )}

      {/* 通知表示 */}
      {notification && (
        <div 
          style={{
            position: 'fixed',
            top: DESIGN_TOKENS.spacing[4],
            right: DESIGN_TOKENS.spacing[4],
            zIndex: DESIGN_TOKENS.zIndex.notification,
            maxWidth: '400px'
          }}
        >
          <ModernCard variant="elevated" size="sm">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ 
                fontSize: DESIGN_TOKENS.typography.fontSize.xl, 
                marginRight: DESIGN_TOKENS.spacing[3] 
              }}>
                {notification.type === 'success' ? '✅' :
                 notification.type === 'error' ? '❌' : 'ℹ️'}
              </span>
              <p style={{ 
                fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                margin: 0,
                flex: 1,
                color: notification.type === 'success' 
                  ? DESIGN_TOKENS.colors.success[800] 
                  : notification.type === 'error' 
                    ? DESIGN_TOKENS.colors.error[800] 
                    : DESIGN_TOKENS.colors.primary[800]
              }}>
                {notification.message}
              </p>
              <ModernButton
                variant="ghost"
                size="xs"
                onClick={() => setNotification(null)}
                style={{ marginLeft: DESIGN_TOKENS.spacing[2] }}
              >
                ✕
              </ModernButton>
            </div>
          </ModernCard>
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div 
          style={{
            position: 'fixed',
            top: DESIGN_TOKENS.spacing[4],
            left: DESIGN_TOKENS.spacing[4],
            right: DESIGN_TOKENS.spacing[4],
            zIndex: DESIGN_TOKENS.zIndex.notification
          }}
        >
          <ModernCard variant="elevated" size="md">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ 
                fontSize: DESIGN_TOKENS.typography.fontSize.xl, 
                marginRight: DESIGN_TOKENS.spacing[3] 
              }}>
                ⚠️
              </span>
              <p style={{ 
                color: DESIGN_TOKENS.colors.error[800], 
                fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                flex: 1,
                margin: 0
              }}>
                {error}
              </p>
              <ModernButton
                variant="error"
                size="sm"
                onClick={() => window.location.reload()}
                style={{ marginLeft: DESIGN_TOKENS.spacing[4] }}
              >
                再読み込み
              </ModernButton>
            </div>
          </ModernCard>
        </div>
      )}

      {/* メインコンテンツ */}
      {mode === 'selector' ? (
        <ProjectSelector
          onProjectSelect={handleProjectSelect}
          onCreateNew={handleCreateNew}
          onDelete={handleProjectDelete}
          onDuplicate={handleProjectDuplicate}
          onExport={handleExport}
        />
      ) : mode === 'testplay' ? (
        // 🔧 テストプレイ画面
        <div style={{ minHeight: '100vh', backgroundColor: DESIGN_TOKENS.colors.neutral[900] }}>
          {/* テストプレイヘッダー */}
          <header 
            style={{
              backgroundColor: DESIGN_TOKENS.colors.neutral[800],
              borderBottom: `1px solid ${DESIGN_TOKENS.colors.neutral[700]}`,
              boxShadow: DESIGN_TOKENS.shadows.lg
            }}
          >
            <div 
              style={{
                maxWidth: '1280px',
                margin: '0 auto',
                padding: `0 ${DESIGN_TOKENS.spacing[4]}`
              }}
            >
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  height: '64px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[4] }}>
                  <h1 
                    style={{
                      fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                      fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                      color: DESIGN_TOKENS.colors.neutral[100],
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: DESIGN_TOKENS.spacing[2]
                    }}
                  >
                    🎮 {currentProject?.settings.name || 'テストプレイ'}
                  </h1>
                  
                  {isTestPlaying && (
                    <div 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: DESIGN_TOKENS.spacing[2],
                        padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[3]}`,
                        backgroundColor: DESIGN_TOKENS.colors.primary[600],
                        color: DESIGN_TOKENS.colors.neutral[0],
                        borderRadius: DESIGN_TOKENS.borderRadius.md,
                        fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                        fontWeight: DESIGN_TOKENS.typography.fontWeight.medium
                      }}
                    >
                      <div 
                        style={{
                          width: '8px',
                          height: '8px',
                          backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                          borderRadius: '50%',
                          animation: 'pulse 1.5s ease-in-out infinite'
                        }}
                      />
                      実行中
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[2] }}>
                  <ModernButton
                    variant="secondary"
                    size="sm"
                    icon="🔄"
                    onClick={handleTestPlay}
                    disabled={isTestPlaying}
                  >
                    再実行
                  </ModernButton>
                  
                  <ModernButton
                    variant="outline"
                    size="sm"
                    icon="←"
                    onClick={handleTestPlayEnd}
                  >
                    エディターに戻る
                  </ModernButton>
                </div>
              </div>
            </div>
          </header>

          {/* テストプレイコンテンツ */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 'calc(100vh - 64px)',
              padding: DESIGN_TOKENS.spacing[6]
            }}
          >
            <div 
              ref={testPlayContainerRef}
              style={{
                width: '100%',
                maxWidth: '360px',
                height: '640px',
                backgroundColor: DESIGN_TOKENS.colors.neutral[800],
                borderRadius: DESIGN_TOKENS.borderRadius.lg,
                boxShadow: DESIGN_TOKENS.shadows.xl,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}
            >
              {!isTestPlaying && !testPlayResult && (
                <div style={{ textAlign: 'center', color: DESIGN_TOKENS.colors.neutral[400] }}>
                  <div style={{ fontSize: '4rem', marginBottom: DESIGN_TOKENS.spacing[4] }}>🎮</div>
                  <p>ゲームを準備中...</p>
                </div>
              )}
            </div>
          </div>

          {/* テストプレイ結果表示 */}
          {testPlayResult && (
            <div 
              style={{
                position: 'fixed',
                bottom: DESIGN_TOKENS.spacing[6],
                left: DESIGN_TOKENS.spacing[6],
                right: DESIGN_TOKENS.spacing[6],
                maxWidth: '600px',
                margin: '0 auto'
              }}
            >
              <ModernCard variant="elevated" size="lg">
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: DESIGN_TOKENS.spacing[3] }}>
                    {testPlayResult.success ? '🎉' : '⚠️'}
                  </div>
                  <h3 
                    style={{
                      fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                      fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                      color: testPlayResult.success 
                        ? DESIGN_TOKENS.colors.success[600] 
                        : DESIGN_TOKENS.colors.error[600],
                      marginBottom: DESIGN_TOKENS.spacing[3]
                    }}
                  >
                    {testPlayResult.success ? 'テストプレイ成功！' : 'テストプレイ失敗'}
                  </h3>
                  
                  {testPlayResult.success && (
                    <div 
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                        gap: DESIGN_TOKENS.spacing[4],
                        marginBottom: DESIGN_TOKENS.spacing[4]
                      }}
                    >
                      <div style={{ textAlign: 'center' }}>
                        <div 
                          style={{
                            fontSize: DESIGN_TOKENS.typography.fontSize.xl,
                            fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                            color: DESIGN_TOKENS.colors.primary[600]
                          }}
                        >
                          {testPlayResult.score || 0}
                        </div>
                        <div 
                          style={{
                            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                            color: DESIGN_TOKENS.colors.neutral[600]
                          }}
                        >
                          スコア
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div 
                          style={{
                            fontSize: DESIGN_TOKENS.typography.fontSize.xl,
                            fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                            color: DESIGN_TOKENS.colors.success[600]
                          }}
                        >
                          {testPlayResult.timeElapsed.toFixed(1)}s
                        </div>
                        <div 
                          style={{
                            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                            color: DESIGN_TOKENS.colors.neutral[600]
                          }}
                        >
                          プレイ時間
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div 
                          style={{
                            fontSize: DESIGN_TOKENS.typography.fontSize.xl,
                            fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                            color: DESIGN_TOKENS.colors.secondary[600]
                          }}
                        >
                          {Math.round(testPlayResult.performance.averageFPS)}
                        </div>
                        <div 
                          style={{
                            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                            color: DESIGN_TOKENS.colors.neutral[600]
                          }}
                        >
                          平均FPS
                        </div>
                      </div>
                    </div>
                  )}

                  {testPlayResult.errors.length > 0 && (
                    <div 
                      style={{
                        padding: DESIGN_TOKENS.spacing[3],
                        backgroundColor: DESIGN_TOKENS.colors.error[50],
                        borderRadius: DESIGN_TOKENS.borderRadius.md,
                        marginBottom: DESIGN_TOKENS.spacing[4]
                      }}
                    >
                      <p 
                        style={{
                          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                          color: DESIGN_TOKENS.colors.error[600],
                          margin: 0
                        }}
                      >
                        エラー: {testPlayResult.errors.join(', ')}
                      </p>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[3], justifyContent: 'center' }}>
                    <ModernButton
                      variant="primary"
                      size="md"
                      icon="🔄"
                      onClick={handleTestPlay}
                    >
                      もう一度テスト
                    </ModernButton>
                    <ModernButton
                      variant="outline"
                      size="md"
                      icon="←"
                      onClick={handleTestPlayEnd}
                    >
                      エディターに戻る
                    </ModernButton>
                  </div>
                </div>
              </ModernCard>
            </div>
          )}
        </div>
      ) : currentProject ? (
        <div style={{ minHeight: '100vh', backgroundColor: DESIGN_TOKENS.colors.neutral[0] }}>
          {/* エディターヘッダー */}
          <header 
            style={{
              backgroundColor: DESIGN_TOKENS.colors.neutral[0],
              borderBottom: `1px solid ${DESIGN_TOKENS.colors.neutral[200]}`,
              boxShadow: DESIGN_TOKENS.shadows.sm,
              position: 'sticky',
              top: 0,
              zIndex: DESIGN_TOKENS.zIndex.sticky
            }}
          >
            <div 
              style={{
                maxWidth: '1280px',
                margin: '0 auto',
                padding: `0 ${DESIGN_TOKENS.spacing[4]}`
              }}
            >
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  height: '64px'
                }}
              >
                {/* 左側: ナビゲーション */}
                <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[3] }}>
                  <ModernButton
                    variant="ghost"
                    size="sm"
                    icon="←"
                    onClick={handleBackToSelector}
                    style={{ fontWeight: DESIGN_TOKENS.typography.fontWeight.medium }}
                  >
                    一覧に戻る
                  </ModernButton>
                  
                  <div 
                    style={{
                      width: '1px',
                      height: '24px',
                      backgroundColor: DESIGN_TOKENS.colors.neutral[300]
                    }}
                  />
                  
                  <ModernButton
                    variant="ghost"
                    size="sm"
                    icon="🏠"
                    onClick={handleExitToMain}
                    style={{ fontWeight: DESIGN_TOKENS.typography.fontWeight.medium }}
                  >
                    メイン画面
                  </ModernButton>
                </div>

                {/* 中央: プロジェクト情報 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[4] }}>
                  <div>
                    <h1 
                      style={{
                        fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                        fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                        color: DESIGN_TOKENS.colors.neutral[800],
                        margin: 0
                      }}
                    >
                      {currentProject.name || currentProject.settings.name || 'マイゲーム'}
                    </h1>
                  </div>

                  {/* ステータス表示 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[2] }}>
                    {hasUnsavedChanges && (
                      <div 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: DESIGN_TOKENS.spacing[1],
                          padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[2]}`,
                          backgroundColor: DESIGN_TOKENS.colors.warning[100],
                          color: DESIGN_TOKENS.colors.warning[800],
                          borderRadius: DESIGN_TOKENS.borderRadius.md,
                          fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium
                        }}
                      >
                        <span 
                          style={{
                            width: '6px',
                            height: '6px',
                            backgroundColor: DESIGN_TOKENS.colors.warning[500],
                            borderRadius: '50%'
                          }}
                        />
                        未保存
                      </div>
                    )}
                    
                    {currentProject.status === 'published' && (
                      <div 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: DESIGN_TOKENS.spacing[1],
                          padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[2]}`,
                          backgroundColor: DESIGN_TOKENS.colors.success[100],
                          color: DESIGN_TOKENS.colors.success[800],
                          borderRadius: DESIGN_TOKENS.borderRadius.md,
                          fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium
                        }}
                      >
                        <span 
                          style={{
                            width: '6px',
                            height: '6px',
                            backgroundColor: DESIGN_TOKENS.colors.success[500],
                            borderRadius: '50%'
                          }}
                        />
                        公開中
                      </div>
                    )}
                  </div>
                </div>

                {/* 右側: アクション */}
                <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[2] }}>
                  {/* 容量表示 */}
                  <div 
                    style={{
                      fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                      color: DESIGN_TOKENS.colors.neutral[600],
                      marginRight: DESIGN_TOKENS.spacing[2]
                    }}
                  >
                    {(getTotalSize() / 1024 / 1024).toFixed(1)}MB
                  </div>

                  {/* アクションボタン */}
                  <ModernButton
                    variant="secondary"
                    size="sm"
                    icon="💾"
                    onClick={handleSave}
                    disabled={!hasUnsavedChanges}
                  >
                    保存
                  </ModernButton>
                  
                  <ModernButton
                    variant="outline"
                    size="sm"
                    icon="▶️"
                    onClick={handleTestPlay}
                    disabled={isTestPlaying}
                  >
                    テスト
                  </ModernButton>
                  
                  <ModernButton
                    variant="primary"
                    size="sm"
                    icon="🚀"
                    onClick={handlePublish}
                  >
                    公開
                  </ModernButton>
                </div>
              </div>
            </div>
          </header>
          
          {/* エディター本体 */}
          <GameEditor
            project={currentProject}
            onProjectUpdate={updateProject}
            onSave={handleSave}
            onPublish={handlePublish}
            onTestPlay={handleTestPlay}
            tabs={getProgressTabConfig(currentProject)}
          />
        </div>
      ) : (
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: DESIGN_TOKENS.colors.neutral[50]
          }}
        >
          <ModernCard variant="elevated" size="xl">
            <div style={{ textAlign: 'center' }}>
              <div 
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize['6xl'],
                  marginBottom: DESIGN_TOKENS.spacing[4]
                }}
              >
                📂
              </div>
              <h2 
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize['2xl'],
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                  color: DESIGN_TOKENS.colors.neutral[800],
                  margin: `0 0 ${DESIGN_TOKENS.spacing[2]} 0`
                }}
              >
                プロジェクトが選択されていません
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN_TOKENS.spacing[3] }}>
                <ModernButton
                  variant="primary"
                  size="lg"
                  icon="📁"
                  onClick={handleBackToSelector}
                >
                  プロジェクト一覧に戻る
                </ModernButton>
                <ModernButton
                  variant="outline"
                  size="lg"
                  icon="🏠"
                  onClick={handleExitToMain}
                >
                  メイン画面に戻る
                </ModernButton>
              </div>
            </div>
          </ModernCard>
        </div>
      )}

      {/* キーボードショートカットヘルプ */}
      <div 
        style={{
          position: 'fixed',
          bottom: DESIGN_TOKENS.spacing[2],
          left: DESIGN_TOKENS.spacing[2],
          fontSize: DESIGN_TOKENS.typography.fontSize.xs,
          color: DESIGN_TOKENS.colors.neutral[400],
          zIndex: DESIGN_TOKENS.zIndex[10]
        }}
      >
        <div>Game Editor v1.0.0 - Phase 1-C テストプレイ対応版</div>
        <div>💡 Ctrl+S: 保存 | Ctrl+T: テストプレイ | Esc: 戻る | Ctrl+Q: メイン画面</div>
      </div>
    </div>
  );
};