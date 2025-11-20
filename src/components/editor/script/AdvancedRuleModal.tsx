// src/components/editor/script/AdvancedRuleModal.tsx
// Phase G-3完了版: ランダムシステム統合 + エラー修正
// DESIGN_TOKENS問題修正 + RandomRuleComponents統合

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GameRule, TriggerCondition, GameAction, GameFlag } from '../../../types/editor/GameScript';
import { GameProject } from '../../../types/editor/GameProject';
import { GameCounter, PRESET_COUNTERS, createCounterFromPreset, createCounter } from '../../../types/counterTypes';
import { ModernCard } from '../../ui/ModernCard';
import { ModernButton } from '../../ui/ModernButton';
import { RulePreview } from './RulePreview';

// 分割されたライブラリインポート（Phase G-3: ランダム追加済み）
import { CONDITION_LIBRARY, ACTION_LIBRARY, PRIORITY_ACTION_LIBRARY } from './constants/RuleLibrary';

// 分割された条件エディターインポート（Phase C保護 + Phase D・E・G拡張）
import { TouchConditionEditor } from './conditions/TouchConditionEditor';
import { TimeConditionEditor } from './conditions/TimeConditionEditor';
import { FlagConditionEditor } from './conditions/FlagConditionEditor';
import { CollisionConditionEditor } from './conditions/CollisionConditionEditor';
import { GameStateConditionEditor } from './conditions/GameStateConditionEditor';
import { AnimationConditionEditor } from './conditions/AnimationConditionEditor';

// 分割されたアクションエディターインポート（Phase C保護 + Phase D・E拡張）
import { SoundActionEditor } from './actions/SoundActionEditor';
import { MoveActionEditor } from './actions/MoveActionEditor';
import { EffectActionEditor } from './actions/EffectActionEditor';
import { ShowHideActionEditor } from './actions/ShowHideActionEditor';
import { FlagActionEditor } from './actions/FlagActionEditor';
import { AnimationActionEditor } from './actions/AnimationActionEditor';

// Phase G追加: カウンターシステム統合
import { 
  CounterConditionEditor, 
  CounterActionEditor,
  createDefaultCounterCondition,
  createDefaultCounterAction
} from './CounterRuleComponents';

// Phase G-3追加: ランダムシステム統合
import { 
  RandomConditionEditor, 
  RandomActionEditor,
  createDefaultRandomCondition,
  createDefaultRandomAction
} from './RandomRuleComponents';

// デザイン定数をローカル定義（DESIGN_TOKENS問題回避）
const COLORS = {
  purple: { 50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 500: '#8b5cf6', 600: '#7c3aed', 800: '#5b21b6' },
  success: { 50: '#f0fdf4', 200: '#bbf7d0', 500: '#22c55e', 600: '#16a34a', 800: '#166534' },
  warning: { 50: '#fffbeb', 100: '#fef3c7', 500: '#f59e0b', 800: '#92400e' },
  primary: { 50: '#eff6ff', 200: '#bfdbfe', 500: '#3b82f6', 700: '#1d4ed8', 800: '#1e40af' },
  neutral: { 0: '#ffffff', 50: '#f9fafb', 200: '#e5e7eb', 300: '#d1d5db', 500: '#6b7280', 600: '#4b5563', 700: '#374151' },
  error: { 800: '#991b1b' }
};

