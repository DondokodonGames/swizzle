// src/services/editor/ErrorHandlingSystem.tsx
// Phase 1-A: エラーハンドリング・復旧機能実装
// 基準: 引継ぎプロンプト・確実性重視・ユーザーフレンドリー

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AlertTriangle, X, RefreshCcw, Save, Home } from 'lucide-react';
import { useGameTheme } from '../ui/GameThemeProvider';

// エラー型定義
interface AppError {
  id: string;
  type: 'save' | 'load' | 'navigation' | 'game' | 'network' | 'storage' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: string;
  timestamp: Date;
  recovered: boolean;
  userAction?: string;
}

interface ErrorRecoveryAction {
  label: string;
  action: () => void | Promise<void>;
  primary?: boolean;
}

interface ErrorContextType {
  errors: AppError[];
  addError: (error: Omit<AppError, 'id' | 'timestamp' | 'recovered'>) => void;
  removeError: (id: string) => void;
  clearAllErrors: () => void;
  getActiveErrors: () => AppError[];
  recoverError: (id: string) => void;
}

// エラーコンテキスト
const ErrorContext = createContext<ErrorContextType | null>(null);

// エラーハンドリングプロバイダー
export const ErrorHandlingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [errors, setErrors] = useState<AppError[]>([]);

  const addError = useCallback((errorData: Omit<AppError, 'id' | 'timestamp' | 'recovered'>) => {
    const error: AppError = {
      ...errorData,
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      recovered: false
    };

    setErrors(prev => [...prev, error]);

    // 重大エラーの場合はコンソールにも出力
    if (error.severity === 'critical' || error.severity === 'high') {
      console.error('Application Error:', error);
    }

    // 自動削除（重要度により時間調整）
    const timeout = getErrorTimeout(error.severity);
    if (timeout > 0) {
      setTimeout(() => {
        removeError(error.id);
      }, timeout);
    }
  }, []);

  const removeError = useCallback((id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const getActiveErrors = useCallback(() => {
    return errors.filter(error => !error.recovered);
  }, [errors]);

  const recoverError = useCallback((id: string) => {
    setErrors(prev => prev.map(error => 
      error.id === id ? { ...error, recovered: true } : error
    ));
  }, []);

  const value: ErrorContextType = {
    errors,
    addError,
    removeError,
    clearAllErrors,
    getActiveErrors,
    recoverError
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
      <ErrorDisplay />
    </ErrorContext.Provider>
  );
};

// エラーハンドリングフック
export const useErrorHandling = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useErrorHandling must be used within ErrorHandlingProvider');
  }
  return context;
};

// エラー表示コンポーネント
const ErrorDisplay: React.FC = () => {
  const { getActiveErrors, removeError, recoverError } = useErrorHandling();
  const { currentTheme } = useGameTheme();
  const activeErrors = getActiveErrors();

  if (activeErrors.length === 0) {
    return null;
  }

  return (
    <div className="error-display" style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      maxWidth: '400px'
    }}>
      {activeErrors.map(error => (
        <ErrorCard
          key={error.id}
          error={error}
          onDismiss={() => removeError(error.id)}
          onRecover={() => recoverError(error.id)}
        />
      ))}
    </div>
  );
};

// 個別エラーカード
interface ErrorCardProps {
  error: AppError;
  onDismiss: () => void;
  onRecover: () => void;
}

