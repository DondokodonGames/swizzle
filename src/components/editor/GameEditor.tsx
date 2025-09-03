import React, { useState, useEffect } from 'react';
import { GameProject } from '../../types/editor/GameProject';
import { EDITOR_LIMITS } from '../../constants/EditorLimits';
import { AssetsTab } from './tabs/AssetsTab';
import { AudioTab } from './tabs/AudioTab';
import ScriptTab from './tabs/ScriptTab';
import SettingsTab from './tabs/SettingsTab';

// タブタイプ定義
type EditorTab = 'assets' | 'audio' | 'script' | 'settings';

interface GameEditorProps {
  project: GameProject;
  onProjectUpdate: (project: GameProject) => void;
  onSave: () => void;
  onPublish: () => void;
  onTestPlay: () => void;
  tabs?: Array<{
    id: EditorTab;
    label: string;
    icon: string;
    description: string;
    disabled?: boolean;
    badge?: string | number;
  }>;
}

export const GameEditor: React.FC<GameEditorProps> = ({
  project,
  onProjectUpdate,
  onSave,
  onPublish,
  onTestPlay,
  tabs: customTabs
}) => {
  const [activeTab, setActiveTab] = useState<EditorTab>('assets');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  // プロジェクト更新時の処理
  const handleProjectUpdate = (updatedProject: GameProject) => {
    onProjectUpdate({
      ...updatedProject,
      lastModified: new Date().toISOString(),
      editorState: {
        ...updatedProject.editorState,
        activeTab,
        lastSaved: new Date().toISOString(),
        autoSaveEnabled
      }
    });
    setHasUnsavedChanges(true);
  };

  // 自動保存機能
  useEffect(() => {
    if (autoSaveEnabled && hasUnsavedChanges) {
      const autoSaveTimer = setTimeout(() => {
        onSave();
        setHasUnsavedChanges(false);
      }, EDITOR_LIMITS.PROJECT.AUTO_SAVE_INTERVAL);

      return () => clearTimeout(autoSaveTimer);
    }
  }, [autoSaveEnabled, hasUnsavedChanges, onSave]);

  // 容量計算
  const calculateTotalSize = (): number => {
    const assets = project.assets;
    let total = 0;

    // 背景サイズ
    if (assets.background) {
      total += assets.background.totalSize;
    }

    // オブジェクトサイズ
    assets.objects.forEach(obj => {
      total += obj.totalSize;
    });

    // 音声サイズ
    if (assets.audio.bgm) {
      total += assets.audio.bgm.fileSize;
    }
    assets.audio.se.forEach(se => {
      total += se.fileSize;
    });

    return total;
  };

  const totalSize = calculateTotalSize();
  const sizePercentage = (totalSize / EDITOR_LIMITS.PROJECT.TOTAL_MAX_SIZE) * 100;

  // タブの設定（動的バッジ表示）
  const tabs = customTabs || [
    { 
      id: 'assets' as EditorTab, 
      label: '絵', 
      icon: '🎨', 
      description: 'キャラクター・背景・テキスト管理',
      badge: project.assets.objects.length + (project.assets.background ? 1 : 0) + project.assets.texts.length || undefined
    },
    { 
      id: 'audio' as EditorTab, 
      label: '音', 
      icon: '🎵', 
      description: '音楽・効果音管理',
      badge: (project.assets.audio.bgm ? 1 : 0) + project.assets.audio.se.length || undefined
    },
    { 
      id: 'script' as EditorTab, 
      label: 'ルール', 
      icon: '⚙️', 
      description: 'ゲーム動作・条件設定',
      badge: project.script.rules.length || undefined
    },
    { 
      id: 'settings' as EditorTab, 
      label: '公開', 
      icon: '🚀', 
      description: 'ゲーム設定・テスト・公開',
      badge: project.settings.publishing?.isPublished ? '✓' : undefined
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* プロジェクト情報 */}
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {project.name || project.settings.name || 'マイゲーム'}
                </h1>
                <p className="text-sm text-gray-500">
                  最終更新: {new Date(project.lastModified).toLocaleDateString('ja-JP')}
                  {hasUnsavedChanges && <span className="text-orange-500 ml-2">• 未保存</span>}
                  {project.status === 'published' && <span className="text-green-500 ml-2">• 公開中</span>}
                </p>
              </div>
            </div>

            {/* アクション */}
            <div className="flex items-center space-x-3">
              {/* 容量表示 */}
              <div className="text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600">容量:</span>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        sizePercentage > 90 ? 'bg-red-500' : 
                        sizePercentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(sizePercentage, 100)}%` }}
                    />
                  </div>
                  <span className={`text-xs ${sizePercentage > 90 ? 'text-red-600' : 'text-gray-600'}`}>
                    {(totalSize / 1024 / 1024).toFixed(1)}MB
                  </span>
                </div>
              </div>

              {/* 自動保存切り替え */}
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoSaveEnabled}
                  onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                  className="rounded"
                />
                <span className="text-gray-600">自動保存</span>
              </label>

              {/* アクションボタン */}
              <button
                onClick={onSave}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700 transition-colors"
              >
                💾 保存
              </button>
              <button
                onClick={onTestPlay}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                ▶️ テスト
              </button>
              <button
                onClick={onPublish}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-colors"
              >
                🚀 公開
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* タブナビゲーション */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 py-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center space-x-2 px-6 py-3 rounded-full font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-102'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
                {/* バッジ表示 */}
                {tab.badge && (
                  <span className={`absolute -top-1 -right-1 min-w-5 h-5 flex items-center justify-center text-xs font-bold rounded-full ${
                    activeTab === tab.id 
                      ? 'bg-white text-purple-600' 
                      : 'bg-red-500 text-white'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
          
          {/* タブ説明 */}
          <div className="pb-3">
            <p className="text-sm text-gray-500">
              {tabs.find(tab => tab.id === activeTab)?.description}
            </p>
          </div>
        </div>
      </nav>

      {/* メインコンテンツエリア */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 min-h-[600px]">
          <div className="p-6">
            {/* タブ別コンテンツ */}
            {activeTab === 'assets' && (
              <AssetsTab 
                project={project} 
                onProjectUpdate={handleProjectUpdate}
              />
            )}

            {activeTab === 'audio' && (
              <AudioTab
                project={project}
                onProjectUpdate={handleProjectUpdate}
              />
            )}

            {activeTab === 'script' && (
              <ScriptTab
                project={project}
                onProjectUpdate={handleProjectUpdate}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsTab
                project={project}
                onProjectUpdate={handleProjectUpdate}
              />
            )}
          </div>
        </div>
      </main>

      {/* フローティングヘルプボタン */}
      <div className="fixed bottom-6 right-6">
        <button className="bg-purple-500 hover:bg-purple-600 text-white p-4 rounded-full shadow-lg transition-colors">
          <span className="text-xl">❓</span>
        </button>
      </div>

      {/* 開発進捗表示（デバッグ用） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-6 left-6 bg-black bg-opacity-80 text-white text-xs p-3 rounded-lg">
          <div>🎯 Phase 6.4 完了</div>
          <div>📊 Assets: {project.assets.objects.length}, Rules: {project.script.rules.length}</div>
          <div>💾 Size: {(totalSize / 1024 / 1024).toFixed(1)}MB</div>
        </div>
      )}
    </div>
  );
};

