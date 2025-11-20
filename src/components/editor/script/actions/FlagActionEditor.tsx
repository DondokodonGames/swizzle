// src/components/editor/script/actions/FlagActionEditor.tsx
// Phase D Step 2-B-2: フラグ操作アクション詳細設定コンポーネント
// SoundActionEditor.tsx成功パターン完全踏襲

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { GameAction, GameFlag } from '../../../../types/editor/GameScript';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { ModernCard } from '../../../ui/ModernCard';
import { ModernButton } from '../../../ui/ModernButton';
import {
  getFlagActionOptions,
  getFlagValueOptions,
  getFlagOperationEffects
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

  // Get localized options using getter functions that access i18n
  const FLAG_ACTION_OPTIONS = useMemo(() => getFlagActionOptions(), []);
  const FLAG_VALUE_OPTIONS = useMemo(() => getFlagValueOptions(), []);

  // Action type switching handler
  const handleActionTypeChange = (newType: 'setFlag' | 'toggleFlag') => {
    if (newType === 'setFlag') {
      onUpdate(index, {
        type: 'setFlag',
        flagId: flagAction.flagId,
        value: true
      });
    } else {
      onUpdate(index, {
        type: 'toggleFlag',
        flagId: flagAction.flagId
      });
    }
  };
  
  // 対象フラグを取得
  const getCurrentFlag = () => {
    return projectFlags.find(flag => flag.id === flagAction.flagId);
  };
  
  // フラグの現在状態を取得
  const getFlagCurrentState = () => {
    const flag = getCurrentFlag();
    return flag ? flag.initialValue : false;
  };
  
  // 操作結果を予測
  const getPredictedState = () => {
    const currentState = getFlagCurrentState();
    if (flagAction.type === 'setFlag') {
      return (flagAction as any).value;
    } else {
      return !currentState;
    }
  };
  
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
        <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.lg }}>🚩</span>
        {t('editor.flagAction.title')}
      </h5>

      {/* Flag action type selection */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <label style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
          color: DESIGN_TOKENS.colors.success[800],
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'block'
        }}>
          {t('editor.flagAction.operationTypeLabel')}
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          {FLAG_ACTION_OPTIONS.map((option) => (
            <ModernButton
              key={option.value}
              variant={flagAction.type === option.value ? 'primary' : 'outline'}
              size="sm"
              onClick={() => handleActionTypeChange(option.value)}
              style={{
                borderColor: flagAction.type === option.value 
                  ? DESIGN_TOKENS.colors.success[500] 
                  : DESIGN_TOKENS.colors.success[200],
                backgroundColor: flagAction.type === option.value 
                  ? DESIGN_TOKENS.colors.success[500] 
                  : 'transparent',
                color: flagAction.type === option.value 
                  ? DESIGN_TOKENS.colors.neutral[0] 
                  : DESIGN_TOKENS.colors.success[800],
                padding: DESIGN_TOKENS.spacing[3],
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: DESIGN_TOKENS.spacing[1]
              }}
            >
              <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.lg }}>{option.icon}</span>
              <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, fontWeight: DESIGN_TOKENS.typography.fontWeight.medium, textAlign: 'center' }}>
                {option.label}
              </span>
            </ModernButton>
          ))}
        </div>
      </div>

      {/* Target flag selection */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <label style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
          color: DESIGN_TOKENS.colors.success[800],
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'block'
        }}>
          {t('editor.flagAction.targetFlagLabel')}
        </label>
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
            outline: 'none'
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

        {/* Warning when no flags created */}
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
            gap: DESIGN_TOKENS.spacing[2]
          }}>
            <span>⚠️</span>
            <span>{t('editor.flagAction.noFlagsWarning')}</span>
          </div>
        )}
      </div>

      {/* Flag value setting (only for setFlag) */}
      {flagAction.type === 'setFlag' && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.success[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            {t('editor.flagAction.setValueLabel')}
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
            gap: DESIGN_TOKENS.spacing[2]
          }}>
            {FLAG_VALUE_OPTIONS.map((option) => (
              <ModernButton
                key={option.value.toString()}
                variant={(flagAction as any).value === option.value ? 'primary' : 'outline'}
                size="sm"
                onClick={() => onUpdate(index, { value: option.value })}
                style={{
                  borderColor: (flagAction as any).value === option.value 
                    ? DESIGN_TOKENS.colors.success[500] 
                    : DESIGN_TOKENS.colors.success[200],
                  backgroundColor: (flagAction as any).value === option.value 
                    ? DESIGN_TOKENS.colors.success[500] 
                    : 'transparent',
                  color: (flagAction as any).value === option.value 
                    ? DESIGN_TOKENS.colors.neutral[0] 
                    : DESIGN_TOKENS.colors.success[800],
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
      )}

      {/* Flag state change prediction display */}
      {flagAction.flagId && getCurrentFlag() && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.success[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            {t('editor.flagAction.stateChangePredictionLabel')}
          </label>
          <div style={{
            padding: DESIGN_TOKENS.spacing[3],
            backgroundColor: DESIGN_TOKENS.colors.neutral[100],
            borderRadius: DESIGN_TOKENS.borderRadius.lg,
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            color: DESIGN_TOKENS.colors.neutral[800],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
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
          onClick={() => {
            // TODO: To be implemented in Phase D
            onShowNotification('info', t('editor.flagAction.previewNotice'));
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
          <span>{t('editor.flagAction.previewButton')}</span>
        </ModernButton>
      </div>

      {/* Settings summary */}
      <div style={{
        padding: DESIGN_TOKENS.spacing[3],
        backgroundColor: DESIGN_TOKENS.colors.success[100],
        borderRadius: DESIGN_TOKENS.borderRadius.lg,
        fontSize: DESIGN_TOKENS.typography.fontSize.xs,
        color: DESIGN_TOKENS.colors.success[800]
      }}>
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
      </div>
    </ModernCard>
  );
};