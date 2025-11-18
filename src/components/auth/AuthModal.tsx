// src/components/auth/AuthModal.tsx
// ログイン・サインアップモーダルUI（モダンデザイン版）

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

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.email.trim()) {
      errors.email = 'メールアドレスを入力'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'メールアドレスの形式が不正'
    }

    if (mode !== 'reset') {
      if (!formData.password.trim()) {
        errors.password = 'パスワードを入力'
      } else if (formData.password.length < 6) {
        errors.password = '6文字以上必要'
      }
    }

    if (mode === 'signup') {
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'パスワードが一致しません'
      }

      if (!formData.username.trim()) {
        errors.username = 'ユーザー名を入力'
      } else if (formData.username.length < 3) {
        errors.username = '3文字以上必要'
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        errors.username = '英数字と_のみ'
      }

      const age = parseInt(formData.age)
      if (!formData.age.trim() || isNaN(age)) {
        errors.age = '年齢を入力'
      } else if (age < 6 || age > 100) {
        errors.age = '6-100歳で入力'
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      if (mode === 'signin') {
        await signIn(formData.email, formData.password)
        onClose()
      } else if (mode === 'signup') {
        const age = parseInt(formData.age)

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
        alert('パスワードリセットメールを送信しました。')
        setMode('signin')
      }
    } catch (error) {
      console.error('Auth error:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto backdrop-blur-sm bg-black/30 flex items-center justify-center p-4">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />

      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: 'slideUp 0.3s ease-out'
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center text-gray-600 hover:text-gray-800 z-10"
          disabled={loading}
        >
          ✕
        </button>

        {/* ヘッダー */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-purple-50 to-pink-50">
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg mb-3">
              <span className="text-2xl">🎮</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {mode === 'signin' && 'ログイン'}
              {mode === 'signup' && 'アカウント作成'}
              {mode === 'reset' && 'パスワードリセット'}
            </h2>
          </div>
        </div>

        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="mb-4 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {showParentalWarning && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <h3 className="font-semibold text-amber-800 mb-1 text-sm flex items-center gap-1">
                <span>⚠️</span> 保護者の同意について
              </h3>
              <p className="text-amber-700 text-xs mb-3 leading-relaxed">
                13歳未満のお子様には保護者の同意が必要です。
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowParentalWarning(false)}
                  className="flex-1 px-3 py-1.5 bg-white border border-amber-300 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowParentalWarning(false)
                    handleSubmit({ preventDefault: () => {} } as React.FormEvent)
                  }}
                  className="flex-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 transition-colors"
                >
                  同意して続ける
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* メールアドレス */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-700 mb-1.5">
                📧 メールアドレス
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 text-sm border-2 rounded-lg transition-all ${
                  validationErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100'
                }`}
                placeholder="your@example.com"
                disabled={loading}
              />
              {validationErrors.email && (
                <p className="mt-1 text-xs text-red-600">{validationErrors.email}</p>
              )}
            </div>

            {/* パスワード */}
            {mode !== 'reset' && (
              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  🔒 パスワード
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 pr-10 text-sm border-2 rounded-lg transition-all ${
                      validationErrors.password ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100'
                    }`}
                    placeholder="6文字以上"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {validationErrors.password && (
                  <p className="mt-1 text-xs text-red-600">{validationErrors.password}</p>
                )}
              </div>
            )}

            {/* サインアップ追加フィールド */}
            {mode === 'signup' && (
              <>
                {/* パスワード確認 */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-xs font-semibold text-gray-700 mb-1.5">
                    🔒 パスワード確認
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 text-sm border-2 rounded-lg transition-all ${
                      validationErrors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100'
                    }`}
                    placeholder="パスワードを再入力"
                    disabled={loading}
                  />
                  {validationErrors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-600">{validationErrors.confirmPassword}</p>
                  )}
                </div>

                {/* ユーザー名 */}
                <div>
                  <label htmlFor="username" className="block text-xs font-semibold text-gray-700 mb-1.5">
                    👤 ユーザー名
                  </label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 text-sm border-2 rounded-lg transition-all ${
                      validationErrors.username ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100'
                    }`}
                    placeholder="taro_yamada"
                    disabled={loading}
                  />
                  {validationErrors.username ? (
                    <p className="mt-1 text-xs text-red-600">{validationErrors.username}</p>
                  ) : (
                    <p className="mt-1 text-xs text-gray-500">3-20文字、英数字と_のみ</p>
                  )}
                </div>

                {/* 表示名 */}
                <div>
                  <label htmlFor="displayName" className="block text-xs font-semibold text-gray-700 mb-1.5">
                    ✨ 表示名 <span className="text-gray-400 font-normal">(任意)</span>
                  </label>
                  <input
                    type="text"
                    id="displayName"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                    placeholder="山田太郎"
                    disabled={loading}
                  />
                </div>

                {/* 年齢・言語 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="age" className="block text-xs font-semibold text-gray-700 mb-1.5">
                      🎂 年齢
                    </label>
                    <input
                      type="number"
                      id="age"
                      name="age"
                      value={formData.age}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 text-sm border-2 rounded-lg transition-all ${
                        validationErrors.age ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100'
                      }`}
                      placeholder="15"
                      min="6"
                      max="100"
                      disabled={loading}
                    />
                    {validationErrors.age && (
                      <p className="mt-1 text-xs text-red-600">{validationErrors.age}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="language" className="block text-xs font-semibold text-gray-700 mb-1.5">
                      🌍 言語
                    </label>
                    <select
                      id="language"
                      name="language"
                      value={formData.language}
                      onChange={handleInputChange}
                      className="w-full px-2 py-2 text-sm border-2 border-gray-200 rounded-lg focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                      disabled={loading}
                    >
                      <option value="ja">🇯🇵 日本語</option>
                      <option value="en">🇺🇸 English</option>
                      <option value="ko">🇰🇷 한국어</option>
                      <option value="zh">🇨🇳 中文</option>
                      <option value="fr">🇫🇷 Français</option>
                      <option value="de">🇩🇪 Deutsch</option>
                      <option value="es">🇪🇸 Español</option>
                      <option value="it">🇮🇹 Italiano</option>
                      <option value="pt">🇵🇹 Português</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* 送信ボタン */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2.5 rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none mt-4"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  処理中...
                </span>
              ) : (
                <>
                  {mode === 'signin' && '🚀 ログイン'}
                  {mode === 'signup' && '✨ アカウント作成'}
                  {mode === 'reset' && '📧 リセットメール送信'}
                </>
              )}
            </button>
          </form>

          {/* フッターリンク */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            {mode === 'signin' && (
              <div className="space-y-2">
                <p className="text-center text-xs text-gray-600">
                  アカウントをお持ちでない方は{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="text-purple-600 hover:text-purple-700 font-semibold underline"
                    disabled={loading}
                  >
                    アカウント作成
                  </button>
                </p>
                <p className="text-center">
                  <button
                    type="button"
                    onClick={() => setMode('reset')}
                    className="text-gray-500 hover:text-gray-700 text-xs underline"
                    disabled={loading}
                  >
                    パスワードを忘れた方
                  </button>
                </p>
              </div>
            )}

            {mode === 'signup' && (
              <div className="space-y-2">
                <p className="text-center text-xs text-gray-600">
                  既にアカウントをお持ちの方は{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    className="text-purple-600 hover:text-purple-700 font-semibold underline"
                    disabled={loading}
                  >
                    ログイン
                  </button>
                </p>
                <p className="text-center text-xs text-gray-500">
                  または{' '}
                  <a
                    href="/signup"
                    className="text-purple-600 hover:text-purple-700 font-medium underline"
                  >
                    専用ページで登録
                  </a>
                </p>
              </div>
            )}

            {mode === 'reset' && (
              <p className="text-center text-xs text-gray-600">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-purple-600 hover:text-purple-700 font-semibold underline"
                  disabled={loading}
                >
                  ログインに戻る
                </button>
              </p>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

export default AuthModal
