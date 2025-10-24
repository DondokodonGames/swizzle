// src/components/editor/modals/VisualRuleEditor.tsx
// アイコン中心・言語フリー ルール設定エディター（型安全性修正版）

import React, { useState, useCallback } from 'react';
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
  touch: { icon: '👆', name: 'タッチ', color: 'bg-blue-100 border-blue-300' },
  time: { icon: '⏰', name: '時間', color: 'bg-green-100 border-green-300' },
  collision: { icon: '💥', name: '衝突', color: 'bg-red-100 border-red-300' },
  flag: { icon: '🚩', name: 'フラグ', color: 'bg-purple-100 border-purple-300' },
  animation: { icon: '🎬', name: 'アニメ', color: 'bg-yellow-100 border-yellow-300' },
  position: { icon: '📍', name: '位置', color: 'bg-pink-100 border-pink-300' },
  // 🔧 追加：不足していた型
  gameState: { icon: '🎮', name: 'ゲーム状態', color: 'bg-orange-100 border-orange-300' }
} as const;

// 🔧 修正：アクションタイプのアイコン・説明（不足していた型を追加）
const ACTION_TYPES = {
  addScore: { icon: '⭐', name: '得点', color: 'bg-yellow-100 border-yellow-300' },
  success: { icon: '🎉', name: '成功', color: 'bg-green-100 border-green-300' },
  failure: { icon: '💔', name: '失敗', color: 'bg-red-100 border-red-300' },
  setFlag: { icon: '🏳️', name: 'フラグ', color: 'bg-purple-100 border-purple-300' },
  playSound: { icon: '🔊', name: '音再生', color: 'bg-blue-100 border-blue-300' },
  showMessage: { icon: '💬', name: 'メッセージ', color: 'bg-gray-100 border-gray-300' },
  hide: { icon: '👻', name: '非表示', color: 'bg-gray-100 border-gray-300' },
  show: { icon: '👁️', name: '表示', color: 'bg-blue-100 border-blue-300' },
  // 🔧 追加：不足していた型
  move: { icon: '🏃', name: '移動', color: 'bg-cyan-100 border-cyan-300' },
  pause: { icon: '⏸️', name: '一時停止', color: 'bg-gray-100 border-gray-300' },
  restart: { icon: '🔄', name: '再開', color: 'bg-blue-100 border-blue-300' },
  stopSound: { icon: '🔇', name: '音停止', color: 'bg-red-100 border-red-300' },
  playBGM: { icon: '🎵', name: 'BGM再生', color: 'bg-indigo-100 border-indigo-300' },
  stopBGM: { icon: '🔇', name: 'BGM停止', color: 'bg-red-100 border-red-300' },
  toggleFlag: { icon: '🔄', name: 'フラグ切替', color: 'bg-purple-100 border-purple-300' },
  switchAnimation: { icon: '🎬', name: 'アニメ変更', color: 'bg-yellow-100 border-yellow-300' },
  effect: { icon: '✨', name: 'エフェクト', color: 'bg-pink-100 border-pink-300' }
} as const;

