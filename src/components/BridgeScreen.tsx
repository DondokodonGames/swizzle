import React, { useState, useEffect, useMemo } from 'react';
import { PublicGame } from '../social/types/SocialTypes';
import { SocialService } from '../social/services/SocialService';
import { supabase } from '../lib/supabase';
import { GameProjectCopier } from '../services/editor/GameProjectCopier';
import { ProjectStorageManager } from '../services/ProjectStorageManager';
import { GameProject } from '../types/editor/GameProject';

/**
 * BridgeScreen.tsx - ゲーム間のブリッジ画面（問題12対応：完全インラインスタイル版）
 *
 * 機能:
 * - ゲームスコア表示（グラフィカルなデザイン）
 * - ソーシャル機能（いいね、フィード、プロフィール）
 * - 次のゲームプレビュー
 * - 残り時間バー（5秒）
 * - 操作ボタン（次へ/前へ/もう一度/Exit）
 * - パクる機能（ゲームのルールをコピーしてエディターで編集）
 */

interface GameScore {
  points: number;
  time: number;
  success: boolean;
}

interface BridgeScreenProps {
  currentGame: PublicGame;
  nextGame: PublicGame;
  score: GameScore | null;
  timeLeft: number;
  totalGames: number;
  currentIndex: number;
  onNextGame: () => void;
  onPreviousGame: () => void;
  onReplayGame: () => void;
  onExit?: () => void;
  inline?: boolean; // ゲームコンテナ内に表示する場合は true
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
  // ==================== 状態管理 ====================
  const [isLiked, setIsLiked] = useState(currentGame.isLiked || false);
  const [likeCount, setLikeCount] = useState(currentGame.stats.likes);
  const [isLiking, setIsLiking] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [copiedProjectId, setCopiedProjectId] = useState<string | null>(null);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [animationStage, setAnimationStage] = useState(0);

