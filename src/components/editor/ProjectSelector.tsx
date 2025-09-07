import React, { useState, useEffect } from 'react';
import { GameProject } from '../../types/editor/GameProject';
import { EDITOR_LIMITS } from '../../constants/EditorLimits';
import { useGameProject } from '../../hooks/editor/useGameProject';

interface ProjectSelectorProps {
  onProjectSelect: (project: GameProject) => void;
  onCreateNew: (name: string) => void;
  onDelete?: (projectId: string) => void;
  onDuplicate?: (projectId: string) => void;
  onExport?: (projectId: string) => void;
}

interface ProjectCardProps {
  project: GameProject;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onExport: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ 
  project, 
  onSelect, 
  onDelete, 
  onDuplicate, 
  onExport 
}) => {
  const lastModified = new Date(project.lastModified);
  const isRecent = Date.now() - lastModified.getTime() < 24 * 60 * 60 * 1000; // 24時間以内

  // プロジェクト統計計算
  const stats = {
    objects: project.assets.objects.length,
    sounds: project.assets.audio.se.length + (project.assets.audio.bgm ? 1 : 0),
    rules: project.script.rules.length,
    totalSize: project.totalSize || 0
  };

  const sizeInMB = (stats.totalSize / 1024 / 1024).toFixed(1);
  const sizePercentage = (stats.totalSize / EDITOR_LIMITS.PROJECT.TOTAL_MAX_SIZE) * 100;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 overflow-hidden group">
      {/* サムネイル/プレビューエリア */}
      <div className="h-32 bg-gradient-to-br from-purple-100 to-pink-100 relative">
        {project.thumbnailDataUrl ? (
          <img 
            src={project.thumbnailDataUrl} 
            alt={project.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-3xl mb-1">🎮</div>
              <div className="text-xs text-gray-500">サムネイル未設定</div>
            </div>
          </div>
        )}
        
        {/* ステータスバッジ */}
        <div className="absolute top-2 left-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            project.status === 'published' ? 'bg-green-100 text-green-800' :
            project.status === 'testing' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {project.status === 'published' ? '公開済み' :
             project.status === 'testing' ? 'テスト中' : '下書き'}
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

        {/* アクションボタン（改善版）*/}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExport();
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white p-1 rounded-full text-xs"
            title="エクスポート"
          >
            💾
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="bg-yellow-500 hover:bg-yellow-600 text-white p-1 rounded-full text-xs"
            title="複製"
          >
            📄
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`「${project.name}」を削除しますか？この操作は取り消せません。`)) {
                onDelete();
              }
            }}
            className="bg-red-500 hover:bg-red-600 text-white p-1 rounded-full text-xs"
            title="削除"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* プロジェクト情報 */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-800 mb-2 line-clamp-1">
          {project.name}
        </h3>
        
        {project.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {project.description}
          </p>
        )}

        {/* 統計情報 */}
        <div className="grid grid-cols-3 gap-2 mb-3 text-xs text-gray-500">
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

        {/* 容量バー */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
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

        {/* 最終更新日時・保存回数 */}
        <div className="text-xs text-gray-500 mb-4">
          <div>最終更新: {lastModified.toLocaleDateString('ja-JP')} {lastModified.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</div>
          {project.metadata.statistics.saveCount > 0 && (
            <div>保存回数: {project.metadata.statistics.saveCount}回</div>
          )}
        </div>

        {/* 編集ボタン */}
        <button
          onClick={onSelect}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 rounded-xl font-medium transition-all duration-200 hover:scale-105"
        >
          編集する
        </button>
      </div>
    </div>
  );
};

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
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // ✨ useGameProject統合
  const {
    loading,
    error,
    createProject,
    deleteProject,
    duplicateProject,
    exportProject,
    listProjects
  } = useGameProject();

  // 通知表示ヘルパー
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // プロジェクト一覧の読み込み（✨ 実際のストレージから）
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const loadedProjects = await listProjects();
        setProjects(loadedProjects);
      } catch (error) {
        console.error('プロジェクト一覧の読み込みに失敗:', error);
        showNotification('error', 'プロジェクト一覧の読み込みに失敗しました');
      }
    };

    loadProjects();
  }, [listProjects]);

  // 検索フィルター
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  // 新規プロジェクト作成（✨ 実際のストレージ使用）
  const handleCreateNew = async () => {
    if (!newProjectName.trim()) return;

    try {
      const newProject = await createProject(newProjectName.trim());
      setProjects(prev => [newProject, ...prev]);
      onCreateNew(newProjectName.trim());
      setShowNewProjectModal(false);
      setNewProjectName('');
      showNotification('success', `「${newProject.name}」を作成しました`);
    } catch (error: any) {
      showNotification('error', `プロジェクト作成に失敗しました: ${error.message}`);
    }
  };

  // プロジェクト削除（✨ 実際のストレージ使用）
  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      if (onDelete) onDelete(projectId);
      showNotification('success', 'プロジェクトを削除しました');
    } catch (error: any) {
      showNotification('error', `削除に失敗しました: ${error.message}`);
    }
  };

  // プロジェクト複製（✨ 実際のストレージ使用）
  const handleDuplicateProject = async (projectId: string) => {
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
  };

  // プロジェクトエクスポート（✨ 実際のストレージ使用）
  const handleExportProject = async (projectId: string) => {
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
  };

  // ファイルインポート処理
  const handleFileImport = async (file: File) => {
    try {
      const importedProject = await (async () => {
        const text = await file.text();
        const data = JSON.parse(text);
        return data.project || data; // ProjectExportData形式または直接GameProject形式に対応
      })();

      setProjects(prev => [importedProject, ...prev]);
      showNotification('success', `「${importedProject.name}」をインポートしました`);
    } catch (error: any) {
      showNotification('error', `インポートに失敗しました: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      {/* エラー・通知表示 */}
      {error && (
        <div className="fixed top-4 left-4 right-4 z-50">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center">
              <span className="text-red-500 text-xl mr-3">⚠️</span>
              <p className="text-red-800 font-medium flex-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <div className={`p-4 rounded-2xl shadow-lg border-l-4 ${
            notification.type === 'success' ? 'bg-green-50 border-green-500 text-green-800' :
            notification.type === 'error' ? 'bg-red-50 border-red-500 text-red-800' :
            'bg-blue-50 border-blue-500 text-blue-800'
          }`}>
            <div className="flex items-center">
              <span className="text-xl mr-3">
                {notification.type === 'success' ? '✅' :
                 notification.type === 'error' ? '❌' : 'ℹ️'}
              </span>
              <p className="font-medium">{notification.message}</p>
              <button
                onClick={() => setNotification(null)}
                className="ml-auto text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              🎮 ゲームエディター
            </h1>
            <p className="text-lg text-gray-600">
              簡単にゲームを作って、みんなに遊んでもらおう！
            </p>
            
            {/* ストレージ統計表示 */}
            <div className="mt-4 text-sm text-gray-500">
              プロジェクト数: {projects.length}個 | 
              総容量: {(projects.reduce((sum, p) => sum + p.totalSize, 0) / 1024 / 1024).toFixed(1)}MB
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 検索と新規作成 */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1">
            <input
              type="text"
              placeholder="プロジェクトを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex gap-3">
            {/* インポートボタン */}
            <label className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-lg cursor-pointer">
              📂 インポート
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileImport(file);
                    e.target.value = ''; // リセット
                  }
                }}
                className="hidden"
              />
            </label>
            
            {/* 新規作成ボタン */}
            <button
              onClick={() => setShowNewProjectModal(true)}
              className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-lg"
            >
              ✨ 新しいゲームを作る
            </button>
          </div>
        </div>

        {/* プロジェクト一覧 */}
        {loading ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4 animate-spin">⏳</div>
            <p className="text-gray-600">プロジェクトを読み込み中...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎨</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {searchQuery ? 'プロジェクトが見つかりません' : 'まだプロジェクトがありません'}
            </h3>
            <p className="text-gray-600 mb-8">
              {searchQuery ? '別のキーワードで検索してみてください' : '初めてのゲームを作ってみましょう！'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-lg"
              >
                ✨ 新しいゲームを作る
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onSelect={() => onProjectSelect(project)}
                onDelete={() => handleDeleteProject(project.id)}
                onDuplicate={() => handleDuplicateProject(project.id)}
                onExport={() => handleExportProject(project.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* 新規プロジェクト作成モーダル */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">✨</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">新しいゲームを作る</h2>
              <p className="text-gray-600">ゲームの名前を決めましょう</p>
            </div>

            <div className="mb-6">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="ゲーム名を入力してください"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                maxLength={50}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateNew();
                  }
                }}
                autoFocus
              />
              <div className="text-xs text-gray-500 mt-1">
                {newProjectName.length}/50文字
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowNewProjectModal(false);
                  setNewProjectName('');
                }}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreateNew}
                disabled={!newProjectName.trim() || loading}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '作成中...' : '作成'}
              </button>
            </div>

            {/* テンプレート選択（将来実装） */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500 text-center">
                💡 テンプレートから始めることもできます（準備中）
              </p>
            </div>
          </div>
        </div>
      )}

      {/* フローティングヘルプボタン */}
      <div className="fixed bottom-6 right-6">
        <button className="bg-purple-500 hover:bg-purple-600 text-white p-4 rounded-full shadow-lg transition-colors">
          <span className="text-xl">❓</span>
        </button>
      </div>

      {/* 開発者情報 */}
      <div className="fixed bottom-2 left-2 text-xs text-gray-400">
        <div>Game Editor v1.0.0 - Phase 1-A ストレージ統合完了</div>
        <div>💡 Ctrl+Q: メイン画面に戻る</div>
      </div>
    </div>
  );
};