import React, { useState, useEffect } from 'react';
import { GameProject } from '../../types/editor/GameProject';
import { EDITOR_LIMITS } from '../../constants/EditorLimits';

interface ProjectSelectorProps {
  onProjectSelect: (project: GameProject) => void;
  onCreateNew: (name: string) => void;
  onDelete?: (projectId: string) => void;      // ← 追加
  onDuplicate?: (projectId: string) => void;   // ← 追加 
  onExport?: (projectId: string) => void;      // ← 追加
}

interface ProjectCardProps {
  project: GameProject;
  onSelect: () => void;
  onDelete: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onSelect, onDelete }) => {
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

        {/* 削除ボタン */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`「${project.name}」を削除しますか？この操作は取り消せません。`)) {
              onDelete();
            }
          }}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white p-1 rounded-full text-xs"
        >
          🗑️
        </button>
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

        {/* 最終更新日時 */}
        <div className="text-xs text-gray-500 mb-4">
          最終更新: {lastModified.toLocaleDateString('ja-JP')} {lastModified.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
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
  onCreateNew
}) => {
  const [projects, setProjects] = useState<GameProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // プロジェクト一覧の読み込み（実際の実装ではローカルストレージやAPIから取得）
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true);
        // TODO: 実際のプロジェクト読み込み処理を実装
        // const loadedProjects = await ProjectStorage.listProjects();
        // setProjects(loadedProjects);
        
        // デモデータ
        const demoProjects: GameProject[] = [
          {
            id: 'demo-1',
            name: 'マイゲーム1',
            description: '初めて作ったゲームです',
            createdAt: '2025-09-01T10:00:00.000Z',
            lastModified: '2025-09-01T15:30:00.000Z',
            version: '1.0.0',
            creator: { isAnonymous: true },
            status: 'draft',
            totalSize: 12 * 1024 * 1024, // 12MB
            assets: {
              background: null,
              objects: [
                {
                  id: 'obj1',
                  name: 'キャラクター1',
                  frames: [],
                  animationSettings: { speed: 10, loop: true, pingPong: false, autoStart: true },
                  totalSize: 2 * 1024 * 1024,
                  createdAt: '2025-09-01T10:00:00.000Z',
                  lastModified: '2025-09-01T10:00:00.000Z',
                  defaultScale: 1.0,
                  defaultOpacity: 1.0,
                }
              ],
              texts: [],
              audio: { bgm: null, se: [] },
              statistics: { 
                totalImageSize: 0, 
                totalAudioSize: 0, 
                totalSize: 0,
                usedSlots: { 
                  background: 0,
                  objects: 1, 
                  texts: 0, 
                  bgm: 0,
                  se: 0 
                },
                limitations: {
                  isNearImageLimit: false,
                  isNearAudioLimit: false,
                  isNearTotalLimit: false,
                  hasViolations: false
                }
              },
              lastModified: '2025-09-01T10:00:00.000Z'
            },
            script: {
              layout: {
                background: { visible: true, initialAnimation: 0, animationSpeed: 10, autoStart: true },
                objects: [],
                texts: [],
                stage: { backgroundColor: '#ffffff' }
              },
              flags: [],
              rules: [],
              successConditions: [],
              statistics: { 
                totalRules: 0, 
                totalConditions: 0, 
                totalActions: 0, 
                complexityScore: 0,
                usedTriggerTypes: [],
                usedActionTypes: [],
                flagCount: 0,
                estimatedCPUUsage: 'low',
                estimatedMemoryUsage: 0,
                maxConcurrentEffects: 0
              },
              version: '1.0.0',
              lastModified: '2025-09-01T10:00:00.000Z'
            },
            settings: {
              name: 'マイゲーム1',
              duration: { type: 'fixed', seconds: 10 },
              difficulty: 'easy',
              publishing: {
                isPublished: false,
                visibility: 'private',
                allowComments: true,
                allowRemix: true
              },
              preview: {},
              export: { includeSourceData: true, compressionLevel: 'medium', format: 'json' }
            },
            metadata: {
              statistics: {
                totalEditTime: 0,
                saveCount: 0,
                testPlayCount: 0,
                publishCount: 0
              },
              usage: {
                lastOpened: '2025-09-01T10:00:00.000Z',
                totalOpenCount: 1,
                averageSessionTime: 0
              },
              performance: {
                lastBuildTime: 0,
                averageFPS: 60,
                memoryUsage: 0
              }
            },
            versionHistory: [],
            projectSettings: {
              autoSaveInterval: 30000,
              backupEnabled: true,
              compressionEnabled: false,
              maxVersionHistory: 10
            }
          }
        ];
        setProjects(demoProjects);
      } catch (error) {
        console.error('プロジェクトの読み込みに失敗しました:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, []);

  // 検索フィルター
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  // 新規プロジェクト作成
  const handleCreateNew = () => {
    if (newProjectName.trim()) {
      onCreateNew(newProjectName.trim());
      setShowNewProjectModal(false);
      setNewProjectName('');
    }
  };

  // プロジェクト削除
  const handleDeleteProject = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    // TODO: 実際のストレージからも削除
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
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
          <button
            onClick={() => setShowNewProjectModal(true)}
            className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-lg"
          >
            ✨ 新しいゲームを作る
          </button>
        </div>

        {/* プロジェクト一覧 */}
        {loading ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">⏳</div>
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
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreateNew}
                disabled={!newProjectName.trim()}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                作成
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
    </div>
  );
};