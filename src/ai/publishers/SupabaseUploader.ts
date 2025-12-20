/**
 * SupabaseUploader
 * Supabase自動アップロード処理（スキーマ完全対応版）
 *
 * Phase H Day 5完了版: 実際のuser_gamesテーブルスキーマに対応
 * - creator_id (user_idではない)
 * - is_published (is_publicではない)
 * - template_id (必須カラム)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GameProject } from '../../types/editor/GameProject';

/**
 * リトライ設定
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 2000,  // 2秒
  maxDelayMs: 16000   // 16秒
};

/**
 * 指定時間待機
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * アップロード結果
 */
export interface UploadResult {
  success: boolean;
  gameId?: string;
  url?: string;
  error?: string;
}

/**
 * ゲーム統計
 */
export interface GameStatistics {
  totalGames: number;
  gamesToday: number;
  gamesThisWeek: number;
  gamesThisMonth: number;
  averageQuality: number;
  publishedGames: number;
  unpublishedGames: number;
}

/**
 * SupabaseUploader
 * Supabaseへのゲームアップロード処理
 */
export class SupabaseUploader {
  private supabase: SupabaseClient;
  private masterUserId: string;
  
  constructor() {
    // Supabaseクライアント初期化
    this.supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    this.masterUserId = process.env.MASTER_USER_ID!;
    
    // 環境変数チェック
    if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      throw new Error('Supabase環境変数が設定されていません');
    }
    
