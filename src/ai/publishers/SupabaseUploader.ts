/**
 * SupabaseUploader
 * Supabase自動アップロード処理（スキーマ完全対応版）
 *
 * Phase H Day 5完了版: 実際のuser_gamesテーブルスキーマに対応
 * - creator_id (user_idではない)
 * - is_published (is_publicではない)
 * - template_id (必須カラム)
 *
 * Storage対応版: 大容量ゲーム（50MB+）をサポート
 * - 画像・音声はSupabase Storageにアップロード
 * - DBにはメタデータ（storageUrl）のみ保存
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GameProject } from '../../types/editor/GameProject';
import { StorageUploader } from './StorageUploader';
import { randomUUID } from 'crypto';

/**
 * リトライ設定
 */
const RETRY_CONFIG = {
  maxRetries: 5,      // 520エラー対応で増加
  baseDelayMs: 3000,  // 3秒
  maxDelayMs: 30000   // 30秒
};

/**
 * Storage使用の閾値（1MB以上でStorage使用）
 */
const STORAGE_THRESHOLD = 1 * 1024 * 1024;

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
 * アップロードオプション
 */
export interface UploadOptions {
  /** true なら is_published=true で即公開（既定: true） */
  autoPublish?: boolean;
  /** 審査ステータス。省略時は autoPublish から導出 */
  reviewStatus?: 'approved' | 'pending_review';
  /** ImageQualityChecker の平均スコア（0-100） */
  imageScore?: number;
  templateId?: string;
  category?: string;
  /** 'rules'（既定）または 'code'（JSサンドボックスゲーム） */
  gameType?: 'rules' | 'code';
  /**
   * true なら同じ template_id の既存行をスキップせず上書き更新する（既定: false）。
   * 既存の id / created_at / play_count / like_count は保持したまま
   * project_data・コード・メタ情報のみ差し替える。
   */
  overwrite?: boolean;
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
  pendingReviewGames: number;
}

/**
 * SupabaseUploader
 * Supabaseへのゲームアップロード処理
 */
export class SupabaseUploader {
  private supabase: SupabaseClient;
  private masterUserId: string;
  private storageUploader: StorageUploader;

  constructor() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY!;
    this.masterUserId = process.env.MASTER_USER_ID!;
    this.storageUploader = new StorageUploader();

    // 環境変数チェック
    if (!supabaseUrl || !serviceKey) {
      throw new Error('Supabase環境変数が設定されていません');
    }

    if (!this.masterUserId) {
      throw new Error('MASTER_USER_IDが設定されていません');
    }

