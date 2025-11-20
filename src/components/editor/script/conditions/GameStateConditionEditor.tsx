// src/components/editor/script/conditions/GameStateConditionEditor.tsx
// Phase E Step 0修正版: TypeScriptエラー解決・DESIGN_TOKENS対応
// TouchConditionEditor.tsx成功パターン完全踏襲

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TriggerCondition } from '../../../../types/editor/GameScript';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { ModernCard } from '../../../ui/ModernCard';
import { ModernButton } from '../../../ui/ModernButton';
import {
  getGameStateOptions,
  getStateCheckOptions,
  getGameStateDescriptions
} from '../constants/GameStateConstants';

interface GameStateConditionEditorProps {
  condition: TriggerCondition & { type: 'gameState' };
  index: number;
  onUpdate: (index: number, updates: Partial<TriggerCondition>) => void;
}

export const GameStateConditionEditor: React.FC<GameStateConditionEditorProps> = ({
  condition,
  index,
  onUpdate
}) => {
  const { t } = useTranslation();
  const gameStateCondition = condition;

  // Get localized options using getter functions that access i18n
  const GAME_STATE_OPTIONS = useMemo(() => getGameStateOptions(), []);
  const STATE_CHECK_OPTIONS = useMemo(() => getStateCheckOptions(), []);
  const GAME_STATE_DESCRIPTIONS = useMemo(() => getGameStateDescriptions(), []);

  // 現在選択されている状態の詳細情報を取得
  const getCurrentStateDetails = () => {
    const stateKey = gameStateCondition.state as keyof typeof GAME_STATE_DESCRIPTIONS;
    return GAME_STATE_DESCRIPTIONS[stateKey];
  };
  
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
        <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.lg }}>🎮</span>
        {t('editor.gameStateCondition.title')}
      </h5>

      {/* ゲーム状態選択 */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <label style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
          color: DESIGN_TOKENS.colors.purple[800],
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'block'
        }}>
          {t('editor.gameStateCondition.gameStateLabel')}
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          {GAME_STATE_OPTIONS.map((option) => (
            <ModernButton
              key={option.value}
              variant={gameStateCondition.state === option.value ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onUpdate(index, { state: option.value as any })}
              style={{
                borderColor: gameStateCondition.state === option.value 
                  ? DESIGN_TOKENS.colors.purple[500] 
                  : DESIGN_TOKENS.colors.purple[200],
                backgroundColor: gameStateCondition.state === option.value 
                  ? DESIGN_TOKENS.colors.purple[500] 
                  : 'transparent',
                color: gameStateCondition.state === option.value 
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
              <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, fontWeight: DESIGN_TOKENS.typography.fontWeight.medium, textAlign: 'center' }}>
                {option.label}
              </span>
            </ModernButton>
          ))}
        </div>
      </div>

      {/* 状態チェック方式選択 */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <label style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
          color: DESIGN_TOKENS.colors.purple[800],
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'block'
        }}>
          {t('editor.gameStateCondition.checkTypeLabel')}
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          {STATE_CHECK_OPTIONS.map((option) => (
            <ModernButton
              key={option.value}
              variant={gameStateCondition.checkType === option.value ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onUpdate(index, { checkType: option.value as any })}
              style={{
                borderColor: gameStateCondition.checkType === option.value 
                  ? DESIGN_TOKENS.colors.purple[500] 
                  : DESIGN_TOKENS.colors.purple[200],
                backgroundColor: gameStateCondition.checkType === option.value 
                  ? DESIGN_TOKENS.colors.purple[500] 
                  : 'transparent',
                color: gameStateCondition.checkType === option.value 
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
              <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, fontWeight: DESIGN_TOKENS.typography.fontWeight.medium, textAlign: 'center' }}>
                {option.label}
              </span>
            </ModernButton>
          ))}
        </div>
      </div>

      {/* 選択状態の詳細説明 */}
      {gameStateCondition.state && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.purple[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            {t('editor.gameStateCondition.stateDetailLabel')}
          </label>
          <div style={{
            padding: DESIGN_TOKENS.spacing[3],
            backgroundColor: DESIGN_TOKENS.colors.neutral[100],
            borderRadius: DESIGN_TOKENS.borderRadius.lg,
            border: `1px solid ${DESIGN_TOKENS.colors.purple[200]}`
          }}>
            <div style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              color: DESIGN_TOKENS.colors.purple[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium
            }}>
              📝 {getCurrentStateDetails()?.detail}
            </div>
            <div style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.neutral[700]
            }}>
              <strong>{t('editor.gameStateCondition.exampleLabel')}</strong> {getCurrentStateDetails()?.examples.join('・')}
            </div>
          </div>
        </div>
      )}

      {/* チェック方式の詳細説明（becameの場合） */}
      {gameStateCondition.checkType === 'became' && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <div style={{
            padding: DESIGN_TOKENS.spacing[3],
            backgroundColor: DESIGN_TOKENS.colors.warning[50],
            borderRadius: DESIGN_TOKENS.borderRadius.lg,
            border: `1px solid ${DESIGN_TOKENS.colors.warning[100]}`,
            fontSize: DESIGN_TOKENS.typography.fontSize.xs,
            color: DESIGN_TOKENS.colors.warning[800],
            display: 'flex',
            alignItems: 'center',
            gap: DESIGN_TOKENS.spacing[2]
          }}>
            <span>⚡</span>
            <div>
              <strong>{t('editor.gameStateCondition.becameNoticeTitle')}</strong> {t('editor.gameStateCondition.becameNoticeDetail')}<br/>
              <span style={{ color: DESIGN_TOKENS.colors.neutral[600] }}>
                {t('editor.gameStateCondition.becameNoticeExample')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 応用例・使用パターン */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <label style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
          color: DESIGN_TOKENS.colors.purple[800],
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'block'
        }}>
          {t('editor.gameStateCondition.usagePatternsLabel')}
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          <div style={{
            padding: DESIGN_TOKENS.spacing[2],
            backgroundColor: DESIGN_TOKENS.colors.neutral[50],
            borderRadius: DESIGN_TOKENS.borderRadius.md,
            fontSize: DESIGN_TOKENS.typography.fontSize.xs,
            color: DESIGN_TOKENS.colors.neutral[700]
          }}>
            💡 <strong>{t('editor.gameStateCondition.pattern1Title')}</strong> {t('editor.gameStateCondition.pattern1Detail')}
          </div>
          <div style={{
            padding: DESIGN_TOKENS.spacing[2],
            backgroundColor: DESIGN_TOKENS.colors.neutral[50],
            borderRadius: DESIGN_TOKENS.borderRadius.md,
            fontSize: DESIGN_TOKENS.typography.fontSize.xs,
            color: DESIGN_TOKENS.colors.neutral[700]
          }}>
            🏆 <strong>{t('editor.gameStateCondition.pattern2Title')}</strong> {t('editor.gameStateCondition.pattern2Detail')}
          </div>
          <div style={{
            padding: DESIGN_TOKENS.spacing[2],
            backgroundColor: DESIGN_TOKENS.colors.neutral[50],
            borderRadius: DESIGN_TOKENS.borderRadius.md,
            fontSize: DESIGN_TOKENS.typography.fontSize.xs,
            color: DESIGN_TOKENS.colors.neutral[700]
          }}>
            ⏸️ <strong>{t('editor.gameStateCondition.pattern3Title')}</strong> {t('editor.gameStateCondition.pattern3Detail')}
          </div>
        </div>
      </div>

      {/* 設定内容要約表示 */}
      <div style={{
        padding: DESIGN_TOKENS.spacing[3],
        backgroundColor: DESIGN_TOKENS.colors.purple[100],
        borderRadius: DESIGN_TOKENS.borderRadius.lg,
        fontSize: DESIGN_TOKENS.typography.fontSize.xs,
        color: DESIGN_TOKENS.colors.purple[800]
      }}>
        {t('editor.gameStateCondition.settingsSummaryTitle')}
        {t('editor.gameStateCondition.gameIs')}
        <strong>
          {GAME_STATE_OPTIONS.find(s => s.value === gameStateCondition.state)?.label || t('editor.gameStateCondition.stateLabel')}
        </strong>
        {gameStateCondition.checkType === 'is' && t('editor.gameStateCondition.during')}
        {gameStateCondition.checkType === 'not' && t('editor.gameStateCondition.notDuring')}
        {gameStateCondition.checkType === 'became' && t('editor.gameStateCondition.moment')}
        {t('editor.gameStateCondition.trigger')}
        <br/>
        <span style={{ color: DESIGN_TOKENS.colors.purple[600] }}>
          {STATE_CHECK_OPTIONS.find(c => c.value === gameStateCondition.checkType)?.description}
        </span>
      </div>
    </ModernCard>
  );
};