import React from 'react'

const EnvTest: React.FC = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  const authEnabled = import.meta.env.VITE_ENABLE_AUTH
  const debugMode = import.meta.env.VITE_DEBUG_MODE

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      fontSize: '12px',
      maxWidth: '300px',
      zIndex: 9999,
      fontFamily: 'monospace'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#10b981' }}>
        🔧 環境変数確認 (Codespaces)
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>Supabase URL:</strong>
        <div style={{ 
          background: supabaseUrl ? '#10b981' : '#ef4444',
          padding: '2px 6px',
          borderRadius: '4px',
          marginTop: '2px',
          wordBreak: 'break-all'
        }}>
          {supabaseUrl ? '✅ ' + supabaseUrl.slice(0, 30) + '...' : '❌ Not Found'}
        </div>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong>Anon Key:</strong>
        <div style={{ 
          background: supabaseKey ? '#10b981' : '#ef4444',
          padding: '2px 6px',
          borderRadius: '4px',
          marginTop: '2px'
        }}>
          {supabaseKey ? '✅ ' + supabaseKey.slice(0, 20) + '...' : '❌ Not Found'}
        </div>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong>Auth Enabled:</strong>
        <span style={{ 
          background: authEnabled === 'true' ? '#10b981' : '#f59e0b',
          padding: '2px 6px',
          borderRadius: '4px',
          marginLeft: '5px'
        }}>
          {authEnabled || 'false'}
        </span>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong>Debug Mode:</strong>
        <span style={{ 
          background: debugMode === 'true' ? '#10b981' : '#6b7280',
          padding: '2px 6px',
          borderRadius: '4px',
          marginLeft: '5px'
        }}>
          {debugMode || 'false'}
        </span>
      </div>

      <div style={{ marginTop: '10px', fontSize: '10px', opacity: 0.7 }}>
        Mode: {import.meta.env.MODE}<br/>
        Dev: {import.meta.env.DEV ? 'Yes' : 'No'}
      </div>
    </div>
  )
}

export default EnvTest