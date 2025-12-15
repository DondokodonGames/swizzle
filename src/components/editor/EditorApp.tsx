// src/components/editor/EditorApp.tsx
// 🔧 フリーズ修正版 + updateProject 修正版
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { GameProject } from '../../types/editor/GameProject';
import { GameEditor } from './GameEditor';
import { ProjectSelector } from './ProjectSelector';
import { useGameProject } from '../../hooks/editor/useGameProject';
import { useAuth } from '../../hooks/useAuth';
import { DEFAULT_EDITOR_TABS, getProgressTabConfig } from './common/TabNavigation';
import { DESIGN_TOKENS } from '../../constants/DesignSystem';
import { ModernButton } from '../ui/ModernButton';
import { ModernCard } from '../ui/ModernCard';
import { EditorGameBridge, GameExecutionResult } from '../../services/editor/EditorGameBridge';
import { ProjectStorageManager } from '../../services/ProjectStorageManager';
import { useCredits } from '../../hooks/monetization/useCredits';
import { usePaywall } from '../../hooks/monetization/usePaywall';
import { PaywallModal } from '../monetization/PaywallModal';

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
  const { t } = useTranslation();
  const [mode, setMode] = useState<AppMode>('selector');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    id: string;
  } | null>(null);

  const [isTestPlaying, setIsTestPlaying] = useState(false);
  const [testPlayResult, setTestPlayResult] = useState<GameExecutionResult | null>(null);
  const testPlayContainerRef = useRef<HTMLDivElement>(null);
  const gameBridge = useRef(EditorGameBridge.getInstance());

  const { user, loading: authLoading } = useAuth();
  const { canCreateGame, usage, loading: creditsLoading } = useCredits();
  const { shouldShowPaywall, openPaywall, closePaywall } = usePaywall();

  const isMonetizationReady = !authLoading && !creditsLoading;
  
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
    getValidationErrors,
    setCurrentProjectDirectly
  } = useGameProject();

  // 初期化処理
  useEffect(() => {
    if (initialProjectId) {
      handleProjectSelect({ id: initialProjectId } as GameProject);
    }
  }, [initialProjectId]);

  const showNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const notificationId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setNotification({ type, message, id: notificationId });
    setTimeout(() => {
      setNotification(prev => prev?.id === notificationId ? null : prev);
    }, 5000);
  }, []);

  // ✅ プロジェクト選択（受け取ったprojectをそのまま使用）
  const handleProjectSelect = useCallback(async (project: GameProject) => {
    try {
      console.log('[EditorApp] 📂 プロジェクト選択:', project.id, project.name);
      setCurrentProjectDirectly(project);
      setMode('editor');
      showNotification('success', t('editor.app.projectOpened', { name: project.name }));
    } catch (error: any) {
      showNotification('error', `${t('errors.projectLoadFailed')}: ${error.message}`);
    }
  }, [setCurrentProjectDirectly, showNotification, t]);

  const handleCreateNew = useCallback(async (name: string) => {
    if (!canCreateGame) {
      openPaywall();
      return;
    }

    try {
      const newProject = await createProject(name);
      setMode('editor');
      showNotification('success', t('editor.app.projectCreated', { name }));
    } catch (error: any) {
      showNotification('error', `${t('errors.generic')}: ${error.message}`);
    }
  }, [createProject, showNotification, t, canCreateGame, openPaywall]);

  const handleSave = useCallback(async () => {
    if (!currentProject) return;

    try {
      const errors = getValidationErrors();
      if (errors.length > 0) {
        console.warn('Validation warnings on save:', errors);
      }

      await saveProject();

      showNotification('success', t('editor.app.projectSaved'));

      // ✅ 修正: updater関数を使用
      updateProject(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          statistics: {
            ...(prev.metadata?.statistics || {}),
            saveCount: ((prev.metadata?.statistics?.saveCount || 0) + 1)
          }
        }
      }));

    } catch (error: any) {
      console.error('Save failed:', error);
      showNotification('error', `${t('errors.projectSaveFailed')}: ${error.message}`);
    }
  }, [currentProject, saveProject, getValidationErrors, updateProject, showNotification, t]);

  const handleTestPlay = useCallback(async () => {
    if (!currentProject) return;

    const errors = getValidationErrors();
    if (errors.length > 0) {
      showNotification('error', `${t('errors.testPlayFailed')}: ${errors[0]}`);
      return;
    }

    if (!currentProject.settings.name?.trim()) {
      showNotification('error', t('errors.gameNameRequired'));
      return;
    }

    if (!currentProject.assets.objects.length && !currentProject.assets.background) {
      showNotification('error', t('errors.noAssets'));
      return;
    }

    setIsTestPlaying(true);
    showNotification('info', t('editor.settings.testPlay.testing'));

    try {
      setMode('testplay');
      
      await new Promise<void>((resolve) => {
        const checkElement = () => {
          if (testPlayContainerRef.current) {
            resolve();
          } else {
            requestAnimationFrame(checkElement);
          }
        };
        checkElement();
      });

      if (!testPlayContainerRef.current) {
        throw new Error(t('editor.app.testPlayScreenFailed'));
      }

      console.log('✅ テストプレイ画面準備完了、ゲーム実行開始');

      await gameBridge.current.launchFullGame(
        currentProject,
        testPlayContainerRef.current,
        (result: GameExecutionResult) => {
          setTestPlayResult(result);
          setIsTestPlaying(false);

          if (result.success) {
            showNotification('success', t('editor.app.testPlayComplete', { score: result.score || 0 }));
          } else {
            showNotification('error', t('editor.app.testPlayError', { error: result.errors.join(', ') }));
          }

          // ✅ 修正: updater関数を使用
          updateProject(prev => ({
            ...prev,
            metadata: {
              ...prev.metadata,
              statistics: {
                ...(prev.metadata?.statistics || {}),
                testPlayCount: ((prev.metadata?.statistics?.testPlayCount || 0) + 1)
              },
              performance: {
                ...(prev.metadata?.performance || {}),
                lastBuildTime: result.performance.renderTime,
                averageFPS: result.performance.averageFPS,
                memoryUsage: result.performance.memoryUsage
              }
            }
          }));
        }
      );
    } catch (error: any) {
      console.error('テストプレイエラー:', error);
      setIsTestPlaying(false);
      showNotification('error', t('editor.app.testPlayFailed', { error: error.message }));
      setMode('editor');
    }
  }, [currentProject, getValidationErrors, updateProject, showNotification]);

  const handleTestPlayEnd = useCallback(() => {
    setMode('editor');
    setTestPlayResult(null);
    gameBridge.current.reset();
    showNotification('info', t('editor.app.returnedToEditor'));
  }, [showNotification, t]);

  const handlePublish = useCallback(async () => {
    if (!currentProject) return;

    if (!canCreateGame) {
      openPaywall();
      return;
    }

    if (!user) {
      showNotification('error', t('editor.app.publishRequiresLogin'));
      return;
    }

    const errors = getValidationErrors();
    if (errors.length > 0) {
      showNotification('error', t('editor.app.publishCannotWithErrors', { error: errors[0] }));
      return;
    }

    try {
      showNotification('info', t('editor.app.publishingStarted'));

      await saveProject();

      const publishedProject: GameProject = {
        ...currentProject,
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
            ...(currentProject.metadata?.statistics || {}),
            publishCount: ((currentProject.metadata?.statistics?.publishCount || 0) + 1)
          },
          lastSyncedAt: new Date().toISOString()
        }
      };

      // ✅ 修正: updater関数を使用
      updateProject(prev => ({
        ...prev,
        status: 'published',
        settings: publishedProject.settings,
        metadata: publishedProject.metadata
      }));

      const storageManager = ProjectStorageManager.getInstance();
      await storageManager.saveProject(publishedProject, {
        saveToDatabase: true,
        userId: user.id
      });

      await saveProject();

      showNotification('success', t('editor.app.projectPublishedSuccess'));
      
      console.log('✅ Game published successfully:', {
        projectId: publishedProject.id,
        projectName: publishedProject.settings?.name || publishedProject.name,
        userId: user.id,
        publishedAt: publishedProject.settings.publishing.publishedAt,
        isPublished: publishedProject.status === 'published'
      });

    } catch (error: any) {
      console.error('Publish failed:', error);

      let errorMessage = t('editor.app.publishFailed');

      if (error.message?.includes('データベース保存に失敗')) {
        errorMessage = t('editor.app.publishFailedNetwork');
      } else if (error.message?.includes('認証')) {
        errorMessage = t('editor.app.publishFailedAuth');
      } else if (error.message) {
        errorMessage = t('editor.app.publishFailedWithError', { error: error.message });
      }

      showNotification('error', errorMessage);
      
      // ✅ 修正: updater関数を使用
      updateProject(prev => ({
        ...prev,
        status: 'draft',
        settings: {
          ...prev.settings,
          publishing: {
            ...prev.settings.publishing,
            isPublished: false
          }
        }
      }));
    }
  }, [currentProject, user, getValidationErrors, saveProject, updateProject, showNotification]);

  // ✅ GameEditor.tsx用のラッパー関数（GameProject → updater関数に変換）
  const handleGameEditorUpdate = useCallback((updatedProject: GameProject) => {
    updateProject(() => updatedProject);
  }, [updateProject]);

  const handleBackToSelector = useCallback(async () => {
    if (hasUnsavedChanges) {
      const shouldSave = window.confirm(t('editor.app.confirmSaveAndLeave'));

      if (shouldSave) {
        try {
          await handleSave();
          showNotification('success', t('editor.app.savedComplete'));
        } catch (error) {
          console.error('Save failed:', error);
        }
      }
    }

    setMode('selector');
    gameBridge.current.reset();
    showNotification('info', t('editor.app.returnedToList'));
  }, [hasUnsavedChanges, handleSave, showNotification, t]);

  const handleExitToMain = useCallback(async () => {
    if (hasUnsavedChanges) {
      const shouldSave = window.confirm(t('editor.app.confirmSaveAndExit'));

      if (shouldSave) {
        try {
          await handleSave();
          showNotification('success', t('editor.app.savedComplete'));
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
      showNotification('info', t('editor.app.returnToMainLoading'));
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }, [hasUnsavedChanges, handleSave, showNotification, onClose]);

  const handleProjectDelete = useCallback(async (projectId: string) => {
    try {
      await deleteProject(projectId);
      showNotification('success', t('editor.app.projectDeleted'));
    } catch (error: any) {
      showNotification('error', t('editor.app.deleteFailed', { error: error.message }));
    }
  }, [deleteProject, showNotification]);

  const handleProjectDuplicate = useCallback(async (projectId: string) => {
    try {
      const originalProject = currentProject || { name: t('editor.app.copy') } as GameProject;
      const newName = `${originalProject.name}${t('editor.app.copyOf')}`;
      const duplicated = await duplicateProject(projectId, newName);
      showNotification('success', t('editor.app.projectDuplicated', { name: duplicated.name }));
    } catch (error: any) {
      showNotification('error', t('editor.app.duplicateFailed', { error: error.message }));
    }
  }, [currentProject, duplicateProject, showNotification]);

  const handleExport = useCallback(async (projectId: string) => {
    try {
      if (currentProject) {
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
        
        showNotification('success', t('editor.app.projectExported'));
      }
    } catch (error: any) {
      showNotification('error', t('editor.app.exportFailedWithError', { error: error.message }));
    }
  }, [currentProject, showNotification]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if ((mode === 'editor' || mode === 'testplay') && currentProject) {
          handleSave();
        }
      }
      
      if (event.key === 'Escape') {
        if (mode === 'testplay') {
          handleTestPlayEnd();
        } else if (mode === 'editor') {
          handleBackToSelector();
        }
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'q') {
        event.preventDefault();
        handleExitToMain();
      }

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
      {isMonetizationReady && (
        <PaywallModal
          isOpen={shouldShowPaywall}
          onClose={closePaywall}
          currentUsage={usage || undefined}
        />
      )}

      {(loading || authLoading || creditsLoading) && (
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
                {authLoading ? t('editor.app.authenticating') : creditsLoading ? t('editor.app.loadingAccount') : t('editor.app.loading')}
              </p>
            </div>
          </ModernCard>
        </div>
      )}

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

      {!authLoading && !user ? (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: DESIGN_TOKENS.spacing[6],
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          }}
        >
          <ModernCard variant="elevated" size="xl">
            <div style={{ textAlign: 'center', maxWidth: '500px' }}>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  margin: '0 auto 24px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 10px 25px rgba(102, 126, 234, 0.3)'
                }}
              >
                <svg
                  style={{ width: '48px', height: '48px', color: 'white' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>

              <h2
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize['3xl'],
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                  color: DESIGN_TOKENS.colors.neutral[900],
                  marginBottom: DESIGN_TOKENS.spacing[4]
                }}
              >
                {t('editor.app.loginRequiredTitle')}
              </h2>

              <p
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                  color: DESIGN_TOKENS.colors.neutral[600],
                  marginBottom: DESIGN_TOKENS.spacing[6],
                  lineHeight: '1.6'
                }}
              >
                {t('editor.app.loginRequiredMessage')}
                <br />
                {t('editor.app.loginPrompt')}
              </p>

              <div
                style={{
                  backgroundColor: DESIGN_TOKENS.colors.neutral[50],
                  borderRadius: DESIGN_TOKENS.borderRadius.lg,
                  padding: DESIGN_TOKENS.spacing[4],
                  marginBottom: DESIGN_TOKENS.spacing[6],
                  textAlign: 'left'
                }}
              >
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {[
                    t('editor.app.features.createProjects'),
                    t('editor.app.features.cloudStorage'),
                    t('editor.app.features.publishGames'),
                    t('editor.app.features.joinCommunity')
                  ].map((feature, index) => (
                    <li
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: index < 3 ? DESIGN_TOKENS.spacing[3] : 0
                      }}
                    >
                      <svg
                        style={{
                          width: '20px',
                          height: '20px',
                          minWidth: '20px',
                          minHeight: '20px',
                          marginRight: DESIGN_TOKENS.spacing[3],
                          color: DESIGN_TOKENS.colors.success[600]
                        }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span
                        style={{
                          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                          color: DESIGN_TOKENS.colors.neutral[700]
                        }}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[3] }}>
                <ModernButton
                  variant="primary"
                  size="lg"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('openAuthModal', {
                      detail: { mode: 'signup' }
                    }));
                  }}
                  style={{ flex: 1 }}
                >
                  {t('editor.app.freeSignup')}
                </ModernButton>
                <ModernButton
                  variant="secondary"
                  size="lg"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('openAuthModal', {
                      detail: { mode: 'signin' }
                    }));
                  }}
                  style={{ flex: 1 }}
                >
                  {t('common.login')}
                </ModernButton>
              </div>

              {onClose && (
                <div style={{ marginTop: DESIGN_TOKENS.spacing[4] }}>
                  <ModernButton
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                  >
                    {t('editor.app.backToMainArrow')}
                  </ModernButton>
                </div>
              )}
            </div>
          </ModernCard>
        </div>
      ) : mode === 'selector' ? (
        <ProjectSelector
          onProjectSelect={handleProjectSelect}
          onCreateNew={handleCreateNew}
          onDelete={handleProjectDelete}
          onDuplicate={handleProjectDuplicate}
          onExport={handleExport}
        />
      ) : mode === 'testplay' ? (
        <div style={{ minHeight: '100vh', backgroundColor: DESIGN_TOKENS.colors.neutral[900] }}>
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
                    🎮 {currentProject?.settings.name || t('editor.app.testPlay')}
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
                      {t('editor.app.running')}
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
                    {t('editor.app.rerun')}
                  </ModernButton>
                  
                  <ModernButton
                    variant="outline"
                    size="sm"
                    icon="←"
                    onClick={handleTestPlayEnd}
                  >
                    {t('editor.app.returnToEditor')}
                  </ModernButton>
                </div>
              </div>
            </div>
          </header>

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
                  <p>{t('editor.app.preparingGame')}</p>
                </div>
              )}
            </div>
          </div>

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
                    {testPlayResult.success ? t('editor.app.testPlaySuccess') : t('editor.app.testPlayFailure')}
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
                      {currentProject.name || currentProject.settings.name || t('editor.app.myGame')}
                    </h1>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[2] }}>
                    {!user && (
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
                        {t('editor.app.status.notLoggedIn')}
                      </div>
                    )}

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
                        {t('editor.app.status.unsaved')}
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
                        {t('editor.app.status.published')}
                      </div>
                    )}
                  </div>
                </div>

                <div 
                  style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                    color: DESIGN_TOKENS.colors.neutral[600]
                  }}
                >
                  {(getTotalSize() / 1024 / 1024).toFixed(1)}MB
                </div>
              </div>
            </div>
          </header>
          
          <GameEditor
            project={currentProject}
            onProjectUpdate={handleGameEditorUpdate}
            onSave={handleSave}
            onPublish={handlePublish}
            onTestPlay={handleTestPlay}
            tabs={getProgressTabConfig(currentProject, t)}
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
                  icon="📋"
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
        <div>Game Editor v1.2.1 - updateProject修正版</div>
        <div>💡 Ctrl+S: 保存 | Ctrl+T: テストプレイ | Esc: 戻る | Ctrl+Q: メイン画面</div>
      </div>
    </div>
  );
};