const ErrorCard: React.FC<ErrorCardProps> = ({ error, onDismiss, onRecover }) => {
  const { currentTheme } = useGameTheme();
  const recoveryActions = getRecoveryActions(error, onRecover);

  const severityColors = {
    low: '#10b981',      // green
    medium: '#f59e0b',   // yellow
    high: '#ef4444',     // red
    critical: '#dc2626'  // dark red
  };

  return (
    <div className="error-card" style={{
      background: currentTheme.colors.surface,
      border: `2px solid ${severityColors[error.severity]}`,
      borderRadius: '12px',
      padding: '16px',
      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
      color: currentTheme.colors.text,
      animation: 'slideIn 0.3s ease-out'
    }}>
      {/* ヘッダー */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <IconAlertTriangle 
            size={20} 
            color={severityColors[error.severity]}
          />
          <span style={{
            fontWeight: '600',
            fontSize: '14px'
          }}>
            {getErrorTypeDisplayName(error.type)}
          </span>
          <span style={{
            fontSize: '12px',
            padding: '2px 6px',
            borderRadius: '4px',
            background: severityColors[error.severity],
            color: 'white'
          }}>
            {error.severity.toUpperCase()}
          </span>
        </div>
        
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: currentTheme.colors.text,
            cursor: 'pointer',
            padding: '4px',
            opacity: 0.7
          }}
          title="閉じる"
        >
          <IconX size={16} />
        </button>
      </div>

      {/* メッセージ */}
      <div style={{
        marginBottom: '12px'
      }}>
        <p style={{
          margin: 0,
          fontSize: '14px',
          lineHeight: '1.4'
        }}>
          {error.message}
        </p>
        {error.details && (
          <details style={{
            marginTop: '8px',
            fontSize: '12px',
            opacity: 0.8
          }}>
            <summary style={{ cursor: 'pointer' }}>詳細を表示</summary>
            <pre style={{
              marginTop: '4px',
              padding: '8px',
              background: 'rgba(0, 0, 0, 0.1)',
              borderRadius: '4px',
              fontSize: '11px',
              overflow: 'auto'
            }}>
              {error.details}
            </pre>
          </details>
        )}
      </div>

      {/* 復旧アクション */}
      {recoveryActions.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          {recoveryActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              style={{
                background: action.primary ? currentTheme.colors.primary : 'rgba(0, 0, 0, 0.1)',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                color: action.primary ? 'white' : currentTheme.colors.text,
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* タイムスタンプ */}
      <div style={{
        marginTop: '8px',
        fontSize: '11px',
        opacity: 0.6,
        textAlign: 'right'
      }}>
        {error.timestamp.toLocaleTimeString()}
      </div>
    </div>
  );
};

// エラー処理ユーティリティ関数
export const createErrorHandler = () => {
  const { addError } = useErrorHandling();

  return {
    // 保存エラー
    handleSaveError: (message: string, details?: string) => {
      addError({
        type: 'save',
        severity: 'high',
        message: `保存に失敗しました: ${message}`,
        details,
        userAction: 'retry_save'
      });
    },

    // 読み込みエラー
    handleLoadError: (message: string, details?: string) => {
      addError({
        type: 'load',
        severity: 'high',
        message: `読み込みに失敗しました: ${message}`,
        details,
        userAction: 'retry_load'
      });
    },

    // ナビゲーションエラー
    handleNavigationError: (message: string, details?: string) => {
      addError({
        type: 'navigation',
        severity: 'medium',
        message: `ナビゲーションエラー: ${message}`,
        details,
        userAction: 'go_home'
      });
    },

    // ゲームエラー
    handleGameError: (message: string, details?: string) => {
      addError({
        type: 'game',
        severity: 'medium',
        message: `ゲームエラー: ${message}`,
        details,
        userAction: 'restart_game'
      });
    },

    // ネットワークエラー
    handleNetworkError: (message: string, details?: string) => {
      addError({
        type: 'network',
        severity: 'low',
        message: `ネットワークエラー: ${message}`,
        details,
        userAction: 'retry_online'
      });
    },

    // ストレージエラー
    handleStorageError: (message: string, details?: string) => {
      addError({
        type: 'storage',
        severity: 'critical',
        message: `ストレージエラー: ${message}`,
        details,
        userAction: 'clear_storage'
      });
    },

    // 汎用エラー
    handleGenericError: (message: string, details?: string, severity: AppError['severity'] = 'medium') => {
      addError({
        type: 'unknown',
        severity,
        message,
        details
      });
    }
  };
};

// ヘルパー関数
function getErrorTimeout(severity: AppError['severity']): number {
  switch (severity) {
    case 'low': return 5000;     // 5秒
    case 'medium': return 10000; // 10秒
    case 'high': return 0;       // 手動削除のみ
    case 'critical': return 0;   // 手動削除のみ
    default: return 8000;
  }
}

function getErrorTypeDisplayName(type: AppError['type']): string {
  switch (type) {
    case 'save': return '保存エラー';
    case 'load': return '読み込みエラー';
    case 'navigation': return 'ナビゲーションエラー';
    case 'game': return 'ゲームエラー';
    case 'network': return 'ネットワークエラー';
    case 'storage': return 'ストレージエラー';
    case 'unknown': return 'エラー';
    default: return 'エラー';
  }
}

function getRecoveryActions(error: AppError, onRecover: () => void): ErrorRecoveryAction[] {
  const actions: ErrorRecoveryAction[] = [];

  switch (error.userAction) {
    case 'retry_save':
      actions.push({
        label: '再保存',
        action: () => {
          // TODO: 実際の保存リトライロジック
          onRecover();
        },
        primary: true
      });
      break;

    case 'retry_load':
      actions.push({
        label: '再読み込み',
        action: () => {
          window.location.reload();
        },
        primary: true
      });
      break;

    case 'go_home':
      actions.push({
        label: 'ホームに戻る',
        action: () => {
          window.location.href = '/';
        },
        primary: true
      });
      break;

    case 'restart_game':
      actions.push({
        label: 'ゲーム再開',
        action: () => {
          // TODO: ゲーム再開ロジック
          onRecover();
        },
        primary: true
      });
      break;

    case 'retry_online':
      actions.push({
        label: '再接続',
        action: () => {
          // オンライン状態確認後のリトライ
          if (navigator.onLine) {
            onRecover();
          } else {
            alert('インターネット接続を確認してください');
          }
        },
        primary: true
      });
      break;

    case 'clear_storage':
      actions.push({
        label: 'ストレージクリア',
        action: async () => {
          if (confirm('ローカルデータをクリアしますか？（保存されていないデータは失われます）')) {
            try {
              localStorage.clear();
              // IndexedDBもクリア
              const databases = await indexedDB.databases();
              await Promise.all(
                databases.map(db => {
                  return new Promise<void>((resolve, reject) => {
                    const deleteReq = indexedDB.deleteDatabase(db.name!);
                    deleteReq.onsuccess = () => resolve();
                    deleteReq.onerror = () => reject(deleteReq.error);
                  });
                })
              );
              window.location.reload();
            } catch (err) {
              console.error('Failed to clear storage:', err);
            }
          }
        }
      });
      break;
  }

  // 常に「閉じる」アクションを追加
  actions.push({
    label: '閉じる',
    action: onRecover
  });

  return actions;
}

// CSS アニメーション
const styles = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .error-card {
    animation: slideIn 0.3s ease-out;
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    .error-display {
      top: 10px !important;
      right: 10px !important;
      left: 10px !important;
      max-width: none !important;
    }
  }
`;

// スタイルを挿入
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default ErrorHandlingProvider;