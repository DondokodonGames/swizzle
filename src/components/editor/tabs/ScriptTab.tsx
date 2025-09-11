// src/components/editor/tabs/ScriptTab.tsx
// Step 1完全改善版: デザインシステム統一 + 3つの修正適用

import React, { useState } from 'react';
import { GameProject } from '../../../types/editor/GameProject';
import { GameRule } from '../../../types/editor/GameScript';
import { GamePreview } from '../script/GamePreview';
import { BackgroundControl } from '../script/BackgroundControl';
import { RuleList } from '../script/RuleList';
import { AdvancedRuleModal } from '../script/AdvancedRuleModal';
import { DESIGN_TOKENS } from '../../../constants/DesignSystem';
import { ModernCard } from '../../ui/ModernCard';
import { ModernButton } from '../../ui/ModernButton';

interface ScriptTabProps {
  project: GameProject;
  onProjectUpdate: (project: GameProject) => void;
}

export const ScriptTab: React.FC<ScriptTabProps> = ({ project, onProjectUpdate }) => {
  // 状態管理
  const [mode, setMode] = useState<'layout' | 'rules'>('layout');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [editingRule, setEditingRule] = useState<GameRule | null>(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [forceRender, setForceRender] = useState(0);

  // 通知システム（AssetsTabパターン）
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // 通知表示ヘルパー
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // プロジェクト更新（強制再レンダリング付き）
  const updateProject = (updates: Partial<GameProject>) => {
    const updatedProject = {
      ...project,
      ...updates,
      lastModified: new Date().toISOString()
    };
    
    console.log('[ScriptTab] プロジェクト更新:', Object.keys(updates).join(', '));
    onProjectUpdate(updatedProject);
    setForceRender(prev => prev + 1);
    showNotification('success', 'プロジェクトを更新しました');
  };

  // オブジェクト配置更新
  const handleObjectPositionUpdate = (objectId: string, position: { x: number; y: number }) => {
    console.log(`[ScriptTab] 位置更新: ${objectId} → (${position.x.toFixed(2)}, ${position.y.toFixed(2)})`);
    
    const updatedScript = JSON.parse(JSON.stringify(project.script));
    
    // 既存のレイアウトオブジェクトを探す
    const existingIndex = updatedScript.layout.objects.findIndex((obj: any) => obj.objectId === objectId);
    
    if (existingIndex >= 0) {
      // 既存オブジェクトの位置を更新
      updatedScript.layout.objects[existingIndex].position = position;
    } else {
      // 新しいオブジェクトを追加
      const asset = project.assets.objects.find(obj => obj.id === objectId);
      if (asset) {
        updatedScript.layout.objects.push({
          objectId: objectId,
          position: position,
          scale: { x: 1.0, y: 1.0 },
          rotation: 0,
          zIndex: updatedScript.layout.objects.length + 10,
          initialState: {
            visible: true,
            animation: 0,
            animationSpeed: 12,
            autoStart: false
          }
        });
        console.log(`[ScriptTab] 新規配置: ${asset.name}`);
      }
    }
    
    updateProject({ script: updatedScript });
  };

  // オブジェクトルール編集
  const handleObjectRuleEdit = (objectId: string) => {
    console.log(`[ScriptTab] ルール編集: ${objectId}`);
    setSelectedObjectId(objectId);
    
    // 既存ルールを検索
    const existingRule = project.script.rules.find(rule => rule.targetObjectId === objectId);
    
    if (existingRule) {
      // 既存ルール編集
      setEditingRule(existingRule);
    } else {
      // 新規ルール作成
      const asset = project.assets.objects.find(obj => obj.id === objectId);
      const newRule: GameRule = {
        id: `rule_${Date.now()}`,
        name: `${asset?.name || 'オブジェクト'}のルール`,
        enabled: true,
        priority: 50,
        targetObjectId: objectId,
        triggers: {
          operator: 'AND',
          conditions: []
        },
        actions: [],
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };
      setEditingRule(newRule);
    }
    
    setShowRuleModal(true);
  };

  // ルール保存（フラグ情報も同時更新）
  const handleSaveRule = (rule: GameRule) => {
    console.log('[ScriptTab] ルール保存:', rule.name);
    
    const updatedScript = { ...project.script };
    const existingIndex = updatedScript.rules.findIndex(r => r.id === rule.id);
    
    if (existingIndex >= 0) {
      // 既存ルール更新
      updatedScript.rules[existingIndex] = rule;
      showNotification('success', 'ルールを更新しました');
    } else {
      // 新規ルール追加
      updatedScript.rules.push(rule);
      showNotification('success', 'ルールを追加しました');
    }
    
    updateProject({ script: updatedScript });
    setShowRuleModal(false);
    setEditingRule(null);
  };

  // 新規ルール作成
  const handleCreateRule = () => {
    if (!selectedObjectId) return;
    
    const asset = project.assets.objects.find(obj => obj.id === selectedObjectId);
    const newRule: GameRule = {
      id: `rule_${Date.now()}`,
      name: `${asset?.name || 'オブジェクト'}のルール`,
      enabled: true,
      priority: 50,
      targetObjectId: selectedObjectId,
      triggers: {
        operator: 'AND',
        conditions: []
      },
      actions: [],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
    
    setEditingRule(newRule);
    setShowRuleModal(true);
  };

  // ルール編集
  const handleEditRule = (rule: GameRule) => {
    setEditingRule(rule);
    setShowRuleModal(true);
  };

  // オブジェクトのルール有無確認
  const hasRuleForObject = (objectId: string): boolean => {
    return project.script.rules.some(rule => rule.targetObjectId === objectId && rule.enabled);
  };

  return (
    <div 
      style={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: DESIGN_TOKENS.typography.fontFamily.sans.join(', '),
        backgroundColor: DESIGN_TOKENS.colors.neutral[50]
      }}
    >
      
      {/* 通知表示（AssetsTabパターン） */}
      {notification && (
        <div 
          style={{
            position: 'fixed',
            top: DESIGN_TOKENS.spacing[4],
            right: DESIGN_TOKENS.spacing[4],
            zIndex: DESIGN_TOKENS.zIndex.notification,
            maxWidth: '400px'
          }}
        >
          <ModernCard variant="elevated" size="sm">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ 
                fontSize: DESIGN_TOKENS.typography.fontSize.xl, 
                marginRight: DESIGN_TOKENS.spacing[3] 
              }}>
                {notification.type === 'success' ? '✅' :
                 notification.type === 'error' ? '❌' : 'ℹ️'}
              </span>
              <p style={{ 
                fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                margin: 0,
                flex: 1,
                color: notification.type === 'success' 
                  ? DESIGN_TOKENS.colors.success[800] 
                  : notification.type === 'error' 
                    ? DESIGN_TOKENS.colors.error[800] 
                    : DESIGN_TOKENS.colors.primary[800]
              }}>
                {notification.message}
              </p>
              <ModernButton
                variant="ghost"
                size="xs"
                onClick={() => setNotification(null)}
                style={{ marginLeft: DESIGN_TOKENS.spacing[2] }}
              >
                ✕
              </ModernButton>
            </div>
          </ModernCard>
        </div>
      )}

      {/* ヘッダー - ModernCard + purple系統一 */}
      <ModernCard 
        variant="filled" 
        size="lg"
        style={{ 
          backgroundColor: DESIGN_TOKENS.colors.purple[600],
          color: DESIGN_TOKENS.colors.neutral[0],
          marginBottom: 0,
          borderRadius: 0
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 
              style={{
                fontSize: DESIGN_TOKENS.typography.fontSize['2xl'],
                fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: DESIGN_TOKENS.spacing[3],
                color: DESIGN_TOKENS.colors.neutral[0]
              }}
            >
              <div 
                style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                  borderRadius: DESIGN_TOKENS.borderRadius.xl,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: DESIGN_TOKENS.shadows.lg
                }}
              >
                <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xl, color: DESIGN_TOKENS.colors.purple[600] }}>📝</span>
              </div>
              <span>スクリプト設定</span>
            </h2>
            <p 
              style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                color: DESIGN_TOKENS.colors.purple[100],
                fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                margin: `${DESIGN_TOKENS.spacing[2]} 0 0 53px`
              }}
            >
              高度なゲームロジック設定・複数条件・フラグ管理システム
            </p>
          </div>
          
          {/* モード切り替え - AssetsTabタブ方式 */}
          <div 
            style={{
              display: 'flex',
              backgroundColor: DESIGN_TOKENS.colors.neutral[0],
              borderRadius: DESIGN_TOKENS.borderRadius.lg,
              padding: DESIGN_TOKENS.spacing[1],
              boxShadow: DESIGN_TOKENS.shadows.sm
            }}
          >
            {[
              { id: 'layout' as 'layout' | 'rules', label: 'レイアウト', icon: '🎨' },
              { id: 'rules' as 'layout' | 'rules', label: 'ルール', icon: '⚙️' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMode(tab.id)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: DESIGN_TOKENS.spacing[2],
                  padding: `${DESIGN_TOKENS.spacing[3]} ${DESIGN_TOKENS.spacing[4]}`,
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                  backgroundColor: mode === tab.id 
                    ? DESIGN_TOKENS.colors.purple[500]
                    : 'transparent',
                  color: mode === tab.id 
                    ? DESIGN_TOKENS.colors.neutral[0]
                    : DESIGN_TOKENS.colors.neutral[600],
                  border: 'none',
                  borderRadius: DESIGN_TOKENS.borderRadius.md,
                  cursor: 'pointer',
                  transition: `all ${DESIGN_TOKENS.animation.duration.fast} ${DESIGN_TOKENS.animation.easing.inOut}`
                }}
                onMouseEnter={(e) => {
                  if (mode !== tab.id) {
                    e.currentTarget.style.backgroundColor = DESIGN_TOKENS.colors.neutral[100];
                    e.currentTarget.style.color = DESIGN_TOKENS.colors.neutral[800];
                  }
                }}
                onMouseLeave={(e) => {
                  if (mode !== tab.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = DESIGN_TOKENS.colors.neutral[600];
                  }
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </ModernCard>

      {/* コンテンツエリア */}
      <div style={{ flex: 1, overflow: 'hidden', color: DESIGN_TOKENS.colors.neutral[800] }}>
        {mode === 'layout' ? (
          <div style={{ height: '100%', display: 'flex' }}>
            {/* ゲームプレビュー - 中央配置 */}
            <div 
              style={{ 
                flex: 1, 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                backgroundColor: DESIGN_TOKENS.colors.neutral[50],
                padding: DESIGN_TOKENS.spacing[6],
                color: DESIGN_TOKENS.colors.neutral[800] // 濃いテキスト色を明示的に指定
              }}
            >
              <GamePreview
                project={project}
                selectedObjectId={selectedObjectId}
                draggedItem={draggedItem}
                forceRender={forceRender}
                onObjectPositionUpdate={handleObjectPositionUpdate}
                onObjectRuleEdit={handleObjectRuleEdit}
                onSetDraggedItem={setDraggedItem}
                hasRuleForObject={hasRuleForObject}
              />
            </div>
            
            {/* 右サイドパネル - ModernCard統一 */}
            <div 
              style={{
                width: '320px',
                backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                borderLeft: `1px solid ${DESIGN_TOKENS.colors.neutral[200]}`,
                overflowY: 'auto',
                boxShadow: DESIGN_TOKENS.shadows.inner
              }}
            >
              <BackgroundControl
                project={project}
                onProjectUpdate={updateProject}
              />
              
              {/* フラグ統計表示 - purple系統一 */}
              {project.script.flags && project.script.flags.length > 0 && (
                <div style={{ padding: DESIGN_TOKENS.spacing[6] }}>
                  <ModernCard variant="filled" size="md" style={{ backgroundColor: DESIGN_TOKENS.colors.purple[50] }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[3], marginBottom: DESIGN_TOKENS.spacing[4] }}>
                      <div 
                        style={{
                          width: '32px',
                          height: '32px',
                          backgroundColor: DESIGN_TOKENS.colors.purple[500],
                          borderRadius: DESIGN_TOKENS.borderRadius.lg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: DESIGN_TOKENS.shadows.sm
                        }}
                      >
                        <span style={{ color: DESIGN_TOKENS.colors.neutral[0], fontSize: DESIGN_TOKENS.typography.fontSize.sm }}>🚩</span>
                      </div>
                      <div>
                        <h5 
                          style={{
                            fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                            fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                            color: DESIGN_TOKENS.colors.purple[800],
                            margin: 0
                          }}
                        >
                          プロジェクトフラグ
                        </h5>
                        <p 
                          style={{
                            fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                            color: DESIGN_TOKENS.colors.purple[600],
                            margin: 0
                          }}
                        >
                          ゲーム状態管理
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN_TOKENS.spacing[3] }}>
                      {project.script.flags.map((flag) => (
                        <div 
                          key={flag.id} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between', 
                            padding: DESIGN_TOKENS.spacing[3], 
                            backgroundColor: DESIGN_TOKENS.colors.neutral[0], 
                            borderRadius: DESIGN_TOKENS.borderRadius.xl, 
                            boxShadow: DESIGN_TOKENS.shadows.sm, 
                            border: `1px solid ${DESIGN_TOKENS.colors.purple[100]}`
                          }}
                        >
                          <span 
                            style={{
                              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                              fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                              color: DESIGN_TOKENS.colors.neutral[700]
                            }}
                          >
                            {flag.name}
                          </span>
                          <div 
                            style={{
                              padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[3]}`,
                              borderRadius: DESIGN_TOKENS.borderRadius.lg,
                              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                              fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                              backgroundColor: flag.initialValue 
                                ? DESIGN_TOKENS.colors.success[100] 
                                : DESIGN_TOKENS.colors.neutral[100],
                              color: flag.initialValue 
                                ? DESIGN_TOKENS.colors.success[600] 
                                : DESIGN_TOKENS.colors.neutral[600],
                              border: `1px solid ${flag.initialValue 
                                ? DESIGN_TOKENS.colors.success[200] 
                                : DESIGN_TOKENS.colors.neutral[200]}`
                            }}
                          >
                            {flag.initialValue ? 'ON' : 'OFF'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ModernCard>
                </div>
              )}
            </div>
          </div>
        ) : (
          <RuleList
            project={project}
            selectedObjectId={selectedObjectId}
            onProjectUpdate={updateProject}
            onEditRule={handleEditRule}
            onCreateRule={handleCreateRule}
            onModeChange={setMode}
          />
        )}
      </div>

      {/* AdvancedRuleModal - 統合版 */}
      {showRuleModal && editingRule && (
        <AdvancedRuleModal
          rule={editingRule}
          project={project}
          onSave={handleSaveRule}
          onClose={() => {
            setShowRuleModal(false);
            setEditingRule(null);
          }}
        />
      )}
    </div>
  );
};