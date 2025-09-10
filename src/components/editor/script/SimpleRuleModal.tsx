// src/components/editor/script/SimpleRuleModal.tsx
// 段階的拡張版 - 条件ライブラリ拡張（Phase 1）

import React, { useState } from 'react';
import { GameRule, TriggerCondition, GameAction } from '../../../types/editor/GameScript';
import { GameProject } from '../../../types/editor/GameProject';

interface SimpleRuleModalProps {
  rule: GameRule;
  project: GameProject; // プロジェクト情報を追加（オブジェクト・音声データ参照用）
  onSave: (rule: GameRule) => void;
  onClose: () => void;
}

// 🔧 拡張: 条件タイプ（段階的追加）
type ExpandedConditionType = 
  | 'touch'           // 👆 タッチ（既存）
  | 'time'            // ⏰ 時間（既存）
  | 'position'        // 📍 位置条件（新規）
  | 'collision'       // 💥 衝突条件（新規）
  | 'animation'       // 🎬 アニメーション条件（新規）
  | 'none';

// 🔧 拡張: アクションタイプ（段階的追加）
type ExpandedActionType = 
  | 'success'         // 🎉 成功（既存）
  | 'failure'         // 💀 失敗（既存）
  | 'playSound'       // 🔊 音再生（既存）
  | 'move'            // 🏃 移動（新規）
  | 'effect'          // ✨ エフェクト（新規）
  | 'show'            // 👁️ 表示（新規）
  | 'hide'            // 🫥 非表示（新規）
  | 'none';

// 拡張された条件ライブラリ
const EXPANDED_CONDITIONS = [
  // 既存条件
  { type: 'touch', label: 'タッチしたとき', icon: '👆', color: 'bg-blue-100', description: 'オブジェクトをタップしたら発動' },
  { type: 'time', label: '時間経過', icon: '⏰', color: 'bg-green-100', description: '指定時間後に自動発動' },
  
  // 新規条件
  { type: 'position', label: '位置にいるとき', icon: '📍', color: 'bg-purple-100', description: '指定エリアに入った・出た時' },
  { type: 'collision', label: 'ぶつかったとき', icon: '💥', color: 'bg-red-100', description: '他のオブジェクトと衝突時' },
  { type: 'animation', label: 'アニメ終了時', icon: '🎬', color: 'bg-orange-100', description: 'アニメーションが終了した時' },
] as const;

// 拡張されたアクションライブラリ
const EXPANDED_ACTIONS = [
  // 既存アクション
  { type: 'success', label: 'ゲームクリア！', icon: '🎉', color: 'bg-emerald-100', description: '成功でゲーム終了' },
  { type: 'failure', label: 'ゲームオーバー', icon: '💀', color: 'bg-rose-100', description: '失敗でゲーム終了' },
  { type: 'playSound', label: '音を鳴らす', icon: '🔊', color: 'bg-indigo-100', description: '効果音を再生' },
  
  // 新規アクション
  { type: 'move', label: '移動する', icon: '🏃', color: 'bg-cyan-100', description: '指定位置に移動' },
  { type: 'effect', label: 'エフェクト', icon: '✨', color: 'bg-yellow-100', description: 'フラッシュ・シェイク等' },
  { type: 'show', label: '表示する', icon: '👁️', color: 'bg-teal-100', description: 'オブジェクトを表示' },
  { type: 'hide', label: '隠す', icon: '🫥', color: 'bg-gray-100', description: 'オブジェクトを非表示' },
] as const;

export const SimpleRuleModal: React.FC<SimpleRuleModalProps> = ({ rule: initialRule, project, onSave, onClose }) => {
  const [rule, setRule] = useState<GameRule>(initialRule);
  
  // 条件選択状態
  const [selectedCondition, setSelectedCondition] = useState<ExpandedConditionType>(() => {
    if (rule.triggers.conditions.length > 0) {
      const firstCondition = rule.triggers.conditions[0];
      return firstCondition.type as ExpandedConditionType;
    }
    return 'none';
  });

  // アクション選択状態
  const [selectedAction, setSelectedAction] = useState<ExpandedActionType>(() => {
    if (rule.actions.length > 0) {
      const firstAction = rule.actions[0];
      return firstAction.type as ExpandedActionType;
    }
    return 'none';
  });

  // パラメータ状態
  const [timeSeconds, setTimeSeconds] = useState<number>(3);
  const [selectedSoundId, setSelectedSoundId] = useState<string>('');
  
  // 🔧 新規: 位置条件パラメータ
  const [positionArea, setPositionArea] = useState<'center' | 'top' | 'bottom' | 'left' | 'right'>('center');
  
  // 🔧 新規: 衝突条件パラメータ  
  const [collisionTarget, setCollisionTarget] = useState<string>('background');
  
  // 🔧 新規: 移動アクションパラメータ
  const [moveTarget, setMoveTarget] = useState<'center' | 'random' | 'position'>('center');
  const [moveSpeed, setMoveSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  
  // 🔧 新規: エフェクトパラメータ
  const [effectType, setEffectType] = useState<'flash' | 'shake' | 'scale'>('flash');

  const handleSave = () => {
    if (!rule.name.trim()) {
      alert('ルール名を入力してください');
      return;
    }

    if (selectedCondition === 'none') {
      alert('条件を選択してください');
      return;
    }

    if (selectedAction === 'none') {
      alert('アクションを選択してください');
      return;
    }

    // 条件を作成
    const conditions: TriggerCondition[] = [];
    
    if (selectedCondition === 'touch') {
      conditions.push({
        type: 'touch',
        target: 'self',
        touchType: 'down'
      });
    } else if (selectedCondition === 'time') {
      conditions.push({
        type: 'time',
        timeType: 'exact',
        seconds: timeSeconds
      });
    } else if (selectedCondition === 'position') {
      // 🔧 新規: 位置条件実装
      const positionMap = {
        center: { x: 0.5, y: 0.5, width: 0.3, height: 0.3 },
        top: { x: 0.5, y: 0.2, width: 0.6, height: 0.2 },
        bottom: { x: 0.5, y: 0.8, width: 0.6, height: 0.2 },
        left: { x: 0.2, y: 0.5, width: 0.2, height: 0.6 },
        right: { x: 0.8, y: 0.5, width: 0.2, height: 0.6 }
      };
      
      const pos = positionMap[positionArea];
      conditions.push({
        type: 'position',
        target: rule.targetObjectId,
        area: 'inside',
        region: {
          shape: 'rect',
          x: pos.x - pos.width/2,
          y: pos.y - pos.height/2,
          width: pos.width,
          height: pos.height
        }
      });
    } else if (selectedCondition === 'collision') {
      // 🔧 新規: 衝突条件実装
      conditions.push({
        type: 'collision',
        target: collisionTarget,
        collisionType: 'enter',
        checkMode: 'hitbox'
      });
    } else if (selectedCondition === 'animation') {
      // 🔧 新規: アニメーション条件実装
      conditions.push({
        type: 'animation',
        target: rule.targetObjectId,
        condition: 'end',
        animationIndex: 0
      });
    }

    // アクションを作成
    const actions: GameAction[] = [];
    
    if (selectedAction === 'success') {
      actions.push({
        type: 'success',
        message: 'クリア！'
      });
    } else if (selectedAction === 'failure') {
      actions.push({
        type: 'failure',
        message: 'ゲームオーバー'
      });
    } else if (selectedAction === 'playSound' && selectedSoundId) {
      actions.push({
        type: 'playSound',
        soundId: selectedSoundId,
        volume: 0.8
      });
    } else if (selectedAction === 'move') {
      // 🔧 新規: 移動アクション実装
      const speedMap = { slow: 100, normal: 300, fast: 600 };
      const targetMap = {
        center: { x: 0.5, y: 0.5 },
        random: { x: Math.random(), y: Math.random() },
        position: { x: 0.5, y: 0.3 }
      };
      
      actions.push({
        type: 'move',
        targetId: rule.targetObjectId,
        movement: {
          type: 'straight',
          target: targetMap[moveTarget],
          speed: speedMap[moveSpeed],
          duration: 2.0,
          easing: 'ease-out'
        }
      });
    } else if (selectedAction === 'effect') {
      // 🔧 新規: エフェクトアクション実装
      actions.push({
        type: 'effect',
        targetId: rule.targetObjectId,
        effect: {
          type: effectType,
          duration: 1.0,
          intensity: 0.8
        }
      });
    } else if (selectedAction === 'show') {
      actions.push({
        type: 'show',
        targetId: rule.targetObjectId,
        fadeIn: true,
        duration: 0.5
      });
    } else if (selectedAction === 'hide') {
      actions.push({
        type: 'hide',
        targetId: rule.targetObjectId,
        fadeOut: true,
        duration: 0.5
      });
    }

    const updatedRule: GameRule = {
      ...rule,
      triggers: {
        operator: 'AND',
        conditions
      },
      actions,
      lastModified: new Date().toISOString()
    };

    onSave(updatedRule);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-blue-500 text-white p-4 rounded-t-xl">
          <h3 className="text-xl font-bold">🎯 ルール設定（拡張版）</h3>
          <p className="text-blue-100 text-sm mt-1">
            1つの条件 → 1つのアクション | {EXPANDED_CONDITIONS.length}種類の条件 × {EXPANDED_ACTIONS.length}種類のアクション
          </p>
        </div>
        
        <div className="p-6">
          {/* ルール名 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">ルール名</label>
            <input
              type="text"
              value={rule.name}
              onChange={(e) => setRule({ ...rule, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: 中央エリアでタッチして移動"
            />
          </div>

          {/* 条件選択 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">🔥 発動条件</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {EXPANDED_CONDITIONS.map((condition) => (
                <label 
                  key={condition.type}
                  className={`flex items-center p-3 border-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-all ${
                    selectedCondition === condition.type 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="condition"
                    value={condition.type}
                    checked={selectedCondition === condition.type}
                    onChange={(e) => setSelectedCondition(e.target.value as ExpandedConditionType)}
                    className="mr-3"
                  />
                  <div className="flex items-center">
                    <span className="text-xl mr-3">{condition.icon}</span>
                    <div>
                      <div className="font-medium">{condition.label}</div>
                      <div className="text-xs text-gray-500">{condition.description}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {/* 条件パラメータ設定 */}
            {selectedCondition === 'time' && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">秒数設定</label>
                <select
                  value={timeSeconds}
                  onChange={(e) => setTimeSeconds(Number(e.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value={1}>1秒後</option>
                  <option value={2}>2秒後</option>
                  <option value={3}>3秒後</option>
                  <option value={5}>5秒後</option>
                  <option value={10}>10秒後</option>
                </select>
              </div>
            )}

            {selectedCondition === 'position' && (
              <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">エリア設定</label>
                <select
                  value={positionArea}
                  onChange={(e) => setPositionArea(e.target.value as any)}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="center">🎯 中央エリア</option>
                  <option value="top">⬆️ 上部エリア</option>
                  <option value="bottom">⬇️ 下部エリア</option>
                  <option value="left">⬅️ 左側エリア</option>
                  <option value="right">➡️ 右側エリア</option>
                </select>
              </div>
            )}

            {selectedCondition === 'collision' && (
              <div className="mt-4 p-4 bg-red-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">衝突対象</label>
                <select
                  value={collisionTarget}
                  onChange={(e) => setCollisionTarget(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="background">🌄 背景</option>
                  <option value="stage">🎮 画面端</option>
                  {project.assets.objects.map(obj => (
                    <option key={obj.id} value={obj.id}>📦 {obj.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* アクション選択 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">⚡ 実行アクション</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {EXPANDED_ACTIONS.map((action) => (
                <label 
                  key={action.type}
                  className={`flex items-center p-3 border-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-all ${
                    selectedAction === action.type 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="action"
                    value={action.type}
                    checked={selectedAction === action.type}
                    onChange={(e) => setSelectedAction(e.target.value as ExpandedActionType)}
                    className="mr-3"
                  />
                  <div className="flex items-center">
                    <span className="text-xl mr-3">{action.icon}</span>
                    <div>
                      <div className="font-medium">{action.label}</div>
                      <div className="text-xs text-gray-500">{action.description}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {/* アクションパラメータ設定 */}
            {selectedAction === 'playSound' && (
              <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">効果音選択</label>
                <select
                  value={selectedSoundId}
                  onChange={(e) => setSelectedSoundId(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">選択してください</option>
                  {project.assets.audio?.se?.map(sound => (
                    <option key={sound.id} value={sound.id}>🔊 {sound.name}</option>
                  )) || []}
                </select>
              </div>
            )}

            {selectedAction === 'move' && (
              <div className="mt-4 p-4 bg-cyan-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">移動先</label>
                    <select
                      value={moveTarget}
                      onChange={(e) => setMoveTarget(e.target.value as any)}
                      className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                    >
                      <option value="center">🎯 中央</option>
                      <option value="random">🎲 ランダム</option>
                      <option value="position">📍 上部</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">移動速度</label>
                    <select
                      value={moveSpeed}
                      onChange={(e) => setMoveSpeed(e.target.value as any)}
                      className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                    >
                      <option value="slow">🐌 ゆっくり</option>
                      <option value="normal">🚶 普通</option>
                      <option value="fast">🏃 早い</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {selectedAction === 'effect' && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">エフェクト種類</label>
                <select
                  value={effectType}
                  onChange={(e) => setEffectType(e.target.value as any)}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="flash">⚡ フラッシュ</option>
                  <option value="shake">🥶 シェイク</option>
                  <option value="scale">📏 拡大縮小</option>
                </select>
              </div>
            )}
          </div>

          {/* プレビュー */}
          {selectedCondition !== 'none' && selectedAction !== 'none' && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-medium text-blue-800 mb-2">📋 ルールプレビュー</h4>
              <div className="text-sm text-blue-700 flex items-center flex-wrap gap-1">
                <span className="inline-flex items-center gap-1">
                  {EXPANDED_CONDITIONS.find(c => c.type === selectedCondition)?.icon}
                  {EXPANDED_CONDITIONS.find(c => c.type === selectedCondition)?.label}
                  {selectedCondition === 'time' && ` (${timeSeconds}秒)`}
                  {selectedCondition === 'position' && ` (${positionArea}エリア)`}
                </span>
                <span className="mx-2 text-gray-500">→</span>
                <span className="inline-flex items-center gap-1">
                  {EXPANDED_ACTIONS.find(a => a.type === selectedAction)?.icon}
                  {EXPANDED_ACTIONS.find(a => a.type === selectedAction)?.label}
                  {selectedAction === 'move' && ` (${moveTarget}/${moveSpeed})`}
                  {selectedAction === 'effect' && ` (${effectType})`}
                </span>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            disabled={selectedCondition === 'none' || selectedAction === 'none'}
          >
            💾 保存
          </button>
        </div>
      </div>
    </div>
  );
};