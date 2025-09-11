// src/components/editor/script/AdvancedRuleModal.tsx
// Step 2-B-2完全実装版: TypeScriptエラー完全修正・DESIGN_TOKENS準拠

import React, { useState, useEffect } from 'react';
import { GameRule, TriggerCondition, GameAction, GameFlag } from '../../../types/editor/GameScript';
import { GameProject } from '../../../types/editor/GameProject';
import { DESIGN_TOKENS } from '../../../constants/DesignSystem';
import { ModernCard } from '../../ui/ModernCard';
import { ModernButton } from '../../ui/ModernButton';

interface AdvancedRuleModalProps {
  rule: GameRule;
  project: GameProject;
  onSave: (rule: GameRule) => void;
  onClose: () => void;
}

// 条件ライブラリ
const CONDITION_LIBRARY = [
  { type: 'touch', label: 'タッチ', icon: '👆', params: ['touchType', 'holdDuration'] },
  { type: 'time', label: '時間', icon: '⏰', params: ['timeType', 'seconds', 'range'] },
  { type: 'position', label: '位置', icon: '📍', params: ['area', 'region'] },
  { type: 'collision', label: '衝突', icon: '💥', params: ['target', 'collisionType'] },
  { type: 'animation', label: 'アニメ', icon: '🎬', params: ['frame', 'animationType'] },
  { type: 'flag', label: 'フラグ', icon: '🚩', params: ['targetFlag', 'flagState'] }
];

