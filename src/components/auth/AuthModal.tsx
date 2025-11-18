// src/components/auth/AuthModal.tsx
// ログイン・サインアップモーダルUI
// 既存デザインシステム準拠・COPPA対応

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  defaultMode?: 'signin' | 'signup'
}

type AuthMode = 'signin' | 'signup' | 'reset'

const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  defaultMode = 'signin' 
}) => {
  const { signIn, signUp, resetPassword, loading, error, clearError } = useAuth()
  
  const [mode, setMode] = useState<AuthMode>(defaultMode)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    displayName: '',
    age: '',
    language: 'ja'
  })
  
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showParentalWarning, setShowParentalWarning] = useState(false)

  // モーダル開閉時のリセット
  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode)
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        username: '',
        displayName: '',
        age: '',
        language: 'ja'
      })
      setValidationErrors({})
      clearError()
    }
  }, [isOpen, defaultMode, clearError])

  // Escキーでモーダルを閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // バリデーション
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    
    if (!formData.email.trim()) {
      errors.email = 'メールアドレスを入力してください'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'メールアドレスの形式が正しくありません'
    }
    
    if (mode !== 'reset') {
      if (!formData.password.trim()) {
        errors.password = 'パスワードを入力してください'
      } else if (formData.password.length < 6) {
        errors.password = 'パスワードは6文字以上である必要があります'
      }
    }
    
    if (mode === 'signup') {
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'パスワードが一致しません'
      }
      
      if (!formData.username.trim()) {
        errors.username = 'ユーザー名を入力してください'
      } else if (formData.username.length < 3) {
        errors.username = 'ユーザー名は3文字以上である必要があります'
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        errors.username = 'ユーザー名は英数字とアンダースコアのみ使用できます'
      }
      
      const age = parseInt(formData.age)
      if (!formData.age.trim() || isNaN(age)) {
        errors.age = '年齢を入力してください'
      } else if (age < 6 || age > 100) {
        errors.age = '年齢は6歳以上100歳以下で入力してください'
      }
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // フォーム送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    try {
      if (mode === 'signin') {
        await signIn(formData.email, formData.password)
        onClose()
      } else if (mode === 'signup') {
        const age = parseInt(formData.age)
        
        // 13歳未満の場合は保護者同意の警告を表示
        if (age < 13 && !showParentalWarning) {
          setShowParentalWarning(true)
          return
        }
        
        await signUp(formData.email, formData.password, {
          username: formData.username,
          displayName: formData.displayName || formData.username,
          age,
          language: formData.language
        })
        onClose()
      } else if (mode === 'reset') {
        await resetPassword(formData.email)
        alert('パスワードリセットメールを送信しました。メールをご確認ください。')
        setMode('signin')
      }
    } catch (error) {
      // エラーはuseAuthで管理されるため、ここでは何もしない
      console.error('Auth error:', error)
    }
  }

  // 入力変更処理
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // バリデーションエラーをクリア
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  // モーダルが閉じている場合は何も表示しない
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* オーバーレイ */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* モーダル本体 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 transform transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 閉じるボタン */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* ヘッダー */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-3xl">🎮</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {mode === 'signin' && 'ログイン'}
              {mode === 'signup' && 'アカウント作成'}
              {mode === 'reset' && 'パスワードリセット'}
            </h2>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* 13歳未満警告 */}
          {showParentalWarning && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <h3 className="font-semibold text-amber-800 mb-2">⚠️ 保護者の同意について</h3>
              <p className="text-amber-700 text-sm mb-3">
                13歳未満のお子様には保護者の同意が必要です。保護者の方と一緒にアカウントを作成してください。
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowParentalWarning(false)}
                  className="px-3 py-1 bg-white border border-amber-300 text-amber-700 rounded-lg text-sm"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowParentalWarning(false)
                    handleSubmit({ preventDefault: () => {} } as React.FormEvent)
                  }}
                  className="px-3 py-1 bg-amber-600 text-white rounded-lg text-sm"
                >
                  同意して続ける
                </button>
              </div>
            </div>
          )}

          {/* フォーム */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* メールアドレス */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors ${
                  validationErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="your@example.com"
                disabled={loading}
              />
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
              )}
            </div>

            {/* パスワード */}
            {mode !== 'reset' && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  パスワード
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 pr-12 border rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors ${
                      validationErrors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="6文字以上"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={loading}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {validationErrors.password && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
                )}
              </div>
            )}

            {/* サインアップ追加フィールド */}
            {mode === 'signup' && (
              <>
                {/* パスワード確認 */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    パスワード確認
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors ${
                      validationErrors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="パスワードを再入力"
                    disabled={loading}
                  />
                  {validationErrors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.confirmPassword}</p>
                  )}
                </div>

                {/* ユーザー名 */}
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                    ユーザー名
                  </label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors ${
                      validationErrors.username ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="半角英数字とアンダースコア"
                    disabled={loading}
                  />
                  {validationErrors.username && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.username}</p>
                  )}
                </div>

                {/* 表示名 */}
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                    表示名 <span className="text-gray-400 text-xs">(任意)</span>
                  </label>
                  <input
                    type="text"
                    id="displayName"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors"
                    placeholder="みんなに表示される名前"
                    disabled={loading}
                  />
                </div>

                {/* 年齢・言語 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
                      年齢
                    </label>
                    <input
                      type="number"
                      id="age"
                      name="age"
                      value={formData.age}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors ${
                        validationErrors.age ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="15"
                      min="6"
                      max="100"
                      disabled={loading}
                    />
                    {validationErrors.age && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.age}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                      言語
                    </label>
                    <select
                      id="language"
                      name="language"
                      value={formData.language}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                      disabled={loading}
                    >
                      <option value="ja">日本語</option>
                      <option value="en">English</option>
                      <option value="ko">한국어</option>
                      <option value="zh">中文</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                      <option value="es">Español</option>
                      <option value="it">Italiano</option>
                      <option value="pt">Português</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* 送信ボタン */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] focus:ring-4 focus:ring-purple-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  処理中...
                </span>
              ) : (
                <>
                  {mode === 'signin' && 'ログイン'}
                  {mode === 'signup' && 'アカウント作成'}
                  {mode === 'reset' && 'リセットメール送信'}
                </>
              )}
            </button>
          </form>

          {/* フッターリンク */}
          <div className="mt-6 text-center text-sm">
            {mode === 'signin' && (
              <>
                <p className="text-gray-600">
                  まだアカウントをお持ちでない方は{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="text-purple-600 hover:text-purple-700 font-semibold"
                    disabled={loading}
                  >
                    アカウント作成
                  </button>
                </p>
                <p className="mt-2">
                  <button
                    type="button"
                    onClick={() => setMode('reset')}
                    className="text-gray-500 hover:text-gray-700 text-sm"
                    disabled={loading}
                  >
                    パスワードを忘れた方
                  </button>
                </p>
              </>
            )}
            
            {mode === 'signup' && (
              <>
                <p className="text-gray-600">
                  既にアカウントをお持ちの方は{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    className="text-purple-600 hover:text-purple-700 font-semibold"
                    disabled={loading}
                  >
                    ログイン
                  </button>
                </p>
                <p className="mt-2 text-gray-500 text-xs">
                  または{' '}
                  <a
                    href="/signup"
                    className="text-purple-600 hover:text-purple-700 font-medium underline"
                  >
                    専用ページで登録
                  </a>
                </p>
              </>
            )}
            
            {mode === 'reset' && (
              <p className="text-gray-600">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-pink-600 hover:text-pink-700 font-medium"
                  disabled={loading}
                >
                  ログインに戻る
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthModal