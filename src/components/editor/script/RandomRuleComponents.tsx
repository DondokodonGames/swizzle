// src/components/editor/script/RandomRuleComponents.tsx
// Phase G-3完了版: ランダムシステム専用UIコンポーネント（TypeScriptエラー修正）
// ランダム条件・ランダムアクション専用エディター

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TriggerCondition, GameAction } from '../../../types/editor/GameScript';
import { ModernCard } from '../../ui/ModernCard';
import { ModernButton } from '../../ui/ModernButton';

// デザイン定数
const COLORS = {
  blue: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af' },
  neutral: { 0: '#ffffff', 100: '#f5f5f5', 300: '#d1d5db', 600: '#4b5563', 700: '#374151' },
  success: { 600: '#16a34a' },
  warning: { 600: '#d97706' }
};

const SPACING = { 1: '4px', 2: '8px', 3: '12px', 4: '16px' };
const BORDER_RADIUS = { md: '6px', lg: '8px' };

// 型安全なランダム条件型定義
type RandomConditionType = Extract<TriggerCondition, { type: 'random' }>;

// 型安全なランダムアクション型定義  
type RandomActionType = Extract<GameAction, { type: 'randomAction' }>;

// ランダム条件作成ヘルパー（型安全版）
export const createDefaultRandomCondition = (): RandomConditionType => {
  return {
    type: 'random',
    probability: 0.3,
    interval: 1000,
    maxEventsPerSecond: 5
  };
};

// ランダムアクション作成ヘルパー（型安全版）
export const createDefaultRandomAction = (): RandomActionType => {
  return {
    type: 'randomAction',
    actions: [
      { action: { type: 'success' }, weight: 1 }
    ],
    selectionMode: 'weighted'
  };
};

// ランダム条件エディター
interface RandomConditionEditorProps {
  condition: RandomConditionType;
  onChange: (condition: RandomConditionType) => void;
  onRemove: () => void;
}

