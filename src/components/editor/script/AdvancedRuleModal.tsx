// src/components/editor/script/AdvancedRuleModal.tsx
// Phase E Step 0: GameState統合最終版
// 既存機能完全保護 + GameState条件エディター追加

import React, { useState, useEffect } from 'react';
import { GameRule, TriggerCondition, GameAction, GameFlag } from '../../../types/editor/GameScript';
import { GameProject } from '../../../types/editor/GameProject';
import { DESIGN_TOKENS } from '../../../constants/DesignSystem';
import { ModernCard } from '../../ui/ModernCard';
import { ModernButton } from '../../ui/ModernButton';
import { RulePreview } from './RulePreview';

// 分割されたライブラリインポート
import { CONDITION_LIBRARY, ACTION_LIBRARY } from './constants/RuleLibrary';

// 分割された条件エディターインポート（Phase C保護 + Phase D・E拡張）
import { TouchConditionEditor } from './conditions/TouchConditionEditor';
import { TimeConditionEditor } from './conditions/TimeConditionEditor';
import { FlagConditionEditor } from './conditions/FlagConditionEditor';
import { CollisionConditionEditor } from './conditions/CollisionConditionEditor';
import { GameStateConditionEditor } from './conditions/GameStateConditionEditor'; // Phase E追加

// 分割されたアクションエディターインポート（Phase C保護 + Phase D拡張）
import { SoundActionEditor } from './actions/SoundActionEditor';
import { MoveActionEditor } from './actions/MoveActionEditor';
import { EffectActionEditor } from './actions/EffectActionEditor';
import { ShowHideActionEditor } from './actions/ShowHideActionEditor';
import { FlagActionEditor } from './actions/FlagActionEditor';

interface AdvancedRuleModalProps {
  rule: GameRule;
  project: GameProject;
  onSave: (rule: GameRule) => void;
  onClose: () => void;
}

