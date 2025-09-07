import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GameProject } from '../../../types/editor/GameProject';
import { ProjectAssets, BackgroundAsset, ObjectAsset, TextAsset, AssetFrame } from '../../../types/editor/ProjectAssets';
import { EDITOR_LIMITS } from '../../../constants/EditorLimits';
import { DESIGN_TOKENS } from '../../../constants/DesignSystem';
import { ModernButton } from '../../ui/ModernButton';
import { ModernCard } from '../../ui/ModernCard';
import { DragDropZone, FileProcessingResult } from '../../ui/DragDropZone';

interface AssetsTabProps {
  project: GameProject;
  onProjectUpdate: (project: GameProject) => void;
}

type AssetType = 'background' | 'objects' | 'texts';
type EditMode = 'none' | 'background' | 'object' | 'text' | 'animation';

// ファイルサイズを人間が読みやすい形式に変換
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 画像ファイルをリサイズ・最適化
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

export const AssetsTab: React.FC<AssetsTabProps> = ({ project, onProjectUpdate }) => {
  const [activeAssetType, setActiveAssetType] = useState<AssetType>('background');
  const [editMode, setEditMode] = useState<EditMode>('none');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  
  // テキストエディット用状態
  const [textContent, setTextContent] = useState('');
  const [textColor, setTextColor] = useState('#000000');
  const [fontSize, setFontSize] = useState(24);
  const [fontWeight, setFontWeight] = useState<'normal' | 'bold'>('normal');

  // 通知表示ヘルパー
  const showNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  // 容量計算
  const getTotalSize = useCallback(() => {
    let total = 0;
    if (project.assets.background) total += project.assets.background.totalSize;
    project.assets.objects.forEach(obj => total += obj.totalSize);
    return total;
  }, [project.assets]);

  const totalSize = getTotalSize();
  const sizePercentage = (totalSize / EDITOR_LIMITS.PROJECT.TOTAL_MAX_SIZE) * 100;

  // 複数ファイルアップロード処理（DragDropZone統合）
  const handleMultipleFileUpload = useCallback(async (results: FileProcessingResult[]) => {
    if (uploading) return;
    setUploading(true);

    try {
      const now = new Date().toISOString();
      const updatedAssets = { ...project.assets };
      let addedCount = 0;

      for (const result of results) {
        if (!result.accepted) {
          showNotification('error', result.error || 'ファイルが受け入れられませんでした');
          continue;
        }

        if (result.type !== 'image') {
          showNotification('error', '画像ファイルのみアップロード可能です');
          continue;
        }

        // サイズチェック
        const maxSize = activeAssetType === 'background' 
          ? EDITOR_LIMITS.IMAGE.BACKGROUND_FRAME_MAX_SIZE
          : EDITOR_LIMITS.IMAGE.OBJECT_FRAME_MAX_SIZE;

        if (result.file.size > maxSize) {
          showNotification('error', `ファイルサイズが大きすぎます: ${result.file.name}`);
          continue;
        }

        // 画像最適化
        const optimized = await optimizeImage(
          result.file, 
          activeAssetType === 'background' ? 1080 : 512, 
          activeAssetType === 'background' ? 1920 : 512,
          0.8
        );

        // Base64に変換
        const reader = new FileReader();
        
        await new Promise<void>((resolve, reject) => {
          reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            
            // アセットフレーム作成
            const frame: AssetFrame = {
              id: crypto.randomUUID(),
              dataUrl,
              originalName: result.file.name,
              width: activeAssetType === 'background' ? 1080 : 512,
              height: activeAssetType === 'background' ? 1920 : 512,
              fileSize: optimized?.size || result.file.size,
              uploadedAt: now
            };

            // プロジェクト更新
            if (activeAssetType === 'background') {
              updatedAssets.background = {
                id: crypto.randomUUID(),
                name: 'Background',
                frames: [frame],
                animationSettings: { speed: 10, loop: true, pingPong: false, autoStart: true },
                totalSize: frame.fileSize,
                createdAt: now,
                lastModified: now
              };
              addedCount++;
            } else if (activeAssetType === 'objects') {
              // オブジェクト数制限チェック
              if (updatedAssets.objects.length >= EDITOR_LIMITS.PROJECT.MAX_OBJECTS) {
                showNotification('error', `オブジェクトは最大${EDITOR_LIMITS.PROJECT.MAX_OBJECTS}個まで追加できます`);
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

      // 統計更新
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
            isNearAudioLimit: audioSize > EDITOR_LIMITS.AUDIO.BGM_MAX_SIZE * 0.8,
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

        showNotification('success', `${addedCount}個のファイルをアップロードしました`);
      }
    } catch (error) {
      console.error('ファイルアップロードエラー:', error);
      showNotification('error', 'ファイルのアップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  }, [activeAssetType, project, onProjectUpdate, uploading, showNotification]);

  // テキストアセット追加
  const addTextAsset = useCallback(() => {
    if (project.assets.texts.length >= EDITOR_LIMITS.TEXT.MAX_COUNT) {
      showNotification('error', `テキストは最大${EDITOR_LIMITS.TEXT.MAX_COUNT}個まで追加できます`);
      return;
    }

    if (!textContent.trim()) {
      showNotification('error', 'テキストを入力してください');
      return;
    }

    if (textContent.length > EDITOR_LIMITS.TEXT.MAX_LENGTH) {
      showNotification('error', `テキストは${EDITOR_LIMITS.TEXT.MAX_LENGTH}文字以内で入力してください`);
      return;
    }

    const now = new Date().toISOString();

    const newText: TextAsset = {
      id: crypto.randomUUID(),
      content: textContent.trim(),
      style: {
        fontSize,
        color: textColor,
        fontWeight,
        fontFamily: 'Inter, sans-serif'
      },
      createdAt: now,
      lastModified: now
    };

    const updatedAssets = { ...project.assets };
    updatedAssets.texts.push(newText);
    updatedAssets.lastModified = now;

    // 統計更新
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
        isNearImageLimit: false,
        isNearAudioLimit: false,
        isNearTotalLimit: false,
        hasViolations: false
      }
    };

    onProjectUpdate({
      ...project,
      assets: updatedAssets,
      lastModified: now
    });

    // フォームリセット
    setTextContent('');
    setEditMode('none');
    showNotification('success', 'テキストを追加しました');
  }, [textContent, textColor, fontSize, fontWeight, project, onProjectUpdate, showNotification]);

  // アセット削除
  const deleteAsset = useCallback((type: AssetType, id?: string) => {
    const updatedAssets = { ...project.assets };
    let removedSize = 0;
    const now = new Date().toISOString();

    if (type === 'background') {
      if (updatedAssets.background) {
        removedSize = updatedAssets.background.totalSize;
        updatedAssets.background = null;
      }
    } else if (type === 'objects' && id) {
      const index = updatedAssets.objects.findIndex(obj => obj.id === id);
      if (index >= 0) {
        removedSize = updatedAssets.objects[index].totalSize;
        updatedAssets.objects.splice(index, 1);
      }
    } else if (type === 'texts' && id) {
      const index = updatedAssets.texts.findIndex(text => text.id === id);
      if (index >= 0) {
        updatedAssets.texts.splice(index, 1);
      }
    }

    // 統計更新
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
        isNearImageLimit: false,
        isNearAudioLimit: false,
        isNearTotalLimit: false,
        hasViolations: false
      }
    };

    updatedAssets.lastModified = now;

    onProjectUpdate({
      ...project,
      assets: updatedAssets,
      totalSize: project.totalSize - removedSize,
      lastModified: now
    });

    showNotification('success', 'アセットを削除しました');
  }, [project, onProjectUpdate, showNotification]);

  return (
    <div 
      style={{ 
        padding: DESIGN_TOKENS.spacing[6],
        fontFamily: DESIGN_TOKENS.typography.fontFamily.sans,
        backgroundColor: DESIGN_TOKENS.colors.neutral[50],
        minHeight: '100%'
      }}
    >
      {/* 通知表示 */}
      {notification && (
        <div 
          style={{
            position: 'fixed',
            top: DESIGN_TOKENS.spacing[4],
            right: DESIGN_TOKENS.spacing[4],
            zIndex: DESIGN_TOKENS.zIndex.notification,
            maxWidth: '400px'
          }}
        >
          <ModernCard variant="elevated" size="sm">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ 
                fontSize: DESIGN_TOKENS.typography.fontSize.xl, 
                marginRight: DESIGN_TOKENS.spacing[3] 
              }}>
                {notification.type === 'success' ? '✅' :
                 notification.type === 'error' ? '❌' : 'ℹ️'}
              </span>
              <p style={{ 
                fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                margin: 0,
                flex: 1,
                color: notification.type === 'success' 
                  ? DESIGN_TOKENS.colors.success[800] 
                  : notification.type === 'error' 
                    ? DESIGN_TOKENS.colors.error[800] 
                    : DESIGN_TOKENS.colors.primary[800]
              }}>
                {notification.message}
              </p>
              <ModernButton
                variant="ghost"
                size="xs"
                onClick={() => setNotification(null)}
                style={{ marginLeft: DESIGN_TOKENS.spacing[2] }}
              >
                ✕
              </ModernButton>
            </div>
          </ModernCard>
        </div>
      )}

      {/* 容量表示 */}
      <ModernCard variant="filled" size="sm" style={{ marginBottom: DESIGN_TOKENS.spacing[6] }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: DESIGN_TOKENS.spacing[2] }}>
          <span 
            style={{ 
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.neutral[700] 
            }}
          >
            使用容量
          </span>
          <span 
            style={{ 
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              color: DESIGN_TOKENS.colors.neutral[600] 
            }}
          >
            {formatFileSize(totalSize)} / {formatFileSize(EDITOR_LIMITS.PROJECT.TOTAL_MAX_SIZE)}
          </span>
        </div>
        <div 
          style={{
            width: '100%',
            height: '8px',
            backgroundColor: DESIGN_TOKENS.colors.neutral[200],
            borderRadius: DESIGN_TOKENS.borderRadius.full,
            overflow: 'hidden'
          }}
        >
          <div 
            style={{
              height: '100%',
              backgroundColor: sizePercentage > 90 
                ? DESIGN_TOKENS.colors.error[500] 
                : sizePercentage > 70 
                  ? DESIGN_TOKENS.colors.warning[500] 
                  : DESIGN_TOKENS.colors.success[500],
              width: `${Math.min(sizePercentage, 100)}%`,
              transition: `all ${DESIGN_TOKENS.animation.duration.normal} ${DESIGN_TOKENS.animation.easing.inOut}`
            }}
          />
        </div>
        {sizePercentage > 80 && (
          <p 
            style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.warning[600],
              margin: `${DESIGN_TOKENS.spacing[1]} 0 0 0`
            }}
          >
            容量が不足しています。不要なアセットを削除してください。
          </p>
        )}
      </ModernCard>

      {/* タブ切り替え */}
      <div 
        style={{
          display: 'flex',
          backgroundColor: DESIGN_TOKENS.colors.neutral[0],
          borderRadius: DESIGN_TOKENS.borderRadius.lg,
          padding: DESIGN_TOKENS.spacing[1],
          marginBottom: DESIGN_TOKENS.spacing[6],
          boxShadow: DESIGN_TOKENS.shadows.sm
        }}
      >
        {[
          { id: 'background' as AssetType, label: '背景', icon: '🖼️', count: project.assets.background ? 1 : 0 },
          { id: 'objects' as AssetType, label: 'オブジェクト', icon: '🎨', count: project.assets.objects.length },
          { id: 'texts' as AssetType, label: 'テキスト', icon: '📝', count: project.assets.texts.length }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveAssetType(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: DESIGN_TOKENS.spacing[2],
              padding: `${DESIGN_TOKENS.spacing[3]} ${DESIGN_TOKENS.spacing[4]}`,
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              backgroundColor: activeAssetType === tab.id 
                ? DESIGN_TOKENS.colors.primary[500]
                : 'transparent',
              color: activeAssetType === tab.id 
                ? DESIGN_TOKENS.colors.neutral[0]
                : DESIGN_TOKENS.colors.neutral[600],
              border: 'none',
              borderRadius: DESIGN_TOKENS.borderRadius.md,
              cursor: 'pointer',
              transition: `all ${DESIGN_TOKENS.animation.duration.fast} ${DESIGN_TOKENS.animation.easing.inOut}`
            }}
            onMouseEnter={(e) => {
              if (activeAssetType !== tab.id) {
                e.currentTarget.style.backgroundColor = DESIGN_TOKENS.colors.neutral[100];
                e.currentTarget.style.color = DESIGN_TOKENS.colors.neutral[800];
              }
            }}
            onMouseLeave={(e) => {
              if (activeAssetType !== tab.id) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = DESIGN_TOKENS.colors.neutral[600];
              }
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span 
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[2]}`,
                  backgroundColor: activeAssetType === tab.id 
                    ? DESIGN_TOKENS.colors.neutral[0]
                    : DESIGN_TOKENS.colors.primary[100],
                  color: activeAssetType === tab.id 
                    ? DESIGN_TOKENS.colors.primary[600]
                    : DESIGN_TOKENS.colors.primary[700],
                  borderRadius: DESIGN_TOKENS.borderRadius.full,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                  minWidth: '20px',
                  textAlign: 'center'
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 背景管理セクション */}
      {activeAssetType === 'background' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: DESIGN_TOKENS.spacing[4] }}>
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
              🖼️ 背景
              <span 
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  color: DESIGN_TOKENS.colors.neutral[500],
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.normal
                }}
              >
                (1枚まで)
              </span>
            </h3>
          </div>

          {project.assets.background ? (
            <ModernCard variant="elevated" size="md" style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[4] }}>
                <img
                  src={project.assets.background.frames[0].dataUrl}
                  alt="背景プレビュー"
                  style={{
                    width: '80px',
                    height: '144px',
                    objectFit: 'cover',
                    borderRadius: DESIGN_TOKENS.borderRadius.md,
                    border: `1px solid ${DESIGN_TOKENS.colors.neutral[200]}`
                  }}
                />
                <div style={{ flex: 1 }}>
                  <h4 
                    style={{
                      fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                      fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                      color: DESIGN_TOKENS.colors.neutral[800],
                      margin: `0 0 ${DESIGN_TOKENS.spacing[1]} 0`
                    }}
                  >
                    {project.assets.background.name}
                  </h4>
                  <p 
                    style={{
                      fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                      color: DESIGN_TOKENS.colors.neutral[500],
                      margin: `0 0 ${DESIGN_TOKENS.spacing[1]} 0`
                    }}
                  >
                    {project.assets.background.frames[0].width}×{project.assets.background.frames[0].height}px
                  </p>
                  <p 
                    style={{
                      fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                      color: DESIGN_TOKENS.colors.neutral[500],
                      margin: 0
                    }}
                  >
                    {formatFileSize(project.assets.background.totalSize)}
                  </p>
                </div>
                <ModernButton
                  variant="error"
                  size="sm"
                  icon="🗑️"
                  onClick={() => deleteAsset('background')}
                >
                  削除
                </ModernButton>
              </div>
            </ModernCard>
          ) : (
            <DragDropZone
              accept={['image/*']}
              maxFiles={1}
              maxSize={EDITOR_LIMITS.IMAGE.BACKGROUND_FRAME_MAX_SIZE}
              variant="large"
              title="背景画像をアップロード"
              description="画像をドラッグ&ドロップするか、クリックしてファイルを選択"
              buttonText="ファイルを選択"
              onFilesDrop={handleMultipleFileUpload}
              loading={uploading}
              style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}
            />
          )}

          <ModernCard variant="filled" size="sm">
            <h4 
              style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                color: DESIGN_TOKENS.colors.primary[800],
                margin: `0 0 ${DESIGN_TOKENS.spacing[2]} 0`
              }}
            >
              💡 背景のヒント
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
              <li>9:16（縦向き）の比率が推奨です</li>
              <li>最大{formatFileSize(EDITOR_LIMITS.IMAGE.BACKGROUND_FRAME_MAX_SIZE)}まで対応</li>
              <li>ファイルサイズが大きい場合は自動で最適化されます</li>
            </ul>
          </ModernCard>
        </div>
      )}

      {/* オブジェクト管理セクション */}
      {activeAssetType === 'objects' && (
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
                ({project.assets.objects.length}/{EDITOR_LIMITS.PROJECT.MAX_OBJECTS})
              </span>
            </h3>
          </div>

          {/* ドラッグ&ドロップゾーン */}
          {project.assets.objects.length < EDITOR_LIMITS.PROJECT.MAX_OBJECTS && (
            <DragDropZone
              accept={['image/*']}
              maxFiles={EDITOR_LIMITS.PROJECT.MAX_OBJECTS - project.assets.objects.length}
              maxSize={EDITOR_LIMITS.IMAGE.OBJECT_FRAME_MAX_SIZE}
              variant="default"
              title="オブジェクト画像をアップロード"
              description={`複数ファイルの同時アップロード対応（最大${EDITOR_LIMITS.PROJECT.MAX_OBJECTS - project.assets.objects.length}個）`}
              buttonText="ファイルを選択"
              onFilesDrop={handleMultipleFileUpload}
              loading={uploading}
              style={{ marginBottom: DESIGN_TOKENS.spacing[6] }}
            />
          )}

          {/* 既存オブジェクト一覧 */}
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: DESIGN_TOKENS.spacing[4],
              marginBottom: DESIGN_TOKENS.spacing[6]
            }}
          >
            {project.assets.objects.map((obj) => (
              <ModernCard key={obj.id} variant="elevated" size="sm">
                <img
                  src={obj.frames[0].dataUrl}
                  alt={obj.name}
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    objectFit: 'cover',
                    borderRadius: DESIGN_TOKENS.borderRadius.md,
                    marginBottom: DESIGN_TOKENS.spacing[3]
                  }}
                />
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
                    margin: `0 0 ${DESIGN_TOKENS.spacing[3]} 0`
                  }}
                >
                  {formatFileSize(obj.totalSize)}
                </p>
                <ModernButton
                  variant="error"
                  size="xs"
                  fullWidth
                  icon="🗑️"
                  onClick={() => deleteAsset('objects', obj.id)}
                >
                  削除
                </ModernButton>
              </ModernCard>
            ))}
          </div>

          {project.assets.objects.length >= EDITOR_LIMITS.PROJECT.MAX_OBJECTS && (
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
        </div>
      )}

      {/* テキスト管理セクション */}
      {activeAssetType === 'texts' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: DESIGN_TOKENS.spacing[4] }}>
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
              📝 テキスト
              <span 
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  color: DESIGN_TOKENS.colors.neutral[500],
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.normal
                }}
              >
                ({project.assets.texts.length}/{EDITOR_LIMITS.TEXT.MAX_COUNT})
              </span>
            </h3>
          </div>

          {/* 既存テキスト一覧 */}
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[6] }}>
            {project.assets.texts.map((text) => (
              <ModernCard key={text.id} variant="elevated" size="md" style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div
                    style={{
                      flex: 1,
                      fontSize: `${text.style.fontSize}px`,
                      color: text.style.color,
                      fontWeight: text.style.fontWeight,
                      fontFamily: text.style.fontFamily
                    }}
                  >
                    {text.content}
                  </div>
                  <ModernButton
                    variant="error"
                    size="xs"
                    icon="🗑️"
                    onClick={() => deleteAsset('texts', text.id)}
                    style={{ marginLeft: DESIGN_TOKENS.spacing[4] }}
                  >
                    削除
                  </ModernButton>
                </div>
              </ModernCard>
            ))}
          </div>

          {/* 新規テキスト追加 */}
          {project.assets.texts.length < EDITOR_LIMITS.TEXT.MAX_COUNT && (
            <ModernCard variant="elevated" size="lg">
              <h4 
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                  color: DESIGN_TOKENS.colors.neutral[800],
                  margin: `0 0 ${DESIGN_TOKENS.spacing[4]} 0`
                }}
              >
                新しいテキストを追加
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN_TOKENS.spacing[4] }}>
                <div>
                  <label 
                    style={{
                      display: 'block',
                      fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                      fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                      color: DESIGN_TOKENS.colors.neutral[700],
                      marginBottom: DESIGN_TOKENS.spacing[2]
                    }}
                  >
                    テキスト内容 ({textContent.length}/{EDITOR_LIMITS.TEXT.MAX_LENGTH})
                  </label>
                  <input
                    type="text"
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    maxLength={EDITOR_LIMITS.TEXT.MAX_LENGTH}
                    placeholder="テキストを入力..."
                    style={{
                      width: '100%',
                      padding: `${DESIGN_TOKENS.spacing[3]} ${DESIGN_TOKENS.spacing[4]}`,
                      fontSize: DESIGN_TOKENS.typography.fontSize.base,
                      backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                      border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                      borderRadius: DESIGN_TOKENS.borderRadius.md,
                      outline: 'none',
                      transition: `all ${DESIGN_TOKENS.animation.duration.normal} ${DESIGN_TOKENS.animation.easing.inOut}`
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = DESIGN_TOKENS.colors.primary[500];
                      e.target.style.boxShadow = `0 0 0 3px ${DESIGN_TOKENS.colors.primary[500]}20`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = DESIGN_TOKENS.colors.neutral[300];
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: DESIGN_TOKENS.spacing[4] }}>
                  <div>
                    <label 
                      style={{
                        display: 'block',
                        fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                        fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                        color: DESIGN_TOKENS.colors.neutral[700],
                        marginBottom: DESIGN_TOKENS.spacing[2]
                      }}
                    >
                      文字色
                    </label>
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      style={{
                        width: '100%',
                        height: '40px',
                        border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                        borderRadius: DESIGN_TOKENS.borderRadius.md,
                        cursor: 'pointer'
                      }}
                    />
                  </div>

                  <div>
                    <label 
                      style={{
                        display: 'block',
                        fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                        fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                        color: DESIGN_TOKENS.colors.neutral[700],
                        marginBottom: DESIGN_TOKENS.spacing[2]
                      }}
                    >
                      文字サイズ ({fontSize}px)
                    </label>
                    <input
                      type="range"
                      min={EDITOR_LIMITS.TEXT.MIN_FONT_SIZE}
                      max={EDITOR_LIMITS.TEXT.MAX_FONT_SIZE}
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label 
                      style={{
                        display: 'block',
                        fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                        fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                        color: DESIGN_TOKENS.colors.neutral[700],
                        marginBottom: DESIGN_TOKENS.spacing[2]
                      }}
                    >
                      フォントの太さ
                    </label>
                    <select
                      value={fontWeight}
                      onChange={(e) => setFontWeight(e.target.value as 'normal' | 'bold')}
                      style={{
                        width: '100%',
                        padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[3]}`,
                        fontSize: DESIGN_TOKENS.typography.fontSize.base,
                        backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                        border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                        borderRadius: DESIGN_TOKENS.borderRadius.md,
                        outline: 'none'
                      }}
                    >
                      <option value="normal">標準</option>
                      <option value="bold">太字</option>
                    </select>
                  </div>
                </div>

                {/* プレビュー */}
                <ModernCard variant="filled" size="sm">
                  <p 
                    style={{
                      fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                      color: DESIGN_TOKENS.colors.neutral[600],
                      margin: `0 0 ${DESIGN_TOKENS.spacing[2]} 0`
                    }}
                  >
                    プレビュー:
                  </p>
                  <div
                    style={{
                      fontSize: `${fontSize}px`,
                      color: textColor,
                      fontWeight: fontWeight,
                      fontFamily: 'Inter, sans-serif'
                    }}
                  >
                    {textContent || 'テキストのプレビュー'}
                  </div>
                </ModernCard>

                <ModernButton
                  variant="primary"
                  size="lg"
                  fullWidth
                  icon="✨"
                  onClick={addTextAsset}
                  disabled={!textContent.trim()}
                >
                  テキストを追加
                </ModernButton>
              </div>
            </ModernCard>
          )}

          {project.assets.texts.length >= EDITOR_LIMITS.TEXT.MAX_COUNT && (
            <ModernCard variant="filled" size="sm">
              <p 
                style={{
                  textAlign: 'center',
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  color: DESIGN_TOKENS.colors.neutral[600],
                  margin: 0
                }}
              >
                テキストは最大{EDITOR_LIMITS.TEXT.MAX_COUNT}個まで追加できます
              </p>
            </ModernCard>
          )}
        </div>
      )}

      {/* アップロード中オーバーレイ */}
      {uploading && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: DESIGN_TOKENS.zIndex.modal
          }}
        >
          <ModernCard variant="elevated" size="lg">
            <div style={{ textAlign: 'center' }}>
              <div 
                style={{
                  width: '48px',
                  height: '48px',
                  border: '4px solid transparent',
                  borderTop: `4px solid ${DESIGN_TOKENS.colors.primary[500]}`,
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: `0 auto ${DESIGN_TOKENS.spacing[4]} auto`
                }}
              />
              <p 
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                  color: DESIGN_TOKENS.colors.neutral[800],
                  margin: 0
                }}
              >
                画像を処理中...
              </p>
              <p 
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  color: DESIGN_TOKENS.colors.neutral[600],
                  margin: `${DESIGN_TOKENS.spacing[2]} 0 0 0`
                }}
              >
                少々お待ちください
              </p>
            </div>
          </ModernCard>
        </div>
      )}
    </div>
  );
};