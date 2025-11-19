import React from 'react';
import { GameProject } from '../../../types/editor/GameProject';

// 🔧 修正: エディタータブ型定義（3タブ統合）
export type EditorTab = 'assets' | 'script' | 'settings';

// タブ設定インターフェース
export interface TabConfig {
  id: EditorTab;
  label: string;
  icon: string;
  description: string;
  disabled?: boolean;
  badge?: string | number;
  progress?: number; // 0-100 完成度
}

// 🔧 修正: デフォルトタブ設定（3タブ統合）
export const DEFAULT_EDITOR_TABS: TabConfig[] = [
  {
    id: 'assets',
    label: 'アセット',
    icon: '🎨',
    description: '画像・音声・テキスト管理',
    progress: 0
  },
  {
    id: 'script',
    label: 'ルール',
    icon: '⚙️',
    description: 'ゲーム動作・条件設定',
    progress: 0
  },
  {
    id: 'settings',
    label: '公開',
    icon: '🚀',
    description: 'テストプレイ・公開管理',
    progress: 0
  }
];

// 🔧 修正: プロジェクトの進捗を反映したタブ設定生成（3タブ統合 + audio安全アクセス対応）
export const getProgressTabConfig = (project: GameProject): TabConfig[] => {
  if (!project) return DEFAULT_EDITOR_TABS;

  // 🔧 修正: アセット進捗計算（音声を含む統合版 + 安全アクセス）
  const calculateAssetsProgress = () => {
    let progress = 0;
    const totalSteps = 4; // 背景、オブジェクト、テキスト、音声の4要素
    
    // 背景があれば25%
    if (project.assets.background) progress += 25;
    
    // オブジェクトがあれば25%
    if (project.assets.objects.length > 0) progress += 25;
    
    // テキストがあれば25%
    if (project.assets.texts.length > 0) progress += 25;
    
    // 🔧 修正: 音声（BGMまたはSE）があれば25%（オプショナルチェーン使用）
    if (project.assets.audio?.bgm || (project.assets.audio?.se?.length || 0) > 0) progress += 25;
    
    return Math.min(progress, 100);
  };

  const calculateScriptProgress = () => {
    let progress = 0;

    // ルールがあれば50%
    if (project.script?.rules?.length > 0) progress += 50;

    // 成功条件があれば50%
    if (project.script?.successConditions?.length > 0) progress += 50;

    return Math.min(progress, 100);
  };

  const calculateSettingsProgress = () => {
    let progress = 0;

    // ゲーム名があれば25%
    if (project.settings?.name?.trim()) progress += 25;

    // 説明があれば25%
    if (project.settings?.description?.trim()) progress += 25;

    // 時間設定があれば25%
    if (project.settings?.duration?.type === 'fixed' && project.settings?.duration?.seconds) progress += 25;
    // タイマー設定もチェック（別形式）
    if (project.settings?.timer?.enabled && project.settings?.timer?.duration) progress += 25;

    // 公開設定が完了していれば25%
    if (project.settings?.publishing?.isPublished) progress += 25;

    return Math.min(progress, 100);
  };

  return [
    {
      id: 'assets',
      label: 'アセット',
      icon: '🎨',
      description: '画像・音声・テキスト管理',
      // 🔧 修正: badge計算（オプショナルチェーン使用）
      badge: (
        project.assets.objects.length + 
        (project.assets.background ? 1 : 0) + 
        project.assets.texts.length +
        (project.assets.audio?.bgm ? 1 : 0) + 
        (project.assets.audio?.se?.length || 0)
      ) || undefined,
      progress: calculateAssetsProgress()
    },
    {
      id: 'script',
      label: 'ルール',
      icon: '⚙️',
      description: 'ゲーム動作・条件設定',
      badge: project.script?.rules?.length || undefined,
      progress: calculateScriptProgress()
    },
    {
      id: 'settings',
      label: '公開',
      icon: '🚀',
      description: 'テストプレイ・公開管理',
      badge: project.settings.publishing?.isPublished ? '✓' : undefined,
      progress: calculateSettingsProgress()
    }
  ];
};

