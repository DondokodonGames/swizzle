// src/components/editor/script/CounterRuleComponents.tsx
// カウンター条件・アクション設定UIコンポーネント - AdvancedRuleModal統合用

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

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
  const comparisonOptions = useMemo(() => {
    const options: Array<{ value: CounterComparison; label: string; description: string }> = [
      { value: 'equals', label: t('editor.counter.ruleComponents.comparisonOptions.equals.label'), description: t('editor.counter.ruleComponents.comparisonOptions.equals.description') },
      { value: 'notEquals', label: t('editor.counter.ruleComponents.comparisonOptions.notEquals.label'), description: t('editor.counter.ruleComponents.comparisonOptions.notEquals.description') },
      { value: 'greater', label: t('editor.counter.ruleComponents.comparisonOptions.greater.label'), description: t('editor.counter.ruleComponents.comparisonOptions.greater.description') },
      { value: 'greaterOrEqual', label: t('editor.counter.ruleComponents.comparisonOptions.greaterOrEqual.label'), description: t('editor.counter.ruleComponents.comparisonOptions.greaterOrEqual.description') },
      { value: 'less', label: t('editor.counter.ruleComponents.comparisonOptions.less.label'), description: t('editor.counter.ruleComponents.comparisonOptions.less.description') },
      { value: 'lessOrEqual', label: t('editor.counter.ruleComponents.comparisonOptions.lessOrEqual.label'), description: t('editor.counter.ruleComponents.comparisonOptions.lessOrEqual.description') },
      { value: 'between', label: t('editor.counter.ruleComponents.comparisonOptions.between.label'), description: t('editor.counter.ruleComponents.comparisonOptions.between.description') },
      { value: 'notBetween', label: t('editor.counter.ruleComponents.comparisonOptions.notBetween.label'), description: t('editor.counter.ruleComponents.comparisonOptions.notBetween.description') },
      { value: 'changed', label: t('editor.counter.ruleComponents.comparisonOptions.changed.label'), description: t('editor.counter.ruleComponents.comparisonOptions.changed.description') }
    ];
    return options;
  }, [t]);

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
          🔢 {t('editor.counter.ruleComponents.conditionTitle')}
        </h4>

        <ModernButton
          variant="ghost"
          size="xs"
          onClick={onRemove}
          style={{ color: DESIGN_TOKENS.colors.error[600] }}
        >
          🗑️ {t('editor.counter.ruleComponents.deleteButton')}
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
            {t('editor.counter.ruleComponents.targetCounter')}
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
              <option value="">{t('editor.counter.ruleComponents.selectCounterPlaceholder')}</option>
              {availableCounters.map((counter) => (
                <option key={counter.id} value={counter.name}>
                  {counter.name} ({t('editor.counter.ruleComponents.initialValueLabel')}: {counter.initialValue})
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
              ⚠️ {t('editor.counter.ruleComponents.noCountersWarning')}
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
            {t('editor.counter.ruleComponents.conditionLabel')}
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
              {currentCondition.comparison === 'between' || currentCondition.comparison === 'notBetween' ? t('editor.counter.ruleComponents.minimumValue') : t('editor.counter.ruleComponents.comparisonValue')}
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
              {t('editor.counter.ruleComponents.maximumValue')}
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
              {t('editor.counter.ruleComponents.conditionPreview')}
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
  const { t } = useTranslation();

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
  const operationOptions = useMemo(() => {
    const options: Array<{ value: CounterOperation; label: string; description: string; needsValue: boolean }> = [
      { value: 'increment', label: t('editor.counter.ruleComponents.operationOptions.increment.label'), description: t('editor.counter.ruleComponents.operationOptions.increment.description'), needsValue: true },
      { value: 'decrement', label: t('editor.counter.ruleComponents.operationOptions.decrement.label'), description: t('editor.counter.ruleComponents.operationOptions.decrement.description'), needsValue: true },
      { value: 'set', label: t('editor.counter.ruleComponents.operationOptions.set.label'), description: t('editor.counter.ruleComponents.operationOptions.set.description'), needsValue: true },
      { value: 'reset', label: t('editor.counter.ruleComponents.operationOptions.reset.label'), description: t('editor.counter.ruleComponents.operationOptions.reset.description'), needsValue: false },
      { value: 'add', label: t('editor.counter.ruleComponents.operationOptions.add.label'), description: t('editor.counter.ruleComponents.operationOptions.add.description'), needsValue: true },
      { value: 'subtract', label: t('editor.counter.ruleComponents.operationOptions.subtract.label'), description: t('editor.counter.ruleComponents.operationOptions.subtract.description'), needsValue: true },
      { value: 'multiply', label: t('editor.counter.ruleComponents.operationOptions.multiply.label'), description: t('editor.counter.ruleComponents.operationOptions.multiply.description'), needsValue: true },
      { value: 'divide', label: t('editor.counter.ruleComponents.operationOptions.divide.label'), description: t('editor.counter.ruleComponents.operationOptions.divide.description'), needsValue: true }
    ];
    return options;
  }, [t]);

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
          ⚡ {t('editor.counter.ruleComponents.actionTitle')}
        </h4>

        <ModernButton
          variant="ghost"
          size="xs"
          onClick={onRemove}
          style={{ color: DESIGN_TOKENS.colors.error[600] }}
        >
          🗑️ {t('editor.counter.ruleComponents.deleteButton')}
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
            {t('editor.counter.ruleComponents.targetCounter')}
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
              <option value="">{t('editor.counter.ruleComponents.selectCounterPlaceholder')}</option>
              {availableCounters.map((counter) => (
                <option key={counter.id} value={counter.name}>
                  {counter.name} ({t('editor.counter.ruleComponents.currentValueLabel')}: {counter.currentValue})
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
              ⚠️ {t('editor.counter.ruleComponents.noCountersWarning')}
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
            {t('editor.counter.ruleComponents.operationLabel')}
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
              {t('editor.counter.ruleComponents.valueLabel')}
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
            {t('editor.counter.ruleComponents.notificationCheckbox')}
          </label>

          {currentAction.notification?.enabled && (
            <div style={{ marginTop: DESIGN_TOKENS.spacing[3] }}>
              <input
                type="text"
                value={currentAction.notification.message || ''}
                onChange={(e) => handleNotificationUpdate({ message: e.target.value })}
                placeholder={t('editor.counter.ruleComponents.notificationPlaceholder')}
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
              {t('editor.counter.ruleComponents.actionPreview')}
            </div>
            <div style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              color: DESIGN_TOKENS.colors.success[800],
              marginTop: DESIGN_TOKENS.spacing[1]
            }}>
              {getCounterActionDisplayName(currentAction)}
              {currentAction.notification?.enabled && (
                <span style={{ marginLeft: DESIGN_TOKENS.spacing[2] }}>
                  📢 {t('editor.counter.ruleComponents.notificationEnabled')}
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
  const { t } = useTranslation();
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
          {t('editor.counter.ruleComponents.noCountersTitle')}
          <br />
          {t('editor.counter.ruleComponents.noCountersMessage')}
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
        🔢 {t('editor.counter.ruleComponents.counterRuleTitle')}
        <span style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.xs,
          color: DESIGN_TOKENS.colors.purple[600],
          fontWeight: DESIGN_TOKENS.typography.fontWeight.normal
        }}>
          ({t('editor.counter.ruleComponents.countersAvailable', { count: counters.length })})
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
          🔢 {t('editor.counter.ruleComponents.addConditionButton')}
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
          ⚡ {t('editor.counter.ruleComponents.addActionButton')}
        </ModernButton>
      </div>

      <div style={{
        fontSize: DESIGN_TOKENS.typography.fontSize.xs,
        color: DESIGN_TOKENS.colors.neutral[500],
        marginTop: DESIGN_TOKENS.spacing[2],
        lineHeight: 1.4
      }}>
        💡 {t('editor.counter.ruleComponents.hint')}
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