// src/components/editor/modals/VisualRuleEditor.tsx
// アイコン中心・言語フリー ルール設定エディター（型安全性修正版）

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { GameRule, TriggerCondition, GameAction } from '../../../types/editor/GameScript';

interface VisualRuleEditorProps {
  rule?: GameRule;
  onSave: (rule: GameRule) => void;
  onCancel: () => void;
  availableObjects: Array<{ id: string; name: string }>;
  availableFlags: Array<{ id: string; name: string }>;
}

// 🔧 修正：条件タイプのアイコン・説明（不足していた型を追加）
const CONDITION_TYPES = {
  touch: { icon: '👆', color: 'bg-blue-100 border-blue-300' },
  time: { icon: '⏰', color: 'bg-green-100 border-green-300' },
  collision: { icon: '💥', color: 'bg-red-100 border-red-300' },
  flag: { icon: '🚩', color: 'bg-purple-100 border-purple-300' },
  animation: { icon: '🎬', color: 'bg-yellow-100 border-yellow-300' },
  position: { icon: '📍', color: 'bg-pink-100 border-pink-300' },
  // 🔧 追加：不足していた型
  gameState: { icon: '🎮', color: 'bg-orange-100 border-orange-300' }
} as const;

// 🔧 修正：アクションタイプのアイコン・説明（不足していた型を追加）
const ACTION_TYPES = {
  addScore: { icon: '⭐', color: 'bg-yellow-100 border-yellow-300' },
  success: { icon: '🎉', color: 'bg-green-100 border-green-300' },
  failure: { icon: '💔', color: 'bg-red-100 border-red-300' },
  setFlag: { icon: '🏳️', color: 'bg-purple-100 border-purple-300' },
  playSound: { icon: '🔊', color: 'bg-blue-100 border-blue-300' },
  showMessage: { icon: '💬', color: 'bg-gray-100 border-gray-300' },
  hide: { icon: '👻', color: 'bg-gray-100 border-gray-300' },
  show: { icon: '👁️', color: 'bg-blue-100 border-blue-300' },
  // 🔧 追加：不足していた型
  move: { icon: '🏃', color: 'bg-cyan-100 border-cyan-300' },
  pause: { icon: '⏸️', color: 'bg-gray-100 border-gray-300' },
  restart: { icon: '🔄', color: 'bg-blue-100 border-blue-300' },
  stopSound: { icon: '🔇', color: 'bg-red-100 border-red-300' },
  playBGM: { icon: '🎵', color: 'bg-indigo-100 border-indigo-300' },
  stopBGM: { icon: '🔇', color: 'bg-red-100 border-red-300' },
  toggleFlag: { icon: '🔄', color: 'bg-purple-100 border-purple-300' },
  switchAnimation: { icon: '🎬', color: 'bg-yellow-100 border-yellow-300' },
  effect: { icon: '✨', color: 'bg-pink-100 border-pink-300' }
} as const;

