// src/components/editor/script/BackgroundControl.tsx
// 背景制御サイドパネルコンポーネント

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GameProject } from '../../../types/editor/GameProject';
import { DESIGN_TOKENS } from '../../../constants/DesignSystem';

interface BackgroundControlProps {
  project: GameProject;
  onProjectUpdate: (project: GameProject) => void;
}

export const BackgroundControl: React.FC<BackgroundControlProps> = ({
  project,
  onProjectUpdate
}) => {
  const { t } = useTranslation();
  const [isButtonHover, setIsButtonHover] = useState(false);

  // 背景表示切り替え
  const toggleBackgroundVisibility = () => {
    const updatedScript = JSON.parse(JSON.stringify(project.script));
    updatedScript.layout.background.visible = !updatedScript.layout.background.visible;
    
    const updatedProject = {
      ...project,
      script: updatedScript,
      lastModified: new Date().toISOString()
    };
    
    onProjectUpdate(updatedProject);
    console.log('[BackgroundControl] 背景切り替え:', updatedScript.layout.background.visible);
  };

  // スタイル定義
  const containerStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '320px', // xl:w-80 相当
  };

  const boxStyle: React.CSSProperties = {
    backgroundColor: DESIGN_TOKENS.colors.success[50],
    borderRadius: DESIGN_TOKENS.borderRadius.lg,
    padding: DESIGN_TOKENS.spacing[4],
    border: `2px solid ${DESIGN_TOKENS.colors.success[200]}`,
  };

  const titleStyle: React.CSSProperties = {
    fontWeight: 600,
    color: DESIGN_TOKENS.colors.success[800],
    marginBottom: DESIGN_TOKENS.spacing[3],
    display: 'flex',
    alignItems: 'center',
  };

  const contentStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: DESIGN_TOKENS.spacing[3],
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.875rem',
    color: DESIGN_TOKENS.colors.success[600],
  };

  const getToggleButtonStyle = (): React.CSSProperties => {
    const isVisible = project.script.layout.background.visible;
    
    if (isVisible) {
      return {
        paddingLeft: DESIGN_TOKENS.spacing[4],
        paddingRight: DESIGN_TOKENS.spacing[4],
        paddingTop: DESIGN_TOKENS.spacing[2],
        paddingBottom: DESIGN_TOKENS.spacing[2],
        borderRadius: DESIGN_TOKENS.borderRadius.lg,
        fontWeight: 500,
        transition: 'background-color 0.2s ease-in-out',
        backgroundColor: isButtonHover ? DESIGN_TOKENS.colors.success[600] : DESIGN_TOKENS.colors.success[500],
        color: DESIGN_TOKENS.colors.neutral[0],
        border: 'none',
        cursor: 'pointer',
      };
    }

    return {
      paddingLeft: DESIGN_TOKENS.spacing[4],
      paddingRight: DESIGN_TOKENS.spacing[4],
      paddingTop: DESIGN_TOKENS.spacing[2],
      paddingBottom: DESIGN_TOKENS.spacing[2],
      borderRadius: DESIGN_TOKENS.borderRadius.lg,
      fontWeight: 500,
      transition: 'background-color 0.2s ease-in-out',
      backgroundColor: isButtonHover ? DESIGN_TOKENS.colors.neutral[400] : DESIGN_TOKENS.colors.neutral[300],
      color: DESIGN_TOKENS.colors.neutral[700],
      border: 'none',
      cursor: 'pointer',
    };
  };

  const infoTextStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    color: DESIGN_TOKENS.colors.success[600],
  };

  const hintsBoxStyle: React.CSSProperties = {
    marginTop: DESIGN_TOKENS.spacing[4],
    padding: DESIGN_TOKENS.spacing[3],
    backgroundColor: DESIGN_TOKENS.colors.success[100],
    borderRadius: DESIGN_TOKENS.borderRadius.md,
    fontSize: '0.75rem',
    color: DESIGN_TOKENS.colors.success[600],
  };

  return (
    <div style={containerStyle}>
      <div style={boxStyle}>
        <h4 style={titleStyle}>
          🌄 {t('editor.script.backgroundControl.title')}
        </h4>

        <div style={contentStyle}>
          <div style={rowStyle}>
            <span style={labelStyle}>{t('editor.script.backgroundControl.visibility')}:</span>
            <button
              onClick={toggleBackgroundVisibility}
              onMouseEnter={() => setIsButtonHover(true)}
              onMouseLeave={() => setIsButtonHover(false)}
              style={getToggleButtonStyle()}
            >
              {project.script.layout.background.visible ? t('common.on') : t('common.off')}
            </button>
          </div>

          <div style={infoTextStyle}>
            {project.assets.background ? (
              <>
                📁 {project.assets.background.name}<br/>
                📏 {project.assets.background.frames[0]?.width}×{project.assets.background.frames[0]?.height}px<br/>
                🖼️ {project.assets.background.frames.length}{t('editor.script.backgroundControl.frames')}
              </>
            ) : (
              t('editor.script.backgroundControl.noBackground')
            )}
          </div>

          {/* 状態説明 */}
          <div style={hintsBoxStyle}>
            💡 <strong>{t('editor.script.backgroundControl.hints.title')}</strong><br/>
            • {t('editor.script.backgroundControl.hints.addAssets')}<br/>
            • {t('editor.script.backgroundControl.hints.dragDrop')}<br/>
            • {t('editor.script.backgroundControl.hints.clickRule')}<br/>
            • {t('editor.script.backgroundControl.hints.colorBorder')}
          </div>
        </div>
      </div>
    </div>
  );
};