export const VisualRuleEditor: React.FC<VisualRuleEditorProps> = ({
  rule,
  onSave,
  onCancel,
  availableObjects,
  availableFlags
}) => {
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
        newAction = { type: 'success', score: 100, message: 'やったね！' };
        break;
      case 'failure':
        newAction = { type: 'failure', message: 'ざんねん...' };
        break;
      case 'setFlag':
        newAction = { type: 'setFlag', flagId: availableFlags[0]?.id || 'flag1', value: true };
        break;
      case 'playSound':
        newAction = { type: 'playSound', soundId: 'sound1', volume: 0.8 };
        break;
      case 'showMessage':
        newAction = { type: 'showMessage', text: 'メッセージ', duration: 2 };
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
  }, [availableFlags]);

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
      alert('ルール名を入力してください');
      return;
    }

    if (!conditions.length) {
      alert('最低1つの条件を設定してください');
      return;
    }

    if (!actions.length) {
      alert('最低1つのアクションを設定してください');
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
  }, [ruleName, targetObjectId, priority, operator, conditions, actions, rule, onSave]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-lg">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            🎯 ルール設定
            <span className="text-lg font-normal opacity-80">
              {rule ? '編集' : '新規作成'}
            </span>
          </h2>
          <p className="mt-2 opacity-90">
            アイコンを使って簡単にゲームのルールを作ろう！
          </p>
        </div>

        <div className="p-6 space-y-8">
          
          {/* 基本設定 */}
          <section>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              ⚙️ 基本設定
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ルール名 *
                </label>
                <input
                  type="text"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="例: 星をタッチで得点"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  対象オブジェクト
                </label>
                <select
                  value={targetObjectId}
                  onChange={(e) => setTargetObjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="stage">🌟 ゲーム全体</option>
                  {availableObjects.map(obj => (
                    <option key={obj.id} value={obj.id}>
                      📦 {obj.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  優先度 (0-100)
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
              🔍 IF - 条件設定
            </h3>
            
            {/* 条件の組み合わせ方法 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                条件の組み合わせ方法
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
                  🔗 すべて満たす (AND)
                </button>
                <button
                  onClick={() => setOperator('OR')}
                  className={`px-4 py-2 rounded-lg border-2 transition-all ${
                    operator === 'OR' 
                      ? 'bg-blue-100 border-blue-500 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  🌈 どれか満たす (OR)
                </button>
              </div>
            </div>

            {/* 条件追加ボタン */}
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 mb-2">
                条件を追加
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(CONDITION_TYPES).map(([type, config]) => (
                  <button
                    key={type}
                    onClick={() => addCondition(type as keyof typeof CONDITION_TYPES)}
                    className={`px-3 py-2 rounded-lg border-2 transition-all hover:scale-105 ${config.color}`}
                  >
                    <span className="text-xl">{config.icon}</span>
                    <span className="ml-1 text-sm font-medium">{config.name}</span>
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
                        {CONDITION_TYPES[condition.type as keyof typeof CONDITION_TYPES]?.name || condition.type} 条件
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
                        <label className="block text-sm text-gray-600 mb-1">対象</label>
                        <select
                          value={condition.target}
                          onChange={(e) => updateCondition(index, { target: e.target.value })}
                          className="w-full px-2 py-1 border rounded text-sm"
                        >
                          <option value="self">自分</option>
                          <option value="stage">画面</option>
                          {availableObjects.map(obj => (
                            <option key={obj.id} value={obj.id}>{obj.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">タッチタイプ</label>
                        <select
                          value={condition.touchType}
                          onChange={(e) => updateCondition(index, { touchType: e.target.value as any })}
                          className="w-full px-2 py-1 border rounded text-sm"
                        >
                          <option value="down">押した時</option>
                          <option value="up">離した時</option>
                          <option value="hold">長押し</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {condition.type === 'time' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">時間タイプ</label>
                        <select
                          value={condition.timeType}
                          onChange={(e) => updateCondition(index, { timeType: e.target.value as any })}
                          className="w-full px-2 py-1 border rounded text-sm"
                        >
                          <option value="exact">正確な時間</option>
                          <option value="range">時間範囲</option>
                          <option value="interval">繰り返し</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">秒数</label>
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
                        <label className="block text-sm text-gray-600 mb-1">フラグ</label>
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
                        <label className="block text-sm text-gray-600 mb-1">条件</label>
                        <select
                          value={condition.condition}
                          onChange={(e) => updateCondition(index, { condition: e.target.value as any })}
                          className="w-full px-2 py-1 border rounded text-sm"
                        >
                          <option value="ON">ONの時</option>
                          <option value="OFF">OFFの時</option>
                          <option value="CHANGED">変化した時</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {conditions.length === 0 && (
                <div className="text-center text-gray-500 py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <div className="text-4xl mb-2">🔍</div>
                  <div>上のボタンから条件を追加してください</div>
                </div>
              )}
            </div>
          </section>

          {/* THENアクション設定 */}
          <section>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              ⚡ THEN - アクション設定
            </h3>
            
            {/* アクション追加ボタン */}
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 mb-2">
                アクションを追加
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(ACTION_TYPES).map(([type, config]) => (
                  <button
                    key={type}
                    onClick={() => addAction(type as keyof typeof ACTION_TYPES)}
                    className={`px-3 py-2 rounded-lg border-2 transition-all hover:scale-105 ${config.color}`}
                  >
                    <span className="text-xl">{config.icon}</span>
                    <span className="ml-1 text-sm font-medium">{config.name}</span>
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
                        {ACTION_TYPES[action.type as keyof typeof ACTION_TYPES]?.name || action.type} アクション
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
                      <label className="block text-sm text-gray-600 mb-1">得点</label>
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
                        <label className="block text-sm text-gray-600 mb-1">メッセージ</label>
                        <input
                          type="text"
                          value={action.text}
                          onChange={(e) => updateAction(index, { text: e.target.value })}
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">表示時間(秒)</label>
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
                      <label className="block text-sm text-gray-600 mb-1">メッセージ</label>
                      <input
                        type="text"
                        value={action.message || ''}
                        onChange={(e) => updateAction(index, { message: e.target.value })}
                        placeholder={action.type === 'success' ? 'おめでとう！' : 'もう一度がんばろう！'}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                  )}
                </div>
              ))}
              
              {actions.length === 0 && (
                <div className="text-center text-gray-500 py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <div className="text-4xl mb-2">⚡</div>
                  <div>上のボタンからアクションを追加してください</div>
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
              キャンセル
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              💾 保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualRuleEditor;