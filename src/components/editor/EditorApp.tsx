import React, { useState, useCallback, useEffect } from 'react';
import { GameProject } from '../../types/editor/GameProject';
import { GameEditor } from './GameEditor';
import { ProjectSelector } from './ProjectSelector';
import { useGameProject } from '../../hooks/editor/useGameProject';
import { DEFAULT_EDITOR_TABS, getProgressTabConfig } from './common/TabNavigation';

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
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
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

    // TODO: 実際のテストプレイ機能を実装
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
      // TODO: 実際の公開処理（API呼び出し等）
    } catch (error: any) {
      showNotification('error', `公開に失敗しました: ${error.message}`);
    }
  }, [currentProject, getValidationErrors, saveProject, updateProject, showNotification]);

  // ✨ エディターから戻る処理（修正版）
  const handleBackToSelector = useCallback(async () => {
    if (hasUnsavedChanges) {
      const shouldSave = window.confirm('未保存の変更があります。保存してから戻りますか？\n\n「OK」→保存して戻る\n「キャンセル」→保存せずに戻る');
      
      if (shouldSave) {
        try {
          await handleSave();
          showNotification('success', '保存完了');
        } catch (error) {
          console.error('Save failed:', error);
          // 保存失敗でも戻る処理は続行
        }
      }
    }
    
    setMode('selector');
    showNotification('info', 'プロジェクト一覧に戻りました');
  }, [hasUnsavedChanges, handleSave, showNotification]);

  // ✨ アプリ全体を閉じる処理（修正版）
  const handleExitToMain = useCallback(async () => {
    if (hasUnsavedChanges) {
      const shouldSave = window.confirm('未保存の変更があります。保存してから終了しますか？\n\n「OK」→保存して終了\n「キャンセル」→保存せずに終了');
      
      if (shouldSave) {
        try {
          await handleSave();
          showNotification('success', '保存完了');
          // 少し待ってから終了
          setTimeout(() => {
            if (onClose) onClose();
          }, 1000);
          return;
        } catch (error) {
          console.error('Save failed:', error);
          // 保存失敗でも終了処理は続行
        }
      }
    }
    
    if (onClose) {
      onClose();
    } else {
      // フォールバック: ページリロード
      showNotification('info', 'メイン画面に戻ります...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }, [hasUnsavedChanges, handleSave, showNotification, onClose]);

  // プロジェクト削除（プロジェクトセレクターから）
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
      // ProjectStorageを使用したエクスポートは既にProjectSelectorで実装済み
      // ここでは通知のみ表示
      showNotification('success', 'プロジェクトをエクスポートしました');
    } catch (error: any) {
      showNotification('error', `エクスポートに失敗しました: ${error.message}`);
    }
  }, [showNotification]);

  // キーボードショートカット（改善版）
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
    <div className={`editor-app min-h-screen bg-gray-50 ${className}`}>
      {/* ローディング表示 */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p className="text-lg font-semibold text-gray-800">読み込み中...</p>
          </div>
        </div>
      )}

      {/* 通知表示 */}
      {notification && (
        <div className="fixed top-4 right-4 z-40 max-w-md">
          <div className={`p-4 rounded-2xl shadow-lg border-l-4 ${
            notification.type === 'success' ? 'bg-green-50 border-green-500 text-green-800' :
            notification.type === 'error' ? 'bg-red-50 border-red-500 text-red-800' :
            'bg-blue-50 border-blue-500 text-blue-800'
          }`}>
            <div className="flex items-center">
              <span className="text-xl mr-3">
                {notification.type === 'success' ? '✅' :
                 notification.type === 'error' ? '❌' : 'ℹ️'}
              </span>
              <p className="font-medium">{notification.message}</p>
              <button
                onClick={() => setNotification(null)}
                className="ml-auto text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="fixed top-4 left-4 right-4 z-40">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center">
              <span className="text-red-500 text-xl mr-3">⚠️</span>
              <p className="text-red-800 font-medium flex-1">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="ml-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-colors"
              >
                再読み込み
              </button>
            </div>
          </div>
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
        <div>
          {/* ✨ エディターヘッダー（ナビゲーション改善版） */}
          <div className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center py-2">
                {/* 戻るボタン（改善版） */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleBackToSelector}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all"
                    title="プロジェクト一覧に戻る (Esc)"
                  >
                    <span className="text-lg">←</span>
                    <span>一覧に戻る</span>
                  </button>
                  
                  <div className="h-6 w-px bg-gray-300"></div>
                  
                  <button
                    onClick={handleExitToMain}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all"
                    title="メイン画面に戻る (Ctrl+Q)"
                  >
                    <span className="text-lg">🏠</span>
                    <span>メイン画面</span>
                  </button>
                </div>
                
                {/* プロジェクト進捗表示 */}
                <div className="ml-auto flex items-center space-x-4 text-sm">
                  <div className="text-gray-600">
                    容量: {(getTotalSize() / 1024 / 1024).toFixed(1)}MB
                  </div>
                  {hasUnsavedChanges && (
                    <div className="text-orange-600 font-medium flex items-center space-x-1">
                      <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                      <span>未保存</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
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
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-6xl mb-4">📂</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">プロジェクトが選択されていません</h2>
            <div className="space-y-3">
              <button
                onClick={handleBackToSelector}
                className="block px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium transition-colors"
              >
                プロジェクト一覧に戻る
              </button>
              <button
                onClick={handleExitToMain}
                className="block px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
              >
                メイン画面に戻る
              </button>
            </div>
          </div>
        </div>
      )}

      {/* キーボードショートカットヘルプ（フッター） */}
      <div className="fixed bottom-2 left-2 text-xs text-gray-400">
        <div>Game Editor v1.0.0 - ナビゲーション修正版</div>
        <div>💡 Ctrl+S: 保存 | Esc: 一覧に戻る | Ctrl+Q: メイン画面に戻る</div>
      </div>
    </div>
  );
};