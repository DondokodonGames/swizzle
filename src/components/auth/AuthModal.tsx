// src/components/auth/AuthModal.tsx
// ログイン・サインアップモーダルUI（インラインスタイル版）

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { signIn, signUp, resetPassword, loading, error, clearError } = useAuth()

  const [mode, setMode] = useState<AuthMode>(defaultMode)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    age: '',
    language: 'ja'
  })

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showParentalWarning, setShowParentalWarning] = useState(false)
  const [showSignupSuccess, setShowSignupSuccess] = useState(false)
  const [navigating, setNavigating] = useState(false) // 画面遷移中フラグ

  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode)
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        displayName: '',
        age: '',
        language: 'ja'
      })
      setValidationErrors({})
      setShowSignupSuccess(false)
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
      } else if (formData.password.length < 8) {
        errors.password = '8文字以上必要'
      } else if (mode === 'signup') {
        // 新規登録時は強力なパスワードを要求
        const hasUpperCase = /[A-Z]/.test(formData.password)
        const hasLowerCase = /[a-z]/.test(formData.password)
        const hasNumber = /[0-9]/.test(formData.password)
        if (!hasUpperCase || !hasLowerCase || !hasNumber) {
          errors.password = '大文字・小文字・数字を含めてください'
        }
      }
    }

    if (mode === 'signup') {
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'パスワードが一致しません'
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
        // signIn完了（プロフィール読み込み完了）後に遷移
        setNavigating(true) // 遷移中フラグを立てる
        navigate('/feed', { replace: true })
      } else if (mode === 'signup') {
        const age = parseInt(formData.age)

        if (age < 13 && !showParentalWarning) {
          setShowParentalWarning(true)
          return
        }

        await signUp(formData.email, formData.password, {
          username: '',
          displayName: formData.displayName || '',
          age,
          language: formData.language
        })

        setShowSignupSuccess(true)
      } else if (mode === 'reset') {
        await resetPassword(formData.email)
        alert(t('auth.passwordResetEmailSent'))
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

  // モーダルが開いたときと閉じたときにイベントを発火
  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('authModalOpened'))
    } else {
      window.dispatchEvent(new CustomEvent('authModalClosed'))
    }
  }, [isOpen])

  if (!isOpen) return null

  // 共通スタイル
  const inputBaseStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    transition: 'all 0.2s',
    boxSizing: 'border-box'
  }

  const inputErrorStyle: React.CSSProperties = {
    ...inputBaseStyle,
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2'
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '6px'
  }

  const errorTextStyle: React.CSSProperties = {
    marginTop: '4px',
    fontSize: '12px',
    color: '#dc2626'
  }

  const buttonLinkStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#9333ea',
    fontWeight: '600',
    textDecoration: 'underline',
    cursor: 'pointer',
    padding: 0,
    fontSize: 'inherit'
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(4px)'
    }}>
      {/* オーバーレイ */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
        onClick={onClose}
      />

      {/* モーダル本体 */}
      <div
        style={{
          position: 'relative',
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: '400px',
          overflow: 'hidden',
          animation: 'slideUp 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ローディングオーバーレイ */}
        {(loading || navigating) && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(2px)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '4px solid #e5e7eb',
              borderTop: '4px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }} />
            <p style={{
              marginTop: '16px',
              fontSize: '16px',
              fontWeight: '600',
              color: '#374151'
            }}>
              ログイン中...
            </p>
          </div>
        )}

        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          disabled={loading}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#f3f4f6',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6b7280',
            cursor: 'pointer',
            zIndex: 10,
            fontSize: '16px'
          }}
        >
          ✕
        </button>

        {/* ヘッダー */}
        <div style={{
          padding: '24px 24px 16px',
          background: 'linear-gradient(135deg, #faf5ff 0%, #fdf2f8 100%)'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              marginBottom: '12px'
            }}>
              <span style={{ fontSize: '24px' }}>🎮</span>
            </div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#111827',
              margin: 0
            }}>
              {mode === 'signin' && 'ログイン'}
              {mode === 'signup' && 'アカウント作成'}
              {mode === 'reset' && 'パスワードリセット'}
            </h2>
          </div>
        </div>

        {/* コンテンツ */}
        <div style={{
          padding: '20px 24px',
          maxHeight: '70vh',
          overflowY: 'auto'
        }}>
          {/* エラー表示 */}
          {error && (
            <div style={{
              marginBottom: '16px',
              padding: '10px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#b91c1c',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* サインアップ成功 */}
          {showSignupSuccess && (
            <div style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px'
            }}>
              <h3 style={{
                fontWeight: '600',
                color: '#166534',
                marginBottom: '4px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span>✅</span> アカウント作成完了！
              </h3>
              <p style={{
                color: '#15803d',
                fontSize: '12px',
                marginBottom: '12px',
                lineHeight: '1.5'
              }}>
                確認メールを{formData.email}に送信しました。
                メールを確認してアカウントを有効化してください。
              </p>
              <p style={{
                color: '#16a34a',
                fontSize: '12px',
                lineHeight: '1.5'
              }}>
                ※ メール確認は任意です。確認しなくてもログインできます。
              </p>
              <button
                type="button"
                onClick={onClose}
                style={{
                  marginTop: '12px',
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: '#16a34a',
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                閉じる
              </button>
            </div>
          )}

          {/* 保護者警告 */}
          {showParentalWarning && (
            <div style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '8px'
            }}>
              <h3 style={{
                fontWeight: '600',
                color: '#92400e',
                marginBottom: '4px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span>⚠️</span> 保護者の同意について
              </h3>
              <p style={{
                color: '#b45309',
                fontSize: '12px',
                marginBottom: '12px',
                lineHeight: '1.5'
              }}>
                13歳未満のお子様には保護者の同意が必要です。
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowParentalWarning(false)}
                  style={{
                    flex: 1,
                    padding: '6px 12px',
                    backgroundColor: 'white',
                    border: '1px solid #fcd34d',
                    color: '#b45309',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowParentalWarning(false)
                    handleSubmit({ preventDefault: () => {} } as React.FormEvent)
                  }}
                  style={{
                    flex: 1,
                    padding: '6px 12px',
                    backgroundColor: '#d97706',
                    color: 'white',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '500',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  同意して続ける
                </button>
              </div>
            </div>
          )}

          {/* フォーム */}
          {!showSignupSuccess && (
            <form onSubmit={handleSubmit}>
              {/* メールアドレス */}
              <div style={{ marginBottom: '14px' }}>
                <label htmlFor="email" style={labelStyle}>
                  📧 メールアドレス
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  style={validationErrors.email ? inputErrorStyle : inputBaseStyle}
                  placeholder="your@example.com"
                  disabled={loading}
                />
                {validationErrors.email && (
                  <p style={errorTextStyle}>{validationErrors.email}</p>
                )}
              </div>

              {/* パスワード */}
              {mode !== 'reset' && (
                <div style={{ marginBottom: '14px' }}>
                  <label htmlFor="password" style={labelStyle}>
                    🔒 パスワード
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      style={{
                        ...(validationErrors.password ? inputErrorStyle : inputBaseStyle),
                        paddingRight: '40px'
                      }}
                      placeholder="6文字以上"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        padding: '4px 8px',
                        background: 'none',
                        border: 'none',
                        color: '#9ca3af',
                        cursor: 'pointer'
                      }}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {validationErrors.password && (
                    <p style={errorTextStyle}>{validationErrors.password}</p>
                  )}
                </div>
              )}

              {/* サインアップ追加フィールド */}
              {mode === 'signup' && (
                <>
                  {/* パスワード確認 */}
                  <div style={{ marginBottom: '14px' }}>
                    <label htmlFor="confirmPassword" style={labelStyle}>
                      🔒 パスワード確認
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      style={validationErrors.confirmPassword ? inputErrorStyle : inputBaseStyle}
                      placeholder="パスワードを再入力"
                      disabled={loading}
                    />
                    {validationErrors.confirmPassword && (
                      <p style={errorTextStyle}>{validationErrors.confirmPassword}</p>
                    )}
                  </div>

                  {/* 表示名 */}
                  <div style={{ marginBottom: '14px' }}>
                    <label htmlFor="displayName" style={labelStyle}>
                      ✨ 表示名
                    </label>
                    <input
                      type="text"
                      id="displayName"
                      name="displayName"
                      value={formData.displayName}
                      onChange={handleInputChange}
                      style={inputBaseStyle}
                      placeholder="山田太郎"
                      disabled={loading}
                    />
                    <p style={{
                      marginTop: '4px',
                      fontSize: '12px',
                      color: '#6b7280'
                    }}>
                      ゲーム内で表示される名前です
                    </p>
                  </div>

                  {/* 年齢・言語 */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    marginBottom: '14px'
                  }}>
                    <div>
                      <label htmlFor="age" style={labelStyle}>
                        🎂 年齢
                      </label>
                      <input
                        type="number"
                        id="age"
                        name="age"
                        value={formData.age}
                        onChange={handleInputChange}
                        style={validationErrors.age ? inputErrorStyle : inputBaseStyle}
                        placeholder="15"
                        min="6"
                        max="100"
                        disabled={loading}
                      />
                      {validationErrors.age && (
                        <p style={errorTextStyle}>{validationErrors.age}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="language" style={labelStyle}>
                        🌍 言語
                      </label>
                      <select
                        id="language"
                        name="language"
                        value={formData.language}
                        onChange={handleInputChange}
                        style={{
                          ...inputBaseStyle,
                          padding: '10px 8px'
                        }}
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
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                  color: 'white',
                  padding: '12px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                  marginTop: '16px',
                  fontSize: '14px'
                }}
              >
                {loading ? (
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid white',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
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
          )}

          {/* フッターリンク */}
          {!showSignupSuccess && (
            <div style={{
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid #f3f4f6'
            }}>
              {mode === 'signin' && (
                <div>
                  <p style={{
                    textAlign: 'center',
                    fontSize: '12px',
                    color: '#4b5563',
                    marginBottom: '8px'
                  }}>
                    アカウントをお持ちでない方は{' '}
                    <button
                      type="button"
                      onClick={() => setMode('signup')}
                      disabled={loading}
                      style={buttonLinkStyle}
                    >
                      アカウント作成
                    </button>
                  </p>
                  <p style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setMode('reset')}
                      disabled={loading}
                      style={{
                        ...buttonLinkStyle,
                        color: '#6b7280',
                        fontSize: '12px'
                      }}
                    >
                      パスワードを忘れた方
                    </button>
                  </p>
                </div>
              )}

              {mode === 'signup' && (
                <div>
                  <p style={{
                    textAlign: 'center',
                    fontSize: '12px',
                    color: '#4b5563',
                    marginBottom: '8px'
                  }}>
                    既にアカウントをお持ちの方は{' '}
                    <button
                      type="button"
                      onClick={() => setMode('signin')}
                      disabled={loading}
                      style={buttonLinkStyle}
                    >
                      ログイン
                    </button>
                  </p>
                </div>
              )}

              {mode === 'reset' && (
                <p style={{
                  textAlign: 'center',
                  fontSize: '12px',
                  color: '#4b5563'
                }}>
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    disabled={loading}
                    style={buttonLinkStyle}
                  >
                    ログインに戻る
                  </button>
                </p>
              )}
            </div>
          )}
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
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}

export default AuthModal
