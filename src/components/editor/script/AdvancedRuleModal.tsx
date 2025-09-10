// src/components/editor/script/AdvancedRuleModal.tsx
// 最終版包括的ルール設定モーダル - 構文エラー修正版

import React, { useState, useEffect } from 'react';
import { GameRule, TriggerCondition, GameAction, GameFlag } from '../../../types/editor/GameScript';
import { GameProject } from '../../../types/editor/GameProject';

interface AdvancedRuleModalProps {
  rule: GameRule;
  project: GameProject;
  onSave: (rule: GameRule) => void;
  onClose: () => void;
}

// 条件ライブラリ（包括版）
const CONDITION_LIBRARY = [
  { type: 'touch', label: 'タッチ', icon: '👆', color: 'bg-blue-50 border-blue-200', params: ['touchType', 'holdDuration'] },
  { type: 'time', label: '時間', icon: '⏰', color: 'bg-green-50 border-green-200', params: ['timeType', 'seconds', 'range'] },
  { type: 'position', label: '位置', icon: '📍', color: 'bg-purple-50 border-purple-200', params: ['area', 'region'] },
  { type: 'collision', label: '衝突', icon: '💥', color: 'bg-red-50 border-red-200', params: ['target', 'collisionType'] },
  { type: 'animation', label: 'アニメ', icon: '🎬', color: 'bg-orange-50 border-orange-200', params: ['condition', 'frameNumber'] },
  { type: 'flag', label: 'フラグ', icon: '🚩', color: 'bg-yellow-50 border-yellow-200', params: ['flagId', 'condition'] },
] as const;

// アクションライブラリ（スコア・メッセージ削除版）
const ACTION_LIBRARY = [
  { type: 'success', label: 'ゲームクリア', icon: '🎉', color: 'bg-emerald-50 border-emerald-200', params: [] },
  { type: 'failure', label: 'ゲームオーバー', icon: '💀', color: 'bg-rose-50 border-rose-200', params: [] },
  { type: 'playSound', label: '音再生', icon: '🔊', color: 'bg-indigo-50 border-indigo-200', params: ['soundId', 'volume'] },
  { type: 'move', label: '移動', icon: '🏃', color: 'bg-cyan-50 border-cyan-200', params: ['movement'] },
  { type: 'effect', label: 'エフェクト', icon: '✨', color: 'bg-yellow-50 border-yellow-200', params: ['effect'] },
  { type: 'show', label: '表示', icon: '👁️', color: 'bg-teal-50 border-teal-200', params: ['fadeIn', 'duration'] },
  { type: 'hide', label: '非表示', icon: '🫥', color: 'bg-gray-50 border-gray-200', params: ['fadeOut', 'duration'] },
  { type: 'setFlag', label: 'フラグ設定', icon: '🚩', color: 'bg-yellow-50 border-yellow-200', params: ['flagId', 'value'] },
  { type: 'switchAnimation', label: 'アニメ変更', icon: '🔄', color: 'bg-orange-50 border-orange-200', params: ['animationIndex'] },
] as const;

