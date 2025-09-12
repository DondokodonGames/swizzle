// src/components/editor/script/AdvancedRuleModal.tsx
// Phase C Step 1: タッチ条件詳細化・基本パラメータ実装
// Phase A・B成果完全保護・段階的詳細化

import React, { useState, useEffect } from 'react';
import { GameRule, TriggerCondition, GameAction, GameFlag } from '../../../types/editor/GameScript';
import { GameProject } from '../../../types/editor/GameProject';
import { DESIGN_TOKENS } from '../../../constants/DesignSystem';
import { ModernCard } from '../../ui/ModernCard';
import { ModernButton } from '../../ui/ModernButton';
import { RulePreview } from './RulePreview';

interface AdvancedRuleModalProps {
  rule: GameRule;
  project: GameProject;
  onSave: (rule: GameRule) => void;
  onClose: () => void;
}

// 条件ライブラリ（Phase A・B保護）
const CONDITION_LIBRARY = [
  { type: 'touch', label: 'タッチ', icon: '👆', params: ['touchType', 'holdDuration', 'target', 'stageArea'] },
  { type: 'time', label: '時間', icon: '⏰', params: ['timeType', 'seconds', 'range'] },
  { type: 'position', label: '位置', icon: '📍', params: ['area', 'region'] },
  { type: 'collision', label: '衝突', icon: '💥', params: ['target', 'collisionType'] },
  { type: 'animation', label: 'アニメ', icon: '🎬', params: ['frame', 'animationType'] },
  { type: 'flag', label: 'フラグ', icon: '🚩', params: ['targetFlag', 'flagState'] }
];

// アクションライブラリ（Phase A・B保護）
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

// 🆕 Phase C: タッチタイプ詳細定義
const TOUCH_TYPE_OPTIONS = [
  { value: 'down', label: 'タッチ開始', icon: '👇', description: 'タッチした瞬間' },
  { value: 'up', label: 'タッチ終了', icon: '👆', description: '指を離した瞬間' },
  { value: 'hold', label: '長押し', icon: '⏱️', description: '一定時間押し続ける' }
];

