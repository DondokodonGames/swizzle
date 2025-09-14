// GameEditor.tsx - 紫色残存部分完全修正版
// 🎨 テーマ統合・色彩統一・レスポンシブ対応

import React, { useState, useEffect } from 'react';
import { useGameTheme, ThemeType, GameCategory } from '../ui/GameThemeProvider';
import GameThemeProvider from '../ui/GameThemeProvider';
import ArcadeButton from '../ui/ArcadeButton';
import { GameProject } from '../../types/editor/GameProject';
import { EDITOR_LIMITS, EditorTab } from '../../constants/EditorLimits';
import { AssetsTab } from './tabs/AssetsTab';
import { ScriptTab } from './tabs/ScriptTab';
import { SettingsTab } from './tabs/SettingsTab';

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

  // 🎨 テーマシステム統合（完全版）
  const { 
    currentTheme, 
    themeType, 
    gameCategory, 
    setThemeType, 
    setGameCategory 
  } = useGameTheme();

  // プロジェクト更新時の処理
  const handleProjectUpdate = (updatedProject: GameProject) => {
    onProjectUpdate({
      ...updatedProject,
      lastModified: new Date().toISOString(),
      editorState: {
        ...updatedProject.editorState,
        activeTab,
        lastSaved: new Date().toISOString(),
        autoSaveEnabled,
        tabStates: updatedProject.editorState?.tabStates || {
          assets: {
            selectedAssetType: null,
            selectedAssetId: null,
            showAnimationEditor: false
          },
          script: {
            mode: 'layout',
            selectedObjectId: null,
            selectedRuleId: null,
            showRuleEditor: false
          },
          settings: {
            showTestPlay: false,
            lastTestResult: null
          }
        },
        ui: updatedProject.editorState?.ui || {
          sidebarCollapsed: false,
          previewVisible: true,
          capacityMeterExpanded: false
        }
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

  // プロジェクト変更監視
  useEffect(() => {
    setHasUnsavedChanges(false);
  }, [project.id]);

  // 容量計算
  const calculateTotalSize = (): number => {
    const assets = project.assets;
    let total = 0;

    if (assets.background) {
      total += assets.background.totalSize;
    }

    assets.objects.forEach(obj => {
      total += obj.totalSize;
    });

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

  // タブの設定（3タブ統合版）
  const tabs = customTabs || [
    { 
      id: 'assets' as EditorTab, 
      label: 'アセット', 
      icon: '🎨', 
      description: '画像・音声・テキスト管理',
      badge: (
        project.assets.objects.length + 
        (project.assets.background ? 1 : 0) + 
        project.assets.texts.length +
        (project.assets.audio.bgm ? 1 : 0) + 
        project.assets.audio.se.length
      ) || undefined
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
      description: 'テストプレイ・公開管理',
      badge: project.settings.publishing?.isPublished ? '✓' : (project.settings.name ? '📝' : undefined)
    }
  ];

  // プロジェクト完成度判定
  const getProjectCompleteness = (): { percentage: number; issues: string[] } => {
    const issues: string[] = [];
    let score = 0;
    const maxScore = 5;

    if (project.settings.name?.trim()) {
      score += 1;
    } else {
      issues.push('ゲーム名を設定してください');
    }

    if (project.assets.objects.length > 0 || project.assets.background) {
      score += 1;
    } else {
      issues.push('背景またはオブジェクトを追加してください');
    }

    if (project.settings.duration) {
      score += 1;
    } else {
      issues.push('ゲーム時間を設定してください');
    }

    if (project.script.rules.length > 0) {
      score += 1;
    }

    if (project.settings.preview?.thumbnailDataUrl) {
      score += 1;
    }

    return {
      percentage: (score / maxScore) * 100,
      issues
    };
  };

  const completeness = getProjectCompleteness();

  // 🎨 テーマセレクター（統合版）
  const renderThemeSelector = () => (
    <div className="flex items-center space-x-3 mb-4">
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium" style={{ color: currentTheme.colors.text }}>
          🎨 テーマ:
        </label>
        <select
          value={themeType}
          onChange={(e) => setThemeType(e.target.value as ThemeType)}
          className="px-3 py-2 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2"
          style={{
            background: currentTheme.colors.background,
            color: currentTheme.colors.text,
            borderColor: currentTheme.colors.border
          }}
          onFocus={(e) => {
            e.target.style.borderColor = currentTheme.colors.primary;
            e.target.style.boxShadow = `0 0 0 2px ${currentTheme.colors.primary}40`;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = currentTheme.colors.border;
            e.target.style.boxShadow = 'none';
          }}
        >
          <option value="arcade">🕹️ アーケード</option>
          <option value="retro">📺 レトロ</option>
          <option value="neon">💫 ネオン</option>
          <option value="cute">🌸 かわいい</option>
          <option value="dark">🌙 ダーク</option>
          <option value="minimal">☀️ ミニマル</option>
        </select>
      </div>

      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium" style={{ color: currentTheme.colors.text }}>
          🎯 カテゴリ:
        </label>
        <select
          value={gameCategory || ''}
          onChange={(e) => setGameCategory(e.target.value as GameCategory || null)}
          className="px-3 py-2 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2"
          style={{
            background: currentTheme.colors.background,
            color: currentTheme.colors.text,
            borderColor: currentTheme.colors.border
          }}
          onFocus={(e) => {
            e.target.style.borderColor = currentTheme.colors.secondary;
            e.target.style.boxShadow = `0 0 0 2px ${currentTheme.colors.secondary}40`;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = currentTheme.colors.border;
            e.target.style.boxShadow = 'none';
          }}
        >
          <option value="">選択してください</option>
          <option value="action">⚡ アクション</option>
          <option value="puzzle">🧩 パズル</option>
          <option value="timing">⏰ タイミング</option>
          <option value="reaction">⚡ リアクション</option>
        </select>
      </div>
    </div>
  );

  return (
    <div 
      className="min-h-screen transition-all duration-300"
      style={{ 
        background: `linear-gradient(135deg, ${currentTheme.colors.background}, ${currentTheme.colors.surface})`,
        color: currentTheme.colors.text
      }}
    >
      {/* 🎨 ヘッダー（完全テーマ統合版） */}
      <header 
        className="shadow-lg border-b transition-all duration-300"
        style={{ 
          background: `linear-gradient(135deg, ${currentTheme.colors.surface}, ${currentTheme.colors.background})`,
          borderColor: currentTheme.colors.border,
          boxShadow: `0 4px 12px ${currentTheme.colors.primary}20`
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center py-4 space-y-4 lg:space-y-0">
            {/* プロジェクト情報 */}
            <div className="flex items-center space-x-4">
              <div>
                <h1 
                  className="text-2xl lg:text-3xl font-bold transition-all duration-300"
                  style={{ 
                    background: `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >
                  {project.name || project.settings.name || 'マイゲーム'}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: currentTheme.colors.textSecondary }}>
                  <span>最終更新: {new Date(project.lastModified).toLocaleDateString('ja-JP')}</span>
                  
                  {/* 完成度表示 */}
                  <div className="flex items-center space-x-2">
                    <span>完成度:</span>
                    <div 
                      className="w-20 rounded-full h-3 transition-all duration-300"
                      style={{ background: `${currentTheme.colors.border}` }}
                    >
                      <div 
                        className="h-3 rounded-full transition-all duration-500"
                        style={{
                          background: completeness.percentage >= 80 
                            ? `linear-gradient(135deg, ${currentTheme.colors.success}, ${currentTheme.colors.accent})` 
                            : completeness.percentage >= 50 
                            ? `linear-gradient(135deg, ${currentTheme.colors.warning}, ${currentTheme.colors.secondary})` 
                            : `linear-gradient(135deg, ${currentTheme.colors.error}, ${currentTheme.colors.primary})`,
                          width: `${completeness.percentage}%`,
                          boxShadow: `0 2px 8px ${completeness.percentage >= 80 ? currentTheme.colors.success : currentTheme.colors.primary}40`
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold">
                      {Math.round(completeness.percentage)}%
                    </span>
                  </div>
                  
                  {/* ステータスバッジ */}
                  {hasUnsavedChanges && (
                    <span 
                      className="px-2 py-1 rounded-full text-xs font-medium animate-pulse"
                      style={{ 
                        background: `${currentTheme.colors.warning}20`,
                        color: currentTheme.colors.warning 
                      }}
                    >
                      • 未保存
                    </span>
                  )}
                  {project.status === 'published' && (
                    <span 
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{ 
                        background: `${currentTheme.colors.success}20`,
                        color: currentTheme.colors.success 
                      }}
                    >
                      • 公開中
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* テーマセレクター */}
            <div className="hidden xl:block">
              {renderThemeSelector()}
            </div>

            {/* アクションボタン群 */}
            <div className="flex flex-wrap items-center gap-3">
              {/* 容量表示 */}
              <div className="text-sm">
                <div className="flex items-center space-x-2">
                  <span style={{ color: currentTheme.colors.textSecondary }}>容量:</span>
                  <div 
                    className="w-24 rounded-full h-3"
                    style={{ background: currentTheme.colors.border }}
                  >
                    <div 
                      className="h-3 rounded-full transition-all duration-300"
                      style={{
                        background: sizePercentage > 90 
                          ? currentTheme.colors.error 
                          : sizePercentage > 70 
                          ? currentTheme.colors.warning 
                          : currentTheme.colors.success,
                        width: `${Math.min(sizePercentage, 100)}%`
                      }}
                    />
                  </div>
                  <span 
                    className="text-xs font-semibold"
                    style={{ 
                      color: sizePercentage > 90 ? currentTheme.colors.error : currentTheme.colors.textSecondary 
                    }}
                  >
                    {(totalSize / 1024 / 1024).toFixed(1)}MB
                  </span>
                </div>
              </div>

              {/* 自動保存切り替え */}
              <label className="flex items-center space-x-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSaveEnabled}
                  onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                  className="rounded transition-all"
                  style={{ accentColor: currentTheme.colors.primary }}
                />
                <span style={{ color: currentTheme.colors.textSecondary }}>自動保存</span>
              </label>

              {/* アクションボタン */}
              <ArcadeButton
                variant="secondary"
                size="sm"
                onClick={onSave}
                disabled={!hasUnsavedChanges}
                effects={{ glow: hasUnsavedChanges }}
              >
                💾 保存
              </ArcadeButton>
              
              <ArcadeButton
                variant="primary"
                size="sm"
                onClick={onTestPlay}
                effects={{ glow: true }}
                disabled={completeness.issues.length > 2}
              >
                ▶️ テスト
              </ArcadeButton>
              
              <ArcadeButton
                variant="gradient"
                size="sm"
                onClick={onPublish}
                effects={{ glow: true, pulse: project.status !== 'published' }}
                disabled={completeness.percentage < 60}
              >
                {project.status === 'published' ? '🔄 更新' : '🚀 公開'}
              </ArcadeButton>
            </div>
          </div>

          {/* モバイル用テーマセレクター */}
          <div className="xl:hidden pb-4">
            {renderThemeSelector()}
          </div>

          {/* 完成度警告表示 */}
          {completeness.issues.length > 0 && (
            <div 
              className="mb-4 p-4 rounded-xl border transition-all duration-300"
              style={{
                background: `${currentTheme.colors.warning}15`,
                borderColor: currentTheme.colors.warning,
                color: currentTheme.colors.warning
              }}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">⚠️</span>
                <span className="font-medium">完成に向けて：</span>
                <span className="text-sm">
                  {completeness.issues.slice(0, 2).join('、')}
                  {completeness.issues.length > 2 && `など${completeness.issues.length}項目`}
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 🎨 タブナビゲーション（完全テーマ統合版） */}
      <nav 
        className="shadow-md transition-all duration-300"
        style={{ 
          background: `linear-gradient(135deg, ${currentTheme.colors.background}E6, ${currentTheme.colors.surface}E6)`,
          backdropFilter: 'blur(10px)'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 py-4">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{
                    background: isActive 
                      ? `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`
                      : `${currentTheme.colors.background}60`,
                    color: isActive ? 'white' : currentTheme.colors.textSecondary,
                    borderColor: isActive ? 'transparent' : currentTheme.colors.border,
                    boxShadow: isActive 
                      ? `0 8px 25px ${currentTheme.colors.primary}40, 0 4px 10px ${currentTheme.colors.primary}20` 
                      : '0 2px 4px rgba(0,0,0,0.05)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = `${currentTheme.colors.surface}80`;
                      e.currentTarget.style.color = currentTheme.colors.text;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = `${currentTheme.colors.background}60`;
                      e.currentTarget.style.color = currentTheme.colors.textSecondary;
                    }
                  }}
                >
                  <span className="text-xl">{tab.icon}</span>
                  <span className="hidden sm:block">{tab.label}</span>
                  
                  {/* バッジ表示 */}
                  {tab.badge && (
                    <span 
                      className="absolute -top-2 -right-2 min-w-6 h-6 flex items-center justify-center text-xs font-bold rounded-full transition-all duration-300"
                      style={{
                        background: isActive 
                          ? 'rgba(255,255,255,0.9)'
                          : currentTheme.colors.accent,
                        color: isActive 
                          ? currentTheme.colors.primary
                          : 'white'
                      }}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* タブ説明 */}
          <div className="pb-3">
            <p className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>
              {tabs.find(tab => tab.id === activeTab)?.description}
            </p>
          </div>
        </div>
      </nav>

      {/* 🎨 メインコンテンツエリア（テーマ統合版） */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div 
          className="rounded-2xl shadow-xl border transition-all duration-300 min-h-[600px]"
          style={{ 
            background: `linear-gradient(135deg, ${currentTheme.colors.surface}, ${currentTheme.colors.background})`,
            borderColor: currentTheme.colors.border,
            boxShadow: `0 20px 40px ${currentTheme.colors.primary}20, 0 8px 16px rgba(0,0,0,0.1)`
          }}
        >
          <div className="p-6">
            {/* タブ別コンテンツ */}
            {activeTab === 'assets' && (
              <AssetsTab 
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
                onTestPlay={onTestPlay}
                onSave={onSave}
              />
            )}
          </div>
        </div>
      </main>

      {/* 🎨 フローティングヘルプボタン（テーマ統合版） */}
      <div className="fixed bottom-6 right-6">
        <ArcadeButton
          variant="primary"
          size="lg"
          effects={{ glow: true, pulse: true }}
          style={{ 
            borderRadius: '50%', 
            padding: '16px',
            boxShadow: `0 8px 25px ${currentTheme.colors.primary}40`
          }}
          onClick={() => {
            alert(`🎮 ゲームエディターヘルプ\n\n🎨 アセットタブ：画像・音声・テキストを追加\n⚙️ ルールタブ：ゲームの動作を決定\n🚀 公開タブ：テストプレイ・完成・公開\n\n💡 Ctrl+S: 保存\n💡 Ctrl+T: テストプレイ`);
          }}
        >
          <span className="text-xl">❓</span>
        </ArcadeButton>
      </div>

      {/* 開発時のみ表示：クイックアクセス */}
      {process.env.NODE_ENV === 'development' && (
        <div 
          className="fixed bottom-6 left-6 text-xs p-4 rounded-xl space-y-2 backdrop-blur-md transition-all duration-300"
          style={{ 
            background: `${currentTheme.colors.surface}E6`,
            color: currentTheme.colors.text,
            border: `1px solid ${currentTheme.colors.border}`,
            boxShadow: `0 8px 25px ${currentTheme.colors.primary}20`
          }}
        >
          <div className="font-semibold text-sm">🎯 エディター統合完了</div>
          <div>🎨 テーマ: {currentTheme.name}</div>
          <div>📊 Assets: {(project.assets.objects.length + (project.assets.background ? 1 : 0) + project.assets.texts.length + (project.assets.audio.bgm ? 1 : 0) + project.assets.audio.se.length)}, Rules: {project.script.rules.length}</div>
          <div>💾 Size: {(totalSize / 1024 / 1024).toFixed(1)}MB</div>
          <div>✅ 完成度: {Math.round(completeness.percentage)}%</div>
          <div className="pt-2 space-y-1">
            <button 
              onClick={() => setActiveTab('assets')}
              className="block text-left hover:underline transition-all"
              style={{ color: currentTheme.colors.primary }}
            >
              → アセットタブ
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className="block text-left hover:underline transition-all"
              style={{ color: currentTheme.colors.primary }}
            >
              → 公開タブ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};