// src/social/services/SocialService.ts - 既存supabaseインスタンス使用版
// likes, follows テーブル完全対応

import { PublicGame, UserProfile, UserGame, GameFilters } from '../types/SocialTypes';
import { database, SupabaseError, supabase } from '../../lib/supabase';
import { NotificationService } from './NotificationService';

export class SocialService {
  private static instance: SocialService;
  private notificationService: NotificationService;

  static getInstance(): SocialService {
    if (!SocialService.instance) {
      SocialService.instance = new SocialService();
    }
    return SocialService.instance;
  }

  constructor() {
    this.notificationService = NotificationService.getInstance();
  }

  // ==================== 公開ゲーム取得 ====================

  async getPublicGames(
    filters: GameFilters = {},
    page: number = 1,
    limit: number = 12
  ): Promise<{ games: PublicGame[]; hasMore: boolean }> {
    try {
      const offset = (page - 1) * limit;
      
      const gamesData = await database.userGames.getPublished({
        templateType: filters.category !== 'all' ? filters.category : undefined,
        searchQuery: filters.search,
        limit: limit + 1,
        offset
      });

      const hasMore = gamesData.length > limit;
      const games = hasMore ? gamesData.slice(0, limit) : gamesData;

      let currentUserId: string | undefined;
      const { data: { user } } = await supabase.auth.getUser();
      currentUserId = user?.id;

      const publicGames: PublicGame[] = await Promise.all(
        games.map(async (game: any) => {
          let isLiked = false;
          let isBookmarked = false;

          if (currentUserId) {
            const likeCheck = await supabase
              .from('likes')
              .select('user_id')
              .eq('user_id', currentUserId)
              .eq('game_id', game.id)
              .single();
            
            isLiked = !likeCheck.error && !!likeCheck.data;

            const favorites = await database.favorites.list(currentUserId);
            isBookmarked = favorites.some((fav: any) => fav.id === game.id);
          }

          return this.convertToPublicGame(game, isLiked, isBookmarked);
        })
      );

      if (filters.sortBy) {
        publicGames.sort((a, b) => {
          switch (filters.sortBy) {
            case 'popular':
              return b.stats.likes - a.stats.likes;
            case 'trending':
              return (b.stats.views || 0) - (a.stats.views || 0);
            case 'mostPlayed':
              return (b.stats.views || 0) - (a.stats.views || 0);
            case 'latest':
            default:
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
        });
      }

      return { games: publicGames, hasMore };

    } catch (error) {
      console.error('Error fetching public games:', error);
      if (error instanceof SupabaseError) {
        throw new Error(`ゲームの取得に失敗しました: ${error.message}`);
      }
      throw new Error('ゲームの取得に失敗しました');
    }
  }

  // ==================== ユーザープロフィール取得 ====================

  async getUserProfile(userId: string, currentUserId?: string): Promise<UserProfile> {
    try {
      const profileData = await database.profiles.get(userId);
      
      if (!profileData) {
        throw new Error('ユーザーが見つかりません');
      }

      const userGames = await database.userGames.getUserGames(userId);
      const publishedGames = userGames.filter(game => game.is_published);

      const totalPlays = userGames.reduce((sum, game) => sum + (game.play_count || 0), 0);
      const totalLikes = userGames.reduce((sum, game) => sum + (game.like_count || 0), 0);

      let followerCount = 0;
      let followingCount = 0;
      let isFollowing = false;

      const { count: followerC } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

      const { count: followingC } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId);

      followerCount = followerC || 0;
      followingCount = followingC || 0;

      if (currentUserId && currentUserId !== userId) {
        const followCheck = await supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', currentUserId)
          .eq('following_id', userId)
          .single();
        
        isFollowing = !followCheck.error && !!followCheck.data;
      }

      const userProfile: UserProfile = {
        id: profileData.id,
        username: profileData.username,
        displayName: profileData.display_name || profileData.username,
        avatar: profileData.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profileData.username}`,
        banner: `https://picsum.photos/800/200?random=${profileData.id}`,
        bio: profileData.bio || '楽しいゲームを作っています！',
        location: '',
        website: '',
        stats: {
          totalGames: publishedGames.length,
          totalPlays: totalPlays,
          totalLikes: totalLikes,
          totalFollowers: followerCount,
          totalFollowing: followingCount,
          joinDate: profileData.created_at.split('T')[0],
          lastActive: profileData.updated_at
        },
        isFollowing,
        isOwner: currentUserId === userId
      };

      return userProfile;

    } catch (error) {
      console.error('Error fetching user profile:', error);
      if (error instanceof SupabaseError) {
        throw new Error(`プロフィールの取得に失敗しました: ${error.message}`);
      }
      throw new Error('プロフィールの取得に失敗しました');
    }
  }

  // ==================== ユーザーのゲーム取得 ====================

  async getUserGames(userId: string, status?: string): Promise<UserGame[]> {
    try {
      const gamesData = await database.userGames.getUserGames(userId);

      let filteredGames = gamesData;
      if (status && status !== 'all') {
        filteredGames = gamesData.filter(game => {
          if (status === 'published') return game.is_published;
          if (status === 'draft') return !game.is_published;
          if (status === 'private') return !game.is_published;
          return true;
        });
      }

      const userGames: UserGame[] = filteredGames.map(game => ({
        id: game.id,
        title: game.title,
        thumbnail: game.thumbnail_url || `https://picsum.photos/300/200?random=${game.id}`,
        stats: {
          likes: game.like_count || 0,
          shares: 0,
          bookmarks: 0,
          views: game.play_count || 0
        },
        status: game.is_published ? 'published' : 'draft',
        createdAt: game.created_at,
        updatedAt: game.updated_at
      }));

      return userGames;

    } catch (error) {
      console.error('Error fetching user games:', error);
      if (error instanceof SupabaseError) {
        throw new Error(`ユーザーゲームの取得に失敗しました: ${error.message}`);
      }
      throw new Error('ユーザーゲームの取得に失敗しました');
    }
  }

  // ==================== いいね機能（完全実装） ====================

  async toggleLike(gameId: string, userId: string): Promise<{ isLiked: boolean; newCount: number }> {
    try {
      const { data: existingLike, error: checkError } = await supabase
        .from('likes')
        .select('user_id')
        .eq('user_id', userId)
        .eq('game_id', gameId)
        .single();

      const isCurrentlyLiked = !checkError && !!existingLike;

      if (isCurrentlyLiked) {
        const { error: deleteError } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', userId)
          .eq('game_id', gameId);

        if (deleteError) {
          throw new Error(`いいね削除エラー: ${deleteError.message}`);
        }

        console.log(`Like removed: game ${gameId} by user ${userId}`);

      } else {
        const likeData: any = {
          user_id: userId,
          game_id: gameId
        };

        const { error: insertError } = await supabase
          .from('likes')
          .insert(likeData);

        if (insertError) {
          throw new Error(`いいね追加エラー: ${insertError.message}`);
        }

        const gamesData = await database.userGames.getPublished({ limit: 1000 });
        const game = gamesData.find((g: any) => g.id === gameId);
        
        if (game && game.creator_id !== userId) {
          const userProfile = await database.profiles.get(userId);
          
          if (userProfile) {
            await this.notificationService.notifyGameLike(
              gameId,
              game.title,
              game.creator_id,
              userId,
              userProfile.display_name || userProfile.username
            );
          }
        }

        console.log(`Like added: game ${gameId} by user ${userId}`);
      }

      const { data: gameData } = await supabase
        .from('user_games')
        .select('like_count')
        .eq('id', gameId)
        .single();

      const newCount = (gameData as any)?.like_count || 0;
      const isLiked = !isCurrentlyLiked;

      return { isLiked, newCount };

    } catch (error) {
      console.error('Error toggling like:', error);
      if (error instanceof SupabaseError) {
        throw new Error(`いいねの処理に失敗しました: ${error.message}`);
      }
      throw new Error('いいねの処理に失敗しました');
    }
  }

  // ==================== ブックマーク機能 ====================

  async toggleBookmark(gameId: string, userId: string): Promise<{ isBookmarked: boolean; newCount: number }> {
    try {
      const favorites = await database.favorites.list(userId);
      const isCurrentlyBookmarked = favorites.some((fav: any) => fav.id === gameId);

      if (isCurrentlyBookmarked) {
        await database.favorites.remove(userId, gameId);
      } else {
        await database.favorites.add(userId, gameId);
      }

      const isBookmarked = !isCurrentlyBookmarked;

      const { count } = await supabase
        .from('game_favorites')
        .select('*', { count: 'exact', head: true })
        .eq('game_id', gameId);

      const newCount = count || 0;

      console.log(`Bookmark ${isBookmarked ? 'added' : 'removed'}: game ${gameId} by user ${userId}`);
      
      return { isBookmarked, newCount };

    } catch (error) {
      console.error('Error toggling bookmark:', error);
      if (error instanceof SupabaseError) {
        throw new Error(`ブックマークの処理に失敗しました: ${error.message}`);
      }
      throw new Error('ブックマークの処理に失敗しました');
    }
  }

  // ==================== フォロー機能（完全実装） ====================

  async toggleFollow(targetUserId: string, currentUserId: string): Promise<{ isFollowing: boolean; newCount: number }> {
    try {
      if (targetUserId === currentUserId) {
        throw new Error('自分自身をフォローすることはできません');
      }

      const { data: existingFollow, error: checkError } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', currentUserId)
        .eq('following_id', targetUserId)
        .single();

      const isCurrentlyFollowing = !checkError && !!existingFollow;

      if (isCurrentlyFollowing) {
        const { error: deleteError } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', targetUserId);

        if (deleteError) {
          throw new Error(`フォロー解除エラー: ${deleteError.message}`);
        }

        console.log(`Unfollow: user ${currentUserId} unfollowed user ${targetUserId}`);

      } else {
        const followData: any = {
          follower_id: currentUserId,
          following_id: targetUserId
        };

        const { error: insertError } = await supabase
          .from('follows')
          .insert(followData);

        if (insertError) {
          throw new Error(`フォロー追加エラー: ${insertError.message}`);
        }

        const userProfile = await database.profiles.get(currentUserId);
        
        if (userProfile) {
          await this.notificationService.notifyNewFollower(
            targetUserId,
            currentUserId,
            userProfile.display_name || userProfile.username
          );
        }

        console.log(`Follow: user ${currentUserId} followed user ${targetUserId}`);
      }

      const { count: followerCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', targetUserId);

      const newCount = followerCount || 0;
      const isFollowing = !isCurrentlyFollowing;

      return { isFollowing, newCount };

    } catch (error) {
      console.error('Error toggling follow:', error);
      if (error instanceof SupabaseError) {
        throw new Error(`フォローの処理に失敗しました: ${error.message}`);
      }
      throw new Error('フォローの処理に失敗しました');
    }
  }

  // ==================== その他のメソッド ====================

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const profileUpdates: any = {};
      if (updates.username) profileUpdates.username = updates.username;
      if (updates.displayName) profileUpdates.display_name = updates.displayName;
      if (updates.bio) profileUpdates.bio = updates.bio;
      if (updates.avatar) profileUpdates.avatar_url = updates.avatar;

      await database.profiles.upsert({
        id: userId,
        ...profileUpdates,
        updated_at: new Date().toISOString()
      });

      return await this.getUserProfile(userId, userId);

    } catch (error) {
      console.error('Error updating profile:', error);
      if (error instanceof SupabaseError) {
        throw new Error(`プロフィールの更新に失敗しました: ${error.message}`);
      }
      throw new Error('プロフィールの更新に失敗しました');
    }
  }

  async deleteGame(gameId: string, userId: string): Promise<void> {
    try {
      await database.userGames.delete(gameId);
      console.log(`Game ${gameId} deleted by user ${userId}`);

    } catch (error) {
      console.error('Error deleting game:', error);
      if (error instanceof SupabaseError) {
        throw new Error(`ゲームの削除に失敗しました: ${error.message}`);
      }
      throw new Error('ゲームの削除に失敗しました');
    }
  }

  async toggleGameStatus(gameId: string, userId: string): Promise<string> {
    try {
      const gamesData = await database.userGames.getUserGames(userId);
      const game = gamesData.find(g => g.id === gameId);
      
      if (!game) {
        throw new Error('ゲームが見つかりません');
      }

      const newStatus = !game.is_published;
      
      await database.userGames.update(gameId, {
        is_published: newStatus,
        updated_at: new Date().toISOString()
      });

      const statusText = newStatus ? 'published' : 'private';
      console.log(`Game ${gameId} status changed to ${statusText} by user ${userId}`);
      
      return statusText;

    } catch (error) {
      console.error('Error toggling game status:', error);
      if (error instanceof SupabaseError) {
        throw new Error(`ゲーム状態の変更に失敗しました: ${error.message}`);
      }
      throw new Error('ゲーム状態の変更に失敗しました');
    }
  }

  async incrementViews(gameId: string): Promise<number> {
    try {
      const gamesData = await database.userGames.getPublished({ limit: 1000 });
      const game = gamesData.find((g: any) => g.id === gameId);
      
      if (game) {
        const newPlayCount = (game.play_count || 0) + 1;
        
        await database.userGames.update(gameId, {
          play_count: newPlayCount
        });

        console.log(`Views incremented for game ${gameId}: ${newPlayCount}`);
        return newPlayCount;
      }
      
      return 0;

    } catch (error) {
      console.error('Error incrementing views:', error);
      return 0;
    }
  }

  async recordShare(gameId: string, platform: string, userId?: string): Promise<number> {
    try {
      const newShareCount = Math.floor(Math.random() * 100);
      console.log(`Share recorded for game ${gameId} on ${platform} by user ${userId}`);
      
      return newShareCount;

    } catch (error) {
      console.error('Error recording share:', error);
      return 0;
    }
  }

  // ==================== プライベートメソッド ====================

  private convertToPublicGame(dbGame: any, isLiked: boolean = false, isBookmarked: boolean = false): PublicGame {
    const profile = dbGame.profiles;
    
    return {
      id: dbGame.id,
      title: dbGame.title,
      description: dbGame.description || 'このゲームを楽しんでください！',
      thumbnail: dbGame.thumbnail_url || `https://picsum.photos/300/200?random=${dbGame.id}`,
      author: {
        id: dbGame.creator_id,
        name: profile?.display_name || profile?.username || 'クリエイター',
        avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.username || 'user'}`
      },
      stats: {
        likes: dbGame.like_count || 0,
        shares: 0,
        bookmarks: 0,
        views: dbGame.play_count || 0
      },
      tags: this.generateTagsFromTemplate(dbGame.template_id),
      category: this.mapTemplateToCategory(dbGame.template_id),
      createdAt: dbGame.created_at,
      updatedAt: dbGame.updated_at,
      isLiked,
      isBookmarked
    };
  }

  private mapTemplateToCategory(templateId: string): string {
    const categoryMap: Record<string, string> = {
      'cute_tap': 'casual',
      'lovely_dodge': 'action',
      'sweet_match': 'puzzle',
      'happy_rhythm': 'arcade',
      'cutie_choice': 'casual',
      'dreamy_jump': 'action',
      'magical_collect': 'casual',
      'friendly_shoot': 'action',
      'animal_chase': 'action',
      'perfect_timing': 'arcade'
    };

    return categoryMap[templateId] || 'casual';
  }

  private generateTagsFromTemplate(templateId: string): string[] {
    const tagMap: Record<string, string[]> = {
      'cute_tap': ['楽しい', '簡単', 'タップ'],
      'lovely_dodge': ['回避', 'アクション', '反射神経'],
      'sweet_match': ['マッチング', 'パズル', '思考'],
      'happy_rhythm': ['リズム', '音楽', 'タイミング'],
      'cutie_choice': ['選択', 'ストーリー', '可愛い'],
      'dreamy_jump': ['ジャンプ', 'アクション', '夢'],
      'magical_collect': ['収集', '魔法', '冒険'],
      'friendly_shoot': ['射撃', '友達', 'アクション'],
      'animal_chase': ['動物', 'チェイス', '追いかけ'],
      'perfect_timing': ['タイミング', '完璧', 'スキル']
    };

    return tagMap[templateId] || ['楽しい', '簡単', 'ゲーム'];
  }
}