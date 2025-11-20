// src/components/editor/script/actions/ShowHideActionEditor.tsx
// Phase D Step 2-A-2: 表示制御アクション統合エディター
// SoundActionEditor.tsx成功パターン完全踏襲

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { GameAction } from '../../../../types/editor/GameScript';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { ModernCard } from '../../../ui/ModernCard';
import { ModernButton } from '../../../ui/ModernButton';
import {
  getShowHideActionOptions,
  getFadeOptions,
  getDurationPresets
} from '../constants/ShowHideConstants';

interface ShowHideActionEditorProps {
  action: GameAction & { type: 'show' | 'hide' };
  index: number;
  onUpdate: (index: number, updates: Partial<GameAction>) => void;
  onShowNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const ShowHideActionEditor: React.FC<ShowHideActionEditorProps> = ({
  action,
  index,
  onUpdate,
  onShowNotification
}) => {
  const { t } = useTranslation();
  const showHideAction = action;

  // Get localized options using getter functions that access i18n
  const SHOW_HIDE_ACTION_OPTIONS = useMemo(() => getShowHideActionOptions(), []);
  const FADE_OPTIONS = useMemo(() => getFadeOptions(), []);
  const DURATION_PRESETS = useMemo(() => getDurationPresets(), []);
  
  // show/hide切り替え処理
  const handleActionTypeChange = (newType: 'show' | 'hide') => {
    if (newType === 'show') {
      onUpdate(index, {
        type: 'show',
        fadeIn: showHideAction.type === 'hide' ? (showHideAction as any).fadeOut : (showHideAction as any).fadeIn,
        duration: showHideAction.duration
      });
    } else {
      onUpdate(index, {
        type: 'hide',
        fadeOut: showHideAction.type === 'show' ? (showHideAction as any).fadeIn : (showHideAction as any).fadeOut,
        duration: showHideAction.duration
      });
    }
  };
  
  // 現在のフェード設定を取得
  const getCurrentFade = () => {
    if (showHideAction.type === 'show') {
      return (showHideAction as any).fadeIn || false;
    } else {
      return (showHideAction as any).fadeOut || false;
    }
  };
  
  // フェード設定更新
  const handleFadeChange = (fade: boolean) => {
    if (showHideAction.type === 'show') {
      onUpdate(index, { fadeIn: fade });
    } else {
      onUpdate(index, { fadeOut: fade });
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
        <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.lg }}>👁️</span>
        {t('editor.showHideAction.title')}
      </h5>

      {/* 表示・非表示アクション選択 */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <label style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
          color: DESIGN_TOKENS.colors.success[800],
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'block'
        }}>
          {t('editor.showHideAction.actionTypeLabel')}
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          {SHOW_HIDE_ACTION_OPTIONS.map((option) => (
            <ModernButton
              key={option.value}
              variant={showHideAction.type === option.value ? 'primary' : 'outline'}
              size="sm"
              onClick={() => handleActionTypeChange(option.value)}
              style={{
                borderColor: showHideAction.type === option.value 
                  ? DESIGN_TOKENS.colors.success[500] 
                  : DESIGN_TOKENS.colors.success[200],
                backgroundColor: showHideAction.type === option.value 
                  ? DESIGN_TOKENS.colors.success[500] 
                  : 'transparent',
                color: showHideAction.type === option.value 
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

      {/* フェード効果選択 */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <label style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
          color: DESIGN_TOKENS.colors.success[800],
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'block'
        }}>
          {t('editor.showHideAction.fadeEffectLabel')}
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          {FADE_OPTIONS.map((option) => (
            <ModernButton
              key={option.value.toString()}
              variant={getCurrentFade() === option.value ? 'primary' : 'outline'}
              size="sm"
              onClick={() => handleFadeChange(option.value)}
              style={{
                borderColor: getCurrentFade() === option.value 
                  ? DESIGN_TOKENS.colors.success[500] 
                  : DESIGN_TOKENS.colors.success[200],
                backgroundColor: getCurrentFade() === option.value 
                  ? DESIGN_TOKENS.colors.success[500] 
                  : 'transparent',
                color: getCurrentFade() === option.value 
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

      {/* 持続時間設定（フェード有りの場合のみ） */}
      {getCurrentFade() && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.success[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            {t('editor.showHideAction.fadeDuration', { seconds: showHideAction.duration || 0.5 })}
          </label>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={showHideAction.duration || 0.5}
            onChange={(e) => onUpdate(index, { duration: parseFloat(e.target.value) })}
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
            <span>{t('editor.showHideAction.seconds', { seconds: 0.1 })}</span>
            <span>{t('editor.showHideAction.seconds', { seconds: 5 })}</span>
          </div>

          {/* 持続時間プリセットボタン */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))',
            gap: DESIGN_TOKENS.spacing[1],
            marginTop: DESIGN_TOKENS.spacing[2]
          }}>
            {DURATION_PRESETS.map((preset) => (
              <ModernButton
                key={preset.value}
                variant={Math.abs((showHideAction.duration || 0.5) - preset.value) < 0.01 ? 'primary' : 'outline'}
                size="xs"
                onClick={() => onUpdate(index, { duration: preset.value })}
                style={{
                  borderColor: Math.abs((showHideAction.duration || 0.5) - preset.value) < 0.01 
                    ? DESIGN_TOKENS.colors.success[500] 
                    : DESIGN_TOKENS.colors.success[200],
                  backgroundColor: Math.abs((showHideAction.duration || 0.5) - preset.value) < 0.01 
                    ? DESIGN_TOKENS.colors.success[500] 
                    : 'transparent',
                  color: Math.abs((showHideAction.duration || 0.5) - preset.value) < 0.01 
                    ? DESIGN_TOKENS.colors.neutral[0] 
                    : DESIGN_TOKENS.colors.success[800],
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[2]}`
                }}
              >
                {preset.label}
              </ModernButton>
            ))}
          </div>
        </div>
      )}

      {/* 対象オブジェクト表示 */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <label style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
          color: DESIGN_TOKENS.colors.success[800],
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'block'
        }}>
          {t('editor.showHideAction.targetObjectLabel')}
        </label>
        <div style={{
          padding: DESIGN_TOKENS.spacing[2],
          backgroundColor: DESIGN_TOKENS.colors.success[100],
          borderRadius: DESIGN_TOKENS.borderRadius.lg,
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          color: DESIGN_TOKENS.colors.success[800],
          border: `1px solid ${DESIGN_TOKENS.colors.success[200]}`
        }}>
          🎯 {showHideAction.targetId || t('editor.showHideAction.targetObjectDefault')}
        </div>
      </div>

      {/* プレビューボタン */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <ModernButton
          variant="outline"
          size="sm"
          onClick={() => {
            // TODO: Phase Dで実装予定
            onShowNotification('info', t('editor.showHideAction.previewNotice'));
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
          <span>{t('editor.showHideAction.previewButton')}</span>
        </ModernButton>
      </div>

      {/* 設定内容要約 */}
      <div style={{
        padding: DESIGN_TOKENS.spacing[3],
        backgroundColor: DESIGN_TOKENS.colors.success[100],
        borderRadius: DESIGN_TOKENS.borderRadius.lg,
        fontSize: DESIGN_TOKENS.typography.fontSize.xs,
        color: DESIGN_TOKENS.colors.success[800]
      }}>
        {t('editor.showHideAction.settingsSummaryTitle')}
        {t('editor.showHideAction.object', { target: showHideAction.targetId || t('editor.showHideAction.targetObjectDefault') })}
        {showHideAction.type === 'show' ? t('editor.showHideAction.show') : t('editor.showHideAction.hide')}
        {t('editor.showHideAction.to')}
        {getCurrentFade()
          ? t('editor.showHideAction.fadeInOut', {
              seconds: showHideAction.duration || 0.5,
              fadeType: showHideAction.type === 'show' ? t('editor.showHideAction.fadeIn') : t('editor.showHideAction.fadeOut')
            })
          : t('editor.showHideAction.instant')
        }
      </div>
    </ModernCard>
  );
};