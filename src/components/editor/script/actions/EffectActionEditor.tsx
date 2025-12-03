// src/components/editor/script/actions/EffectActionEditor.tsx
// 完全修正版: GameScript.tsの型定義に完全一致
// 修正内容: rotationDirectionから'alternate'を削除（型定義に存在しないため）

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { GameAction } from '../../../../types/editor/GameScript';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { ModernCard } from '../../../ui/ModernCard';
import { ModernButton } from '../../../ui/ModernButton';
import { 
  getEffectTypeOptions,
  getFlashColorOptions,
  getRotationDirectionOptions,
  getShakeDirectionOptions,
  getParticleTypeOptions,
  EFFECT_DEFAULTS,
  EFFECT_RANGES
} from '../constants/EffectConstants';

interface EffectActionEditorProps {
  action: GameAction & { type: 'effect' };
  index: number;
  onUpdate: (index: number, updates: Partial<GameAction>) => void;
  onShowNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const EffectActionEditor: React.FC<EffectActionEditorProps> = ({
  action,
  index,
  onUpdate,
  onShowNotification
}) => {
  const { t } = useTranslation();
  const effectAction = action;

  // Get localized options
  // 修正: GameScript.tsの型定義に存在するエフェクトタイプのみを使用
  const EFFECT_TYPE_OPTIONS = useMemo(() => 
  getEffectTypeOptions().filter(opt => 
    ['flash', 'shake', 'scale', 'rotate', 'particles'].includes(opt.value)
  ), 
[]);
  const FLASH_COLOR_OPTIONS = useMemo(() => getFlashColorOptions(), []);
  
  // 修正: 'alternate'を除外したROTATION_DIRECTION_OPTIONSを使用
  const ROTATION_DIRECTION_OPTIONS = useMemo(() => getRotationDirectionOptions().filter(opt => opt.value !== 'alternate'), []);
  
  const SHAKE_DIRECTION_OPTIONS = useMemo(() => getShakeDirectionOptions(), []);
  const PARTICLE_TYPE_OPTIONS = useMemo(() => getParticleTypeOptions(), []);

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
        <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.lg }}>✨</span>
        {t('editor.effectAction.title')}
      </h5>

      {/* Effect type selection */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <label style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
          color: DESIGN_TOKENS.colors.success[800],
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'block'
        }}>
          {t('editor.effectAction.effectTypeLabel')}
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          {EFFECT_TYPE_OPTIONS.map((option) => (
            <ModernButton
              key={option.value}
              variant={effectAction.effect?.type === option.value ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onUpdate(index, { 
                effect: { 
                  ...effectAction.effect,
                  type: option.value,
                  duration: EFFECT_DEFAULTS.duration,
                  intensity: EFFECT_DEFAULTS.intensity
                } 
              })}
              style={{
                borderColor: effectAction.effect?.type === option.value 
                  ? DESIGN_TOKENS.colors.success[500] 
                  : DESIGN_TOKENS.colors.success[200],
                backgroundColor: effectAction.effect?.type === option.value 
                  ? DESIGN_TOKENS.colors.success[500] 
                  : 'transparent',
                color: effectAction.effect?.type === option.value 
                  ? DESIGN_TOKENS.colors.neutral[0] 
                  : DESIGN_TOKENS.colors.success[800],
                padding: DESIGN_TOKENS.spacing[2],
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: DESIGN_TOKENS.spacing[1]
              }}
            >
              <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.base }}>{option.icon}</span>
              <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, fontWeight: DESIGN_TOKENS.typography.fontWeight.medium }}>
                {option.label}
              </span>
            </ModernButton>
          ))}
        </div>
      </div>

      {/* Common settings: Duration */}
      {effectAction.effect && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.success[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            {t('editor.effectAction.durationLabel', { duration: effectAction.effect?.duration || EFFECT_DEFAULTS.duration })}
          </label>
          <input
            type="range"
            min={EFFECT_RANGES.duration.min}
            max={EFFECT_RANGES.duration.max}
            step={EFFECT_RANGES.duration.step}
            value={effectAction.effect?.duration || EFFECT_DEFAULTS.duration}
            onChange={(e) => onUpdate(index, {
              effect: {
                ...effectAction.effect,
                duration: parseFloat(e.target.value)
              }
            })}
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
            <span>{EFFECT_RANGES.duration.min}s</span>
            <span>{EFFECT_RANGES.duration.max}s</span>
          </div>
        </div>
      )}

      {/* Flash settings */}
      {effectAction.effect?.type === 'flash' && (
        <>
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              {t('editor.effectAction.flashColorLabel')}
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
              gap: DESIGN_TOKENS.spacing[2]
            }}>
              {FLASH_COLOR_OPTIONS.map((option) => (
                <ModernButton
                  key={option.value}
                  variant={effectAction.effect?.flashColor === option.value ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => onUpdate(index, { 
                    effect: { 
                      ...effectAction.effect,
                      flashColor: option.value
                    } 
                  })}
                  style={{
                    borderColor: effectAction.effect?.flashColor === option.value 
                      ? DESIGN_TOKENS.colors.success[500] 
                      : DESIGN_TOKENS.colors.success[200],
                    backgroundColor: effectAction.effect?.flashColor === option.value 
                      ? DESIGN_TOKENS.colors.success[500] 
                      : 'transparent',
                    color: effectAction.effect?.flashColor === option.value 
                      ? DESIGN_TOKENS.colors.neutral[0] 
                      : DESIGN_TOKENS.colors.success[800]
                  }}
                >
                  <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.base }}>{option.icon}</span>
                  <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs }}>{option.label}</span>
                </ModernButton>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              {t('editor.effectAction.flashIntensityLabel', { intensity: ((effectAction.effect?.flashIntensity ?? EFFECT_DEFAULTS.flashIntensity) * 100).toFixed(0) })}
            </label>
            <input
              type="range"
              min={EFFECT_RANGES.flashIntensity.min}
              max={EFFECT_RANGES.flashIntensity.max}
              step={EFFECT_RANGES.flashIntensity.step}
              value={effectAction.effect?.flashIntensity ?? EFFECT_DEFAULTS.flashIntensity}
              onChange={(e) => onUpdate(index, {
                effect: {
                  ...effectAction.effect,
                  flashIntensity: parseFloat(e.target.value)
                }
              })}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              {t('editor.effectAction.flashFrequencyLabel', { frequency: effectAction.effect?.flashFrequency ?? EFFECT_DEFAULTS.flashFrequency })}
            </label>
            <input
              type="range"
              min={EFFECT_RANGES.flashFrequency.min}
              max={EFFECT_RANGES.flashFrequency.max}
              step={EFFECT_RANGES.flashFrequency.step}
              value={effectAction.effect?.flashFrequency ?? EFFECT_DEFAULTS.flashFrequency}
              onChange={(e) => onUpdate(index, {
                effect: {
                  ...effectAction.effect,
                  flashFrequency: parseFloat(e.target.value)
                }
              })}
              style={{ width: '100%' }}
            />
          </div>
        </>
      )}

      {/* Shake settings */}
      {effectAction.effect?.type === 'shake' && (
        <>
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              {t('editor.effectAction.shakeDirectionLabel')}
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: DESIGN_TOKENS.spacing[2]
            }}>
              {SHAKE_DIRECTION_OPTIONS.map((option) => (
                <ModernButton
                  key={option.value}
                  variant={effectAction.effect?.shakeDirection === option.value ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => onUpdate(index, { 
                    effect: { 
                      ...effectAction.effect,
                      shakeDirection: option.value
                    } 
                  })}
                  style={{
                    borderColor: effectAction.effect?.shakeDirection === option.value 
                      ? DESIGN_TOKENS.colors.success[500] 
                      : DESIGN_TOKENS.colors.success[200],
                    backgroundColor: effectAction.effect?.shakeDirection === option.value 
                      ? DESIGN_TOKENS.colors.success[500] 
                      : 'transparent',
                    color: effectAction.effect?.shakeDirection === option.value 
                      ? DESIGN_TOKENS.colors.neutral[0] 
                      : DESIGN_TOKENS.colors.success[800]
                  }}
                >
                  <span>{option.label}</span>
                </ModernButton>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              {t('editor.effectAction.shakeIntensityLabel', { intensity: effectAction.effect?.shakeIntensity ?? EFFECT_DEFAULTS.shakeIntensity })}
            </label>
            <input
              type="range"
              min={EFFECT_RANGES.shakeIntensity.min}
              max={EFFECT_RANGES.shakeIntensity.max}
              step={EFFECT_RANGES.shakeIntensity.step}
              value={effectAction.effect?.shakeIntensity ?? EFFECT_DEFAULTS.shakeIntensity}
              onChange={(e) => onUpdate(index, {
                effect: {
                  ...effectAction.effect,
                  shakeIntensity: parseFloat(e.target.value)
                }
              })}
              style={{ width: '100%' }}
            />
          </div>
        </>
      )}

      {/* Rotate settings */}
      {effectAction.effect?.type === 'rotate' && (
        <>
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              {t('editor.effectAction.rotationAmountLabel', { amount: effectAction.effect?.rotationAmount ?? EFFECT_DEFAULTS.rotationAmount })}
            </label>
            <input
              type="range"
              min={EFFECT_RANGES.rotationAmount.min}
              max={EFFECT_RANGES.rotationAmount.max}
              step={EFFECT_RANGES.rotationAmount.step}
              value={effectAction.effect?.rotationAmount ?? EFFECT_DEFAULTS.rotationAmount}
              onChange={(e) => onUpdate(index, {
                effect: {
                  ...effectAction.effect,
                  rotationAmount: parseFloat(e.target.value)
                }
              })}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              {t('editor.effectAction.rotationSpeedLabel', { speed: effectAction.effect?.rotationSpeed ?? EFFECT_DEFAULTS.rotationSpeed })}
            </label>
            <input
              type="range"
              min={EFFECT_RANGES.rotationSpeed.min}
              max={EFFECT_RANGES.rotationSpeed.max}
              step={EFFECT_RANGES.rotationSpeed.step}
              value={effectAction.effect?.rotationSpeed ?? EFFECT_DEFAULTS.rotationSpeed}
              onChange={(e) => onUpdate(index, {
                effect: {
                  ...effectAction.effect,
                  rotationSpeed: parseFloat(e.target.value)
                }
              })}
              style={{ width: '100%' }}
            />
          </div>

          {/* 修正: 'alternate'を除外したROTATION_DIRECTION_OPTIONSを使用 */}
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              {t('editor.effectAction.rotationDirectionLabel')}
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: DESIGN_TOKENS.spacing[2]
            }}>
              {ROTATION_DIRECTION_OPTIONS.map((option) => (
                <ModernButton
                  key={option.value}
                  variant={effectAction.effect?.rotationDirection === option.value ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => onUpdate(index, { 
                    effect: { 
                      ...effectAction.effect,
                      rotationDirection: option.value
                    } 
                  })}
                  style={{
                    borderColor: effectAction.effect?.rotationDirection === option.value 
                      ? DESIGN_TOKENS.colors.success[500] 
                      : DESIGN_TOKENS.colors.success[200],
                    backgroundColor: effectAction.effect?.rotationDirection === option.value 
                      ? DESIGN_TOKENS.colors.success[500] 
                      : 'transparent',
                    color: effectAction.effect?.rotationDirection === option.value 
                      ? DESIGN_TOKENS.colors.neutral[0] 
                      : DESIGN_TOKENS.colors.success[800]
                  }}
                >
                  <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.base }}>{option.icon}</span>
                  <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs }}>{option.label}</span>
                </ModernButton>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Particles settings */}
      {effectAction.effect?.type === 'particles' && (
        <>
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              {t('editor.effectAction.particleTypeLabel')}
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
              gap: DESIGN_TOKENS.spacing[2]
            }}>
              {PARTICLE_TYPE_OPTIONS.map((option) => (
                <ModernButton
                  key={option.value}
                  variant={effectAction.effect?.particleType === option.value ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => onUpdate(index, { 
                    effect: { 
                      ...effectAction.effect,
                      particleType: option.value
                    } 
                  })}
                  style={{
                    borderColor: effectAction.effect?.particleType === option.value 
                      ? DESIGN_TOKENS.colors.success[500] 
                      : DESIGN_TOKENS.colors.success[200],
                    backgroundColor: effectAction.effect?.particleType === option.value 
                      ? DESIGN_TOKENS.colors.success[500] 
                      : 'transparent',
                    color: effectAction.effect?.particleType === option.value 
                      ? DESIGN_TOKENS.colors.neutral[0] 
                      : DESIGN_TOKENS.colors.success[800],
                    padding: DESIGN_TOKENS.spacing[2]
                  }}
                >
                  <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.base }}>{option.icon}</span>
                  <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs }}>{option.label}</span>
                </ModernButton>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              {t('editor.effectAction.particleCountLabel', { count: effectAction.effect?.particleCount ?? EFFECT_DEFAULTS.particleCount })}
            </label>
            <input
              type="range"
              min={EFFECT_RANGES.particleCount.min}
              max={EFFECT_RANGES.particleCount.max}
              step={EFFECT_RANGES.particleCount.step}
              value={effectAction.effect?.particleCount ?? EFFECT_DEFAULTS.particleCount}
              onChange={(e) => onUpdate(index, {
                effect: {
                  ...effectAction.effect,
                  particleCount: parseFloat(e.target.value)
                }
              })}
              style={{ width: '100%' }}
            />
          </div>
        </>
      )}

      {/* Effect preview button */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <ModernButton
          variant="outline"
          size="sm"
          onClick={() => {
            onShowNotification('info', t('editor.effectAction.previewNotice'));
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
          <span>{t('editor.effectAction.previewButton')}</span>
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
        {t('editor.effectAction.settingsSummaryTitle')}
        {effectAction.effect?.type
          ? t('editor.effectAction.effectType', {
              type: EFFECT_TYPE_OPTIONS.find(e => e.value === effectAction.effect?.type)?.label || t('editor.effectAction.selectEffect')
            })
          : t('editor.effectAction.selectEffect')}
        {effectAction.effect?.duration && t('editor.effectAction.forDuration', { seconds: effectAction.effect.duration })}
      </div>
    </ModernCard>
  );
};