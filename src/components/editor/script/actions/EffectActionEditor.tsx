// src/components/editor/script/actions/EffectActionEditor.tsx
// 拡張版: flash/rotate/particles/shake方向の完全実装
// 新機能: フラッシュエフェクト、回転エフェクト、パーティクルエフェクト、シェイク方向

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
  const EFFECT_TYPE_OPTIONS = useMemo(() => getEffectTypeOptions(), []);
  const FLASH_COLOR_OPTIONS = useMemo(() => getFlashColorOptions(), []);
  const ROTATION_DIRECTION_OPTIONS = useMemo(() => getRotationDirectionOptions(), []);
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
                  type: option.value as any,
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
              <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, fontWeight: DESIGN_TOKENS.typography.fontWeight.medium, textAlign: 'center' }}>
                {option.label}
              </span>
            </ModernButton>
          ))}
        </div>
      </div>

      {/* Flash settings (when effect type is 'flash') */}
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
                      ? option.value 
                      : 'transparent',
                    color: effectAction.effect?.flashColor === option.value 
                      ? (option.value === '#FFFFFF' || option.value === '#FFFF00' ? '#000' : '#FFF')
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
              {t('editor.effectAction.flashIntensityLabel', { intensity: Math.round((effectAction.effect?.flashIntensity ?? EFFECT_DEFAULTS.flashIntensity) * 100) })}
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
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.success[600],
              marginTop: DESIGN_TOKENS.spacing[1]
            }}>
              <span>{Math.round(EFFECT_RANGES.flashIntensity.min * 100)}%</span>
              <span>{Math.round(EFFECT_RANGES.flashIntensity.max * 100)}%</span>
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
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.success[600],
              marginTop: DESIGN_TOKENS.spacing[1]
            }}>
              <span>{EFFECT_RANGES.flashFrequency.min} Hz</span>
              <span>{EFFECT_RANGES.flashFrequency.max} Hz</span>
            </div>
          </div>
        </>
      )}

      {/* Shake settings (when effect type is 'shake') */}
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
                  <span>{option.icon} {option.label}</span>
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
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.success[600],
              marginTop: DESIGN_TOKENS.spacing[1]
            }}>
              <span>{EFFECT_RANGES.shakeIntensity.min}px</span>
              <span>{EFFECT_RANGES.shakeIntensity.max}px</span>
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
              {t('editor.effectAction.shakeFrequencyLabel', { frequency: effectAction.effect?.shakeFrequency ?? EFFECT_DEFAULTS.shakeFrequency })}
            </label>
            <input
              type="range"
              min={EFFECT_RANGES.shakeFrequency.min}
              max={EFFECT_RANGES.shakeFrequency.max}
              step={EFFECT_RANGES.shakeFrequency.step}
              value={effectAction.effect?.shakeFrequency ?? EFFECT_DEFAULTS.shakeFrequency}
              onChange={(e) => onUpdate(index, {
                effect: {
                  ...effectAction.effect,
                  shakeFrequency: parseFloat(e.target.value)
                }
              })}
              style={{ width: '100%' }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.success[600],
              marginTop: DESIGN_TOKENS.spacing[1]
            }}>
              <span>{EFFECT_RANGES.shakeFrequency.min} Hz</span>
              <span>{EFFECT_RANGES.shakeFrequency.max} Hz</span>
            </div>
          </div>
        </>
      )}

      {/* Rotate settings (when effect type is 'rotate') */}
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
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.success[600],
              marginTop: DESIGN_TOKENS.spacing[1]
            }}>
              <span>{EFFECT_RANGES.rotationAmount.min}°</span>
              <span>{EFFECT_RANGES.rotationAmount.max}°</span>
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
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.success[600],
              marginTop: DESIGN_TOKENS.spacing[1]
            }}>
              <span>{EFFECT_RANGES.rotationSpeed.min}°/s</span>
              <span>{EFFECT_RANGES.rotationSpeed.max}°/s</span>
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
              {t('editor.effectAction.rotationDirectionLabel')}
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
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
                  <span>{option.icon} {option.label}</span>
                </ModernButton>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Particles settings (when effect type is 'particles') */}
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
              gridTemplateColumns: 'repeat(3, 1fr)',
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
                  particleCount: parseInt(e.target.value)
                }
              })}
              style={{ width: '100%' }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.success[600],
              marginTop: DESIGN_TOKENS.spacing[1]
            }}>
              <span>{EFFECT_RANGES.particleCount.min}</span>
              <span>{EFFECT_RANGES.particleCount.max}</span>
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
              {t('editor.effectAction.particleSizeLabel', { size: effectAction.effect?.particleSize ?? EFFECT_DEFAULTS.particleSize })}
            </label>
            <input
              type="range"
              min={EFFECT_RANGES.particleSize.min}
              max={EFFECT_RANGES.particleSize.max}
              step={EFFECT_RANGES.particleSize.step}
              value={effectAction.effect?.particleSize ?? EFFECT_DEFAULTS.particleSize}
              onChange={(e) => onUpdate(index, {
                effect: {
                  ...effectAction.effect,
                  particleSize: parseInt(e.target.value)
                }
              })}
              style={{ width: '100%' }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.success[600],
              marginTop: DESIGN_TOKENS.spacing[1]
            }}>
              <span>{EFFECT_RANGES.particleSize.min}px</span>
              <span>{EFFECT_RANGES.particleSize.max}px</span>
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
              {t('editor.effectAction.particleColorLabel')}
            </label>
            <input
              type="color"
              value={effectAction.effect?.particleColor ?? EFFECT_DEFAULTS.particleColor}
              onChange={(e) => onUpdate(index, {
                effect: {
                  ...effectAction.effect,
                  particleColor: e.target.value
                }
              })}
              style={{
                width: '100%',
                height: '40px',
                border: `2px solid ${DESIGN_TOKENS.colors.success[200]}`,
                borderRadius: DESIGN_TOKENS.borderRadius.lg,
                cursor: 'pointer'
              }}
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
              {t('editor.effectAction.particleSpreadLabel', { spread: effectAction.effect?.particleSpread ?? EFFECT_DEFAULTS.particleSpread })}
            </label>
            <input
              type="range"
              min={EFFECT_RANGES.particleSpread.min}
              max={EFFECT_RANGES.particleSpread.max}
              step={EFFECT_RANGES.particleSpread.step}
              value={effectAction.effect?.particleSpread ?? EFFECT_DEFAULTS.particleSpread}
              onChange={(e) => onUpdate(index, {
                effect: {
                  ...effectAction.effect,
                  particleSpread: parseInt(e.target.value)
                }
              })}
              style={{ width: '100%' }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.success[600],
              marginTop: DESIGN_TOKENS.spacing[1]
            }}>
              <span>{EFFECT_RANGES.particleSpread.min}°</span>
              <span>{EFFECT_RANGES.particleSpread.max}°</span>
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
              {t('editor.effectAction.particleSpeedLabel', { speed: effectAction.effect?.particleSpeed ?? EFFECT_DEFAULTS.particleSpeed })}
            </label>
            <input
              type="range"
              min={EFFECT_RANGES.particleSpeed.min}
              max={EFFECT_RANGES.particleSpeed.max}
              step={EFFECT_RANGES.particleSpeed.step}
              value={effectAction.effect?.particleSpeed ?? EFFECT_DEFAULTS.particleSpeed}
              onChange={(e) => onUpdate(index, {
                effect: {
                  ...effectAction.effect,
                  particleSpeed: parseInt(e.target.value)
                }
              })}
              style={{ width: '100%' }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.success[600],
              marginTop: DESIGN_TOKENS.spacing[1]
            }}>
              <span>{EFFECT_RANGES.particleSpeed.min} px/s</span>
              <span>{EFFECT_RANGES.particleSpeed.max} px/s</span>
            </div>
          </div>
        </>
      )}

      {/* Effect intensity setting (for glow, confetti, monochrome) */}
      {effectAction.effect?.type && ['glow', 'confetti', 'monochrome'].includes(effectAction.effect.type) && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.success[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            {t('editor.effectAction.intensityLabel', { intensity: Math.round((effectAction.effect?.intensity || EFFECT_DEFAULTS.intensity) * 100) })}
          </label>
          <input
            type="range"
            min={EFFECT_RANGES.intensity.min}
            max={EFFECT_RANGES.intensity.max}
            step={EFFECT_RANGES.intensity.step}
            value={effectAction.effect?.intensity || EFFECT_DEFAULTS.intensity}
            onChange={(e) => onUpdate(index, {
              effect: {
                ...effectAction.effect,
                intensity: parseFloat(e.target.value)
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
            <span>{t('editor.effectAction.intensityRange', { percent: Math.round(EFFECT_RANGES.intensity.min * 100) })}</span>
            <span>{t('editor.effectAction.intensityRange', { percent: Math.round(EFFECT_RANGES.intensity.max * 100) })}</span>
          </div>
        </div>
      )}

      {/* Effect duration setting */}
      {effectAction.effect?.type && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.success[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            {t('editor.effectAction.durationLabel', { seconds: effectAction.effect?.duration || EFFECT_DEFAULTS.duration })}
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
            <span>{t('editor.effectAction.seconds', { seconds: EFFECT_RANGES.duration.min })}</span>
            <span>{t('editor.effectAction.seconds', { seconds: EFFECT_RANGES.duration.max })}</span>
          </div>
        </div>
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
        {effectAction.effect?.intensity && t('editor.effectAction.withIntensity', { intensity: Math.round(effectAction.effect.intensity * 100) })}
        {effectAction.effect?.duration && t('editor.effectAction.forDuration', { seconds: effectAction.effect.duration })}
      </div>
    </ModernCard>
  );
};