export const RandomConditionEditor: React.FC<RandomConditionEditorProps> = ({
  condition,
  onChange,
  onRemove
}) => {
  const { t } = useTranslation();
  const [showAdvanced, setShowAdvanced] = useState(false);

  // プリセットを動的に生成
  const randomPresets = useMemo(() => [
    { label: t('editor.random.presets.condition.lowProbability.label'), probability: 0.1, interval: 2000, description: t('editor.random.presets.condition.lowProbability.description') },
    { label: t('editor.random.presets.condition.mediumProbability.label'), probability: 0.3, interval: 1000, description: t('editor.random.presets.condition.mediumProbability.description') },
    { label: t('editor.random.presets.condition.highProbability.label'), probability: 0.7, interval: 500, description: t('editor.random.presets.condition.highProbability.description') },
    { label: t('editor.random.presets.condition.endless.label'), probability: 0.8, interval: 2500, description: t('editor.random.presets.condition.endless.description') },
    { label: t('editor.random.presets.condition.runner.label'), probability: 0.3, interval: 1200, description: t('editor.random.presets.condition.runner.description') }
  ], [t]);

  // プリセット適用
  const applyPreset = (preset: typeof randomPresets[0]) => {
    onChange({
      ...condition,
      probability: preset.probability,
      interval: preset.interval
    });
  };

  // 確率変更
  const updateProbability = (probability: number) => {
    onChange({
      ...condition,
      probability: Math.max(0.001, Math.min(0.999, probability))
    });
  };

  // 間隔変更
  const updateInterval = (interval: number) => {
    onChange({
      ...condition,
      interval: Math.max(100, interval)
    });
  };

  return (
    <ModernCard 
      variant="outlined" 
      size="sm"
      style={{ 
        backgroundColor: COLORS.blue[50],
        border: `2px solid ${COLORS.blue[200]}`,
        marginTop: SPACING[2]
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: SPACING[3], marginBottom: SPACING[3] }}>
        <span style={{ fontSize: '18px' }}>🎲</span>
        <div style={{ flex: 1 }}>
          <h5 style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 'bold',
            color: COLORS.blue[800]
          }}>
            {t('editor.random.conditionTitle')}
          </h5>
          <p style={{
            margin: 0,
            fontSize: '12px',
            color: COLORS.neutral[600]
          }}>
            {t('editor.random.probabilityWith', {
              percentage: Math.round(condition.probability * 100),
              interval: condition.interval ? t('editor.random.interval', { interval: condition.interval }) : t('editor.random.everyFrame')
            })}
          </p>
        </div>
      </div>

      {/* プリセット選択 */}
      <div style={{ marginBottom: SPACING[3] }}>
        <label style={{
          fontSize: '12px',
          fontWeight: '600',
          color: COLORS.neutral[700],
          display: 'block',
          marginBottom: SPACING[2]
        }}>
          {t('editor.random.presetLabel')}
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
          gap: SPACING[1]
        }}>
          {randomPresets.map((preset, index) => (
            <ModernButton
              key={index}
              variant="outline"
              size="xs"
              onClick={() => applyPreset(preset)}
              style={{
                borderColor: COLORS.blue[200],
                color: COLORS.blue[700],
                fontSize: '10px',
                padding: SPACING[1]
              }}
              title={preset.description}
            >
              {preset.label}
            </ModernButton>
          ))}
        </div>
      </div>

      {/* 確率設定 */}
      <div style={{ marginBottom: SPACING[3] }}>
        <label style={{
          fontSize: '12px',
          fontWeight: '600',
          color: COLORS.neutral[700],
          display: 'block',
          marginBottom: SPACING[1]
        }}>
          {t('editor.random.probabilityLabel', { percentage: Math.round(condition.probability * 100) })}
        </label>
        <input
          type="range"
          min="0.1"
          max="99"
          step="0.1"
          value={condition.probability * 100}
          onChange={(e) => updateProbability(Number(e.target.value) / 100)}
          style={{
            width: '100%',
            accentColor: COLORS.blue[500]
          }}
        />
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          fontSize: '10px', 
          color: COLORS.neutral[600],
          marginTop: SPACING[1]
        }}>
          <span>0.1%</span>
          <span>50%</span>
          <span>99%</span>
        </div>
      </div>

      {/* 間隔設定 */}
      <div style={{ marginBottom: SPACING[3] }}>
        <label style={{
          fontSize: '12px',
          fontWeight: '600',
          color: COLORS.neutral[700],
          display: 'block',
          marginBottom: SPACING[1]
        }}>
          {t('editor.random.intervalLabel', { interval: condition.interval || 1000 })}
        </label>
        <div style={{ display: 'flex', gap: SPACING[2], alignItems: 'center' }}>
          <input
            type="number"
            min="100"
            max="10000"
            step="100"
            value={condition.interval || 1000}
            onChange={(e) => updateInterval(Number(e.target.value))}
            style={{
              flex: 1,
              padding: SPACING[2],
              fontSize: '12px',
              border: `1px solid ${COLORS.neutral[300]}`,
              borderRadius: BORDER_RADIUS.md
            }}
          />
          <span style={{ fontSize: '12px', color: COLORS.neutral[600] }}>{t('editor.random.milliseconds')}</span>
        </div>
      </div>

      {/* 高度な設定 */}
      <div style={{ marginBottom: SPACING[3] }}>
        <ModernButton
          variant="ghost"
          size="xs"
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{ fontSize: '11px', color: COLORS.neutral[600] }}
        >
          {showAdvanced ? '▼' : '▶'} {t('editor.random.advancedSettings')}
        </ModernButton>

        {showAdvanced && (
          <div style={{ marginTop: SPACING[2] }}>
            <label style={{
              fontSize: '12px',
              fontWeight: '600',
              color: COLORS.neutral[700],
              display: 'block',
              marginBottom: SPACING[1]
            }}>
              {t('editor.random.seedLabel')}
            </label>
            <input
              type="text"
              value={condition.seed || ''}
              onChange={(e) => onChange({ ...condition, seed: e.target.value || undefined })}
              placeholder={t('editor.random.seedPlaceholder')}
              style={{
                width: '100%',
                padding: SPACING[2],
                fontSize: '12px',
                border: `1px solid ${COLORS.neutral[300]}`,
                borderRadius: BORDER_RADIUS.md
              }}
            />
            <p style={{
              fontSize: '10px',
              color: COLORS.neutral[600],
              margin: `${SPACING[1]} 0 0 0`
            }}>
              {t('editor.random.seedDescription')}
            </p>
          </div>
        )}
      </div>

      {/* フッター */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: SPACING[2],
        borderTop: `1px solid ${COLORS.neutral[100]}`
      }}>
        <div style={{ fontSize: '10px', color: COLORS.neutral[600] }}>
          {t('editor.random.forEndlessGames')}
        </div>
        <ModernButton
          variant="ghost"
          size="xs"
          onClick={onRemove}
          style={{ color: COLORS.warning[600] }}
        >
          ✕ {t('editor.random.deleteButton')}
        </ModernButton>
      </div>
    </ModernCard>
  );
};

