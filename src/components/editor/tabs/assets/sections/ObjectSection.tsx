// src/components/editor/tabs/assets/sections/ObjectSection.tsx
// 🔧 Phase E-1: オブジェクト管理+アニメーション統合セクション
import React, { useState, useCallback } from 'react';
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
  const { uploading, deleteAsset } = useAssetUpload(project, onProjectUpdate);
  const { showSuccess, showError } = useNotification();
  
  // アニメーション管理状態
  const [editingObjectId, setEditingObjectId] = useState<string | null>(null);
  const [animationPreviewIndex, setAnimationPreviewIndex] = useState<number>(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);

  // オブジェクト単独アップロード処理（複数フレーム対応）
  const handleObjectUpload = useCallback(async (results: FileProcessingResult[]) => {
    if (uploading) return;

    try {
      const now = new Date().toISOString();
      const updatedAssets = { ...project.assets };
      let addedCount = 0;

      for (const result of results) {
        if (!result.accepted) {
          showError(result.error || 'ファイルが受け入れられませんでした');
          continue;
        }

        if (result.type !== 'image') {
          showError('画像ファイルのみアップロード可能です');
          continue;
        }

        // オブジェクト数制限チェック
        if (updatedAssets.objects.length >= EDITOR_LIMITS.PROJECT.MAX_OBJECTS) {
          showError(`オブジェクトは最大${EDITOR_LIMITS.PROJECT.MAX_OBJECTS}個まで追加できます`);
          continue;
        }

        // サイズチェック
        if (result.file.size > EDITOR_LIMITS.IMAGE.OBJECT_FRAME_MAX_SIZE) {
          showError(`ファイルサイズが大きすぎます: ${result.file.name}`);
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
              name: `オブジェクト${updatedAssets.objects.length + 1}`,
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

        showSuccess(`${addedCount}個のオブジェクトをアップロードしました`);
      }
    } catch (error) {
      console.error('オブジェクトアップロードエラー:', error);
      showError('オブジェクトのアップロードに失敗しました');
    }
  }, [project, onProjectUpdate, uploading, showSuccess, showError]);

  // オブジェクトにフレーム追加（アニメーション用）
  const addFrameToObject = useCallback(async (objectId: string, results: FileProcessingResult[]) => {
    try {
      const now = new Date().toISOString();
      const updatedAssets = { ...project.assets };
      const objectIndex = updatedAssets.objects.findIndex(obj => obj.id === objectId);
      
      if (objectIndex === -1) {
        showError('オブジェクトが見つかりません');
        return;
      }

      const targetObject = updatedAssets.objects[objectIndex];
      
      // フレーム数制限チェック
      if (targetObject.frames.length >= 8) {
        showError('1つのオブジェクトには最大8フレームまで追加できます');
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

        showSuccess(`${addedFrames}フレームを追加しました`);
      }
    } catch (error) {
      console.error('フレーム追加エラー:', error);
      showError('フレームの追加に失敗しました');
    }
  }, [project, onProjectUpdate, showSuccess, showError]);

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

  // オブジェクト削除処理
  const handleObjectDelete = useCallback((objectId: string) => {
    const result = deleteAsset('objects', objectId);
    if (result.success) {
      showSuccess(result.message);
      // 編集中オブジェクトが削除された場合は編集モードを終了
      if (editingObjectId === objectId) {
        setEditingObjectId(null);
      }
    } else {
      showError(result.message);
    }
  }, [deleteAsset, editingObjectId, showSuccess, showError]);

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

  return (
    <div>
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
          🎨 オブジェクト
          <span 
            style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              color: DESIGN_TOKENS.colors.neutral[500],
              fontWeight: DESIGN_TOKENS.typography.fontWeight.normal
            }}
          >
            ({project.assets?.objects?.length || 0}/{EDITOR_LIMITS.PROJECT.MAX_OBJECTS}) + 🎬 アニメーション
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
          title="オブジェクト画像をアップロード"
          description={`複数ファイルの同時アップロード対応（最大${EDITOR_LIMITS.PROJECT.MAX_OBJECTS - (project.assets?.objects?.length || 0)}個）`}
          buttonText="ファイルを選択"
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
          
          return (
            <ModernCard key={obj.id} variant="elevated" size="md">
              {/* オブジェクトプレビュー */}
              <div style={{ position: 'relative', marginBottom: DESIGN_TOKENS.spacing[3] }}>
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
                {formatFileSize(obj.totalSize)} • {obj.frames.length}フレーム
              </p>
              
              {/* 配置状況表示 */}
              <div className="mb-3">
                <span className={`text-xs px-2 py-1 rounded ${
                  isPlaced 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {isPlaced ? '✅ 配置済み' : '📦 未配置'}
                </span>
              </div>

              {/* コントロールボタン */}
              <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[2], marginBottom: DESIGN_TOKENS.spacing[3] }}>
                {/* アニメーション編集ボタン */}
                <ModernButton
                  variant={isEditing ? "secondary" : "outline"}
                  size="xs"
                  icon="🎬"
                  onClick={() => setEditingObjectId(isEditing ? null : obj.id)}
                >
                  {isEditing ? '完了' : 'アニメ'}
                </ModernButton>

                {/* プレビューボタン */}
                {obj.frames.length > 1 && (
                  <ModernButton
                    variant={isPreviewPlaying && isEditing ? "primary" : "outline"}
                    size="xs"
                    icon={isPreviewPlaying && isEditing ? '⏹️' : '▶️'}
                    onClick={() => toggleAnimationPreview(obj.id)}
                  >
                    {isPreviewPlaying && isEditing ? '停止' : '再生'}
                  </ModernButton>
                )}

                {/* 削除ボタン */}
                <ModernButton
                  variant="error"
                  size="xs"
                  icon="🗑️"
                  onClick={() => handleObjectDelete(obj.id)}
                  disabled={uploading}
                >
                  削除
                </ModernButton>
              </div>

              {/* アニメーション編集パネル */}
              {isEditing && (
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
                    🎬 アニメーション設定
                  </h5>

                  {/* フレーム追加 */}
                  {obj.frames.length < 8 && (
                    <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
                      <DragDropZone
                        accept={['image/*']}
                        maxFiles={8 - obj.frames.length}
                        maxSize={EDITOR_LIMITS.IMAGE.OBJECT_FRAME_MAX_SIZE}
                        variant="compact"
                        title="フレーム追加"
                        description={`${8 - obj.frames.length}フレームまで追加可能`}
                        buttonText="フレーム追加"
                        onFilesDrop={(results) => addFrameToObject(obj.id, results)}
                        loading={uploading}
                      />
                    </div>
                  )}

                  {/* サイズ調整 */}
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
                      サイズ: {((obj.defaultScale || 1.0) * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="300"
                      step="10"
                      value={(obj.defaultScale || 1.0) * 100}
                      onChange={(e) => {
                        const scale = parseInt(e.target.value) / 100;
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
                        width: '100%',
                        height: '4px',
                        borderRadius: DESIGN_TOKENS.borderRadius.full,
                        background: DESIGN_TOKENS.colors.neutral[200],
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    />
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
                      速度: {obj.animationSettings.speed}fps {obj.animationSettings.speed === 0 && '(ルール制御のみ)'}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      value={obj.animationSettings.speed}
                      onChange={(e) => updateAnimationSettings(obj.id, { speed: parseInt(e.target.value) })}
                      style={{
                        width: '100%',
                        height: '4px',
                        borderRadius: DESIGN_TOKENS.borderRadius.full,
                        background: DESIGN_TOKENS.colors.neutral[200],
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    />
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
                        🔄 ループ再生
                      </span>
                    </label>
                    
                    <label style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[2] }}>
                      <input
                        type="checkbox"
                        checked={obj.animationSettings.pingPong}
                        onChange={(e) => updateAnimationSettings(obj.id, { pingPong: e.target.checked })}
                      />
                      <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, color: DESIGN_TOKENS.colors.neutral[700] }}>
                        ↔️ 往復再生
                      </span>
                    </label>
                    
                    <label style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[2] }}>
                      <input
                        type="checkbox"
                        checked={obj.animationSettings.autoStart}
                        onChange={(e) => updateAnimationSettings(obj.id, { autoStart: e.target.checked })}
                      />
                      <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, color: DESIGN_TOKENS.colors.neutral[700] }}>
                        ▶️ 自動開始
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
            オブジェクトは最大{EDITOR_LIMITS.PROJECT.MAX_OBJECTS}個まで追加できます
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
          🎬 アニメーション機能のヒント
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
          <li><strong>複数フレーム</strong>: 1つのオブジェクトに最大8フレーム追加可能</li>
          <li><strong>アニメーション設定</strong>: 速度・ループ・往復・自動開始を調整</li>
          <li><strong>プレビュー機能</strong>: リアルタイムでアニメーション確認</li>
          <li><strong>ゲーム連携</strong>: スクリプトタブでアニメーション条件設定可能</li>
          <li><strong>最適化</strong>: 画像は自動で512x512に最適化されます</li>
        </ul>
      </ModernCard>
    </div>
  );
};