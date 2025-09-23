// src/social/services/SocialService.ts

import { PublicGame, UserProfile, UserGame, GameFilters, SocialStats } from '../types/SocialTypes';

export class SocialService {
  private static instance: SocialService;

  static getInstance(): SocialService {
    if (!SocialService.instance) {
      SocialService.instance = new SocialService();
    }
    return SocialService.instance;
  }

  // ゲーム取得（ページネーション対応）
  async getPublicGames(
    filters: GameFilters = {},
    page: number = 1,
    limit: number = 12
  ): Promise<{ games: PublicGame[]; hasMore: boolean }> {
    try {
      // 実装時はSupabase APIに置き換え
      // const { data, error } = await supabase.from('public_games')...
      
      // モックデータ
      const mockGames: PublicGame[] = Array.from({ length: limit }, (_, i) => ({
        id: `game-${page}-${i}`,
        title: `${filters.category || 'ゲーム'} ${page * limit + i + 1}`,
        description: `楽しい${filters.category || 'ゲーム'}体験！簡単操作で誰でも楽しめます。`,
        thumbnail: `https://picsum.photos/300/200?random=${page * limit + i}`,
        author: {
          id: `user-${i % 5}`,
          name: `プレイヤー${i % 5 + 1}`,
          avatar: `https://picsum.photos/40/40?random=${i % 5 + 100}`
        },
        stats: {
          likes: Math.floor(Math.random() * 1000),
          plays: Math.floor(Math.random() * 10000),
          shares: Math.floor(Math.random() * 100),
          views: Math.floor(Math.random() * 15000),
          bookmarks: Math.floor(Math.random() * 200)
        },
        tags: ['楽しい', '簡単', filters.category || 'ゲーム'],
        category: filters.category || 'casual',
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        isLiked: Math.random() > 0.7,
        isBookmarked: Math.random() > 0.8
      }));

      // ソート処理
      if (filters.sortBy) {
        mockGames.sort((a, b) => {
          switch (filters.sortBy) {
            case 'popular':
              return b.stats.likes - a.stats.likes;
            case 'trending':
              return b.stats.views - a.stats.views;
            case 'mostPlayed':
              return (b.stats.views || 0) - (a.stats.views || 0);
            case 'latest':
            default:
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
        });
      }

      // 検索フィルター
      let filteredGames = mockGames;
      if (filters.search) {
        filteredGames = mockGames.filter(game =>
          game.title.toLowerCase().includes(filters.search!.toLowerCase()) ||
          game.description.toLowerCase().includes(filters.search!.toLowerCase()) ||
          game.tags.some(tag => tag.toLowerCase().includes(filters.search!.toLowerCase()))
        );
      }

      return {
        games: filteredGames,
        hasMore: page < 5 // モック用制限
      };
    } catch (error) {
      console.error('Error fetching public games:', error);
      throw new Error('ゲームの取得に失敗しました');
    }
  }

  // ユーザープロフィール取得
  async getUserProfile(userId: string): Promise<UserProfile> {
    try {
      // 実装時はSupabase APIに置き換え
      // const { data, error } = await supabase.from('user_profiles')...

      const mockProfile: UserProfile = {
        id: userId,
        username: 'gamemaker123',
        displayName: 'ゲームクリエイター',
        avatar: 'https://picsum.photos/120/120?random=profile',
        banner: 'https://picsum.photos/800/200?random=banner',
        bio: '楽しいゲームを作ることが大好きです！毎日新しいアイデアに挑戦しています。',
        location: '東京, 日本',
        website: 'https://example.com',
        stats: {
          totalGames: 23,
          totalPlays: 15420,
          totalLikes: 1204,
          totalFollowers: 856,
          totalFollowing: 342,
          joinDate: '2024-01-15',
          lastActive: new Date().toISOString()
        },
        isFollowing: false,
        isOwner: userId === 'current-user'
      };

      return mockProfile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw new Error('プロフィールの取得に失敗しました');
    }
  }

  // ユーザーのゲーム取得
  async getUserGames(userId: string, status?: string): Promise<UserGame[]> {
    try {
      // 実装時はSupabase APIに置き換え
      const mockGames: UserGame[] = Array.from({ length: 15 }, (_, i) => ({
        id: `user-game-${i}`,
        title: `マイゲーム ${i + 1}`,
        thumbnail: `https://picsum.photos/300/200?random=${i + 200}`,
        stats: {
          likes: Math.floor(Math.random() * 500),
          shares: Math.floor(Math.random() * 50),
          bookmarks: Math.floor(Math.random() * 100),
          views: Math.floor(Math.random() * 5000)
        },
        status: ['published', 'draft', 'private'][Math.floor(Math.random() * 3)] as any,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
      }));

      // ステータスフィルター
      if (status && status !== 'all') {
        return mockGames.filter(game => game.status === status);
      }

      return mockGames;
    } catch (error) {
      console.error('Error fetching user games:', error);
      throw new Error('ユーザーゲームの取得に失敗しました');
    }
  }

  // いいね機能
  async toggleLike(gameId: string, userId: string): Promise<{ isLiked: boolean; newCount: number }> {
    try {
      // 実装時はSupabase APIに置き換え
      // const { data, error } = await supabase.from('user_interactions')...
      
      const isLiked = Math.random() > 0.5; // モック判定
      const newCount = Math.floor(Math.random() * 1000);

      console.log(`Game ${gameId}: Like ${isLiked ? 'added' : 'removed'} by user ${userId}`);
      
      return { isLiked, newCount };
    } catch (error) {
      console.error('Error toggling like:', error);
      throw new Error('いいねの処理に失敗しました');
    }
  }

  // ブックマーク機能
  async toggleBookmark(gameId: string, userId: string): Promise<{ isBookmarked: boolean; newCount: number }> {
    try {
      const isBookmarked = Math.random() > 0.5;
      const newCount = Math.floor(Math.random() * 200);

      console.log(`Game ${gameId}: Bookmark ${isBookmarked ? 'added' : 'removed'} by user ${userId}`);
      
      return { isBookmarked, newCount };
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      throw new Error('ブックマークの処理に失敗しました');
    }
  }

  // フォロー機能
  async toggleFollow(targetUserId: string, currentUserId: string): Promise<{ isFollowing: boolean; newCount: number }> {
    try {
      const isFollowing = Math.random() > 0.5;
      const newCount = Math.floor(Math.random() * 1000);

      console.log(`User ${currentUserId}: ${isFollowing ? 'Following' : 'Unfollowing'} user ${targetUserId}`);
      
      return { isFollowing, newCount };
    } catch (error) {
      console.error('Error toggling follow:', error);
      throw new Error('フォローの処理に失敗しました');
    }
  }

  // プロフィール更新
  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      // 実装時はSupabase APIに置き換え
      console.log(`Updating profile for user ${userId}:`, updates);
      
      // モック：更新されたプロフィールを返す
      const currentProfile = await this.getUserProfile(userId);
      return { ...currentProfile, ...updates };
    } catch (error) {
      console.error('Error updating profile:', error);
      throw new Error('プロフィールの更新に失敗しました');
    }
  }

  // ゲーム削除
  async deleteGame(gameId: string, userId: string): Promise<void> {
    try {
      console.log(`Deleting game ${gameId} by user ${userId}`);
      // 実装時はSupabase APIに置き換え
    } catch (error) {
      console.error('Error deleting game:', error);
      throw new Error('ゲームの削除に失敗しました');
    }
  }

  // ゲーム公開状態変更
  async toggleGameStatus(gameId: string, userId: string): Promise<string> {
    try {
      const newStatus = Math.random() > 0.5 ? 'published' : 'private';
      console.log(`Toggling game ${gameId} status to ${newStatus} by user ${userId}`);
      
      return newStatus;
    } catch (error) {
      console.error('Error toggling game status:', error);
      throw new Error('ゲーム状態の変更に失敗しました');
    }
  }

  // ビュー数増加
  async incrementViews(gameId: string): Promise<number> {
    try {
      const newViewCount = Math.floor(Math.random() * 10000);
      console.log(`Incrementing views for game ${gameId}`);
      
      return newViewCount;
    } catch (error) {
      console.error('Error incrementing views:', error);
      return 0;
    }
  }

  // シェア記録
  async recordShare(gameId: string, platform: string, userId?: string): Promise<number> {
    try {
      const newShareCount = Math.floor(Math.random() * 100);
      console.log(`Recording share for game ${gameId} on ${platform} by user ${userId}`);
      
      return newShareCount;
    } catch (error) {
      console.error('Error recording share:', error);
      return 0;
    }
  }
}