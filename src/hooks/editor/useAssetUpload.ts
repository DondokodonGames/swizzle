// src/hooks/editor/useAssetUpload.ts
// 🔧 Phase E-1: AssetsTab共通ロジック抽出 - アップロード処理統合
import { useState, useCallback } from 'react';
import { GameProject } from '../../types/editor/GameProject';
import { ProjectAssets, AssetFrame, AudioAsset, ObjectAsset } from '../../types/editor/ProjectAssets';
import { EDITOR_LIMITS } from '../../constants/EditorLimits';
import { createDefaultInitialState, syncInitialStateWithLayout } from '../../types/editor/GameScript';
import { FileProcessingResult } from '../../components/ui/DragDropZone';

// アップロード結果型定義
export interface UploadResult {
  success: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
  addedCount?: number;
}

// アップロード設定型定義
export interface UploadOptions {
  type: 'background' | 'objects' | 'bgm' | 'se';
  maxFiles?: number;
  maxSize?: number;
  optimizeImages?: boolean;
}

// 音声情報取得関数
const getAudioInfo = (file: File): Promise<{
  duration: number;
  format: string;
}> => {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    
    audio.addEventListener('loadedmetadata', () => {
      resolve({
        duration: audio.duration,
        format: file.type.split('/')[1] || 'unknown'
      });
      URL.revokeObjectURL(url);
    });
    
    audio.addEventListener('error', () => {
      reject(new Error('音声ファイルの読み込みに失敗しました'));
      URL.revokeObjectURL(url);
    });
    
    audio.src = url;
  });
};

// 画像最適化関数
const optimizeImage = async (file: File, maxWidth: number, maxHeight: number, quality: number = 0.8): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      // アスペクト比を保持してリサイズ
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // 画像を描画
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      // Blobとして出力
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas to blob conversion failed'));
        }
      }, 'image/webp', quality);
    };
    
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = URL.createObjectURL(file);
  });
};

