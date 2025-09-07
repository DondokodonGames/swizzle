// src/components/navigation/NavigationManager.tsx
// Phase 1-A: エディター↔ゲーム切り替えナビゲーション実装
// 基準: 引継ぎプロンプト・UI/UX設計指針書

import React, { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Home, Play, Edit, Save, Settings } from 'lucide-react';
import { GameProject } from '../../types/editor/GameProject';
import { useGameTheme } from '../ui/GameThemeProvider';

// ナビゲーション状態管理
type NavigationState = 'home' | 'game-list' | 'editor' | 'game-play' | 'settings';

interface NavigationContext {
  currentState: NavigationState;
  project: GameProject | null;
  canGoBack: boolean;
  navigationHistory: NavigationState[];
}

interface NavigationManagerProps {
  children: React.ReactNode;
  onNavigate: (state: NavigationState, project?: GameProject) => void;
  onSaveProject?: (project: GameProject) => Promise<void>;
  onTestPlay?: (project: GameProject) => void;
}

// ナビゲーションフック
export const useNavigation = () => {
  const [context, setContext] = useState<NavigationContext>({
    currentState: 'home',
    project: null,
    canGoBack: false,
    navigationHistory: ['home']
  });

  const navigateTo = useCallback((state: NavigationState, project?: GameProject) => {
    setContext(prev => {
      const newHistory = [...prev.navigationHistory, state];
      // 履歴を10個まで制限
      if (newHistory.length > 10) {
        newHistory.shift();
      }

      return {
        currentState: state,
        project: project || prev.project,
        canGoBack: newHistory.length > 1,
        navigationHistory: newHistory
      };
    });
  }, []);

  const goBack = useCallback(() => {
    setContext(prev => {
      if (prev.navigationHistory.length <= 1) {
        return prev; // 戻れない場合は変更なし
      }

      const newHistory = [...prev.navigationHistory];
      newHistory.pop(); // 現在の状態を削除
      const previousState = newHistory[newHistory.length - 1];

      return {
        ...prev,
        currentState: previousState,
        canGoBack: newHistory.length > 1,
        navigationHistory: newHistory
      };
    });
  }, []);

  const goHome = useCallback(() => {
    setContext(prev => ({
      currentState: 'home',
      project: null,
      canGoBack: false,
      navigationHistory: ['home']
    }));
  }, []);

  return {
    context,
    navigateTo,
    goBack,
    goHome
  };
};

// メインナビゲーションマネージャー
export const NavigationManager: React.FC<NavigationManagerProps> = ({
  children,
  onNavigate,
  onSaveProject,
  onTestPlay
}) => {
  const { context, navigateTo, goBack, goHome } = useNavigation();
  const { currentTheme } = useGameTheme();
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // ナビゲーション変更の通知
  useEffect(() => {
    onNavigate(context.currentState, context.project || undefined);
  }, [context.currentState, context.project, onNavigate]);

  // エディター→ゲーム実行
  const handleTestPlay = useCallback(async () => {
    if (!context.project) return;

    try {
      // 保存が必要な場合は先に保存
      if (unsavedChanges && onSaveProject) {
        await onSaveProject(context.project);
        setUnsavedChanges(false);
      }

      // ゲーム実行
      if (onTestPlay) {
        onTestPlay(context.project);
      }

      // ゲームプレイ状態に切り替え
      navigateTo('game-play', context.project);
    } catch (error) {
      console.error('Failed to start test play:', error);
      // エラー通知（将来実装）
    }
  }, [context.project, unsavedChanges, onSaveProject, onTestPlay, navigateTo]);

  // プロジェクト保存
  const handleSave = useCallback(async () => {
    if (!context.project || !onSaveProject) return;

    try {
      await onSaveProject(context.project);
      setUnsavedChanges(false);
      console.log('Project saved successfully');
    } catch (error) {
      console.error('Failed to save project:', error);
      // エラー通知（将来実装）
    }
  }, [context.project, onSaveProject]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+S で保存
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        handleSave();
      }
      
      // Escape でホームに戻る
      if (event.key === 'Escape') {
        goHome();
      }
      
      // Alt+Left で戻る
      if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault();
        goBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, goHome, goBack]);

  return (
    <div className="navigation-manager" style={{
      background: currentTheme.colors.background,
      color: currentTheme.colors.text
    }}>
      {/* ナビゲーションヘッダー */}
      <NavigationHeader
        context={context}
        onGoBack={goBack}
        onGoHome={goHome}
        onSave={handleSave}
        onTestPlay={handleTestPlay}
        unsavedChanges={unsavedChanges}
      />
      
      {/* メインコンテンツ */}
      <div className="navigation-content">
        {children}
      </div>
      
      {/* ナビゲーション状態表示（開発中のみ） */}
      {process.env.NODE_ENV === 'development' && (
        <NavigationDebugInfo context={context} />
      )}
    </div>
  );
};

