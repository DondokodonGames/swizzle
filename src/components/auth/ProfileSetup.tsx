// src/components/auth/ProfileSetup.tsx
// プロフィール設定・編集画面（モダンデザイン版）

import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { SubscriptionManager } from '../monetization/SubscriptionManager'
import { storage } from '../../lib/supabase'
import type { Profile } from '../../lib/database.types'

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
  const { profile, updateProfile, checkUsernameAvailable, loading, error, clearError } = useAuth()

  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile')

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
      setActiveTab('profile')
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

      if (avatarFile && profile?.id) {
        const avatarUrl = await storage.uploadAvatar(profile.id, avatarFile)
        updates.avatar_url = avatarUrl
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
    } catch (error) {
      console.error('Profile update error:', error)
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setHasChanges(true)

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
    <div className="fixed inset-0 z-50 overflow-y-auto backdrop-blur-sm bg-black/30 flex items-center justify-center p-4">
      <div
        className="fixed inset-0"
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

      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: 'slideUp 0.3s ease-out'
        }}
      >
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
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center text-gray-600 hover:text-gray-800 z-10"
          disabled={loading}
        >
          ✕
        </button>

        {/* ヘッダー */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 text-center mb-3">
            {title || (mode === 'setup' ? '✨ プロフィール設定' : '⚙️ プロフィール編集')}
          </h2>

          {mode === 'edit' && (
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'profile'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                👤 プロフィール
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'settings'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                ⚙️ 設定
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && activeTab === 'profile' && (
            <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {successMessage && activeTab === 'profile' && (
            <div className="mb-3 p-2.5 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
              <span>✓</span>
              <span>{successMessage}</span>
            </div>
          )}

          {activeTab === 'profile' && (
            <form id="profile-form" onSubmit={handleSubmit} className="space-y-3.5">
              {/* アバター */}
              <div className="flex flex-col items-center gap-2.5 pb-3 border-b border-gray-100">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center ring-4 ring-white shadow-lg">
                    {avatarPreview || profile?.avatar_url ? (
                      <img
                        src={avatarPreview || profile?.avatar_url || ''}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-2xl font-bold">
                        {(formData.displayName || formData.username || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {(avatarPreview || profile?.avatar_url) && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors shadow-md"
                      title="削除"
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
                  className="hidden"
                  id="avatar-upload"
                  disabled={loading || avatarUploading}
                />
                <label
                  htmlFor="avatar-upload"
                  className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full cursor-pointer hover:shadow-lg transition-all text-xs font-medium"
                >
                  {avatarUploading ? '📤 アップロード中...' : '📷 画像を選択'}
                </label>
                {validationErrors.avatar && (
                  <p className="text-xs text-red-600">{validationErrors.avatar}</p>
                )}
              </div>

              {/* ユーザー名 */}
              <div>
                <label htmlFor="username" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  ユーザー名 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 pr-10 text-sm border-2 rounded-lg transition-all ${
                      validationErrors.username ? 'border-red-300 bg-red-50' :
                      usernameAvailable === true ? 'border-green-300 bg-green-50' :
                      usernameAvailable === false ? 'border-red-300 bg-red-50' :
                      'border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100'
                    }`}
                    placeholder="例: taro_yamada"
                    disabled={loading}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {usernameChecking ? (
                      <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    ) : usernameAvailable === true ? (
                      <span className="text-green-500 text-lg">✓</span>
                    ) : usernameAvailable === false ? (
                      <span className="text-red-500 text-lg">✕</span>
                    ) : null}
                  </div>
                </div>
                {validationErrors.username ? (
                  <p className="mt-1 text-xs text-red-600">{validationErrors.username}</p>
                ) : usernameAvailable === true && formData.username !== profile?.username ? (
                  <p className="mt-1 text-xs text-green-600">✓ 使用できます</p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">3-20文字、英数字と_のみ</p>
                )}
              </div>

              {/* 表示名 */}
              <div>
                <label htmlFor="displayName" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  表示名
                </label>
                <input
                  type="text"
                  id="displayName"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 text-sm border-2 rounded-lg transition-all ${
                    validationErrors.displayName ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100'
                  }`}
                  placeholder="例: 山田太郎"
                  disabled={loading}
                />
                <div className="flex justify-between items-center mt-1">
                  {validationErrors.displayName ? (
                    <p className="text-xs text-red-600">{validationErrors.displayName}</p>
                  ) : (
                    <p className="text-xs text-gray-500">空白の場合はユーザー名が表示</p>
                  )}
                  <span className={`text-xs ${formData.displayName.length > 50 ? 'text-red-500' : 'text-gray-400'}`}>
                    {formData.displayName.length}/50
                  </span>
                </div>
              </div>

              {/* 自己紹介 */}
              <div>
                <label htmlFor="bio" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  自己紹介
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows={3}
                  className={`w-full px-3 py-2 text-sm border-2 rounded-lg transition-all resize-none ${
                    validationErrors.bio ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100'
                  }`}
                  placeholder="あなたについて教えてください..."
                  disabled={loading}
                />
                <div className="flex justify-between items-center mt-1">
                  {validationErrors.bio ? (
                    <p className="text-xs text-red-600">{validationErrors.bio}</p>
                  ) : (
                    <span className="text-xs text-gray-500"></span>
                  )}
                  <span className={`text-xs ${formData.bio.length > 160 ? 'text-red-500' : 'text-gray-400'}`}>
                    {formData.bio.length}/160
                  </span>
                </div>
              </div>

              {/* 言語設定 */}
              <div>
                <label htmlFor="language" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  🌍 言語設定
                </label>
                <select
                  id="language"
                  name="language"
                  value={formData.language}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
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
            </form>
          )}

          {activeTab === 'settings' && mode === 'edit' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm">
                  <span className="text-lg">💎</span>
                  <span>サブスクリプション管理</span>
                </h3>
                <SubscriptionManager />
              </div>
            </div>
          )}
        </div>

        {activeTab === 'profile' && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex gap-2">
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
                className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-white transition-all"
                disabled={loading}
              >
                キャンセル
              </button>
            )}

            <button
              type="submit"
              form="profile-form"
              disabled={loading || !hasChanges || Object.keys(validationErrors).length > 0 || avatarUploading}
              className={`${mode === 'edit' ? 'flex-1' : 'w-full'} bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2.5 rounded-lg text-sm font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none`}
            >
              {loading || avatarUploading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {avatarUploading ? 'アップロード中...' : '保存中...'}
                </span>
              ) : (
                '💾 保存'
              )}
            </button>
          </div>
        )}
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

export default ProfileSetup
