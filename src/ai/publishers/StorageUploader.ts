/**
 * StorageUploader
 * Supabase Storageを使用してゲームアセット（画像・音声）をアップロード
 *
 * 大容量ゲーム対応: 50MB+のプロジェクトでも安定してアップロード可能
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * ストレージバケット名
 */
const BUCKETS = {
  GAME_ASSETS: 'game-assets',  // 画像・音声ファイル
  THUMBNAILS: 'thumbnails'      // サムネイル画像
} as const;

/**
 * リトライ設定
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000
};

/**
 * 待機関数
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * アップロード結果
 */
export interface StorageUploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

/**
 * バッチアップロード結果
 */
export interface BatchUploadResult {
  success: boolean;
  uploadedCount: number;
  failedCount: number;
  results: Map<string, StorageUploadResult>;
  totalSize: number;
}

/**
 * アセットマッピング（dataUrl -> storageUrl）
 */
export interface AssetUrlMapping {
  originalId: string;
  originalDataUrl: string;
  storageUrl: string;
  storagePath: string;
  fileSize: number;
}

/**
 * StorageUploader
 * Supabase Storageへのアセットアップロード処理
 */
export class StorageUploader {
  private supabase: SupabaseClient;
  private supabaseUrl: string;

  constructor() {
    this.supabaseUrl = process.env.VITE_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY!;

    if (!this.supabaseUrl || !serviceKey) {
      throw new Error('Supabase環境変数が設定されていません');
    }

    this.supabase = createClient(this.supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  /**
   * Base64データURLをBlobに変換
   */
  private dataUrlToBlob(dataUrl: string): { blob: Blob; mimeType: string } {
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      throw new Error('Invalid data URL format');
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return {
      blob: new Blob([bytes], { type: mimeType }),
      mimeType
    };
  }

  /**
   * MIMEタイプから拡張子を取得
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/wav': 'wav',
      'audio/ogg': 'ogg',
      'audio/webm': 'webm'
    };
    return mimeToExt[mimeType] || 'bin';
  }

  /**
   * 単一ファイルをアップロード（リトライ付き）
   */
  async uploadFile(
    dataUrl: string,
    gameId: string,
    assetType: 'background' | 'object' | 'bgm' | 'se' | 'frame',
    assetId: string,
    frameIndex?: number
  ): Promise<StorageUploadResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delayMs = Math.min(
            RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt - 1),
            RETRY_CONFIG.maxDelayMs
          );
          await sleep(delayMs);
        }

        const { blob, mimeType } = this.dataUrlToBlob(dataUrl);
        const ext = this.getExtensionFromMimeType(mimeType);

        // パスを構築: game-assets/{gameId}/{assetType}/{assetId}[_frame{N}].{ext}
        let fileName = assetId;
        if (frameIndex !== undefined) {
          fileName = `${assetId}_frame${frameIndex}`;
        }
        const storagePath = `${gameId}/${assetType}/${fileName}.${ext}`;

        const { error } = await this.supabase.storage
          .from(BUCKETS.GAME_ASSETS)
          .upload(storagePath, blob, {
            cacheControl: '31536000', // 1年キャッシュ
            upsert: true,
            contentType: mimeType
          });

        if (error) {
          throw new Error(`Storage upload error: ${error.message}`);
        }

        // 公開URLを取得
        const { data: urlData } = this.supabase.storage
          .from(BUCKETS.GAME_ASSETS)
          .getPublicUrl(storagePath);

