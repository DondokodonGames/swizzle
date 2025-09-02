import React, { useState, useEffect } from 'react';
import { GameProject } from '../../types/editor/GameProject';
import { EDITOR_LIMITS } from '../../constants/EditorLimits';
import { AssetsTab } from './tabs/AssetsTab';
import { AudioTab } from './tabs/AudioTab';

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

  // タブの設定
  const tabs = customTabs || [
    { id: 'assets' as EditorTab, label: '絵', icon: '🎨', description: 'キャラクター・背景管理' },
    { id: 'audio' as EditorTab, label: '音', icon: '🎵', description: '音楽・効果音管理' },
    { id: 'script' as EditorTab, label: 'ルール', icon: '⚙️', description: 'ゲーム動作設定' },
    { id: 'settings' as EditorTab, label: '公開', icon: '🚀', description: '設定・テスト・公開' }
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
                  {project.name || 'マイゲーム'}
                </h1>
                <p className="text-sm text-gray-500">
                  最終更新: {new Date(project.lastModified).toLocaleDateString('ja-JP')}
                  {hasUnsavedChanges && <span className="text-orange-500 ml-2">• 未保存</span>}
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
                className={`flex items-center space-x-2 px-6 py-3 rounded-full font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-102'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
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
                onProjectUpdate={onProjectUpdate}
              />
            )}

            {activeTab === 'audio' && (
              <AudioTab
                project={project}
                onProjectUpdate={onProjectUpdate}
              />
            )}

            {activeTab === 'script' && (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">⚙️</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">ルール設定画面</h3>
                <p className="text-gray-600 mb-8">
                  ゲームの動作ルールと成功条件を設定します
                </p>
                <div className="bg-gray-50 rounded-xl p-8 max-w-md mx-auto">
                  <div className="text-gray-500 text-sm">
                    <p>• ルール: {project.script.rules.length}個</p>
                    <p>• 成功条件: {project.script.successConditions.length}個</p>
                    <p>• フラグ: {project.script.flags.length}個</p>
                  </div>
                  <div className="mt-4 text-blue-600 text-sm">
                    🚧 Phase 6.4で実装予定
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🚀</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">設定・公開画面</h3>
                <p className="text-gray-600 mb-8">
                  ゲーム情報の設定とテスト、公開を行います
                </p>
                <div className="bg-gray-50 rounded-xl p-8 max-w-md mx-auto">
                  <div className="text-gray-500 text-sm">
                    <p>• ゲーム名: {project.name}</p>
                    <p>• 時間設定: {project.settings.duration.type === 'fixed' ? `${project.settings.duration.seconds}秒` : '無制限'}</p>
                    <p>• 難易度: {project.settings.difficulty}</p>
                    <p>• 状態: {project.status}</p>
                  </div>
                  <div className="mt-4 text-blue-600 text-sm">
                    🚧 Phase 6.4で実装予定
                  </div>
                </div>
              </div>
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
    </div>
  );
};