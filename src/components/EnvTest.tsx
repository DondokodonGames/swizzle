// src/components/EnvTest.tsx - TypeScriptエラー修正版
import React from 'react'

// Vite環境変数の型定義を追加
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_ENABLE_AUTH: string
  readonly VITE_DEBUG_MODE: string
  readonly MODE: string
  readonly DEV: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

const EnvTest: React.FC = () => {
  // 安全な環境変数アクセス（型エラー回避）
  const getEnvVar = (key: string): string | undefined => {
    try {
      return (import.meta as any).env?.[key]
    } catch {
      return undefined
    }
  }

  const supabaseUrl = getEnvVar('VITE_SUPABASE_URL')
  const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY')
  const authEnabled = getEnvVar('VITE_ENABLE_AUTH')
  const debugMode = getEnvVar('VITE_DEBUG_MODE')
  const mode = getEnvVar('MODE')
  const isDev = getEnvVar('DEV')

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.9)',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      fontSize: '12px',
      maxWidth: '350px',
      zIndex: 9999,
      fontFamily: 'monospace',
      border: '2px solid #10b981',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
    }}>
      <div style={{ 
        fontWeight: 'bold', 
        marginBottom: '12px', 
        color: '#10b981',
        fontSize: '14px'
      }}>
        🔧 環境変数確認 (Codespaces)
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <strong style={{ color: '#e5e7eb' }}>Supabase URL:</strong>
        <div style={{ 
          background: supabaseUrl ? '#10b981' : '#ef4444',
          padding: '3px 6px',
          borderRadius: '4px',
          marginTop: '3px',
          wordBreak: 'break-all',
          fontSize: '10px'
        }}>
          {supabaseUrl ? 
            '✅ ' + supabaseUrl.slice(0, 40) + (supabaseUrl.length > 40 ? '...' : '') : 
            '❌ Not Found'
          }
        </div>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong style={{ color: '#e5e7eb' }}>Anon Key:</strong>
        <div style={{ 
          background: supabaseKey ? '#10b981' : '#ef4444',
          padding: '3px 6px',
          borderRadius: '4px',
          marginTop: '3px',
          fontSize: '10px'
        }}>
          {supabaseKey ? 
            '✅ ' + supabaseKey.slice(0, 25) + '...' : 
            '❌ Not Found'
          }
        </div>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong style={{ color: '#e5e7eb' }}>Auth Enabled:</strong>
        <span style={{ 
          background: authEnabled === 'true' ? '#10b981' : '#f59e0b',
          padding: '2px 6px',
          borderRadius: '4px',
          marginLeft: '5px',
          fontSize: '10px'
        }}>
          {authEnabled || 'false'}
        </span>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong style={{ color: '#e5e7eb' }}>Debug Mode:</strong>
        <span style={{ 
          background: debugMode === 'true' ? '#10b981' : '#6b7280',
          padding: '2px 6px',
          borderRadius: '4px',
          marginLeft: '5px',
          fontSize: '10px'
        }}>
          {debugMode || 'false'}
        </span>
      </div>

      <hr style={{ 
        border: 'none', 
        borderTop: '1px solid #374151', 
        margin: '10px 0' 
      }} />

      <div style={{ fontSize: '10px', opacity: 0.8, color: '#9ca3af' }}>
        <div>Mode: {mode || 'unknown'}</div>
        <div>Dev: {isDev || 'unknown'}</div>
        <div style={{ marginTop: '5px', color: '#10b981' }}>
          {supabaseUrl && supabaseKey ? 
            '🟢 Supabase接続準備完了' : 
            '🔴 Supabase設定不完全'
          }
        </div>
      </div>

      {/* 閉じるボタン（オプション） */}
      <button
        onClick={() => {
          const element = document.querySelector('[data-testid="env-test"]') as HTMLElement
          if (element) element.style.display = 'none'
        }}
        style={{
          position: 'absolute',
          top: '5px',
          right: '8px',
          background: 'transparent',
          color: '#9ca3af',
          border: 'none',
          cursor: 'pointer',
          fontSize: '16px',
          padding: '0',
          width: '20px',
          height: '20px'
        }}
        title="閉じる"
      >
        ×
      </button>
    </div>
  )
}

export default EnvTest