// src/components/editor/tabs/assets/sections/BackgroundSection.tsx
// 🔧 Phase E-1: 背景管理セクション分離 + 画像差し替え機能追加
import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { GameProject } from '../../../../../types/editor/GameProject';
import { EDITOR_LIMITS } from '../../../../../constants/EditorLimits';
import { DESIGN_TOKENS } from '../../../../../constants/DesignSystem';
import { ModernButton } from '../../../../ui/ModernButton';
import { ModernCard } from '../../../../ui/ModernCard';
import { DragDropZone, FileProcessingResult } from '../../../../ui/DragDropZone';
import { useAssetUpload } from '../../../../../hooks/editor/useAssetUpload';
import { useNotification } from '../../../../../hooks/editor/useNotification';

// Type guard for color background
type ColorBackground = { type: 'color'; value: string };

interface BackgroundSectionProps {
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
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
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

export const BackgroundSection: React.FC<BackgroundSectionProps> = ({
  project,
  onProjectUpdate
}) => {
  const { t } = useTranslation();
  const { uploading, uploadImageFiles, deleteAsset } = useAssetUpload(project, onProjectUpdate);
  const { showSuccess, showError } = useNotification();
  
  // 差し替え用の隠しinput参照
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // 背景ファイルアップロード処理
  const handleBackgroundUpload = async (results: FileProcessingResult[]) => {
    const result = await uploadImageFiles(results, {
      type: 'background',
      maxFiles: 1,
      maxSize: EDITOR_LIMITS.IMAGE.BACKGROUND_FRAME_MAX_SIZE,
      optimizeImages: true
    });

    if (result.success) {
      showSuccess(result.message);
    } else {
      showError(result.message);
    }
  };

  // 背景削除処理
  const handleBackgroundDelete = () => {
    const result = deleteAsset('background');
    if (result.success) {
      showSuccess(result.message);
    } else {
      showError(result.message);
    }
  };

  // 🔄 背景画像差し替え処理
  const handleBackgroundReplace = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ファイルタイプチェック
    if (!file.type.startsWith('image/')) {
      showError(t('errors.onlyImagesAllowed'));
      return;
    }

    // サイズチェック
    if (file.size > EDITOR_LIMITS.IMAGE.BACKGROUND_FRAME_MAX_SIZE) {
      showError(t('errors.fileSizeTooLarge', { fileName: file.name }));
      return;
    }

    try {
      const now = new Date().toISOString();
      
      // 画像最適化
      const optimized = await optimizeImage(file, 1080, 1920, 0.85);
      
      // Base64変換
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        
        if (!project.assets.background || !('frames' in project.assets.background)) {
          showError(t('editor.assets.errors.backgroundNotFound'));
          return;
        }

        // 既存の背景設定を維持しつつ、画像のみ差し替え
        const updatedBackground = {
          ...project.assets.background,
          frames: [{
            ...project.assets.background.frames[0],
            dataUrl,
            originalName: file.name,
            fileSize: optimized.size,
            uploadedAt: now
          }],
          totalSize: optimized.size,
          lastModified: now
        };

        // 統計更新
        const updatedAssets = {
          ...project.assets,
          background: updatedBackground
        };

        const imageSize = (updatedBackground.totalSize || 0) + 
                         project.assets.objects.reduce((sum, obj) => sum + obj.totalSize, 0);
        const audioSize = (project.assets.audio?.bgm?.fileSize || 0) + 
                         (project.assets.audio?.se?.reduce((sum, se) => sum + se.fileSize, 0) || 0);

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

        showSuccess(t('editor.assets.backgroundReplaced'));
      };

      reader.onerror = () => {
        showError(t('errors.fileReadFailed'));
      };

      reader.readAsDataURL(optimized);
    } catch (error) {
      console.error('背景差し替えエラー:', error);
      showError(t('editor.assets.errors.backgroundReplaceFailed'));
    }

    // inputをリセット（同じファイルを再選択可能に）
    if (replaceInputRef.current) {
      replaceInputRef.current.value = '';
    }
  };

  // 差し替えボタンクリック
  const triggerReplaceInput = () => {
    replaceInputRef.current?.click();
  };

  return (
    <div>
      {/* 隠しファイル入力（差し替え用） */}
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleBackgroundReplace}
      />

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
          🖼️ {t('editor.assets.background')}
          <span
            style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              color: DESIGN_TOKENS.colors.neutral[500],
              fontWeight: DESIGN_TOKENS.typography.fontWeight.normal
            }}
          >
            {t('editor.assets.backgroundLimit')}
          </span>
        </h3>
      </div>

      {project.assets.background && 'frames' in project.assets.background && project.assets.background.frames ? (
        <ModernCard variant="elevated" size="md" style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[4] }}>
            <img
              src={project.assets.background.frames[0]?.dataUrl}
              alt={t('editor.assets.backgroundImage')}
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
                {project.assets.background.name || t('editor.assets.backgroundImage')}
              </h4>
              <p
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  color: DESIGN_TOKENS.colors.neutral[500],
                  margin: `0 0 ${DESIGN_TOKENS.spacing[1]} 0`
                }}
              >
                {project.assets.background.frames[0]?.width || 0}×{project.assets.background.frames[0]?.height || 0}px
              </p>
              <p
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  color: DESIGN_TOKENS.colors.neutral[500],
                  margin: 0
                }}
              >
                {formatFileSize(project.assets.background.totalSize || 0)}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded ${
                  project.script?.layout?.background?.visible
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {project.script?.layout?.background?.visible ? t('editor.assets.backgroundVisible') : t('editor.assets.backgroundHidden')}
                </span>
              </div>

              {/* サイズ調整スライダー */}
              <div style={{ marginTop: DESIGN_TOKENS.spacing[3] }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                    fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                    color: DESIGN_TOKENS.colors.neutral[700],
                    marginBottom: DESIGN_TOKENS.spacing[1]
                  }}
                >
                  {t('editor.assets.size')}: {((project.assets.background.defaultScale || 1.0) * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="300"
                  step="10"
                  value={(project.assets.background.defaultScale || 1.0) * 100}
                  onChange={(e) => {
                    const scale = parseInt(e.target.value) / 100;
                    const updatedAssets = {
                      ...project.assets,
                      background: {
                        ...project.assets.background!,
                        defaultScale: scale
                      }
                    };
                    onProjectUpdate({
                      ...project,
                      assets: updatedAssets
                    });
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
            </div>
            
            {/* ボタングループ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN_TOKENS.spacing[2] }}>
              {/* 🔄 差し替えボタン */}
              <ModernButton
                variant="secondary"
                size="sm"
                icon="🔄"
                onClick={triggerReplaceInput}
                disabled={uploading}
              >
                {t('editor.assets.replaceImage')}
              </ModernButton>
              
              {/* 削除ボタン */}
              <ModernButton
                variant="error"
                size="sm"
                icon="🗑️"
                onClick={handleBackgroundDelete}
                disabled={uploading}
              >
                {t('common.delete')}
              </ModernButton>
            </div>
          </div>
        </ModernCard>
      ) : project.assets.background && 'type' in project.assets.background && project.assets.background.type === 'color' ? (
        <ModernCard variant="elevated" size="md" style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[4] }}>
            <div
              style={{
                width: '80px',
                height: '144px',
                backgroundColor: (project.assets.background as unknown as ColorBackground).value,
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
                {t('editor.assets.backgroundColor')}
              </h4>
              <p
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  color: DESIGN_TOKENS.colors.neutral[500],
                  margin: 0
                }}
              >
                {(project.assets.background as unknown as ColorBackground).value}
              </p>
            </div>
            <ModernButton
              variant="error"
              size="sm"
              icon="🗑️"
              onClick={handleBackgroundDelete}
              disabled={uploading}
            >
              {t('common.delete')}
            </ModernButton>
          </div>
        </ModernCard>
      ) : (
        <DragDropZone
          accept={['image/*']}
          maxFiles={1}
          maxSize={EDITOR_LIMITS.IMAGE.BACKGROUND_FRAME_MAX_SIZE}
          variant="large"
          title={t('editor.assets.uploadBackground')}
          description={t('editor.assets.dragDropImage')}
          buttonText={t('editor.assets.selectFile')}
          onFilesDrop={handleBackgroundUpload}
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
          💡 {t('editor.assets.backgroundHints.title')}
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
          <li>{t('editor.assets.backgroundHints.ratio')}</li>
          <li>{t('editor.assets.backgroundHints.maxSize', { size: formatFileSize(EDITOR_LIMITS.IMAGE.BACKGROUND_FRAME_MAX_SIZE) })}</li>
          <li>{t('editor.assets.backgroundHints.optimization')}</li>
          <li>{t('editor.assets.backgroundHints.autoShow')}</li>
          <li><strong>{t('editor.assets.backgroundHints.future')}</strong></li>
        </ul>
      </ModernCard>
    </div>
  );
};