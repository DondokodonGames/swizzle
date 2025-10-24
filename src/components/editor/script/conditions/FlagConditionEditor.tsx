// src/components/editor/script/conditions/FlagConditionEditor.tsx
// Phase C Step 1-2完了版: フラグ条件詳細設定コンポーネント
// AdvancedRuleModal.tsx分割 - Step 2: 条件エディター分離

import React from 'react';
import { TriggerCondition, GameFlag } from '../../../../types/editor/GameScript';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { ModernCard } from '../../../ui/ModernCard';
import { ModernButton } from '../../../ui/ModernButton';
import { FLAG_CONDITION_OPTIONS } from '../constants/TimeConstants';

interface FlagConditionEditorProps {
  condition: TriggerCondition & { type: 'flag' };
  index: number;
  projectFlags: GameFlag[];
  onUpdate: (index: number, updates: Partial<TriggerCondition>) => void;
}

export const FlagConditionEditor: React.FC<FlagConditionEditorProps> = ({
  condition,
  index,
  projectFlags,
  onUpdate
}) => {
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
          onChange={(e) => onUpdate(index, { flagId: e.target.value })}
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
              onClick={() => onUpdate(index, { condition: option.value as any })}
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