    if (!this.masterUserId) {
      throw new Error('MASTER_USER_IDが設定されていません');
    }
  }
  
  /**
   * ゲームをSupabaseにアップロード（リトライ機能付き）
   */
  async uploadGame(
    project: GameProject,
    qualityScore: number,
    autoPublish: boolean = true
  ): Promise<UploadResult> {
    // データサイズを計算して表示
    const fullSize = JSON.stringify(project).length;
    console.log(`   📊 Project size: ${(fullSize / 1024).toFixed(1)} KB`);

    // 1. ゲームデータを準備（実際のスキーマに合わせる）
    // game_dataは旧フィールド、project_dataが新フィールド
    // 重複を避けるためproject_dataのみにデータを保存
    const gameData = {
      creator_id: this.masterUserId,
      title: project.name || project.settings?.name || 'Untitled Game',
      description: project.description || project.settings?.description || 'AI-generated game',
      template_id: 'ai_generated',
      game_data: {},                           // 旧フィールド（空オブジェクト）
      project_data: project,                   // 新フィールド（データはここのみ）
      thumbnail_url: null,
      is_published: autoPublish,
      is_featured: false,
      play_count: 0,
      like_count: 0,
      ai_generated: true,
      ai_quality_score: qualityScore,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let lastError: Error | null = null;

    // リトライループ
    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delayMs = Math.min(
            RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt - 1),
            RETRY_CONFIG.maxDelayMs
          );
          console.log(`   ⏳ リトライ ${attempt}/${RETRY_CONFIG.maxRetries} (${delayMs / 1000}秒後)...`);
          await sleep(delayMs);
        }

        // 2. user_gamesテーブルに挿入
        const { data, error } = await this.supabase
          .from('user_games')
          .insert(gameData)
          .select()
          .single();

        if (error) {
          throw new Error(`Supabase insert error: ${error.message}`);
        }

        if (!data || !data.id) {
          throw new Error('Game ID not returned from Supabase');
        }

        // 3. ゲームURLを生成
        const gameUrl = this.generateGameUrl(data.id);

        if (attempt > 0) {
          console.log(`   ✅ リトライ成功`);
        }

        return {
          success: true,
          gameId: data.id,
          url: gameUrl
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const isNetworkError = lastError.message.includes('fetch failed') ||
          lastError.message.includes('network') ||
          lastError.message.includes('ECONNREFUSED') ||
          lastError.message.includes('timeout');

        if (!isNetworkError || attempt === RETRY_CONFIG.maxRetries) {
          console.error('Supabase upload error:', lastError);
          break;
        }

        console.warn(`   ⚠️ ネットワークエラー: ${lastError.message}`);
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Unknown error'
    };
  }
  
  /**
   * ゲームステータスの更新
   */
  async updateGameStatus(
    gameId: string,
    status: 'published' | 'unpublished' | 'pending'
  ): Promise<boolean> {
    
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      if (status === 'published') {
        updateData.is_published = true;
      } else if (status === 'unpublished') {
        updateData.is_published = false;
      } else if (status === 'pending') {
        updateData.is_published = false;
      }
      
      const { error } = await this.supabase
        .from('user_games')
        .update(updateData)
        .eq('id', gameId);
      
      if (error) {
        throw new Error(`Status update error: ${error.message}`);
      }
      
      return true;
      
    } catch (error) {
      console.error('Status update error:', error);
      return false;
    }
  }
  
  /**
   * ゲームの削除（論理削除）
   */
  async deleteGame(gameId: string): Promise<boolean> {
    
    try {
      // 論理削除: is_publishedをfalseに設定
      const { error } = await this.supabase
        .from('user_games')
        .update({
          is_published: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', gameId);
      
      if (error) {
        throw new Error(`Delete error: ${error.message}`);
      }
      
      return true;
      
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  }
  
  /**
   * ゲーム品質スコアの更新
   */
  async updateQualityScore(
    gameId: string,
    newScore: number
  ): Promise<boolean> {
    
    try {
      const { error } = await this.supabase
        .from('user_games')
        .update({
          ai_quality_score: newScore,
          updated_at: new Date().toISOString()
        })
        .eq('id', gameId);
      
      if (error) {
        throw new Error(`Quality score update error: ${error.message}`);
      }
      
      return true;
      
    } catch (error) {
      console.error('Quality score update error:', error);
      return false;
    }
  }
  
  /**
   * ゲーム情報の取得
   */
  async getGame(gameId: string): Promise<GameProject | null> {

    try {
      const { data, error } = await this.supabase
        .from('user_games')
        .select('project_data')
        .eq('id', gameId)
        .single();

      if (error || !data) {
        throw new Error(`Game not found: ${gameId}`);
      }

      return data.project_data as GameProject;

    } catch (error) {
      console.error('Get game error:', error);
      return null;
    }
  }
  
  /**
   * 統計情報の取得
   */
  async getStatistics(): Promise<GameStatistics> {
    
    try {
      // 総ゲーム数
      const { count: totalGames } = await this.supabase
        .from('user_games')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', this.masterUserId);
      
      // 今日のゲーム数
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: gamesToday } = await this.supabase
        .from('user_games')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', this.masterUserId)
        .gte('created_at', today.toISOString());
      
      // 今週のゲーム数
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: gamesThisWeek } = await this.supabase
        .from('user_games')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', this.masterUserId)
        .gte('created_at', weekAgo.toISOString());
      
      // 今月のゲーム数
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      const { count: gamesThisMonth } = await this.supabase
        .from('user_games')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', this.masterUserId)
        .gte('created_at', monthAgo.toISOString());
      
      // 平均品質スコア
      const { data: qualityData } = await this.supabase
        .from('user_games')
        .select('ai_quality_score')
        .eq('creator_id', this.masterUserId)
        .not('ai_quality_score', 'is', null);
      
      const averageQuality = qualityData && qualityData.length > 0
        ? qualityData.reduce((sum, game) => sum + (game.ai_quality_score || 0), 0) / qualityData.length
        : 0;
      
      // 公開・非公開ゲーム数
      const { count: publishedGames } = await this.supabase
        .from('user_games')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', this.masterUserId)
        .eq('is_published', true);
      
      const { count: unpublishedGames } = await this.supabase
        .from('user_games')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', this.masterUserId)
        .eq('is_published', false);
      
      return {
        totalGames: totalGames || 0,
        gamesToday: gamesToday || 0,
        gamesThisWeek: gamesThisWeek || 0,
        gamesThisMonth: gamesThisMonth || 0,
        averageQuality: averageQuality || 0,
        publishedGames: publishedGames || 0,
        unpublishedGames: unpublishedGames || 0
      };
      
    } catch (error) {
      console.error('Get statistics error:', error);
      
      return {
        totalGames: 0,
        gamesToday: 0,
        gamesThisWeek: 0,
        gamesThisMonth: 0,
        averageQuality: 0,
        publishedGames: 0,
        unpublishedGames: 0
      };
    }
  }
  
  /**
   * マスターアカウントのゲーム一覧を取得
   */
  async getMasterGames(
    limit: number = 100,
    offset: number = 0
  ): Promise<any[]> {
    
    try {
      const { data, error } = await this.supabase
        .from('user_games')
        .select('*')
        .eq('creator_id', this.masterUserId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) {
        throw new Error(`Get games error: ${error.message}`);
      }
      
      return data || [];
      
    } catch (error) {
      console.error('Get games error:', error);
      return [];
    }
  }
  
  /**
   * ゲームURLの生成
   */
  private generateGameUrl(gameId: string): string {
    const baseUrl = process.env.VITE_APP_URL || 'https://swizzle-games.com';
    return `${baseUrl}/play/${gameId}`;
  }
  
  /**
   * ヘルスチェック
   */
  async healthCheck(): Promise<boolean> {
    
    try {
      const { error } = await this.supabase
        .from('user_games')
        .select('id')
        .limit(1);
      
      return !error;
      
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}