/**
 * Asset URL Resolver
 * Storage URL と dataUrl の両方をサポートするユーティリティ
 *
 * 優先順位:
 * 1. storageUrl（存在する場合）- Supabase Storageからロード
 * 2. dataUrl（存在する場合）- Base64データを直接使用
 */

import { AssetFrame, AudioAsset } from '../types/editor/ProjectAssets';

/**
 * アセットフレームから表示用URLを取得
 * storageUrlがあればそれを使用、なければdataUrlを使用
 */
export function getAssetFrameUrl(frame: AssetFrame | undefined | null): string | null {
  if (!frame) return null;

  // storageUrlが存在し、有効な場合は優先
  if (frame.storageUrl && frame.storageUrl.startsWith('http')) {
    return frame.storageUrl;
  }

  // dataUrlが存在する場合
  if (frame.dataUrl && frame.dataUrl.length > 0) {
    return frame.dataUrl;
  }

  return null;
}

/**
 * 音声アセットから再生用URLを取得
 */
export function getAudioAssetUrl(audio: AudioAsset | undefined | null): string | null {
  if (!audio) return null;

  // storageUrlが存在し、有効な場合は優先
  if (audio.storageUrl && audio.storageUrl.startsWith('http')) {
    return audio.storageUrl;
  }

  // dataUrlが存在する場合
  if (audio.dataUrl && audio.dataUrl.length > 0) {
    return audio.dataUrl;
  }

  return null;
}

/**
 * 背景アセットから表示用URLを取得（複数フレーム対応）
 */
export function getBackgroundUrl(
  background: {
    frames?: AssetFrame[];
    dataUrl?: string;
    storageUrl?: string;
  } | undefined | null,
  frameIndex: number = 0
): string | null {
  if (!background) return null;

  // フレームベースの場合
  if (background.frames && background.frames.length > 0) {
    const frame = background.frames[frameIndex] || background.frames[0];
    return getAssetFrameUrl(frame);
  }

  // 旧形式（直接dataUrl/storageUrl）
  if (background.storageUrl && background.storageUrl.startsWith('http')) {
    return background.storageUrl;
  }

  if (background.dataUrl && background.dataUrl.length > 0) {
    return background.dataUrl;
  }

  return null;
}

/**
 * オブジェクトアセットから表示用URLを取得（複数フレーム対応）
 */
export function getObjectUrl(
  obj: {
    frames?: AssetFrame[];
    dataUrl?: string;
    storageUrl?: string;
  } | undefined | null,
  frameIndex: number = 0
): string | null {
  if (!obj) return null;

  // フレームベースの場合
  if (obj.frames && obj.frames.length > 0) {
    const frame = obj.frames[frameIndex] || obj.frames[0];
    return getAssetFrameUrl(frame);
  }

  // 旧形式（直接dataUrl/storageUrl）
  if (obj.storageUrl && obj.storageUrl.startsWith('http')) {
    return obj.storageUrl;
  }

  if (obj.dataUrl && obj.dataUrl.length > 0) {
    return obj.dataUrl;
  }

  return null;
}

/**
 * 全てのアセットURLをプリロード（ゲーム開始前に呼び出し）
 */
export async function preloadAssetUrls(
  assets: {
    background?: {
      frames?: AssetFrame[];
      dataUrl?: string;
      storageUrl?: string;
    } | null;
    objects?: Array<{
      frames?: AssetFrame[];
      dataUrl?: string;
      storageUrl?: string;
    }>;
    audio?: {
      bgm?: AudioAsset | null;
      se?: AudioAsset[];
    };
  }
): Promise<{
  images: Map<string, HTMLImageElement>;
  audio: Map<string, HTMLAudioElement>;
  errors: string[];
}> {
  const images = new Map<string, HTMLImageElement>();
  const audio = new Map<string, HTMLAudioElement>();
  const errors: string[] = [];
  const loadPromises: Promise<void>[] = [];

  // 背景画像のプリロード
  if (assets.background) {
    const bgUrl = getBackgroundUrl(assets.background);
    if (bgUrl) {
      loadPromises.push(
        loadImage(bgUrl, 'background')
          .then(img => { images.set('background', img); })
          .catch(err => { errors.push(`Background: ${err.message}`); })
      );
    }
  }

  // オブジェクト画像のプリロード
  if (assets.objects) {
    assets.objects.forEach((obj, idx) => {
      const objUrl = getObjectUrl(obj);
      if (objUrl) {
        const id = `object_${idx}`;
        loadPromises.push(
          loadImage(objUrl, id)
            .then(img => { images.set(id, img); })
            .catch(err => { errors.push(`${id}: ${err.message}`); })
        );
      }
    });
  }

  // BGMのプリロード
  if (assets.audio?.bgm) {
    const bgmUrl = getAudioAssetUrl(assets.audio.bgm);
    if (bgmUrl) {
      loadPromises.push(
        loadAudio(bgmUrl, 'bgm')
          .then(aud => { audio.set('bgm', aud); })
          .catch(err => { errors.push(`BGM: ${err.message}`); })
      );
    }
  }

  // SEのプリロード
  if (assets.audio?.se) {
    assets.audio.se.forEach((se, idx) => {
      const seUrl = getAudioAssetUrl(se);
      if (seUrl) {
        const id = se.id || `se_${idx}`;
        loadPromises.push(
          loadAudio(seUrl, id)
            .then(aud => { audio.set(id, aud); })
            .catch(err => { errors.push(`${id}: ${err.message}`); })
        );
      }
    });
  }

  await Promise.all(loadPromises);

  return { images, audio, errors };
}

/**
 * 画像をロード
 */
function loadImage(url: string, id: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // CORS対応

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${id}`));

    img.src = url;
  });
}

/**
 * 音声をロード
 */
function loadAudio(url: string, id: string): Promise<HTMLAudioElement> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous'; // CORS対応

    audio.oncanplaythrough = () => resolve(audio);
    audio.onerror = () => reject(new Error(`Failed to load audio: ${id}`));

    audio.src = url;
    audio.load();
  });
}

/**
 * アセットにStorage URLが含まれているかチェック
 */
export function hasStorageUrls(
  assets: {
    background?: { frames?: AssetFrame[]; storageUrl?: string } | null;
    objects?: Array<{ frames?: AssetFrame[]; storageUrl?: string }>;
    audio?: {
      bgm?: AudioAsset | null;
      se?: AudioAsset[];
    };
  }
): boolean {
  // 背景
  if (assets.background) {
    if (assets.background.storageUrl) return true;
    if (assets.background.frames?.some(f => f.storageUrl)) return true;
  }

  // オブジェクト
  if (assets.objects?.some(obj => {
    if (obj.storageUrl) return true;
    return obj.frames?.some(f => f.storageUrl);
  })) return true;

  // BGM
  if (assets.audio?.bgm?.storageUrl) return true;

  // SE
  if (assets.audio?.se?.some(se => se.storageUrl)) return true;

  return false;
}
