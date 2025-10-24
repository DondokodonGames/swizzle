// src/components/editor/script/conditions/TimeConditionEditor.tsx
// Phase C Step 2完了版: 時間条件詳細設定コンポーネント
// AdvancedRuleModal.tsx分割 - Step 2: 条件エディター分離

import React from 'react';
import { TriggerCondition } from '../../../../types/editor/GameScript';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { ModernCard } from '../../../ui/ModernCard';
import { ModernButton } from '../../../ui/ModernButton';
import { TIME_CONDITION_OPTIONS } from '../constants/TimeConstants';

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
  const timeCondition = condition;
  
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
            発動時刻: {timeCondition.seconds || 3}秒後
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