  // アニメーション制御
  useEffect(() => {
    const timers = [
      setTimeout(() => setAnimationStage(1), 100),
      setTimeout(() => setAnimationStage(2), 300),
      setTimeout(() => setAnimationStage(3), 500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // ==================== サービス ====================
  const socialService = useMemo(() => SocialService.getInstance(), []);

  // ==================== いいね処理 ====================
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

  // ==================== パクる処理 ====================
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
          throw new Error('ゲームデータの取得に失敗しました');
        }

        sourceProjectData = data.project_data as GameProject;
        console.log('✅ データベースから取得成功');
      }

      if (!sourceProjectData) {
        throw new Error('このゲームはコピーできません');
      }

      const copier = GameProjectCopier.getInstance();

      console.log('🔍 コピー可能かチェック中...');
      if (!copier.canCopy(sourceProjectData)) {
        alert('このゲームにはルールが設定されていないため、コピーできません。');
        return;
      }

      console.log('✅ コピー可能 - コピー処理開始');
      const copiedProject = copier.copyProject(sourceProjectData);

      const storage = ProjectStorageManager.getInstance();
      await storage.saveProject(copiedProject);

      console.log('✅ プロジェクトを保存しました:', copiedProject.id);

      localStorage.setItem('editProjectId', copiedProject.id);
      localStorage.setItem('copiedGameTitle', currentGame.title);
      localStorage.setItem('shouldOpenEditor', 'true');

      setCopiedProjectId(copiedProject.id);
      setShowSuccessModal(true);

      console.log(`✅ 「${currentGame.title}」のルールをコピーしました！`);

    } catch (error) {
      console.error('❌ コピーエラー:', error);
      alert(`ゲームのコピーに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsCopying(false);
    }
  };

  // ==================== エディターを開く処理 ====================
  const handleOpenEditor = () => {
    if (!copiedProjectId) return;
    window.location.href = `/editor/${copiedProjectId}`;
  };

  // ==================== リンク処理 ====================
  const handleGoToFeed = () => {
    console.log('📱 フィードへ遷移');
    window.location.href = '/feed';
  };

  const handleGoToProfile = () => {
    console.log('👤 プロフィールへ遷移');
    window.location.href = `/profile/${currentGame.author.id}`;
  };

  // ==================== 進捗バー ====================
  const progressPercentage = ((5 - timeLeft) / 5) * 100;

  // ==================== スタイル定義 ====================
  const containerStyle: React.CSSProperties = inline ? {
    // インラインモード（ゲームコンテナ内表示）
    position: 'absolute',
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
  } : {
    // フルスクリーンモード
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(180deg, #581c87 0%, #000000 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  };

  const mainBoxStyle: React.CSSProperties = inline ? {
    // インラインモード
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: '32px',
    overflowY: 'auto',
  } : {
    // フルスクリーンモード
    width: '1080px',
    height: '1920px',
    maxWidth: '100vw',
    maxHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    padding: '32px',
    overflowY: 'auto',
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

  // ==================== レンダリング ====================
  return (
    <div style={containerStyle}>
      <div style={mainBoxStyle}>
        {/* トップ - ゲーム完了 */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={titleIconStyle}>
            {score?.success ? '🎉' : '💫'}
          </div>
          <h2 style={titleTextStyle}>
            {score?.success ? 'クリア！' : 'プレイ完了'}
          </h2>
          <p style={{
            color: '#d1d5db',
            fontSize: '28px',
            textAlign: 'center',
            transform: animationStage >= 2 ? 'translateY(0)' : 'translateY(30px)',
            opacity: animationStage >= 2 ? 1 : 0,
            transition: 'all 0.5s ease-out 0.1s',
          }}>
            {currentGame.title}
          </p>
        </div>

        {/* スコア表示（問題12対応：完全グラフィカル） */}
        {score && (
          <div style={scoreCardStyle}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '24px',
            }}>
              {/* スコア */}
              <div
                style={scoreItemStyle}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <p style={scoreLabelStyle}>スコア</p>
                <div style={scoreValueBoxStyle('linear-gradient(135deg, #fbbf24 0%, #f97316 100%)')}>
                  <p style={scoreValueTextStyle}>{score.points}</p>
                </div>
              </div>

              {/* 時間 */}
              <div
                style={scoreItemStyle}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <p style={scoreLabelStyle}>時間</p>
                <div style={scoreValueBoxStyle('linear-gradient(135deg, #60a5fa 0%, #06b6d4 100%)')}>
                  <p style={scoreValueTextStyle}>{score.time.toFixed(1)}s</p>
                </div>
              </div>

              {/* 結果 */}
              <div
                style={scoreItemStyle}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <p style={scoreLabelStyle}>結果</p>
                <div style={scoreValueBoxStyle(
                  score.success
                    ? 'linear-gradient(135deg, #4ade80 0%, #10b981 100%)'
                    : 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                )}>
                  <p style={{ fontSize: '48px' }}>{score.success ? '✅' : '❌'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* パクるボタン */}
        <div style={{
          background: 'linear-gradient(90deg, #059669 0%, #10b981 100%)',
          borderRadius: '32px',
          padding: '24px',
          marginBottom: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
        }}>
          <button
            onClick={handleCopyGame}
            disabled={isCopying}
            style={{
              ...buttonStyle('rgba(255, 255, 255, 0.2)'),
              opacity: isCopying ? 0.5 : 1,
              cursor: isCopying ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => !isCopying && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)')}
            onMouseLeave={(e) => !isCopying && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
          >
            {isCopying ? '⏳ コピー中...' : '📋 このゲームをパクる'}
          </button>
          <p style={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '16px',
            textAlign: 'center',
            marginTop: '12px',
          }}>
            ルールをコピーして、画像を差し替えるだけで新しいゲームが作れます！
          </p>
        </div>

        {/* ソーシャル機能 */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(10px)',
          borderRadius: '32px',
          padding: '24px',
          marginBottom: '24px',
        }}>
          {/* 作者情報といいね */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}>
            {/* 作者情報 */}
            <button
              onClick={handleGoToProfile}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '12px',
                borderRadius: '20px',
                transition: 'background 0.3s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '24px',
                fontWeight: 'bold',
              }}>
                {currentGame.author.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ color: 'white', fontWeight: 'bold', fontSize: '20px', margin: 0 }}>
                  {currentGame.author.name}
                </p>
                <p style={{ color: '#9ca3af', fontSize: '16px', margin: 0 }}>
                  作成者プロフィールへ →
                </p>
              </div>
            </button>

            {/* いいねボタン */}
            <button
              onClick={handleLike}
              disabled={isLiking}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '20px',
                fontWeight: 'bold',
                fontSize: '20px',
                border: 'none',
                cursor: isLiking ? 'not-allowed' : 'pointer',
                background: isLiked ? '#ef4444' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                opacity: isLiking ? 0.5 : 1,
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => !isLiking && (e.currentTarget.style.background = isLiked ? '#dc2626' : 'rgba(255, 255, 255, 0.2)')}
              onMouseLeave={(e) => !isLiking && (e.currentTarget.style.background = isLiked ? '#ef4444' : 'rgba(255, 255, 255, 0.1)')}
            >
              <span style={{ fontSize: '28px' }}>{isLiked ? '❤️' : '🤍'}</span>
              <span>{likeCount}</span>
            </button>
          </div>

          {/* 感情リアクションボタン */}
          <div style={{ marginBottom: '16px' }}>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '16px', marginBottom: '8px' }}>
              このゲームはどうでしたか？
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '8px',
            }}>
              {[
                { emoji: '😆', label: '楽しい' },
                { emoji: '😮', label: '驚き' },
                { emoji: '🤔', label: '考えさせられる' },
                { emoji: '😭', label: '感動' },
                { emoji: '😎', label: 'カッコイイ' }
              ].map((reaction) => (
                <button
                  key={reaction.emoji}
                  onClick={() => setSelectedReaction(reaction.emoji)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    background: selectedReaction === reaction.emoji ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                    transform: selectedReaction === reaction.emoji ? 'scale(1.1)' : 'scale(1)',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => selectedReaction !== reaction.emoji && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
                  onMouseLeave={(e) => selectedReaction !== reaction.emoji && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
                  title={reaction.label}
                >
                  <span style={{ fontSize: '36px', marginBottom: '4px' }}>{reaction.emoji}</span>
                  <span style={{ color: 'white', fontSize: '14px' }}>{reaction.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* フィードへのリンク */}
          <button
            onClick={handleGoToFeed}
            style={{
              ...buttonStyle('linear-gradient(90deg, #9333ea 0%, #ec4899 100%)'),
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            📱 フィードで他のゲームを見る
          </button>
        </div>

        {/* 広告表示スペース */}
        <div style={{
          background: 'linear-gradient(90deg, rgba(234, 179, 8, 0.2) 0%, rgba(249, 115, 22, 0.2) 100%)',
          backdropFilter: 'blur(10px)',
          borderRadius: '32px',
          padding: '24px',
          marginBottom: '24px',
          border: '2px solid rgba(234, 179, 8, 0.5)',
        }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#fef08a', fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
              スポンサー広告
            </p>
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              padding: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '120px',
            }}>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '20px' }}>広告スペース</p>
            </div>
            <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '14px', marginTop: '8px' }}>
              広告を見て開発者を応援しよう！
            </p>
          </div>
        </div>

        {/* 次のゲームプレビュー */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(10px)',
          borderRadius: '32px',
          padding: '24px',
          marginBottom: '24px',
          flex: 1,
        }}>
          <h3 style={{ color: 'white', fontSize: '28px', fontWeight: 'bold', marginBottom: '16px' }}>
            次のゲーム
          </h3>
          <div style={{
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%)',
            borderRadius: '20px',
            padding: '16px',
          }}>
            <div style={{
              aspectRatio: '16/9',
              background: '#1f2937',
              borderRadius: '12px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {nextGame.thumbnail ? (
                <img
                  src={nextGame.thumbnail}
                  alt={nextGame.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '12px',
                  }}
                />
              ) : (
                <span style={{ fontSize: '72px' }}>🎮</span>
              )}
            </div>
            <h4 style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
              {nextGame.title}
            </h4>
            <p style={{ color: '#d1d5db', fontSize: '16px', marginBottom: '12px' }}>
              {nextGame.description}
            </p>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              color: '#9ca3af',
              fontSize: '16px',
            }}>
              <span>by {nextGame.author.name}</span>
              <span>❤️ {nextGame.stats.likes}</span>
              <span>👁️ {nextGame.stats.views}</span>
            </div>
          </div>
        </div>

        {/* 残り時間バー */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(10px)',
          borderRadius: '32px',
          padding: '16px 24px',
          marginBottom: '24px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px',
          }}>
            <span style={{ color: 'white', fontSize: '20px', fontWeight: '500' }}>
              {timeLeft}秒後に次のゲームへ
            </span>
            <span style={{ color: '#d1d5db', fontSize: '16px' }}>
              {currentIndex + 1} / {totalGames}
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '12px',
            background: '#374151',
            borderRadius: '999px',
            overflow: 'hidden',
          }}>
            <div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #10b981 0%, #3b82f6 100%)',
                transition: 'width 1s linear',
                width: `${progressPercentage}%`,
              }}
            />
          </div>
        </div>

        {/* 操作ボタン */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
          marginBottom: '16px',
        }}>
          <button
            onClick={onReplayGame}
            style={buttonStyle('rgba(37, 99, 235, 0.8)')}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1d4ed8';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(37, 99, 235, 0.8)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            🔄 もう一度
          </button>
          <button
            onClick={onNextGame}
            style={buttonStyle('rgba(22, 163, 74, 0.8)')}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#15803d';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(22, 163, 74, 0.8)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            次へ ⏭️
          </button>
        </div>

        {/* 下部ボタン */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
        }}>
          <button
            onClick={onPreviousGame}
            disabled={totalGames <= 1}
            style={{
              ...buttonStyle(totalGames <= 1 ? 'rgba(31, 41, 55, 0.5)' : 'rgba(55, 65, 81, 0.8)'),
              cursor: totalGames <= 1 ? 'not-allowed' : 'pointer',
              fontSize: '20px',
              padding: '16px',
            }}
            onMouseEnter={(e) => totalGames > 1 && (e.currentTarget.style.background = '#374151')}
            onMouseLeave={(e) => totalGames > 1 && (e.currentTarget.style.background = 'rgba(55, 65, 81, 0.8)')}
          >
            ⏮️ 前へ
          </button>
          <button
            onClick={onNextGame}
            style={{
              ...buttonStyle('rgba(147, 51, 234, 0.8)'),
              fontSize: '20px',
              padding: '16px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#7c3aed';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(147, 51, 234, 0.8)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            ⏭️ スキップ
          </button>
          {onExit && (
            <button
              onClick={onExit}
              style={{
                ...buttonStyle('rgba(239, 68, 68, 0.8)'),
                fontSize: '20px',
                padding: '16px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#dc2626';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.8)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Exit
            </button>
          )}
        </div>
      </div>

      {/* 成功モーダル */}
      {showSuccessModal && (
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
          zIndex: 60,
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            borderRadius: '32px',
            padding: '32px',
            maxWidth: '500px',
            margin: '16px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '72px', marginBottom: '16px' }}>✅</div>
            <h2 style={{
              color: 'white',
              fontSize: '36px',
              fontWeight: 'bold',
              marginBottom: '16px',
            }}>
              コピー完了！
            </h2>
            <p style={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '20px',
              marginBottom: '24px',
            }}>
              「{currentGame.title}」のルールをコピーしました！<br/>
              エディターで画像を差し替えて、新しいゲームを作りましょう。
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={handleOpenEditor}
                style={{
                  width: '100%',
                  background: 'white',
                  color: '#059669',
                  fontWeight: 'bold',
                  fontSize: '24px',
                  padding: '16px',
                  borderRadius: '20px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.3s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                🎨 エディターを開く
              </button>

              <button
                onClick={() => setShowSuccessModal(false)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '20px',
                  padding: '12px',
                  borderRadius: '20px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.3s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
              >
                後で編集する
              </button>
            </div>

            <p style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '14px',
              marginTop: '16px',
            }}>
              プロジェクトID: {copiedProjectId}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
