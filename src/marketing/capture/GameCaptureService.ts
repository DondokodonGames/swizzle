/**
 * GameCaptureService
 * ゲームのスクリーンショット・動画キャプチャを行うサービス
 *
 * - Pixi.jsキャンバスからスクリーンショット撮影
 * - MediaRecorder APIを使用した動画キャプチャ
 * - Supabase Storageへのアップロード
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface CaptureResult {
  success: boolean;
  type: 'screenshot' | 'video';
  url?: string;
  blob?: Blob;
  base64?: string;
  duration?: number;
  error?: string;
}

export interface CaptureOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'png' | 'jpeg' | 'webp';
}

export interface VideoOptions {
  duration: number;       // 撮影時間（ミリ秒）
  fps?: number;           // フレームレート
  bitrate?: number;       // ビットレート
  format?: 'webm' | 'mp4';
}

/**
 * ゲームキャプチャサービス
 */
export class GameCaptureService {
  private static instance: GameCaptureService;
  private supabase: SupabaseClient | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isRecording: boolean = false;

  private constructor() {
    // ブラウザ環境の場合のみSupabase初期化
    if (typeof window !== 'undefined') {
      const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
      }
    }
  }

  static getInstance(): GameCaptureService {
    if (!GameCaptureService.instance) {
      GameCaptureService.instance = new GameCaptureService();
    }
    return GameCaptureService.instance;
  }

  /**
   * キャンバスからスクリーンショットを撮影
   */
  async captureScreenshot(
    canvas: HTMLCanvasElement,
    options: CaptureOptions = {}
  ): Promise<CaptureResult> {
    try {
      const {
        width = canvas.width,
        height = canvas.height,
        quality = 0.92,
        format = 'png'
      } = options;

      // 必要に応じてリサイズ
      let targetCanvas = canvas;
      if (width !== canvas.width || height !== canvas.height) {
        targetCanvas = document.createElement('canvas');
        targetCanvas.width = width;
        targetCanvas.height = height;
        const ctx = targetCanvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get 2D context');
        }
        ctx.drawImage(canvas, 0, 0, width, height);
      }

      // キャンバスをBlobに変換
      const blob = await new Promise<Blob>((resolve, reject) => {
        targetCanvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob from canvas'));
            }
          },
          `image/${format}`,
          quality
        );
      });

      // Base64にも変換
      const base64 = targetCanvas.toDataURL(`image/${format}`, quality);

      console.log(`📸 スクリーンショット撮影成功: ${(blob.size / 1024).toFixed(1)}KB`);

      return {
        success: true,
        type: 'screenshot',
        blob,
        base64,
      };
    } catch (error) {
      console.error('❌ スクリーンショット撮影失敗:', error);
      return {
        success: false,
        type: 'screenshot',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * キャンバスから動画を録画
   */
  async startVideoRecording(
    canvas: HTMLCanvasElement,
    options: VideoOptions
  ): Promise<void> {
    if (this.isRecording) {
      console.warn('⚠️ 既に録画中です');
      return;
    }

    const {
      fps = 30,
      bitrate = 2500000, // 2.5 Mbps
    } = options;

    try {
      // キャンバスからストリームを取得
      const stream = canvas.captureStream(fps);

      // MediaRecorderの設定
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: bitrate,
      });

      this.recordedChunks = [];
      this.isRecording = true;

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100); // 100msごとにデータを収集
      console.log('🎬 動画録画開始');

    } catch (error) {
      console.error('❌ 動画録画開始失敗:', error);
      this.isRecording = false;
      throw error;
    }
  }

  /**
   * 動画録画を停止してBlobを取得
   */
  async stopVideoRecording(): Promise<CaptureResult> {
    if (!this.isRecording || !this.mediaRecorder) {
      return {
        success: false,
        type: 'video',
        error: '録画中ではありません',
      };
    }

    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        this.isRecording = false;
        this.recordedChunks = [];

        console.log(`🎬 動画録画完了: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);

        resolve({
          success: true,
          type: 'video',
          blob,
        });
      };

      this.mediaRecorder!.stop();
    });
  }

  /**
   * 指定時間だけ録画してBlobを返す
   */
  async captureVideo(
    canvas: HTMLCanvasElement,
    options: VideoOptions
  ): Promise<CaptureResult> {
    const { duration } = options;

    try {
      await this.startVideoRecording(canvas, options);

      // 指定時間待機
      await new Promise((resolve) => setTimeout(resolve, duration));

      return await this.stopVideoRecording();

    } catch (error) {
      this.isRecording = false;
      return {
        success: false,
        type: 'video',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * キャプチャをSupabase Storageにアップロード
   */
  async uploadCapture(
    gameId: string,
    captureResult: CaptureResult,
    folder: 'screenshots' | 'videos' = 'screenshots'
  ): Promise<string | null> {
    if (!this.supabase) {
      console.error('❌ Supabaseが初期化されていません');
      return null;
    }

    if (!captureResult.success || !captureResult.blob) {
      console.error('❌ キャプチャ結果が無効です');
      return null;
    }

    try {
      const extension = captureResult.type === 'screenshot' ? 'png' : 'webm';
      const timestamp = Date.now();
      const filePath = `game-captures/${folder}/${gameId}/${timestamp}.${extension}`;

      const { data: _data, error } = await this.supabase.storage
        .from('assets')
        .upload(filePath, captureResult.blob, {
          contentType: captureResult.type === 'screenshot' ? 'image/png' : 'video/webm',
          cacheControl: '3600',
        });

      if (error) {
        throw error;
      }

      // 公開URLを取得
      const { data: urlData } = this.supabase.storage
        .from('assets')
        .getPublicUrl(filePath);

      console.log(`☁️ アップロード成功: ${urlData.publicUrl}`);

      return urlData.publicUrl;

    } catch (error) {
      console.error('❌ アップロード失敗:', error);
      return null;
    }
  }

  /**
   * ゲームプレイをキャプチャ（スクリーンショット + 動画）
   */
  async captureGameplay(
    canvas: HTMLCanvasElement,
    gameId: string,
    options: {
      screenshot?: boolean;
      video?: boolean;
      videoDuration?: number;
    } = {}
  ): Promise<{
    screenshot?: CaptureResult;
    video?: CaptureResult;
    screenshotUrl?: string;
    videoUrl?: string;
  }> {
    const {
      screenshot = true,
      video = true,
      videoDuration = 15000, // デフォルト15秒
    } = options;

    const results: {
      screenshot?: CaptureResult;
      video?: CaptureResult;
      screenshotUrl?: string;
      videoUrl?: string;
    } = {};

    // スクリーンショット撮影
    if (screenshot) {
      results.screenshot = await this.captureScreenshot(canvas, {
        width: 1080,
        height: 1920,
        quality: 0.95,
        format: 'png',
      });

      if (results.screenshot.success) {
        results.screenshotUrl = await this.uploadCapture(
          gameId,
          results.screenshot,
          'screenshots'
        ) || undefined;
      }
    }

    // 動画録画
    if (video) {
      results.video = await this.captureVideo(canvas, {
        duration: videoDuration,
        fps: 30,
        bitrate: 2500000,
      });

      if (results.video.success) {
        results.videoUrl = await this.uploadCapture(
          gameId,
          results.video,
          'videos'
        ) || undefined;
      }
    }

    return results;
  }

  /**
   * 録画中かどうか
   */
  get recording(): boolean {
    return this.isRecording;
  }

  /**
   * 録画をキャンセル
   */
  cancelRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.recordedChunks = [];
      console.log('⏹️ 録画キャンセル');
    }
  }
}

export default GameCaptureService;
