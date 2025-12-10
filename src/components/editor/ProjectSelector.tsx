// src/components/editor/ProjectSelector.tsx
// ✅ 軽量化完全対応版: listProjectMetadata() + loadFullProject()使用

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { GameProject } from '../../types/editor/GameProject';
import { useGameProject, ProjectMetadata } from '../../hooks/editor/useGameProject';
import { ModernButton } from '../ui/ModernButton';

interface ProjectSelectorProps {
  onSelect: (project: GameProject) => void;
  onClose?: () => void;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({ onSelect, onClose }) => {
  const { t } = useTranslation();
  const { 
    listProjectMetadata, // ✅ 新しいメソッド（軽量）
    loadFullProject, // ✅ 新しいメソッド（詳細取得）
    createProject, 
    deleteProject, 
    duplicateProject,
    loading, 
    error 
  } = useGameProject();

  const [projectMetadataList, setProjectMetadataList] = useState<ProjectMetadata[]>([]); // ✅ 軽量版リスト
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'published'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'modified' | 'size'>('modified');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null); // ✅ 詳細ロード中のプロジェクト

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMounted = useRef(true);

  // ✅ 初期ロード: 軽量版メタデータ取得
  useEffect(() => {
    const loadProjects = async () => {
      console.log('[ProjectSelector] 🚀 Loading lightweight project metadata...');
      try {
        const metadataList = await listProjectMetadata();
        if (isMounted.current) {
          console.log('[ProjectSelector] ✅ Loaded', metadataList.length, 'project metadata');
          setProjectMetadataList(metadataList);
        }
      } catch (err) {
        console.error('[ProjectSelector] ❌ Error loading projects:', err);
      }
    };

    loadProjects();

    return () => {
      isMounted.current = false;
    };
  }, [listProjectMetadata]);

  // ✅ プロジェクト選択時: 詳細データ取得
  const handleProjectSelect = useCallback(async (projectId: string) => {
    console.log('[ProjectSelector] 📂 Loading full project data for:', projectId);
    setLoadingProjectId(projectId);

    try {
      const fullProject = await loadFullProject(projectId);
      console.log('[ProjectSelector] ✅ Full project loaded:', fullProject.id);
      onSelect(fullProject);
    } catch (err) {
      console.error('[ProjectSelector] ❌ Error loading full project:', err);
      alert('プロジェクトの読み込みに失敗しました');
    } finally {
      setLoadingProjectId(null);
    }
  }, [loadFullProject, onSelect]);

  // プロジェクト作成
  const handleCreateProject = useCallback(async () => {
    if (!newProjectName.trim()) {
      alert('プロジェクト名を入力してください');
      return;
    }

    try {
      const project = await createProject(newProjectName);
      setShowCreateModal(false);
      setNewProjectName('');
      
      // ✅ リスト更新（軽量版）
      const metadataList = await listProjectMetadata();
      setProjectMetadataList(metadataList);
      
      // 作成したプロジェクトを選択
      onSelect(project);
    } catch (err) {
      console.error('[ProjectSelector] Error creating project:', err);
      alert('プロジェクトの作成に失敗しました');
    }
  }, [newProjectName, createProject, listProjectMetadata, onSelect]);

  // プロジェクト削除
  const handleDeleteProject = useCallback(async (projectId: string) => {
    try {
      await deleteProject(projectId);
      setShowDeleteConfirm(null);
      
      // ✅ リスト更新（軽量版）
      const metadataList = await listProjectMetadata();
      setProjectMetadataList(metadataList);
    } catch (err) {
      console.error('[ProjectSelector] Error deleting project:', err);
      alert('プロジェクトの削除に失敗しました');
    }
  }, [deleteProject, listProjectMetadata]);

  // プロジェクト複製
  const handleDuplicateProject = useCallback(async (projectId: string, name: string) => {
    try {
      await duplicateProject(projectId, `${name} (コピー)`);
      
      // ✅ リスト更新（軽量版）
      const metadataList = await listProjectMetadata();
      setProjectMetadataList(metadataList);
    } catch (err) {
      console.error('[ProjectSelector] Error duplicating project:', err);
      alert('プロジェクトの複製に失敗しました');
    }
  }, [duplicateProject, listProjectMetadata]);