// 🔧 修正: タブナビゲーション判定ヘルパー（3タブ対応 + audio安全アクセス対応）
export const getTabValidationStatus = (project: GameProject, tabId: EditorTab): {
  canNavigate: boolean;
  warnings: string[];
  errors: string[];
} => {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  switch (tabId) {
    case 'assets':
      if (!project.assets.background && project.assets.objects.length === 0) {
        warnings.push('背景またはオブジェクトを追加することをおすすめします');
      }
      // 🔧 修正: audio チェック（オプショナルチェーン使用）
      if (!project.assets.audio?.bgm && (project.assets.audio?.se?.length || 0) === 0) {
        warnings.push('音声を追加するとゲームがより楽しくなります');
      }
      break;
      
    // 🔧 削除: audioケース（assetsに統合）
      
    case 'script':
      if (project.script.rules.length === 0) {
        warnings.push('ゲームルールを設定してください');
      }
      if (project.script.successConditions.length === 0) {
        warnings.push('成功条件を設定してください');
      }
      break;
      
    case 'settings':
      if (!project.settings.name?.trim()) {
        errors.push('ゲーム名は必須です');
      }
      if (project.assets.objects.length === 0 && !project.assets.background) {
        errors.push('公開するには最低1つのアセットが必要です');
      }
      break;
  }
  
  return {
    canNavigate: errors.length === 0,
    warnings,
    errors
  };
};

// タブナビゲーションコンポーネント（基本版）
interface TabNavigationProps {
  tabs: TabConfig[];
  activeTab: EditorTab;
  onTabChange: (tabId: EditorTab) => void;
  project?: GameProject;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
  project
}) => {
  return (
    <nav className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const validation = project ? getTabValidationStatus(project, tab.id) : { canNavigate: true, warnings: [], errors: [] };
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            disabled={tab.disabled}
            className={`relative flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
              isActive
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            } ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={`${tab.description}${validation.warnings.length > 0 ? '\n⚠️ ' + validation.warnings.join('\n') : ''}${validation.errors.length > 0 ? '\n❌ ' + validation.errors.join('\n') : ''}`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
            
            {/* バッジ表示 */}
            {tab.badge && (
              <span className={`absolute -top-1 -right-1 min-w-5 h-5 flex items-center justify-center text-xs font-bold rounded-full ${
                isActive 
                  ? 'bg-purple-100 text-purple-600'
                  : 'bg-gray-300 text-gray-600'
              }`}>
                {tab.badge}
              </span>
            )}
            
            {/* 進捗バー */}
            {typeof tab.progress === 'number' && tab.progress > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    tab.progress === 100 ? 'bg-green-500' :
                    tab.progress >= 50 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${tab.progress}%` }}
                />
              </div>
            )}
            
            {/* エラー・警告インジケーター */}
            {validation.errors.length > 0 && (
              <span className="absolute -top-1 -left-1 w-3 h-3 bg-red-500 rounded-full"></span>
            )}
            {validation.warnings.length > 0 && validation.errors.length === 0 && (
              <span className="absolute -top-1 -left-1 w-3 h-3 bg-yellow-500 rounded-full"></span>
            )}
          </button>
        );
      })}
    </nav>
  );
};

// タブ完成度の総合計算
export const calculateOverallProgress = (project: GameProject): number => {
  const tabs = getProgressTabConfig(project);
  const totalProgress = tabs.reduce((sum, tab) => sum + (tab.progress || 0), 0);
  return Math.round(totalProgress / tabs.length);
};

// 次に推奨するタブの取得
export const getRecommendedNextTab = (project: GameProject, currentTab: EditorTab): EditorTab | null => {
  const tabs = getProgressTabConfig(project);
  
  // 現在のタブのインデックス
  const currentIndex = tabs.findIndex(tab => tab.id === currentTab);
  
  // 完成度の低いタブを優先
  const sortedTabs = [...tabs].sort((a, b) => (a.progress || 0) - (b.progress || 0));
  
  // 現在のタブより完成度が低く、まだ完成していないタブ
  const recommendedTab = sortedTabs.find(tab => 
    tab.id !== currentTab && 
    (tab.progress || 0) < 100 &&
    (tab.progress || 0) < (tabs[currentIndex]?.progress || 0)
  );
  
  return recommendedTab?.id || null;
};

export default TabNavigation;