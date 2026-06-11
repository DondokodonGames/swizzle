// src/components/editor/script/conditions/FlagConditionEditor.tsx

import React from 'react';
import { useTranslation } from 'react-i18next';
import { TriggerCondition, GameFlag } from '../../../../types/editor/GameScript';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { EditorCard, FormLabel, OptionGrid, SummaryBox } from '../shared';
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
  const { t } = useTranslation();
  const flagCondition = condition;

  return (
    <EditorCard colorTheme="condition" icon="🚩" title={t('editor.flagCondition.title')}>
      {/* フラグ選択 */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <FormLabel colorTheme="condition">{t('editor.flagCondition.targetFlagLabel')}</FormLabel>
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
            outline: 'none',
          }}
        >
          <option value="">{t('editor.flagCondition.selectFlag')}</option>
          {projectFlags.map((flag) => (
            <option key={flag.id} value={flag.id}>
              {t('editor.flagCondition.flagWithInitial', {
                name: flag.name,
                status: flag.initialValue ? t('editor.flagCondition.initialOn') : t('editor.flagCondition.initialOff')
              })}
            </option>
          ))}
        </select>
      </div>

      {/* フラグ条件タイプ選択 */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <FormLabel colorTheme="condition">{t('editor.flagCondition.conditionTypeLabel')}</FormLabel>
        <OptionGrid
          colorTheme="condition"
          options={FLAG_CONDITION_OPTIONS as any}
          selectedValue={flagCondition.condition}
          onSelect={(v) => onUpdate(index, { condition: v as any })}
          minWidth={120}
          buttonPadding={DESIGN_TOKENS.spacing[2]}
        />
      </div>

      <SummaryBox colorTheme="condition">
        {t('editor.flagCondition.settingsSummaryTitle')}
        {FLAG_CONDITION_OPTIONS.find(f => f.value === flagCondition.condition)?.description}
        {flagCondition.flagId && projectFlags.find(f => f.id === flagCondition.flagId) &&
          t('editor.flagCondition.withFlag', { name: projectFlags.find(f => f.id === flagCondition.flagId)?.name })}
      </SummaryBox>
    </EditorCard>
  );
};
