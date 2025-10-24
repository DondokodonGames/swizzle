// src/components/editor/script/CounterRuleComponents.tsx
// カウンター条件・アクション設定UIコンポーネント - AdvancedRuleModal統合用

import React, { useState } from 'react';
import { GameProject } from '../../../types/editor/GameProject';
import { TriggerCondition, GameAction } from '../../../types/editor/GameScript';
import { 
  CounterOperation, 
  CounterComparison,
  CounterNotification,
  getCounterConditionDisplayName,
  getCounterActionDisplayName,
  createCounterCondition,
  createCounterAction
} from '../../../types/counterTypes';
import { DESIGN_TOKENS } from '../../../constants/DesignSystem';
import { ModernButton } from '../../ui/ModernButton';

// カウンター条件設定コンポーネント
interface CounterConditionEditorProps {
  condition?: Extract<TriggerCondition, { type: 'counter' }>;
  project: GameProject;
  onChange: (condition: Extract<TriggerCondition, { type: 'counter' }>) => void;
  onRemove: () => void;
}

export const CounterConditionEditor: React.FC<CounterConditionEditorProps> = ({
  condition,
  project,
  onChange,
  onRemove
}) => {
  // デフォルト条件
  const defaultCondition: Extract<TriggerCondition, { type: 'counter' }> = {
    type: 'counter',
    counterName: '',
    comparison: 'equals',
    value: 0
  };

  const currentCondition = condition || defaultCondition;

  // 利用可能なカウンター一覧取得
  const getAvailableCounters = () => {
    return project.script?.counters || [];
  };

  // 比較演算子オプション
  const comparisonOptions: Array<{ value: CounterComparison; label: string; description: string }> = [
    { value: 'equals', label: '等しい (==)', description: '完全一致' },
    { value: 'notEquals', label: '等しくない (!=)', description: '完全不一致' },
    { value: 'greater', label: 'より大きい (>)', description: '指定値より大きい' },
    { value: 'greaterOrEqual', label: '以上 (>=)', description: '指定値以上' },
    { value: 'less', label: 'より小さい (<)', description: '指定値より小さい' },
    { value: 'lessOrEqual', label: '以下 (<=)', description: '指定値以下' },
    { value: 'between', label: '範囲内', description: '指定範囲内' },
    { value: 'notBetween', label: '範囲外', description: '指定範囲外' },
    { value: 'changed', label: '変更された', description: '前回から値が変化' }
  ];

  const handleFieldUpdate = <K extends keyof Extract<TriggerCondition, { type: 'counter' }>>(
    field: K,
    value: Extract<TriggerCondition, { type: 'counter' }>[K]
  ) => {
    onChange({
      ...currentCondition,
      [field]: value
    });
  };

  const availableCounters = getAvailableCounters();

  return (
    <div style={{
      padding: DESIGN_TOKENS.spacing[4],
      border: `1px solid ${DESIGN_TOKENS.colors.purple[200]}`,
      borderRadius: DESIGN_TOKENS.borderRadius.lg,
      backgroundColor: DESIGN_TOKENS.colors.purple[50]
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <h4 style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.base,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
          color: DESIGN_TOKENS.colors.purple[800],
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          🔢 カウンター条件
        </h4>
        
        <ModernButton
          variant="ghost"
          size="xs"
          onClick={onRemove}
          style={{ color: DESIGN_TOKENS.colors.error[600] }}
        >
          🗑️ 削除
        </ModernButton>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN_TOKENS.spacing[3] }}>
        {/* カウンター選択 */}
        <div>
          <label style={{
            display: 'block',
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.neutral[700],
            marginBottom: DESIGN_TOKENS.spacing[2]
          }}>
            対象カウンター
          </label>
          
          {availableCounters.length > 0 ? (
            <select
              value={currentCondition.counterName}
              onChange={(e) => handleFieldUpdate('counterName', e.target.value)}
              style={{
                width: '100%',
                padding: DESIGN_TOKENS.spacing[3],
                border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                borderRadius: DESIGN_TOKENS.borderRadius.md,
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                backgroundColor: DESIGN_TOKENS.colors.neutral[0]
              }}
            >
              <option value="">カウンターを選択してください</option>
              {availableCounters.map((counter) => (
                <option key={counter.id} value={counter.name}>
                  {counter.name} (初期値: {counter.initialValue})
                </option>
              ))}
            </select>
          ) : (
            <div style={{
              padding: DESIGN_TOKENS.spacing[3],
              backgroundColor: DESIGN_TOKENS.colors.neutral[100],
              borderRadius: DESIGN_TOKENS.borderRadius.md,
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              color: DESIGN_TOKENS.colors.neutral[600]
            }}>
              ⚠️ カウンターが設定されていません。設定タブでカウンターを作成してください。
            </div>
          )}
        </div>

        {/* 比較演算子選択 */}
        <div>
          <label style={{
            display: 'block',
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.neutral[700],
            marginBottom: DESIGN_TOKENS.spacing[2]
          }}>
            条件
          </label>
          
          <select
            value={currentCondition.comparison}
            onChange={(e) => handleFieldUpdate('comparison', e.target.value as CounterComparison)}
            style={{
              width: '100%',
              padding: DESIGN_TOKENS.spacing[3],
              border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
              borderRadius: DESIGN_TOKENS.borderRadius.md,
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              backgroundColor: DESIGN_TOKENS.colors.neutral[0]
            }}
          >
            {comparisonOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <div style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.xs,
            color: DESIGN_TOKENS.colors.neutral[500],
            marginTop: DESIGN_TOKENS.spacing[1]
          }}>
            {comparisonOptions.find(opt => opt.value === currentCondition.comparison)?.description}
          </div>
        </div>

        {/* 比較値設定 */}
        {currentCondition.comparison !== 'changed' && (
          <div>
            <label style={{
              display: 'block',
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.neutral[700],
              marginBottom: DESIGN_TOKENS.spacing[2]
            }}>
              {currentCondition.comparison === 'between' || currentCondition.comparison === 'notBetween' ? '最小値' : '比較値'}
            </label>
            
            <input
              type="number"
              value={currentCondition.value}
              onChange={(e) => handleFieldUpdate('value', Number(e.target.value))}
              style={{
                width: '100%',
                padding: DESIGN_TOKENS.spacing[3],
                border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                borderRadius: DESIGN_TOKENS.borderRadius.md,
                fontSize: DESIGN_TOKENS.typography.fontSize.sm
              }}
            />
          </div>
        )}

        {/* 範囲比較用の最大値 */}
        {(currentCondition.comparison === 'between' || currentCondition.comparison === 'notBetween') && (
          <div>
            <label style={{
              display: 'block',
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.neutral[700],
              marginBottom: DESIGN_TOKENS.spacing[2]
            }}>
              最大値
            </label>
            
            <input
              type="number"
              value={currentCondition.rangeMax || currentCondition.value}
              onChange={(e) => handleFieldUpdate('rangeMax', Number(e.target.value))}
              style={{
                width: '100%',
                padding: DESIGN_TOKENS.spacing[3],
                border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                borderRadius: DESIGN_TOKENS.borderRadius.md,
                fontSize: DESIGN_TOKENS.typography.fontSize.sm
              }}
            />
          </div>
        )}

        {/* プレビュー */}
        {currentCondition.counterName && (
          <div style={{
            padding: DESIGN_TOKENS.spacing[3],
            backgroundColor: DESIGN_TOKENS.colors.purple[100],
            borderRadius: DESIGN_TOKENS.borderRadius.md,
            border: `1px solid ${DESIGN_TOKENS.colors.purple[200]}`
          }}>
            <div style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.purple[800]
            }}>
              条件プレビュー:
            </div>
            <div style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              color: DESIGN_TOKENS.colors.purple[800],
              marginTop: DESIGN_TOKENS.spacing[1]
            }}>
              {getCounterConditionDisplayName(currentCondition)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// カウンターアクション設定コンポーネント
interface CounterActionEditorProps {
  action?: Extract<GameAction, { type: 'counter' }>;
  project: GameProject;
  onChange: (action: Extract<GameAction, { type: 'counter' }>) => void;
  onRemove: () => void;
}

export const CounterActionEditor: React.FC<CounterActionEditorProps> = ({
  action,
  project,
  onChange,
  onRemove
}) => {
  // デフォルトアクション
  const defaultAction: Extract<GameAction, { type: 'counter' }> = {
    type: 'counter',
    operation: 'increment',
    counterName: '',
    value: 1
  };

  const currentAction = action || defaultAction;

  // 利用可能なカウンター一覧取得
  const getAvailableCounters = () => {
    return project.script?.counters || [];
  };

  // 操作タイプオプション
  const operationOptions: Array<{ value: CounterOperation; label: string; description: string; needsValue: boolean }> = [
    { value: 'increment', label: '増加 (+)', description: '指定値だけ増加', needsValue: true },
    { value: 'decrement', label: '減少 (-)', description: '指定値だけ減少', needsValue: true },
    { value: 'set', label: '設定 (=)', description: '指定値に設定', needsValue: true },
    { value: 'reset', label: 'リセット', description: '初期値に戻す', needsValue: false },
    { value: 'add', label: '加算 (+)', description: 'incrementと同じ', needsValue: true },
    { value: 'subtract', label: '減算 (-)', description: 'decrementと同じ', needsValue: true },
    { value: 'multiply', label: '乗算 (×)', description: '指定値を掛ける', needsValue: true },
    { value: 'divide', label: '除算 (÷)', description: '指定値で割る', needsValue: true }
  ];

  const handleFieldUpdate = <K extends keyof Extract<GameAction, { type: 'counter' }>>(
    field: K,
    value: Extract<GameAction, { type: 'counter' }>[K]
  ) => {
    onChange({
      ...currentAction,
      [field]: value
    });
  };

  const handleNotificationUpdate = (notification: Partial<CounterNotification>) => {
    const currentNotification = currentAction.notification || { enabled: false };
    
    handleFieldUpdate('notification', {
      ...currentNotification,
      ...notification
    });
  };

  const currentOperation = operationOptions.find(op => op.value === currentAction.operation);
  const availableCounters = getAvailableCounters();

  return (
    <div style={{
      padding: DESIGN_TOKENS.spacing[4],
      border: `1px solid ${DESIGN_TOKENS.colors.success[200]}`,
      borderRadius: DESIGN_TOKENS.borderRadius.lg,
      backgroundColor: DESIGN_TOKENS.colors.success[50]
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <h4 style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.base,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
          color: DESIGN_TOKENS.colors.success[800],
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          ⚡ カウンターアクション
        </h4>
        
        <ModernButton
          variant="ghost"
          size="xs"
          onClick={onRemove}
          style={{ color: DESIGN_TOKENS.colors.error[600] }}
        >
          🗑️ 削除
        </ModernButton>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN_TOKENS.spacing[3] }}>
        {/* カウンター選択 */}
        <div>
          <label style={{
            display: 'block',
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.neutral[700],
            marginBottom: DESIGN_TOKENS.spacing[2]
          }}>
            対象カウンター
          </label>
          
          {availableCounters.length > 0 ? (
            <select
              value={currentAction.counterName}
              onChange={(e) => handleFieldUpdate('counterName', e.target.value)}
              style={{
                width: '100%',
                padding: DESIGN_TOKENS.spacing[3],
                border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                borderRadius: DESIGN_TOKENS.borderRadius.md,
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                backgroundColor: DESIGN_TOKENS.colors.neutral[0]
              }}
            >
              <option value="">カウンターを選択してください</option>
              {availableCounters.map((counter) => (
                <option key={counter.id} value={counter.name}>
                  {counter.name} (現在値: {counter.currentValue})
                </option>
              ))}
            </select>
          ) : (
            <div style={{
              padding: DESIGN_TOKENS.spacing[3],
              backgroundColor: DESIGN_TOKENS.colors.neutral[100],
              borderRadius: DESIGN_TOKENS.borderRadius.md,
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              color: DESIGN_TOKENS.colors.neutral[600]
            }}>
              ⚠️ カウンターが設定されていません。設定タブでカウンターを作成してください。
            </div>
          )}
        </div>

        {/* 操作タイプ選択 */}
        <div>
          <label style={{
            display: 'block',
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.neutral[700],
            marginBottom: DESIGN_TOKENS.spacing[2]
          }}>
            操作
          </label>
          
          <select
            value={currentAction.operation}
            onChange={(e) => handleFieldUpdate('operation', e.target.value as CounterOperation)}
            style={{
              width: '100%',
              padding: DESIGN_TOKENS.spacing[3],
              border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
              borderRadius: DESIGN_TOKENS.borderRadius.md,
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              backgroundColor: DESIGN_TOKENS.colors.neutral[0]
            }}
          >
            {operationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <div style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.xs,
            color: DESIGN_TOKENS.colors.neutral[500],
            marginTop: DESIGN_TOKENS.spacing[1]
          }}>
            {currentOperation?.description}
          </div>
        </div>

        {/* 操作値設定 */}
        {currentOperation?.needsValue && (
          <div>
            <label style={{
              display: 'block',
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.neutral[700],
              marginBottom: DESIGN_TOKENS.spacing[2]
            }}>
              値
            </label>
            
            <input
              type="number"
              value={currentAction.value || 1}
              onChange={(e) => handleFieldUpdate('value', Number(e.target.value))}
              style={{
                width: '100%',
                padding: DESIGN_TOKENS.spacing[3],
                border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                borderRadius: DESIGN_TOKENS.borderRadius.md,
                fontSize: DESIGN_TOKENS.typography.fontSize.sm
              }}
            />
          </div>
        )}

        {/* 通知設定 */}
        <div>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: DESIGN_TOKENS.spacing[2],
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.neutral[700],
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={currentAction.notification?.enabled || false}
              onChange={(e) => handleNotificationUpdate({ enabled: e.target.checked })}
            />
            変更時に通知を表示
          </label>
          
          {currentAction.notification?.enabled && (
            <div style={{ marginTop: DESIGN_TOKENS.spacing[3] }}>
              <input
                type="text"
                value={currentAction.notification.message || ''}
                onChange={(e) => handleNotificationUpdate({ message: e.target.value })}
                placeholder="通知メッセージ（空白の場合は自動生成）"
                style={{
                  width: '100%',
                  padding: DESIGN_TOKENS.spacing[2],
                  border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                  borderRadius: DESIGN_TOKENS.borderRadius.md,
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs
                }}
              />
            </div>
          )}
        </div>

        {/* プレビュー */}
        {currentAction.counterName && (
          <div style={{
            padding: DESIGN_TOKENS.spacing[3],
            backgroundColor: DESIGN_TOKENS.colors.success[100],
            borderRadius: DESIGN_TOKENS.borderRadius.md,
            border: `1px solid ${DESIGN_TOKENS.colors.success[200]}`
          }}>
            <div style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800]
            }}>
              アクションプレビュー:
            </div>
            <div style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              color: DESIGN_TOKENS.colors.success[800],
              marginTop: DESIGN_TOKENS.spacing[1]
            }}>
              {getCounterActionDisplayName(currentAction)}
              {currentAction.notification?.enabled && (
                <span style={{ marginLeft: DESIGN_TOKENS.spacing[2] }}>
                  📢 通知あり
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// カウンター条件・アクション追加ボタンコンポーネント
interface CounterRuleButtonsProps {
  project: GameProject;
  onAddCounterCondition: () => void;
  onAddCounterAction: () => void;
}

export const CounterRuleButtons: React.FC<CounterRuleButtonsProps> = ({
  project,
  onAddCounterCondition,
  onAddCounterAction
}) => {
  const counters = project.script?.counters || [];
  const hasCounters = counters.length > 0;

  if (!hasCounters) {
    return (
      <div style={{
        padding: DESIGN_TOKENS.spacing[4],
        backgroundColor: DESIGN_TOKENS.colors.neutral[50],
        borderRadius: DESIGN_TOKENS.borderRadius.lg,
        border: `1px dashed ${DESIGN_TOKENS.colors.neutral[300]}`
      }}>
        <div style={{
          textAlign: 'center',
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          color: DESIGN_TOKENS.colors.neutral[600]
        }}>
          <div style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xl, marginBottom: DESIGN_TOKENS.spacing[2] }}>
            🔢
          </div>
          カウンターが設定されていません
          <br />
          設定タブでカウンターを作成してからルールを設定してください
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: DESIGN_TOKENS.spacing[4],
      backgroundColor: DESIGN_TOKENS.colors.purple[50],
      borderRadius: DESIGN_TOKENS.borderRadius.lg,
      border: `1px solid ${DESIGN_TOKENS.colors.purple[200]}`
    }}>
      <div style={{
        fontSize: DESIGN_TOKENS.typography.fontSize.sm,
        fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
        color: DESIGN_TOKENS.colors.purple[800],
        marginBottom: DESIGN_TOKENS.spacing[3],
        display: 'flex',
        alignItems: 'center',
        gap: DESIGN_TOKENS.spacing[2]
      }}>
        🔢 カウンタールール
        <span style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.xs,
          color: DESIGN_TOKENS.colors.purple[600],
          fontWeight: DESIGN_TOKENS.typography.fontWeight.normal
        }}>
          ({counters.length}個のカウンター利用可能)
        </span>
      </div>
      
      <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[3] }}>
        <ModernButton
          variant="outline"
          size="sm"
          onClick={onAddCounterCondition}
          style={{
            borderColor: DESIGN_TOKENS.colors.purple[300],
            color: DESIGN_TOKENS.colors.purple[800],
            flex: 1
          }}
        >
          🔢 カウンター条件追加
        </ModernButton>
        
        <ModernButton
          variant="outline"
          size="sm"
          onClick={onAddCounterAction}
          style={{
            borderColor: DESIGN_TOKENS.colors.success[200],
            color: DESIGN_TOKENS.colors.success[600],
            flex: 1
          }}
        >
          ⚡ カウンターアクション追加
        </ModernButton>
      </div>
      
      <div style={{
        fontSize: DESIGN_TOKENS.typography.fontSize.xs,
        color: DESIGN_TOKENS.colors.neutral[500],
        marginTop: DESIGN_TOKENS.spacing[2],
        lineHeight: 1.4
      }}>
        💡 ヒント: カウンター条件で「スコアが100以上」、アクションで「ライフを1減らす」等を設定できます
      </div>
    </div>
  );
};

// ヘルパー関数：カウンター条件作成
export const createDefaultCounterCondition = (counterName?: string): Extract<TriggerCondition, { type: 'counter' }> => {
  return createCounterCondition(
    counterName || '',
    'equals',
    0
  );
};

// ヘルパー関数：カウンターアクション作成
export const createDefaultCounterAction = (counterName?: string): Extract<GameAction, { type: 'counter' }> => {
  return createCounterAction(
    'increment',
    counterName || '',
    1
  );
};