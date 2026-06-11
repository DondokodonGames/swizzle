// src/components/editor/script/conditions/GameStateConditionEditor.tsx

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TriggerCondition } from '../../../../types/editor/GameScript';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { EditorCard, FormLabel, OptionGrid, SummaryBox } from '../shared';
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

  const GAME_STATE_OPTIONS = useMemo(() => getGameStateOptions(), []);
  const STATE_CHECK_OPTIONS = useMemo(() => getStateCheckOptions(), []);
  const GAME_STATE_DESCRIPTIONS = useMemo(() => getGameStateDescriptions(), []);

  const getCurrentStateDetails = () => {
    const stateKey = gameStateCondition.state as keyof typeof GAME_STATE_DESCRIPTIONS;
    return GAME_STATE_DESCRIPTIONS[stateKey];
  };

  return (
    <EditorCard colorTheme="condition" icon="🎮" title={t('editor.gameStateCondition.title')}>
      {/* ゲーム状態選択 */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <FormLabel colorTheme="condition">{t('editor.gameStateCondition.gameStateLabel')}</FormLabel>
        <OptionGrid
          colorTheme="condition"
          options={GAME_STATE_OPTIONS as any}
          selectedValue={gameStateCondition.state}
          onSelect={(v) => onUpdate(index, { state: v as any })}
          minWidth={140}
        />
      </div>

      {/* 状態チェック方式選択 */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <FormLabel colorTheme="condition">{t('editor.gameStateCondition.checkTypeLabel')}</FormLabel>
        <OptionGrid
          colorTheme="condition"
          options={STATE_CHECK_OPTIONS as any}
          selectedValue={gameStateCondition.checkType}
          onSelect={(v) => onUpdate(index, { checkType: v as any })}
          minWidth={140}
        />
      </div>

      {/* 選択状態の詳細説明 */}
      {gameStateCondition.state && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <FormLabel colorTheme="condition">{t('editor.gameStateCondition.stateDetailLabel')}</FormLabel>
          <div style={{
            padding: DESIGN_TOKENS.spacing[3],
            backgroundColor: DESIGN_TOKENS.colors.neutral[100],
            borderRadius: DESIGN_TOKENS.borderRadius.lg,
            border: `1px solid ${DESIGN_TOKENS.colors.purple[200]}`,
          }}>
            <div style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              color: DESIGN_TOKENS.colors.purple[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            }}>
              📝 {getCurrentStateDetails()?.detail}
            </div>
            <div style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.neutral[700],
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
            gap: DESIGN_TOKENS.spacing[2],
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
        <FormLabel colorTheme="condition">{t('editor.gameStateCondition.usagePatternsLabel')}</FormLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: DESIGN_TOKENS.spacing[2] }}>
          {[
            { title: t('editor.gameStateCondition.pattern1Title'), detail: t('editor.gameStateCondition.pattern1Detail'), icon: '💡' },
            { title: t('editor.gameStateCondition.pattern2Title'), detail: t('editor.gameStateCondition.pattern2Detail'), icon: '🏆' },
            { title: t('editor.gameStateCondition.pattern3Title'), detail: t('editor.gameStateCondition.pattern3Detail'), icon: '⏸️' },
          ].map((p) => (
            <div key={p.icon} style={{
              padding: DESIGN_TOKENS.spacing[2],
              backgroundColor: DESIGN_TOKENS.colors.neutral[50],
              borderRadius: DESIGN_TOKENS.borderRadius.md,
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.neutral[700],
            }}>
              {p.icon} <strong>{p.title}</strong> {p.detail}
            </div>
          ))}
        </div>
      </div>

      <SummaryBox colorTheme="condition">
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
      </SummaryBox>
    </EditorCard>
  );
};
