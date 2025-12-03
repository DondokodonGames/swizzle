// src/components/editor/script/conditions/TouchConditionEditor.tsx
// 拡張版: drag/swipe/flick/hold の完全実装
// 新機能: ドラッグ追従、スワイプ検出、フリック検出、長押し拡張
// 修正: GameScript.ts型定義に合わせてプロパティ名を修正

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TriggerCondition } from '../../../../types/editor/GameScript';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { ModernCard } from '../../../ui/ModernCard';
import { ModernButton } from '../../../ui/ModernButton';
import { 
  getTouchTypeOptions, 
  getTouchTargetOptions,
  getDragTypeOptions,
  getDragConstraintOptions,
  getSwipeDirectionOptions,
  getFlickDirectionOptions,
  TOUCH_DEFAULTS,
  TOUCH_RANGES
} from '../constants/TouchConstants';

interface TouchConditionEditorProps {
  condition: TriggerCondition & { type: 'touch' };
  index: number;
  onUpdate: (index: number, updates: Partial<TriggerCondition>) => void;
}

export const TouchConditionEditor: React.FC<TouchConditionEditorProps> = ({
  condition,
  index,
  onUpdate
}) => {
  const { t } = useTranslation();
  const touchCondition = condition;

  // Get localized options
  const TOUCH_TYPE_OPTIONS = useMemo(() => getTouchTypeOptions(), []);
  const TOUCH_TARGET_OPTIONS = useMemo(() => getTouchTargetOptions(), []);
  const DRAG_TYPE_OPTIONS = useMemo(() => getDragTypeOptions(), []);
  const DRAG_CONSTRAINT_OPTIONS = useMemo(() => getDragConstraintOptions(), []);
  const SWIPE_DIRECTION_OPTIONS = useMemo(() => getSwipeDirectionOptions(), []);
  const FLICK_DIRECTION_OPTIONS = useMemo(() => getFlickDirectionOptions(), []);

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
        <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.lg }}>👆</span>
        {t('editor.touchCondition.title')}
      </h5>

      {/* Touch type selection */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <label style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
          color: DESIGN_TOKENS.colors.purple[800],
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'block'
        }}>
          {t('editor.touchCondition.touchTypeLabel')}
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          {TOUCH_TYPE_OPTIONS.map((option) => (
            <ModernButton
              key={option.value}
              variant={touchCondition.touchType === option.value ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onUpdate(index, { touchType: option.value as any })}
              style={{
                borderColor: touchCondition.touchType === option.value 
                  ? DESIGN_TOKENS.colors.purple[500] 
                  : DESIGN_TOKENS.colors.purple[200],
                backgroundColor: touchCondition.touchType === option.value 
                  ? DESIGN_TOKENS.colors.purple[500] 
                  : 'transparent',
                color: touchCondition.touchType === option.value 
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
              <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, fontWeight: DESIGN_TOKENS.typography.fontWeight.medium }}>
                {option.label}
              </span>
            </ModernButton>
          ))}
        </div>
      </div>

      {/* Drag settings (when touchType is 'drag') */}
      {touchCondition.touchType === 'drag' && (
        <>
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.purple[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              {t('editor.touchCondition.dragTypeLabel')}
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: DESIGN_TOKENS.spacing[2]
            }}>
              {DRAG_TYPE_OPTIONS.map((option) => (
                <ModernButton
                  key={option.value}
                  variant={touchCondition.dragType === option.value ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => onUpdate(index, { dragType: option.value as any })}
                  style={{
                    borderColor: touchCondition.dragType === option.value 
                      ? DESIGN_TOKENS.colors.purple[500] 
                      : DESIGN_TOKENS.colors.purple[200],
                    backgroundColor: touchCondition.dragType === option.value 
                      ? DESIGN_TOKENS.colors.purple[500] 
                      : 'transparent',
                    color: touchCondition.dragType === option.value 
                      ? DESIGN_TOKENS.colors.neutral[0] 
                      : DESIGN_TOKENS.colors.purple[800]
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
              color: DESIGN_TOKENS.colors.purple[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              {t('editor.touchCondition.dragConstraintLabel')}
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: DESIGN_TOKENS.spacing[2]
            }}>
              {DRAG_CONSTRAINT_OPTIONS.map((option) => (
                <ModernButton
                  key={option.value}
                  variant={touchCondition.constraint === option.value ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => onUpdate(index, { constraint: option.value as any })}
                  style={{
                    borderColor: touchCondition.constraint === option.value 
                      ? DESIGN_TOKENS.colors.purple[500] 
                      : DESIGN_TOKENS.colors.purple[200],
                    backgroundColor: touchCondition.constraint === option.value 
                      ? DESIGN_TOKENS.colors.purple[500] 
                      : 'transparent',
                    color: touchCondition.constraint === option.value 
                      ? DESIGN_TOKENS.colors.neutral[0] 
                      : DESIGN_TOKENS.colors.purple[800]
                  }}
                >
                  <span>{option.label}</span>
                </ModernButton>
              ))}
            </div>
          </div>

          {/* Drag bounding box settings */}
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.purple[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              {t('editor.touchCondition.boundingBoxLabel')}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: DESIGN_TOKENS.spacing[2] }}>
              <div>
                <label style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, color: DESIGN_TOKENS.colors.purple[700] }}>
                  X位置: {((touchCondition.boundingBox?.x ?? 0) * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={touchCondition.boundingBox?.x ?? 0}
                  onChange={(e) => onUpdate(index, {
                    boundingBox: { 
                      x: parseFloat(e.target.value),
                      y: touchCondition.boundingBox?.y ?? 0,
                      width: touchCondition.boundingBox?.width ?? 1,
                      height: touchCondition.boundingBox?.height ?? 1
                    }
                  })}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, color: DESIGN_TOKENS.colors.purple[700] }}>
                  Y位置: {((touchCondition.boundingBox?.y ?? 0) * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={touchCondition.boundingBox?.y ?? 0}
                  onChange={(e) => onUpdate(index, {
                    boundingBox: { 
                      x: touchCondition.boundingBox?.x ?? 0,
                      y: parseFloat(e.target.value),
                      width: touchCondition.boundingBox?.width ?? 1,
                      height: touchCondition.boundingBox?.height ?? 1
                    }
                  })}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, color: DESIGN_TOKENS.colors.purple[700] }}>
                  幅: {((touchCondition.boundingBox?.width ?? 1) * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.01"
                  value={touchCondition.boundingBox?.width ?? 1}
                  onChange={(e) => onUpdate(index, {
                    boundingBox: { 
                      x: touchCondition.boundingBox?.x ?? 0,
                      y: touchCondition.boundingBox?.y ?? 0,
                      width: parseFloat(e.target.value),
                      height: touchCondition.boundingBox?.height ?? 1
                    }
                  })}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, color: DESIGN_TOKENS.colors.purple[700] }}>
                  高さ: {((touchCondition.boundingBox?.height ?? 1) * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.01"
                  value={touchCondition.boundingBox?.height ?? 1}
                  onChange={(e) => onUpdate(index, {
                    boundingBox: { 
                      x: touchCondition.boundingBox?.x ?? 0,
                      y: touchCondition.boundingBox?.y ?? 0,
                      width: touchCondition.boundingBox?.width ?? 1,
                      height: parseFloat(e.target.value)
                    }
                  })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Swipe settings (when touchType is 'swipe') */}
      {touchCondition.touchType === 'swipe' && (
        <>
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.purple[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              {t('editor.touchCondition.swipeDirectionLabel')}
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: DESIGN_TOKENS.spacing[2]
            }}>
              {SWIPE_DIRECTION_OPTIONS.map((option) => (
                <ModernButton
                  key={option.value}
                  variant={touchCondition.direction === option.value ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => onUpdate(index, { direction: option.value as any })}
                  style={{
                    borderColor: touchCondition.direction === option.value 
                      ? DESIGN_TOKENS.colors.purple[500] 
                      : DESIGN_TOKENS.colors.purple[200],
                    backgroundColor: touchCondition.direction === option.value 
                      ? DESIGN_TOKENS.colors.purple[500] 
                      : 'transparent',
                    color: touchCondition.direction === option.value 
                      ? DESIGN_TOKENS.colors.neutral[0] 
                      : DESIGN_TOKENS.colors.purple[800],
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
              color: DESIGN_TOKENS.colors.purple[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              {t('editor.touchCondition.swipeMinDistanceLabel', { distance: touchCondition.minDistance ?? TOUCH_DEFAULTS.swipeMinDistance })}
            </label>
            <input
              type="range"
              min={TOUCH_RANGES.swipeMinDistance.min}
              max={TOUCH_RANGES.swipeMinDistance.max}
              step={TOUCH_RANGES.swipeMinDistance.step}
              value={touchCondition.minDistance ?? TOUCH_DEFAULTS.swipeMinDistance}
              onChange={(e) => onUpdate(index, { minDistance: parseFloat(e.target.value) })}
              style={{ width: '100%' }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.purple[600],
              marginTop: DESIGN_TOKENS.spacing[1]
            }}>
              <span>{TOUCH_RANGES.swipeMinDistance.min}px</span>
              <span>{TOUCH_RANGES.swipeMinDistance.max}px</span>
            </div>
          </div>

          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.purple[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              {t('editor.touchCondition.swipeMaxDurationLabel', { duration: touchCondition.maxDuration ?? TOUCH_DEFAULTS.swipeMaxDuration })}
            </label>
            <input
              type="range"
              min={TOUCH_RANGES.swipeMaxDuration.min}
              max={TOUCH_RANGES.swipeMaxDuration.max}
              step={TOUCH_RANGES.swipeMaxDuration.step}
              value={touchCondition.maxDuration ?? TOUCH_DEFAULTS.swipeMaxDuration}
              onChange={(e) => onUpdate(index, { maxDuration: parseFloat(e.target.value) })}
              style={{ width: '100%' }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.purple[600],
              marginTop: DESIGN_TOKENS.spacing[1]
            }}>
              <span>{TOUCH_RANGES.swipeMaxDuration.min}ms</span>
              <span>{TOUCH_RANGES.swipeMaxDuration.max}ms</span>
            </div>
          </div>

          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.purple[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              {t('editor.touchCondition.swipeMinVelocityLabel', { velocity: touchCondition.minVelocity ?? TOUCH_DEFAULTS.swipeMinVelocity })}
            </label>
            <input
              type="range"
              min={TOUCH_RANGES.swipeMinVelocity.min}
              max={TOUCH_RANGES.swipeMinVelocity.max}
              step={TOUCH_RANGES.swipeMinVelocity.step}
              value={touchCondition.minVelocity ?? TOUCH_DEFAULTS.swipeMinVelocity}
              onChange={(e) => onUpdate(index, { minVelocity: parseFloat(e.target.value) })}
              style={{ width: '100%' }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.purple[600],
              marginTop: DESIGN_TOKENS.spacing[1]
            }}>
              <span>{TOUCH_RANGES.swipeMinVelocity.min} px/ms</span>
              <span>{TOUCH_RANGES.swipeMinVelocity.max} px/ms</span>
            </div>
          </div>
        </>
      )}

      {/* Flick settings (when touchType is 'flick') */}
      {touchCondition.touchType === 'flick' && (
        <>
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.purple[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              {t('editor.touchCondition.flickDirectionLabel')}
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: DESIGN_TOKENS.spacing[2]
            }}>
              {FLICK_DIRECTION_OPTIONS.map((option) => (
                <ModernButton
                  key={option.value}
                  variant={touchCondition.direction === option.value ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => onUpdate(index, { direction: option.value as any })}
                  style={{
                    borderColor: touchCondition.direction === option.value 
                      ? DESIGN_TOKENS.colors.purple[500] 
                      : DESIGN_TOKENS.colors.purple[200],
                    backgroundColor: touchCondition.direction === option.value 
                      ? DESIGN_TOKENS.colors.purple[500] 
                      : 'transparent',
                    color: touchCondition.direction === option.value 
                      ? DESIGN_TOKENS.colors.neutral[0] 
                      : DESIGN_TOKENS.colors.purple[800],
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
              color: DESIGN_TOKENS.colors.purple[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              {t('editor.touchCondition.flickMinVelocityLabel', { velocity: touchCondition.minVelocity ?? TOUCH_DEFAULTS.flickMinVelocity })}
            </label>
            <input
              type="range"
              min={TOUCH_RANGES.flickMinVelocity.min}
              max={TOUCH_RANGES.flickMinVelocity.max}
              step={TOUCH_RANGES.flickMinVelocity.step}
              value={touchCondition.minVelocity ?? TOUCH_DEFAULTS.flickMinVelocity}
              onChange={(e) => onUpdate(index, { minVelocity: parseFloat(e.target.value) })}
              style={{ width: '100%' }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.purple[600],
              marginTop: DESIGN_TOKENS.spacing[1]
            }}>
              <span>{TOUCH_RANGES.flickMinVelocity.min} px/ms</span>
              <span>{TOUCH_RANGES.flickMinVelocity.max} px/ms</span>
            </div>
          </div>

          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.purple[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              {t('editor.touchCondition.flickMaxDistanceLabel', { distance: touchCondition.maxDistance ?? TOUCH_DEFAULTS.flickMaxDistance })}
            </label>
            <input
              type="range"
              min={TOUCH_RANGES.flickMaxDistance.min}
              max={TOUCH_RANGES.flickMaxDistance.max}
              step={TOUCH_RANGES.flickMaxDistance.step}
              value={touchCondition.maxDistance ?? TOUCH_DEFAULTS.flickMaxDistance}
              onChange={(e) => onUpdate(index, { maxDistance: parseFloat(e.target.value) })}
              style={{ width: '100%' }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.purple[600],
              marginTop: DESIGN_TOKENS.spacing[1]
            }}>
              <span>{TOUCH_RANGES.flickMaxDistance.min}px</span>
              <span>{TOUCH_RANGES.flickMaxDistance.max}px</span>
            </div>
          </div>

          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.purple[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              {t('editor.touchCondition.flickMaxDurationLabel', { duration: touchCondition.maxDuration ?? TOUCH_DEFAULTS.flickMaxDuration })}
            </label>
            <input
              type="range"
              min={TOUCH_RANGES.flickMaxDuration.min}
              max={TOUCH_RANGES.flickMaxDuration.max}
              step={TOUCH_RANGES.flickMaxDuration.step}
              value={touchCondition.maxDuration ?? TOUCH_DEFAULTS.flickMaxDuration}
              onChange={(e) => onUpdate(index, { maxDuration: parseFloat(e.target.value) })}
              style={{ width: '100%' }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.purple[600],
              marginTop: DESIGN_TOKENS.spacing[1]
            }}>
              <span>{TOUCH_RANGES.flickMaxDuration.min}ms</span>
              <span>{TOUCH_RANGES.flickMaxDuration.max}ms</span>
            </div>
          </div>
        </>
      )}

      {/* Hold duration setting (when touchType is 'hold') */}
      {touchCondition.touchType === 'hold' && (
        <>
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.purple[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              {t('editor.touchCondition.holdDurationLabel', { seconds: touchCondition.holdDuration || TOUCH_DEFAULTS.holdDuration })}
            </label>
            <input
              type="range"
              min={TOUCH_RANGES.holdDuration.min}
              max={TOUCH_RANGES.holdDuration.max}
              step={TOUCH_RANGES.holdDuration.step}
              value={touchCondition.holdDuration || TOUCH_DEFAULTS.holdDuration}
              onChange={(e) => onUpdate(index, { holdDuration: parseFloat(e.target.value) })}
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: DESIGN_TOKENS.colors.purple[200],
                borderRadius: DESIGN_TOKENS.borderRadius.full,
                outline: 'none',
                cursor: 'pointer'
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.purple[600],
              marginTop: DESIGN_TOKENS.spacing[1]
            }}>
              <span>{t('editor.touchCondition.seconds', { seconds: TOUCH_RANGES.holdDuration.min })}</span>
              <span>{t('editor.touchCondition.seconds', { seconds: TOUCH_RANGES.holdDuration.max })}</span>
            </div>
          </div>

          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.purple[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              {t('editor.touchCondition.holdToleranceLabel', { tolerance: touchCondition.tolerance ?? TOUCH_DEFAULTS.holdTolerance })}
            </label>
            <input
              type="range"
              min={TOUCH_RANGES.holdTolerance.min}
              max={TOUCH_RANGES.holdTolerance.max}
              step={TOUCH_RANGES.holdTolerance.step}
              value={touchCondition.tolerance ?? TOUCH_DEFAULTS.holdTolerance}
              onChange={(e) => onUpdate(index, { tolerance: parseFloat(e.target.value) })}
              style={{ width: '100%' }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.purple[600],
              marginTop: DESIGN_TOKENS.spacing[1]
            }}>
              <span>{TOUCH_RANGES.holdTolerance.min}px</span>
              <span>{TOUCH_RANGES.holdTolerance.max}px</span>
            </div>
          </div>

          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: DESIGN_TOKENS.spacing[2],
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              color: DESIGN_TOKENS.colors.purple[800]
            }}>
              <input
                type="checkbox"
                checked={touchCondition.checkProgress ?? false}
                onChange={(e) => onUpdate(index, { checkProgress: e.target.checked })}
              />
              {t('editor.touchCondition.checkProgressLabel')}
            </label>
          </div>

          {touchCondition.checkProgress && (
            <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
              <label style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                color: DESIGN_TOKENS.colors.purple[800],
                marginBottom: DESIGN_TOKENS.spacing[2],
                display: 'block'
              }}>
                {t('editor.touchCondition.progressThresholdLabel', { threshold: ((touchCondition.progressThreshold ?? TOUCH_DEFAULTS.holdProgressThreshold) * 100).toFixed(0) })}
              </label>
              <input
                type="range"
                min={TOUCH_RANGES.holdProgressThreshold.min}
                max={TOUCH_RANGES.holdProgressThreshold.max}
                step={TOUCH_RANGES.holdProgressThreshold.step}
                value={touchCondition.progressThreshold ?? TOUCH_DEFAULTS.holdProgressThreshold}
                onChange={(e) => onUpdate(index, { progressThreshold: parseFloat(e.target.value) })}
                style={{ width: '100%' }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                color: DESIGN_TOKENS.colors.purple[600],
                marginTop: DESIGN_TOKENS.spacing[1]
              }}>
                <span>{(TOUCH_RANGES.holdProgressThreshold.min * 100).toFixed(0)}%</span>
                <span>{(TOUCH_RANGES.holdProgressThreshold.max * 100).toFixed(0)}%</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Touch target selection */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <label style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
          color: DESIGN_TOKENS.colors.purple[800],
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'block'
        }}>
          {t('editor.touchCondition.touchTargetLabel')}
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          {TOUCH_TARGET_OPTIONS.map((option) => (
            <ModernButton
              key={option.value}
              variant={touchCondition.target === option.value ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onUpdate(index, { target: option.value })}
              style={{
                borderColor: touchCondition.target === option.value 
                  ? DESIGN_TOKENS.colors.purple[500] 
                  : DESIGN_TOKENS.colors.purple[200],
                backgroundColor: touchCondition.target === option.value 
                  ? DESIGN_TOKENS.colors.purple[500] 
                  : 'transparent',
                color: touchCondition.target === option.value 
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
              <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, fontWeight: DESIGN_TOKENS.typography.fontWeight.medium }}>
                {option.label}
              </span>
            </ModernButton>
          ))}
        </div>
      </div>

      {/* Stage area settings (when target is 'stageArea') */}
      {touchCondition.target === 'stageArea' && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.purple[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            {t('editor.touchCondition.regionShapeLabel')}
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: DESIGN_TOKENS.spacing[2],
            marginBottom: DESIGN_TOKENS.spacing[3]
          }}>
            <ModernButton
              variant={touchCondition.region?.shape === 'rect' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onUpdate(index, { 
                region: { 
                  shape: 'rect', 
                  x: 0.5, 
                  y: 0.5, 
                  width: 0.4, 
                  height: 0.4 
                } 
              })}
              style={{
                borderColor: touchCondition.region?.shape === 'rect' 
                  ? DESIGN_TOKENS.colors.purple[500] 
                  : DESIGN_TOKENS.colors.purple[200]
              }}
            >
              <span>⬜ {t('editor.touchCondition.rectangle')}</span>
            </ModernButton>
            <ModernButton
              variant={touchCondition.region?.shape === 'circle' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onUpdate(index, { 
                region: { 
                  shape: 'circle', 
                  x: 0.5, 
                  y: 0.5, 
                  radius: 0.2 
                } 
              })}
              style={{
                borderColor: touchCondition.region?.shape === 'circle' 
                  ? DESIGN_TOKENS.colors.purple[500] 
                  : DESIGN_TOKENS.colors.purple[200]
              }}
            >
              <span>⭕ {t('editor.touchCondition.circle')}</span>
            </ModernButton>
          </div>

          {touchCondition.region && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: DESIGN_TOKENS.spacing[2], marginBottom: DESIGN_TOKENS.spacing[3] }}>
                <div>
                  <label style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, color: DESIGN_TOKENS.colors.purple[700] }}>
                    {t('editor.touchCondition.centerX', { percent: ((touchCondition.region.x || 0.5) * 100).toFixed(0) })}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={touchCondition.region.x || 0.5}
                    onChange={(e) => onUpdate(index, {
                      region: { ...touchCondition.region!, x: parseFloat(e.target.value) }
                    })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, color: DESIGN_TOKENS.colors.purple[700] }}>
                    {t('editor.touchCondition.centerY', { percent: ((touchCondition.region.y || 0.5) * 100).toFixed(0) })}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={touchCondition.region.y || 0.5}
                    onChange={(e) => onUpdate(index, {
                      region: { ...touchCondition.region!, y: parseFloat(e.target.value) }
                    })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {touchCondition.region.shape === 'rect' ? (
                <>
                  <div>
                    <label style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, color: DESIGN_TOKENS.colors.purple[700] }}>
                      {t('editor.touchCondition.width', { percent: ((touchCondition.region.width || 0.4) * 100).toFixed(0) })}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={touchCondition.region.width || 0.4}
                      onChange={(e) => onUpdate(index, {
                        region: { ...touchCondition.region!, width: parseFloat(e.target.value) }
                      })}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, color: DESIGN_TOKENS.colors.purple[700] }}>
                      {t('editor.touchCondition.height', { percent: ((touchCondition.region.height || 0.4) * 100).toFixed(0) })}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={touchCondition.region.height || 0.4}
                      onChange={(e) => onUpdate(index, {
                        region: { ...touchCondition.region!, height: parseFloat(e.target.value) }
                      })}
                      style={{ width: '100%' }}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, color: DESIGN_TOKENS.colors.purple[700] }}>
                    {t('editor.touchCondition.radius', { percent: ((touchCondition.region.radius || 0.2) * 100).toFixed(0) })}
                  </label>
                  <input
                    type="range"
                    min="0.05"
                    max="0.5"
                    step="0.05"
                    value={touchCondition.region.radius || 0.2}
                    onChange={(e) => onUpdate(index, {
                      region: { ...touchCondition.region!, radius: parseFloat(e.target.value) }
                    })}
                    style={{ width: '100%' }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Settings summary */}
      <div style={{
        padding: DESIGN_TOKENS.spacing[3],
        backgroundColor: DESIGN_TOKENS.colors.purple[100],
        borderRadius: DESIGN_TOKENS.borderRadius.lg,
        fontSize: DESIGN_TOKENS.typography.fontSize.xs,
        color: DESIGN_TOKENS.colors.purple[800]
      }}>
        {t('editor.touchCondition.settingsSummaryTitle')}
        {TOUCH_TYPE_OPTIONS.find(t => t.value === touchCondition.touchType)?.description}
      </div>
    </ModernCard>
  );
};