// アクションライブラリ
const ACTION_LIBRARY = [
  { type: 'success', label: 'ゲームクリア', icon: '🎉', params: [] },
  { type: 'failure', label: 'ゲームオーバー', icon: '💀', params: [] },
  { type: 'playSound', label: '音再生', icon: '🔊', params: ['soundId', 'volume'] },
  { type: 'move', label: '移動', icon: '🏃', params: ['moveType', 'targetPosition', 'speed'] },
  { type: 'effect', label: 'エフェクト', icon: '✨', params: ['effectType', 'duration', 'intensity'] },
  { type: 'show', label: '表示', icon: '👁️', params: ['fadeIn', 'duration'] },
  { type: 'hide', label: '非表示', icon: '🫥', params: ['fadeOut', 'duration'] },
  { type: 'setFlag', label: 'フラグ設定', icon: '🚩', params: ['targetFlag', 'value'] },
  { type: 'switchAnimation', label: 'アニメ変更', icon: '🔄', params: ['animationIndex'] }
];

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
  
  // フラグ管理状態
  const [projectFlags, setProjectFlags] = useState<GameFlag[]>(project.script?.flags || []);
  const [newFlagName, setNewFlagName] = useState('');
  
  // パラメータ編集状態
  const [editingConditionIndex, setEditingConditionIndex] = useState<number | null>(null);
  const [editingActionIndex, setEditingActionIndex] = useState<number | null>(null);

  // 通知システム（RuleListパターン）
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // 通知表示ヘルパー
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // プロジェクトフラグ更新
  const updateProjectFlags = (flags: GameFlag[]) => {
    setProjectFlags(flags);
  };

  // フラグ追加
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

  // フラグ削除
  const removeFlag = (flagId: string) => {
    const flag = projectFlags.find(f => f.id === flagId);
    if (confirm(`フラグ「${flag?.name}」を削除しますか？`)) {
      updateProjectFlags(projectFlags.filter(flag => flag.id !== flagId));
      showNotification('success', 'フラグを削除しました');
    }
  };

  // フラグ初期値変更
  const toggleFlagInitialValue = (flagId: string) => {
    updateProjectFlags(projectFlags.map(flag => 
      flag.id === flagId ? { ...flag, initialValue: !flag.initialValue } : flag
    ));
  };

  // 条件追加
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

  // 条件削除
  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
    showNotification('success', '条件を削除しました');
  };

  // 条件更新
  const updateCondition = (index: number, updates: Partial<TriggerCondition>) => {
    setConditions(conditions.map((condition, i) => 
      i === index ? ({ ...condition, ...updates } as TriggerCondition) : condition
    ));
  };

  // アクション追加
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

  // アクション削除
  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
    showNotification('success', 'アクションを削除しました');
  };

  // アクション更新
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
          return { ...action, ...(updates as typeof action) };
        case 'switchAnimation':
          return { ...action, ...(updates as typeof action) };
        default:
          return action;
      }
    }));
  };

  // 保存処理
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

  // 条件表示ヘルパー
  const getConditionDisplay = (condition: TriggerCondition) => {
    const conditionInfo = CONDITION_LIBRARY.find(c => c.type === condition.type);
    let details = '';
    
    switch (condition.type) {
      case 'touch':
        details = condition.touchType === 'hold' ? `${condition.holdDuration || 1}秒長押し` : condition.touchType;
        break;
      case 'time':
        details = condition.timeType === 'exact' ? `${condition.seconds}秒後` : '時間範囲';
        break;
      case 'position':
        details = condition.area === 'inside' ? 'エリア内' : 'エリア外';
        break;
      case 'collision':
        details = `${condition.target}と${condition.collisionType}`;
        break;
      case 'animation':
        details = condition.condition === 'end' ? '終了時' : `フレーム${condition.frameNumber}`;
        break;
      case 'flag':
        const flag = projectFlags.find(f => f.id === condition.flagId);
        details = `${flag?.name || '???'} ${condition.condition}`;
        break;
    }
    
    return { icon: conditionInfo?.icon || '❓', label: conditionInfo?.label || condition.type, details };
  };

  // アクション表示ヘルパー
  const getActionDisplay = (action: GameAction) => {
    const actionInfo = ACTION_LIBRARY.find(a => a.type === action.type);
    let details = '';
    
    switch (action.type) {
      case 'playSound':
        const sound = project.assets.audio?.se?.find(s => s.id === action.soundId);
        details = sound?.name || '音声選択';
        break;
      case 'move':
        details = `${action.movement.type}移動`;
        break;
      case 'effect':
        details = action.effect.type;
        break;
      case 'setFlag':
        const flag = projectFlags.find(f => f.id === action.flagId);
        details = `${flag?.name || '???'} ${action.value ? 'ON' : 'OFF'}`;
        break;
      case 'switchAnimation':
        details = `アニメ${action.animationIndex}`;
        break;
    }
    
    return { icon: actionInfo?.icon || '❓', label: actionInfo?.label || action.type, details };
  };

  return (
    <>
      {/* 通知表示（RuleListパターン） */}
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
          
          {/* ヘッダー - ModernCard + purple系統一 */}
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
                  高度なルール設定
                </h3>
                <p 
                  style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                    color: DESIGN_TOKENS.colors.purple[100],
                    fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                    margin: 0
                  }}
                >
                  複数条件・複数アクション・フラグ管理・包括的ゲームロジック設定
                </p>
              </div>
            </div>
          </ModernCard>

          {/* メインコンテンツ */}
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                gap: DESIGN_TOKENS.spacing[8],
                padding: DESIGN_TOKENS.spacing[8],
                maxWidth: '1400px',
                margin: '0 auto'
              }}
            >
              
              {/* 左列: ルール基本設定・条件 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN_TOKENS.spacing[6] }}>
                
                {/* ルール名 */}
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
                      placeholder="例: 中央タッチで移動"
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

                {/* 条件設定 */}
                <ModernCard 
                  variant="outlined" 
                  size="lg"
                  style={{ 
                    backgroundColor: DESIGN_TOKENS.colors.purple[50],
                    border: `2px solid ${DESIGN_TOKENS.colors.purple[200]}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: DESIGN_TOKENS.spacing[6] }}>
                    <h4 style={{
                      fontSize: DESIGN_TOKENS.typography.fontSize.xl,
                      fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                      color: DESIGN_TOKENS.colors.purple[800],
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: DESIGN_TOKENS.spacing[2]
                    }}>
                      <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize['2xl'] }}>🔥</span>
                      発動条件
                    </h4>
                    <select
                      value={operator}
                      onChange={(e) => setOperator(e.target.value as 'AND' | 'OR')}
                      style={{
                        fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                        border: `1px solid ${DESIGN_TOKENS.colors.purple[300]}`,
                        borderRadius: DESIGN_TOKENS.borderRadius.xl,
                        padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[4]}`,
                        backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                        boxShadow: DESIGN_TOKENS.shadows.sm,
                        outline: 'none',
                        fontFamily: DESIGN_TOKENS.typography.fontFamily.sans.join(', ')
                      }}
                    >
                      <option value="AND">すべて (AND)</option>
                      <option value="OR">いずれか (OR)</option>
                    </select>
                  </div>

                  {/* 既存条件一覧 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN_TOKENS.spacing[3], marginBottom: DESIGN_TOKENS.spacing[6] }}>
                    {conditions.map((condition, index) => {
                      const display = getConditionDisplay(condition);
                      return (
                        <ModernCard
                          key={index}
                          variant="elevated"
                          size="md"
                          style={{ 
                            backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                            border: `1px solid ${DESIGN_TOKENS.colors.purple[200]}`
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[3] }}>
                              <span style={{ 
                                fontSize: DESIGN_TOKENS.typography.fontSize['2xl'],
                                transition: `transform ${DESIGN_TOKENS.animation.duration.normal} ${DESIGN_TOKENS.animation.easing.inOut}`
                              }}>
                                {display.icon}
                              </span>
                              <div>
                                <div style={{ 
                                  fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                                  color: DESIGN_TOKENS.colors.neutral[800]
                                }}>
                                  {display.label}
                                </div>
                                <div style={{ 
                                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                                  color: DESIGN_TOKENS.colors.neutral[500],
                                  marginTop: DESIGN_TOKENS.spacing[1]
                                }}>
                                  {display.details}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[2] }}>
                              <ModernButton
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingConditionIndex(index)}
                                style={{
                                  borderColor: DESIGN_TOKENS.colors.purple[500],
                                  color: DESIGN_TOKENS.colors.purple[700]
                                }}
                              >
                                ✏️ 編集
                              </ModernButton>
                              <ModernButton
                                variant="outline"
                                size="sm"
                                onClick={() => removeCondition(index)}
                                style={{
                                  borderColor: DESIGN_TOKENS.colors.error[500],
                                  color: DESIGN_TOKENS.colors.error[600]
                                }}
                              >
                                🗑️ 削除
                              </ModernButton>
                            </div>
                          </div>
                          
                          {/* パラメータ編集エリア - 編集ボタンの真下に表示 */}
                          {editingConditionIndex === index && (
                            <div style={{ 
                              marginTop: DESIGN_TOKENS.spacing[4],
                              paddingTop: DESIGN_TOKENS.spacing[4],
                              borderTop: `1px solid ${DESIGN_TOKENS.colors.purple[200]}`
                            }}>
                              <ModernCard 
                                variant="outlined" 
                                size="sm"
                                style={{ 
                                  backgroundColor: DESIGN_TOKENS.colors.purple[50],
                                  border: `1px solid ${DESIGN_TOKENS.colors.purple[200]}`
                                }}
                              >
                                <h5 style={{
                                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                                  fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                                  color: DESIGN_TOKENS.colors.purple[800],
                                  margin: 0,
                                  marginBottom: DESIGN_TOKENS.spacing[3],
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: DESIGN_TOKENS.spacing[2]
                                }}>
                                  <span>⚙️</span>
                                  条件パラメータ設定
                                </h5>
                                
                                {/* 条件別パラメータ設定UI */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN_TOKENS.spacing[3] }}>
                                  {(() => {
                                    const condition = conditions[index];
                                    
                                    switch (condition.type) {
                                      case 'touch':
                                        return (
                                          <div>
                                            <label style={{
                                              display: 'block',
                                              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                                              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                                              color: DESIGN_TOKENS.colors.neutral[600],
                                              marginBottom: DESIGN_TOKENS.spacing[2]
                                            }}>
                                              タッチ種類
                                            </label>
                                            <select
                                              value={condition.touchType}
                                              onChange={(e) => updateCondition(index, { touchType: e.target.value as any })}
                                              style={{
                                                width: '100%',
                                                border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                                                borderRadius: DESIGN_TOKENS.borderRadius.lg,
                                                padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[3]}`,
                                                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                                                backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                                                boxShadow: DESIGN_TOKENS.shadows.sm,
                                                outline: 'none',
                                                fontFamily: DESIGN_TOKENS.typography.fontFamily.sans.join(', ')
                                              }}
                                            >
                                              <option value="down">👆 タップ</option>
                                              <option value="up">☝️ リリース</option>
                                              <option value="hold">✋ 長押し</option>
                                            </select>
                                          </div>
                                        );

                                      case 'time':
                                        return (
                                          <div>
                                            <label style={{
                                              display: 'block',
                                              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                                              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                                              color: DESIGN_TOKENS.colors.neutral[600],
                                              marginBottom: DESIGN_TOKENS.spacing[2]
                                            }}>
                                              秒数
                                            </label>
                                            <select
                                              value={condition.seconds || 3}
                                              onChange={(e) => updateCondition(index, { seconds: Number(e.target.value) })}
                                              style={{
                                                width: '100%',
                                                border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                                                borderRadius: DESIGN_TOKENS.borderRadius.lg,
                                                padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[3]}`,
                                                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                                                backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                                                boxShadow: DESIGN_TOKENS.shadows.sm,
                                                outline: 'none',
                                                fontFamily: DESIGN_TOKENS.typography.fontFamily.sans.join(', ')
                                              }}
                                            >
                                              <option value={1}>1秒後</option>
                                              <option value={2}>2秒後</option>
                                              <option value={3}>3秒後</option>
                                              <option value={5}>5秒後</option>
                                              <option value={10}>10秒後</option>
                                            </select>
                                          </div>
                                        );

                                      case 'flag':
                                        return (
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN_TOKENS.spacing[3] }}>
                                            {/* フラグ選択 */}
                                            <div>
                                              <label style={{
                                                display: 'block',
                                                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                                                fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                                                color: DESIGN_TOKENS.colors.neutral[600],
                                                marginBottom: DESIGN_TOKENS.spacing[2]
                                              }}>
                                                🚩 対象フラグ
                                              </label>
                                              <select
                                                value={condition.flagId || ''}
                                                onChange={(e) => updateCondition(index, { flagId: e.target.value })}
                                                style={{
                                                  width: '100%',
                                                  border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                                                  borderRadius: DESIGN_TOKENS.borderRadius.lg,
                                                  padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[3]}`,
                                                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                                                  backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                                                  boxShadow: DESIGN_TOKENS.shadows.sm,
                                                  outline: 'none',
                                                  fontFamily: DESIGN_TOKENS.typography.fontFamily.sans.join(', ')
                                                }}
                                              >
                                                <option value="">フラグを選択してください</option>
                                                {projectFlags.map(flag => (
                                                  <option key={flag.id} value={flag.id}>
                                                    🚩 {flag.name}
                                                  </option>
                                                ))}
                                              </select>
                                            </div>

                                            {/* フラグ条件4パターン */}
                                            <div>
                                              <label style={{
                                                display: 'block',
                                                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                                                fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                                                color: DESIGN_TOKENS.colors.neutral[600],
                                                marginBottom: DESIGN_TOKENS.spacing[2]
                                              }}>
                                                条件パターン
                                              </label>
                                              <select
                                                value={condition.condition || 'ON'}
                                                onChange={(e) => updateCondition(index, { condition: e.target.value as any })}
                                                style={{
                                                  width: '100%',
                                                  border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                                                  borderRadius: DESIGN_TOKENS.borderRadius.lg,
                                                  padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[3]}`,
                                                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                                                  backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                                                  boxShadow: DESIGN_TOKENS.shadows.sm,
                                                  outline: 'none',
                                                  fontFamily: DESIGN_TOKENS.typography.fontFamily.sans.join(', ')
                                                }}
                                              >
                                                <option value="ON">🟢 ONの時</option>
                                                <option value="OFF">🔴 OFFの時</option>
                                                <option value="ON_TO_OFF">🔄 ON→OFFに変化した瞬間</option>
                                                <option value="OFF_TO_ON">🔄 OFF→ONに変化した瞬間</option>
                                                <option value="CHANGED">🔄 値が変化した時（ON↔OFF）</option>
                                              </select>
                                            </div>

                                            {/* 状態遷移図表示 */}
                                            <div style={{
                                              padding: DESIGN_TOKENS.spacing[3],
                                              backgroundColor: DESIGN_TOKENS.colors.warning[50],
                                              borderRadius: DESIGN_TOKENS.borderRadius.lg,
                                              border: `1px solid ${DESIGN_TOKENS.colors.warning[100]}`
                                            }}>
                                              <div style={{
                                                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                                                fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                                                color: DESIGN_TOKENS.colors.warning[800],
                                                marginBottom: DESIGN_TOKENS.spacing[2]
                                              }}>
                                                📊 条件説明
                                              </div>
                                              <div style={{
                                                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                                                color: DESIGN_TOKENS.colors.warning[600],
                                                textAlign: 'center'
                                              }}>
                                                {(() => {
                                                  const selectedFlag = projectFlags.find(f => f.id === condition.flagId);
                                                  const flagName = selectedFlag?.name || 'フラグ';
                                                  
                                                  switch (condition.condition) {
                                                    case 'ON':
                                                      return `🟢 ${flagName}がONの間、常に条件成立`;
                                                    case 'OFF':
                                                      return `🔴 ${flagName}がOFFの間、常に条件成立`;
                                                    case 'ON_TO_OFF':
                                                      return `🔄 ${flagName}がON→OFFに変化した瞬間のみ条件成立`;
                                                    case 'OFF_TO_ON':
                                                      return `🔄 ${flagName}がOFF→ONに変化した瞬間のみ条件成立`;
                                                    case 'CHANGED':
                                                      return `🔄 ${flagName}の値が変化した瞬間（ON↔OFF）に条件成立`;
                                                    default:
                                                      return '条件パターンを選択してください';
                                                  }
                                                })()}
                                              </div>
                                            </div>
                                          </div>
                                        );

                                      default:
                                        return (
                                          <div style={{ 
                                            textAlign: 'center',
                                            color: DESIGN_TOKENS.colors.neutral[500],
                                            padding: DESIGN_TOKENS.spacing[4],
                                            fontSize: DESIGN_TOKENS.typography.fontSize.sm
                                          }}>
                                            この条件タイプの設定項目は準備中です
                                          </div>
                                        );
                                    }
                                  })()}
                                </div>
                                
                                <div style={{ 
                                  display: 'flex', 
                                  justifyContent: 'flex-end', 
                                  gap: DESIGN_TOKENS.spacing[2], 
                                  marginTop: DESIGN_TOKENS.spacing[4],
                                  paddingTop: DESIGN_TOKENS.spacing[3],
                                  borderTop: `1px solid ${DESIGN_TOKENS.colors.neutral[200]}`
                                }}>
                                  <ModernButton
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setEditingConditionIndex(null)}
                                  >
                                    キャンセル
                                  </ModernButton>
                                  <ModernButton
                                    variant="primary"
                                    size="sm"
                                    onClick={() => setEditingConditionIndex(null)}
                                    style={{
                                      backgroundColor: DESIGN_TOKENS.colors.purple[600],
                                      borderColor: DESIGN_TOKENS.colors.purple[600]
                                    }}
                                  >
                                    <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.sm }}>✅</span>
                                    適用
                                  </ModernButton>
                                </div>
                              </ModernCard>
                            </div>
                          )}
                        </ModernCard>
                      );
                    })}
                  </div>

                  {/* 条件追加ボタン */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: DESIGN_TOKENS.spacing[3]
                  }}>
                    {CONDITION_LIBRARY.map((conditionType) => (
                      <ModernButton
                        key={conditionType.type}
                        variant="outline"
                        size="md"
                        onClick={() => addCondition(conditionType.type)}
                        style={{
                          borderColor: DESIGN_TOKENS.colors.purple[300],
                          color: DESIGN_TOKENS.colors.purple[700],
                          display: 'flex',
                          alignItems: 'center',
                          gap: DESIGN_TOKENS.spacing[2],
                          justifyContent: 'flex-start',
                          padding: DESIGN_TOKENS.spacing[3],
                          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium
                        }}
                      >
                        <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xl }}>{conditionType.icon}</span>
                        {conditionType.label}
                      </ModernButton>
                    ))}
                  </div>
                </ModernCard>
              </div>

              {/* 右列: アクション設定・ルールプレビュー・フラグ管理 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN_TOKENS.spacing[6] }}>
                
                {/* アクション設定 */}
                <ModernCard 
                  variant="outlined" 
                  size="lg"
                  style={{ 
                    backgroundColor: DESIGN_TOKENS.colors.success[50],
                    border: `2px solid ${DESIGN_TOKENS.colors.success[200]}`
                  }}
                >
                  <h4 style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.xl,
                    fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                    color: DESIGN_TOKENS.colors.success[800],
                    margin: 0,
                    marginBottom: DESIGN_TOKENS.spacing[6],
                    display: 'flex',
                    alignItems: 'center',
                    gap: DESIGN_TOKENS.spacing[2]
                  }}>
                    <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize['2xl'] }}>⚡</span>
                    実行アクション
                  </h4>

                  {/* アクション追加ボタン */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: DESIGN_TOKENS.spacing[3],
                    marginBottom: DESIGN_TOKENS.spacing[6]
                  }}>
                    {ACTION_LIBRARY.map((actionType) => (
                      <ModernButton
                        key={actionType.type}
                        variant="outline"
                        size="md"
                        onClick={() => addAction(actionType.type)}
                        style={{
                          borderColor: DESIGN_TOKENS.colors.success[200],
                          color: DESIGN_TOKENS.colors.success[600],
                          display: 'flex',
                          alignItems: 'center',
                          gap: DESIGN_TOKENS.spacing[2],
                          justifyContent: 'flex-start',
                          padding: DESIGN_TOKENS.spacing[3],
                          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium
                        }}
                      >
                        <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xl }}>{actionType.icon}</span>
                        {actionType.label}
                      </ModernButton>
                    ))}
                  </div>

                  {/* 既存アクション一覧 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN_TOKENS.spacing[3] }}>
                    {actions.map((action, index) => {
                      const display = getActionDisplay(action);
                      return (
                        <ModernCard
                          key={index}
                          variant="elevated"
                          size="md"
                          style={{ 
                            backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                            border: `1px solid ${DESIGN_TOKENS.colors.success[200]}`
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[3] }}>
                              <span style={{ 
                                fontSize: DESIGN_TOKENS.typography.fontSize['2xl'],
                                transition: `transform ${DESIGN_TOKENS.animation.duration.normal} ${DESIGN_TOKENS.animation.easing.inOut}`
                              }}>
                                {display.icon}
                              </span>
                              <div>
                                <div style={{ 
                                  fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                                  color: DESIGN_TOKENS.colors.neutral[800]
                                }}>
                                  {display.label}
                                </div>
                                <div style={{ 
                                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                                  color: DESIGN_TOKENS.colors.neutral[500],
                                  marginTop: DESIGN_TOKENS.spacing[1]
                                }}>
                                  {display.details}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[2] }}>
                              <ModernButton
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingActionIndex(index)}
                                style={{
                                  borderColor: DESIGN_TOKENS.colors.success[500],
                                  color: DESIGN_TOKENS.colors.success[600]
                                }}
                              >
                                ✏️ 編集
                              </ModernButton>
                              <ModernButton
                                variant="outline"
                                size="sm"
                                onClick={() => removeAction(index)}
                                style={{
                                  borderColor: DESIGN_TOKENS.colors.error[500],
                                  color: DESIGN_TOKENS.colors.error[600]
                                }}
                              >
                                🗑️ 削除
                              </ModernButton>
                            </div>
                          </div>
                          
                          {/* アクションパラメータ編集エリア - 編集ボタンの真下に表示 */}
                          {editingActionIndex === index && (
                            <div style={{ 
                              marginTop: DESIGN_TOKENS.spacing[4],
                              paddingTop: DESIGN_TOKENS.spacing[4],
                              borderTop: `1px solid ${DESIGN_TOKENS.colors.success[200]}`
                            }}>
                              <ModernCard 
                                variant="outlined" 
                                size="sm"
                                style={{ 
                                  backgroundColor: DESIGN_TOKENS.colors.success[50],
                                  border: `1px solid ${DESIGN_TOKENS.colors.success[200]}`
                                }}
                              >
                                <h5 style={{
                                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                                  fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                                  color: DESIGN_TOKENS.colors.success[800],
                                  margin: 0,
                                  marginBottom: DESIGN_TOKENS.spacing[3],
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: DESIGN_TOKENS.spacing[2]
                                }}>
                                  <span>⚙️</span>
                                  アクションパラメータ設定
                                </h5>
                                
                                {/* アクション別パラメータ設定UI */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN_TOKENS.spacing[3] }}>
                                  {(() => {
                                    const currentAction = actions[index];
                                    
                                    switch (currentAction.type) {
                                      case 'playSound':
                                        return (
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN_TOKENS.spacing[4] }}>
                                            {/* SE選択 */}
                                            <div>
                                              <label style={{
                                                display: 'block',
                                                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                                                fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                                                color: DESIGN_TOKENS.colors.neutral[600],
                                                marginBottom: DESIGN_TOKENS.spacing[2]
                                              }}>
                                                🔊 効果音選択
                                              </label>
                                              <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[2] }}>
                                                <select
                                                  value={currentAction.soundId || ''}
                                                  onChange={(e) => updateAction(index, { soundId: e.target.value })}
                                                  style={{
                                                    flex: 1,
                                                    border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                                                    borderRadius: DESIGN_TOKENS.borderRadius.lg,
                                                    padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[3]}`,
                                                    fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                                                    backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                                                    boxShadow: DESIGN_TOKENS.shadows.sm,
                                                    outline: 'none',
                                                    fontFamily: DESIGN_TOKENS.typography.fontFamily.sans.join(', ')
                                                  }}
                                                >
                                                  <option value="">効果音を選択してください</option>
                                                  {project.assets.audio?.se?.map(sound => (
                                                    <option key={sound.id} value={sound.id}>
                                                      🔊 {sound.name}
                                                    </option>
                                                  )) || (
                                                    <option disabled>効果音がアップロードされていません</option>
                                                  )}
                                                </select>
                                                {/* プレビューボタン */}
                                                <ModernButton
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => {
                                                    if (currentAction.soundId) {
                                                      showNotification('info', '🔊 プレビュー再生');
                                                      // 実際の音声再生は本実装時に追加
                                                    } else {
                                                      showNotification('error', '効果音を選択してください');
                                                    }
                                                  }}
                                                  disabled={!currentAction.soundId}
                                                  style={{
                                                    borderColor: DESIGN_TOKENS.colors.primary[400],
                                                    color: DESIGN_TOKENS.colors.primary[600]
                                                  }}
                                                >
                                                  🔊 試聴
                                                </ModernButton>
                                              </div>
                                            </div>

                                            {/* 音量設定 */}
                                            <div>
                                              <label style={{
                                                display: 'block',
                                                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                                                fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                                                color: DESIGN_TOKENS.colors.neutral[600],
                                                marginBottom: DESIGN_TOKENS.spacing[2]
                                              }}>
                                                🎚️ 音量: {Math.round((currentAction.volume || 0.8) * 100)}%
                                              </label>
                                              <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.1"
                                                value={currentAction.volume || 0.8}
                                                onChange={(e) => updateAction(index, { volume: Number(e.target.value) })}
                                                style={{
                                                  width: '100%',
                                                  height: '6px',
                                                  borderRadius: DESIGN_TOKENS.borderRadius.full,
                                                  outline: 'none',
                                                  background: `linear-gradient(to right, 
                                                    ${DESIGN_TOKENS.colors.primary[500]} 0%, 
                                                    ${DESIGN_TOKENS.colors.primary[500]} ${(currentAction.volume || 0.8) * 100}%, 
                                                    ${DESIGN_TOKENS.colors.neutral[200]} ${(currentAction.volume || 0.8) * 100}%, 
                                                    ${DESIGN_TOKENS.colors.neutral[200]} 100%)`
                                                }}
                                              />
                                            </div>
                                          </div>
                                        );

                                      case 'success':
                                      case 'failure':
                                        return (
                                          <div>
                                            <label style={{
                                              display: 'block',
                                              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                                              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                                              color: DESIGN_TOKENS.colors.neutral[600],
                                              marginBottom: DESIGN_TOKENS.spacing[2]
                                            }}>
                                              {currentAction.type === 'success' ? '🎉 ゲーム終了' : '💀 ゲーム終了'}
                                            </label>
                                            <div style={{
                                              padding: DESIGN_TOKENS.spacing[3],
                                              backgroundColor: currentAction.type === 'success' 
                                                ? DESIGN_TOKENS.colors.success[50] 
                                                : DESIGN_TOKENS.colors.error[50],
                                              borderRadius: DESIGN_TOKENS.borderRadius.lg,
                                              border: `1px solid ${currentAction.type === 'success' 
                                                ? DESIGN_TOKENS.colors.success[200] 
                                                : DESIGN_TOKENS.colors.error[200]}`,
                                              textAlign: 'center',
                                              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                                              color: currentAction.type === 'success' 
                                                ? DESIGN_TOKENS.colors.success[600] 
                                                : DESIGN_TOKENS.colors.error[600]
                                            }}>
                                              {currentAction.type === 'success' 
                                                ? '✅ ゲームクリア - プレイヤーの勝利'
                                                : '❌ ゲームオーバー - プレイヤーの敗北'
                                              }
                                            </div>
                                          </div>
                                        );

                                      case 'setFlag':
                                        return (
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN_TOKENS.spacing[3] }}>
                                            {/* フラグ選択 */}
                                            <div>
                                              <label style={{
                                                display: 'block',
                                                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                                                fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                                                color: DESIGN_TOKENS.colors.neutral[600],
                                                marginBottom: DESIGN_TOKENS.spacing[2]
                                              }}>
                                                🚩 対象フラグ
                                              </label>
                                              <select
                                                value={currentAction.flagId || ''}
                                                onChange={(e) => updateAction(index, { flagId: e.target.value })}
                                                style={{
                                                  width: '100%',
                                                  border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                                                  borderRadius: DESIGN_TOKENS.borderRadius.lg,
                                                  padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[3]}`,
                                                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                                                  backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                                                  boxShadow: DESIGN_TOKENS.shadows.sm,
                                                  outline: 'none',
                                                  fontFamily: DESIGN_TOKENS.typography.fontFamily.sans.join(', ')
                                                }}
                                              >
                                                <option value="">フラグを選択してください</option>
                                                {projectFlags.map(flag => (
                                                  <option key={flag.id} value={flag.id}>
                                                    🚩 {flag.name}
                                                  </option>
                                                ))}
                                              </select>
                                            </div>

                                            {/* ON/OFF設定 */}
                                            <div>
                                              <label style={{
                                                display: 'block',
                                                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                                                fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                                                color: DESIGN_TOKENS.colors.neutral[600],
                                                marginBottom: DESIGN_TOKENS.spacing[2]
                                              }}>
                                                設定値
                                              </label>
                                              <select
                                                value={currentAction.value ? 'true' : 'false'}
                                                onChange={(e) => updateAction(index, { value: e.target.value === 'true' })}
                                                style={{
                                                  width: '100%',
                                                  border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                                                  borderRadius: DESIGN_TOKENS.borderRadius.lg,
                                                  padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[3]}`,
                                                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                                                  backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                                                  boxShadow: DESIGN_TOKENS.shadows.sm,
                                                  outline: 'none',
                                                  fontFamily: DESIGN_TOKENS.typography.fontFamily.sans.join(', ')
                                                }}
                                              >
                                                <option value="true">🟢 ONにする</option>
                                                <option value="false">🔴 OFFにする</option>
                                              </select>
                                            </div>
                                          </div>
                                        );

                                      case 'show':
                                      case 'hide':
                                        return (
                                          <div>
                                            <label style={{
                                              display: 'block',
                                              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                                              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                                              color: DESIGN_TOKENS.colors.neutral[600],
                                              marginBottom: DESIGN_TOKENS.spacing[2]
                                            }}>
                                              {currentAction.type === 'show' ? '👁️ 表示制御' : '🫥 非表示制御'}
                                            </label>
                                            <div style={{
                                              padding: DESIGN_TOKENS.spacing[3],
                                              backgroundColor: currentAction.type === 'show' 
                                                ? DESIGN_TOKENS.colors.primary[50] 
                                                : DESIGN_TOKENS.colors.neutral[100],
                                              borderRadius: DESIGN_TOKENS.borderRadius.lg,
                                              border: `1px solid ${currentAction.type === 'show' 
                                                ? DESIGN_TOKENS.colors.primary[200] 
                                                : DESIGN_TOKENS.colors.neutral[300]}`,
                                              textAlign: 'center',
                                              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                                              color: currentAction.type === 'show' 
                                                ? DESIGN_TOKENS.colors.primary[600] 
                                                : DESIGN_TOKENS.colors.neutral[600]
                                            }}>
                                              {currentAction.type === 'show' 
                                                ? '✨ オブジェクトを表示します'
                                                : '🫥 オブジェクトを非表示にします'
                                              }
                                              <br />
                                              <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs }}>
                                                対象: {rule.targetObjectId}
                                              </span>
                                            </div>
                                          </div>
                                        );

                                      default:
                                        return (
                                          <div style={{ 
                                            textAlign: 'center',
                                            color: DESIGN_TOKENS.colors.neutral[500],
                                            padding: DESIGN_TOKENS.spacing[4],
                                            fontSize: DESIGN_TOKENS.typography.fontSize.sm
                                          }}>
                                            このアクションタイプの設定項目は準備中です
                                          </div>
                                        );
                                    }
                                  })()}
                                </div>
                                
                                <div style={{ 
                                  display: 'flex', 
                                  justifyContent: 'flex-end', 
                                  gap: DESIGN_TOKENS.spacing[2], 
                                  marginTop: DESIGN_TOKENS.spacing[4],
                                  paddingTop: DESIGN_TOKENS.spacing[3],
                                  borderTop: `1px solid ${DESIGN_TOKENS.colors.neutral[200]}`
                                }}>
                                  <ModernButton
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setEditingActionIndex(null)}
                                  >
                                    キャンセル
                                  </ModernButton>
                                  <ModernButton
                                    variant="primary"
                                    size="sm"
                                    onClick={() => setEditingActionIndex(null)}
                                    style={{
                                      backgroundColor: DESIGN_TOKENS.colors.success[600],
                                      borderColor: DESIGN_TOKENS.colors.success[600]
                                    }}
                                  >
                                    <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.sm }}>✅</span>
                                    適用
                                  </ModernButton>
                                </div>
                              </ModernCard>
                            </div>
                          )}
                        </ModernCard>
                      );
                    })}
                  </div>
                </ModernCard>

                {/* ルールプレビューシステム */}
                <ModernCard 
                  variant="outlined" 
                  size="lg"
                  style={{ 
                    backgroundColor: DESIGN_TOKENS.colors.primary[50],
                    border: `2px solid ${DESIGN_TOKENS.colors.primary[200]}`
                  }}
                >
                  <h4 style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.xl,
                    fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                    color: DESIGN_TOKENS.colors.primary[800],
                    margin: 0,
                    marginBottom: DESIGN_TOKENS.spacing[6],
                    display: 'flex',
                    alignItems: 'center',
                    gap: DESIGN_TOKENS.spacing[2]
                  }}>
                    <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize['2xl'] }}>📋</span>
                    ルールプレビュー
                  </h4>

                  {/* 条件プレビュー */}
                  <div style={{ marginBottom: DESIGN_TOKENS.spacing[6] }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: DESIGN_TOKENS.spacing[3],
                      marginBottom: DESIGN_TOKENS.spacing[4]
                    }}>
                      <span style={{ 
                        fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                        color: DESIGN_TOKENS.colors.purple[600]
                      }}>
                        🔥
                      </span>
                      <span style={{ 
                        fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                        fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                        color: DESIGN_TOKENS.colors.purple[800]
                      }}>
                        発動条件 ({conditions.length}個)
                      </span>
                      {conditions.length > 1 && (
                        <div style={{
                          padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[3]}`,
                          backgroundColor: operator === 'AND' 
                            ? DESIGN_TOKENS.colors.purple[100] 
                            : DESIGN_TOKENS.colors.warning[50],
                          color: operator === 'AND' 
                            ? DESIGN_TOKENS.colors.purple[700] 
                            : DESIGN_TOKENS.colors.warning[600],
                          borderRadius: DESIGN_TOKENS.borderRadius.lg,
                          fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                          fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                          border: `1px solid ${operator === 'AND' 
                            ? DESIGN_TOKENS.colors.purple[200] 
                            : DESIGN_TOKENS.colors.warning[100]}`
                        }}>
                          {operator === 'AND' ? '全て必要' : 'どれか一つ'}
                        </div>
                      )}
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: DESIGN_TOKENS.spacing[2],
                      marginLeft: DESIGN_TOKENS.spacing[6]
                    }}>
                      {conditions.length === 0 ? (
                        <div style={{ 
                          padding: DESIGN_TOKENS.spacing[4],
                          backgroundColor: DESIGN_TOKENS.colors.neutral[100],
                          borderRadius: DESIGN_TOKENS.borderRadius.xl,
                          border: `2px dashed ${DESIGN_TOKENS.colors.neutral[300]}`,
                          textAlign: 'center',
                          color: DESIGN_TOKENS.colors.neutral[500],
                          fontSize: DESIGN_TOKENS.typography.fontSize.sm
                        }}>
                          条件を追加してください
                        </div>
                      ) : (
                        conditions.map((condition, index) => {
                          const display = getConditionDisplay(condition);
                          return (
                            <div 
                              key={index}
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: DESIGN_TOKENS.spacing[3],
                                padding: DESIGN_TOKENS.spacing[3],
                                backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                                borderRadius: DESIGN_TOKENS.borderRadius.lg,
                                border: `1px solid ${DESIGN_TOKENS.colors.purple[200]}`,
                                boxShadow: DESIGN_TOKENS.shadows.sm
                              }}
                            >
                              <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.lg }}>
                                {display.icon}
                              </span>
                              <div style={{ flex: 1 }}>
                                <div style={{ 
                                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                                  fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                                  color: DESIGN_TOKENS.colors.neutral[800]
                                }}>
                                  {display.label}
                                </div>
                                <div style={{ 
                                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                                  color: DESIGN_TOKENS.colors.neutral[500]
                                }}>
                                  {display.details}
                                </div>
                              </div>
                              {index < conditions.length - 1 && conditions.length > 1 && (
                                <div style={{
                                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                                  fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                                  color: operator === 'AND' 
                                    ? DESIGN_TOKENS.colors.purple[600] 
                                    : DESIGN_TOKENS.colors.warning[600],
                                  backgroundColor: operator === 'AND' 
                                    ? DESIGN_TOKENS.colors.purple[50] 
                                    : DESIGN_TOKENS.colors.warning[50],
                                  padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[2]}`,
                                  borderRadius: DESIGN_TOKENS.borderRadius.md,
                                  border: `1px solid ${operator === 'AND' 
                                    ? DESIGN_TOKENS.colors.purple[200] 
                                    : DESIGN_TOKENS.colors.warning[100]}`
                                }}>
                                  {operator}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* フロー矢印 */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    marginBottom: DESIGN_TOKENS.spacing[6]
                  }}>
                    <div style={{
                      fontSize: DESIGN_TOKENS.typography.fontSize['3xl'],
                      color: DESIGN_TOKENS.colors.primary[500]
                    }}>
                      ⬇️
                    </div>
                  </div>

                  {/* アクションプレビュー */}
                  <div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: DESIGN_TOKENS.spacing[3],
                      marginBottom: DESIGN_TOKENS.spacing[4]
                    }}>
                      <span style={{ 
                        fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                        color: DESIGN_TOKENS.colors.success[600]
                      }}>
                        ⚡
                      </span>
                      <span style={{ 
                        fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                        fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                        color: DESIGN_TOKENS.colors.success[800]
                      }}>
                        実行アクション ({actions.length}個)
                      </span>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: DESIGN_TOKENS.spacing[2],
                      marginLeft: DESIGN_TOKENS.spacing[6]
                    }}>
                      {actions.length === 0 ? (
                        <div style={{ 
                          padding: DESIGN_TOKENS.spacing[4],
                          backgroundColor: DESIGN_TOKENS.colors.neutral[100],
                          borderRadius: DESIGN_TOKENS.borderRadius.xl,
                          border: `2px dashed ${DESIGN_TOKENS.colors.neutral[300]}`,
                          textAlign: 'center',
                          color: DESIGN_TOKENS.colors.neutral[500],
                          fontSize: DESIGN_TOKENS.typography.fontSize.sm
                        }}>
                          アクションを追加してください
                        </div>
                      ) : (
                        actions.map((action, index) => {
                          const display = getActionDisplay(action);
                          return (
                            <div 
                              key={index}
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: DESIGN_TOKENS.spacing[3],
                                padding: DESIGN_TOKENS.spacing[3],
                                backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                                borderRadius: DESIGN_TOKENS.borderRadius.lg,
                                border: `1px solid ${DESIGN_TOKENS.colors.success[200]}`,
                                boxShadow: DESIGN_TOKENS.shadows.sm
                              }}
                            >
                              <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.lg }}>
                                {display.icon}
                              </span>
                              <div style={{ flex: 1 }}>
                                <div style={{ 
                                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                                  fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                                  color: DESIGN_TOKENS.colors.neutral[800]
                                }}>
                                  {display.label}
                                </div>
                                <div style={{ 
                                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                                  color: DESIGN_TOKENS.colors.neutral[500]
                                }}>
                                  {display.details}
                                </div>
                              </div>
                              {index < actions.length - 1 && (
                                <div style={{
                                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                                  color: DESIGN_TOKENS.colors.neutral[400]
                                }}>
                                  {index + 1}→{index + 2}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* 実行フロー説明 */}
                  {conditions.length > 0 && actions.length > 0 && (
                    <div style={{
                      marginTop: DESIGN_TOKENS.spacing[6],
                      padding: DESIGN_TOKENS.spacing[4],
                      backgroundColor: DESIGN_TOKENS.colors.primary[100],
                      borderRadius: DESIGN_TOKENS.borderRadius.xl,
                      border: `1px solid ${DESIGN_TOKENS.colors.primary[200]}`
                    }}>
                      <div style={{
                        fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                        color: DESIGN_TOKENS.colors.primary[800],
                        fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                        textAlign: 'center'
                      }}>
                        {conditions.length > 1 && operator === 'AND' 
                          ? '🔥 すべての条件が満たされた時に → ⚡ アクションを順番に実行'
                          : conditions.length > 1 && operator === 'OR'
                          ? '🔥 いずれかの条件が満たされた時に → ⚡ アクションを順番に実行'
                          : '🔥 条件が満たされた時に → ⚡ アクションを順番に実行'
                        }
                      </div>
                    </div>
                  )}
                </ModernCard>

                {/* フラグ管理 */}
                <ModernCard 
                  variant="outlined" 
                  size="lg"
                  style={{ 
                    backgroundColor: DESIGN_TOKENS.colors.warning[50],
                    border: `2px solid ${DESIGN_TOKENS.colors.warning[100]}`
                  }}
                >
                  <h4 style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.xl,
                    fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                    color: DESIGN_TOKENS.colors.warning[800],
                    margin: 0,
                    marginBottom: DESIGN_TOKENS.spacing[6],
                    display: 'flex',
                    alignItems: 'center',
                    gap: DESIGN_TOKENS.spacing[2]
                  }}>
                    <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize['2xl'] }}>🚩</span>
                    フラグ管理
                  </h4>

                  {/* 新規フラグ追加 */}
                  <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[3], marginBottom: DESIGN_TOKENS.spacing[6] }}>
                    <input
                      type="text"
                      value={newFlagName}
                      onChange={(e) => setNewFlagName(e.target.value)}
                      placeholder="フラグ名を入力"
                      style={{
                        flex: 1,
                        padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[4]}`,
                        fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                        border: `1px solid ${DESIGN_TOKENS.colors.warning[100]}`,
                        borderRadius: DESIGN_TOKENS.borderRadius.xl,
                        backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                        boxShadow: DESIGN_TOKENS.shadows.sm,
                        outline: 'none',
                        fontFamily: DESIGN_TOKENS.typography.fontFamily.sans.join(', ')
                      }}
                    />
                    <ModernButton
                      variant="primary"
                      size="md"
                      onClick={addFlag}
                      style={{
                        backgroundColor: DESIGN_TOKENS.colors.warning[500],
                        borderColor: DESIGN_TOKENS.colors.warning[500]
                      }}
                    >
                      ➕ 追加
                    </ModernButton>
                  </div>

                  {/* 既存フラグ一覧 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN_TOKENS.spacing[3] }}>
                    {projectFlags.map((flag) => (
                      <ModernCard
                        key={flag.id}
                        variant="elevated"
                        size="sm"
                        style={{ 
                          backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                          border: `1px solid ${DESIGN_TOKENS.colors.warning[100]}`
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[3] }}>
                            <ModernButton
                              variant={flag.initialValue ? "success" : "secondary"}
                              size="xs"
                              onClick={() => toggleFlagInitialValue(flag.id)}
                              style={{ 
                                minWidth: '50px',
                                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                                fontWeight: DESIGN_TOKENS.typography.fontWeight.bold
                              }}
                            >
                              {flag.initialValue ? 'ON' : 'OFF'}
                            </ModernButton>
                            <span style={{ 
                              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                              fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                              color: DESIGN_TOKENS.colors.neutral[800]
                            }}>
                              {flag.name}
                            </span>
                          </div>
                          <ModernButton
                            variant="outline"
                            size="xs"
                            onClick={() => removeFlag(flag.id)}
                            style={{
                              borderColor: DESIGN_TOKENS.colors.error[500],
                              color: DESIGN_TOKENS.colors.error[600]
                            }}
                          >
                            🗑️ 削除
                          </ModernButton>
                        </div>
                      </ModernCard>
                    ))}
                  </div>

                  {projectFlags.length === 0 && (
                    <ModernCard 
                      variant="outlined" 
                      size="lg"
                      style={{ 
                        backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                        border: `2px dashed ${DESIGN_TOKENS.colors.warning[100]}`,
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ 
                        fontSize: DESIGN_TOKENS.typography.fontSize['3xl'], 
                        marginBottom: DESIGN_TOKENS.spacing[2] 
                      }}>
                        🚩
                      </div>
                      <div style={{ 
                        fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                        color: DESIGN_TOKENS.colors.neutral[500]
                      }}>
                        フラグを追加してゲーム状態を管理
                      </div>
                    </ModernCard>
                  )}
                </ModernCard>
              </div>
            </div>
          </div>

          {/* フッター */}
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