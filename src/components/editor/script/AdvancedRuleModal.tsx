// src/components/editor/script/AdvancedRuleModal.tsx
// 新レイアウト版: 詳細設定エリア分離 + 選択式UI

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GameRule, TriggerCondition, GameAction, GameFlag } from '../../../types/editor/GameScript';
import { GameProject } from '../../../types/editor/GameProject';
import { GameCounter, PRESET_COUNTERS, createCounterFromPreset, createCounter } from '../../../types/counterTypes';
import { ModernCard } from '../../ui/ModernCard';
import { ModernButton } from '../../ui/ModernButton';
import { RulePreview } from './RulePreview';

// 分割されたライブラリインポート
import { CONDITION_LIBRARY, ACTION_LIBRARY, PRIORITY_ACTION_LIBRARY } from './constants/RuleLibrary';

// 新規パネルコンポーネントインポート
import { ConditionListPanel } from './ConditionListPanel';
import { ActionListPanel } from './ActionListPanel';
import { DetailEditorPanel } from './DetailEditorPanel';

// カウンター・ランダムシステム
import { 
  createDefaultCounterCondition,
  createDefaultCounterAction
} from './CounterRuleComponents';

import { 
  createDefaultRandomCondition,
  createDefaultRandomAction
} from './RandomRuleComponents';