// ランダムアクションエディター（型安全版）
interface RandomActionEditorProps {
  action: RandomActionType;
  onChange: (action: RandomActionType) => void;
  onRemove: () => void;
}

export const RandomActionEditor: React.FC<RandomActionEditorProps> = ({
  action,
  onChange,
  onRemove
}) => {
  const { t } = useTranslation();
  const [showAdvanced, setShowAdvanced] = useState(false);

  // プリセットを動的に生成
  const randomActionPresets = useMemo(() => [
    {
      label: t('editor.random.presets.action.endlessObstacles.label'),
      description: t('editor.random.presets.action.endlessObstacles.description'),
      actions: [
        { action: { type: 'show' as const, targetId: 'obstacle' }, weight: 3 },
        { action: { type: 'show' as const, targetId: 'item' }, weight: 1 }
      ]
    },
    {
      label: t('editor.random.presets.action.bonusEffects.label'),
      description: t('editor.random.presets.action.bonusEffects.description'),
      actions: [
        { action: { type: 'playSound' as const, soundId: 'bonus' }, weight: 2 },
        { action: { type: 'success' as const }, weight: 1 }
      ]
    },
    {
      label: t('editor.random.presets.action.difficultyAdjustment.label'),
      description: t('editor.random.presets.action.difficultyAdjustment.description'),
      actions: [
        { action: { type: 'show' as const, targetId: 'enemy' }, weight: 1 },
        { action: { type: 'hide' as const, targetId: 'enemy' }, weight: 1 }
      ]
    }
  ], [t]);

  // プリセット適用（型安全版）
  const applyPreset = (preset: typeof randomActionPresets[0]) => {
    onChange({
      ...action,
      actions: preset.actions,
      selectionMode: 'weighted'
    });
  };

  // アクション追加
  const addAction = () => {
    onChange({
      ...action,
      actions: [
        ...action.actions,
        { action: { type: 'success' }, weight: 1 }
      ]
    });
  };

  // アクション削除
  const removeAction = (index: number) => {
    onChange({
      ...action,
      actions: action.actions.filter((_, i) => i !== index)
    });
  };

  // 重み更新
  const updateWeight = (index: number, weight: number) => {
    const newActions = [...action.actions];
    newActions[index] = { ...newActions[index], weight: Math.max(1, weight) };
    onChange({ ...action, actions: newActions });
  };

  // 実行制限更新（型安全版）
  const updateExecutionLimit = (updates: Partial<{ maxExecutions?: number; cooldown?: number }>) => {
    onChange({
      ...action,
      executionLimit: {
        ...action.executionLimit,
        ...updates
      }
    });
  };

  // 確率計算
  const calculateProbabilities = () => {
    const totalWeight = action.actions.reduce((sum, option) => sum + (option.weight || 1), 0);
    return action.actions.map(option => 
      Math.round(((option.weight || 1) / totalWeight) * 100)
    );
  };

  const probabilities = calculateProbabilities();

  // アクションタイプ表示用のラベル
  const getActionTypeLabel = (actionType: string): string => {
    const typeMap: Record<string, string> = {
      'success': `✅ ${t('editor.random.actionTypes.success')}`,
      'failure': `❌ ${t('editor.random.actionTypes.failure')}`,
      'playSound': `🔊 ${t('editor.random.actionTypes.playSound')}`,
      'show': `👁️ ${t('editor.random.actionTypes.show')}`,
      'hide': `🚫 ${t('editor.random.actionTypes.hide')}`,
      'counter': `🔢 ${t('editor.random.actionTypes.counter')}`,
      'effect': `✨ ${t('editor.random.actionTypes.effect')}`,
      'move': `🏃 ${t('editor.random.actionTypes.move')}`
    };
    return typeMap[actionType] || actionType;
  };

  return (
    <ModernCard 
      variant="outlined" 
      size="sm"
      style={{ 
        backgroundColor: COLORS.blue[50],
        border: `2px solid ${COLORS.blue[200]}`,
        marginTop: SPACING[2]
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: SPACING[3], marginBottom: SPACING[3] }}>
        <span style={{ fontSize: '18px' }}>🎲</span>
        <div style={{ flex: 1 }}>
          <h5 style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 'bold',
            color: COLORS.blue[800]
          }}>
            {t('editor.random.actionTitle')}
          </h5>
          <p style={{
            margin: 0,
            fontSize: '12px',
            color: COLORS.neutral[600]
          }}>
            {t('editor.random.choices', { count: action.actions.length, probabilities: probabilities.join(', ') })}
          </p>
        </div>
      </div>

      {/* プリセット選択 */}
      <div style={{ marginBottom: SPACING[3] }}>
        <label style={{
          fontSize: '12px',
          fontWeight: '600',
          color: COLORS.neutral[700],
          display: 'block',
          marginBottom: SPACING[2]
        }}>
          {t('editor.random.presetLabel')}
        </label>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: SPACING[1]
        }}>
          {randomActionPresets.map((preset, index) => (
            <ModernButton
              key={index}
              variant="outline"
              size="xs"
              onClick={() => applyPreset(preset)}
              style={{
                borderColor: COLORS.blue[200],
                color: COLORS.blue[700],
                fontSize: '11px',
                padding: SPACING[2],
                textAlign: 'left'
              }}
            >
              <div>
                <div style={{ fontWeight: 'bold' }}>{preset.label}</div>
                <div style={{ fontSize: '10px', opacity: 0.8 }}>{preset.description}</div>
              </div>
            </ModernButton>
          ))}
        </div>
      </div>

      {/* アクション選択肢一覧 */}
      <div style={{ marginBottom: SPACING[3] }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: SPACING[2]
        }}>
          <label style={{
            fontSize: '12px',
            fontWeight: '600',
            color: COLORS.neutral[700]
          }}>
            {t('editor.random.choicesLabel')}
          </label>
          <ModernButton
            variant="outline"
            size="xs"
            onClick={addAction}
            style={{
              borderColor: COLORS.blue[200],
              color: COLORS.blue[700],
              fontSize: '11px'
            }}
          >
            ➕ {t('editor.random.addButton')}
          </ModernButton>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING[2] }}>
          {action.actions.map((option, index) => (
            <div 
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: SPACING[2],
                padding: SPACING[2],
                backgroundColor: COLORS.neutral[0],
                borderRadius: BORDER_RADIUS.md,
                border: `1px solid ${COLORS.neutral[100]}`
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 'bold', minWidth: '30px' }}>
                {probabilities[index]}%
              </span>
              <div style={{ flex: 1, fontSize: '11px' }}>
                {getActionTypeLabel(option.action.type)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: SPACING[1] }}>
                <span style={{ fontSize: '10px', color: COLORS.neutral[600] }}>{t('editor.random.weightLabel')}</span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={option.weight || 1}
                  onChange={(e) => updateWeight(index, Number(e.target.value))}
                  style={{
                    width: '40px',
                    padding: `${SPACING[1]} ${SPACING[1]}`,
                    fontSize: '11px',
                    border: `1px solid ${COLORS.neutral[300]}`,
                    borderRadius: BORDER_RADIUS.md,
                    textAlign: 'center'
                  }}
                />
                <ModernButton
                  variant="ghost"
                  size="xs"
                  onClick={() => removeAction(index)}
                  style={{ color: COLORS.warning[600] }}
                >
                  ✕
                </ModernButton>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 選択方式設定 */}
      <div style={{ marginBottom: SPACING[3] }}>
        <label style={{
          fontSize: '12px',
          fontWeight: '600',
          color: COLORS.neutral[700],
          display: 'block',
          marginBottom: SPACING[1]
        }}>
          {t('editor.random.selectionModeLabel')}
        </label>
        <select
          value={action.selectionMode || 'weighted'}
          onChange={(e) => onChange({
            ...action,
            selectionMode: e.target.value as 'weighted' | 'probability' | 'uniform'
          })}
          style={{
            width: '100%',
            padding: SPACING[2],
            fontSize: '12px',
            border: `1px solid ${COLORS.neutral[300]}`,
            borderRadius: BORDER_RADIUS.md,
            backgroundColor: COLORS.neutral[0]
          }}
        >
          <option value="weighted">{t('editor.random.weighted')}</option>
          <option value="uniform">{t('editor.random.uniform')}</option>
          <option value="probability">{t('editor.random.probability')}</option>
        </select>
      </div>

      {/* 高度な設定 */}
      <div style={{ marginBottom: SPACING[3] }}>
        <ModernButton
          variant="ghost"
          size="xs"
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{ fontSize: '11px', color: COLORS.neutral[600] }}
        >
          {showAdvanced ? '▼' : '▶'} {t('editor.random.executionLimitSettings')}
        </ModernButton>

        {showAdvanced && (
          <div style={{ marginTop: SPACING[2] }}>
            <div style={{ marginBottom: SPACING[2] }}>
              <label style={{
                fontSize: '12px',
                fontWeight: '600',
                color: COLORS.neutral[700],
                display: 'block',
                marginBottom: SPACING[1]
              }}>
                {t('editor.random.maxExecutionsLabel')}
              </label>
              <input
                type="number"
                min="0"
                value={action.executionLimit?.maxExecutions || ''}
                onChange={(e) => updateExecutionLimit({
                  maxExecutions: e.target.value ? Number(e.target.value) : undefined
                })}
                placeholder={t('editor.random.maxExecutionsPlaceholder')}
                style={{
                  width: '100%',
                  padding: SPACING[2],
                  fontSize: '12px',
                  border: `1px solid ${COLORS.neutral[300]}`,
                  borderRadius: BORDER_RADIUS.md
                }}
              />
            </div>

            <div style={{ marginBottom: SPACING[2] }}>
              <label style={{
                fontSize: '12px',
                fontWeight: '600',
                color: COLORS.neutral[700],
                display: 'block',
                marginBottom: SPACING[1]
              }}>
                {t('editor.random.cooldownLabel')}
              </label>
              <div style={{ display: 'flex', gap: SPACING[2], alignItems: 'center' }}>
                <input
                  type="number"
                  min="0"
                  value={action.executionLimit?.cooldown || ''}
                  onChange={(e) => updateExecutionLimit({
                    cooldown: e.target.value ? Number(e.target.value) : undefined
                  })}
                  placeholder={t('editor.random.cooldownPlaceholder')}
                  style={{
                    flex: 1,
                    padding: SPACING[2],
                    fontSize: '12px',
                    border: `1px solid ${COLORS.neutral[300]}`,
                    borderRadius: BORDER_RADIUS.md
                  }}
                />
                <span style={{ fontSize: '12px', color: COLORS.neutral[600] }}>{t('editor.random.milliseconds')}</span>
              </div>
            </div>

            <div>
              <label style={{
                fontSize: '12px',
                color: COLORS.neutral[700],
                display: 'flex',
                alignItems: 'center',
                gap: SPACING[2]
              }}>
                <input
                  type="checkbox"
                  checked={action.debugMode || false}
                  onChange={(e) => onChange({
                    ...action,
                    debugMode: e.target.checked
                  })}
                />
                {t('editor.random.debugMode')}
              </label>
            </div>
          </div>
        )}
      </div>

      {/* フッター */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: SPACING[2],
        borderTop: `1px solid ${COLORS.neutral[100]}`
      }}>
        <div style={{ fontSize: '10px', color: COLORS.neutral[600] }}>
          {t('editor.random.forEndlessAndAutogen')}
        </div>
        <ModernButton
          variant="ghost"
          size="xs"
          onClick={onRemove}
          style={{ color: COLORS.warning[600] }}
        >
          ✕ {t('editor.random.deleteButton')}
        </ModernButton>
      </div>
    </ModernCard>
  );
};

