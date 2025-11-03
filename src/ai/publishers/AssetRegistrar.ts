/**
 * AssetRegistrar
 * フリー素材登録処理
 * 
 * Phase H Day 4-5: 自動公開システム
 * - AI生成アセットをフリー素材として登録
 * - CC0 1.0 Universal (Public Domain) ライセンス
 * - 画像・音声アセットの管理
 * - 統計情報の取得
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GameProject } from '../../types/editor/GameProject';

/**
 * 素材登録結果
 */
export interface RegistrationResult {
  success: boolean;
  assetCount: number;
  error?: string;
}

/**
 * フリー素材統計
 */
export interface AssetStatistics {
  totalAssets: number;
  imageAssets: number;
  soundAssets: number;
  assetsToday: number;
  assetsThisWeek: number;
}

/**
 * フリー素材データ
 */
interface FreeAssetData {
  game_id: string;
  asset_type: 'image' | 'sound';
  asset_name: string;
  data_url: string;
  license: string;
  width?: number;
  height?: number;
  duration?: number;
  file_size: number;
  created_at: string;
}

/**
 * AssetRegistrar
 * フリー素材の登録・管理
 */
export class AssetRegistrar {
  private supabase: SupabaseClient;
  
  constructor() {
    // Supabaseクライアント初期化
    this.supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    // 環境変数チェック
    if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      throw new Error('Supabase環境変数が設定されていません');
    }
  }
  
  /**
   * ゲームアセットをフリー素材として登録
   */
  async registerAssets(
    project: GameProject,
    gameId: string
  ): Promise<RegistrationResult> {
    
    try {
      const assets: FreeAssetData[] = [];
      
      // 1. 背景画像を登録
      if (project.assets.background && project.assets.background.frames) {
        for (let i = 0; i < project.assets.background.frames.length; i++) {
          const frame = project.assets.background.frames[i];
          
          assets.push({
            game_id: gameId,
            asset_type: 'image',
            asset_name: `${project.settings.name} - Background Frame ${i + 1}`,
            data_url: frame.dataUrl,
            license: 'CC0 1.0 Universal (Public Domain)',
            width: frame.width,
            height: frame.height,
            file_size: this.estimateDataUrlSize(frame.dataUrl),
            created_at: new Date().toISOString()
          });
        }
      }
      
      // 2. オブジェクト画像を登録
      if (project.assets.objects) {
        for (const obj of project.assets.objects) {
          if (obj.frames) {
            for (let i = 0; i < obj.frames.length; i++) {
              const frame = obj.frames[i];
              
              assets.push({
                game_id: gameId,
                asset_type: 'image',
                asset_name: `${project.settings.name} - ${obj.name} Frame ${i + 1}`,
                data_url: frame.dataUrl,
                license: 'CC0 1.0 Universal (Public Domain)',
                width: frame.width,
                height: frame.height,
                file_size: this.estimateDataUrlSize(frame.dataUrl),
                created_at: new Date().toISOString()
              });
            }
          }
        }
      }
      
      // 3. 音声アセットを登録
      if (project.assets.audio) {
        // BGM（単体オブジェクトまたは配列に対応）
        if (project.assets.audio.bgm) {
          const bgmList = Array.isArray(project.assets.audio.bgm) 
            ? project.assets.audio.bgm 
            : [project.assets.audio.bgm];
          
          for (const bgm of bgmList) {
            assets.push({
              game_id: gameId,
              asset_type: 'sound',
              asset_name: `${project.settings.name} - BGM ${bgm.name || 'Background Music'}`,
              data_url: bgm.dataUrl,
              license: 'CC0 1.0 Universal (Public Domain)',
              duration: bgm.duration,
              file_size: this.estimateDataUrlSize(bgm.dataUrl),
              created_at: new Date().toISOString()
            });
          }
        }
        
        // SE（効果音）（配列として処理）
        if (project.assets.audio.se && Array.isArray(project.assets.audio.se)) {
          for (const se of project.assets.audio.se) {
            assets.push({
              game_id: gameId,
              asset_type: 'sound',
              asset_name: `${project.settings.name} - SE ${se.name || 'Sound Effect'}`,
              data_url: se.dataUrl,
              license: 'CC0 1.0 Universal (Public Domain)',
              duration: se.duration,
              file_size: this.estimateDataUrlSize(se.dataUrl),
              created_at: new Date().toISOString()
            });
          }
        }
      }
      
      // 4. Supabaseに一括登録
      if (assets.length > 0) {
        const { error } = await this.supabase
          .from('free_assets')
          .insert(assets);
        
        if (error) {
          throw new Error(`Asset registration error: ${error.message}`);
        }
      }
      
      return {
        success: true,
        assetCount: assets.length
      };
      
    } catch (error) {
      console.error('Asset registration error:', error);
      
      return {
        success: false,
        assetCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * フリー素材の登録解除
   */
  async unregisterAssets(gameId: string): Promise<boolean> {
    
    try {
      const { error } = await this.supabase
        .from('free_assets')
        .delete()
        .eq('game_id', gameId);
      
      if (error) {
        throw new Error(`Asset unregistration error: ${error.message}`);
      }
      
      return true;
      
    } catch (error) {
      console.error('Asset unregistration error:', error);
      return false;
    }
  }
  
  /**
   * ゲームのアセット一覧を取得
   */
  async getGameAssets(gameId: string): Promise<FreeAssetData[]> {
    
    try {
      const { data, error } = await this.supabase
        .from('free_assets')
        .select('*')
        .eq('game_id', gameId);
      
      if (error) {
        throw new Error(`Get assets error: ${error.message}`);
      }
      
      return data || [];
      
    } catch (error) {
      console.error('Get assets error:', error);
      return [];
    }
  }
  
  /**
   * 統計情報の取得
   */
  async getStatistics(): Promise<AssetStatistics> {
    
    try {
      // 総アセット数
      const { count: totalAssets } = await this.supabase
        .from('free_assets')
        .select('*', { count: 'exact', head: true });
      
      // 画像アセット数
      const { count: imageAssets } = await this.supabase
        .from('free_assets')
        .select('*', { count: 'exact', head: true })
        .eq('asset_type', 'image');
      
      // 音声アセット数
      const { count: soundAssets } = await this.supabase
        .from('free_assets')
        .select('*', { count: 'exact', head: true })
        .eq('asset_type', 'sound');
      
      // 今日のアセット数
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: assetsToday } = await this.supabase
        .from('free_assets')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());
      
      // 今週のアセット数
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: assetsThisWeek } = await this.supabase
        .from('free_assets')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString());
      
      return {
        totalAssets: totalAssets || 0,
        imageAssets: imageAssets || 0,
        soundAssets: soundAssets || 0,
        assetsToday: assetsToday || 0,
        assetsThisWeek: assetsThisWeek || 0
      };
      
    } catch (error) {
      console.error('Get statistics error:', error);
      
      return {
        totalAssets: 0,
        imageAssets: 0,
        soundAssets: 0,
        assetsToday: 0,
        assetsThisWeek: 0
      };
    }
  }
  
  /**
   * Data URLのサイズを推定（バイト）
   */
  private estimateDataUrlSize(dataUrl: string): number {
    try {
      // data:image/webp;base64,... の形式
      const base64Data = dataUrl.split(',')[1];
      
      if (!base64Data) {
        return 0;
      }
      
      // Base64のサイズ = 元のバイト数 × 4/3（約）
      const base64Length = base64Data.length;
      const byteSize = Math.floor(base64Length * 3 / 4);
      
      return byteSize;
      
    } catch (error) {
      console.error('Size estimation error:', error);
      return 0;
    }
  }
  
  /**
   * アセットタイプ別の統計
   */
  async getAssetTypeStatistics(): Promise<{
    [key: string]: {
      count: number;
      totalSize: number;
      averageSize: number;
    }
  }> {
    
    try {
      const { data, error } = await this.supabase
        .from('free_assets')
        .select('asset_type, file_size');
      
      if (error || !data) {
        throw new Error('Failed to get asset statistics');
      }
      
      // タイプ別に集計
      const stats: any = {};
      
      for (const asset of data) {
        const type = asset.asset_type;
        
        if (!stats[type]) {
          stats[type] = {
            count: 0,
            totalSize: 0,
            averageSize: 0
          };
        }
        
        stats[type].count++;
        stats[type].totalSize += asset.file_size || 0;
      }
      
      // 平均サイズを計算
      for (const type in stats) {
        stats[type].averageSize = stats[type].totalSize / stats[type].count;
      }
      
      return stats;
      
    } catch (error) {
      console.error('Get asset type statistics error:', error);
      return {};
    }
  }
  
  /**
   * ヘルスチェック
   */
  async healthCheck(): Promise<boolean> {
    
    try {
      const { error } = await this.supabase
        .from('free_assets')
        .select('id')
        .limit(1);
      
      return !error;
      
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}