export const AdvancedRuleModal: React.FC<AdvancedRuleModalProps> = ({
  rule: initialRule,
  project,
  onSave,
  onClose
}) => {
  const [rule, setRule] = useState<GameRule>(initialRule);
  const [conditions, setConditions] = useState<TriggerCondition[]>(initialRule.triggers.conditions);
  const [actions, setActions] = useState<GameAction[]>(initialRule.actions);
  const [operator, setOperator] = useState<'AND' | 'OR'>(initialRule.triggers.operator);
  
  // フラグ管理状態（Phase A・B保護）
  const [projectFlags, setProjectFlags] = useState<GameFlag[]>(project.script?.flags || []);
  const [newFlagName, setNewFlagName] = useState('');
  
  // 詳細パラメータ編集状態（Phase C保護）
  const [editingConditionIndex, setEditingConditionIndex] = useState<number | null>(null);
  const [editingActionIndex, setEditingActionIndex] = useState<number | null>(null);
  const [showParameterModal, setShowParameterModal] = useState(false);

  // 通知システム（Phase A・B保護）
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // 通知表示ヘルパー（Phase A・B保護）
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // プロジェクトフラグ更新（Phase A・B保護）
  const updateProjectFlags = (flags: GameFlag[]) => {
    setProjectFlags(flags);
  };

  // フラグ追加（Phase A・B保護）
  const addFlag = () => {
    if (newFlagName.trim()) {
      const newFlag: GameFlag = {
        id: `flag_${Date.now()}`,
        name: newFlagName.trim(),
        initialValue: false,
        createdAt: new Date().toISOString()
      };
      updateProjectFlags([...projectFlags, newFlag]);
      setNewFlagName('');
      showNotification('success', `フラグ「${newFlag.name}」を追加しました`);
    }
  };

  // フラグ削除（Phase A・B保護）
  const removeFlag = (flagId: string) => {
    const flag = projectFlags.find(f => f.id === flagId);
    if (confirm(`フラグ「${flag?.name}」を削除しますか？`)) {
      updateProjectFlags(projectFlags.filter(flag => flag.id !== flagId));
      showNotification('success', 'フラグを削除しました');
    }
  };

  // フラグ初期値変更（Phase A・B保護）
  const toggleFlagInitialValue = (flagId: string) => {
    updateProjectFlags(projectFlags.map(flag => 
      flag.id === flagId ? { ...flag, initialValue: !flag.initialValue } : flag
    ));
  };

  // 条件追加（Phase A・B保護・Phase D・E拡張対応）
  const addCondition = (type: string) => {
    let newCondition: TriggerCondition;
    
    switch (type) {
      case 'touch':
        newCondition = {
          type: 'touch',
          target: 'self',
          touchType: 'down'
        };
        break;
      case 'time':
        newCondition = {
          type: 'time',
          timeType: 'exact',
          seconds: 3
        };
        break;
      case 'position':
        newCondition = {
          type: 'position',
          target: rule.targetObjectId,
          area: 'inside',
          region: {
            shape: 'rect',
            x: 0.3,
            y: 0.3,
            width: 0.4,
            height: 0.4
          }
        };
        break;
      case 'collision':
        newCondition = {
          type: 'collision',
          target: 'background',
          collisionType: 'enter',
          checkMode: 'hitbox'
        };
        break;
      case 'gameState': // Phase E追加
        newCondition = {
          type: 'gameState',
          state: 'playing',
          checkType: 'is'
        };
        break;
      case 'animation':
        newCondition = {
          type: 'animation',
          target: rule.targetObjectId,
          condition: 'end',
          animationIndex: 0
        };
        break;
      case 'flag':
        newCondition = {
          type: 'flag',
          flagId: projectFlags[0]?.id || '',
          condition: 'ON'
        };
        break;
      default:
        return;
    }
    
    setConditions([...conditions, newCondition]);
    showNotification('success', '条件を追加しました');
  };

  // 条件削除（Phase A・B保護）
  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
    showNotification('success', '条件を削除しました');
  };

  // 条件更新（Phase C: 詳細パラメータ対応）
  const updateCondition = (index: number, updates: Partial<TriggerCondition>) => {
    setConditions(conditions.map((condition, i) => 
      i === index ? ({ ...condition, ...updates } as TriggerCondition) : condition
    ));
  };

  // アクション追加（Phase A・B保護・Phase D拡張）
  const addAction = (type: string) => {
    let newAction: GameAction;
    
    switch (type) {
      case 'success':
        newAction = { type: 'success' };
        break;
      case 'failure':
        newAction = { type: 'failure' };
        break;
      case 'playSound':
        newAction = {
          type: 'playSound',
          soundId: project.assets.audio?.se?.[0]?.id || '',
          volume: 0.8
        };
        break;
      case 'move':
        newAction = {
          type: 'move',
          targetId: rule.targetObjectId,
          movement: {
            type: 'straight',
            target: { x: 0.5, y: 0.5 },
            speed: 300,
            duration: 2.0
          }
        };
        break;
      case 'effect':
        newAction = {
          type: 'effect',
          targetId: rule.targetObjectId,
          effect: {
            type: 'flash',
            duration: 1.0,
            intensity: 0.8
          }
        };
        break;
      case 'show':
        newAction = {
          type: 'show',
          targetId: rule.targetObjectId,
          fadeIn: true,
          duration: 0.5
        };
        break;
      case 'hide':
        newAction = {
          type: 'hide',
          targetId: rule.targetObjectId,
          fadeOut: true,
          duration: 0.5
        };
        break;
      case 'setFlag':
        newAction = {
          type: 'setFlag',
          flagId: projectFlags[0]?.id || '',
          value: true
        };
        break;
      case 'toggleFlag':
        newAction = {
          type: 'toggleFlag',
          flagId: projectFlags[0]?.id || ''
        };
        break;
      case 'switchAnimation':
        newAction = {
          type: 'switchAnimation',
          targetId: rule.targetObjectId,
          animationIndex: 0
        };
        break;
      default:
        return;
    }
    
    setActions([...actions, newAction]);
    showNotification('success', 'アクションを追加しました');
  };

  // アクション削除（Phase A・B保護）
  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
    showNotification('success', 'アクションを削除しました');
  };

  // アクション更新（Phase A・B保護・拡張）
  const updateAction = (index: number, updates: Partial<GameAction>) => {
    setActions(actions.map((action, i) => {
      if (i !== index) return action;
      switch (action.type) {
        case 'success':
        case 'failure':
          return { ...action, ...(updates as typeof action) };
        case 'playSound':
          return { ...action, ...(updates as typeof action) };
        case 'move':
          return { ...action, ...(updates as typeof action) };
        case 'effect':
          return { ...action, ...(updates as typeof action) };
        case 'show':
        case 'hide':
          return { ...action, ...(updates as typeof action) };
        case 'setFlag':
        case 'toggleFlag':
          return { ...action, ...(updates as typeof action) };
        case 'switchAnimation':
          return { ...action, ...(updates as typeof action) };
        default:
          return action;
      }
    }));
  };

  // 保存処理（Phase A・B保護）
  const handleSave = () => {
    if (!rule.name.trim()) {
      showNotification('error', 'ルール名を入力してください');
      return;
    }

    if (conditions.length === 0) {
      showNotification('error', '最低1つの条件を設定してください');
      return;
    }

    if (actions.length === 0) {
      showNotification('error', '最低1つのアクションを設定してください');
      return;
    }

    const updatedRule: GameRule = {
      ...rule,
      triggers: {
        operator,
        conditions
      },
      actions,
      lastModified: new Date().toISOString()
    };

    onSave(updatedRule);
    showNotification('success', 'ルールを保存しました');
  };

  // 条件エディター分岐レンダリング（Phase E拡張）
  const renderConditionEditor = (condition: TriggerCondition, index: number) => {
    switch (condition.type) {
      case 'touch':
        return (
          <TouchConditionEditor
            condition={condition}
            index={index}
            onUpdate={updateCondition}
          />
        );
      case 'time':
        return (
          <TimeConditionEditor
            condition={condition}
            index={index}
            onUpdate={updateCondition}
          />
        );
      case 'collision':
        return (
          <CollisionConditionEditor
            condition={condition}
            index={index}
            onUpdate={updateCondition}
          />
        );
      case 'gameState': // Phase E追加
        return (
          <GameStateConditionEditor
            condition={condition}
            index={index}
            onUpdate={updateCondition}
          />
        );
      case 'flag':
        return (
          <FlagConditionEditor
            condition={condition}
            index={index}
            projectFlags={projectFlags}
            onUpdate={updateCondition}
          />
        );
      default:
        return null;
    }
  };

  // アクションエディター分岐レンダリング（Phase D保護）
  const renderActionEditor = (action: GameAction, index: number) => {
    switch (action.type) {
      case 'playSound':
        return (
          <SoundActionEditor
            action={action}
            index={index}
            project={project}
            onUpdate={updateAction}
            onShowNotification={showNotification}
          />
        );
      case 'move':
        return (
          <MoveActionEditor
            action={action}
            index={index}
            onUpdate={updateAction}
            onShowNotification={showNotification}
          />
        );
      case 'effect':
        return (
          <EffectActionEditor
            action={action}
            index={index}
            onUpdate={updateAction}
            onShowNotification={showNotification}
          />
        );
      case 'show':
      case 'hide':
        return (
          <ShowHideActionEditor
            action={action}
            index={index}
            onUpdate={updateAction}
            onShowNotification={showNotification}
          />
        );
      case 'setFlag':
      case 'toggleFlag':
        return (
          <FlagActionEditor
            action={action}
            index={index}
            projectFlags={projectFlags}
            onUpdate={updateAction}
            onShowNotification={showNotification}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* 通知表示（Phase A・B保護） */}
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

      {/* メインモーダル */}
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
        <div 
          style={{
            backgroundColor: DESIGN_TOKENS.colors.neutral[0],
            borderRadius: DESIGN_TOKENS.borderRadius['3xl'],
            boxShadow: DESIGN_TOKENS.shadows['2xl'],
            width: '100%',
            maxWidth: '1400px',
            maxHeight: '95vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            border: `1px solid ${DESIGN_TOKENS.colors.neutral[200]}`
          }}
        >
          
          {/* ヘッダー（Phase A・B保護・Phase E最終更新） */}
          <ModernCard 
            variant="filled" 
            size="lg"
            style={{ 
              backgroundColor: DESIGN_TOKENS.colors.purple[600],
              borderRadius: `${DESIGN_TOKENS.borderRadius['3xl']} ${DESIGN_TOKENS.borderRadius['3xl']} 0 0`,
              margin: 0
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[4] }}>
              <div 
                style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: DESIGN_TOKENS.colors.purple[500],
                  borderRadius: DESIGN_TOKENS.borderRadius.xl,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: DESIGN_TOKENS.shadows.lg
                }}
              >
                <span style={{ 
                  fontSize: DESIGN_TOKENS.typography.fontSize['2xl'], 
                  color: DESIGN_TOKENS.colors.neutral[0] 
                }}>
                  🎯
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <h3 
                  style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize['2xl'],
                    fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                    color: DESIGN_TOKENS.colors.neutral[0],
                    margin: 0,
                    marginBottom: DESIGN_TOKENS.spacing[2]
                  }}
                >
                  高度なルール設定 - Phase E Step 0完了
                </h3>
                <p 
                  style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                    color: DESIGN_TOKENS.colors.purple[100],
                    fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                    margin: 0
                  }}
                >
                  GameState条件統合・ゲーム状態制御実現
                </p>
              </div>
            </div>
          </ModernCard>

          {/* メインコンテンツ（Phase A・B保護・レイアウト維持） */}
          <div 
            style={{
              flex: 1,
              overflowY: 'auto',
              backgroundColor: DESIGN_TOKENS.colors.neutral[50]
            }}
          >
            <div 
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: DESIGN_TOKENS.spacing[6],
                padding: DESIGN_TOKENS.spacing[6],
                maxWidth: '1400px',
                margin: '0 auto'
              }}
            >
              
              {/* 左上: ルール名（Phase A・B保護） */}
              <ModernCard variant="outlined" size="lg">
                <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: DESIGN_TOKENS.spacing[2],
                    marginBottom: DESIGN_TOKENS.spacing[3]
                  }}>
                    <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xl }}>📝</span>
                    <span style={{ 
                      fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                      color: DESIGN_TOKENS.colors.neutral[700],
                      fontSize: DESIGN_TOKENS.typography.fontSize.sm
                    }}>
                      ルール名
                    </span>
                  </div>
                  <input
                    type="text"
                    value={rule.name}
                    onChange={(e) => setRule({ ...rule, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: `${DESIGN_TOKENS.spacing[3]} ${DESIGN_TOKENS.spacing[4]}`,
                      border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                      borderRadius: DESIGN_TOKENS.borderRadius.xl,
                      fontSize: DESIGN_TOKENS.typography.fontSize.base,
                      fontFamily: DESIGN_TOKENS.typography.fontFamily.sans.join(', '),
                      backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                      transition: `all ${DESIGN_TOKENS.animation.duration.normal} ${DESIGN_TOKENS.animation.easing.inOut}`,
                      outline: 'none',
                      boxShadow: DESIGN_TOKENS.shadows.sm
                    }}
                    placeholder="例: ゲーム開始時に音楽再生"
                    onFocus={(e) => {
                      e.target.style.borderColor = DESIGN_TOKENS.colors.purple[500];
                      e.target.style.boxShadow = `0 0 0 3px ${DESIGN_TOKENS.colors.purple[500]}20`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = DESIGN_TOKENS.colors.neutral[300];
                      e.target.style.boxShadow = DESIGN_TOKENS.shadows.sm;
                    }}
                  />
                </div>
              </ModernCard>

              {/* 右上: 実行アクション（簡易版・Phase A・B保護・Phase D拡張） */}
              <ModernCard 
                variant="outlined" 
                size="lg"
                style={{ 
                  backgroundColor: DESIGN_TOKENS.colors.success[50],
                  border: `2px solid ${DESIGN_TOKENS.colors.success[200]}`
                }}
              >
                <h4 style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                  color: DESIGN_TOKENS.colors.success[800],
                  margin: 0,
                  marginBottom: DESIGN_TOKENS.spacing[4],
                  display: 'flex',
                  alignItems: 'center',
                  gap: DESIGN_TOKENS.spacing[2]
                }}>
                  <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xl }}>⚡</span>
                  実行アクション ({actions.length}個)
                </h4>

                {/* アクション追加ボタン（コンパクト版・Phase A・B保護・Phase D拡張） */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: DESIGN_TOKENS.spacing[2],
                  marginBottom: DESIGN_TOKENS.spacing[4]
                }}>
                  {ACTION_LIBRARY.slice(0, 6).map((actionType) => (
                    <ModernButton
                      key={actionType.type}
                      variant="outline"
                      size="sm"
                      onClick={() => addAction(actionType.type)}
                      style={{
                        borderColor: DESIGN_TOKENS.colors.success[200],
                        color: DESIGN_TOKENS.colors.success[600],
                        fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                        padding: DESIGN_TOKENS.spacing[2]
                      }}
                    >
                      <span>{actionType.icon}</span>
                    </ModernButton>
                  ))}
                </div>

                {/* アクション一覧（簡易表示・Phase A・B保護・Phase D拡張） */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN_TOKENS.spacing[2] }}>
                  {actions.slice(0, 3).map((action, index) => (
                    <div key={index}>
                      <div 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: DESIGN_TOKENS.spacing[2],
                          padding: DESIGN_TOKENS.spacing[2],
                          backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                          borderRadius: DESIGN_TOKENS.borderRadius.lg,
                          fontSize: DESIGN_TOKENS.typography.fontSize.xs
                        }}
                      >
                        <span>{ACTION_LIBRARY.find(a => a.type === action.type)?.icon}</span>
                        <span>{ACTION_LIBRARY.find(a => a.type === action.type)?.label}</span>
                        {/* アクション詳細設定ボタン（Phase D・E拡張対応） */}
                        {['playSound', 'move', 'effect', 'show', 'hide', 'setFlag', 'toggleFlag'].includes(action.type) && (
                          <ModernButton
                            variant="outline"
                            size="xs"
                            onClick={() => {/* 詳細設定は常に表示済み */}}
                            style={{
                              borderColor: DESIGN_TOKENS.colors.success[200],
                              color: DESIGN_TOKENS.colors.success[600],
                              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                              marginLeft: 'auto',
                              marginRight: DESIGN_TOKENS.spacing[1]
                            }}
                          >
                            ⚙️
                          </ModernButton>
                        )}
                        <ModernButton
                          variant="ghost"
                          size="xs"
                          onClick={() => removeAction(index)}
                          style={{ 
                            marginLeft: ['playSound', 'move', 'effect', 'show', 'hide', 'setFlag', 'toggleFlag'].includes(action.type) ? 0 : 'auto'
                          }}
                        >
                          ✕
                        </ModernButton>
                      </div>
                      
                      {/* 分割されたアクションエディター表示（Phase D保護） */}
                      {renderActionEditor(action, index)}
                    </div>
                  ))}
                  {actions.length > 3 && (
                    <div style={{
                      fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                      color: DESIGN_TOKENS.colors.neutral[500],
                      textAlign: 'center'
                    }}>
                      他 {actions.length - 3}個のアクション
                    </div>
                  )}
                </div>
              </ModernCard>

              {/* 左下: 発動条件（詳細版・Phase C Step 1-1・1-2・2拡張・Phase D・E拡張） */}
              <ModernCard 
                variant="outlined" 
                size="lg"
                style={{ 
                  backgroundColor: DESIGN_TOKENS.colors.purple[50],
                  border: `2px solid ${DESIGN_TOKENS.colors.purple[200]}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: DESIGN_TOKENS.spacing[4] }}>
                  <h4 style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                    fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                    color: DESIGN_TOKENS.colors.purple[800],
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: DESIGN_TOKENS.spacing[2]
                  }}>
                    <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xl }}>🔥</span>
                    発動条件 ({conditions.length}個)
                  </h4>
                  <select
                    value={operator}
                    onChange={(e) => setOperator(e.target.value as 'AND' | 'OR')}
                    style={{
                      fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                      border: `1px solid ${DESIGN_TOKENS.colors.purple[200]}`,
                      borderRadius: DESIGN_TOKENS.borderRadius.lg,
                      padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[2]}`,
                      backgroundColor: DESIGN_TOKENS.colors.neutral[0]
                    }}
                  >
                    <option value="AND">すべて (AND)</option>
                    <option value="OR">いずれか (OR)</option>
                  </select>
                </div>

                {/* 条件追加ボタン（Phase A・B保護・Phase D・E対応） */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                  gap: DESIGN_TOKENS.spacing[2],
                  marginBottom: DESIGN_TOKENS.spacing[4]
                }}>
                  {CONDITION_LIBRARY.map((conditionType) => (
                    <ModernButton
                      key={conditionType.type}
                      variant="outline"
                      size="xs"
                      onClick={() => addCondition(conditionType.type)}
                      style={{
                        borderColor: DESIGN_TOKENS.colors.purple[200],
                        color: DESIGN_TOKENS.colors.purple[800],
                        fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                        padding: DESIGN_TOKENS.spacing[1]
                      }}
                    >
                      <span>{conditionType.icon}</span>
                    </ModernButton>
                  ))}
                </div>

                {/* 条件一覧（詳細パラメータ編集対応・Phase D・E拡張） */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN_TOKENS.spacing[2] }}>
                  {conditions.map((condition, index) => (
                    <div key={index}>
                      <div 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: DESIGN_TOKENS.spacing[2],
                          padding: DESIGN_TOKENS.spacing[2],
                          backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                          borderRadius: DESIGN_TOKENS.borderRadius.lg,
                          fontSize: DESIGN_TOKENS.typography.fontSize.xs
                        }}
                      >
                        <span>{CONDITION_LIBRARY.find(c => c.type === condition.type)?.icon}</span>
                        <span>{CONDITION_LIBRARY.find(c => c.type === condition.type)?.label}</span>
                        <ModernButton
                          variant="outline"
                          size="xs"
                          onClick={() => {/* 詳細設定は常に表示済み */}}
                          style={{
                            borderColor: DESIGN_TOKENS.colors.purple[200],
                            color: DESIGN_TOKENS.colors.purple[800],
                            fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                            marginLeft: 'auto',
                            marginRight: DESIGN_TOKENS.spacing[1]
                          }}
                        >
                          ⚙️
                        </ModernButton>
                        <ModernButton
                          variant="ghost"
                          size="xs"
                          onClick={() => removeCondition(index)}
                        >
                          ✕
                        </ModernButton>
                      </div>
                      
                      {/* 分割された条件エディター表示（Phase E拡張） */}
                      {renderConditionEditor(condition, index)}
                    </div>
                  ))}
                </div>
              </ModernCard>

              {/* 右下: フラグ管理（Phase A・B保護） */}
              <ModernCard 
                variant="outlined" 
                size="lg"
                style={{ 
                  backgroundColor: DESIGN_TOKENS.colors.warning[50],
                  border: `2px solid ${DESIGN_TOKENS.colors.warning[100]}`
                }}
              >
                <h4 style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                  color: DESIGN_TOKENS.colors.warning[800],
                  margin: 0,
                  marginBottom: DESIGN_TOKENS.spacing[4],
                  display: 'flex',
                  alignItems: 'center',
                  gap: DESIGN_TOKENS.spacing[2]
                }}>
                  <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xl }}>🚩</span>
                  フラグ管理 ({projectFlags.length}個)
                </h4>

                {/* 新規フラグ追加（Phase A・B保護） */}
                <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[2], marginBottom: DESIGN_TOKENS.spacing[4] }}>
                  <input
                    type="text"
                    value={newFlagName}
                    onChange={(e) => setNewFlagName(e.target.value)}
                    placeholder="フラグ名"
                    style={{
                      flex: 1,
                      padding: DESIGN_TOKENS.spacing[2],
                      fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                      border: `1px solid ${DESIGN_TOKENS.colors.warning[100]}`,
                      borderRadius: DESIGN_TOKENS.borderRadius.lg,
                      backgroundColor: DESIGN_TOKENS.colors.neutral[0]
                    }}
                  />
                  <ModernButton
                    variant="primary"
                    size="sm"
                    onClick={addFlag}
                    style={{
                      backgroundColor: DESIGN_TOKENS.colors.warning[500],
                      borderColor: DESIGN_TOKENS.colors.warning[500],
                      fontSize: DESIGN_TOKENS.typography.fontSize.xs
                    }}
                  >
                    ➕
                  </ModernButton>
                </div>

                {/* フラグ一覧（Phase A・B保護） */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN_TOKENS.spacing[2] }}>
                  {projectFlags.slice(0, 4).map((flag) => (
                    <div 
                      key={flag.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: DESIGN_TOKENS.spacing[2],
                        padding: DESIGN_TOKENS.spacing[2],
                        backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                        borderRadius: DESIGN_TOKENS.borderRadius.lg,
                        fontSize: DESIGN_TOKENS.typography.fontSize.xs
                      }}
                    >
                      <ModernButton
                        variant={flag.initialValue ? "success" : "secondary"}
                        size="xs"
                        onClick={() => toggleFlagInitialValue(flag.id)}
                        style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs }}
                      >
                        {flag.initialValue ? 'ON' : 'OFF'}
                      </ModernButton>
                      <span style={{ flex: 1 }}>{flag.name}</span>
                      <ModernButton
                        variant="ghost"
                        size="xs"
                        onClick={() => removeFlag(flag.id)}
                      >
                        ✕
                      </ModernButton>
                    </div>
                  ))}
                  {projectFlags.length > 4 && (
                    <div style={{
                      fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                      color: DESIGN_TOKENS.colors.neutral[500],
                      textAlign: 'center'
                    }}>
                      他 {projectFlags.length - 4}個のフラグ
                    </div>
                  )}
                </div>
              </ModernCard>
            </div>

            {/* ルールプレビュー（Phase A・B保護） */}
            <div style={{ padding: `0 ${DESIGN_TOKENS.spacing[6]} ${DESIGN_TOKENS.spacing[6]}` }}>
              <RulePreview
                currentRule={{
                  rule,
                  conditions,
                  actions,
                  operator
                }}
                project={project}
                projectFlags={projectFlags}
                mode="single"
                showTitle={true}
                compact={false}
              />
            </div>
          </div>

          {/* フッター（Phase A・B保護） */}
          <div 
            style={{
              borderTop: `1px solid ${DESIGN_TOKENS.colors.neutral[200]}`,
              backgroundColor: DESIGN_TOKENS.colors.neutral[50],
              padding: DESIGN_TOKENS.spacing[6],
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ 
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              color: DESIGN_TOKENS.colors.neutral[600],
              display: 'flex',
              alignItems: 'center',
              gap: DESIGN_TOKENS.spacing[6]
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[2] }}>
                <span style={{ 
                  width: '12px', 
                  height: '12px', 
                  backgroundColor: DESIGN_TOKENS.colors.purple[500], 
                  borderRadius: DESIGN_TOKENS.borderRadius.full 
                }}></span>
                <span>条件 {conditions.length}個</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[2] }}>
                <span style={{ 
                  width: '12px', 
                  height: '12px', 
                  backgroundColor: DESIGN_TOKENS.colors.success[500], 
                  borderRadius: DESIGN_TOKENS.borderRadius.full 
                }}></span>
                <span>アクション {actions.length}個</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[2] }}>
                <span style={{ 
                  width: '12px', 
                  height: '12px', 
                  backgroundColor: DESIGN_TOKENS.colors.warning[500], 
                  borderRadius: DESIGN_TOKENS.borderRadius.full 
                }}></span>
                <span>フラグ {projectFlags.length}個</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[4] }}>
              <ModernButton
                variant="secondary"
                size="lg"
                onClick={onClose}
              >
                キャンセル
              </ModernButton>
              <ModernButton
                variant="primary"
                size="lg"
                onClick={handleSave}
                disabled={conditions.length === 0 || actions.length === 0}
                style={{
                  backgroundColor: DESIGN_TOKENS.colors.purple[600],
                  borderColor: DESIGN_TOKENS.colors.purple[600]
                }}
              >
                <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.lg }}>💾</span>
                保存
              </ModernButton>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};