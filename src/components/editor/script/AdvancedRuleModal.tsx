// src/components/editor/script/AdvancedRuleModal.tsx
// Phase C Step 2完了版: 時間・移動・エフェクト詳細化実装（完全版）
// Phase A・B・Step 1-1・1-2完全保護・段階的詳細化

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

// Phase C Step 1-1: タッチタイプ詳細定義（保護）
const TOUCH_TYPE_OPTIONS = [
  { value: 'down', label: 'タッチ開始', icon: '👇', description: 'タッチした瞬間' },
  { value: 'up', label: 'タッチ終了', icon: '👆', description: '指を離した瞬間' },
  { value: 'hold', label: '長押し', icon: '⏱️', description: '一定時間押し続ける' }
];

// Phase C Step 1-1: タッチターゲット詳細定義（保護）
const TOUCH_TARGET_OPTIONS = [
  { value: 'self', label: 'このオブジェクト', icon: '🎯', description: '設定中のオブジェクト' },
  { value: 'stage', label: 'ステージ全体', icon: '🖼️', description: 'ゲーム画面全体' },
  { value: 'stageArea', label: 'ステージ範囲指定', icon: '📐', description: 'ステージの一部範囲' }
];

// Phase C Step 1-2: フラグ条件4パターン定義
const FLAG_CONDITION_OPTIONS = [
  { value: 'ON', label: 'ON状態', icon: '🟢', description: 'フラグがONの時' },
  { value: 'OFF', label: 'OFF状態', icon: '🔴', description: 'フラグがOFFの時' },
  { value: 'OFF_TO_ON', label: 'OFF→ON', icon: '🟢⬆️', description: 'OFFからONに変化した瞬間' },
  { value: 'ON_TO_OFF', label: 'ON→OFF', icon: '🔴⬇️', description: 'ONからOFFに変化した瞬間' }
];

// 🆕 Phase C Step 2: 時間条件タイプ定義
const TIME_CONDITION_OPTIONS = [
  { value: 'exact', label: '正確な時刻', icon: '⏰', description: '特定の時間に発動' },
  { value: 'range', label: '時間範囲', icon: '📏', description: '指定範囲内で発動' },
  { value: 'interval', label: '定期間隔', icon: '🔄', description: '一定間隔で繰り返し発動' }
];

// 🆕 Phase C Step 2: 移動タイプ詳細定義
const MOVEMENT_TYPE_OPTIONS = [
  { value: 'straight', label: '直線移動', icon: '→', description: '指定座標まで直線移動' },
  { value: 'teleport', label: '瞬間移動', icon: '⚡', description: '瞬時に目標位置へ移動' },
  { value: 'wander', label: 'ランダム移動', icon: '🌀', description: '範囲内をランダムに移動' },
  { value: 'stop', label: '移動停止', icon: '⏹️', description: '現在の移動を停止' },
  { value: 'swap', label: '位置交換', icon: '🔄', description: '他オブジェクトと位置交換' },
  { value: 'approach', label: '接近移動', icon: '🎯', description: '対象に近づく' },
  { value: 'orbit', label: '軌道移動', icon: '🔄', description: '円軌道で移動' },
  { value: 'bounce', label: '跳ね返り移動', icon: '⬆️', description: '壁で跳ね返る移動' }
];

