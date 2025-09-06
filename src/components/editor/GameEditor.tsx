// src/components/editor/GameEditor.tsx - TypeScriptエラー修正版
import React, { useState, useEffect } from 'react';
import { useGameTheme, ThemeType, GameCategory } from '../ui/GameThemeProvider';
import GameThemeProvider from '../ui/GameThemeProvider';
import ArcadeButton from '../ui/ArcadeButton';
import { GameProject } from '../../types/editor/GameProject';
import { EDITOR_LIMITS } from '../../constants/EditorLimits';
import { AssetsTab } from './tabs/AssetsTab';
import { AudioTab } from './tabs/AudioTab';
import { ScriptTab } from './tabs/ScriptTab';
import { SettingsTab } from './tabs/SettingsTab';

// タブタイプ定義（既存保護）
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

  // テーマシステム統合（修正版）
  const { 
    currentTheme, 
    themeType, 
    gameCategory, 
    setThemeType, 
    setGameCategory 
  } = useGameTheme();

  // プロジェクト更新時の処理（既存保護）
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
          audio: {
            selectedAudioType: null,
            selectedAudioId: null,
            isPlaying: false
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

  // 自動保存機能（既存保護）
  useEffect(() => {
    if (autoSaveEnabled && hasUnsavedChanges) {
      const autoSaveTimer = setTimeout(() => {
        onSave();
        setHasUnsavedChanges(false);
      }, EDITOR_LIMITS.PROJECT.AUTO_SAVE_INTERVAL);

      return () => clearTimeout(autoSaveTimer);
    }
  }, [autoSaveEnabled, hasUnsavedChanges, onSave]);

  // 容量計算（既存保護）
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

  // タブの設定（既存保護 + テーマ連動）
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

  // テーマセレクター
  const renderThemeSelector = () => (
    <div className="flex items-center space-x-3 mb-4">
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium" style={{ color: currentTheme.colors.text }}>
          🎨 テーマ:
        </label>
        <select
          value={themeType}
          onChange={(e) => setThemeType(e.target.value as ThemeType)}
          className="px-3 py-1 rounded-lg border text-sm"
          style={{
            background: currentTheme.colors.surface,
            color: currentTheme.colors.text,
            borderColor: currentTheme.colors.border
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
          className="px-3 py-1 rounded-lg border text-sm"
          style={{
            background: currentTheme.colors.surface,
            color: currentTheme.colors.text,
            borderColor: currentTheme.colors.border
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
      className="min-h-screen"
      style={{ 
        background: `linear-gradient(135deg, ${currentTheme.colors.background}, ${currentTheme.colors.surface})`,
        color: currentTheme.colors.text
      }}
    >
      {/* ヘッダー（テーマ適用） */}
      <header 
        className="shadow-sm border-b"
        style={{ 
          background: currentTheme.colors.surface,
          borderColor: currentTheme.colors.border
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* プロジェクト情報 */}
            <div className="flex items-center space-x-4">
              <div>
                <h1 
                  className="text-2xl font-bold gradient-text"
                  style={{ color: currentTheme.colors.text }}
                >
                  {project.name || project.settings.name || 'マイゲーム'}
                </h1>
                <p className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>
                  最終更新: {new Date(project.lastModified).toLocaleDateString('ja-JP')}
                  {hasUnsavedChanges && <span style={{ color: currentTheme.colors.warning }} className="ml-2">• 未保存</span>}
                  {project.status === 'published' && <span style={{ color: currentTheme.colors.success }} className="ml-2">• 公開中</span>}
                </p>
              </div>
            </div>

            {/* テーマセレクター */}
            <div className="hidden lg:block">
              {renderThemeSelector()}
            </div>

            {/* アクション（ArcadeButton使用） */}
            <div className="flex items-center space-x-3">
              {/* 容量表示（テーマ適用） */}
              <div className="text-sm">
                <div className="flex items-center space-x-2">
                  <span style={{ color: currentTheme.colors.textSecondary }}>容量:</span>
                  <div 
                    className="w-20 rounded-full h-2"
                    style={{ background: currentTheme.colors.border }}
                  >
                    <div 
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        background: sizePercentage > 90 ? currentTheme.colors.error : 
                                  sizePercentage > 70 ? currentTheme.colors.warning : currentTheme.colors.success,
                        width: `${Math.min(sizePercentage, 100)}%`
                      }}
                    />
                  </div>
                  <span 
                    className="text-xs"
                    style={{ 
                      color: sizePercentage > 90 ? currentTheme.colors.error : currentTheme.colors.textSecondary 
                    }}
                  >
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
                <span style={{ color: currentTheme.colors.textSecondary }}>自動保存</span>
              </label>

              {/* アクションボタン（ArcadeButton使用） */}
              <ArcadeButton
                variant="secondary"
                size="sm"
                onClick={onSave}
                disabled={!hasUnsavedChanges}
              >
                💾 保存
              </ArcadeButton>
              
              <ArcadeButton
                variant="primary"
                size="sm"
                onClick={onTestPlay}
                effects={{ glow: true }}
              >
                ▶️ テスト
              </ArcadeButton>
              
              <ArcadeButton
                variant="gradient"
                size="sm"
                onClick={onPublish}
                effects={{ glow: true, pulse: true }}
              >
                🚀 公開
              </ArcadeButton>
            </div>
          </div>

          {/* モバイル用テーマセレクター */}
          <div className="lg:hidden pb-4">
            {renderThemeSelector()}
          </div>
        </div>
      </header>

      {/* タブナビゲーション（テーマ適用） */}
      <nav 
        className="shadow-sm"
        style={{ background: currentTheme.colors.surface }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 py-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  activeTab === tab.id ? 'scale-105' : 'hover:scale-102'
                }`}
                style={{
                  background: activeTab === tab.id 
                    ? `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`
                    : currentTheme.colors.background,
                  color: activeTab === tab.id ? currentTheme.colors.text : currentTheme.colors.textSecondary,
                  borderColor: currentTheme.colors.border,
                  boxShadow: activeTab === tab.id 
                    ? `0 4px 12px ${currentTheme.colors.primary}40` 
                    : 'none'
                }}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
                {/* バッジ表示（テーマ適用） */}
                {tab.badge && (
                  <span 
                    className="absolute -top-1 -right-1 min-w-5 h-5 flex items-center justify-center text-xs font-bold rounded-full"
                    style={{
                      background: activeTab === tab.id 
                        ? currentTheme.colors.surface
                        : currentTheme.colors.accent,
                      color: activeTab === tab.id 
                        ? currentTheme.colors.primary
                        : currentTheme.colors.text
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
          
          {/* タブ説明 */}
          <div className="pb-3">
            <p className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>
              {tabs.find(tab => tab.id === activeTab)?.description}
            </p>
          </div>
        </div>
      </nav>

      {/* メインコンテンツエリア（テーマ適用） */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div 
          className="rounded-2xl shadow-lg border min-h-[600px]"
          style={{ 
            background: currentTheme.colors.surface,
            borderColor: currentTheme.colors.border
          }}
        >
          <div className="p-6">
            {/* タブ別コンテンツ（既存保護） */}
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

      {/* フローティングヘルプボタン（テーマ適用） */}
      <div className="fixed bottom-6 right-6">
        <ArcadeButton
          variant="primary"
          size="lg"
          effects={{ glow: true, pulse: true }}
          style={{ borderRadius: '50%', padding: '16px' }}
        >
          <span className="text-xl">❓</span>
        </ArcadeButton>
      </div>

      {/* 開発進捗表示（デバッグ用・テーマ適用） */}
      {process.env.NODE_ENV === 'development' && (
        <div 
          className="fixed bottom-6 left-6 text-xs p-3 rounded-lg"
          style={{ 
            background: `${currentTheme.colors.background}E6`,
            color: currentTheme.colors.text,
            borderColor: currentTheme.colors.border
          }}
        >
          <div>🎯 Phase 7 Week 1 Day 3完了</div>
          <div>🎨 テーマ: {currentTheme.name}</div>
          <div>📊 Assets: {project.assets.objects.length}, Rules: {project.script.rules.length}</div>
          <div>💾 Size: {(totalSize / 1024 / 1024).toFixed(1)}MB</div>
        </div>
      )}
    </div>
  );
};