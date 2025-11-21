import React, { useState } from 'react';
import { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { GameProject } from '../../../types/editor/GameProject';
import { DESIGN_TOKENS } from '../../../constants/DesignSystem';

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

// 🔧 修正: デフォルトタブ設定（3タブ統合・多言語化対応）
export const getDefaultEditorTabs = (t: TFunction): TabConfig[] => [
  {
    id: 'assets',
    label: t('editor.tabs.assets'),
    icon: '🎨',
    description: t('editor.tabs.assetsDescription'),
    progress: 0
  },
  {
    id: 'script',
    label: t('editor.tabs.script'),
    icon: '⚙️',
    description: t('editor.tabs.scriptDescription'),
    progress: 0
  },
  {
    id: 'settings',
    label: t('editor.tabs.settings'),
    icon: '🚀',
    description: t('editor.tabs.settingsDescription'),
    progress: 0
  }
];

// 後方互換性のため、デフォルト値を保持（非推奨）
export const DEFAULT_EDITOR_TABS: TabConfig[] = [
  {
    id: 'assets',
    label: 'Assets',
    icon: '🎨',
    description: 'Image, Audio, Text Management',
    progress: 0
  },
  {
    id: 'script',
    label: 'Rules',
    icon: '⚙️',
    description: 'Game Logic & Conditions',
    progress: 0
  },
  {
    id: 'settings',
    label: 'Publish',
    icon: '🚀',
    description: 'Test Play & Publishing',
    progress: 0
  }
];

// 🔧 修正: プロジェクトの進捗を反映したタブ設定生成（3タブ統合 + audio安全アクセス対応 + 多言語化対応）
export const getProgressTabConfig = (project: GameProject, t: TFunction): TabConfig[] => {
  if (!project) return getDefaultEditorTabs(t);

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

    // 公開設定が完了していれば25%
    if (project.settings?.publishing?.isPublished) progress += 25;

    return Math.min(progress, 100);
  };

  return [
    {
      id: 'assets',
      label: t('editor.tabs.assets'),
      icon: '🎨',
      description: t('editor.tabs.assetsDescription'),
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
      label: t('editor.tabs.script'),
      icon: '⚙️',
      description: t('editor.tabs.scriptDescription'),
      badge: project.script?.rules?.length || undefined,
      progress: calculateScriptProgress()
    },
    {
      id: 'settings',
      label: t('editor.tabs.settings'),
      icon: '🚀',
      description: t('editor.tabs.settingsDescription'),
      badge: project.settings.publishing?.isPublished ? '✓' : undefined,
      progress: calculateSettingsProgress()
    }
  ];
};

