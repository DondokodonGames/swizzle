// src/pages/ProfilePage.tsx

import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/database.types'
import type { Subscription } from '../types/MonetizationTypes'
import { PremiumBadge } from '../components/monetization/PremiumBadge'
import { MVPSubscriptionPlan } from '../types/MonetizationTypes'
import ProfileSetup from '../components/auth/ProfileSetup'
import { SocialService } from '../social/services/SocialService'
import type { UserGame } from '../social/types/SocialTypes'
import { supportedLanguages } from '../i18n'
import { getErrorMessage } from '../utils/errorUtils'

// 言語コードから表示名を取得するヘルパー関数
const getLanguageDisplay = (code: string): string => {
  const lang = supportedLanguages.find(l => l.code === code)
  if (lang) {
    const flags: Record<string, string> = {
      en: '🇺🇸', ja: '🇯🇵', fr: '🇫🇷', it: '🇮🇹', de: '🇩🇪',
      es: '🇪🇸', zh: '🇨🇳', ko: '🇰🇷', pt: '🇧🇷'
    }
    return `${flags[code] || ''} ${lang.nativeName}`
  }
  return code
}

interface ProfilePageProps {
  // オプションでuserIdを直接渡すこともできる
  userId?: string
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ userId: propUserId }) => {
  const { t } = useTranslation()
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [userGames, setUserGames] = useState<UserGame[]>([])
  const [gamesLoading, setGamesLoading] = useState(false)

  const socialService = useMemo(() => SocialService.getInstance(), [])

  // 現在のユーザーを取得
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    fetchCurrentUser()
  }, [])

  // isOwnProfileを別途計算（profileとcurrentUserの両方が揃ったとき）
  useEffect(() => {
    if (profile && currentUser) {
      setIsOwnProfile(currentUser.id === profile.id)
    } else {
      setIsOwnProfile(false)
    }
  }, [profile, currentUser])

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true)
        setError(null)

        if (propUserId) {
          // userIdが直接渡された場合
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', propUserId)
            .single()

          if (error) throw error
          setProfile(data)

          // サブスクリプション情報も取得
          const { data: subData } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', propUserId)
            .single()

          if (subData) {
            setSubscription(subData as Subscription)
          }
        } else if (username) {
          // usernameからプロフィールを検索
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', username)
            .single()

          if (error) throw error
          setProfile(data)

          // サブスクリプション情報も取得
          const { data: subData } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', data.id)
            .single()

          if (subData) {
            setSubscription(subData as Subscription)
          }
        } else {
          throw new Error('ユーザー情報が指定されていません')
        }
      } catch (error: unknown) {
        console.error('Profile load error:', error)
        setError(getErrorMessage(error) || t('profile.loadError'))
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [username, propUserId])

  // ユーザーの作成ゲームを取得
  useEffect(() => {
    const loadUserGames = async () => {
      if (!profile?.id) return

      setGamesLoading(true)
      try {
        const games = await socialService.getUserGames(profile.id, 'published')
        setUserGames(games)
      } catch (error) {
        console.error('Failed to load user games:', error)
      } finally {
        setGamesLoading(false)
      }
    }

    loadUserGames()
  }, [profile?.id, socialService])

  // ログアウト処理
  const handleLogout = async () => {
    if (loggingOut) return

    if (!window.confirm(t('common.logout') + '?')) return

    setLoggingOut(true)
    try {
      await supabase.auth.signOut()
      navigate('/')
    } catch (error) {
      console.error('Logout error:', error)
      setLoggingOut(false)
    }
  }

  // プロフィール更新後の再読み込み
  const handleProfileUpdated = () => {
    // プロフィールを再読み込み
    window.location.reload()
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p style={{ color: '#6b7280' }}>{t('profile.loading')}</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          maxWidth: '400px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>😔</div>
          <h2 style={{ color: '#dc2626', marginBottom: '16px' }}>
            {t('profile.notFound')}
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            {error || '指定されたユーザーは存在しないか、削除されました'}
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600'
            }}
          >
            {t('common.backToHome')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {/* ヘッダー */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '24px',
          gap: '16px'
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ← {t('common.back')}
          </button>
          <h1 style={{
            color: 'white',
            fontSize: '24px',
            fontWeight: 'bold',
            margin: 0,
            flex: 1
          }}>
            {t('profile.title')}
          </h1>

          {/* 自分のプロフィールの場合、編集・ログアウトボタンを表示 */}
          {isOwnProfile && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowEditModal(true)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  color: '#7c3aed',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                {t('common.edit')}
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'rgba(239, 68, 68, 0.9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loggingOut ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  opacity: loggingOut ? 0.7 : 1
                }}
              >
                {loggingOut ? t('profile.loggingOut') : t('common.logout')}
              </button>
            </div>
          )}
        </div>

        {/* プロフィールカード */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}>
          {/* アバターとユーザー情報 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            marginBottom: '32px',
            paddingBottom: '32px',
            borderBottom: '1px solid #e5e7eb'
          }}>
            {/* アバター */}
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0
            }}>
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <span style={{
                  color: 'white',
                  fontSize: '48px',
                  fontWeight: 'bold'
                }}>
                  {(profile.display_name || profile.username).charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* ユーザー情報 */}
            <div style={{ flex: 1 }}>
              <h2 style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#111827',
                margin: '0 0 8px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                {profile.display_name || profile.username}
                {/* Premium Badge */}
                {subscription && subscription.plan_type === MVPSubscriptionPlan.PREMIUM && (
                  <PremiumBadge size="medium" showLabel={true} />
                )}
              </h2>
              <p style={{
                fontSize: '18px',
                color: '#6b7280',
                margin: '0 0 16px 0'
              }}>
                @{profile.username}
              </p>
              {profile.bio && (
                <p style={{
                  fontSize: '16px',
                  color: '#374151',
                  lineHeight: '1.6',
                  margin: 0
                }}>
                  {profile.bio}
                </p>
              )}
            </div>
          </div>

          {/* 追加情報 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px'
          }}>
            <div style={{
              padding: '20px',
              backgroundColor: '#f9fafb',
              borderRadius: '12px'
            }}>
              <div style={{
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '4px'
              }}>
                言語設定
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#111827'
              }}>
                {getLanguageDisplay(profile.language)}
              </div>
            </div>

            <div style={{
              padding: '20px',
              backgroundColor: '#f9fafb',
              borderRadius: '12px'
            }}>
              <div style={{
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '4px'
              }}>
                登録日
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#111827'
              }}>
                {new Date(profile.created_at).toLocaleDateString('ja-JP')}
              </div>
            </div>

            {profile.age && (
              <div style={{
                padding: '20px',
                backgroundColor: '#f9fafb',
                borderRadius: '12px'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  marginBottom: '4px'
                }}>
                  年齢
                </div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#111827'
                }}>
                  {profile.age}歳
                </div>
              </div>
            )}
          </div>

          {/* ユーザーの作成したゲーム一覧 */}
          <div style={{ marginTop: '40px' }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '16px'
            }}>
              {t('profile.createdGames')}
            </h3>

            {gamesLoading ? (
              <div style={{
                padding: '32px',
                backgroundColor: '#f9fafb',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                  読み込み中...
                </p>
              </div>
            ) : userGames.length === 0 ? (
              <div style={{
                padding: '32px',
                backgroundColor: '#f9fafb',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                  {t('profile.noGamesYet')}
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '12px'
              }}>
                {userGames.map((game) => (
                  <div
                    key={game.id}
                    style={{
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    {/* サムネイル */}
                    <div style={{
                      aspectRatio: '9 / 16',
                      backgroundColor: '#f3f4f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden'
                    }}>
                      {game.thumbnail ? (
                        <img
                          src={game.thumbnail}
                          alt={game.title}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: '32px' }}>🎮</span>
                      )}
                    </div>

                    {/* ゲーム情報 */}
                    <div style={{ padding: '8px' }}>
                      <p style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#111827',
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {game.title}
                      </p>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '4px',
                        fontSize: '10px',
                        color: '#6b7280'
                      }}>
                        <span>❤️ {game.stats?.likes || 0}</span>
                        <span>👁️ {game.stats?.views || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* プロフィール編集モーダル */}
      <ProfileSetup
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          handleProfileUpdated()
        }}
        mode="edit"
        title={t('profile.editProfile')}
      />
    </div>
  )
}

export default ProfilePage
