// src/components/editor/GameEditor.tsx - 3タブ統合版
import React, { useState, useEffect } from 'react';
import { useGameTheme, ThemeType, GameCategory } from '../ui/GameThemeProvider';
import GameThemeProvider from '../ui/GameThemeProvider';
import ArcadeButton from '../ui/ArcadeButton';
import { GameProject } from '../../types/editor/GameProject';
import { EDITOR_LIMITS, EditorTab } from '../../constants/EditorLimits'; // 🔧 修正: EditorTab型をインポート
import { AssetsTab } from './tabs/AssetsTab';
// 🔧 削除: AudioTab import（統合により不要）
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

  // テーマシステム統合（修正版）
  const { 
    currentTheme, 
    themeType, 
    gameCategory, 
    setThemeType, 
    setGameCategory 
  } = useGameTheme();

  // プロジェクト更新時の処理（🔧 修正: 3タブ対応）
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
            selectedAssetType: null, // 🔧 追加: 音声アセットタイプも含む
            selectedAssetId: null,
            showAnimationEditor: false
          },
          // 🔧 削除: audio tabState（AssetsTabに統合）
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

  // 🔧 強化された自動保存機能
  useEffect(() => {
    if (autoSaveEnabled && hasUnsavedChanges) {
      const autoSaveTimer = setTimeout(() => {
        onSave();
        setHasUnsavedChanges(false);
      }, EDITOR_LIMITS.PROJECT.AUTO_SAVE_INTERVAL);

      return () => clearTimeout(autoSaveTimer);
    }
  }, [autoSaveEnabled, hasUnsavedChanges, onSave]);

  // 🔧 プロジェクト変更監視
  useEffect(() => {
    // プロジェクトに変更があったら未保存状態をリセット
    setHasUnsavedChanges(false);
  }, [project.id]);

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

  // 🔧 修正: タブの設定（3タブ統合版）
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

  // 🔧 Phase 1-C: プロジェクト完成度判定
  const getProjectCompleteness = (): { percentage: number; issues: string[] } => {
    const issues: string[] = [];
    let score = 0;
    const maxScore = 5;

    // ゲーム名チェック
    if (project.settings.name?.trim()) {
      score += 1;
    } else {
      issues.push('ゲーム名を設定してください');
    }

    // アセットチェック
    if (project.assets.objects.length > 0 || project.assets.background) {
      score += 1;
    } else {
      issues.push('背景またはオブジェクトを追加してください');
    }

    // ゲーム設定チェック
    if (project.settings.duration) {
      score += 1;
    } else {
      issues.push('ゲーム時間を設定してください');
    }

    // ルールチェック（任意）
    if (project.script.rules.length > 0) {
      score += 1;
    }

    // サムネイルチェック（任意）
    if (project.settings.preview?.thumbnailDataUrl) {
      score += 1;
    }

    return {
      percentage: (score / maxScore) * 100,
      issues
    };
  };

  const completeness = getProjectCompleteness();

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
      {/* ヘッダー（テーマ適用 + Phase 1-C改良） */}
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
                <div className="flex items-center space-x-4 text-sm" style={{ color: currentTheme.colors.textSecondary }}>
                  <span>最終更新: {new Date(project.lastModified).toLocaleDateString('ja-JP')}</span>
                  
                  {/* 🔧 完成度表示 */}
                  <div className="flex items-center space-x-2">
                    <span>完成度:</span>
                    <div 
                      className="w-16 rounded-full h-2"
                      style={{ background: currentTheme.colors.border }}
                    >
                      <div 
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          background: completeness.percentage >= 80 ? currentTheme.colors.success : 
                                    completeness.percentage >= 50 ? currentTheme.colors.warning : currentTheme.colors.error,
                          width: `${completeness.percentage}%`
                        }}
                      />
                    </div>
                    <span className="text-xs">
                      {Math.round(completeness.percentage)}%
                    </span>
                  </div>
                  
                  {/* ステータスバッジ */}
                  {hasUnsavedChanges && <span style={{ color: currentTheme.colors.warning }} className="ml-2">• 未保存</span>}
                  {project.status === 'published' && <span style={{ color: currentTheme.colors.success }} className="ml-2">• 公開中</span>}
                </div>
              </div>
            </div>

            {/* テーマセレクター */}
            <div className="hidden lg:block">
              {renderThemeSelector()}
            </div>

            {/* アクション（ArcadeButton使用 + Phase 1-C改良） */}
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

              {/* アクションボタン（ArcadeButton使用 + Phase 1-C改良） */}
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
                disabled={completeness.issues.length > 2} // 基本要件が不足している場合は無効
              >
                ▶️ テスト
              </ArcadeButton>
              
              <ArcadeButton
                variant="gradient"
                size="sm"
                onClick={onPublish}
                effects={{ glow: true, pulse: project.status !== 'published' }}
                disabled={completeness.percentage < 60} // 60%未満は公開不可
              >
                {project.status === 'published' ? '🔄 更新' : '🚀 公開'}
              </ArcadeButton>
            </div>
          </div>

          {/* モバイル用テーマセレクター */}
          <div className="lg:hidden pb-4">
            {renderThemeSelector()}
          </div>

          {/* 🔧 Phase 1-C: 完成度警告表示 */}
          {completeness.issues.length > 0 && (
            <div 
              className="mb-4 p-3 rounded-lg border"
              style={{
                background: `${currentTheme.colors.warning}20`,
                borderColor: currentTheme.colors.warning,
                color: currentTheme.colors.warning
              }}
            >
              <div className="flex items-center space-x-2">
                <span>⚠️</span>
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
            {/* 🔧 修正: タブ別コンテンツ（3タブ統合版） */}
            {activeTab === 'assets' && (
              <AssetsTab 
                project={project} 
                onProjectUpdate={handleProjectUpdate}
              />
            )}

            {/* 🔧 削除: AudioTab条件分岐（統合により不要） */}

            {activeTab === 'script' && (
              <ScriptTab
                project={project}
                onProjectUpdate={handleProjectUpdate}
              />
            )}

            {/* 🔧 Phase 1-C: SettingsTab完全統合 */}
            {activeTab === 'settings' && (
              <SettingsTab
                project={project}
                onProjectUpdate={handleProjectUpdate}
                onTestPlay={onTestPlay}  // 🔧 追加
                onSave={onSave}          // 🔧 追加
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
          onClick={() => {
            alert(`🎮 ゲームエディターヘルプ\n\n🎨 アセットタブ：画像・音声・テキストを追加\n⚙️ ルールタブ：ゲームの動作を決定\n🚀 公開タブ：テストプレイ・完成・公開\n\n💡 Ctrl+S: 保存\n💡 Ctrl+T: テストプレイ`);
          }}
        >
          <span className="text-xl">❓</span>
        </ArcadeButton>
      </div>

      {/* 🔧 Phase 1-C: クイックアクセス（開発時のみ） */}
      {process.env.NODE_ENV === 'development' && (
        <div 
          className="fixed bottom-6 left-6 text-xs p-3 rounded-lg space-y-1"
          style={{ 
            background: `${currentTheme.colors.background}E6`,
            color: currentTheme.colors.text,
            borderColor: currentTheme.colors.border,
            border: '1px solid'
          }}
        >
          <div className="font-semibold">🎯 3タブ統合完了</div>
          <div>🎨 テーマ: {currentTheme.name}</div>
          <div>📊 Assets: {(project.assets.objects.length + (project.assets.background ? 1 : 0) + project.assets.texts.length + (project.assets.audio.bgm ? 1 : 0) + project.assets.audio.se.length)}, Rules: {project.script.rules.length}</div>
          <div>💾 Size: {(totalSize / 1024 / 1024).toFixed(1)}MB</div>
          <div>✅ 完成度: {Math.round(completeness.percentage)}%</div>
          <div className="pt-2 space-y-1">
            <button 
              onClick={() => setActiveTab('assets')}
              className="block text-left hover:underline"
              style={{ color: currentTheme.colors.primary }}
            >
              → アセットタブ
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className="block text-left hover:underline"
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