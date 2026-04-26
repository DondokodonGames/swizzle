// src/components/debug/SupabaseConnectionTest.tsx
// Supabase接続診断・修正ツール

import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { testConnection, healthCheck } from '../../lib/supabase'

interface ConnectionTest {
  connected: boolean
  error?: string
  latency?: number
}

interface HealthCheck {
  database: ConnectionTest
  auth: {
    connected: boolean
    authenticated: boolean
    error?: string
  }
  environment: {
    url: string
    hasAnonKey: boolean
  }
}

const SupabaseConnectionTest: React.FC = () => {
  const { t } = useTranslation()
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<HealthCheck | null>(null)
  const [manualUrl, setManualUrl] = useState('https://rqzehjsygvkkvntswqbs.supabase.co')
  const [manualKey, setManualKey] = useState('')

  // 自動テスト実行
  useEffect(() => {
    runDiagnostics()
  }, [])

  const runDiagnostics = async () => {
    setTesting(true)
    setResults(null)
    
    try {
      console.log('🔍 Supabase接続診断開始...')
      
      // 基本接続テスト
      const connectionTest = await testConnection()
      console.log('📡 接続テスト結果:', connectionTest)
      
      // ヘルスチェック
      const health = await healthCheck()
      console.log('🏥 ヘルスチェック結果:', health)
      
      setResults(health)
    } catch (error) {
      console.error('❌ 診断エラー:', error)
      setResults({
        database: {
          connected: false,
          error: error instanceof Error ? error.message : String(error)
        },
        auth: {
          connected: false,
          authenticated: false,
          error: 'Diagnostic failed'
        },
        environment: {
          url: manualUrl,
          hasAnonKey: false
        }
      })
    } finally {
      setTesting(false)
    }
  }

  // 手動URL/Keyテスト
  const testManualConnection = async () => {
    if (!manualUrl || !manualKey) {
      alert(t('errors.enterUrlAndApiKey'))
      return
    }

    setTesting(true)
    try {
      // 手動設定でのテスト（実装は簡略化）
      const response = await fetch(`${manualUrl}/rest/v1/`, {
        headers: {
          'apikey': manualKey,
          'Authorization': `Bearer ${manualKey}`
        }
      })
      
      console.log('🔧 手動テスト結果:', response.status, response.statusText)
      
      if (response.ok) {
        alert('✅ ' + t('errors.manualConfigSuccess'))
      } else {
        alert(`❌ 手動設定エラー: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      console.error('❌ 手動テストエラー:', error)
      alert(`❌ 手動テストエラー: ${error}`)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6 text-center">
        🔧 Supabase接続診断ツール
      </h1>

      {/* 診断実行ボタン */}
      <div className="mb-6 text-center">
        <button
          onClick={runDiagnostics}
          disabled={testing}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {testing ? '診断中...' : '🔍 再診断実行'}
        </button>
      </div>

      {/* 診断結果表示 */}
      {results && (
        <div className="space-y-4">
          {/* 環境情報 */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">📊 環境情報</h3>
            <div className="space-y-1 text-sm">
              <div>
                <strong>Supabase URL:</strong> 
                <code className="ml-2 px-2 py-1 bg-gray-200 rounded">
                  {results.environment.url}
                </code>
              </div>
              <div>
                <strong>API Key設定:</strong> 
                <span className={`ml-2 px-2 py-1 rounded ${results.environment.hasAnonKey ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {results.environment.hasAnonKey ? '✅ 設定済み' : '❌ 未設定'}
                </span>
              </div>
            </div>
          </div>

          {/* データベース接続 */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">💾 データベース接続</h3>
            <div className={`p-3 rounded ${results.database.connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {results.database.connected ? (
                <div>
                  ✅ 接続成功
                  {results.database.latency && (
                    <span className="ml-2 text-sm">
                      (レイテンシ: {results.database.latency}ms)
                    </span>
                  )}
                </div>
              ) : (
                <div>
                  ❌ 接続失敗: {results.database.error}
                </div>
              )}
            </div>
          </div>

          {/* 認証システム */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">🔐 認証システム</h3>
            <div className={`p-3 rounded ${results.auth.connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {results.auth.connected ? (
                <div>
                  ✅ 認証システム接続成功
                  <div className="text-sm mt-1">
                    認証状態: {results.auth.authenticated ? 'ログイン済み' : '未ログイン'}
                  </div>
                </div>
              ) : (
                <div>
                  ❌ 認証システム接続失敗: {results.auth.error}
                </div>
              )}
            </div>
          </div>

          {/* 修正提案 */}
          {!results.database.connected && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold mb-2 text-yellow-800">🔧 修正提案</h3>
              <ul className="space-y-2 text-sm text-yellow-700">
                <li>1. Supabaseプロジェクトが存在するか確認してください</li>
                <li>2. プロジェクトURLが正しいか確認してください</li>
                <li>3. APIキーが有効か確認してください</li>
                <li>4. プロジェクトが一時停止されていないか確認してください</li>
                <li>5. ネットワーク接続を確認してください</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 手動設定テスト */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold mb-4 text-blue-800">🔧 手動設定テスト</h3>
        <p className="text-sm text-blue-700 mb-4">
          正しいSupabase URLとAPIキーがある場合、ここでテストできます：
        </p>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-blue-700 mb-1">
              Supabase URL:
            </label>
            <input
              type="url"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://your-project-id.supabase.co"
              className="w-full px-3 py-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-blue-700 mb-1">
              Anon API Key:
            </label>
            <input
              type="password"
              value={manualKey}
              onChange={(e) => setManualKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3 py-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <button
            onClick={testManualConnection}
            disabled={testing}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {testing ? 'テスト中...' : '🧪 手動設定テスト'}
          </button>
        </div>
      </div>

      {/* デバッグ情報 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">🐛 デバッグ情報</h3>
        <p className="text-sm text-gray-600 mb-2">
          ブラウザのConsoleタブで詳細なログを確認できます。
        </p>
        <p className="text-sm text-gray-600">
          F12キー → Consoleタブ → 上記の診断ボタンをクリック
        </p>
      </div>
    </div>
  )
}

export default SupabaseConnectionTest