  // フィルタリング・ソート
  const filteredAndSortedProjects = React.useMemo(() => {
    let filtered = [...projectMetadataList];

    // 検索フィルター
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // ステータスフィルター
    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => p.status === filterStatus);
    }

    // ソート
    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'modified':
          compareValue = new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime();
          break;
        case 'size':
          compareValue = (a.size || 0) - (b.size || 0);
          break;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
  }, [projectMetadataList, searchQuery, filterStatus, sortBy, sortOrder]);

  // サイズをフォーマット
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 日付をフォーマット
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '今日';
    if (days === 1) return '昨日';
    if (days < 7) return `${days}日前`;
    if (days < 30) return `${Math.floor(days / 7)}週間前`;
    if (days < 365) return `${Math.floor(days / 30)}ヶ月前`;
    return `${Math.floor(days / 365)}年前`;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '1200px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
      }}>
        {/* ヘッダー */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#333'
          }}>
            プロジェクトを選択
          </h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <ModernButton
              onClick={() => setShowCreateModal(true)}
              variant="primary"
              size="medium"
            >
              ➕ 新規作成
            </ModernButton>
            {onClose && (
              <ModernButton
                onClick={onClose}
                variant="ghost"
                size="medium"
              >
                ✖️ 閉じる
              </ModernButton>
            )}
          </div>
        </div>

        {/* 検索・フィルター */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <input
            type="text"
            placeholder="🔍 プロジェクトを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: '1 1 300px',
              padding: '10px 16px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            style={{
              padding: '10px 16px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: '#fff',
              cursor: 'pointer'
            }}
          >
            <option value="all">すべて</option>
            <option value="draft">下書き</option>
            <option value="published">公開済み</option>
          </select>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [newSortBy, newSortOrder] = e.target.value.split('-');
              setSortBy(newSortBy as any);
              setSortOrder(newSortOrder as any);
            }}
            style={{
              padding: '10px 16px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: '#fff',
              cursor: 'pointer'
            }}
          >
            <option value="modified-desc">最終更新日（新しい順）</option>
            <option value="modified-asc">最終更新日（古い順）</option>
            <option value="name-asc">名前（A-Z）</option>
            <option value="name-desc">名前（Z-A）</option>
            <option value="size-desc">サイズ（大きい順）</option>
            <option value="size-asc">サイズ（小さい順）</option>
          </select>
        </div>

        {/* プロジェクト一覧 */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px'
        }}>
          {loading && (
            <div style={{
              textAlign: 'center',
              padding: '60px',
              color: '#666'
            }}>
              <div style={{
                fontSize: '48px',
                marginBottom: '16px',
                animation: 'spin 1s linear infinite'
              }}>
                ⏳
              </div>
              プロジェクトを読み込んでいます...
            </div>
          )}

          {error && (
            <div style={{
              padding: '20px',
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              borderRadius: '8px',
              color: '#c33',
              marginBottom: '20px'
            }}>
              ⚠️ {error}
            </div>
          )}

          {!loading && filteredAndSortedProjects.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '60px',
              color: '#999'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📂</div>
              <p style={{ fontSize: '16px', marginBottom: '8px' }}>
                {searchQuery || filterStatus !== 'all'
                  ? '該当するプロジェクトが見つかりません'
                  : 'プロジェクトがまだありません'}
              </p>
              <p style={{ fontSize: '14px', color: '#bbb' }}>
                「新規作成」ボタンから最初のプロジェクトを作成しましょう
              </p>
            </div>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px'
          }}>
            {filteredAndSortedProjects.map(project => (
              <div
                key={project.id}
                onClick={() => {
                  if (loadingProjectId !== project.id) {
                    handleProjectSelect(project.id);
                  }
                }}
                style={{
                  border: selectedProjectId === project.id ? '2px solid #4CAF50' : '1px solid #ddd',
                  borderRadius: '12px',
                  padding: '16px',
                  cursor: loadingProjectId === project.id ? 'wait' : 'pointer',
                  transition: 'all 0.2s',
                  backgroundColor: '#fff',
                  position: 'relative',
                  opacity: loadingProjectId === project.id ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (loadingProjectId !== project.id) {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* サムネイル */}
                <div style={{
                  width: '100%',
                  height: '120px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  {project.thumbnailDataUrl ? (
                    <img
                      src={project.thumbnailDataUrl}
                      alt={project.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: '48px', color: '#ccc' }}>🎮</div>
                  )}
                </div>

                {/* ローディング表示 */}
                {loadingProjectId === project.id && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    animation: 'spin 1s linear infinite'
                  }}>
                    ⏳
                  </div>
                )}

                {/* プロジェクト情報 */}
                <h3 style={{
                  margin: '0 0 8px 0',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#333',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {project.name}
                </h3>

                {project.description && (
                  <p style={{
                    margin: '0 0 12px 0',
                    fontSize: '13px',
                    color: '#666',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {project.description}
                  </p>
                )}

                {/* 統計情報 */}
                {project.stats && (
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginBottom: '12px',
                    fontSize: '12px',
                    color: '#888'
                  }}>
                    <span>🖼️ {project.stats.objectsCount}</span>
                    <span>🔊 {project.stats.soundsCount}</span>
                    <span>📜 {project.stats.rulesCount}</span>
                  </div>
                )}

                {/* メタ情報 */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                  color: '#999',
                  marginBottom: '12px'
                }}>
                  <span>{formatDate(project.lastModified)}</span>
                  <span>{formatSize(project.size || 0)}</span>
                </div>

                {/* ステータスバッジ */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    backgroundColor: project.status === 'published' ? '#e8f5e9' : '#fff3e0',
                    color: project.status === 'published' ? '#2e7d32' : '#e65100'
                  }}>
                    {project.status === 'published' ? '公開済み' : '下書き'}
                  </span>
                </div>

                {/* アクションボタン */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginTop: '12px'
                }}
                onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleDuplicateProject(project.id, project.name)}
                    disabled={loading || loadingProjectId === project.id}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      backgroundColor: '#fff',
                      color: '#666',
                      fontSize: '12px',
                      cursor: loading || loadingProjectId === project.id ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!loading && loadingProjectId !== project.id) {
                        e.currentTarget.style.backgroundColor = '#f5f5f5';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#fff';
                    }}
                  >
                    📋 複製
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(project.id)}
                    disabled={loading || loadingProjectId === project.id}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      border: '1px solid #ffcdd2',
                      borderRadius: '6px',
                      backgroundColor: '#fff',
                      color: '#d32f2f',
                      fontSize: '12px',
                      cursor: loading || loadingProjectId === project.id ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!loading && loadingProjectId !== project.id) {
                        e.currentTarget.style.backgroundColor = '#ffebee';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#fff';
                    }}
                  >
                    🗑️ 削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 新規作成モーダル */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}
        onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '32px',
              width: '90%',
              maxWidth: '500px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{
              margin: '0 0 20px 0',
              fontSize: '20px',
              fontWeight: 'bold'
            }}>
              新規プロジェクト作成
            </h3>
            <input
              type="text"
              placeholder="プロジェクト名を入力"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCreateProject();
                }
              }}
              autoFocus
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
                marginBottom: '20px',
                outline: 'none'
              }}
            />
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <ModernButton
                onClick={() => setShowCreateModal(false)}
                variant="ghost"
                size="medium"
                disabled={loading}
              >
                キャンセル
              </ModernButton>
              <ModernButton
                onClick={handleCreateProject}
                variant="primary"
                size="medium"
                disabled={loading || !newProjectName.trim()}
              >
                作成
              </ModernButton>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}
        onClick={() => setShowDeleteConfirm(null)}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '32px',
              width: '90%',
              maxWidth: '500px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#d32f2f'
            }}>
              ⚠️ プロジェクトを削除
            </h3>
            <p style={{
              margin: '0 0 24px 0',
              fontSize: '14px',
              color: '#666'
            }}>
              このプロジェクトを削除してもよろしいですか？<br />
              この操作は取り消せません。
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <ModernButton
                onClick={() => setShowDeleteConfirm(null)}
                variant="ghost"
                size="medium"
                disabled={loading}
              >
                キャンセル
              </ModernButton>
              <ModernButton
                onClick={() => handleDeleteProject(showDeleteConfirm)}
                variant="danger"
                size="medium"
                disabled={loading}
              >
                削除
              </ModernButton>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