// 🆕 Phase C Step 2: エフェクトタイプ詳細定義
const EFFECT_TYPE_OPTIONS = [
  { value: 'glow', label: '光る', icon: '✨', description: 'オブジェクトを光らせる' },
  { value: 'shake', label: '揺れる', icon: '📳', description: 'オブジェクトを振動させる' },
  { value: 'confetti', label: '紙吹雪', icon: '🎉', description: '紙吹雪エフェクト' },
  { value: 'monochrome', label: 'モノクロ', icon: '⚫⚪', description: 'モノクロ化エフェクト' }
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
  
  // Phase C: 詳細パラメータ編集状態（Step 1-1保護・拡張）
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

  // Phase C: 詳細パラメータ編集（Step 1-1保護・拡張）
  const startEditingCondition = (index: number) => {
    setEditingConditionIndex(index);
    setShowParameterModal(true);
  };

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

  // Phase C: 条件更新（詳細パラメータ対応）
  const updateCondition = (index: number, updates: Partial<TriggerCondition>) => {
    setConditions(conditions.map((condition, i) => 
      i === index ? ({ ...condition, ...updates } as TriggerCondition) : condition
    ));
  };

  // Phase C Step 1-1: タッチ条件詳細設定コンポーネント（保護・エラー修正）
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
          fontSize: DESIGN_TOKENS.typography.fontSize.base,
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
            color: DESIGN_TOKENS.colors.purple[800],
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
                    : DESIGN_TOKENS.colors.purple[200],
                  backgroundColor: touchCondition.touchType === option.value 
                    ? DESIGN_TOKENS.colors.purple[500] 
                    : 'transparent',
                  color: touchCondition.touchType === option.value 
                    ? DESIGN_TOKENS.colors.neutral[0] 
                    : DESIGN_TOKENS.colors.purple[800],
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
              color: DESIGN_TOKENS.colors.purple[800],
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
              color: DESIGN_TOKENS.colors.purple[500],
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
            color: DESIGN_TOKENS.colors.purple[800],
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
                    : DESIGN_TOKENS.colors.purple[200],
                  backgroundColor: touchCondition.target === option.value 
                    ? DESIGN_TOKENS.colors.purple[500] 
                    : 'transparent',
                  color: touchCondition.target === option.value 
                    ? DESIGN_TOKENS.colors.neutral[0] 
                    : DESIGN_TOKENS.colors.purple[800],
                  padding: DESIGN_TOKENS.spacing[2],
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: DESIGN_TOKENS.spacing[1]
                }}
              >
                <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.base }}>{option.icon}</span>
                <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, fontWeight: DESIGN_TOKENS.typography.fontWeight.medium, textAlign: 'center' }}>
                  {option.label}
                </span>
              </ModernButton>
            ))}
          </div>
        </div>

        <div style={{
          padding: DESIGN_TOKENS.spacing[3],
          backgroundColor: DESIGN_TOKENS.colors.purple[100],
          borderRadius: DESIGN_TOKENS.borderRadius.lg,
          fontSize: DESIGN_TOKENS.typography.fontSize.xs,
          color: DESIGN_TOKENS.colors.purple[800]
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

  // 🆕 Phase C Step 2: 時間条件詳細設定コンポーネント
  const TimeConditionEditor = ({ condition, index }: { condition: TriggerCondition & { type: 'time' }, index: number }) => {
    const timeCondition = condition;
    
    // ゲーム全体時間を取得（デフォルト30秒、実際の値は設定から取得予定）
    const gameDuration = 30; // TODO: プロジェクト設定から取得
    
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
          fontSize: DESIGN_TOKENS.typography.fontSize.base,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
          color: DESIGN_TOKENS.colors.purple[800],
          margin: 0,
          marginBottom: DESIGN_TOKENS.spacing[4],
          display: 'flex',
          alignItems: 'center',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.lg }}>⏰</span>
          時間条件詳細設定
        </h5>

        {/* 時間タイプ選択 */}
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.purple[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            時間条件タイプ
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: DESIGN_TOKENS.spacing[2]
          }}>
            {TIME_CONDITION_OPTIONS.map((option) => (
              <ModernButton
                key={option.value}
                variant={timeCondition.timeType === option.value ? 'primary' : 'outline'}
                size="sm"
                onClick={() => updateCondition(index, { timeType: option.value as any })}
                style={{
                  borderColor: timeCondition.timeType === option.value 
                    ? DESIGN_TOKENS.colors.purple[500] 
                    : DESIGN_TOKENS.colors.purple[200],
                  backgroundColor: timeCondition.timeType === option.value 
                    ? DESIGN_TOKENS.colors.purple[500] 
                    : 'transparent',
                  color: timeCondition.timeType === option.value 
                    ? DESIGN_TOKENS.colors.neutral[0] 
                    : DESIGN_TOKENS.colors.purple[800],
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

        {/* 正確な時刻設定（exactタイプの場合） */}
        {timeCondition.timeType === 'exact' && (
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.purple[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              発動時刻: {timeCondition.seconds || 3}秒後
            </label>
            <input
              type="range"
              min="0.1"
              max={gameDuration}
              step="0.1"
              value={timeCondition.seconds || 3}
              onChange={(e) => updateCondition(index, { seconds: parseFloat(e.target.value) })}
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
              color: DESIGN_TOKENS.colors.purple[500],
              marginTop: DESIGN_TOKENS.spacing[1]
            }}>
              <span>0秒</span>
              <span>{gameDuration}秒</span>
            </div>
          </div>
        )}

        {/* 時間範囲設定（rangeタイプの場合） */}
        {timeCondition.timeType === 'range' && (
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
              <label style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                color: DESIGN_TOKENS.colors.purple[800],
                marginBottom: DESIGN_TOKENS.spacing[2],
                display: 'block'
              }}>
                開始時刻: {timeCondition.range?.min || 2}秒後
              </label>
              <input
                type="range"
                min="0"
                max={gameDuration - 1}
                step="0.1"
                value={timeCondition.range?.min || 2}
                onChange={(e) => {
                  const min = parseFloat(e.target.value);
                  updateCondition(index, { 
                    range: { 
                      min, 
                      max: Math.max(min + 0.1, timeCondition.range?.max || min + 2) 
                    } 
                  });
                }}
                style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: DESIGN_TOKENS.colors.purple[200],
                  borderRadius: DESIGN_TOKENS.borderRadius.full,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
            </div>
            
            <div>
              <label style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                color: DESIGN_TOKENS.colors.purple[800],
                marginBottom: DESIGN_TOKENS.spacing[2],
                display: 'block'
              }}>
                終了時刻: {timeCondition.range?.max || 5}秒後
              </label>
              <input
                type="range"
                min="0.1"
                max={gameDuration}
                step="0.1"
                value={timeCondition.range?.max || 5}
                onChange={(e) => {
                  const max = parseFloat(e.target.value);
                  updateCondition(index, { 
                    range: { 
                      min: Math.min(timeCondition.range?.min || 2, max - 0.1), 
                      max 
                    } 
                  });
                }}
                style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: DESIGN_TOKENS.colors.purple[200],
                  borderRadius: DESIGN_TOKENS.borderRadius.full,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.purple[500],
              marginTop: DESIGN_TOKENS.spacing[1]
            }}>
              <span>0秒</span>
              <span>{gameDuration}秒</span>
            </div>
          </div>
        )}

        {/* 間隔設定（intervalタイプの場合） */}
        {timeCondition.timeType === 'interval' && (
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.purple[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              間隔時間: {timeCondition.interval || 2}秒毎
            </label>
            <input
              type="range"
              min="0.1"
              max="10"
              step="0.1"
              value={timeCondition.interval || 2}
              onChange={(e) => updateCondition(index, { interval: parseFloat(e.target.value) })}
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
              color: DESIGN_TOKENS.colors.purple[500],
              marginTop: DESIGN_TOKENS.spacing[1]
            }}>
              <span>0.1秒毎</span>
              <span>10秒毎</span>
            </div>
          </div>
        )}

        <div style={{
          padding: DESIGN_TOKENS.spacing[3],
          backgroundColor: DESIGN_TOKENS.colors.purple[100],
          borderRadius: DESIGN_TOKENS.borderRadius.lg,
          fontSize: DESIGN_TOKENS.typography.fontSize.xs,
          color: DESIGN_TOKENS.colors.purple[800]
        }}>
          💡 設定内容: {TIME_CONDITION_OPTIONS.find(t => t.value === timeCondition.timeType)?.description}
          {timeCondition.timeType === 'exact' && ` - ゲーム開始から${timeCondition.seconds || 3}秒後`}
          {timeCondition.timeType === 'range' && ` - ${timeCondition.range?.min || 2}秒〜${timeCondition.range?.max || 5}秒の間`}
          {timeCondition.timeType === 'interval' && ` - ${timeCondition.interval || 2}秒毎に繰り返し`}
        </div>
      </ModernCard>
    );
  };

  // Phase C Step 1-2: フラグ条件詳細設定コンポーネント（エラー修正）
  const FlagConditionEditor = ({ condition, index }: { condition: TriggerCondition & { type: 'flag' }, index: number }) => {
    const flagCondition = condition;
    
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
          fontSize: DESIGN_TOKENS.typography.fontSize.base,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
          color: DESIGN_TOKENS.colors.purple[800],
          margin: 0,
          marginBottom: DESIGN_TOKENS.spacing[4],
          display: 'flex',
          alignItems: 'center',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.lg }}>🚩</span>
          フラグ条件詳細設定
        </h5>

        {/* フラグ選択 */}
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.purple[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            対象フラグ
          </label>
          <select
            value={flagCondition.flagId}
            onChange={(e) => updateCondition(index, { flagId: e.target.value })}
            style={{
              width: '100%',
              padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[3]}`,
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              border: `1px solid ${DESIGN_TOKENS.colors.purple[200]}`,
              borderRadius: DESIGN_TOKENS.borderRadius.lg,
              backgroundColor: DESIGN_TOKENS.colors.neutral[0],
              outline: 'none'
            }}
          >
            <option value="">フラグを選択</option>
            {projectFlags.map((flag) => (
              <option key={flag.id} value={flag.id}>
                {flag.name} ({flag.initialValue ? 'ON' : 'OFF'}初期値)
              </option>
            ))}
          </select>
        </div>

        {/* フラグ条件タイプ選択 */}
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.purple[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            条件タイプ
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: DESIGN_TOKENS.spacing[2]
          }}>
            {FLAG_CONDITION_OPTIONS.map((option) => (
              <ModernButton
                key={option.value}
                variant={flagCondition.condition === option.value ? 'primary' : 'outline'}
                size="sm"
                onClick={() => updateCondition(index, { condition: option.value as any })}
                style={{
                  borderColor: flagCondition.condition === option.value 
                    ? DESIGN_TOKENS.colors.purple[500] 
                    : DESIGN_TOKENS.colors.purple[200],
                  backgroundColor: flagCondition.condition === option.value 
                    ? DESIGN_TOKENS.colors.purple[500] 
                    : 'transparent',
                  color: flagCondition.condition === option.value 
                    ? DESIGN_TOKENS.colors.neutral[0] 
                    : DESIGN_TOKENS.colors.purple[800],
                  padding: DESIGN_TOKENS.spacing[2],
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: DESIGN_TOKENS.spacing[1]
                }}
              >
                <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.base }}>{option.icon}</span>
                <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, fontWeight: DESIGN_TOKENS.typography.fontWeight.medium, textAlign: 'center' }}>
                  {option.label}
                </span>
              </ModernButton>
            ))}
          </div>
        </div>

        <div style={{
          padding: DESIGN_TOKENS.spacing[3],
          backgroundColor: DESIGN_TOKENS.colors.purple[100],
          borderRadius: DESIGN_TOKENS.borderRadius.lg,
          fontSize: DESIGN_TOKENS.typography.fontSize.xs,
          color: DESIGN_TOKENS.colors.purple[800]
        }}>
          💡 設定内容: {FLAG_CONDITION_OPTIONS.find(f => f.value === flagCondition.condition)?.description}
          {flagCondition.flagId && projectFlags.find(f => f.id === flagCondition.flagId) && 
            ` - 「${projectFlags.find(f => f.id === flagCondition.flagId)?.name}」フラグ`}
        </div>
      </ModernCard>
    );
  };

  // Phase C Step 1-2: 音再生アクション詳細設定コンポーネント（エラー修正）
  const SoundActionEditor = ({ action, index }: { action: GameAction & { type: 'playSound' }, index: number }) => {
    const soundAction = action;
    
    return (
      <ModernCard 
        variant="outlined" 
        size="md"
        style={{ 
          backgroundColor: DESIGN_TOKENS.colors.success[50],
          border: `2px solid ${DESIGN_TOKENS.colors.success[200]}`,
          marginTop: DESIGN_TOKENS.spacing[3]
        }}
      >
        <h5 style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.base,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
          color: DESIGN_TOKENS.colors.success[800],
          margin: 0,
          marginBottom: DESIGN_TOKENS.spacing[4],
          display: 'flex',
          alignItems: 'center',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.lg }}>🔊</span>
          音再生詳細設定
        </h5>

        {/* SE選択 */}
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.success[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            音声選択
          </label>
          <select
            value={soundAction.soundId}
            onChange={(e) => updateAction(index, { soundId: e.target.value })}
            style={{
              width: '100%',
              padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[3]}`,
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              border: `1px solid ${DESIGN_TOKENS.colors.success[200]}`,
              borderRadius: DESIGN_TOKENS.borderRadius.lg,
              backgroundColor: DESIGN_TOKENS.colors.neutral[0],
              outline: 'none'
            }}
          >
            <option value="">音声を選択</option>
            {project.assets.audio?.se?.map((sound) => (
              <option key={sound.id} value={sound.id}>
                {sound.name}
              </option>
            ))}
          </select>
        </div>

        {/* 音量調整 */}
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.success[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            音量: {Math.round((soundAction.volume || 0.8) * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={soundAction.volume || 0.8}
            onChange={(e) => updateAction(index, { volume: parseFloat(e.target.value) })}
            style={{
              width: '100%',
              height: '8px',
              backgroundColor: DESIGN_TOKENS.colors.success[200],
              borderRadius: DESIGN_TOKENS.borderRadius.full,
              outline: 'none',
              cursor: 'pointer'
            }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: DESIGN_TOKENS.typography.fontSize.xs,
            color: DESIGN_TOKENS.colors.success[600],
            marginTop: DESIGN_TOKENS.spacing[1]
          }}>
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>

        {/* 音量レベル表示 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: DESIGN_TOKENS.spacing[2],
          marginBottom: DESIGN_TOKENS.spacing[4]
        }}>
          <span style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.xs,
            color: DESIGN_TOKENS.colors.success[800],
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium
          }}>
            音量レベル:
          </span>
          <div style={{
            flex: 1,
            height: '8px',
            backgroundColor: DESIGN_TOKENS.colors.neutral[200],
            borderRadius: DESIGN_TOKENS.borderRadius.full,
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${(soundAction.volume || 0.8) * 100}%`,
              backgroundColor: DESIGN_TOKENS.colors.success[500],
              transition: `width ${DESIGN_TOKENS.animation.duration.fast} ${DESIGN_TOKENS.animation.easing.inOut}`
            }} />
          </div>
          <span style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.xs,
            color: DESIGN_TOKENS.colors.success[800],
            fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
            minWidth: '40px',
            textAlign: 'right'
          }}>
            {Math.round((soundAction.volume || 0.8) * 100)}%
          </span>
        </div>

        {/* プレビュー再生ボタン */}
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <ModernButton
            variant="outline"
            size="sm"
            onClick={() => {
              // TODO: Phase C Step 2で実装予定
              showNotification('info', 'プレビュー再生機能は今後実装予定です');
            }}
            style={{
              borderColor: DESIGN_TOKENS.colors.success[200],
              color: DESIGN_TOKENS.colors.success[600],
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: DESIGN_TOKENS.spacing[2]
            }}
          >
            <span>▶️</span>
            <span>プレビュー再生</span>
          </ModernButton>
        </div>

        <div style={{
          padding: DESIGN_TOKENS.spacing[3],
          backgroundColor: DESIGN_TOKENS.colors.success[100],
          borderRadius: DESIGN_TOKENS.borderRadius.lg,
          fontSize: DESIGN_TOKENS.typography.fontSize.xs,
          color: DESIGN_TOKENS.colors.success[800]
        }}>
          💡 設定内容: 
          {soundAction.soundId 
            ? `「${project.assets.audio?.se?.find(s => s.id === soundAction.soundId)?.name || '音声'}」を${Math.round((soundAction.volume || 0.8) * 100)}%で再生`
            : '音声を選択してください'}
        </div>
      </ModernCard>
    );
  };

  // 🆕 Phase C Step 2: 移動アクション詳細設定コンポーネント
  const MoveActionEditor = ({ action, index }: { action: GameAction & { type: 'move' }, index: number }) => {
    const moveAction = action;
    
    return (
      <ModernCard 
        variant="outlined" 
        size="md"
        style={{ 
          backgroundColor: DESIGN_TOKENS.colors.success[50],
          border: `2px solid ${DESIGN_TOKENS.colors.success[200]}`,
          marginTop: DESIGN_TOKENS.spacing[3]
        }}
      >
        <h5 style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.base,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
          color: DESIGN_TOKENS.colors.success[800],
          margin: 0,
          marginBottom: DESIGN_TOKENS.spacing[4],
          display: 'flex',
          alignItems: 'center',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.lg }}>🏃</span>
          移動アクション詳細設定
        </h5>

        {/* 移動タイプ選択 */}
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.success[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            移動タイプ
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: DESIGN_TOKENS.spacing[2]
          }}>
            {MOVEMENT_TYPE_OPTIONS.slice(0, 4).map((option) => (
              <ModernButton
                key={option.value}
                variant={moveAction.movement?.type === option.value ? 'primary' : 'outline'}
                size="sm"
                onClick={() => updateAction(index, { 
                  movement: { 
                    ...moveAction.movement,
                    type: option.value as any,
                    target: option.value === 'stop' ? undefined : { x: 0.5, y: 0.5 },
                    speed: option.value === 'teleport' ? undefined : 300,
                    duration: option.value === 'teleport' ? 0.1 : 2.0
                  } 
                })}
                style={{
                  borderColor: moveAction.movement?.type === option.value 
                    ? DESIGN_TOKENS.colors.success[500] 
                    : DESIGN_TOKENS.colors.success[200],
                  backgroundColor: moveAction.movement?.type === option.value 
                    ? DESIGN_TOKENS.colors.success[500] 
                    : 'transparent',
                  color: moveAction.movement?.type === option.value 
                    ? DESIGN_TOKENS.colors.neutral[0] 
                    : DESIGN_TOKENS.colors.success[800],
                  padding: DESIGN_TOKENS.spacing[2],
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: DESIGN_TOKENS.spacing[1]
                }}
              >
                <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.base }}>{option.icon}</span>
                <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, fontWeight: DESIGN_TOKENS.typography.fontWeight.medium, textAlign: 'center' }}>
                  {option.label}
                </span>
              </ModernButton>
            ))}
          </div>
          
          {/* 追加移動タイプ（2行目） */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: DESIGN_TOKENS.spacing[2],
            marginTop: DESIGN_TOKENS.spacing[2]
          }}>
            {MOVEMENT_TYPE_OPTIONS.slice(4).map((option) => (
              <ModernButton
                key={option.value}
                variant={moveAction.movement?.type === option.value ? 'primary' : 'outline'}
                size="sm"
                onClick={() => updateAction(index, { 
                  movement: { 
                    ...moveAction.movement,
                    type: option.value as any,
                    target: option.value === 'stop' ? undefined : { x: 0.5, y: 0.5 },
                    speed: option.value === 'teleport' ? undefined : 300,
                    duration: option.value === 'teleport' ? 0.1 : 2.0
                  } 
                })}
                style={{
                  borderColor: moveAction.movement?.type === option.value 
                    ? DESIGN_TOKENS.colors.success[500] 
                    : DESIGN_TOKENS.colors.success[200],
                  backgroundColor: moveAction.movement?.type === option.value 
                    ? DESIGN_TOKENS.colors.success[500] 
                    : 'transparent',
                  color: moveAction.movement?.type === option.value 
                    ? DESIGN_TOKENS.colors.neutral[0] 
                    : DESIGN_TOKENS.colors.success[800],
                  padding: DESIGN_TOKENS.spacing[2],
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: DESIGN_TOKENS.spacing[1]
                }}
              >
                <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.base }}>{option.icon}</span>
                <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, fontWeight: DESIGN_TOKENS.typography.fontWeight.medium, textAlign: 'center' }}>
                  {option.label}
                </span>
              </ModernButton>
            ))}
          </div>
        </div>

        {/* 移動速度設定（stopとteleport以外） */}
        {moveAction.movement?.type && !['stop', 'teleport'].includes(moveAction.movement.type) && (
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              移動速度: {moveAction.movement?.speed || 300}px/秒
            </label>
            <input
              type="range"
              min="50"
              max="1000"
              step="50"
              value={moveAction.movement?.speed || 300}
              onChange={(e) => updateAction(index, { 
                movement: { 
                  ...moveAction.movement,
                  speed: parseInt(e.target.value) 
                } 
              })}
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: DESIGN_TOKENS.colors.success[200],
                borderRadius: DESIGN_TOKENS.borderRadius.full,
                outline: 'none',
                cursor: 'pointer'
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.success[600],
              marginTop: DESIGN_TOKENS.spacing[1]
            }}>
              <span>50px/秒</span>
              <span>1000px/秒</span>
            </div>
          </div>
        )}

        {/* 移動時間設定（stopとstraight以外） */}
        {moveAction.movement?.type && !['stop'].includes(moveAction.movement.type) && (
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              移動時間: {moveAction.movement?.duration || 2}秒
            </label>
            <input
              type="range"
              min="0.1"
              max="10"
              step="0.1"
              value={moveAction.movement?.duration || 2}
              onChange={(e) => updateAction(index, { 
                movement: { 
                  ...moveAction.movement,
                  duration: parseFloat(e.target.value) 
                } 
              })}
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: DESIGN_TOKENS.colors.success[200],
                borderRadius: DESIGN_TOKENS.borderRadius.full,
                outline: 'none',
                cursor: 'pointer'
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.success[600],
              marginTop: DESIGN_TOKENS.spacing[1]
            }}>
              <span>0.1秒</span>
              <span>10秒</span>
            </div>
          </div>
        )}

        {/* 移動座標設定（座標指定が必要なタイプ） */}
        {moveAction.movement?.type && ['straight', 'teleport', 'approach'].includes(moveAction.movement.type) && (
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              目標座標
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: DESIGN_TOKENS.spacing[2] }}>
              <div>
                <label style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.success[800],
                  marginBottom: DESIGN_TOKENS.spacing[1],
                  display: 'block'
                }}>
                  X座標: {((moveAction.movement?.target as any)?.x || 0.5).toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={(moveAction.movement?.target as any)?.x || 0.5}
                  onChange={(e) => updateAction(index, { 
                    movement: { 
                      ...moveAction.movement,
                      target: {
                        x: parseFloat(e.target.value),
                        y: (moveAction.movement?.target as any)?.y || 0.5
                      }
                    } 
                  })}
                  style={{
                    width: '100%',
                    height: '6px',
                    backgroundColor: DESIGN_TOKENS.colors.success[200],
                    borderRadius: DESIGN_TOKENS.borderRadius.full,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
              </div>
              <div>
                <label style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.success[800],
                  marginBottom: DESIGN_TOKENS.spacing[1],
                  display: 'block'
                }}>
                  Y座標: {((moveAction.movement?.target as any)?.y || 0.5).toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={(moveAction.movement?.target as any)?.y || 0.5}
                  onChange={(e) => updateAction(index, { 
                    movement: { 
                      ...moveAction.movement,
                      target: {
                        x: (moveAction.movement?.target as any)?.x || 0.5,
                        y: parseFloat(e.target.value)
                      }
                    } 
                  })}
                  style={{
                    width: '100%',
                    height: '6px',
                    backgroundColor: DESIGN_TOKENS.colors.success[200],
                    borderRadius: DESIGN_TOKENS.borderRadius.full,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* 移動プレビューボタン */}
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <ModernButton
            variant="outline"
            size="sm"
            onClick={() => {
              // TODO: Phase C Step 2で実装予定
              showNotification('info', '移動プレビュー機能は今後実装予定です');
            }}
            style={{
              borderColor: DESIGN_TOKENS.colors.success[200],
              color: DESIGN_TOKENS.colors.success[600],
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: DESIGN_TOKENS.spacing[2]
            }}
          >
            <span>👁️</span>
            <span>移動プレビュー</span>
          </ModernButton>
        </div>

        <div style={{
          padding: DESIGN_TOKENS.spacing[3],
          backgroundColor: DESIGN_TOKENS.colors.success[100],
          borderRadius: DESIGN_TOKENS.borderRadius.lg,
          fontSize: DESIGN_TOKENS.typography.fontSize.xs,
          color: DESIGN_TOKENS.colors.success[800]
        }}>
          💡 設定内容: 
          {moveAction.movement?.type 
            ? `「${MOVEMENT_TYPE_OPTIONS.find(m => m.value === moveAction.movement?.type)?.label || '移動'}」`
            : '移動タイプを選択してください'}
          {moveAction.movement?.type && !['stop', 'teleport'].includes(moveAction.movement.type) && 
            ` - 速度${moveAction.movement?.speed || 300}px/秒`}
          {moveAction.movement?.duration && ` - ${moveAction.movement.duration}秒間`}
        </div>
      </ModernCard>
    );
  };

  // 🆕 Phase C Step 2: エフェクトアクション詳細設定コンポーネント
  const EffectActionEditor = ({ action, index }: { action: GameAction & { type: 'effect' }, index: number }) => {
    const effectAction = action;
    
    return (
      <ModernCard 
        variant="outlined" 
        size="md"
        style={{ 
          backgroundColor: DESIGN_TOKENS.colors.success[50],
          border: `2px solid ${DESIGN_TOKENS.colors.success[200]}`,
          marginTop: DESIGN_TOKENS.spacing[3]
        }}
      >
        <h5 style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.base,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
          color: DESIGN_TOKENS.colors.success[800],
          margin: 0,
          marginBottom: DESIGN_TOKENS.spacing[4],
          display: 'flex',
          alignItems: 'center',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.lg }}>✨</span>
          エフェクト詳細設定
        </h5>

        {/* エフェクトタイプ選択 */}
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.success[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            エフェクトタイプ
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: DESIGN_TOKENS.spacing[2]
          }}>
            {EFFECT_TYPE_OPTIONS.map((option) => (
              <ModernButton
                key={option.value}
                variant={effectAction.effect?.type === option.value ? 'primary' : 'outline'}
                size="sm"
                onClick={() => updateAction(index, { 
                  effect: { 
                    ...effectAction.effect,
                    type: option.value as any,
                    duration: 1.0,
                    intensity: 0.8
                  } 
                })}
                style={{
                  borderColor: effectAction.effect?.type === option.value 
                    ? DESIGN_TOKENS.colors.success[500] 
                    : DESIGN_TOKENS.colors.success[200],
                  backgroundColor: effectAction.effect?.type === option.value 
                    ? DESIGN_TOKENS.colors.success[500] 
                    : 'transparent',
                  color: effectAction.effect?.type === option.value 
                    ? DESIGN_TOKENS.colors.neutral[0] 
                    : DESIGN_TOKENS.colors.success[800],
                  padding: DESIGN_TOKENS.spacing[2],
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: DESIGN_TOKENS.spacing[1]
                }}
              >
                <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.base }}>{option.icon}</span>
                <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, fontWeight: DESIGN_TOKENS.typography.fontWeight.medium, textAlign: 'center' }}>
                  {option.label}
                </span>
              </ModernButton>
            ))}
          </div>
        </div>

        {/* エフェクト強度設定 */}
        {effectAction.effect?.type && (
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              エフェクト強度: {Math.round((effectAction.effect?.intensity || 0.8) * 100)}%
            </label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={effectAction.effect?.intensity || 0.8}
              onChange={(e) => updateAction(index, { 
                effect: { 
                  ...effectAction.effect,
                  intensity: parseFloat(e.target.value) 
                } 
              })}
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: DESIGN_TOKENS.colors.success[200],
                borderRadius: DESIGN_TOKENS.borderRadius.full,
                outline: 'none',
                cursor: 'pointer'
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.success[600],
              marginTop: DESIGN_TOKENS.spacing[1]
            }}>
              <span>10%</span>
              <span>100%</span>
            </div>
          </div>
        )}

        {/* エフェクト持続時間設定 */}
        {effectAction.effect?.type && (
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              持続時間: {effectAction.effect?.duration || 1}秒
            </label>
            <input
              type="range"
              min="0.1"
              max="10"
              step="0.1"
              value={effectAction.effect?.duration || 1}
              onChange={(e) => updateAction(index, { 
                effect: { 
                  ...effectAction.effect,
                  duration: parseFloat(e.target.value) 
                } 
              })}
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: DESIGN_TOKENS.colors.success[200],
                borderRadius: DESIGN_TOKENS.borderRadius.full,
                outline: 'none',
                cursor: 'pointer'
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.success[600],
              marginTop: DESIGN_TOKENS.spacing[1]
            }}>
              <span>0.1秒</span>
              <span>10秒</span>
            </div>
          </div>
        )}

        {/* エフェクトプレビューボタン */}
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <ModernButton
            variant="outline"
            size="sm"
            onClick={() => {
              // TODO: Phase C Step 2で実装予定
              showNotification('info', 'エフェクトプレビュー機能は今後実装予定です');
            }}
            style={{
              borderColor: DESIGN_TOKENS.colors.success[200],
              color: DESIGN_TOKENS.colors.success[600],
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: DESIGN_TOKENS.spacing[2]
            }}
          >
            <span>👁️</span>
            <span>エフェクトプレビュー</span>
          </ModernButton>
        </div>

        <div style={{
          padding: DESIGN_TOKENS.spacing[3],
          backgroundColor: DESIGN_TOKENS.colors.success[100],
          borderRadius: DESIGN_TOKENS.borderRadius.lg,
          fontSize: DESIGN_TOKENS.typography.fontSize.xs,
          color: DESIGN_TOKENS.colors.success[800]
        }}>
          💡 設定内容: 
          {effectAction.effect?.type 
            ? `「${EFFECT_TYPE_OPTIONS.find(e => e.value === effectAction.effect?.type)?.label || 'エフェクト'}」`
            : 'エフェクトタイプを選択してください'}
          {effectAction.effect?.intensity && ` - 強度${Math.round(effectAction.effect.intensity * 100)}%`}
          {effectAction.effect?.duration && ` - ${effectAction.effect.duration}秒間`}
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
            type: 'glow',
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

  // アクション更新（Phase A・B保護・拡張）
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
                  高度なルール設定 - Phase C Step 2完了
                </h3>
                <p 
                  style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                    color: DESIGN_TOKENS.colors.purple[100],
                    fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                    margin: 0
                  }}
                >
                  タッチ・音再生・フラグ・時間・移動・エフェクト詳細設定完了・ルール設定システム100%実現
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

              {/* 右上: 実行アクション（簡易版・Phase A・B保護・Step 1-2拡張） */}
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

                {/* アクション一覧（簡易表示・Phase A・B保護・Step 1-2拡張） */}
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
                          borderRadius: DESIGN_TOKENS.borderRadius.lg,
                          fontSize: DESIGN_TOKENS.typography.fontSize.xs
                        }}
                      >
                        <span>{ACTION_LIBRARY.find(a => a.type === action.type)?.icon}</span>
                        <span>{ACTION_LIBRARY.find(a => a.type === action.type)?.label}</span>
                        {/* Phase C Step 2: アクション詳細設定ボタン */}
                        {(action.type === 'playSound' || action.type === 'move' || action.type === 'effect') && (
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
                            marginLeft: (action.type === 'playSound' || action.type === 'move' || action.type === 'effect') ? 0 : 'auto'
                          }}
                        >
                          ✕
                        </ModernButton>
                      </div>
                      
                      {/* Phase C Step 1-2: 音再生アクション詳細設定UI */}
                      {action.type === 'playSound' && (
                        <SoundActionEditor action={action} index={index} />
                      )}
                      
                      {/* 🆕 Phase C Step 2: 移動アクション詳細設定UI */}
                      {action.type === 'move' && (
                        <MoveActionEditor action={action} index={index} />
                      )}
                      
                      {/* 🆕 Phase C Step 2: エフェクトアクション詳細設定UI */}
                      {action.type === 'effect' && (
                        <EffectActionEditor action={action} index={index} />
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

              {/* 左下: 発動条件（詳細版・Phase C Step 1-1・1-2・2拡張） */}
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
                      border: `1px solid ${DESIGN_TOKENS.colors.purple[200]}`,
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
                        borderColor: DESIGN_TOKENS.colors.purple[200],
                        color: DESIGN_TOKENS.colors.purple[800],
                        fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                        padding: DESIGN_TOKENS.spacing[1]
                      }}
                    >
                      <span>{conditionType.icon}</span>
                    </ModernButton>
                  ))}
                </div>

                {/* Phase C Step 1-1・1-2・2: 条件一覧（詳細パラメータ編集対応） */}
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
                          borderRadius: DESIGN_TOKENS.borderRadius.lg,
                          fontSize: DESIGN_TOKENS.typography.fontSize.xs
                        }}
                      >
                        <span>{CONDITION_LIBRARY.find(c => c.type === condition.type)?.icon}</span>
                        <span>{CONDITION_LIBRARY.find(c => c.type === condition.type)?.label}</span>
                        {/* Phase C: 詳細設定ボタン */}
                        <ModernButton
                          variant="outline"
                          size="xs"
                          onClick={() => startEditingCondition(index)}
                          style={{
                            borderColor: DESIGN_TOKENS.colors.purple[200],
                            color: DESIGN_TOKENS.colors.purple[800],
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
                      
                      {/* Phase C Step 1-1: タッチ条件詳細設定UI（保護） */}
                      {condition.type === 'touch' && (
                        <TouchConditionEditor condition={condition} index={index} />
                      )}
                      
                      {/* 🆕 Phase C Step 2: 時間条件詳細設定UI */}
                      {condition.type === 'time' && (
                        <TimeConditionEditor condition={condition} index={index} />
                      )}
                      
                      {/* Phase C Step 1-2: フラグ条件詳細設定UI */}
                      {condition.type === 'flag' && (
                        <FlagConditionEditor condition={condition} index={index} />
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
                        borderRadius: DESIGN_TOKENS.borderRadius.lg,
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