    // デバッグ: JWTをデコードしてroleを確認
    let keyRole = 'unknown';
    try {
      const parts = serviceKey.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        keyRole = payload.role || 'no role field';
      }
    } catch (e) {
      keyRole = 'decode error';
    }

    console.log(`   🔑 Supabase URL: ${supabaseUrl.substring(0, 30)}...`);
    console.log(`   🔑 JWT Role: ${keyRole}`);
    console.log(`   👤 Master User ID: ${this.masterUserId.substring(0, 8)}...`);

    if (keyRole !== 'service_role') {
      console.warn(`   ⚠️ 警告: service_roleキーではありません！ (role: ${keyRole})`);
      console.warn(`   ⚠️ RLSをバイパスできないため、アップロードが失敗する可能性があります`);
    }

    // Supabaseクライアント初期化（service_roleキーでRLSバイパス）
    this.supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      db: {
        schema: 'public'
      }
    });
  }
  
  /**
   * プロジェクトのサイズを計算
   */
  private calculateProjectSize(project: GameProject): number {
    return JSON.stringify(project).length;
  }

  /**
   * ゲームをSupabaseにアップロード（Storage対応版）
   *
   * 1. ゲームIDを生成
   * 2. アセット（画像・音声）をSupabase Storageにアップロード
   * 3. dataUrlをstorageUrlに置換
   * 4. 軽量化されたプロジェクトをDBに保存
   */
  async uploadGame(
    project: GameProject,
    qualityScore: number,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const autoPublish = options.autoPublish ?? true;
    const reviewStatus = options.reviewStatus ?? (autoPublish ? 'approved' : 'pending_review');

    const fullSize = this.calculateProjectSize(project);
    console.log(`   📊 Project size: ${(fullSize / 1024).toFixed(1)} KB`);

    const resolvedTemplateId = options.templateId ?? 'ai_generated';
    const overwrite = options.overwrite ?? false;

    // 重複チェック（同じ template_id が既に存在するか）
    // overwrite=false → スキップして既存IDを返す
    // overwrite=true  → 既存IDを保持して後段で UPDATE（上書き）する
    let existingId: string | null = null;
    if (resolvedTemplateId !== 'ai_generated') {
      try {
        const { data: existing } = await this.supabase
          .from('user_games')
          .select('id')
          .eq('template_id', resolvedTemplateId)
          .eq('creator_id', this.masterUserId)
          .limit(1)
          .maybeSingle();
        if (existing) {
          if (!overwrite) {
            console.log(`   ⏭️ Skip: template_id=${resolvedTemplateId} already exists (id=${existing.id})`);
            return { success: true, gameId: existing.id };
          }
          existingId = existing.id;
          console.log(`   ♻️ Overwrite: template_id=${resolvedTemplateId} 既存行を更新します (id=${existingId})`);
        }
      } catch {
        // 取得失敗時は新規登録として続行
      }
    }

    // ゲームID: 上書き時は既存IDを再利用（Storageパス・参照を維持）、新規時は生成
    const gameId = existingId ?? randomUUID();
    console.log(`   🆔 Game ID: ${gameId.substring(0, 8)}... ${existingId ? '(既存=上書き)' : '(新規)'}`);

    let projectToSave = project;

    // 大容量プロジェクトはStorageを使用
    if (fullSize > STORAGE_THRESHOLD) {
      console.log(`   📤 Using Storage for assets (size > ${STORAGE_THRESHOLD / 1024}KB)`);

      try {
        // アセットをStorageにアップロード
        const uploadResult = await this.storageUploader.uploadGameAssets(
          project,
          gameId,
          (current, total) => {
            if (current % 5 === 0 || current === total) {
              console.log(`   📤 Uploading assets: ${current}/${total}`);
            }
          }
        );

        if (uploadResult.failedCount > 0) {
          console.warn(`   ⚠️ ${uploadResult.failedCount}件のアセットアップロード失敗`);
        }

        if (uploadResult.uploadedCount > 0) {
          console.log(`   ✅ ${uploadResult.uploadedCount}件のアセットをStorageにアップロード完了`);
          console.log(`   📊 Total uploaded: ${(uploadResult.totalSize / 1024 / 1024).toFixed(2)} MB`);

          // dataUrlをstorageUrlに置換
          projectToSave = this.storageUploader.replaceDataUrlsWithStorageUrls(
            project,
            uploadResult.results
          ) as GameProject;

          const newSize = this.calculateProjectSize(projectToSave);
          console.log(`   📊 Optimized project size: ${(newSize / 1024).toFixed(1)} KB (${((1 - newSize / fullSize) * 100).toFixed(0)}% reduced)`);
        }
      } catch (storageError) {
        console.error('   ❌ Storage upload failed:', storageError);
        // Storageアップロード失敗時は元のプロジェクトで続行を試みる
        console.log('   ⚠️ Falling back to direct DB upload...');
      }
    }

    // サムネイルURLを取得（背景画像のstorageUrlまたは最初のオブジェクト画像）
    let thumbnailUrl: string | null = null;
    if (projectToSave.assets?.background?.frames?.[0]) {
      const bgFrame = projectToSave.assets.background.frames[0];
      thumbnailUrl = (bgFrame as any).storageUrl || null;
    }
    if (!thumbnailUrl && projectToSave.assets?.objects?.[0]?.frames?.[0]) {
      const objFrame = projectToSave.assets.objects[0].frames[0];
      thumbnailUrl = (objFrame as any).storageUrl || null;
    }

    // ゲームデータを準備（実際のスキーマに合わせる）
    const gameData = {
      id: gameId,  // 事前生成したIDを使用
      creator_id: this.masterUserId,
      title: projectToSave.name || projectToSave.settings?.name || 'Untitled Game',
      description: projectToSave.description || projectToSave.settings?.description || 'AI-generated game',
      template_id: resolvedTemplateId,
      category: options.category ?? null,
      project_data: projectToSave,             // 完全な GameProject（Storage URL使用）
      thumbnail_url: thumbnailUrl,
      is_published: autoPublish,
      review_status: reviewStatus,
      is_featured: false,
      play_count: 0,
      like_count: 0,
      ai_generated: true,
      ai_quality_score: qualityScore,
      ...(options.imageScore !== undefined ? { ai_image_score: options.imageScore } : {}),
      game_type: options.gameType ?? 'rules',
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

        // user_gamesテーブルへ書き込み（新規=insert / 上書き=update）
        let data: { id?: string } | null;
        let error: { message: string } | null;
        if (existingId) {
          // 上書き: id / created_at / 統計値（play_count・like_count）は保持する
          const {
            id: _omitId,
            created_at: _omitCreatedAt,
            play_count: _omitPlayCount,
            like_count: _omitLikeCount,
            ...updateFields
          } = gameData;
          ({ data, error } = await this.supabase
            .from('user_games')
            .update(updateFields)
            .eq('id', existingId)
            .select()
            .single());
        } else {
          ({ data, error } = await this.supabase
            .from('user_games')
            .insert(gameData)
            .select()
            .single());
        }

        if (error) {
          throw new Error(`Supabase ${existingId ? 'update' : 'insert'} error: ${error.message}`);
        }

        if (!data || !data.id) {
          throw new Error('Game ID not returned from Supabase');
        }

        // ゲームURLを生成
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

        // リトライ可能なエラーかどうかを判定
        const isRetryableError =
          lastError.message.includes('fetch failed') ||
          lastError.message.includes('network') ||
          lastError.message.includes('ECONNREFUSED') ||
          lastError.message.includes('timeout') ||
          lastError.message.includes('520') ||           // Cloudflare 520
          lastError.message.includes('502') ||           // Bad Gateway
          lastError.message.includes('503') ||           // Service Unavailable
          lastError.message.includes('504') ||           // Gateway Timeout
          lastError.message.includes('Web server is returning an unknown error') ||  // 520 HTML response
          lastError.message.includes('Error code 520');  // 520 in HTML

        if (!isRetryableError || attempt === RETRY_CONFIG.maxRetries) {
          console.error('Supabase upload error:', lastError.message.substring(0, 200));
          // 新規登録の失敗時のみStorageのアセットを削除する。
          // 上書き(existingId)の場合は既存ゲームの資産を消さないようスキップ。
          if (!existingId) {
            await this.storageUploader.deleteGameAssets(gameId).catch(() => {});
          }
          break;
        }

        console.warn(`   ⚠️ サーバーエラー（リトライ対象）: ${lastError.message.substring(0, 100)}...`);
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
    status: 'published' | 'unpublished' | 'pending',
    review?: { reviewedBy?: string; reviewNotes?: string }
  ): Promise<boolean> {

    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (status === 'published') {
        updateData.is_published = true;
        updateData.review_status = 'approved';
      } else if (status === 'unpublished') {
        // 公開取り下げ: review_status はそのまま（承認済みのまま非公開にもできる）
        updateData.is_published = false;
      } else if (status === 'pending') {
        updateData.is_published = false;
        updateData.review_status = 'pending_review';
      }

      if (review?.reviewedBy || review?.reviewNotes) {
        updateData.reviewed_at = new Date().toISOString();
        if (review.reviewedBy) updateData.reviewed_by = review.reviewedBy;
        if (review.reviewNotes) updateData.review_notes = review.reviewNotes;
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
        ? qualityData.reduce((sum: number, game: { ai_quality_score?: number }) => sum + (game.ai_quality_score || 0), 0) / qualityData.length
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

      // 審査待ちゲーム数
      const { count: pendingReviewGames } = await this.supabase
        .from('user_games')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', this.masterUserId)
        .eq('review_status', 'pending_review');

      return {
        totalGames: totalGames || 0,
        gamesToday: gamesToday || 0,
        gamesThisWeek: gamesThisWeek || 0,
        gamesThisMonth: gamesThisMonth || 0,
        averageQuality: averageQuality || 0,
        publishedGames: publishedGames || 0,
        unpublishedGames: unpublishedGames || 0,
        pendingReviewGames: pendingReviewGames || 0
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
        unpublishedGames: 0,
        pendingReviewGames: 0
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