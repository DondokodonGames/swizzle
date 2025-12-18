import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PublicGame } from '../social/types/SocialTypes';
import { SocialService } from '../social/services/SocialService';
import { supabase, auth } from '../lib/supabase';
import { GameProjectCopier } from '../services/editor/GameProjectCopier';
import { ProjectStorageManager } from '../services/ProjectStorageManager';
import { GameProject } from '../types/editor/GameProject';
import { AdUnit } from './monetization/AdUnit';
import { AdPlacement } from '../types/MonetizationTypes';

interface GameScore {
  points: number;
  time: number;
  success: boolean;
}

interface BridgeScreenProps {
  currentGame: PublicGame;
  nextGame: PublicGame | null;
  score: GameScore | null;
  timeLeft: number;
  totalGames: number;
  currentIndex: number;
  onNextGame: () => void;
  onPreviousGame: () => void;
  onReplayGame: () => void;
  onExit?: () => void;
  inline?: boolean;
}

export const BridgeScreen: React.FC<BridgeScreenProps> = ({
  currentGame,
  nextGame,
  score,
  timeLeft,
  totalGames,
  currentIndex,
  onNextGame,
  onPreviousGame,
  onReplayGame,
  onExit,
  inline = false,
}) => {
  const { t } = useTranslation();

  const [isLiked, setIsLiked] = useState(currentGame.isLiked || false);
  const [likeCount, setLikeCount] = useState(currentGame.stats.likes);
  const [isLiking, setIsLiking] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [copiedProjectId, setCopiedProjectId] = useState<string | null>(null);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [animationStage, setAnimationStage] = useState(0);

  const [profileClickEnabled, setProfileClickEnabled] = useState(false);

  useEffect(() => {
    const timers = [
      setTimeout(() => setAnimationStage(1), 100),
      setTimeout(() => setAnimationStage(2), 300),
      setTimeout(() => setAnimationStage(3), 500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    setProfileClickEnabled(false);
    const timer = setTimeout(() => {
      setProfileClickEnabled(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, [currentGame.id]);

  const socialService = useMemo(() => SocialService.getInstance(), []);

  const handleLike = async () => {
    if (isLiking) return;

    setIsLiking(true);
    const newLikeState = !isLiked;
    setIsLiked(newLikeState);
    setLikeCount(prev => newLikeState ? prev + 1 : prev - 1);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.warn('⚠️ ユーザーがログインしていません');
        setIsLiked(!newLikeState);
        setLikeCount(prev => newLikeState ? prev - 1 : prev + 1);
        setIsLiking(false);
        window.dispatchEvent(new CustomEvent('openAuthModal', {
          detail: { mode: 'signin' }
        }));
        return;
      }

      await socialService.toggleLike(currentGame.id, user.id);
      console.log('✅ いいね更新成功');
    } catch (error) {
      console.error('❌ いいね更新エラー:', error);
      setIsLiked(!newLikeState);
      setLikeCount(prev => newLikeState ? prev - 1 : prev + 1);
    } finally {
      setIsLiking(false);
    }
  };

  const handleCopyGame = async () => {
    if (isCopying) return;
    setIsCopying(true);

    try {
      console.log('📋 ゲームコピー開始:', currentGame.title);

      let sourceProjectData: GameProject | null = null;

      if (currentGame.projectData) {
        sourceProjectData = currentGame.projectData as GameProject;
        console.log('✅ projectDataから取得成功');
      } else {
        console.log('⚠️ projectDataが存在しないため、データベースから取得を試みます...');

        const { data, error } = await supabase
          .from('user_games')
          .select('project_data')
          .eq('id', currentGame.id)
          .single();

        if (error || !data?.project_data) {
          console.error('❌ データベース取得エラー:', error);
          throw new Error(t('bridge.errors.gameDataFetchFailed'));
        }

        sourceProjectData = data.project_data as GameProject;
        console.log('✅ データベースから取得成功');
      }

      if (!sourceProjectData) {
        throw new Error(t('bridge.errors.cannotCopy'));
      }

      const copier = GameProjectCopier.getInstance();

      console.log('🔍 コピー可能かチェック中...');
      if (!copier.canCopy(sourceProjectData)) {
        alert(t('bridge.errors.noRulesToCopy'));
        return;
      }

      console.log('✅ コピー可能 - コピー処理開始');
      const copiedProject = copier.copyProject(sourceProjectData);

      const storage = ProjectStorageManager.getInstance();

      const user = await auth.getCurrentUser();
      await storage.saveProject(copiedProject, {
        saveToDatabase: !!user,
        userId: user?.id
      });

      console.log('✅ プロジェクトを保存しました:', copiedProject.id);

      localStorage.setItem('editProjectId', copiedProject.id);
      localStorage.setItem('copiedGameTitle', currentGame.title);
      localStorage.setItem('shouldOpenEditor', 'true');

      setCopiedProjectId(copiedProject.id);
      setShowSuccessModal(true);

      console.log(`✅ 「${currentGame.title}」のルールをコピーしました！`);

    } catch (error) {
      console.error('❌ コピーエラー:', error);
      alert(`${t('bridge.errors.copyFailed')}: ${error instanceof Error ? error.message : t('bridge.errors.unknownError')}`);
    } finally {
      setIsCopying(false);
    }
  };

  const handleOpenEditor = () => {
    if (!copiedProjectId) return;
    window.location.href = `/editor/${copiedProjectId}`;
  };

  const handleGoToFeed = () => {
    console.log('📱 フィードへ遷移');
    window.location.href = '/feed';
  };

  const handleGoToProfile = () => {
    if (!profileClickEnabled) {
      console.log('⏳ プロフィールクリックはクールダウン中です');
      return;
    }
    console.log('👤 プロフィールへ遷移');
    if (currentGame.author.username) {
      window.location.href = `/profile/${currentGame.author.username}`;
    }
  };

  const remainingPercentage = (timeLeft / 10) * 100;

  const containerStyle: React.CSSProperties = {
    position: inline ? 'absolute' as const : 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    background: 'linear-gradient(180deg, #581c87 0%, #000000 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    overflow: 'hidden',
  };

  // 🔧 修正版: PCでは9:16比率維持、スマホでは全画面
  const mainBoxStyle: React.CSSProperties = {
    position: 'relative',
    height: '100vh',         // 🔧 高さを画面いっぱいに
    width: 'auto',           // 🔧 幅はアスペクト比から自動計算
    maxWidth: '100%',        // 🔧 画面幅を超えない
    aspectRatio: '9 / 16',   // 🔧 9:16比率維持
    margin: '0 auto',        // 🔧 中央揃え
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const titleIconStyle: React.CSSProperties = {
    fontSize: '96px',
    marginBottom: '16px',
    transform: animationStage >= 1 ? 'scale(1)' : 'scale(0)',
    transition: 'transform 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  };

  const titleTextStyle: React.CSSProperties = {
    color: 'white',
    fontSize: '60px',
    fontWeight: 'bold',
    marginBottom: '16px',
    textAlign: 'center',
    transform: animationStage >= 2 ? 'translateY(0)' : 'translateY(30px)',
    opacity: animationStage >= 2 ? 1 : 0,
    transition: 'all 0.5s ease-out',
  };

  const scoreCardStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(88, 28, 135, 0.5) 0%, rgba(157, 23, 77, 0.5) 100%)',
    backdropFilter: 'blur(10px)',
    borderRadius: '32px',
    padding: '32px',
    marginBottom: '24px',
    border: '2px solid rgba(168, 85, 247, 0.3)',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
    transform: animationStage >= 3 ? 'translateY(0)' : 'translateY(30px)',
    opacity: animationStage >= 3 ? 1 : 0,
    transition: 'all 0.5s ease-out',
  };

  const scoreItemStyle: React.CSSProperties = {
    textAlign: 'center',
    transition: 'transform 0.3s ease',
  };

  const scoreLabelStyle: React.CSSProperties = {
    color: '#d8b4fe',
    fontSize: '20px',
    marginBottom: '12px',
    fontWeight: '600',
  };

  const scoreValueBoxStyle = (gradient: string): React.CSSProperties => ({
    background: gradient,
    borderRadius: '20px',
    padding: '20px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
  });

  const scoreValueTextStyle: React.CSSProperties = {
    color: 'white',
    fontSize: '48px',
    fontWeight: '900',
    textShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
  };

  const buttonStyle = (bgColor: string, hoverColor?: string): React.CSSProperties => ({
    background: bgColor,
    color: 'white',
    fontSize: '24px',
    fontWeight: 'bold',
    padding: '24px',
    borderRadius: '20px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
    width: '100%',
  });

  return (
    <div style={containerStyle}>
      <div style={mainBoxStyle} className="bridge-main-box">
        {/* スクロール可能なコンテンツエリア */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '20px',
          paddingBottom: '140px',
          WebkitOverflowScrolling: 'touch',
        }}>
          {/* 結果アイコン */}
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '100px', marginBottom: '10px' }}>
              {score?.success ? '😊' : '😢'}
            </div>
          </div>

          {/* 作成者情報 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div
              onClick={handleGoToProfile}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flex: 1,
                cursor: profileClickEnabled ? 'pointer' : 'default',
                opacity: profileClickEnabled ? 1 : 0.5,
                transition: 'opacity 0.3s ease',
                WebkitTapHighlightColor: profileClickEnabled ? undefined : 'transparent',
                pointerEvents: profileClickEnabled ? 'auto' : 'none',
              }}
            >
              <div style={{
                width: '50px',
                height: '50px',
                background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '24px',
                fontWeight: 'bold',
                flexShrink: 0,
              }}>
                {currentGame.author.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ 
                  color: 'white', 
                  fontWeight: 'bold', 
                  fontSize: '18px', 
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {currentGame.author.name}
                </p>
                <p style={{ 
                  color: '#9ca3af', 
                  fontSize: '14px', 
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {currentGame.title}
                </p>
              </div>
              {!profileClickEnabled && (
                <div style={{
                  fontSize: '12px',
                  color: '#9ca3af',
                  padding: '4px 8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  flexShrink: 0,
                }}>
                  ⏳
                </div>
              )}
            </div>
            <button
              onClick={handleLike}
              disabled={isLiking}
              style={{
                padding: '10px 16px',
                borderRadius: '12px',
                fontWeight: 'bold',
                fontSize: '20px',
                border: 'none',
                cursor: isLiking ? 'not-allowed' : 'pointer',
                background: isLiked ? '#ef4444' : 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                opacity: isLiking ? 0.5 : 1,
                flexShrink: 0,
              }}
            >
              {isLiked ? '❤️' : '🤍'} {likeCount}
            </button>
          </div>

          {/* 広告エリア */}
          <div style={{ marginBottom: '16px' }}>
            <AdUnit
              placement={AdPlacement.GAME_BRIDGE}
              className="bridge-ad"
            />
          </div>
        </div>

        {/* ボタンエリア（画面下部固定） */}
        <div className="bridge-bottom-buttons" style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: '8px',
          padding: '0 20px 12px 20px',
          background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)',
        }}>
          <div style={{
            display: 'flex',
            gap: 0,
          }}>
            <button
              onClick={handleCopyGame}
              disabled={isCopying}
              style={{
                flex: 1,
                padding: '16px 0',
                border: 'none',
                background: 'rgba(16, 185, 129, 0.9)',
                color: 'white',
                fontSize: '20px',
                cursor: isCopying ? 'not-allowed' : 'pointer',
                opacity: isCopying ? 0.5 : 1,
                transition: 'opacity 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                borderRadius: '12px 0 0 12px',
              }}
              onMouseEnter={(e) => !isCopying && (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={(e) => !isCopying && (e.currentTarget.style.opacity = '1')}
            >
              <div className="btn-icon" style={{ fontSize: '28px' }}>📋</div>
              <div className="btn-label" style={{ fontSize: '12px' }}>{t('bridge.copyButton')}</div>
            </button>

            <button
              onClick={onNextGame}
              style={{
                flex: 1,
                padding: '16px 0',
                border: 'none',
                background: 'rgba(59, 130, 246, 0.9)',
                color: 'white',
                fontSize: '20px',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              {nextGame?.thumbnail ? (
                <img
                  src={nextGame.thumbnail}
                  alt={nextGame.title}
                  className="btn-icon"
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <div className="btn-icon" style={{ fontSize: '28px' }}>🎮</div>
              )}
              <div className="btn-label" style={{ fontSize: '12px' }}>{t('bridge.nextButton')}</div>
            </button>

            <button
              onClick={onReplayGame}
              style={{
                flex: 1,
                padding: '16px 0',
                border: 'none',
                background: 'rgba(236, 72, 153, 0.9)',
                color: 'white',
                fontSize: '20px',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <div className="btn-icon" style={{ fontSize: '28px' }}>🔄</div>
              <div className="btn-label" style={{ fontSize: '12px' }}>{t('bridge.againButton')}</div>
            </button>

            <button
              onClick={onNextGame}
              style={{
                flex: 1,
                padding: '16px 0',
                border: 'none',
                background: 'rgba(239, 68, 68, 0.9)',
                color: 'white',
                fontSize: '20px',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                borderRadius: '0 12px 12px 0',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <div className="btn-icon" style={{ fontSize: '28px' }}>⏭️</div>
              <div className="btn-label" style={{ fontSize: '12px' }}>{t('bridge.skipButton')}</div>
            </button>
          </div>
        </div>

        {/* 残り時間バー */}
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '8px',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${remainingPercentage}%`,
            backgroundColor: (() => {
              if (remainingPercentage > 50) return '#10b981';
              if (remainingPercentage > 20) return '#f59e0b';
              return '#ef4444';
            })(),
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }} />
        </div>
      </div>

      {/* 成功モーダル */}
      {showSuccessModal && copiedProjectId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            borderRadius: '24px',
            padding: '32px',
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
            <h2 style={{ color: 'white', fontSize: '28px', fontWeight: 'bold', marginBottom: '12px' }}>
              {t('bridge.copySuccessTitle')}
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '16px', marginBottom: '24px' }}>
              {t('bridge.copySuccessMessage')}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('switchToEditor'));
                  setShowSuccessModal(false);
                }}
                style={{
                  width: '100%',
                  background: 'white',
                  color: '#059669',
                  fontWeight: 'bold',
                  fontSize: '18px',
                  padding: '14px',
                  borderRadius: '16px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                🎨 {t('bridge.openEditorButton')}
              </button>

              <button
                onClick={() => setShowSuccessModal(false)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  padding: '12px',
                  borderRadius: '16px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {t('bridge.editLaterButton')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* スマホ用メディアクエリ */}
      <style>{`
        @media (max-width: 768px), (max-aspect-ratio: 9/16) {
          .bridge-main-box {
            aspect-ratio: unset !important;
            width: 100% !important;
            height: 100% !important;
            max-width: 100% !important;
            max-height: 100% !important;
          }
          .bridge-bottom-buttons {
            padding: 0 12px 8px 12px !important;
          }
          .bridge-bottom-buttons button {
            padding: 12px 0 !important;
            font-size: 16px !important;
          }
          .bridge-bottom-buttons .btn-icon {
            font-size: 22px !important;
          }
          .bridge-bottom-buttons .btn-label {
            font-size: 10px !important;
          }
        }

        /* より小さな画面用 (480px以下) */
        @media (max-width: 480px) {
          .bridge-bottom-buttons {
            padding: 0 8px 6px 8px !important;
          }
          .bridge-bottom-buttons button {
            padding: 10px 0 !important;
            font-size: 14px !important;
          }
          .bridge-bottom-buttons .btn-icon {
            font-size: 20px !important;
          }
          .bridge-bottom-buttons .btn-label {
            font-size: 9px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default BridgeScreen;