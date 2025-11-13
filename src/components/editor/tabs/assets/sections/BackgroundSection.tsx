// src/components/editor/tabs/assets/sections/BackgroundSection.tsx
// 🔧 Phase E-1: 背景管理セクション分離
import React from 'react';
import { GameProject } from '../../../../../types/editor/GameProject';
import { EDITOR_LIMITS } from '../../../../../constants/EditorLimits';
import { DESIGN_TOKENS } from '../../../../../constants/DesignSystem';
import { ModernButton } from '../../../../ui/ModernButton';
import { ModernCard } from '../../../../ui/ModernCard';
import { DragDropZone, FileProcessingResult } from '../../../../ui/DragDropZone';
import { useAssetUpload } from '../../../../../hooks/editor/useAssetUpload';
import { useNotification } from '../../../../../hooks/editor/useNotification';

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
              <div className="mt-2 flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded ${
                  project.script.layout.background.visible
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {project.script.layout.background.visible ? '✅ 表示中' : '❌ 非表示'}
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
                  サイズ: {((project.assets.background.defaultScale || 1.0) * 100).toFixed(0)}%
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
          <li>追加すると自動的に表示設定されます</li>
          <li><strong>🎬 将来対応予定:</strong> 複数フレーム・アニメーション背景</li>
        </ul>
      </ModernCard>
    </div>
  );
};