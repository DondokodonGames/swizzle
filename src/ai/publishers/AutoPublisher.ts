/**
 * AutoPublisher
 * 自動公開オーケストレーター
 * 
 * Phase H Day 4-5: 自動公開システム
 * - Supabase自動アップロード
 * - フリー素材登録
 * - SNS自動投稿（7言語）
 * - 公開ステータス管理
 */

import { GeneratedGame } from '../types/GenerationTypes';
import { SupabaseUploader } from './SupabaseUploader';
import { AssetRegistrar } from './AssetRegistrar';
import { SocialMediaPoster } from './SocialMediaPoster';

/**
 * 公開結果
 */
export interface PublicationResult {
  success: boolean;
  gameId?: string;
  supabaseUrl?: string;
  freeAssetsRegistered: boolean;
  socialMediaPosts: SocialMediaPostResult[];
  error?: string;
}

/**
 * SNS投稿結果
 */
export interface SocialMediaPostResult {
  platform: 'twitter' | 'facebook' | 'instagram';
  language: string;
  success: boolean;
  postId?: string;
  error?: string;
}

/**
 * 公開設定
 */
export interface PublicationConfig {
  publishToSupabase: boolean;
  registerFreeAssets: boolean;
  postToSocialMedia: boolean;
  socialMediaLanguages: string[];
  autoPublish: boolean;
}

/**
 * AutoPublisher
 * ゲームの自動公開プロセス全体を管理
 */
export class AutoPublisher {
  private supabaseUploader: SupabaseUploader;
  private assetRegistrar: AssetRegistrar;
  private socialMediaPoster: SocialMediaPoster;
  
  constructor(
    private config: PublicationConfig
  ) {
    this.supabaseUploader = new SupabaseUploader();
    this.assetRegistrar = new AssetRegistrar();
    this.socialMediaPoster = new SocialMediaPoster();
  }
  
