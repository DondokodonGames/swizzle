// src/components/editor/tabs/ScriptTab.tsx
// ゲーム時間設定追加版 - rulesモードに初期設定エリア追加

import React, { useState } from 'react';
import { GameProject } from '../../../types/editor/GameProject';
import { GameRule } from '../../../types/editor/GameScript';
import { GamePreview } from '../script/GamePreview';
import { BackgroundControl } from '../script/BackgroundControl';
import { RuleList } from '../script/RuleList';
import { AdvancedRuleModal } from '../script/AdvancedRuleModal';
import { RulePreview } from '../script/RulePreview';
import { DESIGN_TOKENS } from '../../../constants/DesignSystem';
import { ModernCard } from '../../ui/ModernCard';
import { ModernButton } from '../../ui/ModernButton';

interface ScriptTabProps {
  project: GameProject;
  onProjectUpdate: (project: GameProject) => void;
}

// ゲーム時間のプリセット
const DURATION_PRESETS = [
  { value: 5, label: '5秒', description: 'サクッと', emoji: '⚡' },
  { value: 10, label: '10秒', description: 'ちょうどいい', emoji: '⏰' },
  { value: 15, label: '15秒', description: 'じっくり', emoji: '🎯' },
  { value: 30, label: '30秒', description: 'たっぷり', emoji: '🏃' },
  { value: null, label: '無制限', description: '自由に', emoji: '∞' },
] as const;