// ランダム条件の表示名取得（プレビュー用）
export const getRandomConditionDisplayName = (condition: RandomConditionType): string => {
  const percentage = Math.round(condition.probability * 100);
  const intervalText = condition.interval ? `${condition.interval}ms間隔で` : '';
  
  return `${intervalText}${percentage}%の確率で条件成立`;
};

// ランダムアクションの表示名取得（プレビュー用）
export const getRandomActionDisplayName = (action: RandomActionType): string => {
  const choiceCount = action.actions.length;
  const totalWeight = action.actions.reduce((sum, option) => sum + (option.weight || 1), 0);
  
  const probabilities = action.actions.map(option => 
    Math.round(((option.weight || 1) / totalWeight) * 100)
  );
  
  return `${choiceCount}択からランダム選択 (${probabilities.join('%, ')}%)`;
};

// ランダムアクション選択肢の確率計算
export const calculateRandomActionProbabilities = (action: RandomActionType): number[] => {
  if (action.selectionMode === 'uniform') {
    // 均等選択
    const probability = 1.0 / action.actions.length;
    return Array(action.actions.length).fill(probability);
  }
  
  if (action.selectionMode === 'probability') {
    // 個別確率指定
    return action.actions.map(option => option.probability || (1.0 / action.actions.length));
  }
  
  // 重み付き選択（デフォルト）
  const totalWeight = action.actions.reduce((sum, option) => sum + (option.weight || 1), 0);
  
  return action.actions.map(option => (option.weight || 1) / totalWeight);
};

// ランダムシード生成
export const generateRandomSeed = (prefix: string = 'seed'): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${prefix}_${timestamp}_${random}`;
};

// ランダム条件のパフォーマンス予測
export const estimateRandomConditionPerformance = (condition: RandomConditionType): {
  eventsPerSecond: number;
  memoryUsage: number; // KB
  cpuLoad: 'low' | 'medium' | 'high';
} => {
  const interval = condition.interval || 1000;
  const eventsPerSecond = (1000 / interval) * condition.probability;
  
  // メモリ使用量の概算（シード、履歴など）
  const memoryUsage = 0.1 + (condition.seed ? 0.05 : 0);
  
  // CPU負荷の判定
  let cpuLoad: 'low' | 'medium' | 'high' = 'low';
  if (eventsPerSecond > 10) cpuLoad = 'high';
  else if (eventsPerSecond > 2) cpuLoad = 'medium';
  
  return {
    eventsPerSecond,
    memoryUsage,
    cpuLoad
  };
};