// src/components/editor/script/SimpleRuleModal.tsx

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GameRule, TriggerCondition, GameAction } from '../../../types/editor/GameScript';
import { GameProject } from '../../../types/editor/GameProject';

interface SimpleRuleModalProps {
  rule: GameRule;
  project: GameProject; // プロジェクト情報を追加（オブジェクト・音声データ参照用）
  onSave: (rule: GameRule) => void;
  onClose: () => void;
}

type ExpandedConditionType =
  | 'touch'
  | 'time'
  | 'position'
  | 'collision'
  | 'animation'
  | 'none';

type ExpandedActionType =
  | 'success'
  | 'failure'
  | 'playSound'
  | 'move'
  | 'effect'
  | 'show'
  | 'hide'
  | 'none';

export const SimpleRuleModal: React.FC<SimpleRuleModalProps> = ({ rule: initialRule, project, onSave, onClose }) => {
  const { t } = useTranslation();
  const [rule, setRule] = useState<GameRule>(initialRule);

  const [selectedCondition, setSelectedCondition] = useState<ExpandedConditionType>(() => {
    if (rule.triggers.conditions.length > 0) {
      const firstCondition = rule.triggers.conditions[0];
      return firstCondition.type as ExpandedConditionType;
    }
    return 'none';
  });

  const [selectedAction, setSelectedAction] = useState<ExpandedActionType>(() => {
    if (rule.actions.length > 0) {
      const firstAction = rule.actions[0];
      return firstAction.type as ExpandedActionType;
    }
    return 'none';
  });

  const [timeSeconds, setTimeSeconds] = useState<number>(3);
  const [selectedSoundId, setSelectedSoundId] = useState<string>('');
  const [positionArea, setPositionArea] = useState<'center' | 'top' | 'bottom' | 'left' | 'right'>('center');
  const [collisionTarget, setCollisionTarget] = useState<string>('background');
  const [moveTarget, setMoveTarget] = useState<'center' | 'random' | 'position'>('center');
  const [moveSpeed, setMoveSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [effectType, setEffectType] = useState<'flash' | 'shake' | 'scale'>('flash');

  const EXPANDED_CONDITIONS = [
    { type: 'touch', label: t('conditions.touch.label'), icon: '👆', color: 'bg-blue-100', description: t('conditions.touch.description') },
    { type: 'time', label: t('conditions.time.label'), icon: '⏰', color: 'bg-green-100', description: t('conditions.time.description') },
    { type: 'position', label: t('conditions.position.label'), icon: '📍', color: 'bg-purple-100', description: t('conditions.position.description') },
    { type: 'collision', label: t('conditions.collision.label'), icon: '💥', color: 'bg-red-100', description: t('conditions.collision.description') },
    { type: 'animation', label: t('conditions.animation.label'), icon: '🎬', color: 'bg-orange-100', description: t('conditions.animation.description') },
  ] as const;

  const EXPANDED_ACTIONS = [
    { type: 'success', label: t('actions.success.label'), icon: '🎉', color: 'bg-emerald-100', description: t('actions.success.description') },
    { type: 'failure', label: t('actions.failure.label'), icon: '💀', color: 'bg-rose-100', description: t('actions.failure.description') },
    { type: 'playSound', label: t('actions.playSound.label'), icon: '🔊', color: 'bg-indigo-100', description: t('actions.playSound.description') },
    { type: 'move', label: t('actions.move.label'), icon: '🏃', color: 'bg-cyan-100', description: t('actions.move.description') },
    { type: 'effect', label: t('actions.effect.label'), icon: '✨', color: 'bg-yellow-100', description: t('actions.effect.description') },
    { type: 'show', label: t('actions.show.label'), icon: '👁️', color: 'bg-teal-100', description: t('actions.show.description') },
    { type: 'hide', label: t('actions.hide.label'), icon: '🫥', color: 'bg-gray-100', description: t('actions.hide.description') },
  ] as const;

  const handleSave = () => {
    if (!rule.name.trim()) {
      alert(t('editor.script.ruleModal.errors.nameRequired'));
      return;
    }

    if (selectedCondition === 'none') {
      alert(t('editor.script.ruleModal.errors.conditionRequired'));
      return;
    }

    if (selectedAction === 'none') {
      alert(t('editor.script.ruleModal.errors.actionRequired'));
      return;
    }

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
      conditions.push({
        type: 'collision',
        target: collisionTarget,
        collisionType: 'enter',
        checkMode: 'hitbox'
      });
    } else if (selectedCondition === 'animation') {
      conditions.push({
        type: 'animation',
        target: rule.targetObjectId,
        condition: 'end',
        animationIndex: 0
      });
    }

    const actions: GameAction[] = [];

    if (selectedAction === 'success') {
      actions.push({
        type: 'success',
        message: t('game.success')
      });
    } else if (selectedAction === 'failure') {
      actions.push({
        type: 'failure',
        message: t('game.failure')
      });
    } else if (selectedAction === 'playSound' && selectedSoundId) {
      actions.push({
        type: 'playSound',
        soundId: selectedSoundId,
        volume: 0.8
      });
    } else if (selectedAction === 'move') {
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
          <h3 className="text-xl font-bold">🎯 {t('editor.script.ruleModal.title')}</h3>
          <p className="text-blue-100 text-sm mt-1">
            {t('editor.script.ruleModal.subtitle', { conditions: EXPANDED_CONDITIONS.length, actions: EXPANDED_ACTIONS.length })}
          </p>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('editor.script.ruleModal.ruleName')}</label>
            <input
              type="text"
              value={rule.name}
              onChange={(e) => setRule({ ...rule, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('editor.script.ruleModal.ruleNamePlaceholder')}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">🔥 {t('editor.script.ruleModal.triggerCondition')}</label>
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

            {selectedCondition === 'time' && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('editor.script.condition')} - {t('conditions.time.label')}</label>
                <select
                  value={timeSeconds}
                  onChange={(e) => setTimeSeconds(Number(e.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value={1}>1{t('editor.script.ruleModal.preview.seconds', { seconds: 1 })}</option>
                  <option value={2}>2{t('editor.script.ruleModal.preview.seconds', { seconds: 2 })}</option>
                  <option value={3}>3{t('editor.script.ruleModal.preview.seconds', { seconds: 3 })}</option>
                  <option value={5}>5{t('editor.script.ruleModal.preview.seconds', { seconds: 5 })}</option>
                  <option value={10}>10{t('editor.script.ruleModal.preview.seconds', { seconds: 10 })}</option>
                </select>
              </div>
            )}

            {selectedCondition === 'position' && (
              <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('editor.script.condition')} - {t('conditions.position.label')}</label>
                <select
                  value={positionArea}
                  onChange={(e) => setPositionArea(e.target.value as any)}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="center">🎯 {t('positions.center')}</option>
                  <option value="top">⬆️ {t('positions.top')}</option>
                  <option value="bottom">⬇️ {t('positions.bottom')}</option>
                  <option value="left">⬅️ {t('positions.left')}</option>
                  <option value="right">➡️ {t('positions.right')}</option>
                </select>
              </div>
            )}

            {selectedCondition === 'collision' && (
              <div className="mt-4 p-4 bg-red-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('editor.script.condition')} - {t('conditions.collision.label')}</label>
                <select
                  value={collisionTarget}
                  onChange={(e) => setCollisionTarget(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="background">🌄 {t('editor.assets.background')}</option>
                  <option value="stage">🎮 Stage Edge</option>
                  {project.assets.objects.map(obj => (
                    <option key={obj.id} value={obj.id}>📦 {obj.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">⚡ {t('editor.script.ruleModal.executeAction')}</label>
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

            {selectedAction === 'playSound' && (
              <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('editor.script.action')} - {t('actions.playSound.label')}</label>
                <select
                  value={selectedSoundId}
                  onChange={(e) => setSelectedSoundId(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">{t('common.search')}</option>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('actions.move.label')} - Target</label>
                    <select
                      value={moveTarget}
                      onChange={(e) => setMoveTarget(e.target.value as any)}
                      className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                    >
                      <option value="center">🎯 {t('positions.center')}</option>
                      <option value="random">🎲 Random</option>
                      <option value="position">📍 {t('positions.top')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Speed</label>
                    <select
                      value={moveSpeed}
                      onChange={(e) => setMoveSpeed(e.target.value as any)}
                      className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                    >
                      <option value="slow">🐌 {t('speeds.slow.label')}</option>
                      <option value="normal">🚶 {t('speeds.normal.label')}</option>
                      <option value="fast">🏃 {t('speeds.fast.label')}</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {selectedAction === 'effect' && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('actions.effect.label')}</label>
                <select
                  value={effectType}
                  onChange={(e) => setEffectType(e.target.value as any)}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="flash">⚡ {t('effects.flash.label')}</option>
                  <option value="shake">🥶 {t('effects.shake.label')}</option>
                  <option value="scale">📏 {t('effects.scale.label')}</option>
                </select>
              </div>
            )}
          </div>

          {selectedCondition !== 'none' && selectedAction !== 'none' && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-medium text-blue-800 mb-2">📋 {t('editor.script.ruleModal.preview.title')}</h4>
              <div className="text-sm text-blue-700 flex items-center flex-wrap gap-1">
                <span className="inline-flex items-center gap-1">
                  {EXPANDED_CONDITIONS.find(c => c.type === selectedCondition)?.icon}
                  {EXPANDED_CONDITIONS.find(c => c.type === selectedCondition)?.label}
                  {selectedCondition === 'time' && t('editor.script.ruleModal.preview.seconds', { seconds: timeSeconds })}
                  {selectedCondition === 'position' && t('editor.script.ruleModal.preview.area', { area: positionArea })}
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
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            disabled={selectedCondition === 'none' || selectedAction === 'none'}
          >
            💾 {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
};