export const ScriptTab: React.FC<ScriptTabProps> = ({ project, onProjectUpdate }) => {
  // 状態管理
  const [mode, setMode] = useState<'layout' | 'rules'>('layout');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [editingRule, setEditingRule] = useState<GameRule | null>(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [forceRender, setForceRender] = useState(0);

  // 🔧 新規追加: 複数ルール管理状態
  const [showRuleSelectionModal, setShowRuleSelectionModal] = useState(false);
  const [objectRulesForSelection, setObjectRulesForSelection] = useState<GameRule[]>([]);

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

  // 🔧 新規追加: ゲーム時間設定の更新
  const handleDurationChange = (seconds: number | null) => {
    const updatedSettings = {
      ...project.settings,
      duration: seconds === null ? {
        type: 'unlimited' as const,
        seconds: undefined,
        maxSeconds: undefined
      } : {
        type: 'fixed' as const,
        seconds: seconds as 5 | 10 | 15 | 20 | 30,
        maxSeconds: undefined
      }
    };
    
    updateProject({ settings: updatedSettings });
    showNotification('success', `ゲーム時間を${seconds === null ? '無制限' : seconds + '秒'}に設定しました`);
  };

  // 🔧 新規: オブジェクトを初期配置（ドラッグ&ドロップの代替）
  const handleAddObjectToLayout = (objectId: string) => {
    console.log(`[ScriptTab] レイアウトにオブジェクト追加: ${objectId}`);
    
    const updatedScript = JSON.parse(JSON.stringify(project.script));
    
    // 既に配置済みかチェック
    const existingIndex = updatedScript.layout.objects.findIndex((obj: any) => obj.objectId === objectId);
    
    if (existingIndex >= 0) {
      showNotification('info', 'このオブジェクトは既に配置されています');
      return;
    }
    
    // 新しい位置を計算（重複しないように配置）
    const existingCount = updatedScript.layout.objects.length;
    const baseX = 0.2 + (existingCount % 3) * 0.3; // 3列配置
    const baseY = 0.2 + Math.floor(existingCount / 3) * 0.3; // 行を下に
    
    const asset = project.assets.objects.find(obj => obj.id === objectId);
    if (asset) {
      updatedScript.layout.objects.push({
        objectId: objectId,
        position: { x: baseX, y: baseY },
        scale: { x: 1.0, y: 1.0 },
        rotation: 0,
        zIndex: existingCount + 10,
        initialState: {
          visible: true,
          animation: 0,
          animationSpeed: 12,
          autoStart: false
        }
      });
      
      updateProject({ script: updatedScript });
      setSelectedObjectId(objectId); // 自動選択
      showNotification('success', `「${asset.name}」をレイアウトに追加しました`);
    }
  };

  // 🔧 新規: レイアウトからオブジェクト削除
  const handleRemoveObjectFromLayout = (objectId: string) => {
    const updatedScript = JSON.parse(JSON.stringify(project.script));
    const beforeCount = updatedScript.layout.objects.length;
    
    updatedScript.layout.objects = updatedScript.layout.objects.filter((obj: any) => obj.objectId !== objectId);
    
    if (updatedScript.layout.objects.length < beforeCount) {
      updateProject({ script: updatedScript });
      if (selectedObjectId === objectId) {
        setSelectedObjectId(null);
      }
      showNotification('success', 'オブジェクトをレイアウトから削除しました');
    }
  };

  // オブジェクト配置更新（既存機能保護）
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

  // 🔧 拡張: オブジェクトの全ルール取得
  const getObjectRules = (objectId: string): GameRule[] => {
    return project.script.rules.filter(rule => rule.targetObjectId === objectId);
  };

  // 🔧 拡張: オブジェクトルール編集（複数対応）
  const handleObjectRuleEdit = (objectId: string) => {
    console.log(`[ScriptTab] ルール編集: ${objectId}`);
    setSelectedObjectId(objectId);
    
    // 🔧 修正: 該当オブジェクトの全ルールを取得
    const existingRules = getObjectRules(objectId);
    
    if (existingRules.length === 0) {
      // ルールなし → 新規作成
      handleCreateNewRule(objectId);
    } else if (existingRules.length === 1) {
      // 1つのルール → 直接編集（既存動作保護）
      setEditingRule(existingRules[0]);
      setShowRuleModal(true);
    } else {
      // 複数ルール → 選択画面表示
      setObjectRulesForSelection(existingRules);
      setShowRuleSelectionModal(true);
    }
  };

  // 🔧 新規: 新しいルール作成ヘルパー
  const handleCreateNewRule = (objectId: string) => {
    const asset = project.assets.objects.find(obj => obj.id === objectId);
    const existingRules = getObjectRules(objectId);
    
    // 🔧 制限チェック（32個まで）
    if (existingRules.length >= 32) {
      showNotification('error', 'ルール数が上限（32個）に達しています');
      return;
    }
    
    const newRule: GameRule = {
      id: `rule_${Date.now()}`,
      name: `${asset?.name || 'オブジェクト'}のルール${existingRules.length + 1}`,
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
    setShowRuleModal(true);
  };

  // 🔧 新規: ルール選択からの編集
  const handleSelectRuleForEdit = (rule: GameRule) => {
    setEditingRule(rule);
    setShowRuleSelectionModal(false);
    setShowRuleModal(true);
  };

  // 🔧 新規: 選択画面からの新規作成
  const handleCreateRuleFromSelection = () => {
    if (selectedObjectId) {
      setShowRuleSelectionModal(false);
      handleCreateNewRule(selectedObjectId);
    }
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

  // 新規ルール作成（既存機能保護）
  const handleCreateRule = () => {
    if (!selectedObjectId) return;
    handleCreateNewRule(selectedObjectId);
  };

  // ルール編集（既存機能保護）
  const handleEditRule = (rule: GameRule) => {
    setEditingRule(rule);
    setShowRuleModal(true);
  };

  // 🔧 拡張: オブジェクトのルール有無確認（複数対応）
  const hasRuleForObject = (objectId: string): boolean => {
    const rules = getObjectRules(objectId);
    return rules.some(rule => rule.enabled);
  };

  // 🔧 新規: オブジェクトのルール数取得
  const getRuleCountForObject = (objectId: string): number => {
    return getObjectRules(objectId).length;
  };

  // 🔧 新規: オブジェクト名取得ヘルパー
  const getObjectName = (objectId: string) => {
    if (objectId === 'stage') return '🌟 ゲーム全体';
    const obj = project.assets.objects.find(obj => obj.id === objectId);
    return obj ? obj.name : objectId;
  };

  // 🔧 新規: レイアウト配置済みオブジェクト判定
  const isObjectInLayout = (objectId: string): boolean => {
    return project.script.layout.objects.some(obj => obj.objectId === objectId);
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
              オブジェクト配置・複数ルール対応・高度なゲームロジック設定
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
            
            {/* 右サイドパネル - ModernCard統一 + オブジェクト選択UI復旧 */}
            <div 
              style={{
                width: '360px',
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
              
              {/* 🔧 新規追加: オブジェクト選択・配置UI */}
              {project.assets.objects.length > 0 && (
                <div style={{ padding: DESIGN_TOKENS.spacing[6] }}>
                  <ModernCard 
                    variant="filled" 
                    size="md" 
                    style={{ backgroundColor: DESIGN_TOKENS.colors.primary[50] }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[3], marginBottom: DESIGN_TOKENS.spacing[4] }}>
                      <div 
                        style={{
                          width: '32px',
                          height: '32px',
                          backgroundColor: DESIGN_TOKENS.colors.primary[500],
                          borderRadius: DESIGN_TOKENS.borderRadius.lg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: DESIGN_TOKENS.shadows.sm
                        }}
                      >
                        <span style={{ color: DESIGN_TOKENS.colors.neutral[0], fontSize: DESIGN_TOKENS.typography.fontSize.sm }}>🎯</span>
                      </div>
                      <div>
                        <h5 
                          style={{
                            fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                            fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                            color: DESIGN_TOKENS.colors.primary[800],
                            margin: 0
                          }}
                        >
                          オブジェクト配置
                        </h5>
                        <p 
                          style={{
                            fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                            color: DESIGN_TOKENS.colors.primary[600],
                            margin: 0
                          }}
                        >
                          レイアウト:{project.script.layout.objects.length}/{project.assets.objects.length}個配置済み
                        </p>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN_TOKENS.spacing[3] }}>
                      {project.assets.objects.map((asset) => {
                        const isInLayout = isObjectInLayout(asset.id);
                        const ruleCount = getRuleCountForObject(asset.id);
                        const isSelected = selectedObjectId === asset.id;
                        
                        return (
                          <div 
                            key={asset.id} 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between', 
                              padding: DESIGN_TOKENS.spacing[3], 
                              backgroundColor: isSelected 
                                ? DESIGN_TOKENS.colors.primary[100]
                                : DESIGN_TOKENS.colors.neutral[0], 
                              borderRadius: DESIGN_TOKENS.borderRadius.xl, 
                              boxShadow: DESIGN_TOKENS.shadows.sm, 
                              border: isSelected 
                                ? `2px solid ${DESIGN_TOKENS.colors.primary[500]}`
                                : `1px solid ${DESIGN_TOKENS.colors.primary[100]}`,
                              cursor: 'pointer'
                            }}
                            onClick={() => {
                              setSelectedObjectId(isSelected ? null : asset.id);
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[3] }}>
                              {/* サムネイル */}
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: DESIGN_TOKENS.borderRadius.md,
                                overflow: 'hidden',
                                backgroundColor: DESIGN_TOKENS.colors.neutral[100]
                              }}>
                                {asset.frames[0]?.dataUrl ? (
                                  <img 
                                    src={asset.frames[0].dataUrl}
                                    alt={asset.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                  />
                                ) : (
                                  <div style={{
                                    width: '100%', 
                                    height: '100%', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    fontSize: DESIGN_TOKENS.typography.fontSize.sm
                                  }}>
                                    🎮
                                  </div>
                                )}
                              </div>
                              
                              <div>
                                <div
                                  style={{
                                    fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                                    fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                                    color: DESIGN_TOKENS.colors.neutral[800]
                                  }}
                                >
                                  {asset.name}
                                </div>
                                <div
                                  style={{
                                    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                                    color: isInLayout 
                                      ? DESIGN_TOKENS.colors.success[600]
                                      : DESIGN_TOKENS.colors.neutral[500]
                                  }}
                                >
                                  {isInLayout ? '✅ 配置済み' : '⚪ 未配置'} 
                                  {ruleCount > 0 && ` • ${ruleCount}ルール`}
                                </div>
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[1] }}>
                              {!isInLayout ? (
                                <ModernButton
                                  variant="primary"
                                  size="xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddObjectToLayout(asset.id);
                                  }}
                                  style={{
                                    backgroundColor: DESIGN_TOKENS.colors.success[500],
                                    borderColor: DESIGN_TOKENS.colors.success[500],
                                    fontSize: DESIGN_TOKENS.typography.fontSize.xs
                                  }}
                                >
                                  📍 配置
                                </ModernButton>
                              ) : (
                                <>
                                  <ModernButton
                                    variant="outline"
                                    size="xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleObjectRuleEdit(asset.id);
                                    }}
                                    style={{
                                      borderColor: DESIGN_TOKENS.colors.purple[200],
                                      color: DESIGN_TOKENS.colors.purple[800],
                                      fontSize: DESIGN_TOKENS.typography.fontSize.xs
                                    }}
                                  >
                                    ⚙️ ルール
                                  </ModernButton>
                                  <ModernButton
                                    variant="ghost"
                                    size="xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveObjectFromLayout(asset.id);
                                    }}
                                    style={{
                                      color: DESIGN_TOKENS.colors.error[600],
                                      fontSize: DESIGN_TOKENS.typography.fontSize.xs
                                    }}
                                  >
                                    🗑️
                                  </ModernButton>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* ヒント表示 */}
                    <div style={{
                      marginTop: DESIGN_TOKENS.spacing[4],
                      padding: DESIGN_TOKENS.spacing[3],
                      backgroundColor: DESIGN_TOKENS.colors.primary[100],
                      borderRadius: DESIGN_TOKENS.borderRadius.lg,
                      fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                      color: DESIGN_TOKENS.colors.primary[800]
                    }}>
                      💡 操作方法：
                      <br />• 📍配置 → レイアウト画面に追加
                      <br />• ⚙️ルール → ゲームロジック設定
                      <br />• 🗑️削除 → レイアウトから除去
                      <br />• ドラッグ&ドロップでも配置可能
                    </div>
                  </ModernCard>
                </div>
              )}
              
              {/* 🔧 追加: 複数ルールプレビュー表示 */}
              {selectedObjectId && getObjectRules(selectedObjectId).length > 1 && (
                <div style={{ padding: DESIGN_TOKENS.spacing[6] }}>
                  <RulePreview
                    objectRules={getObjectRules(selectedObjectId)}
                    project={project}
                    projectFlags={project.script?.flags || []}
                    mode="multiple"
                    showTitle={true}
                    compact={true}
                  />
                </div>
              )}

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
          /* 🔧 ルールモード：初期設定エリア追加 */
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            
            {/* 🆕 初期設定エリア（赤い範囲） */}
            <div style={{
              backgroundColor: DESIGN_TOKENS.colors.neutral[0],
              borderBottom: `1px solid ${DESIGN_TOKENS.colors.neutral[200]}`,
              padding: DESIGN_TOKENS.spacing[6]
            }}>
              <ModernCard 
                variant="filled" 
                size="lg"
                style={{ backgroundColor: DESIGN_TOKENS.colors.purple[50] }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[3], marginBottom: DESIGN_TOKENS.spacing[4] }}>
                  <div 
                    style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: DESIGN_TOKENS.colors.purple[500],
                      borderRadius: DESIGN_TOKENS.borderRadius.xl,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: DESIGN_TOKENS.shadows.md
                    }}
                  >
                    <span style={{ color: DESIGN_TOKENS.colors.neutral[0], fontSize: DESIGN_TOKENS.typography.fontSize.lg }}>⚙️</span>
                  </div>
                  <div>
                    <h3 
                      style={{
                        fontSize: DESIGN_TOKENS.typography.fontSize.xl,
                        fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                        color: DESIGN_TOKENS.colors.purple[800],
                        margin: 0
                      }}
                    >
                      ゲームルール設定
                    </h3>
                    <p 
                      style={{
                        fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                        color: DESIGN_TOKENS.colors.purple[600],
                        margin: 0
                      }}
                    >
                      オブジェクトを選択してルールを設定
                    </p>
                  </div>
                </div>

                {/* 🆕 ゲーム時間設定 */}
                <div style={{ marginBottom: DESIGN_TOKENS.spacing[6] }}>
                  <h4 style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                    fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                    color: DESIGN_TOKENS.colors.neutral[800],
                    marginBottom: DESIGN_TOKENS.spacing[4],
                    display: 'flex',
                    alignItems: 'center',
                    gap: DESIGN_TOKENS.spacing[2]
                  }}>
                    ⏰ ゲーム時間設定
                  </h4>
                  
                  <div style={{ 
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: DESIGN_TOKENS.spacing[3]
                  }}>
                    {DURATION_PRESETS.map((preset) => {
                      const isSelected = (preset.value === null && project.settings.duration?.type === 'unlimited') ||
                                       (preset.value !== null && project.settings.duration?.seconds === preset.value);
                      
                      return (
                        <button
                          key={preset.value || 'unlimited'}
                          onClick={() => handleDurationChange(preset.value)}
                          style={{
                            padding: DESIGN_TOKENS.spacing[4],
                            border: isSelected ? `2px solid ${DESIGN_TOKENS.colors.purple[500]}` : `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                            borderRadius: DESIGN_TOKENS.borderRadius.xl,
                            backgroundColor: isSelected ? DESIGN_TOKENS.colors.purple[100] : DESIGN_TOKENS.colors.neutral[0],
                            color: DESIGN_TOKENS.colors.neutral[800],
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: `all ${DESIGN_TOKENS.animation.duration.normal} ${DESIGN_TOKENS.animation.easing.inOut}`,
                            outline: 'none'
                          }}
                          onMouseOver={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = DESIGN_TOKENS.colors.neutral[50];
                              e.currentTarget.style.borderColor = DESIGN_TOKENS.colors.neutral[400];
                            }
                          }}
                          onMouseOut={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = DESIGN_TOKENS.colors.neutral[0];
                              e.currentTarget.style.borderColor = DESIGN_TOKENS.colors.neutral[300];
                            }
                          }}
                        >
                          <div style={{ 
                            fontSize: DESIGN_TOKENS.typography.fontSize['3xl'], 
                            marginBottom: DESIGN_TOKENS.spacing[2] 
                          }}>
                            {preset.emoji}
                          </div>
                          <div style={{ 
                            fontSize: DESIGN_TOKENS.typography.fontSize.sm, 
                            fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                            marginBottom: DESIGN_TOKENS.spacing[1]
                          }}>
                            {preset.label}
                          </div>
                          <div style={{ 
                            fontSize: DESIGN_TOKENS.typography.fontSize.xs, 
                            color: DESIGN_TOKENS.colors.neutral[600]
                          }}>
                            {preset.description}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* 現在の設定表示 */}
                  <div style={{
                    marginTop: DESIGN_TOKENS.spacing[4],
                    padding: DESIGN_TOKENS.spacing[3],
                    backgroundColor: DESIGN_TOKENS.colors.purple[100],
                    borderRadius: DESIGN_TOKENS.borderRadius.lg,
                    border: `1px solid ${DESIGN_TOKENS.colors.purple[200]}`
                  }}>
                    <div style={{
                      fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                      color: DESIGN_TOKENS.colors.purple[800],
                      fontWeight: DESIGN_TOKENS.typography.fontWeight.medium
                    }}>
                      💡 現在の設定: {
                        project.settings.duration?.type === 'unlimited' 
                          ? '無制限でプレイ可能'
                          : `${project.settings.duration?.seconds || 10}秒でゲーム終了`
                      }
                    </div>
                  </div>
                </div>
              </ModernCard>
            </div>

            {/* ルール一覧エリア */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <RuleList
                project={project}
                selectedObjectId={selectedObjectId}
                onProjectUpdate={updateProject}
                onEditRule={handleEditRule}
                onCreateRule={handleCreateRule}
                onModeChange={setMode}
              />
            </div>
          </div>
        )}
      </div>

      {/* 🔧 新規: ルール選択モーダル */}
      {showRuleSelectionModal && selectedObjectId && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: DESIGN_TOKENS.zIndex.modal,
            padding: DESIGN_TOKENS.spacing[4]
          }}
        >
          <ModernCard 
            variant="elevated" 
            size="lg"
            style={{
              backgroundColor: DESIGN_TOKENS.colors.neutral[0],
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* ヘッダー */}
            <div 
              style={{
                padding: DESIGN_TOKENS.spacing[6],
                borderBottom: `1px solid ${DESIGN_TOKENS.colors.neutral[200]}`,
                backgroundColor: DESIGN_TOKENS.colors.purple[50]
              }}
            >
              <h3 
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.xl,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                  color: DESIGN_TOKENS.colors.purple[800],
                  margin: 0,
                  marginBottom: DESIGN_TOKENS.spacing[2],
                  display: 'flex',
                  alignItems: 'center',
                  gap: DESIGN_TOKENS.spacing[3]
                }}
              >
                <span>📝</span>
                ルール選択 - {getObjectName(selectedObjectId)}
              </h3>
              <p 
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  color: DESIGN_TOKENS.colors.purple[600],
                  margin: 0
                }}
              >
                編集するルールを選択してください（{objectRulesForSelection.length}/32）
              </p>
            </div>

            {/* ルール一覧 */}
            <div 
              style={{
                flex: 1,
                padding: DESIGN_TOKENS.spacing[6],
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: DESIGN_TOKENS.spacing[4]
              }}
            >
              {objectRulesForSelection.map((rule, index) => (
                <ModernCard
                  key={rule.id}
                  variant="outlined"
                  size="md"
                  style={{
                    border: `1px solid ${DESIGN_TOKENS.colors.purple[200]}`,
                    cursor: 'pointer',
                    transition: `all ${DESIGN_TOKENS.animation.duration.normal} ${DESIGN_TOKENS.animation.easing.inOut}`
                  }}
                  onClick={() => handleSelectRuleForEdit(rule)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = DESIGN_TOKENS.colors.purple[400];
                    e.currentTarget.style.backgroundColor = DESIGN_TOKENS.colors.purple[50];
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = DESIGN_TOKENS.colors.purple[200];
                    e.currentTarget.style.backgroundColor = DESIGN_TOKENS.colors.neutral[0];
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                        fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                        color: DESIGN_TOKENS.colors.neutral[800],
                        marginBottom: DESIGN_TOKENS.spacing[2]
                      }}>
                        ルール{index + 1}: {rule.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[4] }}>
                        <div style={{
                          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                          color: DESIGN_TOKENS.colors.neutral[600]
                        }}>
                          🔥 {rule.triggers.conditions.length}条件 ⚡ {rule.actions.length}アクション
                        </div>
                        <div 
                          style={{
                            padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[3]}`,
                            borderRadius: DESIGN_TOKENS.borderRadius.lg,
                            fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                            fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                            backgroundColor: rule.enabled 
                              ? DESIGN_TOKENS.colors.success[100] 
                              : DESIGN_TOKENS.colors.neutral[200],
                            color: rule.enabled 
                              ? DESIGN_TOKENS.colors.success[800] 
                              : DESIGN_TOKENS.colors.neutral[600],
                            border: `1px solid ${rule.enabled 
                              ? DESIGN_TOKENS.colors.success[600] 
                              : DESIGN_TOKENS.colors.neutral[400]}`
                          }}
                        >
                          {rule.enabled ? '✅ 有効' : '⏸️ 無効'}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      fontSize: DESIGN_TOKENS.typography.fontSize.xl,
                      color: DESIGN_TOKENS.colors.purple[500]
                    }}>
                      ✏️
                    </div>
                  </div>
                </ModernCard>
              ))}
            </div>

            {/* フッター */}
            <div 
              style={{
                padding: DESIGN_TOKENS.spacing[6],
                borderTop: `1px solid ${DESIGN_TOKENS.colors.neutral[200]}`,
                backgroundColor: DESIGN_TOKENS.colors.neutral[50],
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <ModernButton
                variant="primary"
                size="md"
                onClick={handleCreateRuleFromSelection}
                disabled={objectRulesForSelection.length >= 32}
                style={{
                  backgroundColor: DESIGN_TOKENS.colors.success[600],
                  borderColor: DESIGN_TOKENS.colors.success[600]
                }}
              >
                <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.lg }}>➕</span>
                新規ルール作成
              </ModernButton>
              
              <ModernButton
                variant="secondary"
                size="md"
                onClick={() => setShowRuleSelectionModal(false)}
              >
                キャンセル
              </ModernButton>
            </div>
          </ModernCard>
        </div>
      )}

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