const SPACING = { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 6: '24px' };
const BORDER_RADIUS = { md: '6px', lg: '8px', xl: '12px', '3xl': '24px', full: '50%' };
const SHADOWS = { sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)', lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)', '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)' };
const Z_INDEX = { modal: 50, notification: 60 };

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
  const { t } = useTranslation();
  const [rule, setRule] = useState<GameRule>(initialRule);
  const [conditions, setConditions] = useState<TriggerCondition[]>(initialRule.triggers.conditions);
  const [actions, setActions] = useState<GameAction[]>(initialRule.actions);
  const [operator, setOperator] = useState<'AND' | 'OR'>(initialRule.triggers.operator);
  
  // フラグ管理状態（Phase A・B保護）
  const [projectFlags, setProjectFlags] = useState<GameFlag[]>(project.script?.flags || []);
  const [newFlagName, setNewFlagName] = useState('');
  
  // Phase G追加: カウンター管理状態
  const [projectCounters, setProjectCounters] = useState<GameCounter[]>(project.script?.counters || []);
  const [newCounterName, setNewCounterName] = useState('');
  const [newCounterValue, setNewCounterValue] = useState<number>(0);
  
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

  // Phase G追加: プロジェクトカウンター更新
  const updateProjectCounters = (counters: GameCounter[]) => {
    setProjectCounters(counters);
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
      showNotification('success', t('editor.script.ruleModal.notifications.flagAdded', { name: newFlag.name }));
    }
  };

  // Phase G追加: カウンター追加（カスタム）
  const addCounter = () => {
    if (newCounterName.trim()) {
      const newCounter = createCounter(newCounterName.trim(), newCounterValue);
      updateProjectCounters([...projectCounters, newCounter]);
      setNewCounterName('');
      setNewCounterValue(0);
      showNotification('success', t('editor.script.ruleModal.notifications.counterAdded', { name: newCounter.name }));
    }
  };

  // Phase G追加: プリセットカウンター追加
  const addPresetCounter = (presetId: string) => {
    const newCounter = createCounterFromPreset(presetId);
    if (newCounter) {
      // 既存カウンターと名前重複チェック
      const existingNames = projectCounters.map(c => c.name);
      if (existingNames.includes(newCounter.name)) {
        showNotification('error', t('editor.script.ruleModal.notifications.counterExists', { name: newCounter.name }));
        return;
      }

      updateProjectCounters([...projectCounters, newCounter]);
      showNotification('success', t('editor.script.ruleModal.notifications.counterAdded', { name: newCounter.name }));
    }
  };

  // フラグ削除（Phase A・B保護）
  const removeFlag = (flagId: string) => {
    const flag = projectFlags.find(f => f.id === flagId);
    if (confirm(t('editor.script.ruleModal.notifications.confirmDeleteFlag', { name: flag?.name }))) {
      updateProjectFlags(projectFlags.filter(flag => flag.id !== flagId));
      showNotification('success', t('editor.script.ruleModal.notifications.flagDeleted'));
    }
  };

  // Phase G追加: カウンター削除
  const removeCounter = (counterId: string) => {
    const counter = projectCounters.find(c => c.id === counterId);
    if (confirm(t('editor.script.ruleModal.notifications.confirmDeleteCounter', { name: counter?.name }))) {
      updateProjectCounters(projectCounters.filter(counter => counter.id !== counterId));
      showNotification('success', t('editor.script.ruleModal.notifications.counterDeleted'));
    }
  };

  // フラグ初期値変更（Phase A・B保護）
  const toggleFlagInitialValue = (flagId: string) => {
    updateProjectFlags(projectFlags.map(flag => 
      flag.id === flagId ? { ...flag, initialValue: !flag.initialValue } : flag
    ));
  };

  // Phase G追加: カウンター初期値変更
  const updateCounterInitialValue = (counterId: string, newValue: number) => {
    updateProjectCounters(projectCounters.map(counter => 
      counter.id === counterId ? { 
        ...counter, 
        initialValue: newValue,
        currentValue: newValue,
        lastModified: new Date().toISOString()
      } : counter
    ));
  };

  // 条件追加（Phase A・B保護・Phase D・E・G・G-3拡張対応）
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
      case 'gameState':
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
      case 'counter': // Phase G追加: カウンター条件
        newCondition = createDefaultCounterCondition(projectCounters[0]?.name || '');
        break;
      case 'random': // Phase G-3追加: ランダム条件
        newCondition = createDefaultRandomCondition();
        break;
      default:
        return;
    }
    
    setConditions([...conditions, newCondition]);
    showNotification('success', t('editor.script.ruleModal.notifications.conditionAdded'));
  };

  // 条件削除（Phase A・B保護）
  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
    showNotification('success', t('editor.script.ruleModal.notifications.conditionRemoved'));
  };

  // 条件更新（Phase C: 詳細パラメータ対応）
  const updateCondition = (index: number, updates: Partial<TriggerCondition>) => {
    setConditions(conditions.map((condition, i) => 
      i === index ? ({ ...condition, ...updates } as TriggerCondition) : condition
    ));
  };

  // アクション追加（Phase A・B保護・Phase D・E・G・G-3拡張）
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
      case 'counter': // Phase G追加: カウンターアクション
        newAction = createDefaultCounterAction(projectCounters[0]?.name || '');
        break;
      case 'randomAction': // Phase G-3追加: ランダムアクション
        newAction = createDefaultRandomAction();
        break;
      default:
        return;
    }
    
    setActions([...actions, newAction]);
    showNotification('success', t('editor.script.ruleModal.notifications.actionAdded'));
  };

  // アクション削除（Phase A・B保護）
  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
    showNotification('success', t('editor.script.ruleModal.notifications.actionRemoved'));
  };

  // アクション更新（Phase A・B保護・Phase E・G・G-3拡張）
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
        case 'counter': // Phase G追加: カウンターアクション更新
          return { ...action, ...(updates as typeof action) };
        case 'randomAction': // Phase G-3追加: ランダムアクション更新
          return { ...action, ...(updates as typeof action) };
        default:
          return action;
      }
    }));
  };

  // 保存処理（Phase A・B保護）
  const handleSave = () => {
    if (!rule.name.trim()) {
      showNotification('error', t('editor.script.ruleModal.notifications.errorRuleName'));
      return;
    }

    if (conditions.length === 0) {
      showNotification('error', t('editor.script.ruleModal.notifications.errorMinConditions'));
      return;
    }

    if (actions.length === 0) {
      showNotification('error', t('editor.script.ruleModal.notifications.errorMinActions'));
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
    showNotification('success', t('editor.script.ruleModal.notifications.ruleSaved'));
  };

  // 条件エディター分岐レンダリング（Phase G・G-3拡張）
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
      case 'gameState':
        return (
          <GameStateConditionEditor
            condition={condition}
            index={index}
            onUpdate={updateCondition}
          />
        );
      case 'animation':
        return (
          <AnimationConditionEditor
            condition={condition}
            index={index}
            project={project}
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
      case 'counter': // Phase G追加: カウンター条件エディター
        return (
          <CounterConditionEditor
            condition={condition as Extract<TriggerCondition, { type: 'counter' }>}
            project={{ ...project, script: { ...project.script, counters: projectCounters } }}
            onChange={(updatedCondition) => updateCondition(index, updatedCondition)}
            onRemove={() => removeCondition(index)}
          />
        );
      case 'random': // Phase G-3追加: ランダム条件エディター
        return (
          <RandomConditionEditor
            condition={condition as Extract<TriggerCondition, { type: 'random' }>}
            onChange={(updatedCondition) => updateCondition(index, updatedCondition)}
            onRemove={() => removeCondition(index)}
          />
        );
      default:
        return null;
    }
  };

  // アクションエディター分岐レンダリング（Phase D保護 + Phase E・G・G-3拡張）
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
      case 'switchAnimation':
        return (
          <AnimationActionEditor
            action={action}
            index={index}
            project={project}
            onUpdate={updateAction}
            onShowNotification={showNotification}
          />
        );
      case 'counter': // Phase G追加: カウンターアクションエディター
        return (
          <CounterActionEditor
            action={action as Extract<GameAction, { type: 'counter' }>}
            project={{ ...project, script: { ...project.script, counters: projectCounters } }}
            onChange={(updatedAction) => updateAction(index, updatedAction)}
            onRemove={() => removeAction(index)}
          />
        );
      case 'randomAction': // Phase G-3追加: ランダムアクションエディター
        return (
          <RandomActionEditor
            action={action as Extract<GameAction, { type: 'randomAction' }>}
            onChange={(updatedAction) => updateAction(index, updatedAction)}
            onRemove={() => removeAction(index)}
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
            top: SPACING[4],
            right: SPACING[4],
            zIndex: Z_INDEX.notification,
            maxWidth: '400px'
          }}
        >
          <ModernCard variant="elevated" size="sm">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ 
                fontSize: '20px', 
                marginRight: SPACING[3] 
              }}>
                {notification.type === 'success' ? '✅' :
                 notification.type === 'error' ? '❌' : 'ℹ️'}
              </span>
              <p style={{ 
                fontWeight: '500',
                margin: 0,
                flex: 1,
                color: notification.type === 'success' 
                  ? COLORS.success[800] 
                  : notification.type === 'error' 
                    ? COLORS.error[800] 
                    : COLORS.primary[800]
              }}>
                {notification.message}
              </p>
              <ModernButton
                variant="ghost"
                size="xs"
                onClick={() => setNotification(null)}
                style={{ marginLeft: SPACING[2] }}
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
          zIndex: Z_INDEX.modal,
          padding: SPACING[4]
        }}
      >
        <div 
          style={{
            backgroundColor: COLORS.neutral[0],
            borderRadius: BORDER_RADIUS['3xl'],
            boxShadow: SHADOWS['2xl'],
            width: '100%',
            maxWidth: '1400px',
            maxHeight: '95vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            border: `1px solid ${COLORS.neutral[200]}`
          }}
        >
          
          {/* ヘッダー（Phase G-3更新） */}
          <ModernCard 
            variant="filled" 
            size="lg"
            style={{ 
              backgroundColor: COLORS.purple[600],
              borderRadius: `${BORDER_RADIUS['3xl']} ${BORDER_RADIUS['3xl']} 0 0`,
              margin: 0
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: SPACING[4] }}>
              <div 
                style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: COLORS.purple[500],
                  borderRadius: BORDER_RADIUS.xl,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: SHADOWS.lg
                }}
              >
                <span style={{ 
                  fontSize: '24px', 
                  color: COLORS.neutral[0] 
                }}>
                  🎯
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <h3
                  style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: COLORS.neutral[0],
                    margin: 0,
                    marginBottom: SPACING[2]
                  }}
                >
                  {t('editor.script.ruleModal.title')}
                </h3>
                <p
                  style={{
                    fontSize: '14px',
                    color: COLORS.purple[100],
                    fontWeight: '500',
                    margin: 0
                  }}
                >
                  {t('editor.script.ruleModal.subtitle')}
                </p>
              </div>
            </div>
          </ModernCard>

          {/* メインコンテンツ（Phase A・B保護・レイアウト維持） */}
          <div 
            style={{
              flex: 1,
              overflowY: 'auto',
              backgroundColor: COLORS.neutral[50]
            }}
          >
            <div 
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: SPACING[6],
                padding: SPACING[6],
                maxWidth: '1400px',
                margin: '0 auto'
              }}
            >
              
              {/* 左上: ルール名（Phase A・B保護） */}
              <ModernCard variant="outlined" size="lg">
                <div style={{ marginBottom: SPACING[4] }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: SPACING[2],
                    marginBottom: SPACING[3]
                  }}>
                    <span style={{ fontSize: '20px' }}>📝</span>
                    <span style={{
                      fontWeight: '600',
                      color: COLORS.neutral[700],
                      fontSize: '14px'
                    }}>
                      {t('editor.script.ruleModal.sections.ruleName')}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={rule.name}
                    onChange={(e) => setRule({ ...rule, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: `${SPACING[3]} ${SPACING[4]}`,
                      border: `1px solid ${COLORS.neutral[300]}`,
                      borderRadius: BORDER_RADIUS.xl,
                      fontSize: '16px',
                      fontFamily: 'system-ui, sans-serif',
                      backgroundColor: COLORS.neutral[0],
                      transition: 'all 0.2s ease-in-out',
                      outline: 'none',
                      boxShadow: SHADOWS.sm
                    }}
                    placeholder={t('editor.script.ruleModal.placeholders.ruleName')}
                    onFocus={(e) => {
                      e.target.style.borderColor = COLORS.purple[500];
                      e.target.style.boxShadow = `0 0 0 3px ${COLORS.purple[500]}20`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = COLORS.neutral[300];
                      e.target.style.boxShadow = SHADOWS.sm;
                    }}
                  />
                </div>
              </ModernCard>

              {/* 右上: 実行アクション（簡易版・Phase A・B保護・Phase D・E・G・G-3拡張） */}
              <ModernCard 
                variant="outlined" 
                size="lg"
                style={{ 
                  backgroundColor: COLORS.success[50],
                  border: `2px solid ${COLORS.success[200]}`
                }}
              >
                <h4 style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: COLORS.success[800],
                  margin: 0,
                  marginBottom: SPACING[4],
                  display: 'flex',
                  alignItems: 'center',
                  gap: SPACING[2]
                }}>
                  <span style={{ fontSize: '20px' }}>⚡</span>
                  {t('editor.script.ruleModal.sections.actions', { count: actions.length })}
                </h4>

                {/* アクション追加ボタン（コンパクト版・Phase A・B保護・Phase D・E・G・G-3拡張） */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                  gap: SPACING[2],
                  marginBottom: SPACING[4]
                }}>
                  {PRIORITY_ACTION_LIBRARY.map((actionType) => (
                    <ModernButton
                      key={actionType.type}
                      variant="outline"
                      size="sm"
                      onClick={() => addAction(actionType.type)}
                      style={{
                        borderColor: COLORS.success[200],
                        color: COLORS.success[600],
                        fontSize: '18px',
                        padding: SPACING[2]
                      }}
                    >
                      <span style={{ fontSize: '24px' }}>{actionType.icon}</span>
                    </ModernButton>
                  ))}
                  {/* Phase G-3追加: ランダムアクションボタン */}
                  <ModernButton
                    variant="outline"
                    size="sm"
                    onClick={() => addAction('randomAction')}
                    style={{
                      borderColor: COLORS.success[200],
                      color: COLORS.success[600],
                      fontSize: '18px',
                      padding: SPACING[2]
                    }}
                    title={t('editor.script.ruleModal.tooltips.randomAction')}
                  >
                    <span style={{ fontSize: '24px' }}>🎲</span>
                  </ModernButton>
                </div>

                {/* アクション一覧（簡易表示・Phase A・B保護・Phase D・E・G・G-3拡張） */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING[2] }}>
                  {actions.slice(0, 3).map((action, index) => (
                    <div key={index}>
                      <div 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: SPACING[2],
                          padding: SPACING[2],
                          backgroundColor: COLORS.neutral[0],
                          borderRadius: BORDER_RADIUS.lg,
                          fontSize: '14px'
                        }}
                      >
                        <span style={{ fontSize: '20px' }}>{action.type === 'randomAction' ? '🎲' : (PRIORITY_ACTION_LIBRARY.find(a => a.type === action.type)?.icon || ACTION_LIBRARY.find(a => a.type === action.type)?.icon || '⚡')}</span>
                        <span style={{ fontWeight: '600' }}>{action.type === 'randomAction' ? t('actions.randomAction.label') : (PRIORITY_ACTION_LIBRARY.find(a => a.type === action.type)?.label || ACTION_LIBRARY.find(a => a.type === action.type)?.label || action.type)}</span>
                        {/* アクション詳細設定ボタン（Phase D・E・G・G-3拡張対応） */}
                        {['playSound', 'move', 'effect', 'show', 'hide', 'setFlag', 'toggleFlag', 'switchAnimation', 'counter', 'randomAction'].includes(action.type) && (
                          <ModernButton
                            variant="outline"
                            size="xs"
                            onClick={() => {/* 詳細設定は常に表示済み */}}
                            style={{
                              borderColor: COLORS.success[200],
                              color: COLORS.success[600],
                              fontSize: '12px',
                              marginLeft: 'auto',
                              marginRight: SPACING[1]
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
                            marginLeft: ['playSound', 'move', 'effect', 'show', 'hide', 'setFlag', 'toggleFlag', 'switchAnimation', 'counter', 'randomAction'].includes(action.type) ? 0 : 'auto'
                          }}
                        >
                          ✕
                        </ModernButton>
                      </div>
                      
                      {/* 分割されたアクションエディター表示（Phase D・E・G・G-3拡張） */}
                      {renderActionEditor(action, index)}
                    </div>
                  ))}
                  {actions.length > 3 && (
                    <div style={{
                      fontSize: '12px',
                      color: COLORS.neutral[500],
                      textAlign: 'center'
                    }}>
                      {t('editor.script.ruleModal.more.actions', { count: actions.length - 3 })}
                    </div>
                  )}
                </div>
              </ModernCard>

              {/* 左下: 発動条件（詳細版・Phase C Step 1-1・1-2・2拡張・Phase D・E・G・G-3拡張） */}
              <ModernCard 
                variant="outlined" 
                size="lg"
                style={{ 
                  backgroundColor: COLORS.purple[50],
                  border: `2px solid ${COLORS.purple[200]}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING[4] }}>
                  <h4 style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: COLORS.purple[800],
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: SPACING[2]
                  }}>
                    <span style={{ fontSize: '20px' }}>🔥</span>
                    {t('editor.script.ruleModal.sections.conditions', { count: conditions.length })}
                  </h4>
                  <select
                    value={operator}
                    onChange={(e) => setOperator(e.target.value as 'AND' | 'OR')}
                    style={{
                      fontSize: '12px',
                      border: `1px solid ${COLORS.purple[200]}`,
                      borderRadius: BORDER_RADIUS.lg,
                      padding: `${SPACING[1]} ${SPACING[2]}`,
                      backgroundColor: COLORS.neutral[0]
                    }}
                  >
                    <option value="AND">{t('editor.script.ruleModal.operators.and')}</option>
                    <option value="OR">{t('editor.script.ruleModal.operators.or')}</option>
                  </select>
                </div>

                {/* 条件追加ボタン（Phase A・B保護・Phase D・E・G・G-3対応） */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                  gap: SPACING[2],
                  marginBottom: SPACING[4]
                }}>
                  {CONDITION_LIBRARY.map((conditionType) => (
                    <ModernButton
                      key={conditionType.type}
                      variant="outline"
                      size="xs"
                      onClick={() => addCondition(conditionType.type)}
                      style={{
                        borderColor: COLORS.purple[200],
                        color: COLORS.purple[800],
                        fontSize: '18px',
                        padding: SPACING[2]
                      }}
                      title={conditionType.description}
                    >
                      <span style={{ fontSize: '24px' }}>{conditionType.icon}</span>
                    </ModernButton>
                  ))}
                </div>

                {/* 条件一覧（詳細パラメータ編集対応・Phase D・E・G・G-3拡張） */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING[2] }}>
                  {conditions.map((condition, index) => (
                    <div key={index}>
                      <div 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: SPACING[2],
                          padding: SPACING[2],
                          backgroundColor: COLORS.neutral[0],
                          borderRadius: BORDER_RADIUS.lg,
                          fontSize: '14px'
                        }}
                      >
                        <span style={{ fontSize: '20px' }}>{CONDITION_LIBRARY.find(c => c.type === condition.type)?.icon}</span>
                        <span style={{ fontWeight: '600' }}>{CONDITION_LIBRARY.find(c => c.type === condition.type)?.label}</span>
                        <ModernButton
                          variant="outline"
                          size="xs"
                          onClick={() => {/* 詳細設定は常に表示済み */}}
                          style={{
                            borderColor: COLORS.purple[200],
                            color: COLORS.purple[800],
                            fontSize: '12px',
                            marginLeft: 'auto',
                            marginRight: SPACING[1]
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
                      
                      {/* 分割された条件エディター表示（Phase E・G・G-3拡張） */}
                      {renderConditionEditor(condition, index)}
                    </div>
                  ))}
                </div>
              </ModernCard>

              {/* 右下: フラグ・カウンター管理（Phase A・B保護 + Phase G拡張） */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING[4] }}>
                
                {/* フラグ管理（Phase A・B保護） */}
                <ModernCard 
                  variant="outlined" 
                  size="md"
                  style={{ 
                    backgroundColor: COLORS.warning[50],
                    border: `2px solid ${COLORS.warning[100]}`
                  }}
                >
                  <h4 style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: COLORS.warning[800],
                    margin: 0,
                    marginBottom: SPACING[3],
                    display: 'flex',
                    alignItems: 'center',
                    gap: SPACING[2]
                  }}>
                    <span style={{ fontSize: '18px' }}>🚩</span>
                    {t('editor.script.ruleModal.sections.flags', { count: projectFlags.length })}
                  </h4>

                  {/* 新規フラグ追加（Phase A・B保護） */}
                  <div style={{ display: 'flex', gap: SPACING[2], marginBottom: SPACING[3] }}>
                    <input
                      type="text"
                      value={newFlagName}
                      onChange={(e) => setNewFlagName(e.target.value)}
                      placeholder={t('editor.script.ruleModal.placeholders.flagName')}
                      style={{
                        flex: 1,
                        padding: SPACING[2],
                        fontSize: '12px',
                        border: `1px solid ${COLORS.warning[100]}`,
                        borderRadius: BORDER_RADIUS.lg,
                        backgroundColor: COLORS.neutral[0]
                      }}
                    />
                    <ModernButton
                      variant="primary"
                      size="sm"
                      onClick={addFlag}
                      style={{
                        backgroundColor: COLORS.warning[500],
                        borderColor: COLORS.warning[500],
                        fontSize: '12px'
                      }}
                    >
                      ➕
                    </ModernButton>
                  </div>

                  {/* フラグ一覧（Phase A・B保護） */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING[2] }}>
                    {projectFlags.slice(0, 3).map((flag) => (
                      <div 
                        key={flag.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: SPACING[2],
                          padding: SPACING[2],
                          backgroundColor: COLORS.neutral[0],
                          borderRadius: BORDER_RADIUS.lg,
                          fontSize: '12px'
                        }}
                      >
                        <ModernButton
                          variant={flag.initialValue ? "success" : "secondary"}
                          size="xs"
                          onClick={() => toggleFlagInitialValue(flag.id)}
                          style={{ fontSize: '12px' }}
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
                    {projectFlags.length > 3 && (
                      <div style={{
                        fontSize: '12px',
                        color: COLORS.neutral[500],
                        textAlign: 'center'
                      }}>
                        {t('editor.script.ruleModal.more.flags', { count: projectFlags.length - 3 })}
                      </div>
                    )}
                  </div>
                </ModernCard>

                {/* Phase G追加: カウンター管理 */}
                <ModernCard 
                  variant="outlined" 
                  size="md"
                  style={{ 
                    backgroundColor: COLORS.primary[50],
                    border: `2px solid ${COLORS.primary[200]}`
                  }}
                >
                  <h4 style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: COLORS.primary[800],
                    margin: 0,
                    marginBottom: SPACING[3],
                    display: 'flex',
                    alignItems: 'center',
                    gap: SPACING[2]
                  }}>
                    <span style={{ fontSize: '18px' }}>🔢</span>
                    {t('editor.script.ruleModal.sections.counters', { count: projectCounters.length })}
                  </h4>

                  {/* プリセットカウンター追加 */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))',
                    gap: SPACING[1],
                    marginBottom: SPACING[3]
                  }}>
                    {PRESET_COUNTERS.slice(0, 5).map((preset) => (
                      <ModernButton
                        key={preset.id}
                        variant="outline"
                        size="xs"
                        onClick={() => addPresetCounter(preset.id)}
                        style={{
                          borderColor: COLORS.primary[200],
                          color: COLORS.primary[700],
                          fontSize: '12px',
                          padding: `${SPACING[1]} ${SPACING[2]}`,
                          textAlign: 'center'
                        }}
                        title={preset.description}
                      >
                        <div>
                          <div>{preset.icon}</div>
                          <div style={{ fontSize: '8px' }}>{preset.name}</div>
                        </div>
                      </ModernButton>
                    ))}
                  </div>

                  {/* カスタムカウンター追加 */}
                  <div style={{ display: 'flex', gap: SPACING[1], marginBottom: SPACING[3] }}>
                    <input
                      type="text"
                      value={newCounterName}
                      onChange={(e) => setNewCounterName(e.target.value)}
                      placeholder={t('editor.script.ruleModal.placeholders.counterName')}
                      style={{
                        flex: 1,
                        padding: SPACING[1],
                        fontSize: '12px',
                        border: `1px solid ${COLORS.primary[200]}`,
                        borderRadius: BORDER_RADIUS.md,
                        backgroundColor: COLORS.neutral[0]
                      }}
                    />
                    <input
                      type="number"
                      value={newCounterValue}
                      onChange={(e) => setNewCounterValue(Number(e.target.value))}
                      placeholder={t('editor.script.ruleModal.placeholders.initialValue')}
                      style={{
                        width: '60px',
                        padding: SPACING[1],
                        fontSize: '12px',
                        border: `1px solid ${COLORS.primary[200]}`,
                        borderRadius: BORDER_RADIUS.md,
                        backgroundColor: COLORS.neutral[0]
                      }}
                    />
                    <ModernButton
                      variant="primary"
                      size="sm"
                      onClick={addCounter}
                      style={{
                        backgroundColor: COLORS.primary[500],
                        borderColor: COLORS.primary[500],
                        fontSize: '12px'
                      }}
                    >
                      ➕
                    </ModernButton>
                  </div>

                  {/* カウンター一覧 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING[2] }}>
                    {projectCounters.slice(0, 3).map((counter) => (
                      <div 
                        key={counter.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: SPACING[2],
                          padding: SPACING[2],
                          backgroundColor: COLORS.neutral[0],
                          borderRadius: BORDER_RADIUS.lg,
                          fontSize: '12px'
                        }}
                      >
                        <span style={{ fontSize: '14px' }}>
                          {PRESET_COUNTERS.find(p => p.name === counter.name)?.icon || '🔢'}
                        </span>
                        <span style={{ flex: 1 }}>{counter.name}</span>
                        <input
                          type="number"
                          value={counter.initialValue}
                          onChange={(e) => updateCounterInitialValue(counter.id, Number(e.target.value))}
                          style={{
                            width: '50px',
                            padding: `${SPACING[1]} ${SPACING[2]}`,
                            fontSize: '12px',
                            border: `1px solid ${COLORS.neutral[300]}`,
                            borderRadius: BORDER_RADIUS.md,
                            textAlign: 'center'
                          }}
                        />
                        <ModernButton
                          variant="ghost"
                          size="xs"
                          onClick={() => removeCounter(counter.id)}
                        >
                          ✕
                        </ModernButton>
                      </div>
                    ))}
                    {projectCounters.length > 3 && (
                      <div style={{
                        fontSize: '12px',
                        color: COLORS.neutral[500],
                        textAlign: 'center'
                      }}>
                        {t('editor.script.ruleModal.more.counters', { count: projectCounters.length - 3 })}
                      </div>
                    )}
                  </div>
                </ModernCard>
              </div>
            </div>

            {/* ルールプレビュー（Phase A・B保護） */}
            <div style={{ padding: `0 ${SPACING[6]} ${SPACING[6]}` }}>
              <RulePreview
                currentRule={{
                  rule,
                  conditions,
                  actions,
                  operator
                }}
                project={{
                  ...project,
                  script: {
                    ...project.script,
                    flags: projectFlags,
                    counters: projectCounters
                  }
                }}
                projectFlags={projectFlags}
                mode="single"
                showTitle={true}
                compact={false}
              />
            </div>
          </div>

          {/* フッター（Phase A・B保護・Phase G-3更新） */}
          <div 
            style={{
              borderTop: `1px solid ${COLORS.neutral[200]}`,
              backgroundColor: COLORS.neutral[50],
              padding: SPACING[6],
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{
              fontSize: '14px',
              color: COLORS.neutral[600],
              display: 'flex',
              alignItems: 'center',
              gap: SPACING[6]
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: SPACING[2] }}>
                <span style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: COLORS.purple[500],
                  borderRadius: BORDER_RADIUS.full
                }}></span>
                <span>{t('editor.script.ruleModal.status.conditions', { count: conditions.length })}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: SPACING[2] }}>
                <span style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: COLORS.success[500],
                  borderRadius: BORDER_RADIUS.full
                }}></span>
                <span>{t('editor.script.ruleModal.status.actions', { count: actions.length })}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: SPACING[2] }}>
                <span style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: COLORS.warning[500],
                  borderRadius: BORDER_RADIUS.full
                }}></span>
                <span>{t('editor.script.ruleModal.status.flags', { count: projectFlags.length })}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: SPACING[2] }}>
                <span style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: COLORS.primary[500],
                  borderRadius: BORDER_RADIUS.full
                }}></span>
                <span>{t('editor.script.ruleModal.status.counters', { count: projectCounters.length })}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: SPACING[4] }}>
              <ModernButton
                variant="secondary"
                size="lg"
                onClick={onClose}
              >
                {t('editor.script.ruleModal.buttons.cancel')}
              </ModernButton>
              <ModernButton
                variant="primary"
                size="lg"
                onClick={handleSave}
                disabled={conditions.length === 0 || actions.length === 0}
                style={{
                  backgroundColor: COLORS.purple[600],
                  borderColor: COLORS.purple[600]
                }}
              >
                <span style={{ fontSize: '18px' }}>💾</span>
                {t('editor.script.ruleModal.buttons.save')}
              </ModernButton>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};