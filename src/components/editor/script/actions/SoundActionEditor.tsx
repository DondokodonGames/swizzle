// src/components/editor/script/actions/SoundActionEditor.tsx
// Phase C Step 1-2完了版: 音再生アクション詳細設定コンポーネント
// AdvancedRuleModal.tsx分割 - Step 3: アクションエディター分離

import React from 'react';
import { useTranslation } from 'react-i18next';
import { GameAction } from '../../../../types/editor/GameScript';
import { GameProject } from '../../../../types/editor/GameProject';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { ModernCard } from '../../../ui/ModernCard';
import { ModernButton } from '../../../ui/ModernButton';

interface SoundActionEditorProps {
  action: GameAction & { type: 'playSound' };
  index: number;
  project: GameProject;
  onUpdate: (index: number, updates: Partial<GameAction>) => void;
  onShowNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const SoundActionEditor: React.FC<SoundActionEditorProps> = ({
  action,
  index,
  project,
  onUpdate,
  onShowNotification
}) => {
  const { t } = useTranslation();
  const soundAction = action;

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
        <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.lg }}>🔊</span>
        {t('editor.soundAction.title')}
      </h5>

      {/* SE選択 */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <label style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
          color: DESIGN_TOKENS.colors.success[800],
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'block'
        }}>
          {t('editor.soundAction.soundSelectLabel')}
        </label>
        <select
          value={soundAction.soundId}
          onChange={(e) => onUpdate(index, { soundId: e.target.value })}
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
          <option value="">{t('editor.soundAction.selectSound')}</option>
          {project.assets.audio?.se?.map((sound) => (
            <option key={sound.id} value={sound.id}>
              {sound.name}
            </option>
          ))}
        </select>
      </div>

      {/* 音量調整 */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <label style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
          color: DESIGN_TOKENS.colors.success[800],
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'block'
        }}>
          {t('editor.soundAction.volumeLabel', { volume: Math.round((soundAction.volume || 0.8) * 100) })}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={soundAction.volume || 0.8}
          onChange={(e) => onUpdate(index, { volume: parseFloat(e.target.value) })}
          style={{
            width: '100%',
            height: '8px',
            backgroundColor: DESIGN_TOKENS.colors.success[200],
            borderRadius: DESIGN_TOKENS.borderRadius.full,
            outline: 'none',
            cursor: 'pointer'
          }}
        />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: DESIGN_TOKENS.typography.fontSize.xs,
          color: DESIGN_TOKENS.colors.success[600],
          marginTop: DESIGN_TOKENS.spacing[1]
        }}>
          <span>{t('editor.soundAction.minVolume')}</span>
          <span>{t('editor.soundAction.maxVolume')}</span>
        </div>
      </div>

      {/* 音量レベル表示 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: DESIGN_TOKENS.spacing[2],
        marginBottom: DESIGN_TOKENS.spacing[4]
      }}>
        <span style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.xs,
          color: DESIGN_TOKENS.colors.success[800],
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium
        }}>
          {t('editor.soundAction.volumeLevelLabel')}
        </span>
        <div style={{
          flex: 1,
          height: '8px',
          backgroundColor: DESIGN_TOKENS.colors.neutral[200],
          borderRadius: DESIGN_TOKENS.borderRadius.full,
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${(soundAction.volume || 0.8) * 100}%`,
            backgroundColor: DESIGN_TOKENS.colors.success[500],
            transition: `width ${DESIGN_TOKENS.animation.duration.fast} ${DESIGN_TOKENS.animation.easing.inOut}`
          }} />
        </div>
        <span style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.xs,
          color: DESIGN_TOKENS.colors.success[800],
          fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
          minWidth: '40px',
          textAlign: 'right'
        }}>
          {t('editor.soundAction.volumePercent', { volume: Math.round((soundAction.volume || 0.8) * 100) })}
        </span>
      </div>

      {/* プレビュー再生ボタン */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <ModernButton
          variant="outline"
          size="sm"
          onClick={() => {
            // TODO: Phase C Step 2で実装予定
            onShowNotification('info', t('editor.soundAction.previewNotice'));
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
          <span>▶️</span>
          <span>{t('editor.soundAction.previewButton')}</span>
        </ModernButton>
      </div>

      <div style={{
        padding: DESIGN_TOKENS.spacing[3],
        backgroundColor: DESIGN_TOKENS.colors.success[100],
        borderRadius: DESIGN_TOKENS.borderRadius.lg,
        fontSize: DESIGN_TOKENS.typography.fontSize.xs,
        color: DESIGN_TOKENS.colors.success[800]
      }}>
        {t('editor.soundAction.settingsSummaryTitle')}
        {soundAction.soundId
          ? t('editor.soundAction.playSound', {
              name: project.assets.audio?.se?.find(s => s.id === soundAction.soundId)?.name || t('editor.soundAction.selectSound'),
              volume: Math.round((soundAction.volume || 0.8) * 100)
            })
          : t('editor.soundAction.selectSoundPrompt')}
      </div>
    </ModernCard>
  );
};