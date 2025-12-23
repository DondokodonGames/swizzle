// src/components/editor/tabs/assets/sections/BackgroundSection.tsx
// 🔧 Phase 3-3 Item 2: 背景設定の仕様統一（完全版v2）
// プレビュー3倍拡大（240×432px） + サイズ%表示
// ✅ TypeScriptエラー修正: loop/pingpong プロパティ削除
import React, { useRef, useState } from 'react';
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
  
  // フレーム選択UIの表示状態
  const [showFrameSelector, setShowFrameSelector] = useState(false);

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

  // 背景画像差し替え処理
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

  // 🆕 背景defaultScale更新（%表示対応）
  const updateBackgroundScale = (value: string) => {
    const percent = parseFloat(value);
    if (isNaN(percent) || percent < 10 || percent > 500) return;
    
    // %を倍率に変換（100% = 1.0倍）
    const scale = percent / 100;

    const updatedAssets = {
      ...project.assets,
      background: {
        ...project.assets.background!,
        defaultScale: scale
      }
    };
    onProjectUpdate({
      ...project,
      assets: updatedAssets,
      lastModified: new Date().toISOString()
    });
  };

  // ✅ 修正: loop/pingpong を型定義から削除
  // 背景アニメーション設定更新
  const updateBackgroundAnimation = (updates: {
    animationSpeed?: number;
    autoStart?: boolean;
    initialAnimation?: number;
  }) => {
    if (!project.script?.layout?.background) return;

    const updatedScript = {
      ...project.script,
      layout: {
        ...project.script.layout,
        background: {
          ...project.script.layout.background,
          ...updates
        }
      }
    };

    onProjectUpdate({
      ...project,
      script: updatedScript,
      lastModified: new Date().toISOString()
    });
  };

  // アニメーション速度更新
  const handleAnimationSpeedChange = (value: string) => {
    const speed = parseInt(value);
    if (isNaN(speed) || speed < 0 || speed > 60) return;
    updateBackgroundAnimation({ animationSpeed: speed });
  };

  // フレーム変更（前へ/次へ）
  const changeFrame = (direction: 'prev' | 'next') => {
    const currentFrame = project.script?.layout?.background?.initialAnimation || 0;
    const maxFrame = 3; // 0～3の4フレーム
    
    let newFrame: number;
    if (direction === 'prev') {
      newFrame = currentFrame > 0 ? currentFrame - 1 : maxFrame;
    } else {
      newFrame = currentFrame < maxFrame ? currentFrame + 1 : 0;
    }
    
    updateBackgroundAnimation({ initialAnimation: newFrame });
    showSuccess(`フレーム ${newFrame} に変更しました`);
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
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: DESIGN_TOKENS.spacing[4] }}>
            {/* 🆕 画像プレビュー 3倍拡大（240×432px） + フレーム選択オーバーレイ */}
            <div 
              style={{ 
                position: 'relative',
                width: '360px',
                height: '640px',
                flexShrink: 0
              }}
              onMouseEnter={() => setShowFrameSelector(true)}
              onMouseLeave={() => setShowFrameSelector(false)}
            >
              <img
                src={project.assets.background.frames[0]?.storageUrl || project.assets.background.frames[0]?.dataUrl}
                alt={t('editor.assets.backgroundImage')}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: DESIGN_TOKENS.borderRadius.md,
                  border: `1px solid ${DESIGN_TOKENS.colors.neutral[200]}`
                }}
              />
              
              {/* フレーム番号表示 */}
              <div style={{
                position: 'absolute',
                top: DESIGN_TOKENS.spacing[2],
                right: DESIGN_TOKENS.spacing[2],
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[2]}`,
                borderRadius: DESIGN_TOKENS.borderRadius.sm,
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.bold
              }}>
                フレーム {project.script?.layout?.background?.initialAnimation || 0}
              </div>

              {/* 左右ボタンオーバーレイ */}
              {showFrameSelector && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 12px',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: DESIGN_TOKENS.borderRadius.md,
                  boxSizing: 'border-box'
                }}>
                  {/* 前へボタン */}
                  <button
                    onClick={() => changeFrame('prev')}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'white';
                      e.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    title="前のフレーム"
                  >
                    ◀
                  </button>

                  {/* 次へボタン */}
                  <button
                    onClick={() => changeFrame('next')}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'white';
                      e.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    title="次のフレーム"
                  >
                    ▶
                  </button>
                </div>
              )}
            </div>

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
              <div style={{ marginTop: DESIGN_TOKENS.spacing[2], display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[2] }}>
                <span
                  style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                    padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[2]}`,
                    borderRadius: DESIGN_TOKENS.borderRadius.sm,
                    backgroundColor: project.script?.layout?.background?.visible
                      ? DESIGN_TOKENS.colors.success[100]
                      : DESIGN_TOKENS.colors.error[200],
                    color: project.script?.layout?.background?.visible
                      ? DESIGN_TOKENS.colors.success[600]
                      : DESIGN_TOKENS.colors.error[600]
                  }}
                >
                  {project.script?.layout?.background?.visible ? t('editor.assets.backgroundVisible') : t('editor.assets.backgroundHidden')}
                </span>
              </div>

              {/* 🆕 サイズ調整（%表示） */}
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
                  📏 {t('editor.assets.size')}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[2] }}>
                  <input
                    type="number"
                    min="10"
                    max="500"
                    step="10"
                    value={Math.round((project.assets.background.defaultScale || 1.0) * 100)}
                    onChange={(e) => updateBackgroundScale(e.target.value)}
                    style={{
                      width: '80px',
                      padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[2]}`,
                      border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                      borderRadius: DESIGN_TOKENS.borderRadius.md,
                      fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                      textAlign: 'center'
                    }}
                  />
                  <span style={{ 
                    fontSize: DESIGN_TOKENS.typography.fontSize.xs, 
                    color: DESIGN_TOKENS.colors.neutral[500] 
                  }}>
                    % (10～500%, 推奨: 100%)
                  </span>
                </div>
              </div>

              {/* 背景アニメーション設定 */}
              {project.script?.layout?.background && (
                <div style={{ 
                  marginTop: DESIGN_TOKENS.spacing[4],
                  paddingTop: DESIGN_TOKENS.spacing[3],
                  borderTop: `1px solid ${DESIGN_TOKENS.colors.neutral[200]}`
                }}>
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
                      ⚡ {t('editor.assets.speed')}
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[2] }}>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={project.script.layout.background.animationSpeed}
                        onChange={(e) => handleAnimationSpeedChange(e.target.value)}
                        style={{
                          width: '80px',
                          padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[2]}`,
                          border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                          borderRadius: DESIGN_TOKENS.borderRadius.md,
                          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                          textAlign: 'center'
                        }}
                      />
                      <span style={{ 
                        fontSize: DESIGN_TOKENS.typography.fontSize.xs, 
                        color: DESIGN_TOKENS.colors.neutral[500] 
                      }}>
                        fps (0=ルール制御のみ, 推奨: 12)
                      </span>
                    </div>
                  </div>

                  {/* アニメーション制御チェックボックス */}
                  <div style={{ 
                    marginBottom: DESIGN_TOKENS.spacing[3],
                    display: 'flex',
                    flexDirection: 'column',
                    gap: DESIGN_TOKENS.spacing[2]
                  }}>
                    {/* 自動再生 */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[2] }}>
                      <input
                        type="checkbox"
                        checked={project.script.layout.background.autoStart || false}
                        onChange={(e) => updateBackgroundAnimation({ 
                          autoStart: e.target.checked 
                        })}
                        style={{
                          width: '16px',
                          height: '16px',
                          cursor: 'pointer'
                        }}
                      />
                      <span style={{ 
                        fontSize: DESIGN_TOKENS.typography.fontSize.xs, 
                        color: DESIGN_TOKENS.colors.neutral[700] 
                      }}>
                        ▶️ 自動再生（ゲーム開始時に自動でアニメーション開始）
                      </span>
                    </label>

                    {/* ✅ 削除: ループ再生チェックボックス（loop プロパティが存在しない） */}
                    {/* ✅ 削除: 往復再生チェックボックス（pingpong プロパティが存在しない） */}
                  </div>

                  {/* ✅ 修正: アニメーション設定の説明文からloop/pingpong関連を削除 */}
                  <div style={{
                    marginTop: DESIGN_TOKENS.spacing[3],
                    padding: DESIGN_TOKENS.spacing[2],
                    backgroundColor: DESIGN_TOKENS.colors.primary[50],
                    borderRadius: DESIGN_TOKENS.borderRadius.md,
                    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                    color: DESIGN_TOKENS.colors.primary[700],
                    lineHeight: DESIGN_TOKENS.typography.lineHeight.relaxed
                  }}>
                    💡 <strong>アニメーション設定について</strong><br />
                    • フレーム選択: 画像にマウスを重ねると左右ボタンが表示されます<br />
                    • 速度0: ルールによる制御のみ（自動アニメーションなし）<br />
                    • 自動再生: ゲーム開始時にアニメーションが自動的に開始されます
                  </div>
                </div>
              )}
            </div>
            
            {/* ボタングループ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN_TOKENS.spacing[2], flexShrink: 0 }}>
              {/* 差し替えボタン */}
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
                width: '360px',
                height: '640px',
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
          <li><strong>🎬 アニメーション</strong>: 画像にマウスを重ねると左右ボタンでフレーム切り替え</li>
          <li><strong>📏 サイズ設定</strong>: %表示で10～500%の範囲で設定（推奨: 100%）</li>
          <li><strong>⚡ アニメーション速度</strong>: 0～60fps（0=ルール制御のみ、推奨: 12fps）</li>
          <li><strong>{t('editor.assets.backgroundHints.future')}</strong></li>
        </ul>
      </ModernCard>
    </div>
  );
};