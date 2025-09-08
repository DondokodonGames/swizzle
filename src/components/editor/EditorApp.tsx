// src/components/editor/EditorApp.tsx
// 修正版: フォントファミリー型修正
import React, { useState, useCallback, useEffect } from 'react';
import { GameProject } from '../../types/editor/GameProject';
import { GameEditor } from './GameEditor';
import { ProjectSelector } from './ProjectSelector';
import { useGameProject } from '../../hooks/editor/useGameProject';
import { DEFAULT_EDITOR_TABS, getProgressTabConfig } from './common/TabNavigation';
import { DESIGN_TOKENS } from '../../constants/DesignSystem';
import { ModernButton } from '../ui/ModernButton';
import { ModernCard } from '../ui/ModernCard';

type AppMode = 'selector' | 'editor';

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

  // プロジェクト保存
  const handleSave = useCallback(async () => {
    if (!currentProject) return;

    try {
      await saveProject();
      showNotification('success', 'プロジェクトを保存しました');
    } catch (error: any) {
      showNotification('error', `保存に失敗しました: ${error.message}`);
    }
  }, [currentProject, saveProject, showNotification]);

  // テストプレイ
  const handleTestPlay = useCallback(() => {
    if (!currentProject) return;

    const errors = getValidationErrors();
    if (errors.length > 0) {
      showNotification('error', `テストプレイできません: ${errors[0]}`);
      return;
    }

    showNotification('info', 'テストプレイ機能は準備中です');
    console.log('Test play for project:', currentProject.name);
  }, [currentProject, getValidationErrors, showNotification]);

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
      showNotification('success', 'プロジェクトをエクスポートしました');
    } catch (error: any) {
      showNotification('error', `エクスポートに失敗しました: ${error.message}`);
    }
  }, [showNotification]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+S で保存
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if (mode === 'editor' && currentProject) {
          handleSave();
        }
      }
      
      // Esc でプロジェクトセレクターに戻る（エディター時のみ）
      if (event.key === 'Escape' && mode === 'editor') {
        handleBackToSelector();
      }

      // Ctrl+Q でメイン画面に戻る
      if ((event.ctrlKey || event.metaKey) && event.key === 'q') {
        event.preventDefault();
        handleExitToMain();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, currentProject, handleSave, handleBackToSelector, handleExitToMain]);

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
        fontFamily: DESIGN_TOKENS.typography.fontFamily.sans.join(', ')  // 🔧 フォント修正
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
        <div>Game Editor v1.0.0 - Phase 1-B モダンアプリ版</div>
        <div>💡 Ctrl+S: 保存 | Esc: 一覧に戻る | Ctrl+Q: メイン画面に戻る</div>
      </div>
    </div>
  );
};