// src/components/editor/script/AdvancedRuleModal.tsx
// 最終版 - パラメータモーダル位置完全修正 + 美しいモダンデザイン

import React, { useState, useEffect } from 'react';
import { GameRule, TriggerCondition, GameAction, GameFlag } from '../../../types/editor/GameScript';
import { GameProject } from '../../../types/editor/GameProject';

interface AdvancedRuleModalProps {
  rule: GameRule;
  project: GameProject;
  onSave: (rule: GameRule) => void;
  onClose: () => void;
}

// 条件ライブラリ
const CONDITION_LIBRARY = [
  { type: 'touch', label: 'タッチ', icon: '👆', color: 'from-blue-500 to-blue-600', params: ['touchType', 'holdDuration'] },
  { type: 'time', label: '時間', icon: '⏰', color: 'from-emerald-500 to-green-600', params: ['timeType', 'seconds', 'range'] },
  { type: 'position', label: '位置', icon: '📍', color: 'from-purple-500 to-indigo-600', params: ['area', 'region'] },
  { type: 'collision', label: '衝突', icon: '💥', color: 'from-red-500 to-rose-600', params: ['target', 'collisionType'] },
  { type: 'animation', label: 'アニメ', icon: '🎬', color: 'from-orange-500 to-amber-600', params: ['frame', 'animationType'] },
  { type: 'flag', label: 'フラグ', icon: '🚩', color: 'from-yellow-500 to-orange-600', params: ['targetFlag', 'flagState'] }
];

