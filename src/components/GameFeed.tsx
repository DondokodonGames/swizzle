// src/components/GameFeed.tsx
// 新しいフィード画面 - ポップアップではなくページ遷移

import React, { useState, useEffect, useMemo } from 'react';
import { SocialService } from '../social/services/SocialService';
import { PublicGame } from '../social/types/SocialTypes';
import { supabase } from '../lib/supabase';

interface GameFeedProps {
  onGameSelect: (game: PublicGame) => void;
  onBack: () => void;
}

interface FeedSection {
  id: string;
  title: string;
  icon: string;
  games: PublicGame[];
  loading: boolean;
}

export const GameFeed: React.FC<GameFeedProps> = ({ onGameSelect, onBack }) => {
  // ==================== 状態管理 ====================
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sections, setSections] = useState<FeedSection[]>([
    { id: 'premium', title: '課金枠', icon: '💎', games: [], loading: true },
    { id: 'trending', title: 'トレンド', icon: '🔥', games: [], loading: true },
    { id: 'following', title: 'フォロー中', icon: '👥', games: [], loading: true },
    { id: 'tags', title: '好きなタグ', icon: '🏷️', games: [], loading: true },
    { id: 'random', title: 'ランダム', icon: '🎲', games: [], loading: true }
  ]);
  const [selectedSection, setSelectedSection] = useState<string>('trending');

  // ==================== サービス ====================
  const socialService = useMemo(() => SocialService.getInstance(), []);

  // ==================== ユーザー情報取得 ====================
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
      } catch (err) {
        console.warn('ユーザー情報の取得に失敗:', err);
      }
    };

    fetchUser();
  }, []);

  // ==================== フィードデータ取得 ====================
  useEffect(() => {
    const fetchFeedData = async () => {
      try {
        // 課金枠（仮実装 - 後で実装）
        updateSection('premium', [], false);

        // トレンドゲーム
        const trendingGames = await socialService.getTrendingGames('today', 'trending', 10);
        updateSection('trending', trendingGames, false);

        // フォロー中のユーザーのゲーム（ログイン時のみ）
        if (currentUser) {
          // TODO: フォロー中のユーザーのゲームを取得する実装
          const followingGames: PublicGame[] = [];
          updateSection('following', followingGames, false);
        } else {
          updateSection('following', [], false);
        }

        // 好きなタグのゲーム（仮実装）
        // TODO: ユーザーの好きなタグを取得して、そのタグのゲームを表示
        const tagGames = await socialService.getTrendingGames('week', 'popular', 10);
        updateSection('tags', tagGames, false);

        // ランダムゲーム
        const randomGames = await socialService.getRandomGames(10);
        updateSection('random', randomGames, false);

      } catch (err) {
        console.error('フィードデータの取得に失敗:', err);
      }
    };

    fetchFeedData();
  }, [socialService, currentUser]);

  // ==================== セクション更新 ====================
  const updateSection = (id: string, games: PublicGame[], loading: boolean) => {
    setSections(prev => prev.map(section =>
      section.id === id ? { ...section, games, loading } : section
    ));
  };

  // ==================== 現在のセクション ====================
  const currentSection = sections.find(s => s.id === selectedSection);

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-purple-900 via-pink-900 to-black z-50 overflow-hidden">
      {/* ヘッダー */}
      <header className="bg-black/50 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white hover:text-purple-300 transition-colors"
          >
            <span className="text-2xl">←</span>
            <span className="font-bold text-lg">戻る</span>
          </button>

          <h1 className="text-white font-bold text-2xl">📱 ゲームフィード</h1>

          {/* ユーザーアイコン */}
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
            {currentUser ? 'U' : '?'}
          </div>
        </div>
      </header>

      {/* セクション選択タブ */}
      <div className="bg-black/30 backdrop-blur-sm border-b border-white/10 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-6 py-3 flex gap-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setSelectedSection(section.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                selectedSection === section.id
                  ? 'bg-white text-purple-900'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <span className="text-lg">{section.icon}</span>
              <span>{section.title}</span>
              <span className="text-xs opacity-70">({section.games.length})</span>
            </button>
          ))}
        </div>
      </div>

      {/* コンテンツエリア */}
      <div className="max-w-7xl mx-auto px-6 py-6 overflow-y-auto" style={{ height: 'calc(100vh - 160px)' }}>
        {/* 課金枠セクション */}
        {selectedSection === 'premium' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-3xl p-8 border-2 border-yellow-500/50">
              <div className="text-center">
                <span className="text-6xl mb-4 block">💎</span>
                <h2 className="text-white text-3xl font-bold mb-3">プレミアムゲーム</h2>
                <p className="text-white/80 mb-6">
                  クリエイターを応援して、特別なゲームをプレイしよう！
                </p>
                <button className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold text-lg rounded-2xl transition-colors">
                  プレミアムを見る
                </button>
              </div>
            </div>
          </div>
        )}

        {/* その他のセクション */}
        {selectedSection !== 'premium' && currentSection && (
          <div>
            {currentSection.loading ? (
              <div className="text-center py-20">
                <div className="inline-block w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                <p className="text-white/60 mt-4">読み込み中...</p>
              </div>
            ) : currentSection.games.length === 0 ? (
              <div className="text-center py-20">
                <span className="text-6xl mb-4 block">{currentSection.icon}</span>
                <h3 className="text-white text-2xl font-bold mb-2">
                  {currentSection.id === 'following' && !currentUser
                    ? 'ログインが必要です'
                    : 'ゲームがありません'}
                </h3>
                <p className="text-white/60">
                  {currentSection.id === 'following' && !currentUser
                    ? 'フォロー中のゲームを見るにはログインしてください'
                    : '新しいゲームが投稿されるまでお待ちください'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {currentSection.games.map((game) => (
                  <div
                    key={game.id}
                    className="bg-black/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10 hover:border-purple-500/50 transition-all cursor-pointer group"
                    onClick={() => onGameSelect(game)}
                  >
                    {/* サムネイル */}
                    <div className="aspect-video bg-gradient-to-br from-purple-500/20 to-pink-500/20 relative overflow-hidden">
                      {game.thumbnail ? (
                        <img
                          src={game.thumbnail}
                          alt={game.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-6xl">
                          🎮
                        </div>
                      )}
                      {/* プレイボタンオーバーレイ */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                          <span className="text-3xl ml-1">▶️</span>
                        </div>
                      </div>
                    </div>

                    {/* ゲーム情報 */}
                    <div className="p-4">
                      <h3 className="text-white font-bold text-lg mb-2 truncate">{game.title}</h3>
                      <p className="text-white/60 text-sm mb-3 line-clamp-2">{game.description}</p>

                      {/* 作者情報 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {game.author.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-white/80 text-sm">{game.author.name}</span>
                        </div>

                        {/* 統計 */}
                        <div className="flex items-center gap-3 text-white/60 text-sm">
                          <span>👁️ {game.stats.views || 0}</span>
                          <span>❤️ {game.stats.likes}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameFeed;