export const VisualRuleEditor: React.FC<VisualRuleEditorProps> = ({
  rule,
  onSave,
  onCancel,
  availableObjects,
  availableFlags
}) => {
  const { t } = useTranslation();

  // 条件タイプの名前を取得
  const getConditionTypeName = (type: keyof typeof CONDITION_TYPES): string => {
    const typeMap: Record<keyof typeof CONDITION_TYPES, string> = {
      touch: t('conditions.touch'),
      time: t('conditions.time'),
      collision: t('conditions.collision'),
      flag: t('conditions.flag'),
      animation: t('conditions.animation'),
      position: t('conditions.position'),
      gameState: t('conditions.gameState')
    };
    return typeMap[type];
  };

  // アクションタイプの名前を取得
  const getActionTypeName = (type: keyof typeof ACTION_TYPES): string => {
    const typeMap: Record<keyof typeof ACTION_TYPES, string> = {
      addScore: t('actions.addScore'),
      success: t('actions.success'),
      failure: t('actions.failure'),
      setFlag: t('actions.setFlag'),
      playSound: t('actions.playSound'),
      showMessage: t('actions.showMessage'),
      hide: t('actions.hide'),
      show: t('actions.show'),
      move: t('actions.move'),
      pause: t('actions.pause'),
      restart: t('actions.restart'),
      stopSound: t('actions.stopSound'),
      playBGM: t('actions.playBGM'),
      stopBGM: t('actions.stopBGM'),
      toggleFlag: t('actions.toggleFlag'),
      switchAnimation: t('actions.switchAnimation'),
      effect: t('actions.effect')
    };
    return typeMap[type];
  };

  // ルール状態管理
  const [ruleName, setRuleName] = useState(rule?.name || '');
  const [targetObjectId, setTargetObjectId] = useState(rule?.targetObjectId || 'stage');
  const [priority, setPriority] = useState(rule?.priority || 50);
  const [operator, setOperator] = useState<'AND' | 'OR'>(rule?.triggers?.operator || 'AND');
  const [conditions, setConditions] = useState<TriggerCondition[]>(rule?.triggers?.conditions || []);
  const [actions, setActions] = useState<GameAction[]>(rule?.actions || []);

  // 条件追加
  const addCondition = useCallback((type: keyof typeof CONDITION_TYPES) => {
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
          seconds: 1
        };
        break;
      case 'flag':
        newCondition = {
          type: 'flag',
          flagId: availableFlags[0]?.id || 'flag1',
          condition: 'ON'
        };
        break;
      case 'collision':
        newCondition = {
          type: 'collision',
          target: 'stage',
          collisionType: 'enter',
          checkMode: 'hitbox'
        };
        break;
      case 'animation':
        newCondition = {
          type: 'animation',
          target: 'self',
          condition: 'end'
        };
        break;
      case 'position':
        newCondition = {
          type: 'position',
          target: 'self',
          area: 'inside',
          region: {
            shape: 'rect',
            x: 0.5,
            y: 0.5,
            width: 0.3,
            height: 0.3
          }
        };
        break;
      case 'gameState':
        newCondition = {
          type: 'gameState',
          state: 'playing',
          checkType: 'is'
        };
        break;
      default:
        newCondition = {
          type: 'touch',
          target: 'self',
          touchType: 'down'
        };
    }
    
    setConditions(prev => [...prev, newCondition]);
  }, [availableFlags]);

  // アクション追加
  const addAction = useCallback((type: keyof typeof ACTION_TYPES) => {
    let newAction: GameAction;
    
    switch (type) {
      case 'addScore':
        newAction = { type: 'addScore', points: 10 };
        break;
      case 'success':
        newAction = { type: 'success', score: 100, message: t('editor.script.greatJob') };
        break;
      case 'failure':
        newAction = { type: 'failure', message: t('editor.script.tooBad') };
        break;
      case 'setFlag':
        newAction = { type: 'setFlag', flagId: availableFlags[0]?.id || 'flag1', value: true };
        break;
      case 'playSound':
        newAction = { type: 'playSound', soundId: 'sound1', volume: 0.8 };
        break;
      case 'showMessage':
        newAction = { type: 'showMessage', text: t('editor.script.messageText'), duration: 2 };
        break;
      case 'move':
        newAction = { 
          type: 'move', 
          targetId: 'self', 
          movement: { 
            type: 'straight', 
            target: { x: 0.5, y: 0.5 }, 
            speed: 100, 
            duration: 1 
          } 
        };
        break;
      case 'hide':
        newAction = { type: 'hide', targetId: 'self' };
        break;
      case 'show':
        newAction = { type: 'show', targetId: 'self' };
        break;
      default:
        newAction = { type: 'addScore', points: 10 };
    }
    
    setActions(prev => [...prev, newAction]);
  }, [availableFlags, t]);

  // 条件削除
  const removeCondition = useCallback((index: number) => {
    setConditions(prev => prev.filter((_, i) => i !== index));
  }, []);

  // アクション削除
  const removeAction = useCallback((index: number) => {
    setActions(prev => prev.filter((_, i) => i !== index));
  }, []);

  // 🔧 修正：条件更新（型安全版）
  const updateCondition = useCallback((index: number, updates: Partial<TriggerCondition>) => {
    setConditions(prev => prev.map((condition, i) => {
      if (i === index) {
        // 型安全な更新：元の条件の型を保持
        return { ...condition, ...updates } as TriggerCondition;
      }
      return condition;
    }));
  }, []);

  // 🔧 修正：アクション更新（型安全版）
  const updateAction = useCallback((index: number, updates: Partial<GameAction>) => {
    setActions(prev => prev.map((action, i) => {
      if (i === index) {
        // 型安全な更新：元のアクションの型を保持
        return { ...action, ...updates } as GameAction;
      }
      return action;
    }));
  }, []);

  // 保存
  const handleSave = useCallback(() => {
    if (!ruleName.trim()) {
      alert(t('editor.script.pleaseEnterRuleName'));
      return;
    }

    if (!conditions.length) {
      alert(t('editor.script.pleaseAddCondition'));
      return;
    }

    if (!actions.length) {
      alert(t('editor.script.pleaseAddAction'));
      return;
    }

    const newRule: GameRule = {
      id: rule?.id || `rule_${Date.now()}`,
      name: ruleName,
      enabled: true,
      priority,
      targetObjectId,
      triggers: {
        operator,
        conditions
      },
      actions,
      createdAt: rule?.createdAt || new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    onSave(newRule);
  }, [ruleName, targetObjectId, priority, operator, conditions, actions, rule, onSave, t]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-lg">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            🎯 {t('editor.script.ruleSetting')}
            <span className="text-lg font-normal opacity-80">
              {rule ? t('editor.script.edit') : t('editor.script.create')}
            </span>
          </h2>
          <p className="mt-2 opacity-90">
            {t('editor.script.ruleEditorHelp')}
          </p>
        </div>

        <div className="p-6 space-y-8">
          
          {/* 基本設定 */}
          <section>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              ⚙️ {t('editor.script.basicSettings')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('editor.script.ruleName')} *
                </label>
                <input
                  type="text"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder={t('editor.script.ruleNamePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('editor.script.targetObject')}
                </label>
                <select
                  value={targetObjectId}
                  onChange={(e) => setTargetObjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="stage">🌟 {t('editor.script.gameOverall')}</option>
                  {availableObjects.map(obj => (
                    <option key={obj.id} value={obj.id}>
                      📦 {obj.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('editor.script.priority')} (0-100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </section>

          {/* IF条件設定 */}
          <section>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              🔍 {t('editor.script.ifConditions')}
            </h3>

            {/* 条件の組み合わせ方法 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('editor.script.conditionCombination')}
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setOperator('AND')}
                  className={`px-4 py-2 rounded-lg border-2 transition-all ${
                    operator === 'AND'
                      ? 'bg-blue-100 border-blue-500 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  🔗 {t('editor.script.allConditions')}
                </button>
                <button
                  onClick={() => setOperator('OR')}
                  className={`px-4 py-2 rounded-lg border-2 transition-all ${
                    operator === 'OR'
                      ? 'bg-blue-100 border-blue-500 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  🌈 {t('editor.script.anyCondition')}
                </button>
              </div>
            </div>

            {/* 条件追加ボタン */}
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 mb-2">
                {t('editor.script.addCondition')}
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(CONDITION_TYPES).map(([type, config]) => (
                  <button
                    key={type}
                    onClick={() => addCondition(type as keyof typeof CONDITION_TYPES)}
                    className={`px-3 py-2 rounded-lg border-2 transition-all hover:scale-105 ${config.color}`}
                  >
                    <span className="text-xl">{config.icon}</span>
                    <span className="ml-1 text-sm font-medium">{getConditionTypeName(type as keyof typeof CONDITION_TYPES)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 設定済み条件リスト */}
            <div className="space-y-3">
              {conditions.map((condition, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">
                        {/* 🔧 修正：安全なオブジェクトアクセス */}
                        {CONDITION_TYPES[condition.type as keyof typeof CONDITION_TYPES]?.icon || '❓'}
                      </span>
                      <span className="font-medium">
                        {/* 🔧 修正：安全なオブジェクトアクセス */}
                        {getConditionTypeName(condition.type as keyof typeof CONDITION_TYPES)} {t('editor.script.condition')}
                      </span>
                    </div>
                    <button
                      onClick={() => removeCondition(index)}
                      className="text-red-500 hover:text-red-700 px-2 py-1 rounded"
                    >
                      🗑️
                    </button>
                  </div>
                  
                  {/* 条件詳細設定 */}
                  {condition.type === 'touch' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">{t('editor.script.target')}</label>
                        <select
                          value={condition.target}
                          onChange={(e) => updateCondition(index, { target: e.target.value })}
                          className="w-full px-2 py-1 border rounded text-sm"
                        >
                          <option value="self">{t('editor.script.self')}</option>
                          <option value="stage">{t('editor.script.screen')}</option>
                          {availableObjects.map(obj => (
                            <option key={obj.id} value={obj.id}>{obj.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">{t('editor.script.touchType')}</label>
                        <select
                          value={condition.touchType}
                          onChange={(e) => updateCondition(index, { touchType: e.target.value as any })}
                          className="w-full px-2 py-1 border rounded text-sm"
                        >
                          <option value="down">{t('editor.script.onPress')}</option>
                          <option value="up">{t('editor.script.onRelease')}</option>
                          <option value="hold">{t('editor.script.onHold')}</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {condition.type === 'time' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">{t('editor.script.timeType')}</label>
                        <select
                          value={condition.timeType}
                          onChange={(e) => updateCondition(index, { timeType: e.target.value as any })}
                          className="w-full px-2 py-1 border rounded text-sm"
                        >
                          <option value="exact">{t('editor.script.exactTime')}</option>
                          <option value="range">{t('editor.script.timeRange')}</option>
                          <option value="interval">{t('editor.script.interval')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">{t('editor.script.seconds')}</label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={condition.seconds || 0}
                          onChange={(e) => updateCondition(index, { seconds: parseFloat(e.target.value) })}
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {condition.type === 'flag' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">{t('editor.script.flag')}</label>
                        <select
                          value={condition.flagId}
                          onChange={(e) => updateCondition(index, { flagId: e.target.value })}
                          className="w-full px-2 py-1 border rounded text-sm"
                        >
                          {availableFlags.map(flag => (
                            <option key={flag.id} value={flag.id}>{flag.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">{t('editor.script.condition')}</label>
                        <select
                          value={condition.condition}
                          onChange={(e) => updateCondition(index, { condition: e.target.value as any })}
                          className="w-full px-2 py-1 border rounded text-sm"
                        >
                          <option value="ON">{t('editor.script.whenOn')}</option>
                          <option value="OFF">{t('editor.script.whenOff')}</option>
                          <option value="CHANGED">{t('editor.script.whenChanged')}</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {conditions.length === 0 && (
                <div className="text-center text-gray-500 py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <div className="text-4xl mb-2">🔍</div>
                  <div>{t('editor.script.addConditionFromButtons')}</div>
                </div>
              )}
            </div>
          </section>

          {/* THENアクション設定 */}
          <section>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              ⚡ {t('editor.script.thenActions')}
            </h3>

            {/* アクション追加ボタン */}
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 mb-2">
                {t('editor.script.addAction')}
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(ACTION_TYPES).map(([type, config]) => (
                  <button
                    key={type}
                    onClick={() => addAction(type as keyof typeof ACTION_TYPES)}
                    className={`px-3 py-2 rounded-lg border-2 transition-all hover:scale-105 ${config.color}`}
                  >
                    <span className="text-xl">{config.icon}</span>
                    <span className="ml-1 text-sm font-medium">{getActionTypeName(type as keyof typeof ACTION_TYPES)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 設定済みアクションリスト */}
            <div className="space-y-3">
              {actions.map((action, index) => (
                <div key={index} className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">
                        {/* 🔧 修正：安全なオブジェクトアクセス */}
                        {ACTION_TYPES[action.type as keyof typeof ACTION_TYPES]?.icon || '❓'}
                      </span>
                      <span className="font-medium">
                        {/* 🔧 修正：安全なオブジェクトアクセス */}
                        {getActionTypeName(action.type as keyof typeof ACTION_TYPES)} {t('editor.script.action')}
                      </span>
                    </div>
                    <button
                      onClick={() => removeAction(index)}
                      className="text-red-500 hover:text-red-700 px-2 py-1 rounded"
                    >
                      🗑️
                    </button>
                  </div>
                  
                  {/* アクション詳細設定 */}
                  {action.type === 'addScore' && (
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">{t('editor.script.points')}</label>
                      <input
                        type="number"
                        value={action.points}
                        onChange={(e) => updateAction(index, { points: parseInt(e.target.value) })}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                  )}

                  {action.type === 'showMessage' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">{t('editor.script.message')}</label>
                        <input
                          type="text"
                          value={action.text}
                          onChange={(e) => updateAction(index, { text: e.target.value })}
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">{t('editor.script.displayDuration')}</label>
                        <input
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={action.duration}
                          onChange={(e) => updateAction(index, { duration: parseFloat(e.target.value) })}
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {(action.type === 'success' || action.type === 'failure') && (
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">{t('editor.script.message')}</label>
                      <input
                        type="text"
                        value={action.message || ''}
                        onChange={(e) => updateAction(index, { message: e.target.value })}
                        placeholder={action.type === 'success' ? t('editor.script.congratulations') : t('editor.script.tryAgain')}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                  )}
                </div>
              ))}
              
              {actions.length === 0 && (
                <div className="text-center text-gray-500 py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <div className="text-4xl mb-2">⚡</div>
                  <div>{t('editor.script.addActionFromButtons')}</div>
                </div>
              )}
            </div>
          </section>

          {/* 保存・キャンセルボタン */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              💾 {t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualRuleEditor;