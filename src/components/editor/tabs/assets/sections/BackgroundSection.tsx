// src/components/editor/tabs/assets/sections/BackgroundSection.tsx
// 🔧 Phase E-1: 背景管理セクション分離
import React from 'react';
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

export const BackgroundSection: React.FC<BackgroundSectionProps> = ({
  project,
  onProjectUpdate
}) => {
  const { t } = useTranslation();
  const { uploading, uploadImageFiles, deleteAsset } = useAssetUpload(project, onProjectUpdate);
  const { showSuccess, showError } = useNotification();

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

  return (
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