import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GameProject } from '../../../types/editor/GameProject';
import { EDITOR_LIMITS } from '../../../constants/EditorLimits';
import { DESIGN_TOKENS } from '../../../constants/DesignSystem';

export interface ProjectCardProps {
  project: GameProject;
  onSelect: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onExport?: () => void;
  showActions?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onSelect,
  onDelete,
  onDuplicate,
  onExport,
  showActions = true,
  size = 'medium',
  className = ''
}) => {
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isCardHover, setIsCardHover] = useState(false);
  const [isButtonHover, setIsButtonHover] = useState(false);
  const [isMenuButtonHover, setIsMenuButtonHover] = useState(false);
  const [hoveredMenuItem, setHoveredMenuItem] = useState<string | null>(null);

  /**
   * サイズに応じたスタイルを取得
   */
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: { borderRadius: DESIGN_TOKENS.borderRadius.xl },
          thumbnail: { height: '96px' },
          padding: DESIGN_TOKENS.spacing[3],
          title: { fontSize: '0.875rem', fontWeight: 600 },
          description: { fontSize: '0.75rem' },
          stats: { fontSize: '0.75rem' },
          button: { paddingTop: DESIGN_TOKENS.spacing[2], paddingBottom: DESIGN_TOKENS.spacing[2], fontSize: '0.875rem' }
        };
      case 'large':
        return {
          container: { borderRadius: '16px' },
          thumbnail: { height: '160px' },
          padding: DESIGN_TOKENS.spacing[6],
          title: { fontSize: '1.125rem', fontWeight: 600 },
          description: { fontSize: '0.875rem' },
          stats: { fontSize: '0.875rem' },
          button: { paddingTop: DESIGN_TOKENS.spacing[4], paddingBottom: DESIGN_TOKENS.spacing[4], fontSize: '1rem' }
        };
      case 'medium':
      default:
        return {
          container: { borderRadius: '16px' },
          thumbnail: { height: '128px' },
          padding: DESIGN_TOKENS.spacing[4],
          title: { fontSize: '1rem', fontWeight: 600 },
          description: { fontSize: '0.875rem' },
          stats: { fontSize: '0.75rem' },
          button: { paddingTop: DESIGN_TOKENS.spacing[3], paddingBottom: DESIGN_TOKENS.spacing[3], fontSize: '0.875rem' }
        };
    }
  };

  const sizeStyles = getSizeStyles();

  const lastModified = new Date(project.lastModified);
  const isRecent = Date.now() - lastModified.getTime() < 24 * 60 * 60 * 1000;

  const stats = {
    objects: project.assets.objects.length,
    sounds: (project.assets.audio?.se?.length || 0) + (project.assets.audio?.bgm ? 1 : 0),
    rules: project.script.rules.length,
    totalSize: project.totalSize || 0
  };

  const sizeInMB = (stats.totalSize / 1024 / 1024).toFixed(1);
  const sizePercentage = (stats.totalSize / EDITOR_LIMITS.PROJECT.TOTAL_MAX_SIZE) * 100;

  const statusConfig = {
    published: { 
      label: t('editor.selector.projectCard.status.published'), 
      bgColor: DESIGN_TOKENS.colors.success[100], 
      textColor: DESIGN_TOKENS.colors.success[800] 
    },
    testing: { 
      label: t('editor.selector.projectCard.status.testing'), 
      bgColor: DESIGN_TOKENS.colors.primary[100], 
      textColor: DESIGN_TOKENS.colors.primary[800] 
    },
    draft: { 
      label: t('editor.selector.projectCard.status.draft'), 
      bgColor: DESIGN_TOKENS.colors.neutral[100], 
      textColor: DESIGN_TOKENS.colors.neutral[800] 
    }
  } as const;

  const status = statusConfig[project.status as keyof typeof statusConfig] || statusConfig.draft;

  const completionScore = Math.round(
    (stats.objects > 0 ? 25 : 0) +
    (stats.sounds > 0 ? 25 : 0) +
    (stats.rules > 0 ? 25 : 0) +
    (project.name.trim().length > 0 ? 25 : 0)
  );

  // 容量バーの色を取得
  const getCapacityBarColor = () => {
    if (sizePercentage > 90) return DESIGN_TOKENS.colors.error[500];
    if (sizePercentage > 70) return DESIGN_TOKENS.colors.warning[500];
    return DESIGN_TOKENS.colors.success[500];
  };

  // スタイル定義
  const containerStyle: React.CSSProperties = {
    backgroundColor: DESIGN_TOKENS.colors.neutral[0],
    boxShadow: isCardHover ? DESIGN_TOKENS.shadows.xl : DESIGN_TOKENS.shadows.lg,
    border: `1px solid ${DESIGN_TOKENS.colors.neutral[200]}`,
    transition: 'all 0.3s ease-in-out',
    overflow: 'hidden',
    cursor: 'pointer',
    position: 'relative',
    ...sizeStyles.container,
  };

  const thumbnailContainerStyle: React.CSSProperties = {
    background: `linear-gradient(to bottom right, ${DESIGN_TOKENS.colors.purple[100]}, ${DESIGN_TOKENS.colors.error[50]})`,
    position: 'relative',
    ...sizeStyles.thumbnail,
  };

  const thumbnailImageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  };

  const thumbnailPlaceholderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  };

  const placeholderContentStyle: React.CSSProperties = {
    textAlign: 'center',
  };

  const statusBadgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: DESIGN_TOKENS.spacing[2],
    left: DESIGN_TOKENS.spacing[2],
    paddingLeft: DESIGN_TOKENS.spacing[2],
    paddingRight: DESIGN_TOKENS.spacing[2],
    paddingTop: DESIGN_TOKENS.spacing[1],
    paddingBottom: DESIGN_TOKENS.spacing[1],
    borderRadius: DESIGN_TOKENS.borderRadius.full,
    fontSize: '0.75rem',
    fontWeight: 500,
    backgroundColor: status.bgColor,
    color: status.textColor,
  };

  const newBadgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: DESIGN_TOKENS.spacing[2],
    right: DESIGN_TOKENS.spacing[2],
    paddingLeft: DESIGN_TOKENS.spacing[2],
    paddingRight: DESIGN_TOKENS.spacing[2],
    paddingTop: DESIGN_TOKENS.spacing[1],
    paddingBottom: DESIGN_TOKENS.spacing[1],
    backgroundColor: DESIGN_TOKENS.colors.warning[100],
    color: DESIGN_TOKENS.colors.warning[800],
    borderRadius: DESIGN_TOKENS.borderRadius.full,
    fontSize: '0.75rem',
    fontWeight: 500,
  };

  const completionBadgeStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: DESIGN_TOKENS.spacing[2],
    left: DESIGN_TOKENS.spacing[2],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    color: DESIGN_TOKENS.colors.neutral[0],
    paddingLeft: DESIGN_TOKENS.spacing[2],
    paddingRight: DESIGN_TOKENS.spacing[2],
    paddingTop: DESIGN_TOKENS.spacing[1],
    paddingBottom: DESIGN_TOKENS.spacing[1],
    borderRadius: DESIGN_TOKENS.borderRadius.full,
    fontSize: '0.75rem',
  };

  const menuButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: DESIGN_TOKENS.spacing[2],
    right: DESIGN_TOKENS.spacing[2],
    backgroundColor: isMenuButtonHover ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.8)',
    padding: DESIGN_TOKENS.spacing[2],
    borderRadius: DESIGN_TOKENS.borderRadius.full,
    transition: 'all 0.2s ease-in-out',
    border: 'none',
    cursor: 'pointer',
  };

  const dropdownMenuStyle: React.CSSProperties = {
    position: 'absolute',
    right: 0,
    top: '40px',
    backgroundColor: DESIGN_TOKENS.colors.neutral[0],
    borderRadius: DESIGN_TOKENS.borderRadius.lg,
    boxShadow: DESIGN_TOKENS.shadows.lg,
    border: `1px solid ${DESIGN_TOKENS.colors.neutral[200]}`,
    paddingTop: DESIGN_TOKENS.spacing[1],
    paddingBottom: DESIGN_TOKENS.spacing[1],
    minWidth: '120px',
    zIndex: 10,
  };

  const getMenuItemStyle = (itemKey: string, isDanger: boolean = false): React.CSSProperties => ({
    width: '100%',
    paddingLeft: DESIGN_TOKENS.spacing[3],
    paddingRight: DESIGN_TOKENS.spacing[3],
    paddingTop: DESIGN_TOKENS.spacing[2],
    paddingBottom: DESIGN_TOKENS.spacing[2],
    textAlign: 'left',
    fontSize: '0.875rem',
    color: isDanger ? DESIGN_TOKENS.colors.error[600] : DESIGN_TOKENS.colors.neutral[700],
    backgroundColor: hoveredMenuItem === itemKey 
      ? (isDanger ? DESIGN_TOKENS.colors.error[50] : DESIGN_TOKENS.colors.neutral[100])
      : 'transparent',
    display: 'flex',
    alignItems: 'center',
    gap: DESIGN_TOKENS.spacing[2],
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease-in-out',
  });

  const infoContainerStyle: React.CSSProperties = {
    padding: sizeStyles.padding,
  };

  const titleStyle: React.CSSProperties = {
    color: DESIGN_TOKENS.colors.neutral[800],
    marginBottom: DESIGN_TOKENS.spacing[2],
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    ...sizeStyles.title,
  };

  const descriptionStyle: React.CSSProperties = {
    color: DESIGN_TOKENS.colors.neutral[600],
    marginBottom: DESIGN_TOKENS.spacing[3],
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    ...sizeStyles.description,
  };

  const statsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: DESIGN_TOKENS.spacing[2],
    marginBottom: DESIGN_TOKENS.spacing[3],
    color: DESIGN_TOKENS.colors.neutral[500],
    ...sizeStyles.stats,
  };

  const statItemStyle: React.CSSProperties = {
    textAlign: 'center',
  };

  const statValueStyle: React.CSSProperties = {
    fontWeight: 500,
    color: DESIGN_TOKENS.colors.neutral[700],
  };

  const capacityContainerStyle: React.CSSProperties = {
    marginBottom: DESIGN_TOKENS.spacing[3],
  };

  const capacityHeaderStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    color: DESIGN_TOKENS.colors.neutral[500],
    marginBottom: DESIGN_TOKENS.spacing[1],
    ...sizeStyles.stats,
  };

  const capacityBarBgStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: DESIGN_TOKENS.colors.neutral[200],
    borderRadius: DESIGN_TOKENS.borderRadius.full,
    height: '8px',
    overflow: 'hidden',
  };

  const capacityBarFillStyle: React.CSSProperties = {
    height: '8px',
    borderRadius: DESIGN_TOKENS.borderRadius.full,
    transition: 'all 0.3s ease-in-out',
    backgroundColor: getCapacityBarColor(),
    width: `${Math.min(sizePercentage, 100)}%`,
  };

  const lastModifiedStyle: React.CSSProperties = {
    color: DESIGN_TOKENS.colors.neutral[500],
    marginBottom: DESIGN_TOKENS.spacing[4],
    ...sizeStyles.stats,
  };

  const getEditButtonStyle = (): React.CSSProperties => ({
    width: '100%',
    background: isButtonHover
      ? `linear-gradient(to right, ${DESIGN_TOKENS.colors.purple[600]}, ${DESIGN_TOKENS.colors.error[600]})`
      : `linear-gradient(to right, ${DESIGN_TOKENS.colors.purple[500]}, ${DESIGN_TOKENS.colors.error[500]})`,
    color: DESIGN_TOKENS.colors.neutral[0],
    borderRadius: DESIGN_TOKENS.borderRadius.xl,
    fontWeight: 500,
    transition: 'all 0.2s ease-in-out',
    transform: isButtonHover ? 'scale(1.05)' : 'scale(1)',
    border: 'none',
    cursor: 'pointer',
    ...sizeStyles.button,
  });

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 0,
  };

  return (
    <div 
      style={containerStyle}
      onMouseEnter={() => setIsCardHover(true)}
      onMouseLeave={() => setIsCardHover(false)}
      className={className}
    >
      {/* サムネイル/プレビューエリア */}
      <div 
        style={thumbnailContainerStyle}
        onClick={onSelect}
      >
        {project.thumbnailDataUrl && !imageError ? (
          <img 
            src={project.thumbnailDataUrl} 
            alt={project.name}
            style={thumbnailImageStyle}
            onError={() => setImageError(true)}
          />
        ) : (
          <div style={thumbnailPlaceholderStyle}>
            <div style={placeholderContentStyle}>
              <div style={{ fontSize: '1.875rem', marginBottom: DESIGN_TOKENS.spacing[1] }}>🎮</div>
              <div style={{ fontSize: '0.75rem', color: DESIGN_TOKENS.colors.neutral[500] }}>
                {imageError ? t('editor.selector.projectCard.errors.thumbnailError') : t('editor.selector.projectCard.errors.noThumbnail')}
              </div>
            </div>
          </div>
        )}

        {/* ステータスバッジ */}
        <div style={statusBadgeStyle}>
          {status.label}
        </div>

        {/* NEWバッジ */}
        {isRecent && (
          <div style={newBadgeStyle}>
            {t('editor.selector.projectCard.new')}
          </div>
        )}

        {/* 完成度バッジ */}
        <div style={completionBadgeStyle}>
          {t('editor.selector.projectCard.completion', { percent: completionScore })}
        </div>

        {/* アクションメニュー */}
        {showActions && (onDelete || onDuplicate || onExport) && (
          <div style={{ position: 'absolute', top: DESIGN_TOKENS.spacing[2], right: DESIGN_TOKENS.spacing[2] }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              onMouseEnter={() => setIsMenuButtonHover(true)}
              onMouseLeave={() => setIsMenuButtonHover(false)}
              style={menuButtonStyle}
            >
              ⋮
            </button>
            
            {/* ドロップダウンメニュー */}
            {showMenu && (
              <div style={dropdownMenuStyle}>
                {onDuplicate && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate();
                      setShowMenu(false);
                    }}
                    onMouseEnter={() => setHoveredMenuItem('duplicate')}
                    onMouseLeave={() => setHoveredMenuItem(null)}
                    style={getMenuItemStyle('duplicate')}
                  >
                    <span>📋</span>
                    <span>{t('editor.selector.projectCard.duplicate')}</span>
                  </button>
                )}
                {onExport && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onExport();
                      setShowMenu(false);
                    }}
                    onMouseEnter={() => setHoveredMenuItem('export')}
                    onMouseLeave={() => setHoveredMenuItem(null)}
                    style={getMenuItemStyle('export')}
                  >
                    <span>📤</span>
                    <span>{t('editor.selector.projectCard.export')}</span>
                  </button>
                )}
                {onDelete && (
                  <>
                    {(onDuplicate || onExport) && (
                      <hr style={{ 
                        margin: `${DESIGN_TOKENS.spacing[1]} 0`,
                        border: 'none',
                        borderTop: `1px solid ${DESIGN_TOKENS.colors.neutral[200]}`
                      }} />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(t('editor.selector.projectCard.confirmDelete', { name: project.name }))) {
                          onDelete();
                        }
                        setShowMenu(false);
                      }}
                      onMouseEnter={() => setHoveredMenuItem('delete')}
                      onMouseLeave={() => setHoveredMenuItem(null)}
                      style={getMenuItemStyle('delete', true)}
                    >
                      <span>🗑️</span>
                      <span>{t('common.delete')}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* プロジェクト情報 */}
      <div style={infoContainerStyle} onClick={onSelect}>
        <h3 style={titleStyle}>
          {project.name}
        </h3>
        
        {project.description && size !== 'small' && (
          <p style={descriptionStyle}>
            {project.description}
          </p>
        )}

        <div style={statsGridStyle}>
          <div style={statItemStyle}>
            <div style={statValueStyle}>{stats.objects}</div>
            <div>{t('editor.selector.projectCard.stats.objects')}</div>
          </div>
          <div style={statItemStyle}>
            <div style={statValueStyle}>{stats.sounds}</div>
            <div>{t('editor.selector.projectCard.stats.sounds')}</div>
          </div>
          <div style={statItemStyle}>
            <div style={statValueStyle}>{stats.rules}</div>
            <div>{t('editor.selector.projectCard.stats.rules')}</div>
          </div>
        </div>

        {size !== 'small' && (
          <div style={capacityContainerStyle}>
            <div style={capacityHeaderStyle}>
              <span>{t('editor.selector.projectCard.stats.capacity')}</span>
              <span>{sizeInMB}MB</span>
            </div>
            <div style={capacityBarBgStyle}>
              <div style={capacityBarFillStyle} />
            </div>
          </div>
        )}

        <div style={lastModifiedStyle}>
          {t('editor.selector.projectCard.lastModified')}: {lastModified.toLocaleDateString()}
          {size === 'large' && (
            <span> {lastModified.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
          )}
        </div>

        <button
          onClick={onSelect}
          onMouseEnter={() => setIsButtonHover(true)}
          onMouseLeave={() => setIsButtonHover(false)}
          style={getEditButtonStyle()}
        >
          {t('editor.selector.projectCard.editButton')}
        </button>
      </div>

      {/* クリック範囲外をクリックした時のメニュー非表示 */}
      {showMenu && (
        <div 
          style={overlayStyle}
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(false);
          }}
        />
      )}
    </div>
  );
};