// アクションライブラリ
const ACTION_LIBRARY = [
  { type: 'success', label: 'ゲームクリア', icon: '🎉', color: 'from-emerald-500 to-green-600', params: [] },
  { type: 'failure', label: 'ゲームオーバー', icon: '💀', color: 'from-red-500 to-rose-600', params: [] },
  { type: 'playSound', label: '音再生', icon: '🔊', color: 'from-pink-500 to-rose-600', params: ['soundId', 'volume'] },
  { type: 'move', label: '移動', icon: '🏃', color: 'from-cyan-500 to-blue-600', params: ['moveType', 'targetPosition', 'speed'] },
  { type: 'effect', label: 'エフェクト', icon: '✨', color: 'from-violet-500 to-purple-600', params: ['effectType', 'duration', 'intensity'] },
  { type: 'show', label: '表示', icon: '👁️', color: 'from-teal-500 to-cyan-600', params: ['fadeIn', 'duration'] },
  { type: 'hide', label: '非表示', icon: '🫥', color: 'from-slate-500 to-gray-600', params: ['fadeOut', 'duration'] },
  { type: 'setFlag', label: 'フラグ設定', icon: '🚩', color: 'from-amber-500 to-yellow-600', params: ['targetFlag', 'value'] },
  { type: 'switchAnimation', label: 'アニメ変更', icon: '🔄', color: 'from-indigo-500 to-blue-600', params: ['animationIndex'] }
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
  
  // パラメータ編集状態 - 位置修正のための新しい管理方式
  const [editingConditionIndex, setEditingConditionIndex] = useState<number | null>(null);
  const [editingActionIndex, setEditingActionIndex] = useState<number | null>(null);

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
    }
  };

  // フラグ削除
  const removeFlag = (flagId: string) => {
    updateProjectFlags(projectFlags.filter(flag => flag.id !== flagId));
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
  };

  // 条件削除
  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
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
  };

  // アクション削除
  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
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
      alert('ルール名を入力してください');
      return;
    }

    if (conditions.length === 0) {
      alert('最低1つの条件を設定してください');
      return;
    }

    if (actions.length === 0) {
      alert('最低1つのアクションを設定してください');
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
      {/* メインモーダル */}
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col border border-slate-200">
          
          {/* ヘッダー */}
          <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-indigo-600/10"></div>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400"></div>
            
            <div className="relative z-10">
              <h3 className="text-2xl font-bold mb-2 flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">🎯</span>
                </div>
                <span>高度なルール設定</span>
              </h3>
              <p className="text-slate-300 text-sm">
                複数条件・複数アクション・フラグ管理・包括的ゲームロジック設定
              </p>
            </div>
          </div>

          {/* メインコンテンツ */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-8">
              
              {/* 左列: ルール基本設定・条件 */}
              <div className="space-y-6">
                
                {/* ルール名 */}
                <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <span className="text-xl">📝</span>
                    ルール名
                  </label>
                  <input
                    type="text"
                    value={rule.name}
                    onChange={(e) => setRule({ ...rule, name: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm bg-white"
                    placeholder="例: 中央タッチで移動"
                  />
                </div>

                {/* 条件設定 */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-xl font-bold text-blue-800 flex items-center gap-2">
                      <span className="text-2xl">🔥</span>
                      発動条件
                    </h4>
                    <select
                      value={operator}
                      onChange={(e) => setOperator(e.target.value as 'AND' | 'OR')}
                      className="text-sm border border-blue-300 rounded-xl px-4 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="AND">すべて (AND)</option>
                      <option value="OR">いずれか (OR)</option>
                    </select>
                  </div>

                  {/* 既存条件一覧 */}
                  <div className="space-y-3 mb-6">
                    {conditions.map((condition, index) => {
                      const display = getConditionDisplay(condition);
                      return (
                        <div
                          key={index}
                          className="relative group bg-white rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-all duration-200"
                        >
                          <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl group-hover:scale-110 transition-transform duration-200">{display.icon}</span>
                              <div>
                                <div className="font-semibold text-sm text-slate-800">{display.label}</div>
                                <div className="text-xs text-slate-500 mt-1">{display.details}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setEditingConditionIndex(index)}
                                className="text-blue-600 hover:text-blue-700 text-sm px-3 py-2 rounded-lg hover:bg-blue-50 transition-all duration-200 font-medium border border-transparent hover:border-blue-200"
                              >
                                ✏️ 編集
                              </button>
                              <button
                                onClick={() => removeCondition(index)}
                                className="text-red-600 hover:text-red-700 text-sm px-3 py-2 rounded-lg hover:bg-red-50 transition-all duration-200 font-medium border border-transparent hover:border-red-200"
                              >
                                🗑️ 削除
                              </button>
                            </div>
                          </div>
                          
                          {/* 🎯 パラメータ編集エリア - 編集ボタンの真下に表示 */}
                          {editingConditionIndex === index && (
                            <div className="border-t border-blue-200 bg-blue-25 p-4">
                              <div className="bg-white rounded-xl p-4 border border-blue-200 shadow-sm">
                                <h5 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                                  <span>⚙️</span>
                                  条件パラメータ設定
                                </h5>
                                
                                {(() => {
                                  const condition = conditions[index];
                                  
                                  switch (condition.type) {
                                    case 'touch':
                                      return (
                                        <div className="space-y-3">
                                          <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-2">タッチ種類</label>
                                            <select
                                              value={condition.touchType}
                                              onChange={(e) => updateCondition(index, { touchType: e.target.value as any })}
                                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                              <option value="down">👆 タップ</option>
                                              <option value="up">☝️ リリース</option>
                                              <option value="hold">✋ 長押し</option>
                                            </select>
                                          </div>
                                          {condition.touchType === 'hold' && (
                                            <div>
                                              <label className="block text-xs font-medium text-slate-600 mb-2">長押し時間（秒）</label>
                                              <input
                                                type="number"
                                                min="0.5"
                                                max="10"
                                                step="0.5"
                                                value={condition.holdDuration || 1}
                                                onChange={(e) => updateCondition(index, { holdDuration: Number(e.target.value) })}
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                              />
                                            </div>
                                          )}
                                        </div>
                                      );

                                    case 'time':
                                      return (
                                        <div className="space-y-3">
                                          <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-2">時間種類</label>
                                            <select
                                              value={condition.timeType}
                                              onChange={(e) => updateCondition(index, { timeType: e.target.value as any })}
                                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                              <option value="exact">⏰ 正確な時間</option>
                                              <option value="range">📏 時間範囲</option>
                                              <option value="interval">🔄 間隔</option>
                                            </select>
                                          </div>
                                          {condition.timeType === 'exact' && (
                                            <div>
                                              <label className="block text-xs font-medium text-slate-600 mb-2">秒数</label>
                                              <select
                                                value={condition.seconds || 3}
                                                onChange={(e) => updateCondition(index, { seconds: Number(e.target.value) })}
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                              >
                                                <option value={1}>1秒後</option>
                                                <option value={2}>2秒後</option>
                                                <option value={3}>3秒後</option>
                                                <option value={5}>5秒後</option>
                                                <option value={10}>10秒後</option>
                                              </select>
                                            </div>
                                          )}
                                        </div>
                                      );

                                    case 'position':
                                      return (
                                        <div className="space-y-3">
                                          <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-2">エリア判定</label>
                                            <select
                                              value={condition.area}
                                              onChange={(e) => updateCondition(index, { area: e.target.value as any })}
                                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                              <option value="inside">🎯 エリア内</option>
                                              <option value="outside">🚫 エリア外</option>
                                              <option value="crossing">🚶 エリア通過</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-2">エリア設定</label>
                                            <select
                                              value={`${condition.region.x}-${condition.region.y}`}
                                              onChange={(e) => {
                                                const [x, y] = e.target.value.split('-').map(Number);
                                                const presets = {
                                                  '0.3-0.3': { x: 0.3, y: 0.3, width: 0.4, height: 0.4 },
                                                  '0.2-0.1': { x: 0.2, y: 0.1, width: 0.6, height: 0.2 },
                                                  '0.2-0.7': { x: 0.2, y: 0.7, width: 0.6, height: 0.2 },
                                                  '0.1-0.2': { x: 0.1, y: 0.2, width: 0.2, height: 0.6 },
                                                  '0.7-0.2': { x: 0.7, y: 0.2, width: 0.2, height: 0.6 },
                                                } as any;
                                                const preset = presets[e.target.value] || presets['0.3-0.3'];
                                                updateCondition(index, { 
                                                  region: { shape: 'rect', ...preset }
                                                });
                                              }}
                                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                              <option value="0.3-0.3">🎯 中央エリア</option>
                                              <option value="0.2-0.1">⬆️ 上部エリア</option>
                                              <option value="0.2-0.7">⬇️ 下部エリア</option>
                                              <option value="0.1-0.2">⬅️ 左側エリア</option>
                                              <option value="0.7-0.2">➡️ 右側エリア</option>
                                            </select>
                                          </div>
                                        </div>
                                      );

                                    case 'flag':
                                      return (
                                        <div className="space-y-3">
                                          <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-2">対象フラグ</label>
                                            <select
                                              value={condition.flagId}
                                              onChange={(e) => updateCondition(index, { flagId: e.target.value })}
                                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                              {projectFlags.map(flag => (
                                                <option key={flag.id} value={flag.id}>{flag.name}</option>
                                              ))}
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-2">条件</label>
                                            <select
                                              value={condition.condition}
                                              onChange={(e) => updateCondition(index, { condition: e.target.value as any })}
                                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                              <option value="ON">🟢 ONの時</option>
                                              <option value="OFF">🔴 OFFの時</option>
                                              <option value="CHANGED">🔄 変化した時</option>
                                            </select>
                                          </div>
                                        </div>
                                      );

                                    default:
                                      return <div className="text-center text-slate-500 py-4 text-sm">この条件タイプの設定項目は準備中です</div>;
                                  }
                                })()}
                                
                                <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-200">
                                  <button
                                    onClick={() => setEditingConditionIndex(null)}
                                    className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-all duration-200 font-medium text-slate-700 text-sm"
                                  >
                                    キャンセル
                                  </button>
                                  <button
                                    onClick={() => setEditingConditionIndex(null)}
                                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm font-medium text-sm flex items-center gap-2"
                                  >
                                    <span>✅</span>
                                    適用
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* 条件追加ボタン */}
                  <div className="grid grid-cols-2 gap-3">
                    {CONDITION_LIBRARY.map((conditionType) => (
                      <button
                        key={conditionType.type}
                        onClick={() => addCondition(conditionType.type)}
                        className={`flex items-center gap-3 p-3 rounded-xl border bg-white hover:shadow-lg transition-all duration-200 text-sm font-medium group hover:scale-105 border-slate-200 hover:border-blue-300`}
                      >
                        <span className="text-xl group-hover:scale-110 transition-transform duration-200">{conditionType.icon}</span>
                        <span>{conditionType.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 中央列: アクション設定 */}
              <div className="space-y-6">
                
                {/* アクション設定 */}
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-200 shadow-sm">
                  <h4 className="text-xl font-bold text-emerald-800 mb-6 flex items-center gap-2">
                    <span className="text-2xl">⚡</span>
                    実行アクション
                  </h4>

                  {/* 既存アクション一覧 */}
                  <div className="space-y-3 mb-6">
                    {actions.map((action, index) => {
                      const display = getActionDisplay(action);
                      return (
                        <div
                          key={index}
                          className="relative group bg-white rounded-xl border border-emerald-200 shadow-sm hover:shadow-md transition-all duration-200"
                        >
                          <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl group-hover:scale-110 transition-transform duration-200">{display.icon}</span>
                              <div>
                                <div className="font-semibold text-sm text-slate-800">{display.label}</div>
                                <div className="text-xs text-slate-500 mt-1">{display.details}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setEditingActionIndex(index)}
                                className="text-emerald-600 hover:text-emerald-700 text-sm px-3 py-2 rounded-lg hover:bg-emerald-50 transition-all duration-200 font-medium border border-transparent hover:border-emerald-200"
                              >
                                ✏️ 編集
                              </button>
                              <button
                                onClick={() => removeAction(index)}
                                className="text-red-600 hover:text-red-700 text-sm px-3 py-2 rounded-lg hover:bg-red-50 transition-all duration-200 font-medium border border-transparent hover:border-red-200"
                              >
                                🗑️ 削除
                              </button>
                            </div>
                          </div>
                          
                          {/* 🎯 パラメータ編集エリア - 編集ボタンの真下に表示 */}
                          {editingActionIndex === index && (
                            <div className="border-t border-emerald-200 bg-emerald-25 p-4">
                              <div className="bg-white rounded-xl p-4 border border-emerald-200 shadow-sm">
                                <h5 className="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                                  <span>⚙️</span>
                                  アクションパラメータ設定
                                </h5>
                                
                                {(() => {
                                  const action = actions[index];
                                  
                                  switch (action.type) {
                                    case 'playSound':
                                      return (
                                        <div className="space-y-3">
                                          <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-2">効果音選択</label>
                                            <select
                                              value={action.soundId}
                                              onChange={(e) => updateAction(index, { soundId: e.target.value })}
                                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            >
                                              <option value="">選択してください</option>
                                              {project.assets.audio?.se?.map(sound => (
                                                <option key={sound.id} value={sound.id}>🔊 {sound.name}</option>
                                              )) || []}
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-2">音量</label>
                                            <input
                                              type="range"
                                              min="0"
                                              max="1"
                                              step="0.1"
                                              value={action.volume || 0.8}
                                              onChange={(e) => updateAction(index, { volume: Number(e.target.value) })}
                                              className="w-full accent-emerald-500"
                                            />
                                            <div className="text-xs text-slate-500 text-center mt-1 font-medium">{Math.round((action.volume || 0.8) * 100)}%</div>
                                          </div>
                                        </div>
                                      );

                                    case 'move':
                                      return (
                                        <div className="space-y-3">
                                          <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-2">移動タイプ</label>
                                            <select
                                              value={action.movement.type}
                                              onChange={(e) => updateAction(index, { 
                                                movement: { ...action.movement, type: e.target.value as any }
                                              })}
                                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            >
                                              <option value="straight">➡️ 直線移動</option>
                                              <option value="teleport">⚡ 瞬間移動</option>
                                              <option value="wander">🔄 ランダム移動</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-2">移動先</label>
                                            <select
                                              onChange={(e) => {
                                                const presets = {
                                                  center: { x: 0.5, y: 0.5 },
                                                  top: { x: 0.5, y: 0.2 },
                                                  bottom: { x: 0.5, y: 0.8 },
                                                  left: { x: 0.2, y: 0.5 },
                                                  right: { x: 0.8, y: 0.5 }
                                                } as any;
                                                const target = presets[e.target.value] || { x: 0.5, y: 0.5 };
                                                updateAction(index, { 
                                                  movement: { ...action.movement, target }
                                                });
                                              }}
                                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            >
                                              <option value="center">🎯 中央</option>
                                              <option value="top">⬆️ 上部</option>
                                              <option value="bottom">⬇️ 下部</option>
                                              <option value="left">⬅️ 左側</option>
                                              <option value="right">➡️ 右側</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-2">移動速度</label>
                                            <select
                                              value={action.movement.speed}
                                              onChange={(e) => updateAction(index, { 
                                                movement: { ...action.movement, speed: Number(e.target.value) }
                                              })}
                                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            >
                                              <option value={100}>🐌 ゆっくり</option>
                                              <option value={300}>🚶 普通</option>
                                              <option value={600}>🏃 早い</option>
                                              <option value={1000}>⚡ 超高速</option>
                                            </select>
                                          </div>
                                        </div>
                                      );

                                    case 'setFlag':
                                      return (
                                        <div className="space-y-3">
                                          <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-2">対象フラグ</label>
                                            <select
                                              value={action.flagId}
                                              onChange={(e) => updateAction(index, { flagId: e.target.value })}
                                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            >
                                              {projectFlags.map(flag => (
                                                <option key={flag.id} value={flag.id}>{flag.name}</option>
                                              ))}
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-2">設定値</label>
                                            <select
                                              value={action.value ? 'true' : 'false'}
                                              onChange={(e) => updateAction(index, { value: e.target.value === 'true' })}
                                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            >
                                              <option value="true">🟢 ON</option>
                                              <option value="false">🔴 OFF</option>
                                            </select>
                                          </div>
                                        </div>
                                      );

                                    default:
                                      return <div className="text-center text-slate-500 py-4 text-sm">このアクションタイプの設定項目は準備中です</div>;
                                  }
                                })()}
                                
                                <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-200">
                                  <button
                                    onClick={() => setEditingActionIndex(null)}
                                    className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-all duration-200 font-medium text-slate-700 text-sm"
                                  >
                                    キャンセル
                                  </button>
                                  <button
                                    onClick={() => setEditingActionIndex(null)}
                                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 shadow-sm font-medium text-sm flex items-center gap-2"
                                  >
                                    <span>✅</span>
                                    適用
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* アクション追加ボタン */}
                  <div className="grid grid-cols-2 gap-3">
                    {ACTION_LIBRARY.map((actionType) => (
                      <button
                        key={actionType.type}
                        onClick={() => addAction(actionType.type)}
                        className={`flex items-center gap-3 p-3 rounded-xl border bg-white hover:shadow-lg transition-all duration-200 text-sm font-medium group hover:scale-105 border-slate-200 hover:border-emerald-300`}
                      >
                        <span className="text-xl group-hover:scale-110 transition-transform duration-200">{actionType.icon}</span>
                        <span>{actionType.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 右列: フラグ管理・プレビュー */}
              <div className="space-y-6">
                
                {/* フラグ管理 */}
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-6 border border-amber-200 shadow-sm">
                  <h4 className="text-xl font-bold text-amber-800 mb-6 flex items-center gap-2">
                    <span className="text-2xl">🚩</span>
                    フラグ管理
                  </h4>

                  {/* 新規フラグ追加 */}
                  <div className="flex gap-3 mb-6">
                    <input
                      type="text"
                      value={newFlagName}
                      onChange={(e) => setNewFlagName(e.target.value)}
                      placeholder="フラグ名を入力"
                      className="flex-1 px-4 py-2 text-sm border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm bg-white"
                    />
                    <button
                      onClick={addFlag}
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-xl text-sm hover:from-amber-600 hover:to-yellow-600 transition-all shadow-sm font-medium"
                    >
                      ➕ 追加
                    </button>
                  </div>

                  {/* 既存フラグ一覧 */}
                  <div className="space-y-3">
                    {projectFlags.map((flag) => (
                      <div
                        key={flag.id}
                        className="flex items-center justify-between p-4 bg-white rounded-xl border border-amber-200 shadow-sm hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleFlagInitialValue(flag.id)}
                            className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                              flag.initialValue
                                ? 'bg-green-500 border-green-500 text-white shadow-md hover:bg-green-600'
                                : 'bg-slate-200 border-slate-400 text-slate-600 shadow-sm hover:bg-slate-300'
                            }`}
                          >
                            {flag.initialValue ? 'ON' : 'OFF'}
                          </button>
                          <span className="text-sm font-semibold text-slate-800">{flag.name}</span>
                        </div>
                        <button
                          onClick={() => removeFlag(flag.id)}
                          className="text-red-500 hover:text-red-700 text-sm px-3 py-2 rounded-lg hover:bg-red-50 transition-all duration-200 font-medium border border-transparent hover:border-red-200"
                        >
                          🗑️ 削除
                        </button>
                      </div>
                    ))}
                  </div>

                  {projectFlags.length === 0 && (
                    <div className="text-center text-slate-500 py-8 text-sm bg-white rounded-xl border-2 border-dashed border-amber-200">
                      <div className="text-3xl mb-2">🚩</div>
                      フラグを追加してゲーム状態を管理
                    </div>
                  )}
                </div>

                {/* ルールプレビュー */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-200 shadow-sm">
                  <h4 className="text-xl font-bold text-indigo-800 mb-6 flex items-center gap-2">
                    <span className="text-2xl">📋</span>
                    ルールプレビュー
                  </h4>
                  
                  {conditions.length > 0 && actions.length > 0 ? (
                    <div className="space-y-4">
                      {/* 条件部分 */}
                      <div className="bg-white rounded-xl p-4 border border-indigo-200 shadow-sm">
                        <div className="text-sm font-semibold text-indigo-700 mb-3 flex items-center gap-2">
                          <span className="text-lg">🔥</span>
                          {operator === 'AND' ? 'すべての条件' : 'いずれかの条件'}が満たされたとき
                        </div>
                        <div className="space-y-2">
                          {conditions.map((condition, index) => {
                            const display = getConditionDisplay(condition);
                            return (
                              <div key={index} className="flex items-center gap-3 text-sm text-slate-700 p-3 bg-blue-50 rounded-lg">
                                <span className="text-lg">{display.icon}</span>
                                <span className="font-medium">{display.label}:</span>
                                <span>{display.details}</span>
                                {index < conditions.length - 1 && (
                                  <span className="text-indigo-500 font-bold ml-auto px-2 py-1 bg-indigo-100 rounded-md text-xs">
                                    {operator}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* アクション部分 */}
                      <div className="bg-white rounded-xl p-4 border border-indigo-200 shadow-sm">
                        <div className="text-sm font-semibold text-indigo-700 mb-3 flex items-center gap-2">
                          <span className="text-lg">⚡</span>
                          以下のアクションを実行
                        </div>
                        <div className="space-y-2">
                          {actions.map((action, index) => {
                            const display = getActionDisplay(action);
                            return (
                              <div key={index} className="flex items-center gap-3 text-sm text-slate-700 p-3 bg-green-50 rounded-lg">
                                <span className="text-lg">{display.icon}</span>
                                <span className="font-medium">{display.label}:</span>
                                <span>{display.details}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-slate-500 py-8 text-sm bg-white rounded-xl border-2 border-dashed border-indigo-200">
                      <div className="text-3xl mb-3">🎯</div>
                      <div className="font-medium mb-1">条件とアクションを設定してください</div>
                      <div className="text-xs text-slate-400">ルールが完成するとここにプレビューが表示されます</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* フッター */}
          <div className="border-t border-slate-200 bg-slate-50 p-6 flex justify-between items-center">
            <div className="text-sm text-slate-600 flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-400 rounded-full"></span>
                <span>条件 {conditions.length}個</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-emerald-400 rounded-full"></span>
                <span>アクション {actions.length}個</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-amber-400 rounded-full"></span>
                <span>フラグ {projectFlags.length}個</span>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="px-6 py-3 border border-slate-300 rounded-xl hover:bg-slate-50 transition-all duration-200 font-medium text-slate-700 hover:border-slate-400"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-3 bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-xl hover:from-slate-800 hover:to-slate-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg font-medium flex items-center gap-2"
                disabled={conditions.length === 0 || actions.length === 0}
              >
                <span>💾</span>
                保存
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};