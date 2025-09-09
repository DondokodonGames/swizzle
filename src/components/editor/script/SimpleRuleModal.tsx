// src/components/editor/script/SimpleRuleModal.tsx
// Option A実装版 - 1つの条件→1つのアクション（タッチ→成功）

import React, { useState } from 'react';
import { GameRule, TriggerCondition, GameAction } from '../../../types/editor/GameScript';
import { CONDITIONS_LIBRARY, ACTIONS_LIBRARY } from '../../../constants/EditorLimits';

interface SimpleRuleModalProps {
  rule: GameRule;
  onSave: (rule: GameRule) => void;
  onClose: () => void;
}

// Option A用の簡易条件タイプ
type SimpleConditionType = 'touch' | 'time' | 'none';

// Option A用の簡易アクションタイプ
type SimpleActionType = 'success' | 'failure' | 'playSound' | 'none';

export const SimpleRuleModal: React.FC<SimpleRuleModalProps> = ({ rule: initialRule, onSave, onClose }) => {
  const [rule, setRule] = useState<GameRule>(initialRule);
  
  // シンプルな条件選択（1つのみ）
  const [selectedCondition, setSelectedCondition] = useState<SimpleConditionType>(() => {
    if (rule.triggers.conditions.length > 0) {
      const firstCondition = rule.triggers.conditions[0];
      if (firstCondition.type === 'touch') return 'touch';
      if (firstCondition.type === 'time') return 'time';
    }
    return 'none';
  });

  // シンプルなアクション選択（1つのみ）
  const [selectedAction, setSelectedAction] = useState<SimpleActionType>(() => {
    if (rule.actions.length > 0) {
      const firstAction = rule.actions[0];
      if (firstAction.type === 'success') return 'success';
      if (firstAction.type === 'failure') return 'failure';
      if (firstAction.type === 'playSound') return 'playSound';
    }
    return 'none';
  });

  // 時間条件用のパラメータ
  const [timeSeconds, setTimeSeconds] = useState<number>(() => {
    const timeCondition = rule.triggers.conditions.find(c => c.type === 'time') as any;
    return timeCondition?.seconds || 3;
  });

  // 音声アクション用のパラメータ
  const [selectedSoundId, setSelectedSoundId] = useState<string>(() => {
    const soundAction = rule.actions.find(a => a.type === 'playSound') as any;
    return soundAction?.soundId || '';
  });

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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="bg-blue-500 text-white p-4 rounded-t-xl">
          <h3 className="text-xl font-bold">🎯 ルール設定（簡易版）</h3>
          <p className="text-blue-100 text-sm mt-1">
            1つの条件 → 1つのアクション
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
              placeholder="例: タッチで成功"
            />
          </div>

          {/* 条件選択 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">🔥 発動条件</label>
            <div className="space-y-2">
              <label className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="condition"
                  value="touch"
                  checked={selectedCondition === 'touch'}
                  onChange={(e) => setSelectedCondition(e.target.value as SimpleConditionType)}
                  className="mr-3"
                />
                <div className="flex items-center">
                  <span className="text-lg mr-2">👆</span>
                  <div>
                    <div className="font-medium">タッチしたとき</div>
                    <div className="text-xs text-gray-500">オブジェクトをタップしたら発動</div>
                  </div>
                </div>
              </label>
              
              <label className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="condition"
                  value="time"
                  checked={selectedCondition === 'time'}
                  onChange={(e) => setSelectedCondition(e.target.value as SimpleConditionType)}
                  className="mr-3"
                />
                <div className="flex items-center">
                  <span className="text-lg mr-2">⏰</span>
                  <div className="flex-1">
                    <div className="font-medium">時間経過</div>
                    <div className="text-xs text-gray-500">指定時間後に自動発動</div>
                  </div>
                </div>
              </label>
            </div>

            {/* 時間条件のパラメータ */}
            {selectedCondition === 'time' && (
              <div className="mt-3 ml-8">
                <label className="block text-xs text-gray-600 mb-1">秒数</label>
                <select
                  value={timeSeconds}
                  onChange={(e) => setTimeSeconds(Number(e.target.value))}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
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

          {/* アクション選択 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">⚡ 実行アクション</label>
            <div className="space-y-2">
              <label className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="action"
                  value="success"
                  checked={selectedAction === 'success'}
                  onChange={(e) => setSelectedAction(e.target.value as SimpleActionType)}
                  className="mr-3"
                />
                <div className="flex items-center">
                  <span className="text-lg mr-2">🎉</span>
                  <div>
                    <div className="font-medium">ゲームクリア！</div>
                    <div className="text-xs text-gray-500">成功でゲーム終了</div>
                  </div>
                </div>
              </label>
              
              <label className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="action"
                  value="failure"
                  checked={selectedAction === 'failure'}
                  onChange={(e) => setSelectedAction(e.target.value as SimpleActionType)}
                  className="mr-3"
                />
                <div className="flex items-center">
                  <span className="text-lg mr-2">💀</span>
                  <div>
                    <div className="font-medium">ゲームオーバー</div>
                    <div className="text-xs text-gray-500">失敗でゲーム終了</div>
                  </div>
                </div>
              </label>

              <label className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="action"
                  value="playSound"
                  checked={selectedAction === 'playSound'}
                  onChange={(e) => setSelectedAction(e.target.value as SimpleActionType)}
                  className="mr-3"
                />
                <div className="flex items-center">
                  <span className="text-lg mr-2">🔊</span>
                  <div>
                    <div className="font-medium">音を鳴らす</div>
                    <div className="text-xs text-gray-500">効果音を再生</div>
                  </div>
                </div>
              </label>
            </div>

            {/* 音声アクションのパラメータ */}
            {selectedAction === 'playSound' && (
              <div className="mt-3 ml-8">
                <label className="block text-xs text-gray-600 mb-1">効果音選択</label>
                <select
                  value={selectedSoundId}
                  onChange={(e) => setSelectedSoundId(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                >
                  <option value="">選択してください</option>
                  {/* プロジェクトのSEから選択 */}
                  {rule && (
                    <>
                      {/* 仮のサウンドIDリスト - 実際のプロジェクトデータから取得する必要がある */}
                      <option value="se_001">効果音1</option>
                      <option value="se_002">効果音2</option>
                      <option value="se_003">効果音3</option>
                    </>
                  )}
                </select>
              </div>
            )}
          </div>

          {/* プレビュー */}
          {selectedCondition !== 'none' && selectedAction !== 'none' && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-2">📋 ルールプレビュー</h4>
              <div className="text-sm text-blue-700">
                {selectedCondition === 'touch' && '👆 タッチしたとき'}
                {selectedCondition === 'time' && `⏰ ${timeSeconds}秒経過したとき`}
                <span className="mx-2">→</span>
                {selectedAction === 'success' && '🎉 ゲームクリア！'}
                {selectedAction === 'failure' && '💀 ゲームオーバー'}
                {selectedAction === 'playSound' && '🔊 音を鳴らす'}
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