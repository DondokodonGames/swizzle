import React, { useState, useEffect, useMemo } from 'react';
import { PublicGame } from '../social/types/SocialTypes';
import { SocialService } from '../social/services/SocialService';
import { supabase, auth } from '../lib/supabase';
import { GameProjectCopier } from '../services/editor/GameProjectCopier';
import { ProjectStorageManager } from '../services/ProjectStorageManager';
import { GameProject } from '../types/editor/GameProject';
import { AdUnit } from './monetization/AdUnit';
import { AdPlacement } from '../types/MonetizationTypes';

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
  nextGame: PublicGame | null;
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
        // サインイン画面を開く
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

      // ユーザーがログインしている場合はSupabaseにも保存
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
    if (currentGame.author.username) {
      window.location.href = `/profile/${currentGame.author.username}`;
    }
  };

  // ==================== 進捗バー ====================
  const remainingPercentage = (timeLeft / 10) * 100; // 残り時間の割合（10秒基準）

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
    padding: '20px',
  } : {
    // フルスクリーンモード
    width: '1080px',
    height: '1920px',
    maxWidth: '100vw',
    maxHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
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
        {/* a. 成功/失敗の顔アイコン */}
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: '120px', marginBottom: '20px' }}>
            {score?.success ? '😊' : '😢'}
          </div>
        </div>

        {/* b. 作成者情報 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: '20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          {/* クリエイター情報（クリックでプロフィールへ） */}
          <div
            onClick={handleGoToProfile}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              flex: 1,
              cursor: 'pointer'
            }}
          >
            <div style={{
              width: '60px',
              height: '60px',
              background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '32px',
              fontWeight: 'bold',
            }}>
              {currentGame.author.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: 'white', fontWeight: 'bold', fontSize: '24px', margin: 0 }}>
                {currentGame.author.name}
              </p>
              <p style={{ color: '#9ca3af', fontSize: '18px', margin: 0 }}>
                {currentGame.title}
              </p>
            </div>
          </div>
          <button
            onClick={handleLike}
            disabled={isLiking}
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              fontWeight: 'bold',
              fontSize: '24px',
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

        {/* c. 広告表示 */}
        <div style={{ marginBottom: '20px' }}>
          <AdUnit
            placement={AdPlacement.GAME_BRIDGE}
            className="bridge-ad"
          />
        </div>

        {/* スペーサー（下部のボタンを下に押し下げる） */}
        <div style={{ flex: 1 }} />

        {/* d. 4つのボタン（横幅いっぱい） */}
        <div style={{
          display: 'flex',
          gap: 0,
          marginBottom: '20px'
        }}>
          {/* パクる */}
          <button
            onClick={handleCopyGame}
            disabled={isCopying}
            style={{
              flex: 1,
              padding: '20px 0',
              border: 'none',
              background: 'rgba(16, 185, 129, 0.9)',
              color: 'white',
              fontSize: '24px',
              cursor: isCopying ? 'not-allowed' : 'pointer',
              opacity: isCopying ? 0.5 : 1,
              transition: 'opacity 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
            onMouseEnter={(e) => !isCopying && (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={(e) => !isCopying && (e.currentTarget.style.opacity = '1')}
          >
            <div style={{ fontSize: '32px' }}>📋</div>
            <div style={{ fontSize: '16px' }}>パクる</div>
          </button>

          {/* 次へ（サムネ表示） */}
          <button
            onClick={onNextGame}
            style={{
              flex: 1,
              padding: '20px 0',
              border: 'none',
              background: 'rgba(59, 130, 246, 0.9)',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            {nextGame?.thumbnail ? (
              <img
                src={nextGame.thumbnail}
                alt={nextGame.title}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  objectFit: 'cover'
                }}
              />
            ) : (
              <div style={{ fontSize: '32px' }}>🎮</div>
            )}
            <div style={{ fontSize: '16px' }}>次へ</div>
          </button>

          {/* もう一度 */}
          <button
            onClick={onReplayGame}
            style={{
              flex: 1,
              padding: '20px 0',
              border: 'none',
              background: 'rgba(236, 72, 153, 0.9)',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <div style={{ fontSize: '32px' }}>🔄</div>
            <div style={{ fontSize: '16px' }}>もう一度</div>
          </button>

          {/* スキップ */}
          <button
            onClick={onNextGame}
            style={{
              flex: 1,
              padding: '20px 0',
              border: 'none',
              background: 'rgba(239, 68, 68, 0.9)',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <div style={{ fontSize: '32px' }}>⏭️</div>
            <div style={{ fontSize: '16px' }}>スキップ</div>
          </button>
        </div>

        {/* e. 下端に残り時間バー */}
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
              if (remainingPercentage > 50) return '#10b981'; // 緑
              if (remainingPercentage > 20) return '#f59e0b'; // 黄色
              return '#ef4444'; // 赤
            })(),
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }} />
        </div>
      </div>

      {/* パクる成功モーダル */}
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
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            borderRadius: '32px',
            padding: '48px',
            maxWidth: '600px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '96px', marginBottom: '24px' }}>🎉</div>
            <h2 style={{ color: 'white', fontSize: '48px', fontWeight: 'bold', marginBottom: '16px' }}>
              パクリ完了！
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '24px', marginBottom: '32px' }}>
              ゲームのルールをコピーしました。<br />
              エディターで画像を差し替えて、自分だけのゲームを作りましょう！
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                  fontSize: '24px',
                  padding: '16px',
                  borderRadius: '20px',
                  border: 'none',
                  cursor: 'pointer',
                }}
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
                }}
              >
                後で編集する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BridgeScreen;
