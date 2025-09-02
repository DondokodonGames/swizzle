import React from 'react';

export type EditorTab = 'assets' | 'audio' | 'script' | 'settings';

export interface TabConfig {
  id: EditorTab;
  label: string;
  icon: string;
  description: string;
  disabled?: boolean;
  badge?: string | number;
}

interface TabNavigationProps {
  activeTab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
  tabs: TabConfig[];
  className?: string;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  tabs,
  className = ''
}) => {
  return (
    <nav className={`bg-white shadow-sm ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* モバイル対応ドロップダウン（画面幅狭い時） */}
        <div className="sm:hidden">
          <select
            value={activeTab}
            onChange={(e) => onTabChange(e.target.value as EditorTab)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id} disabled={tab.disabled}>
                {tab.icon} {tab.label}
                {tab.badge && ` (${tab.badge})`}
              </option>
            ))}
          </select>
        </div>

        {/* デスクトップ・タブレット対応タブ */}
        <div className="hidden sm:flex space-x-1 py-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && onTabChange(tab.id)}
              disabled={tab.disabled}
              className={`flex items-center space-x-2 px-6 py-3 rounded-full font-semibold transition-all duration-200 relative ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md scale-105'
                  : tab.disabled
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-102'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
              
              {/* バッジ表示 */}
              {tab.badge && (
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  activeTab === tab.id
                    ? 'bg-white bg-opacity-20 text-white'
                    : 'bg-purple-100 text-purple-600'
                }`}>
                  {tab.badge}
                </span>
              )}

              {/* 無効状態のオーバーレイ */}
              {tab.disabled && (
                <div className="absolute inset-0 bg-gray-200 bg-opacity-50 rounded-full flex items-center justify-center">
                  <span className="text-xs bg-gray-600 text-white px-2 py-1 rounded">準備中</span>
                </div>
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
  );
};

// プリセット用のタブ設定
export const DEFAULT_EDITOR_TABS: TabConfig[] = [
  { 
    id: 'assets', 
    label: '絵', 
    icon: '🎨', 
    description: '背景、キャラクター、テキストを管理します' 
  },
  { 
    id: 'audio', 
    label: '音', 
    icon: '🎵', 
    description: 'BGMと効果音を管理します' 
  },
  { 
    id: 'script', 
    label: 'ルール', 
    icon: '⚙️', 
    description: 'ゲームの動作ルールと成功条件を設定します' 
  },
  { 
    id: 'settings', 
    label: '公開', 
    icon: '🚀', 
    description: 'ゲーム情報の設定とテスト、公開を行います' 
  }
];

// タブの進捗チェック用ヘルパー関数
export const getTabCompletionStatus = (tab: EditorTab, project: any): { completed: boolean; progress: number } => {
  switch (tab) {
    case 'assets':
      const hasBackground = !!project.assets?.background;
      const hasObjects = project.assets?.objects?.length > 0;
      const assetsProgress = (hasBackground ? 50 : 0) + (hasObjects ? 50 : 0);
      return { completed: assetsProgress === 100, progress: assetsProgress };
      
    case 'audio':
      const hasBGM = !!project.assets?.audio?.bgm;
      const hasSE = project.assets?.audio?.se?.length > 0;
      const audioProgress = (hasBGM ? 50 : 0) + (hasSE ? 50 : 0);
      return { completed: audioProgress === 100, progress: audioProgress };
      
    case 'script':
      const hasRules = project.script?.rules?.length > 0;
      const hasSuccess = project.script?.successConditions?.length > 0;
      const scriptProgress = (hasRules ? 50 : 0) + (hasSuccess ? 50 : 0);
      return { completed: scriptProgress === 100, progress: scriptProgress };
      
    case 'settings':
      const hasName = !!project.name?.trim();
      const hasSettings = !!project.settings?.duration;
      const settingsProgress = (hasName ? 50 : 0) + (hasSettings ? 50 : 0);
      return { completed: settingsProgress === 100, progress: settingsProgress };
      
    default:
      return { completed: false, progress: 0 };
  }
};

// プログレス付きタブ設定を生成
export const getProgressTabConfig = (project: any): TabConfig[] => {
  return DEFAULT_EDITOR_TABS.map(tab => {
    const { completed, progress } = getTabCompletionStatus(tab.id, project);
    return {
      ...tab,
      badge: completed ? '✓' : progress > 0 ? `${progress}%` : undefined
    };
  });
};