import React, { useState } from 'react';
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
  const [showMenu, setShowMenu] = useState(false);
  const [imageError, setImageError] = useState(false);

  // サイズ設定
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

  // プロジェクト統計
  const lastModified = new Date(project.lastModified);
  const isRecent = Date.now() - lastModified.getTime() < 24 * 60 * 60 * 1000;
  
  const stats = {
    objects: project.assets.objects.length,
    sounds: project.assets.audio.se.length + (project.assets.audio.bgm ? 1 : 0),
    rules: project.script.rules.length,
    totalSize: project.totalSize || 0
  };

  const sizeInMB = (stats.totalSize / 1024 / 1024).toFixed(1);
  const sizePercentage = (stats.totalSize / EDITOR_LIMITS.PROJECT.TOTAL_MAX_SIZE) * 100;

  // ステータス設定（型安全に修正）
  const statusConfig = {
    published: { label: '公開済み', class: 'bg-green-100 text-green-800' },
    testing: { label: 'テスト中', class: 'bg-blue-100 text-blue-800' },
    draft: { label: '下書き', class: 'bg-gray-100 text-gray-800' }
  } as const;

  const status = statusConfig[project.status as keyof typeof statusConfig] || statusConfig.draft;

  // 完成度計算
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
                {imageError ? 'サムネイル読み込みエラー' : 'サムネイル未設定'}
              </div>
            </div>
          </div>
        )}
        
        {/* ステータスバッジ */}
        <div className="absolute top-2 left-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.class}`}>
            {status.label}
          </span>
        </div>

        {/* 新規作成バッジ */}
        {isRecent && (
          <div className="absolute top-2 right-2">
            <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
              NEW
            </span>
          </div>
        )}

        {/* 完成度インジケーター */}
        <div className="absolute bottom-2 left-2">
          <div className="bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-xs">
            {completionScore}% 完成
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
                    <span>複製</span>
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
                    <span>出力</span>
                  </button>
                )}
                {onDelete && (
                  <>
                    {(onDuplicate || onExport) && <hr className="my-1" />}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`「${project.name}」を削除しますか？この操作は取り消せません。`)) {
                          onDelete();
                        }
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                    >
                      <span>🗑️</span>
                      <span>削除</span>
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

        {/* 統計情報 */}
        <div className={`grid grid-cols-3 gap-2 mb-3 text-gray-500 ${classes.stats}`}>
          <div className="text-center">
            <div className="font-medium text-gray-700">{stats.objects}</div>
            <div>オブジェクト</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-700">{stats.sounds}</div>
            <div>音声</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-700">{stats.rules}</div>
            <div>ルール</div>
          </div>
        </div>

        {/* 容量バー（medium・large時のみ） */}
        {size !== 'small' && (
          <div className="mb-3">
            <div className={`flex justify-between text-gray-500 mb-1 ${classes.stats}`}>
              <span>容量</span>
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

        {/* 最終更新日時 */}
        <div className={`text-gray-500 mb-4 ${classes.stats}`}>
          最終更新: {lastModified.toLocaleDateString('ja-JP')}
          {size === 'large' && (
            <span> {lastModified.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
          )}
        </div>

        {/* 編集ボタン */}
        <button
          onClick={onSelect}
          className={`w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-medium transition-all duration-200 hover:scale-105 ${classes.button}`}
        >
          編集する
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