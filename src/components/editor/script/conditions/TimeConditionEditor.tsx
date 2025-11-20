// src/components/editor/script/conditions/TimeConditionEditor.tsx
// Phase C Step 2完了版: 時間条件詳細設定コンポーネント
// AdvancedRuleModal.tsx分割 - Step 2: 条件エディター分離

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TriggerCondition } from '../../../../types/editor/GameScript';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { ModernCard } from '../../../ui/ModernCard';
import { ModernButton } from '../../../ui/ModernButton';
import { getTimeConditionOptions } from '../constants/TimeConstants';

interface TimeConditionEditorProps {
  condition: TriggerCondition & { type: 'time' };
  index: number;
  onUpdate: (index: number, updates: Partial<TriggerCondition>) => void;
  gameDuration?: number;
}

export const TimeConditionEditor: React.FC<TimeConditionEditorProps> = ({
  condition,
  index,
  onUpdate,
  gameDuration = 30 // デフォルト30秒、実際の値は設定から取得予定
}) => {
  const { t } = useTranslation();
  const timeCondition = condition;

  // Get localized options using getter functions that access i18n
  const TIME_CONDITION_OPTIONS = useMemo(() => getTimeConditionOptions(), []);

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
        {t('editor.timeCondition.title')}
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
          {t('editor.timeCondition.conditionTypeLabel')}
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
              onClick={() => onUpdate(index, { timeType: option.value as any })}
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
            {t('editor.timeCondition.triggerTimeLabel', { seconds: timeCondition.seconds || 3 })}
          </label>
          <input
            type="range"
            min="0.1"
            max={gameDuration}
            step="0.1"
            value={timeCondition.seconds || 3}
            onChange={(e) => onUpdate(index, { seconds: parseFloat(e.target.value) })}
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
            <span>{t('editor.timeCondition.seconds', { seconds: 0 })}</span>
            <span>{t('editor.timeCondition.seconds', { seconds: gameDuration })}</span>
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
              {t('editor.timeCondition.startTimeLabel', { seconds: timeCondition.range?.min || 2 })}
            </label>
            <input
              type="range"
              min="0"
              max={gameDuration - 1}
              step="0.1"
              value={timeCondition.range?.min || 2}
              onChange={(e) => {
                const min = parseFloat(e.target.value);
                onUpdate(index, { 
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
              {t('editor.timeCondition.endTimeLabel', { seconds: timeCondition.range?.max || 5 })}
            </label>
            <input
              type="range"
              min="0.1"
              max={gameDuration}
              step="0.1"
              value={timeCondition.range?.max || 5}
              onChange={(e) => {
                const max = parseFloat(e.target.value);
                onUpdate(index, { 
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
            <span>{t('editor.timeCondition.seconds', { seconds: 0 })}</span>
            <span>{t('editor.timeCondition.seconds', { seconds: gameDuration })}</span>
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
            {t('editor.timeCondition.intervalLabel', { interval: timeCondition.interval || 2 })}
          </label>
          <input
            type="range"
            min="0.1"
            max="10"
            step="0.1"
            value={timeCondition.interval || 2}
            onChange={(e) => onUpdate(index, { interval: parseFloat(e.target.value) })}
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
            <span>{t('editor.timeCondition.seconds', { seconds: 0.1 })}</span>
            <span>{t('editor.timeCondition.seconds', { seconds: 10 })}</span>
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
        {t('editor.timeCondition.settingsSummaryTitle')}
        {timeCondition.timeType === 'exact' && t('editor.timeCondition.exactTrigger', { seconds: timeCondition.seconds || 3 })}
        {timeCondition.timeType === 'range' && t('editor.timeCondition.rangeTrigger', {
          start: timeCondition.range?.min || 2,
          end: timeCondition.range?.max || 5
        })}
        {timeCondition.timeType === 'interval' && t('editor.timeCondition.intervalTrigger', { interval: timeCondition.interval || 2 })}
        {!timeCondition.timeType && t('editor.timeCondition.notSet')}
      </div>
    </ModernCard>
  );
};