// デザイン定数をインポート
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, Z_INDEX } from './ModalDesignConstants';

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
  
  // 新規追加: 選択状態管理
  const [selectedType, setSelectedType] = useState<'condition' | 'action' | null>(null);
  const [selectedConditionIndex, setSelectedConditionIndex] = useState<number | null>(null);
  const [selectedActionIndex, setSelectedActionIndex] = useState<number | null>(null);
  
  // 新規追加: フラグ・カウンター折りたたみ状態
  const [showFlagManager, setShowFlagManager] = useState(false);
  const [showCounterManager, setShowCounterManager] = useState(false);
  
  // フラグ管理状態
  const [projectFlags, setProjectFlags] = useState<GameFlag[]>(project.script?.flags || []);
  const [newFlagName, setNewFlagName] = useState('');
  
  // カウンター管理状態
  const [projectCounters, setProjectCounters] = useState<GameCounter[]>(project.script?.counters || []);
  const [newCounterName, setNewCounterName] = useState('');
  const [newCounterValue, setNewCounterValue] = useState<number>(0);

  // 通知システム
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

  // プロジェクトカウンター更新
  const updateProjectCounters = (counters: GameCounter[]) => {
    setProjectCounters(counters);
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
      showNotification('success', t('editor.script.ruleModal.notifications.flagAdded', { name: newFlag.name }));
    }
  };

  // カウンター追加（カスタム）
  const addCounter = () => {
    if (newCounterName.trim()) {
      const newCounter = createCounter(newCounterName.trim(), newCounterValue);
      updateProjectCounters([...projectCounters, newCounter]);
      setNewCounterName('');
      setNewCounterValue(0);
      showNotification('success', t('editor.script.ruleModal.notifications.counterAdded', { name: newCounter.name }));
    }
  };

  // プリセットカウンター追加
  const addPresetCounter = (presetId: string) => {
    const newCounter = createCounterFromPreset(presetId);
    if (newCounter) {
      const existingNames = projectCounters.map(c => c.name);
      if (existingNames.includes(newCounter.name)) {
        showNotification('error', t('editor.script.ruleModal.notifications.counterExists', { name: newCounter.name }));
        return;
      }
      updateProjectCounters([...projectCounters, newCounter]);
      showNotification('success', t('editor.script.ruleModal.notifications.counterAdded', { name: newCounter.name }));
    }
  };

  // フラグ削除
  const removeFlag = (flagId: string) => {
    const flag = projectFlags.find(f => f.id === flagId);
    if (confirm(t('editor.script.ruleModal.notifications.confirmDeleteFlag', { name: flag?.name }))) {
      updateProjectFlags(projectFlags.filter(flag => flag.id !== flagId));
      showNotification('success', t('editor.script.ruleModal.notifications.flagDeleted'));
    }
  };

  // カウンター削除
  const removeCounter = (counterId: string) => {
    const counter = projectCounters.find(c => c.id === counterId);
    if (confirm(t('editor.script.ruleModal.notifications.confirmDeleteCounter', { name: counter?.name }))) {
      updateProjectCounters(projectCounters.filter(counter => counter.id !== counterId));
      showNotification('success', t('editor.script.ruleModal.notifications.counterDeleted'));
    }
  };

  // フラグ初期値変更
  const toggleFlagInitialValue = (flagId: string) => {
    updateProjectFlags(projectFlags.map(flag => 
      flag.id === flagId ? { ...flag, initialValue: !flag.initialValue } : flag
    ));
  };

  // カウンター初期値変更
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

  // 条件追加
  const addCondition = (type: string) => {
    let newCondition: TriggerCondition;
    
    switch (type) {
      case 'touch':
        newCondition = { type: 'touch', target: 'self', touchType: 'down' };
        break;
      case 'time':
        newCondition = { type: 'time', timeType: 'exact', seconds: 3 };
        break;
      case 'position':
        newCondition = {
          type: 'position',
          target: rule.targetObjectId,
          area: 'inside',
          region: { shape: 'rect', x: 0.3, y: 0.3, width: 0.4, height: 0.4 }
        };
        break;
      case 'collision':
        newCondition = { type: 'collision', target: 'background', collisionType: 'enter', checkMode: 'hitbox' };
        break;
      case 'gameState':
        newCondition = { type: 'gameState', state: 'playing', checkType: 'is' };
        break;
      case 'animation':
        newCondition = { type: 'animation', target: rule.targetObjectId, condition: 'end', animationIndex: 0 };
        break;
      case 'objectState':
        newCondition = { type: 'objectState', target: rule.targetObjectId, stateType: 'visible' };
        break;
      case 'flag':
        newCondition = { type: 'flag', flagId: projectFlags[0]?.id || '', condition: 'ON' };
        break;
      case 'counter':
        newCondition = createDefaultCounterCondition(projectCounters[0]?.name || '');
        break;
      case 'random':
        newCondition = createDefaultRandomCondition();
        break;
      default:
        return;
    }
    
    const newIndex = conditions.length;
    setConditions([...conditions, newCondition]);
    setSelectedType('condition');
    setSelectedConditionIndex(newIndex);
    setSelectedActionIndex(null);
    showNotification('success', t('editor.script.ruleModal.notifications.conditionAdded'));
  };

  // 条件削除
  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
    if (selectedConditionIndex === index) {
      setSelectedConditionIndex(null);
      setSelectedType(null);
    }
    showNotification('success', t('editor.script.ruleModal.notifications.conditionRemoved'));
  };

  // 条件更新
  const updateCondition = (index: number, updates: Partial<TriggerCondition>) => {
    setConditions(conditions.map((condition, i) => 
      i === index ? ({ ...condition, ...updates } as TriggerCondition) : condition
    ));
  };

  // 条件選択
  const handleConditionSelect = (index: number) => {
    setSelectedType('condition');
    setSelectedConditionIndex(index);
    setSelectedActionIndex(null);
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
    case 'gameState':  // ← 追加
      newAction = { type: 'success' };
      break;
    case 'playSound':
      newAction = { type: 'playSound', soundId: project.assets.audio?.se?.[0]?.id || '', volume: 0.8 };
      break;
    case 'move':
      newAction = {
        type: 'move',
        targetId: rule.targetObjectId,
        movement: { type: 'straight', target: { x: 0.5, y: 0.5 }, speed: 300, duration: 2.0 }
      };
      break;
    case 'effect':
      newAction = { type: 'effect', targetId: rule.targetObjectId, effect: { type: 'flash', duration: 1.0, intensity: 0.8 } };
      break;
    case 'objectState':  // ← 追加
      newAction = { type: 'show', targetId: rule.targetObjectId, fadeIn: true, duration: 0.5 };
      break;
    case 'show':
      newAction = { type: 'show', targetId: rule.targetObjectId, fadeIn: true, duration: 0.5 };
      break;
    case 'hide':
      newAction = { type: 'hide', targetId: rule.targetObjectId, fadeOut: true, duration: 0.5 };
      break;
    case 'setFlag':
      newAction = { type: 'setFlag', flagId: projectFlags[0]?.id || '', value: true };
      break;
    case 'toggleFlag':
      newAction = { type: 'toggleFlag', flagId: projectFlags[0]?.id || '' };
      break;
    case 'switchAnimation':
      newAction = { type: 'switchAnimation', targetId: rule.targetObjectId, animationIndex: 0 };
      break;
    case 'counter':
      newAction = createDefaultCounterAction(projectCounters[0]?.name || '');
      break;
    case 'randomAction':
      newAction = createDefaultRandomAction();
      break;
    default:
      return;
  }
  
  const newIndex = actions.length;
  setActions([...actions, newAction]);
  setSelectedType('action');
  setSelectedActionIndex(newIndex);
  setSelectedConditionIndex(null);
  showNotification('success', t('editor.script.ruleModal.notifications.actionAdded'));
};

  // アクション削除
  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
    if (selectedActionIndex === index) {
      setSelectedActionIndex(null);
      setSelectedType(null);
    }
    showNotification('success', t('editor.script.ruleModal.notifications.actionRemoved'));
  };

  // アクション更新
  const updateAction = (index: number, updates: Partial<GameAction>) => {
    setActions(actions.map((action, i) => {
      if (i !== index) return action;
      return { ...action, ...updates } as GameAction;
    }));
  };

  // アクション選択
  const handleActionSelect = (index: number) => {
    setSelectedType('action');
    setSelectedActionIndex(index);
    setSelectedConditionIndex(null);
  };

  // 保存処理
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
      triggers: { operator, conditions },
      actions,
      lastModified: new Date().toISOString()
    };

    onSave(updatedRule);
    showNotification('success', t('editor.script.ruleModal.notifications.ruleSaved'));
  };

  return (
    <>
      {/* 通知表示 */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: SPACING[4],
          right: SPACING[4],
          zIndex: Z_INDEX.notification,
          maxWidth: '400px'
        }}>
          <ModernCard variant="elevated" size="sm">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '20px', marginRight: SPACING[3] }}>
                {notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : 'ℹ️'}
              </span>
              <p style={{ 
                fontWeight: '500',
                margin: 0,
                flex: 1,
                color: notification.type === 'success' ? COLORS.success[800] : 
                       notification.type === 'error' ? COLORS.error[800] : COLORS.primary[800]
              }}>
                {notification.message}
              </p>
              <ModernButton variant="ghost" size="xs" onClick={() => setNotification(null)} style={{ marginLeft: SPACING[2] }}>
                ✕
              </ModernButton>
            </div>
          </ModernCard>
        </div>
      )}

      {/* メインモーダル */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: Z_INDEX.modal,
        padding: SPACING[4]
      }}>
        <div style={{
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
        }}>
          
          {/* ヘッダー */}
          <ModernCard variant="filled" size="lg" style={{ 
            backgroundColor: COLORS.purple[600],
            borderRadius: `${BORDER_RADIUS['3xl']} ${BORDER_RADIUS['3xl']} 0 0`,
            margin: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: SPACING[4] }}>
              <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: COLORS.purple[500],
                borderRadius: BORDER_RADIUS.xl,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: SHADOWS.lg
              }}>
                <span style={{ fontSize: '24px', color: COLORS.neutral[0] }}>🎯</span>
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  value={rule.name}
                  onChange={(e) => setRule({ ...rule, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: `${SPACING[2]} ${SPACING[3]}`,
                    border: 'none',
                    borderRadius: BORDER_RADIUS.lg,
                    fontSize: '20px',
                    fontWeight: 'bold',
                    fontFamily: 'system-ui, sans-serif',
                    backgroundColor: COLORS.purple[500],
                    color: COLORS.neutral[0],
                    outline: 'none'
                  }}
                  placeholder={t('editor.script.ruleModal.placeholders.ruleName')}
                />
              </div>
            </div>
          </ModernCard>

          {/* メインコンテンツ */}
          <div style={{ flex: 1, overflowY: 'auto', backgroundColor: COLORS.neutral[50] }}>
            <div style={{ padding: SPACING[6], display: 'flex', flexDirection: 'column', gap: SPACING[4] }}>
              
              {/* 上部エリア: IF条件 & THEN実行（並列・固定高さ） */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: SPACING[4],
                height: '350px'
              }}>
                <ConditionListPanel
                  conditions={conditions}
                  selectedIndex={selectedConditionIndex}
                  operator={operator}
                  onSelect={handleConditionSelect}
                  onRemove={removeCondition}
                  onAdd={addCondition}
                  onOperatorChange={setOperator}
                />
                <ActionListPanel
                  actions={actions}
                  selectedIndex={selectedActionIndex}
                  onSelect={handleActionSelect}
                  onRemove={removeAction}
                  onAdd={addAction}
                />
              </div>

              {/* 詳細設定エリア */}
              <DetailEditorPanel
                selectedType={selectedType}
                selectedCondition={selectedConditionIndex !== null ? conditions[selectedConditionIndex] : null}
                selectedConditionIndex={selectedConditionIndex}
                selectedAction={selectedActionIndex !== null ? actions[selectedActionIndex] : null}
                selectedActionIndex={selectedActionIndex}
                project={project}
                projectFlags={projectFlags}
                projectCounters={projectCounters}
                onConditionUpdate={updateCondition}
                onActionUpdate={updateAction}
                onConditionRemove={removeCondition}
                onActionRemove={removeAction}
                onShowNotification={showNotification}
              />

              {/* フラグ・カウンター管理（折りたたみ可） */}
              <ModernCard variant="outlined" size="md">
                <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING[3] }}>
                  
                  {/* フラグ管理 */}
                  <div>
                    <div 
                      onClick={() => setShowFlagManager(!showFlagManager)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        padding: SPACING[2],
                        backgroundColor: COLORS.warning[50],
                        borderRadius: BORDER_RADIUS.lg,
                        border: `2px solid ${COLORS.warning[100]}`
                      }}
                    >
                      <h4 style={{
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: COLORS.warning[800],
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: SPACING[2]
                      }}>
                        <span style={{ fontSize: '18px' }}>🚩</span>
                        {t('editor.script.ruleModal.sections.flags', { count: projectFlags.length })}
                      </h4>
                      <span style={{ fontSize: '20px' }}>{showFlagManager ? '▼' : '▶'}</span>
                    </div>

                    {showFlagManager && (
                      <div style={{ marginTop: SPACING[3], paddingLeft: SPACING[4] }}>
                        <div style={{ display: 'flex', gap: SPACING[2], marginBottom: SPACING[3] }}>
                          <input
                            type="text"
                            value={newFlagName}
                            onChange={(e) => setNewFlagName(e.target.value)}
                            placeholder={t('editor.script.ruleModal.placeholders.flagName')}
                            style={{
                              flex: 1,
                              padding: SPACING[2],
                              fontSize: '14px',
                              border: `1px solid ${COLORS.warning[100]}`,
                              borderRadius: BORDER_RADIUS.lg,
                              backgroundColor: COLORS.neutral[0]
                            }}
                          />
                          <ModernButton variant="primary" size="sm" onClick={addFlag} style={{
                            backgroundColor: COLORS.warning[500],
                            borderColor: COLORS.warning[500]
                          }}>
                            ➕
                          </ModernButton>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING[2] }}>
                          {projectFlags.map((flag) => (
                            <div key={flag.id} style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: SPACING[2],
                              padding: SPACING[2],
                              backgroundColor: COLORS.neutral[0],
                              borderRadius: BORDER_RADIUS.lg,
                              fontSize: '14px'
                            }}>
                              <ModernButton
                                variant={flag.initialValue ? "success" : "secondary"}
                                size="xs"
                                onClick={() => toggleFlagInitialValue(flag.id)}
                              >
                                {flag.initialValue ? 'ON' : 'OFF'}
                              </ModernButton>
                              <span style={{ flex: 1 }}>{flag.name}</span>
                              <ModernButton variant="ghost" size="xs" onClick={() => removeFlag(flag.id)}>✕</ModernButton>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* カウンター管理 */}
                  <div>
                    <div 
                      onClick={() => setShowCounterManager(!showCounterManager)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        padding: SPACING[2],
                        backgroundColor: COLORS.primary[50],
                        borderRadius: BORDER_RADIUS.lg,
                        border: `2px solid ${COLORS.primary[200]}`
                      }}
                    >
                      <h4 style={{
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: COLORS.primary[800],
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: SPACING[2]
                      }}>
                        <span style={{ fontSize: '18px' }}>🔢</span>
                        {t('editor.script.ruleModal.sections.counters', { count: projectCounters.length })}
                      </h4>
                      <span style={{ fontSize: '20px' }}>{showCounterManager ? '▼' : '▶'}</span>
                    </div>

                    {showCounterManager && (
                      <div style={{ marginTop: SPACING[3], paddingLeft: SPACING[4] }}>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))',
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
                        <div style={{ display: 'flex', gap: SPACING[1], marginBottom: SPACING[3] }}>
                          <input
                            type="text"
                            value={newCounterName}
                            onChange={(e) => setNewCounterName(e.target.value)}
                            placeholder={t('editor.script.ruleModal.placeholders.counterName')}
                            style={{
                              flex: 1,
                              padding: SPACING[1],
                              fontSize: '14px',
                              border: `1px solid ${COLORS.primary[200]}`,
                              borderRadius: BORDER_RADIUS.md,
                              backgroundColor: COLORS.neutral[0]
                            }}
                          />
                          <input
                            type="number"
                            value={newCounterValue}
                            onChange={(e) => setNewCounterValue(Number(e.target.value))}
                            placeholder="0"
                            style={{
                              width: '60px',
                              padding: SPACING[1],
                              fontSize: '14px',
                              border: `1px solid ${COLORS.primary[200]}`,
                              borderRadius: BORDER_RADIUS.md,
                              backgroundColor: COLORS.neutral[0]
                            }}
                          />
                          <ModernButton variant="primary" size="sm" onClick={addCounter} style={{
                            backgroundColor: COLORS.primary[500],
                            borderColor: COLORS.primary[500]
                          }}>
                            ➕
                          </ModernButton>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING[2] }}>
                          {projectCounters.map((counter) => (
                            <div key={counter.id} style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: SPACING[2],
                              padding: SPACING[2],
                              backgroundColor: COLORS.neutral[0],
                              borderRadius: BORDER_RADIUS.lg,
                              fontSize: '14px'
                            }}>
                              <span style={{ fontSize: '16px' }}>
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
                                  fontSize: '14px',
                                  border: `1px solid ${COLORS.neutral[300]}`,
                                  borderRadius: BORDER_RADIUS.md,
                                  textAlign: 'center'
                                }}
                              />
                              <ModernButton variant="ghost" size="xs" onClick={() => removeCounter(counter.id)}>✕</ModernButton>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </ModernCard>

              {/* ルールプレビュー */}
              <RulePreview
                currentRule={{ rule, conditions, actions, operator }}
                project={{ ...project, script: { ...project.script, flags: projectFlags, counters: projectCounters } }}
                projectFlags={projectFlags}
                mode="single"
                showTitle={true}
                compact={false}
                onConditionEdit={handleConditionSelect}
                onActionEdit={handleActionSelect}
              />
            </div>
          </div>

          {/* フッター */}
          <div style={{
            borderTop: `1px solid ${COLORS.neutral[200]}`,
            backgroundColor: COLORS.neutral[50],
            padding: SPACING[6],
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{
              fontSize: '14px',
              color: COLORS.neutral[600],
              display: 'flex',
              alignItems: 'center',
              gap: SPACING[6]
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: SPACING[2] }}>
                <span style={{ width: '12px', height: '12px', backgroundColor: COLORS.purple[500], borderRadius: BORDER_RADIUS.full }}></span>
                <span>{t('editor.script.ruleModal.status.conditions', { count: conditions.length })}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: SPACING[2] }}>
                <span style={{ width: '12px', height: '12px', backgroundColor: COLORS.success[500], borderRadius: BORDER_RADIUS.full }}></span>
                <span>{t('editor.script.ruleModal.status.actions', { count: actions.length })}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: SPACING[2] }}>
                <span style={{ width: '12px', height: '12px', backgroundColor: COLORS.warning[500], borderRadius: BORDER_RADIUS.full }}></span>
                <span>{t('editor.script.ruleModal.status.flags', { count: projectFlags.length })}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: SPACING[2] }}>
                <span style={{ width: '12px', height: '12px', backgroundColor: COLORS.primary[500], borderRadius: BORDER_RADIUS.full }}></span>
                <span>{t('editor.script.ruleModal.status.counters', { count: projectCounters.length })}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: SPACING[4] }}>
              <ModernButton variant="secondary" size="lg" onClick={onClose}>
                {t('editor.script.ruleModal.buttons.cancel')}
              </ModernButton>
              <ModernButton
                variant="primary"
                size="lg"
                onClick={handleSave}
                disabled={conditions.length === 0 || actions.length === 0}
                style={{ backgroundColor: COLORS.purple[600], borderColor: COLORS.purple[600] }}
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