// ナビゲーションヘッダー
interface NavigationHeaderProps {
  context: NavigationContext;
  onGoBack: () => void;
  onGoHome: () => void;
  onSave: () => void;
  onTestPlay: () => void;
  unsavedChanges: boolean;
}

const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  context,
  onGoBack,
  onGoHome,
  onSave,
  onTestPlay,
  unsavedChanges
}) => {
  const { currentTheme } = useGameTheme();

  return (
    <header className="navigation-header" style={{
      background: `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`,
      color: currentTheme.colors.text,
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
    }}>
      {/* 戻るボタン */}
      {context.canGoBack && (
        <button
          onClick={onGoBack}
          className="nav-button"
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            borderRadius: '8px',
            padding: '8px',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            transition: 'all 0.2s ease'
          }}
          title="戻る (Alt+←)"
        >
          <ArrowLeft size={20} />
        </button>
      )}

      {/* ホームボタン */}
      <button
        onClick={onGoHome}
        className="nav-button"
        style={{
          background: 'rgba(255, 255, 255, 0.2)',
          border: 'none',
          borderRadius: '8px',
          padding: '8px',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          transition: 'all 0.2s ease'
        }}
        title="ホーム (Esc)"
      >
        <Home size={20} />
      </button>

      {/* プロジェクト名 */}
      <div className="project-info" style={{
        flex: 1,
        marginLeft: '16px'
      }}>
        {context.project && (
          <>
            <h1 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '600'
            }}>
              {context.project.name}
              {unsavedChanges && (
                <span style={{
                  marginLeft: '8px',
                  fontSize: '14px',
                  opacity: 0.8
                }}>
                  • 未保存
                </span>
              )}
            </h1>
            <div style={{
              fontSize: '12px',
              opacity: 0.8,
              marginTop: '2px'
            }}>
              {getStateDisplayName(context.currentState)}
            </div>
          </>
        )}
      </div>

      {/* アクションボタン群 */}
      <div className="action-buttons" style={{
        display: 'flex',
        gap: '8px'
      }}>
        {/* 保存ボタン（エディター時のみ） */}
        {context.currentState === 'editor' && context.project && (
          <button
            onClick={onSave}
            className="action-button"
            style={{
              background: unsavedChanges ? currentTheme.colors.warning : 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 12px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            title="保存 (Ctrl+S)"
          >
            <IconSave size={16} />
            保存
          </button>
        )}

        {/* テストプレイボタン（エディター時のみ） */}
        {context.currentState === 'editor' && context.project && (
          <button
            onClick={onTestPlay}
            className="action-button"
            style={{
              background: currentTheme.colors.success,
              border: 'none',
              borderRadius: '8px',
              padding: '8px 12px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            title="テストプレイ"
          >
            <IconPlay size={16} />
            テスト
          </button>
        )}

        {/* エディター戻るボタン（ゲームプレイ時のみ） */}
        {context.currentState === 'game-play' && context.project && (
          <button
            onClick={() => window.history.back()}
            className="action-button"
            style={{
              background: currentTheme.colors.primary,
              border: 'none',
              borderRadius: '8px',
              padding: '8px 12px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            title="エディターに戻る"
          >
            <IconEdit size={16} />
            エディター
          </button>
        )}
      </div>
    </header>
  );
};

// 開発用デバッグ情報
const NavigationDebugInfo: React.FC<{ context: NavigationContext }> = ({ context }) => (
  <div style={{
    position: 'fixed',
    bottom: '10px',
    right: '10px',
    background: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    padding: '8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
    zIndex: 9999
  }}>
    <div>State: {context.currentState}</div>
    <div>Project: {context.project?.name || 'None'}</div>
    <div>Can Go Back: {context.canGoBack ? 'Yes' : 'No'}</div>
    <div>History: {context.navigationHistory.join(' → ')}</div>
  </div>
);

// ヘルパー関数
function getStateDisplayName(state: NavigationState): string {
  switch (state) {
    case 'home': return 'ホーム';
    case 'game-list': return 'ゲーム一覧';
    case 'editor': return 'エディター';
    case 'game-play': return 'ゲームプレイ';
    case 'settings': return '設定';
    default: return state;
  }
}

// スタイリング（CSS-in-JS）
const styles = `
  .navigation-manager {
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .navigation-content {
    flex: 1;
    overflow: auto;
  }

  .nav-button:hover,
  .action-button:hover {
    transform: translateY(-1px);
    background-color: rgba(255, 255, 255, 0.3) !important;
  }

  .nav-button:active,
  .action-button:active {
    transform: translateY(0);
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    .navigation-header {
      padding: 8px 12px !important;
    }
    
    .project-info h1 {
      font-size: 16px !important;
    }
    
    .action-buttons {
      gap: 4px !important;
    }
    
    .action-button {
      padding: 6px 8px !important;
      font-size: 12px !important;
    }
  }
`;

// スタイルを挿入
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default NavigationManager;