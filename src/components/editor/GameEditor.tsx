// GameEditor.tsx - シンプル白基調デザイン版
// ✅ テーマシステム削除・ModernCard/ModernButton使用・清潔なデザイン
// 🔧 audio プロパティエラー修正版（3箇所修正）

import React, { useState, useEffect } from 'react';
import ModernButton from '../ui/ModernButton';
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

  // 🔧 修正箇所1: 容量計算（107-112行目）
  const calculateTotalSize = (): number => {
    const assets = project.assets;
    let total = 0;

    if (assets.background) {
      total += assets.background.totalSize;
    }

    assets.objects.forEach(obj => {
      total += obj.totalSize;
    });

    // ✅ 修正: オプショナルチェーン追加
    if (assets.audio?.bgm) {
      total += assets.audio.bgm.fileSize;
    }
    assets.audio?.se?.forEach(se => {
      total += se.fileSize;
    });

    return total;
  };

  const totalSize = calculateTotalSize();
  const sizePercentage = (totalSize / EDITOR_LIMITS.PROJECT.TOTAL_MAX_SIZE) * 100;

  // 🔧 修正箇所2: タブの設定（131-135行目）
  const tabs = customTabs || [
    { 
      id: 'assets' as EditorTab, 
      label: 'アセット', 
      icon: '🎨', 
      description: '画像・音声・テキスト管理',
      // ✅ 修正: オプショナルチェーン追加
      badge: (
        project.assets.objects.length + 
        (project.assets.background ? 1 : 0) + 
        project.assets.texts.length +
        (project.assets.audio?.bgm ? 1 : 0) + 
        (project.assets.audio?.se?.length || 0)
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

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      transition: 'all 0.3s ease'
    }}>
      {/* ✅ ヘッダー（シンプル白基調版） */}
      <header style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ 
            display: 'flex',
            flexDirection: window.innerWidth < 1024 ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: window.innerWidth < 1024 ? 'flex-start' : 'center',
            padding: '16px 0',
            gap: '16px'
          }}>
            {/* プロジェクト情報 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div>
                <h1 style={{
                  fontSize: window.innerWidth < 1024 ? '24px' : '32px',
                  fontWeight: '700',
                  color: '#1f2937',
                  margin: 0,
                  marginBottom: '8px'
                }}>
                  {project.name || project.settings.name || 'マイゲーム'}
                </h1>
                <div style={{ 
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '16px',
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  <span>最終更新: {new Date(project.lastModified).toLocaleDateString('ja-JP')}</span>
                  
                  {/* 完成度表示 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>完成度:</span>
                    <div style={{
                      width: '80px',
                      height: '12px',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '6px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${completeness.percentage}%`,
                        backgroundColor: completeness.percentage >= 80 
                          ? '#10b981' 
                          : completeness.percentage >= 50 
                          ? '#f59e0b' 
                          : '#ef4444',
                        transition: 'width 0.5s ease',
                        borderRadius: '6px'
                      }} />
                    </div>
                    <span style={{ 
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {Math.round(completeness.percentage)}%
                    </span>
                  </div>
                  
                  {/* ステータスバッジ */}
                  {hasUnsavedChanges && (
                    <span style={{
                      padding: '4px 8px',
                      backgroundColor: '#fef3c7',
                      color: '#d97706',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      • 未保存
                    </span>
                  )}
                  {project.status === 'published' && (
                    <span style={{
                      padding: '4px 8px',
                      backgroundColor: '#d1fae5',
                      color: '#10b981',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      • 公開中
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* アクションボタン群 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
              {/* 容量表示 */}
              <div style={{ fontSize: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#6b7280' }}>容量:</span>
                  <div style={{
                    width: '96px',
                    height: '12px',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '6px'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(sizePercentage, 100)}%`,
                      backgroundColor: sizePercentage > 90 
                        ? '#ef4444' 
                        : sizePercentage > 70 
                        ? '#f59e0b' 
                        : '#10b981',
                      borderRadius: '6px',
                      transition: 'all 0.3s ease'
                    }} />
                  </div>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: sizePercentage > 90 ? '#ef4444' : '#6b7280'
                  }}>
                    {(totalSize / 1024 / 1024).toFixed(1)}MB
                  </span>
                </div>
              </div>

              {/* 自動保存切り替え */}
              <label style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={autoSaveEnabled}
                  onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                  style={{
                    width: '16px',
                    height: '16px',
                    accentColor: '#3b82f6'
                  }}
                />
                <span style={{ color: '#6b7280' }}>自動保存</span>
              </label>

              {/* アクションボタン */}
              <ModernButton
                variant="secondary"
                size="sm"
                onClick={onSave}
                disabled={!hasUnsavedChanges}
              >
                💾 保存
              </ModernButton>
              
              <ModernButton
                variant="primary"
                size="sm"
                onClick={onTestPlay}
                disabled={completeness.issues.length > 2}
              >
                ▶️ テスト
              </ModernButton>
              
              <ModernButton
                variant="success"
                size="sm"
                onClick={onPublish}
                disabled={completeness.percentage < 60}
              >
                {project.status === 'published' ? '🔄 更新' : '🚀 公開'}
              </ModernButton>
            </div>
          </div>

          {/* 完成度警告表示 */}
          {completeness.issues.length > 0 && (
            <div style={{
              marginBottom: '16px',
              padding: '16px',
              backgroundColor: '#fef3c7',
              border: '1px solid #fbbf24',
              borderRadius: '12px',
              color: '#d97706'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>⚠️</span>
                <span style={{ fontWeight: '500' }}>完成に向けて：</span>
                <span style={{ fontSize: '14px' }}>
                  {completeness.issues.slice(0, 2).join('、')}
                  {completeness.issues.length > 2 && `など${completeness.issues.length}項目`}
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ✅ タブナビゲーション（シンプル白基調版） */}
      <nav style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', gap: '4px', paddingTop: '16px' }}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    borderRadius: '12px 12px 0 0',
                    fontWeight: '600',
                    fontSize: '16px',
                    backgroundColor: isActive ? '#ffffff' : 'transparent',
                    color: isActive ? '#1f2937' : '#6b7280',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    borderBottom: isActive ? 'none' : '1px solid transparent'
                  }}
                  onMouseOver={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                      e.currentTarget.style.color = '#1f2937';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#6b7280';
                    }
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{tab.icon}</span>
                  <span style={{ display: window.innerWidth < 640 ? 'none' : 'block' }}>
                    {tab.label}
                  </span>
                  
                  {/* バッジ表示 */}
                  {tab.badge && (
                    <span style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      minWidth: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '700',
                      backgroundColor: isActive ? '#3b82f6' : '#f59e0b',
                      color: '#ffffff',
                      borderRadius: '12px',
                      padding: '0 8px'
                    }}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* タブ説明 */}
          <div style={{ paddingBottom: '12px' }}>
            <p style={{ 
              fontSize: '14px',
              color: '#6b7280',
              margin: 0
            }}>
              {tabs.find(tab => tab.id === activeTab)?.description}
            </p>
          </div>
        </div>
      </nav>

      {/* ✅ メインコンテンツエリア（シンプル版） */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.06)',
          border: '1px solid #e5e7eb',
          minHeight: '600px',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '24px' }}>
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

      {/* ✅ フローティングヘルプボタン（シンプル版） */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px' }}>
        <ModernButton
          variant="primary"
          size="lg"
          style={{ 
            borderRadius: '50%',
            width: '56px',
            height: '56px',
            boxShadow: '0 8px 25px rgba(59, 130, 246, 0.4)'
          }}
          onClick={() => {
            alert(`🎮 ゲームエディターヘルプ\n\n🎨 アセットタブ：画像・音声・テキストを追加\n⚙️ ルールタブ：ゲームの動作を決定\n🚀 公開タブ：テストプレイ・完成・公開\n\n💡 Ctrl+S: 保存\n💡 Ctrl+T: テストプレイ`);
          }}
        >
          <span style={{ fontSize: '20px' }}>❓</span>
        </ModernButton>
      </div>

      {/* 開発時のみ表示：クイックアクセス */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          fontSize: '12px',
          padding: '16px',
          backgroundColor: '#ffffff',
          color: '#1f2937',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          maxWidth: '300px'
        }}>
          <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '8px' }}>
            🎯 エディター統合完了
          </div>
          <div style={{ marginBottom: '4px' }}>
            🎨 デザイン: シンプル白基調
          </div>
          {/* 🔧 修正箇所3: 開発時デバッグ表示（566行目） */}
          <div style={{ marginBottom: '4px' }}>
            {/* ✅ 修正: オプショナルチェーン追加 */}
            📊 Assets: {(project.assets.objects.length + (project.assets.background ? 1 : 0) + project.assets.texts.length + (project.assets.audio?.bgm ? 1 : 0) + (project.assets.audio?.se?.length || 0))}, Rules: {project.script.rules.length}
          </div>
          <div style={{ marginBottom: '4px' }}>
            💾 Size: {(totalSize / 1024 / 1024).toFixed(1)}MB
          </div>
          <div style={{ marginBottom: '12px' }}>
            ✅ 完成度: {Math.round(completeness.percentage)}%
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button 
              onClick={() => setActiveTab('assets')}
              style={{
                background: 'none',
                border: 'none',
                color: '#3b82f6',
                cursor: 'pointer',
                textAlign: 'left',
                padding: '0',
                fontSize: '12px'
              }}
            >
              → アセットタブ
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              style={{
                background: 'none',
                border: 'none',
                color: '#3b82f6',
                cursor: 'pointer',
                textAlign: 'left',
                padding: '0',
                fontSize: '12px'
              }}
            >
              → 公開タブ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};