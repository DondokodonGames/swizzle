// src/components/auth/ProfileSetup.tsx
// プロフィール設定・編集画面（Phase M: SubscriptionManager統合版）
// タブ構造: プロフィール / 設定

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { SubscriptionManager } from '../monetization/SubscriptionManager'
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
  
  // タブ管理（setup モードでは常にprofile、edit モードではタブ切り替え可能）
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

  // 既存プロフィールデータの読み込み
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

  // モーダル開閉時のリセット
  useEffect(() => {
    if (isOpen) {
      setValidationErrors({})
      clearError()
      setActiveTab('profile') // モーダルを開くたびにprofileタブに戻す
    } else {
      setHasChanges(false)
    }
  }, [isOpen, clearError])

  // Escキーでモーダルを閉じる（変更がある場合は確認）
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

  // ユーザー名の可用性チェック（デバウンス）
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

  // バリデーション
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    
    if (!formData.username.trim()) {
      errors.username = 'ユーザー名を入力してください'
    } else if (formData.username.length < 3) {
      errors.username = 'ユーザー名は3文字以上である必要があります'
    } else if (formData.username.length > 20) {
      errors.username = 'ユーザー名は20文字以下である必要があります'
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = 'ユーザー名は英数字とアンダースコアのみ使用できます'
    } else if (formData.username !== profile?.username && usernameAvailable === false) {
      errors.username = 'このユーザー名は既に使用されています'
    }
    
    if (formData.displayName.length > 50) {
      errors.displayName = '表示名は50文字以下である必要があります'
    }
    
    if (formData.bio.length > 160) {
      errors.bio = '自己紹介は160文字以下である必要があります'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // フォーム送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    try {
      const updates: Partial<Profile> = {
        username: formData.username.trim(),
        display_name: formData.displayName.trim() || formData.username.trim(),
        bio: formData.bio.trim() || null,
        language: formData.language
      }
      
      await updateProfile(updates)
      setHasChanges(false)
      onClose()
    } catch (error) {
      console.error('Profile update error:', error)
    }
  }

  // 入力変更処理
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setHasChanges(true)
    
    // バリデーションエラーをクリア
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  // 文字数カウンター
  const CharacterCounter: React.FC<{ current: number; max: number }> = ({ current, max }) => (
    <span className={`text-xs ${current > max ? 'text-red-500' : 'text-gray-400'}`}>
      {current}/{max}
    </span>
  )

  // モーダルが閉じている場合は何も表示しない
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* オーバーレイ */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
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
      
      {/* モーダル本体 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 transform transition-all max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 閉じるボタン */}
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
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* ヘッダー */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-2xl">👤</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {title || (mode === 'setup' ? 'プロフィール設定' : 'プロフィール編集')}
            </h2>
            <p className="text-gray-600 mt-2">
              {mode === 'setup' 
                ? 'あなたのプロフィールを設定しましょう' 
                : 'プロフィール情報とサブスクリプションを管理できます'
              }
            </p>
          </div>

          {/* タブ（edit モードのみ表示） */}
          {mode === 'edit' && (
            <div className="flex gap-2 border-b border-gray-200 mb-6">
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-4 py-2 font-bold transition-colors ${
                  activeTab === 'profile'
                    ? 'text-purple-600 border-b-2 border-purple-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                👤 プロフィール
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 font-bold transition-colors ${
                  activeTab === 'settings'
                    ? 'text-purple-600 border-b-2 border-purple-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                ⚙️ 設定
              </button>
            </div>
          )}

          {/* エラーメッセージ */}
          {error && activeTab === 'profile' && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* 変更警告 */}
          {hasChanges && activeTab === 'profile' && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
              💡 変更が未保存です。「保存」ボタンを押してください。
            </div>
          )}

          {/* タブコンテンツ */}
          {activeTab === 'profile' && (
            <>
              {/* フォーム */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* ユーザー名 */}
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                    ユーザー名 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 pr-12 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        validationErrors.username ? 'border-red-300 bg-red-50' : 
                        usernameAvailable === true ? 'border-green-300 bg-green-50' :
                        usernameAvailable === false ? 'border-red-300 bg-red-50' :
                        'border-gray-300'
                      }`}
                      placeholder="半角英数字とアンダースコア"
                      disabled={loading}
                    />
                    {/* ユーザー名チェック状態表示 */}
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {usernameChecking ? (
                        <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : usernameAvailable === true ? (
                        <span className="text-green-500">✓</span>
                      ) : usernameAvailable === false ? (
                        <span className="text-red-500">×</span>
                      ) : null}
                    </div>
                  </div>
                  {validationErrors.username && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.username}</p>
                  )}
                  {!validationErrors.username && usernameAvailable === true && formData.username !== profile?.username && (
                    <p className="mt-1 text-sm text-green-600">このユーザー名は使用できます</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    3-20文字、半角英数字とアンダースコア（_）のみ使用可能
                  </p>
                </div>

                {/* 表示名 */}
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                    表示名
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="displayName"
                      name="displayName"
                      value={formData.displayName}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        validationErrors.displayName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="みんなに表示される名前"
                      disabled={loading}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <CharacterCounter current={formData.displayName.length} max={50} />
                    </div>
                  </div>
                  {validationErrors.displayName && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.displayName}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    空白の場合はユーザー名が表示されます
                  </p>
                </div>

                {/* 自己紹介 */}
                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                    自己紹介
                  </label>
                  <div className="relative">
                    <textarea
                      id="bio"
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      rows={3}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none ${
                        validationErrors.bio ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="あなたについて教えてください..."
                      disabled={loading}
                    />
                    <div className="absolute right-3 bottom-3">
                      <CharacterCounter current={formData.bio.length} max={160} />
                    </div>
                  </div>
                  {validationErrors.bio && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.bio}</p>
                  )}
                </div>

                {/* 言語設定 */}
                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                    言語設定
                  </label>
                  <select
                    id="language"
                    name="language"
                    value={formData.language}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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

                {/* ボタン */}
                <div className="flex gap-3 pt-4">
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
                      className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 focus:ring-4 focus:ring-gray-200 transition-all"
                      disabled={loading}
                    >
                      キャンセル
                    </button>
                  )}
                  
                  <button
                    type="submit"
                    disabled={loading || !hasChanges || Object.keys(validationErrors).length > 0}
                    className={`${mode === 'edit' ? 'flex-1' : 'w-full'} bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 focus:ring-4 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        保存中...
                      </span>
                    ) : (
                      '保存'
                    )}
                  </button>
                </div>
              </form>

              {/* プロフィールプレビュー */}
              {mode === 'edit' && (
                <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">プレビュー</h3>
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {(formData.displayName || formData.username).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">
                        {formData.displayName || formData.username}
                      </h4>
                      <p className="text-sm text-gray-500">@{formData.username}</p>
                      {formData.bio && (
                        <p className="text-sm text-gray-700 mt-1">{formData.bio}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* 設定タブ（Phase M: SubscriptionManager統合） */}
          {activeTab === 'settings' && mode === 'edit' && (
            <div className="space-y-6">
              {/* サブスクリプション管理セクション */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="text-2xl">💎</span>
                  <span>サブスクリプション管理</span>
                </h3>
                <SubscriptionManager />
              </div>

              {/* その他の設定を追加可能 */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <h3 className="font-bold text-gray-800 mb-3">🔔 通知設定</h3>
                <div className="space-y-2">
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">新しいフォロワー</span>
                    <input type="checkbox" className="rounded" defaultChecked />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">いいね通知</span>
                    <input type="checkbox" className="rounded" defaultChecked />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">コメント通知</span>
                    <input type="checkbox" className="rounded" defaultChecked />
                  </label>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4">
                <h3 className="font-bold text-gray-800 mb-3">🔒 プライバシー</h3>
                <div className="space-y-2">
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">プロフィールを公開</span>
                    <input type="checkbox" className="rounded" defaultChecked />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">作品を公開</span>
                    <input type="checkbox" className="rounded" defaultChecked />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfileSetup