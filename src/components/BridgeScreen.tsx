import React, { useState, useEffect, useMemo } from 'react';
import { PublicGame } from '../social/types/SocialTypes';
import { SocialService } from '../social/services/SocialService';
import { supabase } from '../lib/supabase';
import { GameProjectCopier } from '../services/editor/GameProjectCopier';
import { ProjectStorageManager } from '../services/ProjectStorageManager';
import { GameProject } from '../types/editor/GameProject';

/**
 * BridgeScreen.tsx - ゲーム間のブリッジ画面
 * 
 * 機能:
 * - ゲームスコア表示
 * - ソーシャル機能（いいね、フィード、プロフィール）
 * - 次のゲームプレビュー
 * - 残り時間バー（5秒）
 * - 操作ボタン（次へ/前へ/もう一度/Exit）
 * - 🆕 パクる機能（ゲームのルールをコピーしてエディターで編集）
 * 
 * 注: react-router-dom を使用せず、window.location.href で遷移
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
}) => {
  // ==================== 状態管理 ====================
  const [isLiked, setIsLiked] = useState(currentGame.isLiked || false);
  const [likeCount, setLikeCount] = useState(currentGame.stats.likes);
  const [isLiking, setIsLiking] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [copiedProjectId, setCopiedProjectId] = useState<string | null>(null);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);

  // ==================== サービス ====================
  const socialService = useMemo(() => SocialService.getInstance(), []);

  // ==================== いいね処理 ====================
  const handleLike = async () => {
    if (isLiking) return;

    setIsLiking(true);
    const newLikeState = !isLiked;

    // 楽観的UI更新
    setIsLiked(newLikeState);
    setLikeCount(prev => newLikeState ? prev + 1 : prev - 1);

    try {
      // 現在のユーザーIDを取得
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('⚠️ ユーザーがログインしていません');
        // ログインしていない場合はロールバック
        setIsLiked(!newLikeState);
        setLikeCount(prev => newLikeState ? prev - 1 : prev + 1);
        setIsLiking(false);
        return;
      }

      await socialService.toggleLike(currentGame.id, user.id);
      console.log('✅ いいね更新成功');
    } catch (error) {
      console.error('❌ いいね更新エラー:', error);
      // エラー時はロールバック
      setIsLiked(!newLikeState);
      setLikeCount(prev => newLikeState ? prev - 1 : prev + 1);
    } finally {
      setIsLiking(false);
    }
  };

  // ==================== 🆕 パクる処理 ====================
  const handleCopyGame = async () => {
    if (isCopying) return;

    setIsCopying(true);

    try {
      console.log('📋 ゲームコピー開始:', currentGame.title);
      console.log('📋 currentGame構造:', {
        id: currentGame.id,
        title: currentGame.title,
        hasProjectData: !!currentGame.projectData,
        projectDataKeys: currentGame.projectData ? Object.keys(currentGame.projectData) : []
      });

      // 1. currentGameからGameProjectデータを取得
      let sourceProjectData: GameProject | null = null;

      if (currentGame.projectData) {
        // projectDataが直接含まれている場合
        sourceProjectData = currentGame.projectData as GameProject;
        console.log('✅ projectDataから取得成功');
        console.log('📋 プロジェクトデータ構造:', {
          id: sourceProjectData.id,
          name: sourceProjectData.name,
          hasScript: !!sourceProjectData.script,
          hasRules: !!(sourceProjectData.script && sourceProjectData.script.rules),
          rulesCount: (sourceProjectData.script && sourceProjectData.script.rules) ? sourceProjectData.script.rules.length : 0,
          hasAssets: !!sourceProjectData.assets
        });
      } else {
        // projectDataがない場合、Supabaseから取得を試みる
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

      // 2. GameProjectCopierでコピー
      const copier = GameProjectCopier.getInstance();
      
      // コピー可能かチェック
      console.log('🔍 コピー可能かチェック中...');
      if (!copier.canCopy(sourceProjectData)) {
        alert('このゲームにはルールが設定されていないため、コピーできません。');
        return;
      }

      console.log('✅ コピー可能 - コピー処理開始');
      const copiedProject = copier.copyProject(sourceProjectData);

      // 3. ローカルストレージに保存
      const storage = ProjectStorageManager.getInstance();
      await storage.saveProject(copiedProject);

      console.log('✅ プロジェクトを保存しました:', copiedProject.id);

      // 4. localStorageに保存（エディターが開く際に使用）
      localStorage.setItem('editProjectId', copiedProject.id);
      localStorage.setItem('copiedGameTitle', currentGame.title);
      localStorage.setItem('shouldOpenEditor', 'true');

      // 5. 成功モーダルを表示
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

    // 複数の可能性のあるパスを試す
    const possiblePaths = [
      `/editor/${copiedProjectId}`,
      `/edit/${copiedProjectId}`,
      `/game-editor/${copiedProjectId}`,
      `/editor?id=${copiedProjectId}`,
      `/#/editor/${copiedProjectId}`,
      `/projects/edit/${copiedProjectId}`
    ];

    console.log('🚀 エディターを開きます:', possiblePaths[0]);
    console.log('📋 試行可能なパス一覧:', possiblePaths);

    // 最初のパスで遷移を試みる
    window.location.href = possiblePaths[0];
  };

  // ==================== リンク処理 ====================
  const handleGoToFeed = () => {
    console.log('📱 フィードへ遷移');
    // TODO: ルーティング実装
    window.location.href = '/feed';
  };

  const handleGoToProfile = () => {
    console.log('👤 プロフィールへ遷移');
    // TODO: ルーティング実装
    window.location.href = `/profile/${currentGame.author.id}`;
  };

  // ==================== 進捗バー ====================
  const progressPercentage = ((5 - timeLeft) / 5) * 100;

  // ==================== レンダリング ====================
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-purple-900 to-black z-50 flex items-center justify-center">
      {/* メインコンテナ（1080x1920） */}
      <div 
        className="relative"
        style={{ 
          width: '1080px',
          height: '1920px',
          maxWidth: '100vw',
          maxHeight: '100vh'
        }}
      >
        <div className="w-full h-full flex flex-col p-8">
          {/* トップ - ゲーム完了 */}
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">
              {score?.success ? '🎉' : '💫'}
            </div>
            <h2 className="text-white text-4xl font-bold mb-2">
              {score?.success ? 'クリア！' : 'プレイ完了'}
            </h2>
            <p className="text-gray-300 text-xl">
              {currentGame.title}
            </p>
          </div>

          {/* スコア表示 */}
          {score && (
            <div className="bg-black/50 backdrop-blur-sm rounded-3xl p-6 mb-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-gray-400 text-sm mb-1">スコア</p>
                  <p className="text-white text-3xl font-bold">{score.points}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 text-sm mb-1">時間</p>
                  <p className="text-white text-3xl font-bold">{score.time.toFixed(1)}s</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 text-sm mb-1">結果</p>
                  <p className="text-2xl">{score.success ? '✅' : '❌'}</p>
                </div>
              </div>
            </div>
          )}

          {/* 🆕 パクるボタン */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-3xl p-6 mb-4">
            <button
              onClick={handleCopyGame}
              disabled={isCopying}
              className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xl font-bold py-6 rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCopying ? '⏳ コピー中...' : '📋 このゲームをパクる'}
            </button>
            <p className="text-white/80 text-sm text-center mt-3">
              ルールをコピーして、画像を差し替えるだけで新しいゲームが作れます！
            </p>
          </div>

          {/* ソーシャル機能 */}
          <div className="bg-black/50 backdrop-blur-sm rounded-3xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              {/* 作者情報 */}
              <button
                onClick={handleGoToProfile}
                className="flex items-center gap-3 hover:bg-white/10 rounded-2xl p-3 transition-colors"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  {currentGame.author.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="text-white font-bold text-lg">{currentGame.author.name}</p>
                  <p className="text-gray-400 text-sm">作成者プロフィールへ →</p>
                </div>
              </button>

              {/* いいねボタン */}
              <button
                onClick={handleLike}
                disabled={isLiking}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-lg transition-all ${
                  isLiked
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                } disabled:opacity-50`}
              >
                <span className="text-2xl">{isLiked ? '❤️' : '🤍'}</span>
                <span>{likeCount}</span>
              </button>
            </div>

            {/* 感情リアクションボタン */}
            <div className="mb-4">
              <p className="text-white/80 text-sm mb-2">このゲームはどうでしたか？</p>
              <div className="grid grid-cols-5 gap-2">
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
                    className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${
                      selectedReaction === reaction.emoji
                        ? 'bg-white/30 scale-110'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                    title={reaction.label}
                  >
                    <span className="text-3xl mb-1">{reaction.emoji}</span>
                    <span className="text-white text-xs">{reaction.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* フィードへのリンク */}
            <button
              onClick={handleGoToFeed}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-lg py-4 rounded-2xl transition-colors"
            >
              📱 フィードで他のゲームを見る
            </button>
          </div>

          {/* 広告表示スペース */}
          <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-3xl p-6 mb-6 border-2 border-yellow-500/50">
            <div className="text-center">
              <p className="text-yellow-200 text-sm font-medium mb-2">スポンサー広告</p>
              <div className="bg-white/10 rounded-2xl p-8 flex items-center justify-center min-h-[120px]">
                <p className="text-white/60 text-lg">広告スペース</p>
              </div>
              <p className="text-white/40 text-xs mt-2">広告を見て開発者を応援しよう！</p>
            </div>
          </div>

          {/* 次のゲームプレビュー */}
          <div className="bg-black/50 backdrop-blur-sm rounded-3xl p-6 mb-6 flex-1">
            <h3 className="text-white text-2xl font-bold mb-4">次のゲーム</h3>
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl p-4">
              <div className="aspect-video bg-gray-800 rounded-xl mb-4 flex items-center justify-center">
                {nextGame.thumbnail ? (
                  <img 
                    src={nextGame.thumbnail} 
                    alt={nextGame.title}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <span className="text-6xl">🎮</span>
                )}
              </div>
              <h4 className="text-white text-xl font-bold mb-2">{nextGame.title}</h4>
              <p className="text-gray-300 text-sm mb-3">{nextGame.description}</p>
              <div className="flex items-center gap-4 text-gray-400 text-sm">
                <span>by {nextGame.author.name}</span>
                <span>❤️ {nextGame.stats.likes}</span>
                <span>👁️ {nextGame.stats.views}</span>
              </div>
            </div>
          </div>

          {/* 残り時間バー */}
          <div className="bg-black/50 backdrop-blur-sm rounded-3xl px-6 py-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white text-lg font-medium">
                {timeLeft}秒後に次のゲームへ
              </span>
              <span className="text-gray-300 text-sm">
                {currentIndex + 1} / {totalGames}
              </span>
            </div>
            <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-1000"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* 操作ボタン */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <button
              onClick={onReplayGame}
              className="bg-blue-600/80 hover:bg-blue-700 text-white text-xl font-bold py-6 rounded-2xl backdrop-blur-sm transition-colors"
            >
              🔄 もう一度
            </button>
            <button
              onClick={onNextGame}
              className="bg-green-600/80 hover:bg-green-700 text-white text-xl font-bold py-6 rounded-2xl backdrop-blur-sm transition-colors"
            >
              次へ ⏭️
            </button>
          </div>

          {/* 下部ボタン */}
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={onPreviousGame}
              disabled={totalGames <= 1}
              className="bg-gray-700/80 hover:bg-gray-600 disabled:bg-gray-800/50 disabled:cursor-not-allowed text-white text-lg font-bold py-4 rounded-2xl backdrop-blur-sm transition-colors"
            >
              ⏮️ 前へ
            </button>
            <button
              onClick={onNextGame}
              className="bg-purple-600/80 hover:bg-purple-700 text-white text-lg font-bold py-4 rounded-2xl backdrop-blur-sm transition-colors"
            >
              ⏭️ スキップ
            </button>
            {onExit && (
              <button
                onClick={onExit}
                className="bg-red-500/80 hover:bg-red-600 text-white text-lg font-bold py-4 rounded-2xl backdrop-blur-sm transition-colors"
              >
                Exit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 🆕 成功モーダル */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]">
          <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-3xl p-8 max-w-md mx-4 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-white text-3xl font-bold mb-4">
              コピー完了！
            </h2>
            <p className="text-white/90 text-lg mb-6">
              「{currentGame.title}」のルールをコピーしました！<br/>
              エディターで画像を差し替えて、新しいゲームを作りましょう。
            </p>
            
            <div className="space-y-3">
              <button
                onClick={handleOpenEditor}
                className="w-full bg-white text-green-700 font-bold text-xl py-4 rounded-2xl hover:bg-gray-100 transition-colors"
              >
                🎨 エディターを開く
              </button>
              
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full bg-white/20 text-white font-bold text-lg py-3 rounded-2xl hover:bg-white/30 transition-colors"
              >
                後で編集する
              </button>
            </div>

            <p className="text-white/60 text-sm mt-4">
              プロジェクトID: {copiedProjectId}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};