// useAssetUpload Hook
export const useAssetUpload = (
  project: GameProject,
  onProjectUpdate: (project: GameProject) => void
) => {
  const [uploading, setUploading] = useState(false);

  // プロジェクト更新ヘルパー（script・layout同期機能付き）
  const updateProjectWithSync = useCallback((updates: Partial<GameProject>) => {
    const updatedProject = { ...project, ...updates };
    
    // 初期条件の確保・同期
    if (updates.assets && !updatedProject.script.initialState) {
      console.log('🔧 初期条件なし→デフォルト作成・同期');
      updatedProject.script.initialState = createDefaultInitialState();
      updatedProject.script.initialState = syncInitialStateWithLayout(
        updatedProject.script.initialState, 
        updatedProject.script.layout
      );
    }
    
    onProjectUpdate(updatedProject);
  }, [project, onProjectUpdate]);

  // 統計更新ヘルパー
  const updateAssetStatistics = useCallback((assets: ProjectAssets): ProjectAssets => {
    const imageSize = assets.objects.reduce((sum, obj) => sum + obj.totalSize, 0) + 
                     (assets.background?.totalSize || 0);
    const audioSize = (assets.audio.bgm?.fileSize || 0) + 
                     assets.audio.se.reduce((sum, se) => sum + se.fileSize, 0);

    return {
      ...assets,
      statistics: {
        totalImageSize: imageSize,
        totalAudioSize: audioSize,
        totalSize: imageSize + audioSize,
        usedSlots: {
          background: assets.background ? 1 : 0,
          objects: assets.objects.length,
          texts: assets.texts.length,
          bgm: assets.audio.bgm ? 1 : 0,
          se: assets.audio.se.length
        },
        limitations: {
          isNearImageLimit: imageSize > EDITOR_LIMITS.IMAGE.BACKGROUND_TOTAL_MAX_SIZE * 0.8,
          isNearAudioLimit: audioSize > (EDITOR_LIMITS.AUDIO.BGM_MAX_SIZE + EDITOR_LIMITS.AUDIO.SE_MAX_SIZE * EDITOR_LIMITS.PROJECT.MAX_SE_COUNT) * 0.8,
          isNearTotalLimit: (imageSize + audioSize) > EDITOR_LIMITS.PROJECT.TOTAL_MAX_SIZE * 0.8,
          hasViolations: false
        }
      },
      lastModified: new Date().toISOString()
    };
  }, []);

  // 画像ファイルアップロード（背景・オブジェクト対応）
  const uploadImageFiles = useCallback(async (
    results: FileProcessingResult[],
    options: UploadOptions
  ): Promise<UploadResult> => {
    if (uploading) {
      return { success: false, message: 'アップロード中です', type: 'error' };
    }

    setUploading(true);
    
    try {
      const now = new Date().toISOString();
      const updatedAssets = { ...project.assets };
      const updatedScript = { ...project.script };
      let addedCount = 0;

      for (const result of results) {
        if (!result.accepted) {
          continue;
        }

        if (result.type !== 'image') {
          continue;
        }

        // サイズチェック
        const maxSize = options.type === 'background' 
          ? EDITOR_LIMITS.IMAGE.BACKGROUND_FRAME_MAX_SIZE
          : EDITOR_LIMITS.IMAGE.OBJECT_FRAME_MAX_SIZE;

        if (result.file.size > maxSize) {
          continue;
        }

        // 画像最適化
        const optimized = options.optimizeImages ? await optimizeImage(
          result.file, 
          options.type === 'background' ? 1080 : 512, 
          options.type === 'background' ? 1920 : 512,
          0.8
        ) : null;

        // Base64変換
        const reader = new FileReader();
        
        await new Promise<void>((resolve, reject) => {
          reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            
            // アセットフレーム作成
            const frame: AssetFrame = {
              id: crypto.randomUUID(),
              dataUrl,
              originalName: result.file.name,
              width: options.type === 'background' ? 1080 : 512,
              height: options.type === 'background' ? 1920 : 512,
              fileSize: optimized?.size || result.file.size,
              uploadedAt: now
            };

            // プロジェクト更新
            if (options.type === 'background') {
              // 背景アセット作成
              updatedAssets.background = {
                id: crypto.randomUUID(),
                name: 'Background',
                frames: [frame],
                animationSettings: { speed: 10, loop: true, pingPong: false, autoStart: true },
                totalSize: frame.fileSize,
                createdAt: now,
                lastModified: now
              };
              
              // layout.background.visible を true に設定
              updatedScript.layout.background = {
                ...updatedScript.layout.background,
                visible: true,
                animationSpeed: 10,
                autoStart: false,
                initialAnimation: 0
              };
              
              // 初期条件の背景状態も更新
              if (!updatedScript.initialState) {
                updatedScript.initialState = createDefaultInitialState();
              }
              updatedScript.initialState.layout.background = {
                visible: true,
                frameIndex: 0,
                animationSpeed: 10,
                autoStart: false
              };
              
              console.log('✅ 背景追加: layout.background.visible = true 設定完了');
              addedCount++;
              
            } else if (options.type === 'objects') {
              // オブジェクト数制限チェック
              if (updatedAssets.objects.length >= EDITOR_LIMITS.PROJECT.MAX_OBJECTS) {
                resolve();
                return;
              }

              const newObject: ObjectAsset = {
                id: crypto.randomUUID(),
                name: `オブジェクト${updatedAssets.objects.length + 1}`,
                frames: [frame],
                animationSettings: { speed: 10, loop: true, pingPong: false, autoStart: true },
                totalSize: frame.fileSize,
                createdAt: now,
                lastModified: now,
                defaultScale: 1.0,
                defaultOpacity: 1.0
              };
              updatedAssets.objects.push(newObject);
              addedCount++;
            }

            resolve();
          };

          reader.onerror = reject;
          reader.readAsDataURL(optimized || result.file);
        });
      }

      // 統計更新・プロジェクト保存
      if (addedCount > 0) {
        const finalAssets = updateAssetStatistics(updatedAssets);
        updatedScript.lastModified = now;

        updateProjectWithSync({
          assets: finalAssets,
          script: updatedScript,
          totalSize: finalAssets.statistics.totalSize,
          lastModified: now
        });

        return {
          success: true,
          message: `${addedCount}個のファイルをアップロードしました`,
          type: 'success',
          addedCount
        };
      } else {
        return {
          success: false,
          message: 'アップロード可能なファイルがありませんでした',
          type: 'error'
        };
      }
    } catch (error) {
      console.error('画像アップロードエラー:', error);
      return {
        success: false,
        message: 'ファイルのアップロードに失敗しました',
        type: 'error'
      };
    } finally {
      setUploading(false);
    }
  }, [project, updateProjectWithSync, updateAssetStatistics, uploading]);

  // 音声ファイルアップロード（BGM・SE対応）
  const uploadAudioFile = useCallback(async (
    file: File,
    type: 'bgm' | 'se'
  ): Promise<UploadResult> => {
    if (uploading) {
      return { success: false, message: 'アップロード中です', type: 'error' };
    }

    setUploading(true);

    try {
      if (!file || !file.type.startsWith('audio/')) {
        return { success: false, message: '音声ファイルを選択してください', type: 'error' };
      }
      
      // 音声情報取得
      const audioInfo = await getAudioInfo(file);
      
      // 時間制限チェック
      const maxDuration = type === 'bgm' ? EDITOR_LIMITS.AUDIO.BGM_MAX_DURATION : EDITOR_LIMITS.AUDIO.SE_MAX_DURATION;
      if (audioInfo.duration > maxDuration) {
        return { 
          success: false, 
          message: `音声が長すぎます。最大${maxDuration}秒までです。`, 
          type: 'error' 
        };
      }

      // 容量制限チェック
      if (type === 'se' && (project.assets.audio?.se?.length || 0) >= EDITOR_LIMITS.PROJECT.MAX_SE_COUNT) {
        return { 
          success: false, 
          message: `効果音は最大${EDITOR_LIMITS.PROJECT.MAX_SE_COUNT}個まで追加できます`, 
          type: 'error' 
        };
      }

      // Base64変換
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const now = new Date().toISOString();
      const newAudioAsset: AudioAsset = {
        id: crypto.randomUUID(),
        name: file.name.replace(/\.[^/.]+$/, ''), // 拡張子除去
        dataUrl,
        originalName: file.name,
        duration: audioInfo.duration,
        fileSize: file.size,
        format: audioInfo.format,
        volume: 0.8,
        loop: type === 'bgm',
        uploadedAt: now
      };

      // プロジェクト更新
      const updatedAssets = { ...project.assets };
      
      if (type === 'bgm') {
        updatedAssets.audio.bgm = newAudioAsset;
      } else {
        updatedAssets.audio.se.push(newAudioAsset);
      }

      const finalAssets = updateAssetStatistics(updatedAssets);

      updateProjectWithSync({
        assets: finalAssets,
        totalSize: finalAssets.statistics.totalSize,
        lastModified: now
      });

      return {
        success: true,
        message: `${type === 'bgm' ? 'BGM' : '効果音'}をアップロードしました`,
        type: 'success',
        addedCount: 1
      };
    } catch (error) {
      console.error('音声アップロードエラー:', error);
      return {
        success: false,
        message: '音声ファイルのアップロードに失敗しました',
        type: 'error'
      };
    } finally {
      setUploading(false);
    }
  }, [project, updateProjectWithSync, updateAssetStatistics, uploading]);

  // アセット削除（layout同期対応）
  const deleteAsset = useCallback((
    type: 'background' | 'objects' | 'bgm' | 'se',
    id?: string
  ): UploadResult => {
    const updatedAssets = { ...project.assets };
    const updatedScript = { ...project.script };
    let removedSize = 0;
    const now = new Date().toISOString();

    if (type === 'background') {
      if (updatedAssets.background) {
        removedSize = updatedAssets.background.totalSize;
        updatedAssets.background = null;
        
        // layout.background.visible も false に設定
        updatedScript.layout.background = {
          ...updatedScript.layout.background,
          visible: false
        };
        
        // 初期条件の背景状態も更新
        if (updatedScript.initialState) {
          updatedScript.initialState.layout.background.visible = false;
        }
        
        console.log('🗑️ 背景削除: layout.background.visible = false 設定完了');
      }
    } else if (type === 'objects' && id) {
      const index = updatedAssets.objects.findIndex(obj => obj.id === id);
      if (index >= 0) {
        removedSize = updatedAssets.objects[index].totalSize;
        updatedAssets.objects.splice(index, 1);
        
        // レイアウトからも削除
        updatedScript.layout.objects = updatedScript.layout.objects.filter(obj => obj.objectId !== id);
        
        // 初期条件からも削除
        if (updatedScript.initialState) {
          updatedScript.initialState.layout.objects = updatedScript.initialState.layout.objects.filter(obj => obj.id !== id);
        }
        
        console.log('🗑️ オブジェクト削除: layoutからも削除完了');
      }
    } else if (type === 'bgm') {
      if (updatedAssets.audio.bgm) {
        removedSize = updatedAssets.audio.bgm.fileSize;
        updatedAssets.audio.bgm = null;
      }
    } else if (type === 'se' && id) {
      const index = updatedAssets.audio.se.findIndex(se => se.id === id);
      if (index >= 0) {
        removedSize = updatedAssets.audio.se[index].fileSize;
        updatedAssets.audio.se.splice(index, 1);
      }
    }

    const finalAssets = updateAssetStatistics(updatedAssets);
    updatedScript.lastModified = now;

    updateProjectWithSync({
      assets: finalAssets,
      script: updatedScript,
      totalSize: project.totalSize - removedSize,
      lastModified: now
    });

    return {
      success: true,
      message: 'アセットを削除しました',
      type: 'success'
    };
  }, [project, updateProjectWithSync, updateAssetStatistics]);

  // アセットプロパティ更新
  const updateAssetProperty = useCallback((
    type: 'bgm' | 'se',
    id: string,
    property: string,
    value: any
  ): UploadResult => {
    const updatedAssets = { ...project.assets };
    const now = new Date().toISOString();
    
    if (type === 'bgm' && updatedAssets.audio.bgm?.id === id) {
      updatedAssets.audio.bgm = {
        ...updatedAssets.audio.bgm,
        [property]: value
      };
    } else if (type === 'se') {
      const index = updatedAssets.audio.se.findIndex(se => se.id === id);
      if (index >= 0) {
        updatedAssets.audio.se[index] = {
          ...updatedAssets.audio.se[index],
          [property]: value
        };
      }
    }

    updatedAssets.lastModified = now;

    updateProjectWithSync({
      assets: updatedAssets,
      lastModified: now
    });

    return {
      success: true,
      message: 'プロパティを更新しました',
      type: 'success'
    };
  }, [project, updateProjectWithSync]);

  return {
    uploading,
    uploadImageFiles,
    uploadAudioFile,
    deleteAsset,
    updateAssetProperty
  };
};