// 🔧 修正: タブナビゲーション判定ヘルパー（3タブ対応 + audio安全アクセス対応 + 多言語化対応）
export const getTabValidationStatus = (project: GameProject, tabId: EditorTab, t: TFunction): {
  canNavigate: boolean;
  warnings: string[];
  errors: string[];
} => {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  switch (tabId) {
    case 'assets':
      if (!project.assets.background && project.assets.objects.length === 0) {
        warnings.push(t('editor.validation.warnings.addBackgroundOrObjects'));
      }
      // 🔧 修正: audio チェック（オプショナルチェーン使用）
      if (!project.assets.audio?.bgm && (project.assets.audio?.se?.length || 0) === 0) {
        warnings.push(t('editor.validation.warnings.addAudioRecommended'));
      }
      break;

    // 🔧 削除: audioケース（assetsに統合）

    case 'script':
      if (project.script.rules.length === 0) {
        warnings.push(t('editor.validation.warnings.setGameRules'));
      }
      if (project.script.successConditions.length === 0) {
        warnings.push(t('editor.validation.warnings.setSuccessConditions'));
      }
      break;

    case 'settings':
      if (!project.settings.name?.trim()) {
        errors.push(t('editor.validation.errors.gameNameRequired'));
      }
      if (project.assets.objects.length === 0 && !project.assets.background) {
        errors.push(t('editor.validation.errors.atLeastOneAsset'));
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
  const { t } = useTranslation();
  const [hoveredTabId, setHoveredTabId] = useState<EditorTab | null>(null);

  // 進捗バーの色を取得
  const getProgressBarColor = (progress: number) => {
    if (progress === 100) return DESIGN_TOKENS.colors.success[500];
    if (progress >= 50) return DESIGN_TOKENS.colors.warning[500];
    return DESIGN_TOKENS.colors.primary[500];
  };

  // スタイル定義
  const navContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: DESIGN_TOKENS.spacing[1],
    backgroundColor: DESIGN_TOKENS.colors.neutral[100],
    padding: DESIGN_TOKENS.spacing[1],
    borderRadius: DESIGN_TOKENS.borderRadius.xl,
  };

  const getTabButtonStyle = (
    tab: TabConfig,
    isActive: boolean,
    isHovered: boolean,
    isDisabled: boolean
  ): React.CSSProperties => {
    if (isDisabled) {
      return {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: DESIGN_TOKENS.spacing[2],
        paddingLeft: DESIGN_TOKENS.spacing[4],
        paddingRight: DESIGN_TOKENS.spacing[4],
        paddingTop: DESIGN_TOKENS.spacing[2],
        paddingBottom: DESIGN_TOKENS.spacing[2],
        borderRadius: DESIGN_TOKENS.borderRadius.lg,
        fontWeight: 500,
        transition: 'all 0.2s ease-in-out',
        opacity: 0.5,
        cursor: 'not-allowed',
        backgroundColor: 'transparent',
        color: DESIGN_TOKENS.colors.neutral[600],
        border: 'none',
      };
    }

    if (isActive) {
      return {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: DESIGN_TOKENS.spacing[2],
        paddingLeft: DESIGN_TOKENS.spacing[4],
        paddingRight: DESIGN_TOKENS.spacing[4],
        paddingTop: DESIGN_TOKENS.spacing[2],
        paddingBottom: DESIGN_TOKENS.spacing[2],
        borderRadius: DESIGN_TOKENS.borderRadius.lg,
        fontWeight: 500,
        transition: 'all 0.2s ease-in-out',
        backgroundColor: DESIGN_TOKENS.colors.neutral[0],
        color: DESIGN_TOKENS.colors.purple[600],
        boxShadow: DESIGN_TOKENS.shadows.sm,
        cursor: 'pointer',
        border: 'none',
      };
    }

    return {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: DESIGN_TOKENS.spacing[2],
      paddingLeft: DESIGN_TOKENS.spacing[4],
      paddingRight: DESIGN_TOKENS.spacing[4],
      paddingTop: DESIGN_TOKENS.spacing[2],
      paddingBottom: DESIGN_TOKENS.spacing[2],
      borderRadius: DESIGN_TOKENS.borderRadius.lg,
      fontWeight: 500,
      transition: 'all 0.2s ease-in-out',
      backgroundColor: isHovered ? DESIGN_TOKENS.colors.neutral[50] : 'transparent',
      color: isHovered ? DESIGN_TOKENS.colors.neutral[800] : DESIGN_TOKENS.colors.neutral[600],
      cursor: 'pointer',
      border: 'none',
    };
  };

  const iconStyle: React.CSSProperties = {
    fontSize: '1.125rem',
  };

  const getBadgeStyle = (isActive: boolean): React.CSSProperties => ({
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    minWidth: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 700,
    borderRadius: DESIGN_TOKENS.borderRadius.full,
    backgroundColor: isActive ? DESIGN_TOKENS.colors.purple[100] : DESIGN_TOKENS.colors.neutral[300],
    color: isActive ? DESIGN_TOKENS.colors.purple[600] : DESIGN_TOKENS.colors.neutral[600],
  });

  const progressBarContainerStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '4px',
    backgroundColor: DESIGN_TOKENS.colors.neutral[200],
    borderBottomLeftRadius: DESIGN_TOKENS.borderRadius.lg,
    borderBottomRightRadius: DESIGN_TOKENS.borderRadius.lg,
    overflow: 'hidden',
  };

  const getProgressBarFillStyle = (progress: number): React.CSSProperties => ({
    height: '100%',
    transition: 'all 0.3s ease-in-out',
    backgroundColor: getProgressBarColor(progress),
    width: `${progress}%`,
  });

  const errorIndicatorStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-4px',
    left: '-4px',
    width: '12px',
    height: '12px',
    backgroundColor: DESIGN_TOKENS.colors.error[500],
    borderRadius: DESIGN_TOKENS.borderRadius.full,
  };

  const warningIndicatorStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-4px',
    left: '-4px',
    width: '12px',
    height: '12px',
    backgroundColor: DESIGN_TOKENS.colors.warning[500],
    borderRadius: DESIGN_TOKENS.borderRadius.full,
  };

  return (
    <nav style={navContainerStyle}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const isHovered = hoveredTabId === tab.id;
        const validation = project ? getTabValidationStatus(project, tab.id, t) : { canNavigate: true, warnings: [], errors: [] };
        const titleText = `${tab.description}${validation.warnings.length > 0 ? '\n⚠️ ' + validation.warnings.join('\n') : ''}${validation.errors.length > 0 ? '\n❌ ' + validation.errors.join('\n') : ''}`;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            disabled={tab.disabled}
            onMouseEnter={() => setHoveredTabId(tab.id)}
            onMouseLeave={() => setHoveredTabId(null)}
            style={getTabButtonStyle(tab, isActive, isHovered, !!tab.disabled)}
            title={titleText}
          >
            <span style={iconStyle}>{tab.icon}</span>
            <span>{tab.label}</span>
            
            {/* バッジ表示 */}
            {tab.badge && (
              <span style={getBadgeStyle(isActive)}>
                {tab.badge}
              </span>
            )}
            
            {/* 進捗バー */}
            {typeof tab.progress === 'number' && tab.progress > 0 && (
              <div style={progressBarContainerStyle}>
                <div style={getProgressBarFillStyle(tab.progress)} />
              </div>
            )}
            
            {/* エラー・警告インジケーター */}
            {validation.errors.length > 0 && (
              <span style={errorIndicatorStyle}></span>
            )}
            {validation.warnings.length > 0 && validation.errors.length === 0 && (
              <span style={warningIndicatorStyle}></span>
            )}
          </button>
        );
      })}
    </nav>
  );
};

// タブ完成度の総合計算
export const calculateOverallProgress = (project: GameProject, t: TFunction): number => {
  const tabs = getProgressTabConfig(project, t);
  const totalProgress = tabs.reduce((sum, tab) => sum + (tab.progress || 0), 0);
  return Math.round(totalProgress / tabs.length);
};

// 次に推奨するタブの取得
export const getRecommendedNextTab = (project: GameProject, currentTab: EditorTab, t: TFunction): EditorTab | null => {
  const tabs = getProgressTabConfig(project, t);
  
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