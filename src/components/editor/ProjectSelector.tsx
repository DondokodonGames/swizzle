// src/components/editor/ProjectSelector.tsx
// 修正版: フォントファミリー型修正 + インポート機能修正 + audio プロパティ安全アクセス対応 + Paywall統合
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameProject } from '../../types/editor/GameProject';
import { EDITOR_LIMITS } from '../../constants/EditorLimits';
import { useGameProject } from '../../hooks/editor/useGameProject';
import { DESIGN_TOKENS } from '../../constants/DesignSystem';
import { ModernButton } from '../ui/ModernButton';
import { ModernCard, ProjectCard } from '../ui/ModernCard';
import { useCredits } from '../../hooks/monetization/useCredits';
import { PaywallModal } from '../monetization/PaywallModal';

interface ProjectSelectorProps {
  onProjectSelect: (project: GameProject) => void;
  onCreateNew: (name: string) => void;
  onDelete?: (projectId: string) => void;
  onDuplicate?: (projectId: string) => void;
  onExport?: (projectId: string) => void;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  onProjectSelect,
  onCreateNew,
  onDelete,
  onDuplicate,
  onExport
}) => {
  const [projects, setProjects] = useState<GameProject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'lastModified' | 'status'>('lastModified');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  // インポート機能用のref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✨ useGameProject統合（修正版 - importProject追加）
  const {
    loading,
    error,
    createProject,
    deleteProject,
    duplicateProject,
    exportProject,
    listProjects,
    importProject  // ← 追加
  } = useGameProject();

  // 🔧 追加: Paywall機能統合
  const { usage, canCreateGame: canCreate, refetch: refetchCredits } = useCredits();

  // 通知表示ヘルパー
  const showNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  // プロジェクト一覧の読み込み
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const loadedProjects = await listProjects();
        // 重複IDを除去（最新の方を残す）
        const uniqueProjects = loadedProjects.reduce((acc, project) => {
          const existing = acc.find(p => p.id === project.id);
          if (!existing) {
            acc.push(project);
          } else if (new Date(project.lastModified) > new Date(existing.lastModified)) {
            // より新しい方で上書き
            const index = acc.indexOf(existing);
            acc[index] = project;
          }
          return acc;
        }, [] as GameProject[]);
        setProjects(uniqueProjects);
      } catch (error) {
        console.error('プロジェクト一覧の読み込みに失敗:', error);
        showNotification('error', 'プロジェクト一覧の読み込みに失敗しました');
      }
    };

    loadProjects();
  }, [listProjects]);

  // 検索・ソート・フィルター
  const filteredAndSortedProjects = React.useMemo(() => {
    let filtered = projects.filter(project =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    );

    // ソート
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'lastModified':
          return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    return filtered;
  }, [projects, searchQuery, sortBy]);

  // 🔧 修正: 新規プロジェクト作成（Paywallチェック追加）
  const handleCreateNew = useCallback(async () => {
    if (!newProjectName.trim()) return;

    // 🔧 追加: ゲーム作成可能かチェック
    if (!canCreate) {
      setShowNewProjectModal(false);
      setShowPaywall(true);
      return;
    }

    try {
      const newProject = await createProject(newProjectName.trim());
      setProjects(prev => [newProject, ...prev]);
      onCreateNew(newProjectName.trim());
      setShowNewProjectModal(false);
      setNewProjectName('');
      showNotification('success', `「${newProject.name}」を作成しました`);

      // クレジット情報を更新
      await refetchCredits();
    } catch (error: any) {
      showNotification('error', `プロジェクト作成に失敗しました: ${error.message}`);
    }
  }, [createProject, newProjectName, onCreateNew, showNotification, canCreate, refetchCredits]);

  // プロジェクト削除
  const handleDeleteProject = useCallback(async (projectId: string) => {
    try {
      await deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      if (onDelete) onDelete(projectId);
      showNotification('success', 'プロジェクトを削除しました');
    } catch (error: any) {
      showNotification('error', `削除に失敗しました: ${error.message}`);
    }
  }, [deleteProject, onDelete, showNotification]);

  // プロジェクト複製
  const handleDuplicateProject = useCallback(async (projectId: string) => {
    try {
      const originalProject = projects.find(p => p.id === projectId);
      if (!originalProject) return;

      const newName = `${originalProject.name} のコピー`;
      const duplicated = await duplicateProject(projectId, newName);
      setProjects(prev => [duplicated, ...prev]);
      if (onDuplicate) onDuplicate(projectId);
      showNotification('success', `「${duplicated.name}」を作成しました`);
    } catch (error: any) {
      showNotification('error', `複製に失敗しました: ${error.message}`);
    }
  }, [projects, duplicateProject, onDuplicate, showNotification]);

  // プロジェクトエクスポート
  const handleExportProject = useCallback(async (projectId: string) => {
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      const blob = await exportProject(projectId);
      
      // ダウンロード
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name}_export.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      if (onExport) onExport(projectId);
      showNotification('success', 'プロジェクトをエクスポートしました');
    } catch (error: any) {
      showNotification('error', `エクスポートに失敗しました: ${error.message}`);
    }
  }, [projects, exportProject, onExport, showNotification]);

  // ファイルインポート処理（修正版）
  const handleFileImport = useCallback(async (file: File) => {
    try {
      // ✅ useGameProjectのimportProjectメソッドを使用
      const importedProject = await importProject(file);
      
      // ✅ プロジェクト一覧を再取得（永続化されているため）
      const updatedProjects = await listProjects();
      setProjects(updatedProjects);
      
      showNotification('success', `「${importedProject.name}」をインポートしました`);
    } catch (error: any) {
      showNotification('error', `インポートに失敗しました: ${error.message}`);
    }
  }, [importProject, listProjects, showNotification]);

  return (
    <div 
      style={{ 
        minHeight: '100vh',
        backgroundColor: DESIGN_TOKENS.colors.neutral[50],
        fontFamily: DESIGN_TOKENS.typography.fontFamily.sans.join(', ')  // 🔧 フォント修正
      }}
    >
      {/* エラー・通知表示 */}
      {error && (
        <div 
          style={{
            position: 'fixed',
            top: DESIGN_TOKENS.spacing[4],
            left: DESIGN_TOKENS.spacing[4],
            right: DESIGN_TOKENS.spacing[4],
            zIndex: DESIGN_TOKENS.zIndex.notification,
            backgroundColor: DESIGN_TOKENS.colors.error[50],
            border: `1px solid ${DESIGN_TOKENS.colors.error[200]}`,
            borderRadius: DESIGN_TOKENS.borderRadius.lg,
            padding: DESIGN_TOKENS.spacing[4],
            boxShadow: DESIGN_TOKENS.shadows.lg
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xl, marginRight: DESIGN_TOKENS.spacing[3] }}>
              ⚠️
            </span>
            <p style={{ 
              color: DESIGN_TOKENS.colors.error[800], 
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              flex: 1,
              margin: 0
            }}>
              {error}
            </p>
          </div>
        </div>
      )}

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
          <div 
            style={{
              padding: DESIGN_TOKENS.spacing[4],
              borderRadius: DESIGN_TOKENS.borderRadius.lg,
              boxShadow: DESIGN_TOKENS.shadows.lg,
              backgroundColor: notification.type === 'success' 
                ? DESIGN_TOKENS.colors.success[50] 
                : notification.type === 'error' 
                  ? DESIGN_TOKENS.colors.error[50] 
                  : DESIGN_TOKENS.colors.primary[50],
              border: `1px solid ${
                notification.type === 'success' 
                  ? DESIGN_TOKENS.colors.success[200] 
                  : notification.type === 'error' 
                    ? DESIGN_TOKENS.colors.error[200] 
                    : DESIGN_TOKENS.colors.primary[200]
              }`
            }}
          >
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
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <header 
        style={{
          backgroundColor: DESIGN_TOKENS.colors.neutral[0],
          borderBottom: `1px solid ${DESIGN_TOKENS.colors.neutral[200]}`,
          boxShadow: DESIGN_TOKENS.shadows.sm
        }}
      >
        <div 
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: `${DESIGN_TOKENS.spacing[6]} ${DESIGN_TOKENS.spacing[4]}`
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: DESIGN_TOKENS.spacing[6] }}>
            <h1 
              style={{
                fontSize: DESIGN_TOKENS.typography.fontSize['4xl'],
                fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                background: `linear-gradient(135deg, ${DESIGN_TOKENS.colors.primary[600]}, ${DESIGN_TOKENS.colors.primary[500]})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                margin: `0 0 ${DESIGN_TOKENS.spacing[2]} 0`
              }}
            >
              🎮 ゲームエディター
            </h1>
            <p 
              style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                color: DESIGN_TOKENS.colors.neutral[600],
                margin: 0
              }}
            >
              簡単にゲームを作って、みんなに遊んでもらおう！
            </p>
          </div>

          {/* 統計情報 */}
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: DESIGN_TOKENS.spacing[4],
              marginBottom: DESIGN_TOKENS.spacing[6]
            }}
          >
            <ModernCard variant="filled" size="sm">
              <div style={{ textAlign: 'center' }}>
                <div 
                  style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize['2xl'],
                    fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                    color: DESIGN_TOKENS.colors.primary[600],
                    marginBottom: DESIGN_TOKENS.spacing[1]
                  }}
                >
                  {projects.length}
                </div>
                <div 
                  style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                    color: DESIGN_TOKENS.colors.neutral[600]
                  }}
                >
                  プロジェクト数
                </div>
              </div>
            </ModernCard>

            <ModernCard variant="filled" size="sm">
              <div style={{ textAlign: 'center' }}>
                <div 
                  style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize['2xl'],
                    fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                    color: DESIGN_TOKENS.colors.success[600],
                    marginBottom: DESIGN_TOKENS.spacing[1]
                  }}
                >
                  {projects.filter(p => p.status === 'published').length}
                </div>
                <div 
                  style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                    color: DESIGN_TOKENS.colors.neutral[600]
                  }}
                >
                  公開済み
                </div>
              </div>
            </ModernCard>

            <ModernCard variant="filled" size="sm">
              <div style={{ textAlign: 'center' }}>
                <div 
                  style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize['2xl'],
                    fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                    color: DESIGN_TOKENS.colors.warning[600],
                    marginBottom: DESIGN_TOKENS.spacing[1]
                  }}
                >
                  {(projects.reduce((sum, p) => sum + p.totalSize, 0) / 1024 / 1024).toFixed(1)}MB
                </div>
                <div 
                  style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                    color: DESIGN_TOKENS.colors.neutral[600]
                  }}
                >
                  総容量
                </div>
              </div>
            </ModernCard>
          </div>
        </div>
      </header>

      <main 
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: DESIGN_TOKENS.spacing[6]
        }}
      >
        {/* 検索・フィルター・アクションバー */}
        <div 
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: DESIGN_TOKENS.spacing[4],
            marginBottom: DESIGN_TOKENS.spacing[8]
          }}
        >
          {/* 検索バー */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="プロジェクトを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: `${DESIGN_TOKENS.spacing[3]} ${DESIGN_TOKENS.spacing[12]} ${DESIGN_TOKENS.spacing[3]} ${DESIGN_TOKENS.spacing[4]}`,
                fontSize: DESIGN_TOKENS.typography.fontSize.base,
                backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                borderRadius: DESIGN_TOKENS.borderRadius.lg,
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
            <div 
              style={{
                position: 'absolute',
                right: DESIGN_TOKENS.spacing[4],
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                color: DESIGN_TOKENS.colors.neutral[400]
              }}
            >
              🔍
            </div>
          </div>

          {/* コントロールバー */}
          <div 
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: DESIGN_TOKENS.spacing[3]
            }}
          >
            {/* ソート・表示設定 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[3] }}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{
                  padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[3]}`,
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                  border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                  borderRadius: DESIGN_TOKENS.borderRadius.md,
                  outline: 'none'
                }}
              >
                <option value="lastModified">最新順</option>
                <option value="name">名前順</option>
                <option value="status">ステータス順</option>
              </select>

              <div 
                style={{
                  display: 'flex',
                  backgroundColor: DESIGN_TOKENS.colors.neutral[100],
                  borderRadius: DESIGN_TOKENS.borderRadius.md,
                  padding: DESIGN_TOKENS.spacing[1]
                }}
              >
                <button
                  onClick={() => setViewMode('grid')}
                  style={{
                    padding: DESIGN_TOKENS.spacing[2],
                    fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                    backgroundColor: viewMode === 'grid' ? DESIGN_TOKENS.colors.neutral[0] : 'transparent',
                    color: viewMode === 'grid' ? DESIGN_TOKENS.colors.neutral[800] : DESIGN_TOKENS.colors.neutral[600],
                    border: 'none',
                    borderRadius: DESIGN_TOKENS.borderRadius.sm,
                    cursor: 'pointer',
                    transition: `all ${DESIGN_TOKENS.animation.duration.fast} ${DESIGN_TOKENS.animation.easing.inOut}`
                  }}
                >
                  ⊞ グリッド
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  style={{
                    padding: DESIGN_TOKENS.spacing[2],
                    fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                    backgroundColor: viewMode === 'list' ? DESIGN_TOKENS.colors.neutral[0] : 'transparent',
                    color: viewMode === 'list' ? DESIGN_TOKENS.colors.neutral[800] : DESIGN_TOKENS.colors.neutral[600],
                    border: 'none',
                    borderRadius: DESIGN_TOKENS.borderRadius.sm,
                    cursor: 'pointer',
                    transition: `all ${DESIGN_TOKENS.animation.duration.fast} ${DESIGN_TOKENS.animation.easing.inOut}`
                  }}
                >
                  ☰ リスト
                </button>
              </div>
            </div>

            {/* アクションボタン */}
            <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[3] }}>
              {/* インポートボタン - 修正版 */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileImport(file);
                    e.target.value = '';
                  }
                }}
                style={{ display: 'none' }}
              />
              
              <ModernButton
                variant="outline"
                size="md"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.click();
                  }
                }}
              >
                インポート
              </ModernButton>
              
              {/* 新規作成ボタン */}
              <ModernButton
                variant="primary"
                size="md"
                onClick={() => setShowNewProjectModal(true)}
              >
                新しいゲームを作る
              </ModernButton>
            </div>
          </div>
        </div>

        {/* プロジェクト一覧 */}
        {loading ? (
          <div 
            style={{
              textAlign: 'center',
              padding: `${DESIGN_TOKENS.spacing[20]} 0`
            }}
          >
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
                color: DESIGN_TOKENS.colors.neutral[600],
                fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                margin: 0
              }}
            >
              プロジェクトを読み込み中...
            </p>
          </div>
        ) : filteredAndSortedProjects.length === 0 ? (
          <div 
            style={{
              textAlign: 'center',
              padding: `${DESIGN_TOKENS.spacing[20]} 0`
            }}
          >
            <div 
              style={{
                fontSize: DESIGN_TOKENS.typography.fontSize['6xl'],
                marginBottom: DESIGN_TOKENS.spacing[4]
              }}
            >
              🎨
            </div>
            <h3 
              style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.xl,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                color: DESIGN_TOKENS.colors.neutral[800],
                margin: `0 0 ${DESIGN_TOKENS.spacing[2]} 0`
              }}
            >
              {searchQuery ? 'プロジェクトが見つかりません' : 'まだプロジェクトがありません'}
            </h3>
            <p 
              style={{
                color: DESIGN_TOKENS.colors.neutral[600],
                margin: `0 0 ${DESIGN_TOKENS.spacing[8]} 0`
              }}
            >
              {searchQuery ? '別のキーワードで検索してみてください' : '初めてのゲームを作ってみましょう！'}
            </p>
            {!searchQuery && (
              <ModernButton
                variant="primary"
                size="lg"
                onClick={() => setShowNewProjectModal(true)}
              >
                新しいゲームを作る
              </ModernButton>
            )}
          </div>
        ) : (
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: viewMode === 'grid' 
                ? 'repeat(auto-fill, minmax(320px, 1fr))' 
                : '1fr',
              gap: DESIGN_TOKENS.spacing[6]
            }}
          >
            {filteredAndSortedProjects.map(project => (
              <ProjectCard
                key={project.id}
                title={project.name}
                description={project.description}
                thumbnail={project.thumbnailDataUrl}
                status={project.status}
                lastModified={project.lastModified}
                stats={{
                  objects: project.assets?.objects?.length || 0,
                  sounds: ((project.assets?.audio?.bgm ? 1 : 0) + (project.assets?.audio?.se?.length || 0)),
                  rules: project.script?.rules?.length || 0
                }}
                onCardClick={() => onProjectSelect(project)}
              >
                {/* アクションボタン */}
                <div 
                  style={{
                    display: 'flex',
                    gap: DESIGN_TOKENS.spacing[2],
                    marginTop: DESIGN_TOKENS.spacing[4]
                  }}
                >
                  <ModernButton
                    variant="outline"
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportProject(project.id);
                    }}
                  >
                    💾
                  </ModernButton>
                  <ModernButton
                    variant="outline"
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateProject(project.id);
                    }}
                  >
                    📄
                  </ModernButton>
                  <ModernButton
                    variant="error"
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`「${project.name}」を削除しますか？この操作は取り消せません。`)) {
                        handleDeleteProject(project.id);
                      }
                    }}
                  >
                    🗑️
                  </ModernButton>
                </div>
              </ProjectCard>
            ))}
          </div>
        )}
      </main>

      {/* 新規プロジェクト作成モーダル */}
      {showNewProjectModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: DESIGN_TOKENS.zIndex.modal,
            padding: DESIGN_TOKENS.spacing[4]
          }}
          onClick={() => setShowNewProjectModal(false)}
        >
          <ModernCard
            variant="elevated"
            size="lg"
            style={{ maxWidth: '500px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: DESIGN_TOKENS.spacing[6] }}>
              <div 
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize['4xl'],
                  marginBottom: DESIGN_TOKENS.spacing[2]
                }}
              >
                ✨
              </div>
              <h2 
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize['2xl'],
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                  color: DESIGN_TOKENS.colors.neutral[800],
                  margin: `0 0 ${DESIGN_TOKENS.spacing[2]} 0`
                }}
              >
                新しいゲームを作る
              </h2>
              <p 
                style={{
                  color: DESIGN_TOKENS.colors.neutral[600],
                  margin: 0
                }}
              >
                ゲームの名前を決めましょう
              </p>
            </div>

            <div style={{ marginBottom: DESIGN_TOKENS.spacing[6] }}>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="ゲーム名を入力してください"
                maxLength={50}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateNew();
                  }
                }}
                autoFocus
                style={{
                  width: '100%',
                  padding: `${DESIGN_TOKENS.spacing[3]} ${DESIGN_TOKENS.spacing[4]}`,
                  fontSize: DESIGN_TOKENS.typography.fontSize.base,
                  backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                  border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                  borderRadius: DESIGN_TOKENS.borderRadius.lg,
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
              <div 
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.neutral[500],
                  marginTop: DESIGN_TOKENS.spacing[1],
                  textAlign: 'right'
                }}
              >
                {newProjectName.length}/50文字
              </div>
            </div>

            <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[3] }}>
              <ModernButton
                variant="secondary"
                size="lg"
                fullWidth
                onClick={() => {
                  setShowNewProjectModal(false);
                  setNewProjectName('');
                }}
                disabled={loading}
              >
                キャンセル
              </ModernButton>
              <ModernButton
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleCreateNew}
                disabled={!newProjectName.trim() || loading}
                loading={loading}
              >
                作成
              </ModernButton>
            </div>

            {/* テンプレート選択（将来実装） */}
            <div 
              style={{
                marginTop: DESIGN_TOKENS.spacing[6],
                paddingTop: DESIGN_TOKENS.spacing[6],
                borderTop: `1px solid ${DESIGN_TOKENS.colors.neutral[200]}`,
                textAlign: 'center'
              }}
            >
              <p 
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  color: DESIGN_TOKENS.colors.neutral[500],
                  margin: 0
                }}
              >
                💡 テンプレートから始めることもできます（準備中）
              </p>
            </div>
          </ModernCard>
        </div>
      )}

      {/* フローティングヘルプボタン */}
      <div 
        style={{
          position: 'fixed',
          bottom: DESIGN_TOKENS.spacing[6],
          right: DESIGN_TOKENS.spacing[6],
          zIndex: DESIGN_TOKENS.zIndex.fixed
        }}
      >
        <ModernButton
          variant="primary"
          size="lg"
          style={{ 
            borderRadius: '50%', 
            width: '56px', 
            height: '56px',
            padding: 0
          }}
        >
          <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xl }}>❓</span>
        </ModernButton>
      </div>

      {/* 開発者情報 */}
      <div
        style={{
          position: 'fixed',
          bottom: DESIGN_TOKENS.spacing[2],
          left: DESIGN_TOKENS.spacing[2],
          fontSize: DESIGN_TOKENS.typography.fontSize.xs,
          color: DESIGN_TOKENS.colors.neutral[400]
        }}
      >
        <div>Game Editor v1.0.0 - Phase 1-B モダンUI版</div>
        <div>💡 Ctrl+Q: メイン画面に戻る</div>
      </div>

      {/* 🔧 追加: Paywallモーダル */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        currentUsage={usage || undefined}
      />
    </div>
  );
};