// 🆕 Phase C: タッチターゲット詳細定義
const TOUCH_TARGET_OPTIONS = [
  { value: 'self', label: 'このオブジェクト', icon: '🎯', description: '設定中のオブジェクト' },
  { value: 'stage', label: 'ステージ全体', icon: '🖼️', description: 'ゲーム画面全体' },
  { value: 'stageArea', label: 'ステージ範囲指定', icon: '📐', description: 'ステージの一部範囲' }
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
  
  // フラグ管理状態（Phase A・B保護）
  const [projectFlags, setProjectFlags] = useState<GameFlag[]>(project.script?.flags || []);
  const [newFlagName, setNewFlagName] = useState('');
  
  // 🆕 Phase C: 詳細パラメータ編集状態
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

  // 🆕 Phase C: 詳細パラメータ編集開始
  const startEditingCondition = (index: number) => {
    setEditingConditionIndex(index);
    setShowParameterModal(true);
  };

  // 🆕 Phase C: 詳細パラメータ編集完了
  const finishEditingCondition = () => {
    setEditingConditionIndex(null);
    setShowParameterModal(false);
  };

  // 条件追加（Phase A・B保護・拡張対応）
  const addCondition = (type: string) => {
    let newCondition: TriggerCondition;
    
    switch (type) {
      case 'touch':
        newCondition = {
          type: 'touch',
          target: 'self',
          touchType: 'down'
          // 🆕 Phase C: デフォルト詳細パラメータは後で設定
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

  // 条件削除（Phase A・B保護）
  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
    showNotification('success', '条件を削除しました');
  };

  // 🆕 Phase C: 条件更新（詳細パラメータ対応）
  const updateCondition = (index: number, updates: Partial<TriggerCondition>) => {
    setConditions(conditions.map((condition, i) => 
      i === index ? ({ ...condition, ...updates } as TriggerCondition) : condition
    ));
  };

  // 🆕 Phase C: タッチ条件詳細設定コンポーネント
  const TouchConditionEditor = ({ condition, index }: { condition: TriggerCondition & { type: 'touch' }, index: number }) => {
    const touchCondition = condition;
    
    return (
      <ModernCard 
        variant="outlined" 
        size="md"
        style={{ 
          backgroundColor: DESIGN_TOKENS.colors.purple[50],
          border: `2px solid ${DESIGN_TOKENS.colors.purple[200]}`,
          marginTop: DESIGN_TOKENS.spacing[4]
        }}
      >
        <h5 style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.md,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
          color: DESIGN_TOKENS.colors.purple[800],
          margin: 0,
          marginBottom: DESIGN_TOKENS.spacing[4],
          display: 'flex',
          alignItems: 'center',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.lg }}>👆</span>
          タッチ条件詳細設定
        </h5>

        {/* タッチタイプ選択 */}
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.purple[700],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            タッチの種類
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: DESIGN_TOKENS.spacing[2]
          }}>
            {TOUCH_TYPE_OPTIONS.map((option) => (
              <ModernButton
                key={option.value}
                variant={touchCondition.touchType === option.value ? 'primary' : 'outline'}
                size="sm"
                onClick={() => updateCondition(index, { touchType: option.value as any })}
                style={{
                  borderColor: touchCondition.touchType === option.value 
                    ? DESIGN_TOKENS.colors.purple[500] 
                    : DESIGN_TOKENS.colors.purple[300],
                  backgroundColor: touchCondition.touchType === option.value 
                    ? DESIGN_TOKENS.colors.purple[500] 
                    : 'transparent',
                  color: touchCondition.touchType === option.value 
                    ? DESIGN_TOKENS.colors.neutral[0] 
                    : DESIGN_TOKENS.colors.purple[700],
                  padding: DESIGN_TOKENS.spacing[3],
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: DESIGN_TOKENS.spacing[1]
                }}
              >
                <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.lg }}>{option.icon}</span>
                <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, fontWeight: DESIGN_TOKENS.typography.fontWeight.medium }}>
                  {option.label}
                </span>
              </ModernButton>
            ))}
          </div>
        </div>

        {/* 長押し時間設定（holdの場合のみ表示） */}
        {touchCondition.touchType === 'hold' && (
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.purple[700],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              長押し時間: {touchCondition.holdDuration || 1}秒
            </label>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.5"
              value={touchCondition.holdDuration || 1}
              onChange={(e) => updateCondition(index, { holdDuration: parseFloat(e.target.value) })}
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: DESIGN_TOKENS.colors.purple[200],
                borderRadius: DESIGN_TOKENS.borderRadius.full,
                outline: 'none',
                cursor: 'pointer'
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.purple[600],
              marginTop: DESIGN_TOKENS.spacing[1]
            }}>
              <span>0.5秒</span>
              <span>5秒</span>
            </div>
          </div>
        )}

        {/* タッチ対象選択 */}
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.purple[700],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            タッチ対象
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: DESIGN_TOKENS.spacing[2]
          }}>
            {TOUCH_TARGET_OPTIONS.map((option) => (
              <ModernButton
                key={option.value}
                variant={touchCondition.target === option.value ? 'primary' : 'outline'}
                size="sm"
                onClick={() => updateCondition(index, { target: option.value })}
                style={{
                  borderColor: touchCondition.target === option.value 
                    ? DESIGN_TOKENS.colors.purple[500] 
                    : DESIGN_TOKENS.colors.purple[300],
                  backgroundColor: touchCondition.target === option.value 
                    ? DESIGN_TOKENS.colors.purple[500] 
                    : 'transparent',
                  color: touchCondition.target === option.value 
                    ? DESIGN_TOKENS.colors.neutral[0] 
                    : DESIGN_TOKENS.colors.purple[700],
                  padding: DESIGN_TOKENS.spacing[2],
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: DESIGN_TOKENS.spacing[1]
                }}
              >
                <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.md }}>{option.icon}</span>
                <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, fontWeight: DESIGN_TOKENS.typography.fontWeight.medium, textAlign: 'center' }}>
                  {option.label}
                </span>
              </ModernButton>
            ))}
          </div>
        </div>

        {/* オブジェクト指定（targetが特定オブジェクトの場合） */}
        {touchCondition.target !== 'self' && touchCondition.target !== 'stage' && touchCondition.target !== 'stageArea' && (
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.purple[700],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              対象オブジェクト
            </label>
            <select
              value={touchCondition.target}
              onChange={(e) => updateCondition(index, { target: e.target.value })}
              style={{
                width: '100%',
                padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[3]}`,
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                border: `1px solid ${DESIGN_TOKENS.colors.purple[300]}`,
                borderRadius: DESIGN_TOKENS.borderRadius.md,
                backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                outline: 'none'
              }}
            >
              <option value="">オブジェクトを選択</option>
              {project.assets.objects.map((obj) => (
                <option key={obj.id} value={obj.id}>
                  {obj.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{
          padding: DESIGN_TOKENS.spacing[3],
          backgroundColor: DESIGN_TOKENS.colors.purple[100],
          borderRadius: DESIGN_TOKENS.borderRadius.md,
          fontSize: DESIGN_TOKENS.typography.fontSize.xs,
          color: DESIGN_TOKENS.colors.purple[700]
        }}>
          💡 設定内容: {TOUCH_TYPE_OPTIONS.find(t => t.value === touchCondition.touchType)?.description}
          {touchCondition.touchType === 'hold' && `（${touchCondition.holdDuration || 1}秒間）`}
          {touchCondition.target === 'self' ? ' - このオブジェクトへのタッチ' :
           touchCondition.target === 'stage' ? ' - ステージ全体へのタッチ' :
           ' - 指定オブジェクトへのタッチ'}
        </div>
      </ModernCard>
    );
  };

  // アクション追加（Phase A・B保護）
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

  // アクション削除（Phase A・B保護）
  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
    showNotification('success', 'アクションを削除しました');
  };

  // アクション更新（Phase A・B保護）
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
          
          {/* ヘッダー（Phase A・B保護） */}
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
                  高度なルール設定 - Phase C
                </h3>
                <p 
                  style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                    color: DESIGN_TOKENS.colors.purple[100],
                    fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                    margin: 0
                  }}
                >
                  詳細パラメータ設定・手軽さ極限・創作民主化実現
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

              {/* 右上: 実行アクション（簡易版・Phase A・B保護） */}
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

                {/* アクション追加ボタン（コンパクト版・Phase A・B保護） */}
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

                {/* アクション一覧（簡易表示・Phase A・B保護） */}
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
                          borderRadius: DESIGN_TOKENS.borderRadius.md,
                          fontSize: DESIGN_TOKENS.typography.fontSize.xs
                        }}
                      >
                        <span>{ACTION_LIBRARY.find(a => a.type === action.type)?.icon}</span>
                        <span>{ACTION_LIBRARY.find(a => a.type === action.type)?.label}</span>
                        {/* 🆕 Phase C: アクション詳細設定ボタン（音再生のみ） */}
                        {action.type === 'playSound' && (
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
                            marginLeft: action.type === 'playSound' ? 0 : 'auto'
                          }}
                        >
                          ✕
                        </ModernButton>
                      </div>
                      
                      {/* 🆕 Phase C: 音再生アクション詳細設定UI */}
                      {action.type === 'playSound' && (
                        <SoundActionEditor action={action} index={index} />
                      )}
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

              {/* 左下: 発動条件（詳細版・Phase C拡張） */}
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
                      border: `1px solid ${DESIGN_TOKENS.colors.purple[300]}`,
                      borderRadius: DESIGN_TOKENS.borderRadius.lg,
                      padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[2]}`,
                      backgroundColor: DESIGN_TOKENS.colors.neutral[0]
                    }}
                  >
                    <option value="AND">すべて (AND)</option>
                    <option value="OR">いずれか (OR)</option>
                  </select>
                </div>

                {/* 条件追加ボタン（Phase A・B保護） */}
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
                        borderColor: DESIGN_TOKENS.colors.purple[300],
                        color: DESIGN_TOKENS.colors.purple[700],
                        fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                        padding: DESIGN_TOKENS.spacing[1]
                      }}
                    >
                      <span>{conditionType.icon}</span>
                    </ModernButton>
                  ))}
                </div>

                {/* 🆕 Phase C: 条件一覧（詳細パラメータ編集対応） */}
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
                          borderRadius: DESIGN_TOKENS.borderRadius.md,
                          fontSize: DESIGN_TOKENS.typography.fontSize.xs
                        }}
                      >
                        <span>{CONDITION_LIBRARY.find(c => c.type === condition.type)?.icon}</span>
                        <span>{CONDITION_LIBRARY.find(c => c.type === condition.type)?.label}</span>
                        {/* 🆕 Phase C: 詳細設定ボタン */}
                        <ModernButton
                          variant="outline"
                          size="xs"
                          onClick={() => startEditingCondition(index)}
                          style={{
                            borderColor: DESIGN_TOKENS.colors.purple[300],
                            color: DESIGN_TOKENS.colors.purple[700],
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
                      
                      {/* 🆕 Phase C: タッチ条件詳細設定UI */}
                      {condition.type === 'touch' && (
                        <TouchConditionEditor condition={condition} index={index} />
                      )}
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
                        borderRadius: DESIGN_TOKENS.borderRadius.md,
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