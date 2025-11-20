// src/components/auth/ProfileSetup.tsx
// プロフィール設定・編集画面（モダンデザイン版）

import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { storage } from '../../lib/supabase'
import type { Profile } from '../../lib/database.types'
import { supportedLanguages } from '../../i18n'

interface ProfileSetupProps {
  isOpen: boolean
  onClose: () => void
  mode?: 'setup' | 'edit'
  title?: string
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({
  isOpen,
  onClose,
  mode = 'setup',
  title
}) => {
  const { i18n } = useTranslation()
  const { profile, updateProfile, checkUsernameAvailable, loading, error, clearError } = useAuth()

  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    bio: '',
    language: 'ja'
  })

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [usernameChecking, setUsernameChecking] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (profile && isOpen) {
      setFormData({
        username: profile.username || '',
        displayName: profile.display_name || '',
        bio: profile.bio || '',
        language: profile.language || 'ja'
      })
      setUsernameAvailable(null)
      setHasChanges(false)
    }
  }, [profile, isOpen])

  useEffect(() => {
    if (isOpen) {
      setValidationErrors({})
      clearError()
      setSuccessMessage(null)
    } else {
      setHasChanges(false)
      setSuccessMessage(null)
    }
  }, [isOpen, clearError])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (hasChanges) {
          if (window.confirm('変更が保存されていません。閉じてもよろしいですか？')) {
            onClose()
          }
        } else {
          onClose()
        }
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
  }, [isOpen, hasChanges, onClose])

  useEffect(() => {
    if (!formData.username || formData.username === profile?.username) {
      setUsernameAvailable(null)
      return
    }

    const timeoutId = setTimeout(async () => {
      if (formData.username.length >= 3) {
        setUsernameChecking(true)
        try {
          const available = await checkUsernameAvailable(formData.username)
          setUsernameAvailable(available)
        } catch (error) {
          console.error('Username check error:', error)
          setUsernameAvailable(null)
        } finally {
          setUsernameChecking(false)
        }
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [formData.username, profile?.username, checkUsernameAvailable])

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.username.trim()) {
      errors.username = 'ユーザー名を入力してください'
    } else if (formData.username.length < 3) {
      errors.username = '3文字以上必要です'
    } else if (formData.username.length > 20) {
      errors.username = '20文字以下にしてください'
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = '英数字とアンダースコアのみ'
    } else if (formData.username !== profile?.username && usernameAvailable === false) {
      errors.username = 'このユーザー名は使用されています'
    }

    if (formData.displayName.length > 50) {
      errors.displayName = '50文字以下にしてください'
    }

    if (formData.bio.length > 160) {
      errors.bio = '160文字以下にしてください'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      setAvatarUploading(true)

      const updates: Partial<Profile> = {
        username: formData.username.trim(),
        display_name: formData.displayName.trim() || formData.username.trim(),
        bio: formData.bio.trim() || null,
        language: formData.language
      }

      // アバター画像のアップロード
      if (avatarFile && profile?.id) {
        try {
          const avatarUrl = await storage.uploadAvatar(profile.id, avatarFile)
          updates.avatar_url = avatarUrl
        } catch (uploadError: any) {
          setValidationErrors(prev => ({
            ...prev,
            avatar: `アップロード失敗: ${uploadError.message || '不明なエラー'}`
          }))
          setAvatarUploading(false)
          return
        }
      } else if (avatarPreview === null && profile?.avatar_url) {
        updates.avatar_url = null
      }

      await updateProfile(updates)

      setHasChanges(false)
      setAvatarFile(null)
      setSuccessMessage('保存しました！')

      window.dispatchEvent(new CustomEvent('profileUpdated'))

      setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)

      if (mode === 'setup') {
        setTimeout(() => {
          onClose()
        }, 1500)
      }
    } catch (error: any) {
      setValidationErrors(prev => ({
        ...prev,
        general: `保存失敗: ${error.message || '不明なエラー'}`
      }))
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setHasChanges(true)

    // 言語設定が変更された場合、i18nの言語も切り替える
    if (name === 'language') {
      console.log('言語変更:', value)
      i18n.changeLanguage(value).then(() => {
        console.log('i18n言語切り替え完了:', i18n.language)
      })
    }

    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setValidationErrors(prev => ({ ...prev, avatar: '5MB以下にしてください' }))
      return
    }

    if (!file.type.startsWith('image/')) {
      setValidationErrors(prev => ({ ...prev, avatar: '画像ファイルを選択してください' }))
      return
    }

    setAvatarFile(file)
    setHasChanges(true)

    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    if (validationErrors.avatar) {
      setValidationErrors(prev => ({ ...prev, avatar: '' }))
    }
  }

  const handleRemoveAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
    setHasChanges(true)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(4px)'
    }}>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0 }}
        onClick={() => {
          if (hasChanges) {
            if (window.confirm('変更が保存されていません。閉じてもよろしいですか？')) {
              onClose()
            }
          } else {
            onClose()
          }
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'relative',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        width: '100%',
        maxWidth: '400px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Close button */}
        <button
          onClick={() => {
            if (hasChanges) {
              if (window.confirm('変更が保存されていません。閉じてもよろしいですか？')) {
                onClose()
              }
            } else {
              onClose()
            }
          }}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: '#f3f4f6',
            color: '#6b7280',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            zIndex: 10
          }}
          disabled={loading}
        >
          ✕
        </button>

        {/* Header */}
        <div style={{
          padding: '24px 24px 16px',
          borderBottom: '1px solid #f3f4f6',
          textAlign: 'center'
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '700',
            color: '#111827',
            margin: 0
          }}>
            {title || (mode === 'setup' ? 'プロフィール設定' : 'プロフィール編集')}
          </h2>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px'
        }}>
          {error && (
            <div style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '13px'
            }}>
              {error}
            </div>
          )}

          {validationErrors.general && (
            <div style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '13px'
            }}>
              {validationErrors.general}
            </div>
          )}

          {successMessage && (
            <div style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              color: '#16a34a',
              fontSize: '13px'
            }}>
              ✓ {successMessage}
            </div>
          )}

          <form id="profile-form" onSubmit={handleSubmit}>
            {/* Avatar */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px',
              paddingBottom: '20px',
              borderBottom: '1px solid #f3f4f6'
            }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}>
                  {avatarPreview || profile?.avatar_url ? (
                    <img
                      src={avatarPreview || profile?.avatar_url || ''}
                      alt="Avatar"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ color: 'white', fontSize: '28px', fontWeight: 'bold' }}>
                      {(formData.displayName || formData.username || '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {(avatarPreview || profile?.avatar_url) && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      width: '24px',
                      height: '24px',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      borderRadius: '50%',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
                id="avatar-upload"
                disabled={loading || avatarUploading}
              />
              <label
                htmlFor="avatar-upload"
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500'
                }}
              >
                {avatarUploading ? 'アップロード中...' : '画像を選択'}
              </label>
              {validationErrors.avatar && (
                <p style={{ color: '#dc2626', fontSize: '11px', margin: 0 }}>{validationErrors.avatar}</p>
              )}
            </div>

            {/* Username */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '6px'
              }}>
                ユーザー名 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    paddingRight: '36px',
                    fontSize: '14px',
                    border: `2px solid ${validationErrors.username ? '#fca5a5' : usernameAvailable === true ? '#86efac' : usernameAvailable === false ? '#fca5a5' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    backgroundColor: validationErrors.username || usernameAvailable === false ? '#fef2f2' : usernameAvailable === true ? '#f0fdf4' : '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  placeholder="例: taro_yamada"
                  disabled={loading}
                />
                <div style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)'
                }}>
                  {usernameChecking ? (
                    <span style={{ fontSize: '12px' }}>...</span>
                  ) : usernameAvailable === true ? (
                    <span style={{ color: '#22c55e' }}>✓</span>
                  ) : usernameAvailable === false ? (
                    <span style={{ color: '#ef4444' }}>✗</span>
                  ) : null}
                </div>
              </div>
              {validationErrors.username ? (
                <p style={{ marginTop: '4px', fontSize: '11px', color: '#dc2626' }}>{validationErrors.username}</p>
              ) : (
                <p style={{ marginTop: '4px', fontSize: '11px', color: '#6b7280' }}>3-20文字、英数字と_のみ</p>
              )}
            </div>

            {/* Display Name */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '6px'
              }}>
                表示名
              </label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: `2px solid ${validationErrors.displayName ? '#fca5a5' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                placeholder="例: 山田太郎"
                disabled={loading}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ fontSize: '11px', color: '#6b7280' }}>空白の場合はユーザー名が表示</span>
                <span style={{ fontSize: '11px', color: formData.displayName.length > 50 ? '#ef4444' : '#9ca3af' }}>
                  {formData.displayName.length}/50
                </span>
              </div>
            </div>

            {/* Bio */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '6px'
              }}>
                自己紹介
              </label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: `2px solid ${validationErrors.bio ? '#fca5a5' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  outline: 'none',
                  resize: 'none',
                  boxSizing: 'border-box'
                }}
                placeholder="あなたについて教えてください..."
                disabled={loading}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <span style={{ fontSize: '11px', color: formData.bio.length > 160 ? '#ef4444' : '#9ca3af' }}>
                  {formData.bio.length}/160
                </span>
              </div>
            </div>

            {/* Language */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '6px'
              }}>
                言語設定
              </label>
              <select
                name="language"
                value={formData.language}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  boxSizing: 'border-box'
                }}
                disabled={loading}
              >
                {supportedLanguages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeName}
                  </option>
                ))}
              </select>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #f3f4f6',
          display: 'flex',
          gap: '8px'
        }}>
          {mode === 'edit' && (
            <button
              type="button"
              onClick={() => {
                if (hasChanges) {
                  if (window.confirm('変更が保存されていません。閉じてもよろしいですか？')) {
                    onClose()
                  }
                } else {
                  onClose()
                }
              }}
              style={{
                flex: 1,
                padding: '10px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                color: '#374151',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
              disabled={loading}
            >
              キャンセル
            </button>
          )}

          <button
            type="submit"
            form="profile-form"
            disabled={loading || !hasChanges || Object.keys(validationErrors).length > 0 || avatarUploading}
            style={{
              flex: mode === 'edit' ? 1 : undefined,
              width: mode === 'setup' ? '100%' : undefined,
              padding: '10px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: '#8b5cf6',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '600',
              cursor: loading || !hasChanges ? 'not-allowed' : 'pointer',
              opacity: loading || !hasChanges ? 0.5 : 1
            }}
          >
            {loading || avatarUploading ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProfileSetup
