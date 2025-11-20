import React, { useState } from 'react';
import { useTranslation } from 'react-i18n';
import { GameProject } from '../../../types/editor/GameProject';
import { EDITOR_LIMITS } from '../../../constants/EditorLimits';

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

  const sizeClasses = {
    small: {
      container: 'rounded-xl',
      thumbnail: 'h-24',
      padding: 'p-3',
      title: 'text-sm font-semibold',
      description: 'text-xs',
      stats: 'text-xs',
      button: 'py-2 text-sm'
    },
    medium: {
      container: 'rounded-2xl',
      thumbnail: 'h-32',
      padding: 'p-4',
      title: 'text-base font-semibold',
      description: 'text-sm',
      stats: 'text-xs',
      button: 'py-3 text-sm'
    },
    large: {
      container: 'rounded-2xl',
      thumbnail: 'h-40',
      padding: 'p-6',
      title: 'text-lg font-semibold',
      description: 'text-sm',
      stats: 'text-sm',
      button: 'py-4 text-base'
    }
  };

  const classes = sizeClasses[size];

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
    published: { label: t('editor.selector.projectCard.status.published'), class: 'bg-green-100 text-green-800' },
    testing: { label: t('editor.selector.projectCard.status.testing'), class: 'bg-blue-100 text-blue-800' },
    draft: { label: t('editor.selector.projectCard.status.draft'), class: 'bg-gray-100 text-gray-800' }
  } as const;

  const status = statusConfig[project.status as keyof typeof statusConfig] || statusConfig.draft;

  const completionScore = Math.round(
    (stats.objects > 0 ? 25 : 0) +
    (stats.sounds > 0 ? 25 : 0) +
    (stats.rules > 0 ? 25 : 0) +
    (project.name.trim().length > 0 ? 25 : 0)
  );

  return (
    <div className={`bg-white shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer relative ${classes.container} ${className}`}>
      {/* サムネイル/プレビューエリア */}
      <div 
        className={`bg-gradient-to-br from-purple-100 to-pink-100 relative ${classes.thumbnail}`}
        onClick={onSelect}
      >
        {project.thumbnailDataUrl && !imageError ? (
          <img 
            src={project.thumbnailDataUrl} 
            alt={project.name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-3xl mb-1">🎮</div>
              <div className="text-xs text-gray-500">
                {imageError ? t('editor.selector.projectCard.errors.thumbnailError') : t('editor.selector.projectCard.errors.noThumbnail')}
              </div>
            </div>
          </div>
        )}

        <div className="absolute top-2 left-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.class}`}>
            {status.label}
          </span>
        </div>

        {isRecent && (
          <div className="absolute top-2 right-2">
            <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
              {t('editor.selector.projectCard.new')}
            </span>
          </div>
        )}

        <div className="absolute bottom-2 left-2">
          <div className="bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-xs">
            {t('editor.selector.projectCard.completion', { percent: completionScore })}
          </div>
        </div>

        {/* アクションメニュー */}
        {showActions && (onDelete || onDuplicate || onExport) && (
          <div className="absolute top-2 right-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="bg-white bg-opacity-80 hover:bg-opacity-100 p-2 rounded-full transition-all duration-200"
            >
              ⋮
            </button>
            
            {/* ドロップダウンメニュー */}
            {showMenu && (
              <div className="absolute right-0 top-10 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[120px] z-10">
                {onDuplicate && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate();
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
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
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <span>📤</span>
                    <span>{t('editor.selector.projectCard.export')}</span>
                  </button>
                )}
                {onDelete && (
                  <>
                    {(onDuplicate || onExport) && <hr className="my-1" />}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(t('editor.selector.projectCard.confirmDelete', { name: project.name }))) {
                          onDelete();
                        }
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
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
      <div className={classes.padding} onClick={onSelect}>
        <h3 className={`text-gray-800 mb-2 line-clamp-1 ${classes.title}`}>
          {project.name}
        </h3>
        
        {project.description && size !== 'small' && (
          <p className={`text-gray-600 mb-3 line-clamp-2 ${classes.description}`}>
            {project.description}
          </p>
        )}

        <div className={`grid grid-cols-3 gap-2 mb-3 text-gray-500 ${classes.stats}`}>
          <div className="text-center">
            <div className="font-medium text-gray-700">{stats.objects}</div>
            <div>{t('editor.selector.projectCard.stats.objects')}</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-700">{stats.sounds}</div>
            <div>{t('editor.selector.projectCard.stats.sounds')}</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-700">{stats.rules}</div>
            <div>{t('editor.selector.projectCard.stats.rules')}</div>
          </div>
        </div>

        {size !== 'small' && (
          <div className="mb-3">
            <div className={`flex justify-between text-gray-500 mb-1 ${classes.stats}`}>
              <span>{t('editor.selector.projectCard.stats.capacity')}</span>
              <span>{sizeInMB}MB</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  sizePercentage > 90 ? 'bg-red-500' :
                  sizePercentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(sizePercentage, 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className={`text-gray-500 mb-4 ${classes.stats}`}>
          {t('editor.selector.projectCard.lastModified')}: {lastModified.toLocaleDateString()}
          {size === 'large' && (
            <span> {lastModified.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
          )}
        </div>

        <button
          onClick={onSelect}
          className={`w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-medium transition-all duration-200 hover:scale-105 ${classes.button}`}
        >
          {t('editor.selector.projectCard.editButton')}
        </button>
      </div>

      {/* クリック範囲外をクリックした時のメニュー非表示 */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(false);
          }}
        />
      )}
    </div>
  );
};