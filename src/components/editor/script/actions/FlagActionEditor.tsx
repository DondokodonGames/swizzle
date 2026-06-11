// src/components/editor/script/actions/FlagActionEditor.tsx

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { GameAction, GameFlag } from '../../../../types/editor/GameScript';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { ModernButton } from '../../../ui/ModernButton';
import { EditorCard, FormLabel, OptionGrid, SummaryBox } from '../shared';
import {
  getFlagActionOptions,
  getFlagValueOptions,
} from '../constants/FlagConstants';

interface FlagActionEditorProps {
  action: GameAction & { type: 'setFlag' | 'toggleFlag' };
  index: number;
  projectFlags: GameFlag[];
  onUpdate: (index: number, updates: Partial<GameAction>) => void;
  onShowNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const FlagActionEditor: React.FC<FlagActionEditorProps> = ({
  action,
  index,
  projectFlags,
  onUpdate,
  onShowNotification
}) => {
  const { t } = useTranslation();
  const flagAction = action;

  const FLAG_ACTION_OPTIONS = useMemo(() => getFlagActionOptions(), []);
  const FLAG_VALUE_OPTIONS = useMemo(() => getFlagValueOptions(), []);

  const handleActionTypeChange = (newType: 'setFlag' | 'toggleFlag') => {
    if (newType === 'setFlag') {
      onUpdate(index, { type: 'setFlag', flagId: flagAction.flagId, value: true });
    } else {
      onUpdate(index, { type: 'toggleFlag', flagId: flagAction.flagId });
    }
  };

  const getCurrentFlag = () => projectFlags.find(flag => flag.id === flagAction.flagId);
  const getFlagCurrentState = () => getCurrentFlag()?.initialValue ?? false;
  const getPredictedState = () => {
    if (flagAction.type === 'setFlag') return (flagAction as any).value;
    return !getFlagCurrentState();
  };

  return (
    <EditorCard colorTheme="action" icon="🚩" title={t('editor.flagAction.title')}>
      {/* Flag action type selection */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <FormLabel colorTheme="action">{t('editor.flagAction.operationTypeLabel')}</FormLabel>
        <OptionGrid
          colorTheme="action"
          options={FLAG_ACTION_OPTIONS as any}
          selectedValue={flagAction.type}
          onSelect={(v) => handleActionTypeChange(v as 'setFlag' | 'toggleFlag')}
          minWidth={140}
        />
      </div>

      {/* Target flag selection */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <FormLabel colorTheme="action">{t('editor.flagAction.targetFlagLabel')}</FormLabel>
        <select
          value={flagAction.flagId}
          onChange={(e) => onUpdate(index, { flagId: e.target.value })}
          style={{
            width: '100%',
            padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[3]}`,
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            border: `1px solid ${DESIGN_TOKENS.colors.success[200]}`,
            borderRadius: DESIGN_TOKENS.borderRadius.lg,
            backgroundColor: DESIGN_TOKENS.colors.neutral[0],
            outline: 'none',
          }}
        >
          <option value="">{t('editor.flagAction.selectFlagPlaceholder')}</option>
          {projectFlags.map((flag) => (
            <option key={flag.id} value={flag.id}>
              {t('editor.flagAction.flagState', {
                name: flag.name,
                state: flag.initialValue ? t('editor.flagAction.on') : t('editor.flagAction.off')
              })}
            </option>
          ))}
        </select>

        {!flagAction.flagId && projectFlags.length === 0 && (
          <div style={{
            marginTop: DESIGN_TOKENS.spacing[2],
            padding: DESIGN_TOKENS.spacing[2],
            backgroundColor: DESIGN_TOKENS.colors.warning[100],
            borderRadius: DESIGN_TOKENS.borderRadius.lg,
            fontSize: DESIGN_TOKENS.typography.fontSize.xs,
            color: DESIGN_TOKENS.colors.warning[800],
            display: 'flex',
            alignItems: 'center',
            gap: DESIGN_TOKENS.spacing[2],
          }}>
            <span>⚠️</span>
            <span>{t('editor.flagAction.noFlagsWarning')}</span>
          </div>
        )}
      </div>

      {/* Flag value setting (only for setFlag) */}
      {flagAction.type === 'setFlag' && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <FormLabel colorTheme="action">{t('editor.flagAction.setValueLabel')}</FormLabel>
          <OptionGrid
            colorTheme="action"
            options={FLAG_VALUE_OPTIONS as any}
            selectedValue={(flagAction as any).value}
            onSelect={(v) => onUpdate(index, { value: v as boolean })}
            minWidth={100}
          />
        </div>
      )}

      {/* Flag state change prediction */}
      {flagAction.flagId && getCurrentFlag() && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <FormLabel colorTheme="action">{t('editor.flagAction.stateChangePredictionLabel')}</FormLabel>
          <div style={{
            padding: DESIGN_TOKENS.spacing[3],
            backgroundColor: DESIGN_TOKENS.colors.neutral[100],
            borderRadius: DESIGN_TOKENS.borderRadius.lg,
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            color: DESIGN_TOKENS.colors.neutral[800],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[2] }}>
              <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.base }}>
                {getFlagCurrentState() ? '🟢' : '🔴'}
              </span>
              <span style={{ fontWeight: DESIGN_TOKENS.typography.fontWeight.medium }}>
                {t('editor.flagAction.currentState', {
                  state: getFlagCurrentState() ? t('editor.flagAction.on') : t('editor.flagAction.off')
                })}
              </span>
            </div>
            <div style={{ fontSize: DESIGN_TOKENS.typography.fontSize.base, color: DESIGN_TOKENS.colors.neutral[500] }}>
              →
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[2] }}>
              <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.base }}>
                {getPredictedState() ? '🟢' : '🔴'}
              </span>
              <span style={{ fontWeight: DESIGN_TOKENS.typography.fontWeight.medium }}>
                {t('editor.flagAction.afterExecution', {
                  state: getPredictedState() ? t('editor.flagAction.on') : t('editor.flagAction.off')
                })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Preview button */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <ModernButton
          variant="outline"
          size="sm"
          onClick={() => onShowNotification('info', t('editor.flagAction.previewNotice'))}
          style={{
            borderColor: DESIGN_TOKENS.colors.success[200],
            color: DESIGN_TOKENS.colors.success[600],
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: DESIGN_TOKENS.spacing[2],
          }}
        >
          <span>👁️</span>
          <span>{t('editor.flagAction.previewButton')}</span>
        </ModernButton>
      </div>

      <SummaryBox colorTheme="action">
        {t('editor.flagAction.settingsSummaryTitle')}
        {flagAction.flagId
          ? t('editor.flagAction.flagSelected', { name: getCurrentFlag()?.name || 'Flag' })
          : t('editor.flagAction.selectFlag')
        }
        {flagAction.flagId && (flagAction.type === 'setFlag'
          ? t('editor.flagAction.setState', {
              state: (flagAction as any).value ? t('editor.flagAction.on') : t('editor.flagAction.off')
            })
          : t('editor.flagAction.toggleState')
        )}
      </SummaryBox>
    </EditorCard>
  );
};
