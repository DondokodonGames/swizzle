// src/components/editor/ProjectSelector.tsx
// 🚀 完全修正版: 軽量化 + 全エラー修正
import React, { useState, useEffect, useCallback } from 'react';
import { GameProject } from '../../types/editor/GameProject';
import { useGameProject, ProjectMetadata } from '../../hooks/editor/useGameProject';
import { ModernButton } from '../ui/ModernButton';
import { ModernCard } from '../ui/ModernCard';
import { DESIGN_TOKENS } from '../../constants/DesignSystem';

// ✅ 修正1: プロパティ名を EditorApp.tsx に合わせる
export interface ProjectSelectorProps {
  onProjectSelect: (project: GameProject) => Promise<void>;  // ✅ onSelect → onProjectSelect
  onCreateNew: (name: string) => Promise<void>;
  onDelete: (projectId: string) => Promise<void>;
  onDuplicate: (projectId: string) => Promise<void>;
  onExport: (projectId: string) => Promise<void>;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'lastModified' | 'name' | 'size';

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  onProjectSelect,  // ✅ 修正
  onCreateNew,
  onDelete,
  onDuplicate,
  onExport
}) => {
  // ✅ 軽量版メタデータ使用
  const [projectMetadataList, setProjectMetadataList] = useState<ProjectMetadata[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ProjectMetadata[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('lastModified');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  
  const { listProjectMetadata, loadFullProject } = useGameProject();

  // ✅ 初期ロード: 軽量版メタデータのみ
  useEffect(() => {
    const loadProjects = async () => {
      console.log('[ProjectSelector] 🚀 Loading lightweight project metadata...');
      setIsLoading(true);
      try {
        const metadataList = await listProjectMetadata();
        console.log(`[ProjectSelector] ✅ Loaded ${metadataList.length} project metadata`);
        setProjectMetadataList(metadataList);
        setFilteredProjects(metadataList);
      } catch (error) {
        console.error('[ProjectSelector] ❌ Failed to load project metadata:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProjects();
  }, [listProjectMetadata]);

  // 検索・フィルター
  useEffect(() => {
    let filtered = [...projectMetadataList];

    // 検索クエリでフィルター
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }

    // ソート
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'size':
          return b.size - a.size;
        case 'lastModified':
        default:
          return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
      }
    });

    setFilteredProjects(filtered);
  }, [projectMetadataList, searchQuery, sortBy]);

  // ✅ プロジェクト選択時: 詳細データ取得
  const handleProjectSelect = async (projectId: string) => {
    console.log(`[ProjectSelector] 📂 Loading full project data for: ${projectId}`);
    setLoadingProjectId(projectId);
    try {
      const fullProject = await loadFullProject(projectId);  // ✅ GameProject返却
      console.log(`[ProjectSelector] ✅ Full project loaded: ${fullProject.name}`);
      await onProjectSelect(fullProject);  // ✅ 修正
    } catch (error) {
      console.error(`[ProjectSelector] ❌ Failed to load project:`, error);
    } finally {
      setLoadingProjectId(null);
    }
  };

  const handleCreateNew = async () => {
    if (!newProjectName.trim()) return;
    
    setIsCreating(true);
    try {
      await onCreateNew(newProjectName.trim());
      setNewProjectName('');
      
      // プロジェクト一覧を再読み込み
      const metadataList = await listProjectMetadata();
      setProjectMetadataList(metadataList);
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (projectId: string, projectName: string) => {
    if (!window.confirm(`本当に「${projectName}」を削除しますか？この操作は取り消せません。`)) {
      return;
    }

    try {
      await onDelete(projectId);
      
      // プロジェクト一覧から削除
      setProjectMetadataList(prev => prev.filter(p => p.id !== projectId));
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const handleDuplicate = async (projectId: string) => {
    try {
      await onDuplicate(projectId);
      
      // プロジェクト一覧を再読み込み
      const metadataList = await listProjectMetadata();
      setProjectMetadataList(metadataList);
    } catch (error) {
      console.error('Failed to duplicate project:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'たった今';
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;
    
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: DESIGN_TOKENS.colors.neutral[50] }}>
      {/* ヘッダー */}
      <header
        style={{
          backgroundColor: DESIGN_TOKENS.colors.neutral[0],
          borderBottom: `1px solid ${DESIGN_TOKENS.colors.neutral[200]}`,
          boxShadow: DESIGN_TOKENS.shadows.sm,
          position: 'sticky',
          top: 0,
          zIndex: DESIGN_TOKENS.zIndex.sticky
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: `${DESIGN_TOKENS.spacing[4]} ${DESIGN_TOKENS.spacing[6]}`
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1
              style={{
                fontSize: DESIGN_TOKENS.typography.fontSize['2xl'],
                fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                color: DESIGN_TOKENS.colors.neutral[900],
                margin: 0
              }}
            >
              📂 マイプロジェクト
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[3] }}>
              {/* ソート */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                style={{
                  padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[3]}`,
                  borderRadius: DESIGN_TOKENS.borderRadius.md,
                  border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                  cursor: 'pointer'
                }}
              >
                <option value="lastModified">更新日時順</option>
                <option value="name">名前順</option>
                <option value="size">サイズ順</option>
              </select>

              {/* 表示切り替え */}
              <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[1] }}>
                <ModernButton
                  variant={viewMode === 'grid' ? 'primary' : 'secondary'}
                  size="md"  // ✅ 修正2: "medium" → "md"
                  onClick={() => setViewMode('grid')}
                >
                  ⊞
                </ModernButton>
                <ModernButton
                  variant={viewMode === 'list' ? 'primary' : 'secondary'}
                  size="md"  // ✅ 修正2: "medium" → "md"
                  onClick={() => setViewMode('list')}
                >
                  ☰
                </ModernButton>
              </div>
            </div>
          </div>

          {/* 検索バー */}
          <div style={{ marginTop: DESIGN_TOKENS.spacing[4] }}>
            <input
              type="text"
              placeholder="プロジェクトを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: `${DESIGN_TOKENS.spacing[3]} ${DESIGN_TOKENS.spacing[4]}`,
                fontSize: DESIGN_TOKENS.typography.fontSize.md,
                borderRadius: DESIGN_TOKENS.borderRadius.lg,
                border: `2px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = DESIGN_TOKENS.colors.primary[500];
                e.target.style.boxShadow = `0 0 0 3px ${DESIGN_TOKENS.colors.primary[100]}`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = DESIGN_TOKENS.colors.neutral[300];
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: DESIGN_TOKENS.spacing[6]
        }}
      >
        {/* 新規作成カード */}
        <ModernCard variant="elevated" size="md" style={{ marginBottom: DESIGN_TOKENS.spacing[6] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[4] }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: DESIGN_TOKENS.borderRadius.lg,
                backgroundColor: DESIGN_TOKENS.colors.primary[100],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}
            >
              ✨
            </div>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                placeholder="新しいゲームの名前を入力..."
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateNew()}
                disabled={isCreating}
                style={{
                  width: '100%',
                  padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[3]}`,
                  fontSize: DESIGN_TOKENS.typography.fontSize.md,
                  borderRadius: DESIGN_TOKENS.borderRadius.md,
                  border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                  backgroundColor: DESIGN_TOKENS.colors.neutral[0]
                }}
              />
            </div>
            <ModernButton
              variant="primary"
              size="md"  // ✅ 修正2
              onClick={handleCreateNew}
              disabled={!newProjectName.trim() || isCreating}
              loading={isCreating}
            >
              {isCreating ? '作成中...' : '新規作成'}
            </ModernButton>
          </div>
        </ModernCard>

        {/* ローディング */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: DESIGN_TOKENS.spacing[8] }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                border: '4px solid transparent',
                borderTop: `4px solid ${DESIGN_TOKENS.colors.primary[500]}`,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto'
              }}
            />
            <p style={{ marginTop: DESIGN_TOKENS.spacing[4], color: DESIGN_TOKENS.colors.neutral[600] }}>
              プロジェクトを読み込み中...
            </p>
          </div>
        )}

        {/* プロジェクト一覧 */}
        {!isLoading && filteredProjects.length === 0 && (
          <div style={{ textAlign: 'center', padding: DESIGN_TOKENS.spacing[8] }}>
            <div style={{ fontSize: '64px', marginBottom: DESIGN_TOKENS.spacing[4] }}>📂</div>
            <h3
              style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.xl,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                color: DESIGN_TOKENS.colors.neutral[700],
                marginBottom: DESIGN_TOKENS.spacing[2]
              }}
            >
              {searchQuery ? '検索結果が見つかりません' : 'プロジェクトがありません'}
            </h3>
            <p style={{ color: DESIGN_TOKENS.colors.neutral[600] }}>
              {searchQuery ? '別のキーワードで検索してみてください' : '「新規作成」からゲームを作り始めましょう！'}
            </p>
          </div>
        )}

        {/* グリッド表示 */}
        {!isLoading && viewMode === 'grid' && filteredProjects.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: DESIGN_TOKENS.spacing[4]
            }}
          >
            {filteredProjects.map((project) => (
              <ModernCard
                key={project.id}
                variant="interactive"
                size="md"
                onClick={() => handleProjectSelect(project.id)}
                style={{
                  cursor: loadingProjectId === project.id ? 'wait' : 'pointer',
                  opacity: loadingProjectId === project.id ? 0.6 : 1,
                  position: 'relative'
                }}
              >
                {loadingProjectId === project.id && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 10
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        border: '3px solid transparent',
                        borderTop: `3px solid ${DESIGN_TOKENS.colors.primary[500]}`,
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}
                    />
                  </div>
                )}

                {/* サムネイル */}
                <div
                  style={{
                    width: '100%',
                    height: '160px',
                    backgroundColor: DESIGN_TOKENS.colors.neutral[100],
                    borderRadius: DESIGN_TOKENS.borderRadius.md,
                    marginBottom: DESIGN_TOKENS.spacing[3],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '48px',
                    backgroundImage: project.thumbnailDataUrl ? `url(${project.thumbnailDataUrl})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  {!project.thumbnailDataUrl && '🎮'}
                </div>

                {/* プロジェクト情報 */}
                <h3
                  style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                    fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                    color: DESIGN_TOKENS.colors.neutral[900],
                    marginBottom: DESIGN_TOKENS.spacing[2],
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {project.name}
                </h3>

                {project.description && (
                  <p
                    style={{
                      fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                      color: DESIGN_TOKENS.colors.neutral[600],
                      marginBottom: DESIGN_TOKENS.spacing[3],
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}
                  >
                    {project.description}
                  </p>
                )}

                {/* メタ情報 */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                    color: DESIGN_TOKENS.colors.neutral[500],
                    marginBottom: DESIGN_TOKENS.spacing[3]
                  }}
                >
                  <span>🕐 {formatDate(project.lastModified)}</span>
                  <span>💾 {formatSize(project.size)}</span>
                </div>

                {/* アクションボタン */}
                <div
                  style={{
                    display: 'flex',
                    gap: DESIGN_TOKENS.spacing[2],
                    borderTop: `1px solid ${DESIGN_TOKENS.colors.neutral[200]}`,
                    paddingTop: DESIGN_TOKENS.spacing[3]
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ModernButton
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicate(project.id);
                    }}
                    style={{ flex: 1 }}
                  >
                    複製
                  </ModernButton>
                  <ModernButton
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onExport(project.id);
                    }}
                    style={{ flex: 1 }}
                  >
                    出力
                  </ModernButton>
                  <ModernButton
                    variant="error"  // ✅ 修正2: "danger" → "error"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(project.id, project.name);
                    }}
                  >
                    削除
                  </ModernButton>
                </div>
              </ModernCard>
            ))}
          </div>
        )}

        {/* リスト表示 */}
        {!isLoading && viewMode === 'list' && filteredProjects.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN_TOKENS.spacing[3] }}>
            {filteredProjects.map((project) => (
              <ModernCard
                key={project.id}
                variant="interactive"
                size="sm"
                onClick={() => handleProjectSelect(project.id)}
                style={{
                  cursor: loadingProjectId === project.id ? 'wait' : 'pointer',
                  opacity: loadingProjectId === project.id ? 0.6 : 1
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[4] }}>
                  {/* サムネイル（小） */}
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      backgroundColor: DESIGN_TOKENS.colors.neutral[100],
                      borderRadius: DESIGN_TOKENS.borderRadius.md,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '32px',
                      flexShrink: 0,
                      backgroundImage: project.thumbnailDataUrl ? `url(${project.thumbnailDataUrl})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  >
                    {!project.thumbnailDataUrl && '🎮'}
                  </div>

                  {/* プロジェクト情報 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3
                      style={{
                        fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                        fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                        color: DESIGN_TOKENS.colors.neutral[900],
                        marginBottom: DESIGN_TOKENS.spacing[1],
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {project.name}
                    </h3>
                    {project.description && (
                      <p
                        style={{
                          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                          color: DESIGN_TOKENS.colors.neutral[600],
                          marginBottom: DESIGN_TOKENS.spacing[2],
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {project.description}
                      </p>
                    )}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: DESIGN_TOKENS.spacing[4],
                        fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                        color: DESIGN_TOKENS.colors.neutral[500]
                      }}
                    >
                      <span>🕐 {formatDate(project.lastModified)}</span>
                      <span>💾 {formatSize(project.size)}</span>
                      {project.stats && (
                        <>
                          <span>📦 {project.stats.objectsCount}個のオブジェクト</span>
                          <span>📜 {project.stats.rulesCount}個のルール</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* アクションボタン */}
                  <div
                    style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[2] }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ModernButton
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicate(project.id);
                      }}
                    >
                      複製
                    </ModernButton>
                    <ModernButton
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onExport(project.id);
                      }}
                    >
                      出力
                    </ModernButton>
                    <ModernButton
                      variant="error"  // ✅ 修正2
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(project.id, project.name);
                      }}
                    >
                      削除
                    </ModernButton>
                  </div>
                </div>
              </ModernCard>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