export const AdvancedRuleModal: React.FC<AdvancedRuleModalProps> = ({ rule: initialRule, project, onSave, onClose }) => {
  const [rule, setRule] = useState<GameRule>(initialRule);
  const [conditions, setConditions] = useState<TriggerCondition[]>(initialRule.triggers.conditions);
  const [actions, setActions] = useState<GameAction[]>(initialRule.actions);
  const [operator, setOperator] = useState<'AND' | 'OR'>(initialRule.triggers.operator);
  
  // フラグ管理状態
  const [projectFlags, setProjectFlags] = useState<GameFlag[]>(project.script?.flags || []);
  const [newFlagName, setNewFlagName] = useState('');
  
  // 選択中の条件・アクション編集状態
  const [editingConditionIndex, setEditingConditionIndex] = useState<number | null>(null);
  const [editingActionIndex, setEditingActionIndex] = useState<number | null>(null);

  // プロジェクトフラグ更新
  const updateProjectFlags = (flags: GameFlag[]) => {
    setProjectFlags(flags);
    // プロジェクト更新は保存時に実行
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
      // Only update keys that exist on the specific action type
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

    // プロジェクトにフラグ情報も更新
    const updatedProject = {
      ...project,
      script: {
        ...project.script,
        flags: projectFlags
      }
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
          
          {/* ヘッダー */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
            <h3 className="text-2xl font-bold">🎯 高度なルール設定</h3>
            <p className="text-blue-100 mt-1">
              複数条件・複数アクション・フラグ管理・包括的ゲームロジック設定
            </p>
          </div>

          {/* メインコンテンツ */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
              
              {/* 左列: ルール基本設定・条件 */}
              <div className="space-y-6">
                
                {/* ルール名 */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">ルール名</label>
                  <input
                    type="text"
                    value={rule.name}
                    onChange={(e) => setRule({ ...rule, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例: 中央タッチで移動"
                  />
                </div>

                {/* 条件設定 */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-blue-800">🔥 発動条件</h4>
                    <div className="flex items-center gap-2">
                      <select
                        value={operator}
                        onChange={(e) => setOperator(e.target.value as 'AND' | 'OR')}
                        className="text-sm border border-blue-300 rounded px-2 py-1 bg-white"
                      >
                        <option value="AND">すべて (AND)</option>
                        <option value="OR">いずれか (OR)</option>
                      </select>
                    </div>
                  </div>

                  {/* 既存条件一覧 */}
                  <div className="space-y-3 mb-4">
                    {conditions.map((condition, index) => {
                      const display = getConditionDisplay(condition);
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{display.icon}</span>
                            <div>
                              <div className="font-medium text-sm">{display.label}</div>
                              <div className="text-xs text-gray-500">{display.details}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditingConditionIndex(index)}
                              className="text-blue-500 hover:text-blue-700 text-sm px-2 py-1"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => removeCondition(index)}
                              className="text-red-500 hover:text-red-700 text-sm px-2 py-1"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 条件追加ボタン */}
                  <div className="grid grid-cols-2 gap-2">
                    {CONDITION_LIBRARY.map((conditionType) => (
                      <button
                        key={conditionType.type}
                        onClick={() => addCondition(conditionType.type)}
                        className={`flex items-center gap-2 p-2 rounded-lg border ${conditionType.color} hover:shadow-md transition-all text-sm`}
                      >
                        <span>{conditionType.icon}</span>
                        <span>{conditionType.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 中央列: アクション設定 */}
              <div className="space-y-6">
                
                {/* アクション設定 */}
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h4 className="text-lg font-semibold text-green-800 mb-4">⚡ 実行アクション</h4>

                  {/* 既存アクション一覧 */}
                  <div className="space-y-3 mb-4">
                    {actions.map((action, index) => {
                      const display = getActionDisplay(action);
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{display.icon}</span>
                            <div>
                              <div className="font-medium text-sm">{display.label}</div>
                              <div className="text-xs text-gray-500">{display.details}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditingActionIndex(index)}
                              className="text-green-500 hover:text-green-700 text-sm px-2 py-1"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => removeAction(index)}
                              className="text-red-500 hover:text-red-700 text-sm px-2 py-1"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* アクション追加ボタン */}
                  <div className="grid grid-cols-2 gap-2">
                    {ACTION_LIBRARY.map((actionType) => (
                      <button
                        key={actionType.type}
                        onClick={() => addAction(actionType.type)}
                        className={`flex items-center gap-2 p-2 rounded-lg border ${actionType.color} hover:shadow-md transition-all text-sm`}
                      >
                        <span>{actionType.icon}</span>
                        <span>{actionType.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 右列: フラグ管理・プレビュー */}
              <div className="space-y-6">
                
                {/* フラグ管理 */}
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <h4 className="text-lg font-semibold text-yellow-800 mb-4">🚩 フラグ管理</h4>

                  {/* 新規フラグ追加 */}
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={newFlagName}
                      onChange={(e) => setNewFlagName(e.target.value)}
                      placeholder="フラグ名"
                      className="flex-1 px-2 py-1 text-sm border border-yellow-300 rounded"
                    />
                    <button
                      onClick={addFlag}
                      className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                    >
                      ➕
                    </button>
                  </div>

                  {/* 既存フラグ一覧 */}
                  <div className="space-y-2">
                    {projectFlags.map((flag) => (
                      <div
                        key={flag.id}
                        className="flex items-center justify-between p-2 bg-white rounded border border-yellow-200"
                      >
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleFlagInitialValue(flag.id)}
                            className={`w-6 h-6 rounded border-2 flex items-center justify-center text-xs font-bold ${
                              flag.initialValue
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'bg-gray-200 border-gray-400 text-gray-600'
                            }`}
                          >
                            {flag.initialValue ? 'ON' : 'OFF'}
                          </button>
                          <span className="text-sm font-medium">{flag.name}</span>
                        </div>
                        <button
                          onClick={() => removeFlag(flag.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>

                  {projectFlags.length === 0 && (
                    <div className="text-center text-gray-500 py-4 text-sm">
                      フラグを追加してゲーム状態を管理
                    </div>
                  )}
                </div>

                {/* ルールプレビュー */}
                <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                  <h4 className="text-lg font-semibold text-indigo-800 mb-4">📋 ルールプレビュー</h4>
                  
                  {conditions.length > 0 && actions.length > 0 ? (
                    <div className="space-y-3">
                      {/* 条件部分 */}
                      <div className="bg-white rounded p-3 border border-indigo-200">
                        <div className="text-sm font-medium text-indigo-700 mb-2">
                          🔥 {operator === 'AND' ? 'すべての条件' : 'いずれかの条件'}が満たされたとき
                        </div>
                        {conditions.map((condition, index) => {
                          const display = getConditionDisplay(condition);
                          return (
                            <div key={index} className="flex items-center gap-2 text-sm text-gray-700">
                              <span>{display.icon}</span>
                              <span>{display.label}: {display.details}</span>
                              {index < conditions.length - 1 && (
                                <span className="text-indigo-500 font-bold ml-2">
                                  {operator}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* アクション部分 */}
                      <div className="bg-white rounded p-3 border border-indigo-200">
                        <div className="text-sm font-medium text-indigo-700 mb-2">
                          ⚡ 以下のアクションを実行
                        </div>
                        {actions.map((action, index) => {
                          const display = getActionDisplay(action);
                          return (
                            <div key={index} className="flex items-center gap-2 text-sm text-gray-700">
                              <span>{display.icon}</span>
                              <span>{display.label}: {display.details}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-4 text-sm">
                      条件とアクションを設定してください
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* フッター */}
          <div className="border-t border-gray-200 bg-gray-50 p-4 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              条件 {conditions.length}個 | アクション {actions.length}個 | フラグ {projectFlags.length}個
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                disabled={conditions.length === 0 || actions.length === 0}
              >
                💾 保存
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 条件編集モーダル */}
      {editingConditionIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h4 className="text-lg font-semibold mb-4">🔥 条件パラメータ設定</h4>
            
            {(() => {
              const condition = conditions[editingConditionIndex];
              
              switch (condition.type) {
                case 'touch':
                  return (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">タッチ種類</label>
                        <select
                          value={condition.touchType}
                          onChange={(e) => updateCondition(editingConditionIndex, { touchType: e.target.value as any })}
                          className="w-full border border-gray-300 rounded px-3 py-2"
                        >
                          <option value="down">👆 タップ</option>
                          <option value="up">☝️ リリース</option>
                          <option value="hold">✋ 長押し</option>
                        </select>
                      </div>
                      {condition.touchType === 'hold' && (
                        <div>
                          <label className="block text-sm font-medium mb-2">長押し時間（秒）</label>
                          <input
                            type="number"
                            min="0.5"
                            max="10"
                            step="0.5"
                            value={condition.holdDuration || 1}
                            onChange={(e) => updateCondition(editingConditionIndex, { holdDuration: Number(e.target.value) })}
                            className="w-full border border-gray-300 rounded px-3 py-2"
                          />
                        </div>
                      )}
                    </div>
                  );

                case 'time':
                  return (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">時間種類</label>
                        <select
                          value={condition.timeType}
                          onChange={(e) => updateCondition(editingConditionIndex, { timeType: e.target.value as any })}
                          className="w-full border border-gray-300 rounded px-3 py-2"
                        >
                          <option value="exact">⏰ 正確な時間</option>
                          <option value="range">📏 時間範囲</option>
                          <option value="interval">🔄 間隔</option>
                        </select>
                      </div>
                      {condition.timeType === 'exact' && (
                        <div>
                          <label className="block text-sm font-medium mb-2">秒数</label>
                          <select
                            value={condition.seconds || 3}
                            onChange={(e) => updateCondition(editingConditionIndex, { seconds: Number(e.target.value) })}
                            className="w-full border border-gray-300 rounded px-3 py-2"
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
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">エリア判定</label>
                        <select
                          value={condition.area}
                          onChange={(e) => updateCondition(editingConditionIndex, { area: e.target.value as any })}
                          className="w-full border border-gray-300 rounded px-3 py-2"
                        >
                          <option value="inside">🎯 エリア内</option>
                          <option value="outside">🚫 エリア外</option>
                          <option value="crossing">🚶 エリア通過</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">エリア設定</label>
                        <select
                          value={`${condition.region.x}-${condition.region.y}`}
                          onChange={(e) => {
                            const [x, y] = e.target.value.split('-').map(Number);
                            const presets = {
                              '0.3-0.3': { x: 0.3, y: 0.3, width: 0.4, height: 0.4 }, // 中央
                              '0.2-0.1': { x: 0.2, y: 0.1, width: 0.6, height: 0.2 }, // 上部
                              '0.2-0.7': { x: 0.2, y: 0.7, width: 0.6, height: 0.2 }, // 下部
                              '0.1-0.2': { x: 0.1, y: 0.2, width: 0.2, height: 0.6 }, // 左側
                              '0.7-0.2': { x: 0.7, y: 0.2, width: 0.2, height: 0.6 }, // 右側
                            } as any;
                            const preset = presets[e.target.value] || presets['0.3-0.3'];
                            updateCondition(editingConditionIndex, { 
                              region: { shape: 'rect', ...preset }
                            });
                          }}
                          className="w-full border border-gray-300 rounded px-3 py-2"
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
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">対象フラグ</label>
                        <select
                          value={condition.flagId}
                          onChange={(e) => updateCondition(editingConditionIndex, { flagId: e.target.value })}
                          className="w-full border border-gray-300 rounded px-3 py-2"
                        >
                          {projectFlags.map(flag => (
                            <option key={flag.id} value={flag.id}>{flag.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">条件</label>
                        <select
                          value={condition.condition}
                          onChange={(e) => updateCondition(editingConditionIndex, { condition: e.target.value as any })}
                          className="w-full border border-gray-300 rounded px-3 py-2"
                        >
                          <option value="ON">🟢 ONの時</option>
                          <option value="OFF">🔴 OFFの時</option>
                          <option value="CHANGED">🔄 変化した時</option>
                        </select>
                      </div>
                    </div>
                  );

                default:
                  return <div>設定項目がありません</div>;
              }
            })()}
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditingConditionIndex(null)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={() => setEditingConditionIndex(null)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                適用
              </button>
            </div>
          </div>
        </div>
      )}

      {/* アクション編集モーダル */}
      {editingActionIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h4 className="text-lg font-semibold mb-4">⚡ アクションパラメータ設定</h4>
            
            {(() => {
              const action = actions[editingActionIndex];
              
              switch (action.type) {
                case 'playSound':
                  return (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">効果音選択</label>
                        <select
                          value={action.soundId}
                          onChange={(e) => updateAction(editingActionIndex, { soundId: e.target.value })}
                          className="w-full border border-gray-300 rounded px-3 py-2"
                        >
                          <option value="">選択してください</option>
                          {project.assets.audio?.se?.map(sound => (
                            <option key={sound.id} value={sound.id}>🔊 {sound.name}</option>
                          )) || []}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">音量</label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={action.volume || 0.8}
                          onChange={(e) => updateAction(editingActionIndex, { volume: Number(e.target.value) })}
                          className="w-full"
                        />
                        <div className="text-sm text-gray-500 text-center">{Math.round((action.volume || 0.8) * 100)}%</div>
                      </div>
                    </div>
                  );

                case 'move':
                  return (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">移動タイプ</label>
                        <select
                          value={action.movement.type}
                          onChange={(e) => updateAction(editingActionIndex, { 
                            movement: { ...action.movement, type: e.target.value as any }
                          })}
                          className="w-full border border-gray-300 rounded px-3 py-2"
                        >
                          <option value="straight">➡️ 直線移動</option>
                          <option value="teleport">⚡ 瞬間移動</option>
                          <option value="wander">🔄 ランダム移動</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">移動先</label>
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
                            updateAction(editingActionIndex, { 
                              movement: { ...action.movement, target }
                            });
                          }}
                          className="w-full border border-gray-300 rounded px-3 py-2"
                        >
                          <option value="center">🎯 中央</option>
                          <option value="top">⬆️ 上部</option>
                          <option value="bottom">⬇️ 下部</option>
                          <option value="left">⬅️ 左側</option>
                          <option value="right">➡️ 右側</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">移動速度</label>
                        <select
                          value={action.movement.speed}
                          onChange={(e) => updateAction(editingActionIndex, { 
                            movement: { ...action.movement, speed: Number(e.target.value) }
                          })}
                          className="w-full border border-gray-300 rounded px-3 py-2"
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
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">対象フラグ</label>
                        <select
                          value={action.flagId}
                          onChange={(e) => updateAction(editingActionIndex, { flagId: e.target.value })}
                          className="w-full border border-gray-300 rounded px-3 py-2"
                        >
                          {projectFlags.map(flag => (
                            <option key={flag.id} value={flag.id}>{flag.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">設定値</label>
                        <select
                          value={action.value ? 'true' : 'false'}
                          onChange={(e) => updateAction(editingActionIndex, { value: e.target.value === 'true' })}
                          className="w-full border border-gray-300 rounded px-3 py-2"
                        >
                          <option value="true">🟢 ON</option>
                          <option value="false">🔴 OFF</option>
                        </select>
                      </div>
                    </div>
                  );

                default:
                  return <div>設定項目がありません</div>;
              }
            })()}
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditingActionIndex(null)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={() => setEditingActionIndex(null)}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                適用
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};