  /**
   * ゲームを自動公開
   */
  async publishGame(
    game: GeneratedGame,
    autoPublish: boolean = true
  ): Promise<PublicationResult> {
    
    console.log('  📤 Publishing game...');
    
    try {
      const result: PublicationResult = {
        success: false,
        freeAssetsRegistered: false,
        socialMediaPosts: []
      };
      
      // Step 1: Supabaseにアップロード
      if (this.config.publishToSupabase) {
        console.log('     ├─ Uploading to Supabase...');
        const uploadResult = await this.supabaseUploader.uploadGame(
          game.project,
          game.quality.totalScore,
          autoPublish && game.quality.passed
        );
        
        if (uploadResult.success && uploadResult.gameId) {
          result.gameId = uploadResult.gameId;
          result.supabaseUrl = uploadResult.url;
          console.log(`     ├─ ✓ Uploaded: ${uploadResult.gameId}`);
        } else {
          throw new Error(`Supabase upload failed: ${uploadResult.error}`);
        }
      }
      
      // Step 2: フリー素材として登録
      if (this.config.registerFreeAssets && result.gameId) {
        console.log('     ├─ Registering free assets...');
        const registrationResult = await this.assetRegistrar.registerAssets(
          game.project,
          result.gameId
        );
        
        result.freeAssetsRegistered = registrationResult.success;
        
        if (registrationResult.success) {
          console.log(`     ├─ ✓ Registered ${registrationResult.assetCount} assets`);
        } else {
          console.warn(`     ├─ ⚠ Asset registration failed: ${registrationResult.error}`);
        }
      }
      
      // Step 3: SNSに自動投稿
      if (this.config.postToSocialMedia && result.gameId && autoPublish && game.quality.passed) {
        console.log('     └─ Posting to social media...');
        
        for (const language of this.config.socialMediaLanguages) {
          try {
            const postResult = await this.socialMediaPoster.postToTwitter(
              game.project,
              result.supabaseUrl!,
              language
            );
            
            result.socialMediaPosts.push(postResult);
            
            if (postResult.success) {
              console.log(`        ├─ ✓ Posted (${language}): ${postResult.postId}`);
            } else {
              console.warn(`        ├─ ⚠ Post failed (${language}): ${postResult.error}`);
            }
            
            // Rate limit対策: 投稿間隔1秒
            await this.sleep(1000);
          } catch (error) {
            console.error(`        ├─ ✗ Error posting (${language}):`, error);
            result.socialMediaPosts.push({
              platform: 'twitter',
              language,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }
      
      result.success = true;
      
      console.log(`  ✓ Publication complete: ${result.gameId}`);
      
      return result;
      
    } catch (error) {
      console.error('  ✗ Publication failed:', error);
      
      return {
        success: false,
        freeAssetsRegistered: false,
        socialMediaPosts: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * バッチ公開（複数ゲームを一括公開）
   */
  async publishBatch(
    games: GeneratedGame[],
    autoPublish: boolean = true
  ): Promise<PublicationResult[]> {
    
    console.log(`\n📤 Batch publishing ${games.length} games...`);
    
    const results: PublicationResult[] = [];
    
    for (let i = 0; i < games.length; i++) {
      console.log(`\n[${i + 1}/${games.length}] Publishing: ${games[i].project.settings.name}`);
      
      const result = await this.publishGame(games[i], autoPublish);
      results.push(result);
      
      // バッチ処理間隔: 2秒
      if (i < games.length - 1) {
        await this.sleep(2000);
      }
    }
    
    // サマリー表示
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    
    console.log(`\n📊 Batch Publication Summary:`);
    console.log(`   Total: ${results.length}`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Failed: ${failureCount}`);
    
    return results;
  }
  
  /**
   * 公開ステータスの更新
   */
  async updatePublicationStatus(
    gameId: string,
    status: 'published' | 'unpublished' | 'pending'
  ): Promise<boolean> {
    
    try {
      const result = await this.supabaseUploader.updateGameStatus(gameId, status);
      
      if (result) {
        console.log(`  ✓ Updated status: ${gameId} → ${status}`);
      } else {
        console.error(`  ✗ Failed to update status: ${gameId}`);
      }
      
      return result;
      
    } catch (error) {
      console.error('  ✗ Error updating status:', error);
      return false;
    }
  }
  
  /**
   * 公開済みゲームの削除
   */
  async unpublishGame(gameId: string): Promise<boolean> {
    
    try {
      console.log(`  🗑️  Unpublishing game: ${gameId}`);
      
      // Step 1: Supabaseから削除（論理削除）
      const deleteResult = await this.supabaseUploader.deleteGame(gameId);
      
      if (!deleteResult) {
        throw new Error('Failed to delete from Supabase');
      }
      
      // Step 2: フリー素材登録も削除
      await this.assetRegistrar.unregisterAssets(gameId);
      
      console.log(`  ✓ Unpublished: ${gameId}`);
      
      return true;
      
    } catch (error) {
      console.error('  ✗ Unpublish failed:', error);
      return false;
    }
  }
  
  /**
   * 公開統計の取得
   */
  async getPublicationStatistics(): Promise<{
    totalPublished: number;
    publishedToday: number;
    freeAssetsCount: number;
    socialMediaPosts: number;
  }> {
    
    const stats = await this.supabaseUploader.getStatistics();
    const assetStats = await this.assetRegistrar.getStatistics();
    const socialStats = await this.socialMediaPoster.getStatistics();
    
    return {
      totalPublished: stats.totalGames,
      publishedToday: stats.gamesToday,
      freeAssetsCount: assetStats.totalAssets,
      socialMediaPosts: socialStats.totalPosts
    };
  }
  
  /**
   * デフォルト設定の取得
   */
  static getDefaultConfig(): PublicationConfig {
    return {
      publishToSupabase: true,
      registerFreeAssets: true,
      postToSocialMedia: true,
      socialMediaLanguages: ['en', 'ja', 'es', 'fr', 'de', 'zh', 'ko'],
      autoPublish: true
    };
  }
  
  /**
   * 待機（Sleep）
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}