// src/components/editor/tabs/assets/sections/ObjectSection.tsx
// 🔧 Phase 3-1-9 v2: フレーム切り替えボタンをプレビュー画面左右に配置
import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { GameProject } from '../../../../../types/editor/GameProject';
import { ObjectAsset, AssetFrame, AnimationSettings } from '../../../../../types/editor/ProjectAssets';
import { EDITOR_LIMITS } from '../../../../../constants/EditorLimits';
import { DESIGN_TOKENS } from '../../../../../constants/DesignSystem';
import { ModernButton } from '../../../../ui/ModernButton';
import { ModernCard } from '../../../../ui/ModernCard';
import { DragDropZone, FileProcessingResult } from '../../../../ui/DragDropZone';
import { useAssetUpload } from '../../../../../hooks/editor/useAssetUpload';
import { useNotification } from '../../../../../hooks/editor/useNotification';

interface ObjectSectionProps {
  project: GameProject;
  onProjectUpdate: (project: GameProject) => void;
}

// ファイルサイズを人間が読みやすい形式に変換
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

export const ObjectSection: React.FC<ObjectSectionProps> = ({
  project,
  onProjectUpdate
}) => {
  const { t } = useTranslation();
  const { uploading, deleteAsset } = useAssetUpload(project, onProjectUpdate);
  const { showSuccess, showError } = useNotification();
  
  // アニメーション管理状態
  const [editingObjectId, setEditingObjectId] = useState<string | null>(null);
  const [animationPreviewIndex, setAnimationPreviewIndex] = useState<number>(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);
  
  // 🔄 差し替え用の状態と参照（Phase 3-1-9: フレームインデックス追加）
  const [replacingObjectId, setReplacingObjectId] = useState<string | null>(null);
  const [replacingFrameIndex, setReplacingFrameIndex] = useState<number>(0);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // オブジェクト単独アップロード処理（複数フレーム対応）
  const handleObjectUpload = useCallback(async (results: FileProcessingResult[]) => {
    if (uploading) return;

    try {
      const now = new Date().toISOString();
      const updatedAssets = { ...project.assets };
      let addedCount = 0;

      for (const result of results) {
        if (!result.accepted) {
          showError(result.error || t('errors.fileNotAccepted'));
          continue;
        }

        if (result.type !== 'image') {
          showError(t('errors.onlyImagesAllowed'));
          continue;
        }

        // オブジェクト数制限チェック
        if (updatedAssets.objects.length >= EDITOR_LIMITS.PROJECT.MAX_OBJECTS) {
          showError(t('errors.maxObjectsReached', { max: EDITOR_LIMITS.PROJECT.MAX_OBJECTS }));
          continue;
        }

        // サイズチェック
        if (result.file.size > EDITOR_LIMITS.IMAGE.OBJECT_FRAME_MAX_SIZE) {
          showError(t('errors.fileSizeTooLarge', { fileName: result.file.name }));
          continue;
        }

        // 画像最適化
        const optimized = await optimizeImage(result.file, 512, 512, 0.8);

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
              width: 512,
              height: 512,
              fileSize: optimized?.size || result.file.size,
              uploadedAt: now
            };

            // 新しいオブジェクト作成
            const newObject: ObjectAsset = {
              id: crypto.randomUUID(),
              name: t('editor.assets.objectName', { number: updatedAssets.objects.length + 1 }),
              frames: [frame], // 初期1フレーム
              animationSettings: {
                speed: 10,
                loop: true,
                pingPong: false,
                autoStart: true
              },
              totalSize: frame.fileSize,
              createdAt: now,
              lastModified: now,
              defaultScale: 1.0,
              defaultOpacity: 1.0
            };
            
            updatedAssets.objects.push(newObject);
            addedCount++;
            resolve();
          };

          reader.onerror = reject;
          reader.readAsDataURL(optimized || result.file);
        });
      }

      // 統計更新・プロジェクト保存
      if (addedCount > 0) {
        const imageSize = updatedAssets.objects.reduce((sum, obj) => sum + obj.totalSize, 0) + 
                         (updatedAssets.background?.totalSize || 0);
        const audioSize = (updatedAssets.audio.bgm?.fileSize || 0) + 
                         updatedAssets.audio.se.reduce((sum, se) => sum + se.fileSize, 0);

        updatedAssets.statistics = {
          totalImageSize: imageSize,
          totalAudioSize: audioSize,
          totalSize: imageSize + audioSize,
          usedSlots: {
            background: updatedAssets.background ? 1 : 0,
            objects: updatedAssets.objects.length,
            texts: updatedAssets.texts.length,
            bgm: updatedAssets.audio.bgm ? 1 : 0,
            se: updatedAssets.audio.se.length
          },
          limitations: {
            isNearImageLimit: imageSize > EDITOR_LIMITS.IMAGE.BACKGROUND_TOTAL_MAX_SIZE * 0.8,
            isNearAudioLimit: audioSize > (EDITOR_LIMITS.AUDIO.BGM_MAX_SIZE + EDITOR_LIMITS.AUDIO.SE_MAX_SIZE * EDITOR_LIMITS.PROJECT.MAX_SE_COUNT) * 0.8,
            isNearTotalLimit: (imageSize + audioSize) > EDITOR_LIMITS.PROJECT.TOTAL_MAX_SIZE * 0.8,
            hasViolations: false
          }
        };

        updatedAssets.lastModified = now;

        onProjectUpdate({
          ...project,
          assets: updatedAssets,
          totalSize: imageSize + audioSize,
          lastModified: now
        });

        showSuccess(t('success.objectsUploaded', { count: addedCount }));
      }
    } catch (error) {
      console.error('オブジェクトアップロードエラー:', error);
      showError(t('errors.objectUploadFailed'));
    }
  }, [project, onProjectUpdate, uploading, showSuccess, showError, t]);

  // 🔄 オブジェクト画像差し替え処理（Phase 3-1-9: 選択中フレームのみ差し替え）
  const handleObjectReplace = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !replacingObjectId) return;

    // ファイルタイプチェック
    if (!file.type.startsWith('image/')) {
      showError(t('errors.onlyImagesAllowed'));
      setReplacingObjectId(null);
      return;
    }

    // サイズチェック
    if (file.size > EDITOR_LIMITS.IMAGE.OBJECT_FRAME_MAX_SIZE) {
      showError(t('errors.fileSizeTooLarge', { fileName: file.name }));
      setReplacingObjectId(null);
      return;
    }

    try {
      const now = new Date().toISOString();
      const updatedAssets = { ...project.assets };
      const objectIndex = updatedAssets.objects.findIndex(obj => obj.id === replacingObjectId);

      if (objectIndex === -1) {
        showError(t('errors.objectNotFound'));
        setReplacingObjectId(null);
        return;
      }

      // 画像最適化
      const optimized = await optimizeImage(file, 512, 512, 0.8);

      // Base64変換
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        
        const targetObject = updatedAssets.objects[objectIndex];
        
        // 🎯 選択中フレームのみを差し替え（Phase 3-1-9）
        const targetFrameIndex = replacingFrameIndex;
        const oldSize = targetObject.frames[targetFrameIndex]?.fileSize || 0;
        const newSize = optimized.size;

        // フレーム配列を新しく構築
        const updatedFrames = targetObject.frames.map((frame, index) => {
          if (index === targetFrameIndex) {
            // 選択中フレームのみ差し替え
            return {
              ...frame,
              dataUrl,
              originalName: file.name,
              fileSize: newSize,
              uploadedAt: now
            };
          }
          // 他のフレームはそのまま
          return frame;
        });

        updatedAssets.objects[objectIndex] = {
          ...targetObject,
          frames: updatedFrames,
          totalSize: targetObject.totalSize - oldSize + newSize,
          lastModified: now
        };

        // 統計更新
        const imageSize = updatedAssets.objects.reduce((sum, obj) => sum + obj.totalSize, 0) + 
                         (updatedAssets.background?.totalSize || 0);
        const audioSize = (updatedAssets.audio?.bgm?.fileSize || 0) + 
                         (updatedAssets.audio?.se?.reduce((sum, se) => sum + se.fileSize, 0) || 0);

        updatedAssets.statistics = {
          ...updatedAssets.statistics,
          totalImageSize: imageSize,
          totalSize: imageSize + audioSize
        };

        onProjectUpdate({
          ...project,
          assets: updatedAssets,
          totalSize: imageSize + audioSize,
          lastModified: now
        });

        showSuccess(t('editor.assets.objectReplaced'));
        setReplacingObjectId(null);
      };

      reader.onerror = () => {
        showError(t('errors.fileReadFailed'));
        setReplacingObjectId(null);
      };

      reader.readAsDataURL(optimized);
    } catch (error) {
      console.error('オブジェクト差し替えエラー:', error);
      showError(t('editor.assets.errors.objectReplaceFailed'));
      setReplacingObjectId(null);
    }

    // inputをリセット（同じファイルを再選択可能に）
    if (replaceInputRef.current) {
      replaceInputRef.current.value = '';
    }
  }, [project, onProjectUpdate, replacingObjectId, replacingFrameIndex, showSuccess, showError, t]);

  // 差し替えボタンクリック（Phase 3-1-9: 現在のフレームインデックスを保存）
  const triggerReplaceInput = useCallback((objectId: string) => {
    setReplacingObjectId(objectId);
    // 🎯 現在選択中のフレームインデックスを保存
    setReplacingFrameIndex(editingObjectId === objectId ? animationPreviewIndex : 0);
    setTimeout(() => {
      replaceInputRef.current?.click();
    }, 0);
  }, [editingObjectId, animationPreviewIndex]);

  // オブジェクトにフレーム追加（アニメーション用）
  const addFrameToObject = useCallback(async (objectId: string, results: FileProcessingResult[]) => {
    try {
      const now = new Date().toISOString();
      const updatedAssets = { ...project.assets };
      const objectIndex = updatedAssets.objects.findIndex(obj => obj.id === objectId);

      if (objectIndex === -1) {
        showError(t('errors.objectNotFound'));
        return;
      }

      const targetObject = updatedAssets.objects[objectIndex];

      // フレーム数制限チェック
      if (targetObject.frames.length >= 8) {
        showError(t('errors.maxFramesReached'));
        return;
      }

      let addedFrames = 0;
      
      for (const result of results) {
        if (!result.accepted || result.type !== 'image') continue;
        if (targetObject.frames.length + addedFrames >= 8) break;

        // 画像最適化
        const optimized = await optimizeImage(result.file, 512, 512, 0.8);

        // Base64変換
        const reader = new FileReader();
        
        await new Promise<void>((resolve, reject) => {
          reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            
            const frame: AssetFrame = {
              id: crypto.randomUUID(),
              dataUrl,
              originalName: result.file.name,
              width: 512,
              height: 512,
              fileSize: optimized?.size || result.file.size,
              uploadedAt: now
            };

            targetObject.frames.push(frame);
            targetObject.totalSize += frame.fileSize;
            targetObject.lastModified = now;
            addedFrames++;
            resolve();
          };

          reader.onerror = reject;
          reader.readAsDataURL(optimized || result.file);
        });
      }

      if (addedFrames > 0) {
        // 統計更新
        const imageSize = updatedAssets.objects.reduce((sum, obj) => sum + obj.totalSize, 0) + 
                         (updatedAssets.background?.totalSize || 0);
        const audioSize = (updatedAssets.audio.bgm?.fileSize || 0) + 
                         updatedAssets.audio.se.reduce((sum, se) => sum + se.fileSize, 0);

        updatedAssets.statistics = {
          ...updatedAssets.statistics,
          totalImageSize: imageSize,
          totalSize: imageSize + audioSize
        };

        onProjectUpdate({
          ...project,
          assets: updatedAssets,
          totalSize: imageSize + audioSize,
          lastModified: now
        });

        showSuccess(t('success.framesAdded', { count: addedFrames }));
      }
    } catch (error) {
      console.error('フレーム追加エラー:', error);
      showError(t('errors.frameAddFailed'));
    }
  }, [project, onProjectUpdate, showSuccess, showError, t]);

  // アニメーション設定更新
  const updateAnimationSettings = useCallback((objectId: string, settings: Partial<AnimationSettings>) => {
    const updatedAssets = { ...project.assets };
    const objectIndex = updatedAssets.objects.findIndex(obj => obj.id === objectId);
    
    if (objectIndex !== -1) {
      updatedAssets.objects[objectIndex] = {
        ...updatedAssets.objects[objectIndex],
        animationSettings: {
          ...updatedAssets.objects[objectIndex].animationSettings,
          ...settings
        },
        lastModified: new Date().toISOString()
      };

      onProjectUpdate({
        ...project,
        assets: updatedAssets,
        lastModified: new Date().toISOString()
      });
    }
  }, [project, onProjectUpdate]);

  // 🗑️ オブジェクト削除処理（Phase 3-1-9: 画像のみ削除、オブジェクトは残す）
  const handleObjectDelete = useCallback((objectId: string) => {
    const updatedAssets = { ...project.assets };
    const objectIndex = updatedAssets.objects.findIndex(obj => obj.id === objectId);
    
    if (objectIndex === -1) {
      showError(t('errors.objectNotFound'));
      return;
    }

    const now = new Date().toISOString();
    const targetObject = updatedAssets.objects[objectIndex];

    // 🎯 画像のみ削除（framesを空配列にする）
    updatedAssets.objects[objectIndex] = {
      ...targetObject,
      frames: [], // 画像を全削除
      totalSize: 0,
      lastModified: now
    };

    // 統計更新
    const imageSize = updatedAssets.objects.reduce((sum, obj) => sum + obj.totalSize, 0) + 
                     (updatedAssets.background?.totalSize || 0);
    const audioSize = (updatedAssets.audio.bgm?.fileSize || 0) + 
                     updatedAssets.audio.se.reduce((sum, se) => sum + se.fileSize, 0);

    updatedAssets.statistics = {
      ...updatedAssets.statistics,
      totalImageSize: imageSize,
      totalSize: imageSize + audioSize
    };

    onProjectUpdate({
      ...project,
      assets: updatedAssets,
      totalSize: imageSize + audioSize,
      lastModified: now
    });

    showSuccess(t('editor.assets.imagesDeleted'));
    
    // 編集中オブジェクトが削除された場合は編集モードを終了
    if (editingObjectId === objectId) {
      setEditingObjectId(null);
    }
  }, [project, onProjectUpdate, editingObjectId, showSuccess, showError, t]);

  // アニメーションプレビュー制御
  const toggleAnimationPreview = useCallback((objectId: string) => {
    if (isPreviewPlaying && editingObjectId === objectId) {
      setIsPreviewPlaying(false);
    } else {
      setEditingObjectId(objectId);
      setAnimationPreviewIndex(0);
      setIsPreviewPlaying(true);
    }
  }, [isPreviewPlaying, editingObjectId]);

  // アニメーションプレビュー更新（簡易実装）
  React.useEffect(() => {
    if (!isPreviewPlaying || !editingObjectId) return;

    const editingObject = project.assets?.objects?.find(obj => obj.id === editingObjectId);
    if (!editingObject || editingObject.frames.length <= 1) return;

    const interval = setInterval(() => {
      setAnimationPreviewIndex(prev => (prev + 1) % editingObject.frames.length);
    }, 1000 / editingObject.animationSettings.speed);

    return () => clearInterval(interval);
  }, [isPreviewPlaying, editingObjectId, project.assets?.objects]);

  // 🎯 フレーム切り替え関数（Phase 3-1-9: 左右ボタン用）
  const changeFrame = useCallback((objectId: string, direction: 'prev' | 'next') => {
    const editingObject = project.assets?.objects?.find(obj => obj.id === objectId);
    if (!editingObject || editingObject.frames.length <= 1) return;

    setAnimationPreviewIndex(prev => {
      if (direction === 'prev') {
        return prev === 0 ? editingObject.frames.length - 1 : prev - 1;
      } else {
        return (prev + 1) % editingObject.frames.length;
      }
    });
  }, [project.assets?.objects]);

  return (
    <div>
      {/* 🔄 隠しファイル入力（差し替え用） */}
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleObjectReplace}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <h3
          style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.lg,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
            color: DESIGN_TOKENS.colors.neutral[800],
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: DESIGN_TOKENS.spacing[2]
          }}
        >
          🎨 {t('editor.assets.objects')}
          <span
            style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              color: DESIGN_TOKENS.colors.neutral[500],
              fontWeight: DESIGN_TOKENS.typography.fontWeight.normal
            }}
          >
            ({project.assets?.objects?.length || 0}/{EDITOR_LIMITS.PROJECT.MAX_OBJECTS}) + 🎬 {t('editor.assets.animation')}
          </span>
        </h3>
      </div>

      {/* ドラッグ&ドロップゾーン（新規オブジェクト作成） */}
      {(project.assets?.objects?.length || 0) < EDITOR_LIMITS.PROJECT.MAX_OBJECTS && (
        <DragDropZone
          accept={['image/*']}
          maxFiles={EDITOR_LIMITS.PROJECT.MAX_OBJECTS - (project.assets?.objects?.length || 0)}
          maxSize={EDITOR_LIMITS.IMAGE.OBJECT_FRAME_MAX_SIZE}
          variant="default"
          title={t('editor.assets.uploadObjectImage')}
          description={t('editor.assets.multiFileUploadSupport', { max: EDITOR_LIMITS.PROJECT.MAX_OBJECTS - (project.assets?.objects?.length || 0) })}
          buttonText={t('common.selectFile')}
          onFilesDrop={handleObjectUpload}
          loading={uploading}
          style={{ marginBottom: DESIGN_TOKENS.spacing[6] }}
        />
      )}

      {/* 既存オブジェクト一覧（アニメーション機能統合） */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: DESIGN_TOKENS.spacing[4],
          marginBottom: DESIGN_TOKENS.spacing[6]
        }}
      >
        {(project.assets?.objects || []).map((obj) => {
          // レイアウト配置状況確認
          const isPlaced = project.script?.layout?.objects?.some(layoutObj => layoutObj.objectId === obj.id) || false;
          const isEditing = editingObjectId === obj.id;
          const currentFrame = isEditing ? animationPreviewIndex : 0;
          
          // 🎯 画像がない場合の処理（Phase 3-1-9）
          const hasFrames = obj.frames.length > 0;
          
          return (
            <ModernCard key={obj.id} variant="elevated" size="md">
              {/* オブジェクトプレビュー */}
              <div style={{ position: 'relative', marginBottom: DESIGN_TOKENS.spacing[3] }}>
                {hasFrames ? (
                  <>
                    <img
                      src={obj.frames[currentFrame]?.dataUrl || obj.frames[0].dataUrl}
                      alt={obj.name}
                      style={{
                        width: '100%',
                        aspectRatio: '1',
                        objectFit: 'cover',
                        borderRadius: DESIGN_TOKENS.borderRadius.md
                      }}
                    />
                    
                    {/* 🎯 フレーム切り替えボタン（Phase 3-1-9 v2: プレビュー画面左右に配置） */}
                    {isEditing && obj.frames.length > 1 && (
                      <>
                        {/* 左ボタン */}
                        <button
                          onClick={() => changeFrame(obj.id, 'prev')}
                          disabled={isPreviewPlaying}
                          style={{
                            position: 'absolute',
                            left: DESIGN_TOKENS.spacing[2],
                            top: '50%',
                            transform: 'translateY(-50%)',
                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                            color: 'white',
                            border: 'none',
                            borderRadius: DESIGN_TOKENS.borderRadius.full,
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '20px',
                            cursor: isPreviewPlaying ? 'not-allowed' : 'pointer',
                            opacity: isPreviewPlaying ? 0.4 : 1,
                            transition: 'all 0.2s ease',
                            zIndex: 10
                          }}
                          onMouseEnter={(e) => {
                            if (!isPreviewPlaying) {
                              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                              e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
                            e.currentTarget.style.transform = 'translateY(-50%)';
                          }}
                        >
                          ◀
                        </button>

                        {/* 右ボタン */}
                        <button
                          onClick={() => changeFrame(obj.id, 'next')}
                          disabled={isPreviewPlaying}
                          style={{
                            position: 'absolute',
                            right: DESIGN_TOKENS.spacing[2],
                            top: '50%',
                            transform: 'translateY(-50%)',
                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                            color: 'white',
                            border: 'none',
                            borderRadius: DESIGN_TOKENS.borderRadius.full,
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '20px',
                            cursor: isPreviewPlaying ? 'not-allowed' : 'pointer',
                            opacity: isPreviewPlaying ? 0.4 : 1,
                            transition: 'all 0.2s ease',
                            zIndex: 10
                          }}
                          onMouseEnter={(e) => {
                            if (!isPreviewPlaying) {
                              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                              e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
                            e.currentTarget.style.transform = 'translateY(-50%)';
                          }}
                        >
                          ▶
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  // 画像がない場合のプレースホルダー
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: DESIGN_TOKENS.colors.neutral[100],
                      borderRadius: DESIGN_TOKENS.borderRadius.md,
                      border: `2px dashed ${DESIGN_TOKENS.colors.neutral[300]}`
                    }}
                  >
                    <div style={{ textAlign: 'center', color: DESIGN_TOKENS.colors.neutral[500] }}>
                      <div style={{ fontSize: '48px', marginBottom: DESIGN_TOKENS.spacing[2] }}>🖼️</div>
                      <div style={{ fontSize: DESIGN_TOKENS.typography.fontSize.sm }}>
                        {t('editor.assets.noImage')}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* フレーム数表示 */}
                {obj.frames.length > 1 && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: DESIGN_TOKENS.spacing[2],
                      right: DESIGN_TOKENS.spacing[2],
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      color: 'white',
                      padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[2]}`,
                      borderRadius: DESIGN_TOKENS.borderRadius.full,
                      fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                      fontWeight: DESIGN_TOKENS.typography.fontWeight.bold
                    }}
                  >
                    🎬 {currentFrame + 1}/{obj.frames.length}
                  </div>
                )}

                {/* 再生中インジケーター */}
                {isPreviewPlaying && isEditing && (
                  <div 
                    style={{
                      position: 'absolute',
                      bottom: DESIGN_TOKENS.spacing[2],
                      left: DESIGN_TOKENS.spacing[2],
                      backgroundColor: DESIGN_TOKENS.colors.primary[500],
                      color: 'white',
                      padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[2]}`,
                      borderRadius: DESIGN_TOKENS.borderRadius.full,
                      fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                      fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                      display: 'flex',
                      alignItems: 'center',
                      gap: DESIGN_TOKENS.spacing[1]
                    }}
                  >
                    ▶️ {obj.animationSettings.speed}fps
                  </div>
                )}
              </div>

              {/* オブジェクト情報 */}
              <h4 
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                  color: DESIGN_TOKENS.colors.neutral[800],
                  margin: `0 0 ${DESIGN_TOKENS.spacing[1]} 0`
                }}
              >
                {obj.name}
              </h4>
              <p
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.neutral[500],
                  margin: `0 0 ${DESIGN_TOKENS.spacing[2]} 0`
                }}
              >
                {formatFileSize(obj.totalSize)} • {t('editor.assets.frameCount', { count: obj.frames.length })}
              </p>

              {/* 配置状況表示 - Tailwind → インラインスタイル変換済み */}
              <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
                <span
                  style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                    padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[2]}`,
                    borderRadius: DESIGN_TOKENS.borderRadius.sm,
                    backgroundColor: isPlaced 
                      ? DESIGN_TOKENS.colors.success[50]
                      : DESIGN_TOKENS.colors.neutral[100],
                    color: isPlaced 
                      ? DESIGN_TOKENS.colors.success[600]
                      : DESIGN_TOKENS.colors.neutral[600]
                  }}
                >
                  {isPlaced ? `✅ ${t('editor.assets.placed')}` : `📦 ${t('editor.assets.notPlaced')}`}
                </span>
              </div>

              {/* コントロールボタン */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: DESIGN_TOKENS.spacing[2], marginBottom: DESIGN_TOKENS.spacing[3] }}>
                {/* アニメーション編集ボタン（画像がある場合のみ） */}
                {hasFrames && (
                  <ModernButton
                    variant={isEditing ? "secondary" : "outline"}
                    size="xs"
                    icon="🎬"
                    onClick={() => setEditingObjectId(isEditing ? null : obj.id)}
                  >
                    {isEditing ? t('common.done') : t('editor.assets.animation')}
                  </ModernButton>
                )}

                {/* ❌ プレビューボタン削除（Phase 3-1-2完了） */}

                {/* 🔄 差し替えボタン（画像がある場合） / 追加ボタン（画像がない場合） */}
                <ModernButton
                  variant="secondary"
                  size="xs"
                  icon={hasFrames ? "🔄" : "➕"}
                  onClick={() => triggerReplaceInput(obj.id)}
                  disabled={uploading}
                >
                  {hasFrames ? t('editor.assets.replaceImage') : t('editor.assets.addImage')}
                </ModernButton>

                {/* 削除ボタン（Phase 3-1-9: 画像のみ削除） */}
                <ModernButton
                  variant="error"
                  size="xs"
                  icon="🗑️"
                  onClick={() => handleObjectDelete(obj.id)}
                  disabled={uploading || !hasFrames}
                >
                  {t('editor.assets.deleteImages')}
                </ModernButton>
              </div>

              {/* アニメーション編集パネル */}
              {isEditing && hasFrames && (
                <div 
                  style={{
                    borderTop: `1px solid ${DESIGN_TOKENS.colors.neutral[200]}`,
                    paddingTop: DESIGN_TOKENS.spacing[3]
                  }}
                >
                  <h5
                    style={{
                      fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                      fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                      color: DESIGN_TOKENS.colors.primary[700],
                      margin: `0 0 ${DESIGN_TOKENS.spacing[3]} 0`
                    }}
                  >
                    🎬 {t('editor.assets.animationSettings')}
                  </h5>

                  {/* フレーム追加 */}
                  {obj.frames.length < 8 && (
                    <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
                      <DragDropZone
                        accept={['image/*']}
                        maxFiles={8 - obj.frames.length}
                        maxSize={EDITOR_LIMITS.IMAGE.OBJECT_FRAME_MAX_SIZE}
                        variant="compact"
                        title={t('editor.assets.addFrame')}
                        description={t('editor.assets.canAddFrames', { count: 8 - obj.frames.length })}
                        buttonText={t('editor.assets.addFrame')}
                        onFilesDrop={(results) => addFrameToObject(obj.id, results)}
                        loading={uploading}
                      />
                    </div>
                  )}

                  {/* ✅ サイズ調整 - バー削除→数値入力のみ（Phase 3-1-1完了） */}
                  <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                        fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                        color: DESIGN_TOKENS.colors.neutral[700],
                        marginBottom: DESIGN_TOKENS.spacing[1]
                      }}
                    >
                      {t('editor.assets.size')}:
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[2] }}>
                      <input
                        type="number"
                        min="10"
                        step="10"
                        value={((obj.defaultScale || 1.0) * 100).toFixed(0)}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (isNaN(value) || value < 10) return;
                          const scale = value / 100;
                          const updatedAssets = { ...project.assets };
                          const objectIndex = updatedAssets.objects.findIndex(o => o.id === obj.id);
                          if (objectIndex !== -1) {
                            updatedAssets.objects[objectIndex] = {
                              ...updatedAssets.objects[objectIndex],
                              defaultScale: scale
                            };
                            onProjectUpdate({
                              ...project,
                              assets: updatedAssets
                            });
                          }
                        }}
                        style={{
                          width: '100px',
                          padding: DESIGN_TOKENS.spacing[2],
                          border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                          borderRadius: DESIGN_TOKENS.borderRadius.md,
                          fontSize: DESIGN_TOKENS.typography.fontSize.sm
                        }}
                      />
                      <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.sm, color: DESIGN_TOKENS.colors.neutral[600] }}>%</span>
                    </div>
                  </div>

                  {/* アニメーション速度設定 */}
                  <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                        fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                        color: DESIGN_TOKENS.colors.neutral[700],
                        marginBottom: DESIGN_TOKENS.spacing[1]
                      }}
                    >
                      {t('editor.assets.speed')}:
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[2] }}>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        step="1"
                        value={obj.animationSettings.speed}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (isNaN(value) || value < 0) return;
                          updateAnimationSettings(obj.id, { speed: value });
                        }}
                        style={{
                          width: '80px',
                          padding: DESIGN_TOKENS.spacing[2],
                          border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                          borderRadius: DESIGN_TOKENS.borderRadius.md,
                          fontSize: DESIGN_TOKENS.typography.fontSize.sm
                        }}
                      />
                      <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.sm, color: DESIGN_TOKENS.colors.neutral[600] }}>
                        fps {obj.animationSettings.speed === 0 && `(${t('editor.assets.ruleControlOnly')})`}
                      </span>
                    </div>
                  </div>

                  {/* アニメーション設定 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN_TOKENS.spacing[2] }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[2] }}>
                      <input
                        type="checkbox"
                        checked={obj.animationSettings.loop}
                        onChange={(e) => updateAnimationSettings(obj.id, { loop: e.target.checked })}
                      />
                      <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, color: DESIGN_TOKENS.colors.neutral[700] }}>
                        🔄 {t('editor.assets.loopPlayback')}
                      </span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[2] }}>
                      <input
                        type="checkbox"
                        checked={obj.animationSettings.pingPong}
                        onChange={(e) => updateAnimationSettings(obj.id, { pingPong: e.target.checked })}
                      />
                      <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, color: DESIGN_TOKENS.colors.neutral[700] }}>
                        ↔️ {t('editor.assets.pingPongPlayback')}
                      </span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[2] }}>
                      <input
                        type="checkbox"
                        checked={obj.animationSettings.autoStart}
                        onChange={(e) => updateAnimationSettings(obj.id, { autoStart: e.target.checked })}
                      />
                      <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, color: DESIGN_TOKENS.colors.neutral[700] }}>
                        ▶️ {t('editor.assets.autoStart')}
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </ModernCard>
          );
        })}
      </div>

      {/* オブジェクト上限メッセージ */}
      {(project.assets?.objects?.length || 0) >= EDITOR_LIMITS.PROJECT.MAX_OBJECTS && (
        <ModernCard variant="filled" size="sm">
          <p
            style={{
              textAlign: 'center',
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              color: DESIGN_TOKENS.colors.neutral[600],
              margin: 0
            }}
          >
            {t('errors.maxObjectsReached', { max: EDITOR_LIMITS.PROJECT.MAX_OBJECTS })}
          </p>
        </ModernCard>
      )}

      {/* アニメーション機能ガイド */}
      <ModernCard variant="filled" size="sm" style={{ marginTop: DESIGN_TOKENS.spacing[4] }}>
        <h4
          style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.primary[800],
            margin: `0 0 ${DESIGN_TOKENS.spacing[2]} 0`
          }}
        >
          🎬 {t('editor.assets.animationTipsTitle')}
        </h4>
        <ul
          style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            color: DESIGN_TOKENS.colors.primary[700],
            margin: 0,
            paddingLeft: DESIGN_TOKENS.spacing[4],
            lineHeight: DESIGN_TOKENS.typography.lineHeight.relaxed
          }}
        >
          <li><strong>{t('editor.assets.multipleFrames')}</strong>: {t('editor.assets.multipleFramesDesc')}</li>
          <li><strong>{t('editor.assets.animationSettings')}</strong>: {t('editor.assets.animationSettingsDesc')}</li>
          <li><strong>{t('editor.assets.previewFeature')}</strong>: {t('editor.assets.previewFeatureDesc')}</li>
          <li><strong>{t('editor.assets.gameIntegration')}</strong>: {t('editor.assets.gameIntegrationDesc')}</li>
          <li><strong>{t('editor.assets.optimization')}</strong>: {t('editor.assets.optimizationDesc')}</li>
        </ul>
      </ModernCard>
    </div>
  );
};