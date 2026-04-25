// src/pages/LoginPage.tsx
// 専用のログインページ

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'

export const LoginPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signIn, resetPassword, loading, error, clearError, isAuthenticated } = useAuth()

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [navigating, setNavigating] = useState(false)
  const [loginAttempted, setLoginAttempted] = useState(false)

  // パスワードリセット用 state
  const [showResetMode, setShowResetMode] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetStatus, setResetStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [resetErrorMessage, setResetErrorMessage] = useState('')

  // 既にログイン済みの場合はゲームフィードにリダイレクト（初回のみ、ログイン試行後は除外）
  useEffect(() => {
    if (isAuthenticated && !loginAttempted) {
      navigate('/feed')
    }
  }, [isAuthenticated, navigate, loginAttempted])

  // バリデーション
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.email.trim()) {
      errors.email = t('auth.emailRequired')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = t('auth.emailInvalid')
    }

    if (!formData.password.trim()) {
      errors.password = t('auth.passwordRequired')
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // フォーム送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoginAttempted(true)
    setNavigating(true)

    try {
      await signIn(formData.email, formData.password)
      navigate('/feed', { replace: true })
    } catch (error) {
      console.error('[LoginPage] ログインエラー:', error)
      setNavigating(false)
      setLoginAttempted(false)
    }
  }

  // 入力変更処理
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  // パスワードリセット送信
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) return

    setResetStatus('sending')
    setResetErrorMessage('')
    try {
      await resetPassword(resetEmail)
      setResetStatus('sent')
    } catch (err) {
      console.error('[LoginPage] パスワードリセットエラー:', err)
      setResetStatus('error')
      setResetErrorMessage(t('auth.passwordResetError'))
    }
  }

  const handleBackToLogin = () => {
    setShowResetMode(false)
    setResetStatus('idle')
    setResetEmail('')
    setResetErrorMessage('')
    clearError()
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        position: 'relative',
        backgroundColor: 'white',
        borderRadius: '24px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        width: '100%',
        maxWidth: '450px',
        padding: '48px 40px'
      }}>
        {/* ローディングオーバーレイ */}
        {(loading || navigating) && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '24px',
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
              {t('auth.signingIn')}
            </p>
          </div>
        )}

        {/* ヘッダー */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 24px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{ fontSize: '40px' }}>🎮</span>
          </div>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#111827',
            margin: '0 0 8px 0'
          }}>
            {showResetMode ? t('auth.passwordResetTitle') : t('auth.loginTitle')}
          </h1>
          <p style={{ color: '#6b7280', fontSize: '16px', margin: 0 }}>
            {showResetMode ? t('auth.passwordResetDescription') : t('auth.welcome')}
          </p>
        </div>

        {/* ── パスワードリセットモード ── */}
        {showResetMode ? (
          <>
            {resetStatus === 'sent' ? (
              <div style={{
                padding: '20px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '12px',
                textAlign: 'center',
                marginBottom: '24px'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📧</div>
                <p style={{ color: '#15803d', fontWeight: '600', margin: '0 0 4px 0' }}>
                  {t('auth.passwordResetEmailSent')}
                </p>
                <p style={{ color: '#166534', fontSize: '14px', margin: 0 }}>
                  {resetEmail}
                </p>
              </div>
            ) : (
              <form onSubmit={handleResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {resetStatus === 'error' && (
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '12px',
                    color: '#dc2626',
                    fontSize: '14px'
                  }}>
                    {resetErrorMessage}
                  </div>
                )}
                <div>
                  <label htmlFor="resetEmail" style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    {t('auth.email')}
                  </label>
                  <input
                    type="email"
                    id="resetEmail"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '10px',
                      fontSize: '16px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    placeholder={t('auth.emailPlaceholder')}
                    disabled={resetStatus === 'sending'}
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={resetStatus === 'sending' || !resetEmail.trim()}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: (resetStatus === 'sending' || !resetEmail.trim())
                      ? '#9ca3af'
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '18px',
                    fontWeight: '600',
                    cursor: (resetStatus === 'sending' || !resetEmail.trim()) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {resetStatus === 'sending' ? t('auth.sendingResetEmail') : t('auth.sendResetEmail')}
                </button>
              </form>
            )}

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button
                onClick={handleBackToLogin}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#667eea',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                ← {t('auth.backToLogin')}
              </button>
            </div>
          </>
        ) : (
          /* ── ログインモード ── */
          <>
            {error && (
              <div style={{
                marginBottom: '24px',
                padding: '16px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                color: '#dc2626',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* メールアドレス */}
              <div>
                <label htmlFor="email" style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  {t('auth.email')}
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${validationErrors.email ? '#fca5a5' : '#d1d5db'}`,
                    borderRadius: '10px',
                    fontSize: '16px',
                    backgroundColor: validationErrors.email ? '#fef2f2' : 'white',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                  placeholder={t('auth.emailPlaceholder')}
                  disabled={loading || navigating}
                  autoFocus
                />
                {validationErrors.email && (
                  <p style={{ marginTop: '4px', fontSize: '13px', color: '#dc2626' }}>
                    {validationErrors.email}
                  </p>
                )}
              </div>

              {/* パスワード */}
              <div>
                <label htmlFor="password" style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  {t('auth.password')}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '12px 48px 12px 16px',
                      border: `1px solid ${validationErrors.password ? '#fca5a5' : '#d1d5db'}`,
                      borderRadius: '10px',
                      fontSize: '16px',
                      backgroundColor: validationErrors.password ? '#fef2f2' : 'white',
                      outline: 'none',
                      transition: 'all 0.2s',
                      boxSizing: 'border-box'
                    }}
                    placeholder={t('auth.passwordPlaceholder')}
                    disabled={loading || navigating}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '20px',
                      padding: '4px'
                    }}
                    disabled={loading || navigating}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {validationErrors.password && (
                  <p style={{ marginTop: '4px', fontSize: '13px', color: '#dc2626' }}>
                    {validationErrors.password}
                  </p>
                )}
              </div>

              {/* 送信ボタン */}
              <button
                type="submit"
                disabled={loading || navigating}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: (loading || navigating)
                    ? '#9ca3af'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '18px',
                  fontWeight: '600',
                  cursor: (loading || navigating) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  marginTop: '8px'
                }}
              >
                {(loading || navigating) ? t('auth.signingIn') : t('auth.signIn')}
              </button>
            </form>

            {/* パスワードリセットリンク */}
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button
                onClick={() => { clearError(); setShowResetMode(true) }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  fontSize: '14px',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
                disabled={loading || navigating}
              >
                {t('auth.forgotPasswordLink')}
              </button>
            </div>

            {/* フッター */}
            <div style={{
              marginTop: '24px',
              textAlign: 'center',
              fontSize: '14px',
              color: '#6b7280'
            }}>
              {t('auth.noAccountYet')}{' '}
              <button
                onClick={() => navigate('/signup')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#667eea',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
                disabled={loading || navigating}
              >
                {t('auth.signUp')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default LoginPage