        return {
          success: true,
          url: urlData.publicUrl,
          path: storagePath
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === RETRY_CONFIG.maxRetries) {
          break;
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Unknown error'
    };
  }

  /**
   * ゲームプロジェクトの全アセットをアップロード
   */
  async uploadGameAssets(
    project: any,
    gameId: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<BatchUploadResult> {
    const results = new Map<string, StorageUploadResult>();
    let uploadedCount = 0;
    let failedCount = 0;
    let totalSize = 0;

    // アップロード対象を収集
    const uploadTasks: Array<{
      id: string;
      dataUrl: string;
      type: 'background' | 'object' | 'bgm' | 'se' | 'frame';
      assetId: string;
      frameIndex?: number;
    }> = [];

    // 背景画像
    if (project.assets?.background) {
      const bg = project.assets.background;
      if (bg.frames && Array.isArray(bg.frames)) {
        bg.frames.forEach((frame: any, idx: number) => {
          if (frame.dataUrl && !frame.dataUrl.startsWith('http')) {
            uploadTasks.push({
              id: `bg_frame_${idx}`,
              dataUrl: frame.dataUrl,
              type: 'frame',
              assetId: `background`,
              frameIndex: idx
            });
          }
        });
      } else if (bg.dataUrl && !bg.dataUrl.startsWith('http')) {
        uploadTasks.push({
          id: 'background',
          dataUrl: bg.dataUrl,
          type: 'background',
          assetId: 'background'
        });
      }
    }

    // オブジェクト画像
    if (project.assets?.objects && Array.isArray(project.assets.objects)) {
      project.assets.objects.forEach((obj: any, objIdx: number) => {
        const objId = obj.id || `object_${objIdx}`;

        if (obj.frames && Array.isArray(obj.frames)) {
          obj.frames.forEach((frame: any, frameIdx: number) => {
            if (frame.dataUrl && !frame.dataUrl.startsWith('http')) {
              uploadTasks.push({
                id: `${objId}_frame_${frameIdx}`,
                dataUrl: frame.dataUrl,
                type: 'frame',
                assetId: objId,
                frameIndex: frameIdx
              });
            }
          });
        } else if (obj.dataUrl && !obj.dataUrl.startsWith('http')) {
          uploadTasks.push({
            id: objId,
            dataUrl: obj.dataUrl,
            type: 'object',
            assetId: objId
          });
        }
      });
    }

    // BGM
    if (project.assets?.audio?.bgm?.dataUrl &&
        !project.assets.audio.bgm.dataUrl.startsWith('http')) {
      uploadTasks.push({
        id: 'bgm',
        dataUrl: project.assets.audio.bgm.dataUrl,
        type: 'bgm',
        assetId: 'bgm'
      });
    }

    // SE
    if (project.assets?.audio?.se && Array.isArray(project.assets.audio.se)) {
      project.assets.audio.se.forEach((se: any, idx: number) => {
        if (se.dataUrl && !se.dataUrl.startsWith('http')) {
          uploadTasks.push({
            id: se.id || `se_${idx}`,
            dataUrl: se.dataUrl,
            type: 'se',
            assetId: se.id || `se_${idx}`
          });
        }
      });
    }

    console.log(`   📤 アップロード対象: ${uploadTasks.length}件`);

    // 順次アップロード（並列だと負荷が高すぎる場合がある）
    for (let i = 0; i < uploadTasks.length; i++) {
      const task = uploadTasks[i];

      if (onProgress) {
        onProgress(i + 1, uploadTasks.length);
      }

      const result = await this.uploadFile(
        task.dataUrl,
        gameId,
        task.type,
        task.assetId,
        task.frameIndex
      );

      results.set(task.id, result);

      if (result.success) {
        uploadedCount++;
        // dataUrlのサイズを概算（Base64は元データの約1.33倍）
        totalSize += Math.floor(task.dataUrl.length * 0.75);
      } else {
        failedCount++;
        console.warn(`   ⚠️ アップロード失敗: ${task.id} - ${result.error}`);
      }
    }

    return {
      success: failedCount === 0,
      uploadedCount,
      failedCount,
      results,
      totalSize
    };
  }

  /**
   * プロジェクトのdataUrlをstorageUrlに置換
   */
  replaceDataUrlsWithStorageUrls(
    project: any,
    uploadResults: Map<string, StorageUploadResult>
  ): any {
    const updated = JSON.parse(JSON.stringify(project));

    // 背景
    if (updated.assets?.background) {
      const bg = updated.assets.background;
      if (bg.frames && Array.isArray(bg.frames)) {
        bg.frames = bg.frames.map((frame: any, idx: number) => {
          const result = uploadResults.get(`bg_frame_${idx}`);
          if (result?.success && result.url) {
            return {
              ...frame,
              dataUrl: '', // 元データを削除
              storageUrl: result.url
            };
          }
          return frame;
        });
      } else {
        const result = uploadResults.get('background');
        if (result?.success && result.url) {
          bg.dataUrl = '';
          bg.storageUrl = result.url;
        }
      }
    }

    // オブジェクト
    if (updated.assets?.objects && Array.isArray(updated.assets.objects)) {
      updated.assets.objects = updated.assets.objects.map((obj: any, objIdx: number) => {
        const objId = obj.id || `object_${objIdx}`;

        if (obj.frames && Array.isArray(obj.frames)) {
          obj.frames = obj.frames.map((frame: any, frameIdx: number) => {
            const result = uploadResults.get(`${objId}_frame_${frameIdx}`);
            if (result?.success && result.url) {
              return {
                ...frame,
                dataUrl: '',
                storageUrl: result.url
              };
            }
            return frame;
          });
        } else {
          const result = uploadResults.get(objId);
          if (result?.success && result.url) {
            obj.dataUrl = '';
            obj.storageUrl = result.url;
          }
        }

        return obj;
      });
    }

    // BGM
    if (updated.assets?.audio?.bgm) {
      const result = uploadResults.get('bgm');
      if (result?.success && result.url) {
        updated.assets.audio.bgm.dataUrl = '';
        updated.assets.audio.bgm.storageUrl = result.url;
      }
    }

    // SE
    if (updated.assets?.audio?.se && Array.isArray(updated.assets.audio.se)) {
      updated.assets.audio.se = updated.assets.audio.se.map((se: any, idx: number) => {
        const seId = se.id || `se_${idx}`;
        const result = uploadResults.get(seId);
        if (result?.success && result.url) {
          return {
            ...se,
            dataUrl: '',
            storageUrl: result.url
          };
        }
        return se;
      });
    }

    return updated;
  }

  /**
   * ゲームアセットを削除（ゲーム削除時）
   */
  async deleteGameAssets(gameId: string): Promise<boolean> {
    try {
      // ゲームID配下のすべてのファイルをリスト
      const { data: files, error: listError } = await this.supabase.storage
        .from(BUCKETS.GAME_ASSETS)
        .list(gameId, {
          limit: 1000
        });

      if (listError) {
        console.error('List files error:', listError);
        return false;
      }

      if (!files || files.length === 0) {
        return true;
      }

      // サブフォルダ内のファイルも削除
      const allPaths: string[] = [];

      for (const item of files) {
        if (item.metadata === null) {
          // フォルダの場合、中のファイルをリスト
          const { data: subFiles } = await this.supabase.storage
            .from(BUCKETS.GAME_ASSETS)
            .list(`${gameId}/${item.name}`);

          if (subFiles) {
            subFiles.forEach(f => {
              allPaths.push(`${gameId}/${item.name}/${f.name}`);
            });
          }
        } else {
          allPaths.push(`${gameId}/${item.name}`);
        }
      }

      if (allPaths.length === 0) {
        return true;
      }

      // ファイルを削除
      const { error: deleteError } = await this.supabase.storage
        .from(BUCKETS.GAME_ASSETS)
        .remove(allPaths);

      if (deleteError) {
        console.error('Delete files error:', deleteError);
        return false;
      }

      return true;

    } catch (error) {
      console.error('Delete game assets error:', error);
      return false;
    }
  }

  /**
   * ストレージのヘルスチェック
   */
  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.storage
        .from(BUCKETS.GAME_ASSETS)
        .list('', { limit: 1 });

      if (error) {
        return { healthy: false, error: error.message };
      }

      return { healthy: true };

    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
