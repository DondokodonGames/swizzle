import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PublicGame } from '../social/types/SocialTypes';
import { SocialService } from '../social/services/SocialService';
import { supabase, auth } from '../lib/supabase';
import { GameProjectCopier } from '../services/editor/GameProjectCopier';
import { ProjectStorageManager } from '../services/ProjectStorageManager';
import { GameProject } from '../types/editor/GameProject';
import { AdUnit } from './monetization/AdUnit';
import { AdPlacement } from '../types/MonetizationTypes';

// ゲームURLを生成するヘルパー関数
const generateGameUrl = (gameId: string): string => {
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : 'https://playswizzle.com';
  return `${baseUrl}/play/${gameId}`;
};

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
  const [showShareModal, setShowShareModal] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

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
      let sourceProjectData: GameProject | null = null;

      if (currentGame.projectData) {
        sourceProjectData = currentGame.projectData as GameProject;
      } else {
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
      }

      if (!sourceProjectData) {
        throw new Error(t('bridge.errors.cannotCopy'));
      }

      const copier = GameProjectCopier.getInstance();

      if (!copier.canCopy(sourceProjectData)) {
        alert(t('bridge.errors.noRulesToCopy'));
        return;
      }

      const copiedProject = copier.copyProject(sourceProjectData);

      const storage = ProjectStorageManager.getInstance();

      const user = await auth.getCurrentUser();
      await storage.saveProject(copiedProject, {
        saveToDatabase: !!user,
        userId: user?.id
      });

      localStorage.setItem('editProjectId', copiedProject.id);
      localStorage.setItem('copiedGameTitle', currentGame.title);
      localStorage.setItem('shouldOpenEditor', 'true');

      setCopiedProjectId(copiedProject.id);
      setShowSuccessModal(true);

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
    window.location.href = '/feed';
  };

  const handleGoToProfile = () => {
    if (!profileClickEnabled) {
      return;
    }

    if (currentGame.author?.username) {
      window.location.href = `/profile/${currentGame.author.username}`;
    } else if (currentGame.author?.id) {
      // usernameがない場合はuser IDを使用
      console.warn(`⚠️ usernameがないため、user IDを使用: /profile/${currentGame.author.id}`);
      window.location.href = `/profile/${currentGame.author.id}`;
    } else if (currentGame.author?.name) {
      // nameフィールドがある場合はそれを試す
      console.warn(`⚠️ name フィールドを使用: /profile/${currentGame.author.name}`);
      window.location.href = `/profile/${currentGame.author.name}`;
    } else {
      console.error('❌ プロフィール情報が不完全です', currentGame.author);
      alert('プロフィール情報が見つかりません。開発者ツールのコンソールを確認してください。');
    }
  };

  // ==================== 共有機能 ====================
  const gameUrl = useMemo(() => generateGameUrl(currentGame.id), [currentGame.id]);

  const handleShare = useCallback(() => {
    setShowShareModal(true);
    setUrlCopied(false);
  }, []);

  const handleCopyUrl = useCallback(async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(gameUrl);
      } else {
        // フォールバック: 古いブラウザ対応
        const textArea = document.createElement('textarea');
        textArea.value = gameUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setUrlCopied(true);

      // 3秒後にリセット
      setTimeout(() => setUrlCopied(false), 3000);
    } catch (error) {
      console.error('❌ URLコピー失敗:', error);
    }
  }, [gameUrl]);

  const handleShareTwitter = useCallback(() => {
    const baseText = score
      ? t('bridge.share.resultText', { title: currentGame.title, score: score.points })
      : t('bridge.share.playText', { title: currentGame.title });
    const text = currentGame.description
      ? `${baseText}\n${currentGame.description}`
      : baseText;
    const hashtags = 'Swizzle,IndieGame';
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(gameUrl)}&hashtags=${hashtags}`;
    window.open(url, '_blank', 'width=550,height=420');

    // 共有を記録
    recordShare('twitter');
  }, [currentGame.title, currentGame.description, gameUrl, score, t]);

  const handleShareLine = useCallback(() => {
    const baseText = score
      ? t('bridge.share.resultText', { title: currentGame.title, score: score.points })
      : t('bridge.share.playText', { title: currentGame.title });
    const text = currentGame.description
      ? `${baseText}\n${currentGame.description}`
      : baseText;
    const url = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(gameUrl)}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');

    // 共有を記録
    recordShare('line');
  }, [currentGame.title, currentGame.description, gameUrl, score, t]);

  const handleShareWhatsApp = useCallback(() => {
    const baseText = score
      ? t('bridge.share.resultText', { title: currentGame.title, score: score.points })
      : t('bridge.share.playText', { title: currentGame.title });
    const text = currentGame.description
      ? `${baseText}\n${currentGame.description}\n${gameUrl}`
      : `${baseText}\n${gameUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    recordShare('whatsapp');
  }, [currentGame.title, currentGame.description, gameUrl, score, t]);

  const handleShareFacebook = useCallback(() => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(gameUrl)}`;
    window.open(url, '_blank', 'width=550,height=420');
    recordShare('facebook');
  }, [gameUrl]);

  const handleShareReddit = useCallback(() => {
    const baseTitle = score
      ? t('bridge.share.resultText', { title: currentGame.title, score: score.points })
      : t('bridge.share.playText', { title: currentGame.title });
    const title = currentGame.description
      ? `${baseTitle} - ${currentGame.description}`
      : baseTitle;
    const url = `https://www.reddit.com/submit?url=${encodeURIComponent(gameUrl)}&title=${encodeURIComponent(title)}`;
    window.open(url, '_blank', 'width=550,height=600');
    recordShare('reddit');
  }, [currentGame.title, currentGame.description, gameUrl, score, t]);

  const handleShareDiscord = useCallback(async () => {
    const baseText = score
      ? t('bridge.share.resultText', { title: currentGame.title, score: score.points })
      : t('bridge.share.playText', { title: currentGame.title });
    const fullText = currentGame.description
      ? `${baseText}\n${currentGame.description}\n${gameUrl}`
      : `${baseText}\n${gameUrl}`;
    try {
      await navigator.clipboard.writeText(fullText);
      alert(t('bridge.share.discordCopied'));
      recordShare('discord');
    } catch (error) {
      console.error('Copy failed:', error);
    }
  }, [currentGame.title, currentGame.description, gameUrl, score, t]);

  const handleShareTelegram = useCallback(() => {
    const baseText = score
      ? t('bridge.share.resultText', { title: currentGame.title, score: score.points })
      : t('bridge.share.playText', { title: currentGame.title });
    const text = currentGame.description
      ? `${baseText}\n${currentGame.description}`
      : baseText;
    const url = `https://t.me/share/url?url=${encodeURIComponent(gameUrl)}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    recordShare('telegram');
  }, [currentGame.title, currentGame.description, gameUrl, score, t]);

  const handleShareWeChat = useCallback(async () => {
    // WeChat doesn't have web share URL - copy to clipboard for sharing
    const baseText = score
      ? t('bridge.share.resultText', { title: currentGame.title, score: score.points })
      : t('bridge.share.playText', { title: currentGame.title });
    const fullText = currentGame.description
      ? `${baseText}\n${currentGame.description}\n${gameUrl}`
      : `${baseText}\n${gameUrl}`;
    try {
      await navigator.clipboard.writeText(fullText);
      alert(t('bridge.share.wechatCopied'));
      recordShare('wechat');
    } catch (error) {
      console.error('Copy failed:', error);
    }
  }, [currentGame.title, currentGame.description, gameUrl, score, t]);

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        const baseText = score
          ? t('bridge.share.resultText', { title: currentGame.title, score: score.points })
          : t('bridge.share.playText', { title: currentGame.title });
        const text = currentGame.description
          ? `${baseText}\n${currentGame.description}`
          : baseText;

        await navigator.share({
          title: currentGame.title,
          text: text,
          url: gameUrl,
        });
        recordShare('native');
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('❌ ネイティブ共有失敗:', error);
        }
      }
    }
  }, [currentGame.title, currentGame.description, gameUrl, score, t]);

  const recordShare = async (platform: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await socialService.recordShare(currentGame.id, platform as any, user.id);
      }
    } catch (error) {
      console.error('共有記録エラー:', error);
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

  // 🔧 修正版: PCでは9:16比率維持、スマホでは全画面（より堅牢）
  const mainBoxStyle: React.CSSProperties = {
    position: 'relative',
    height: '100%',           // 🔧 親コンテナに合わせる
    width: '100%',            // 🔧 幅も100%に
    maxWidth: '100%',
    maxHeight: '100%',
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
          paddingBottom: '160px', // ボタンエリアとの重なりを防ぐため増加
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
                minWidth: 0, // flexアイテムの縮小を許可
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
            </div>
            {/* 砂時計といいねボタンを並べて配置 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexShrink: 0, // このエリアは縮小しない
            }}>
              {/* 砂時計アイコン（常に表示してopacityで制御） */}
              <div style={{
                fontSize: '12px',
                color: '#9ca3af',
                padding: '4px 8px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                opacity: profileClickEnabled ? 0 : 1,
                visibility: profileClickEnabled ? 'hidden' : 'visible',
                transition: 'opacity 0.3s ease, visibility 0.3s ease',
              }}>
                ⏳
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
                }}
              >
                {isLiked ? '❤️' : '🤍'} {likeCount}
              </button>
            </div>
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
          background: 'linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0.4) 80%, transparent 100%)',
          pointerEvents: 'none', // グラデーション部分はクリック無効
        }}>
          <div style={{
            display: 'flex',
            gap: 0,
            pointerEvents: 'auto', // ボタンエリアはクリック有効
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
              onClick={handleShare}
              style={{
                flex: 1,
                padding: '16px 0',
                border: 'none',
                background: 'rgba(139, 92, 246, 0.9)',
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
              <div className="btn-icon" style={{ fontSize: '28px' }}>🔗</div>
              <div className="btn-label" style={{ fontSize: '12px' }}>{t('bridge.shareButton')}</div>
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

      {/* 共有モーダル */}
      {showShareModal && (
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
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowShareModal(false);
          }
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
            borderRadius: '24px',
            padding: '32px',
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔗</div>
            <h2 style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
              {t('bridge.share.title')}
            </h2>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '14px',
              marginBottom: '8px',
              wordBreak: 'break-all',
              background: 'rgba(0, 0, 0, 0.2)',
              padding: '12px',
              borderRadius: '12px',
            }}>
              {gameUrl}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
              {/* URLコピーボタン */}
              <button
                onClick={handleCopyUrl}
                style={{
                  width: '100%',
                  background: urlCopied ? '#10b981' : 'white',
                  color: urlCopied ? 'white' : '#7c3aed',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  padding: '14px',
                  borderRadius: '16px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              >
                {urlCopied ? '✓ ' + t('bridge.share.urlCopied') : '📋 ' + t('bridge.share.copyUrl')}
              </button>

              {/* SNS共有ボタン（アイコンのみ・グリッド表示） */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px',
                justifyItems: 'center',
                maxWidth: '280px',
                margin: '0 auto'
              }}>
                {/* X(Twitter)共有ボタン */}
                <button
                  onClick={handleShareTwitter}
                  style={{
                    width: '56px',
                    height: '56px',
                    background: '#000000',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '24px',
                    borderRadius: '50%',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="X"
                >
                  𝕏
                </button>

                {/* Facebook共有ボタン */}
                <button
                  onClick={handleShareFacebook}
                  style={{
                    width: '56px',
                    height: '56px',
                    background: '#1877F2',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '24px',
                    borderRadius: '50%',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Facebook"
                >
                  f
                </button>

                {/* WhatsApp共有ボタン */}
                <button
                  onClick={handleShareWhatsApp}
                  style={{
                    width: '56px',
                    height: '56px',
                    background: '#25D366',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '24px',
                    borderRadius: '50%',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="WhatsApp"
                >
                  📱
                </button>

                {/* Reddit共有ボタン */}
                <button
                  onClick={handleShareReddit}
                  style={{
                    width: '56px',
                    height: '56px',
                    background: '#FF4500',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '20px',
                    borderRadius: '50%',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Reddit"
                >
                  👽
                </button>

                {/* Discord共有ボタン */}
                <button
                  onClick={handleShareDiscord}
                  style={{
                    width: '56px',
                    height: '56px',
                    background: '#5865F2',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '20px',
                    borderRadius: '50%',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Discord"
                >
                  🎮
                </button>

                {/* Telegram共有ボタン */}
                <button
                  onClick={handleShareTelegram}
                  style={{
                    width: '56px',
                    height: '56px',
                    background: '#0088CC',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '20px',
                    borderRadius: '50%',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Telegram"
                >
                  ✈️
                </button>

                {/* LINE共有ボタン */}
                <button
                  onClick={handleShareLine}
                  style={{
                    width: '56px',
                    height: '56px',
                    background: '#00B900',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '20px',
                    borderRadius: '50%',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="LINE"
                >
                  💬
                </button>

                {/* WeChat共有ボタン */}
                <button
                  onClick={handleShareWeChat}
                  style={{
                    width: '56px',
                    height: '56px',
                    background: '#07C160',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '20px',
                    borderRadius: '50%',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="WeChat"
                >
                  💚
                </button>
              </div>

              {/* ネイティブ共有ボタン（対応ブラウザのみ） */}
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  onClick={handleNativeShare}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    padding: '12px',
                    borderRadius: '16px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  📤 {t('bridge.share.shareNative')}
                </button>
              )}

              {/* 閉じるボタン */}
              <button
                onClick={() => setShowShareModal(false)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  padding: '12px',
                  borderRadius: '16px',
                  border: 'none',
                  cursor: 'pointer',
                  marginTop: '8px',
                }}
              >
                ✕ {t('bridge.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* レスポンシブ用メディアクエリ */}
      <style>{`
        /* PC: 9:16比率を維持 */
        @media (min-width: 769px) and (min-aspect-ratio: 9/16) {
          .bridge-main-box {
            height: 100vh !important;
            width: auto !important;
            aspect-ratio: 9 / 16 !important;
            margin: 0 auto !important;
          }
        }

        /* タブレット・スマホ: 全画面表示 */
        @media (max-width: 768px), (max-aspect-ratio: 9/16) {
          .bridge-main-box {
            width: 100% !important;
            height: 100% !important;
            aspect-ratio: unset !important;
          }
          .bridge-main-box > div:first-child {
            padding-bottom: 140px !important; /* スマホではボタンエリアが小さいため調整 */
          }
          .bridge-bottom-buttons {
            padding: 0 12px 8px 12px !important;
            bottom: 0 !important; /* スマホでは下端にぴったり */
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
          .bridge-main-box > div:first-child {
            padding-bottom: 120px !important; /* 小さな画面ではさらに調整 */
          }
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

        /* iOS Safari対応: 100vhの代わりに100dvhを使用 */
        @supports (height: 100dvh) {
          @media (min-width: 769px) and (min-aspect-ratio: 9/16) {
            .bridge-main-box {
              height: 100dvh !important;
            }
          }
        }
      `}</style>
    </div>
  );
}

export default BridgeScreen;