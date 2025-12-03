// src/components/editor/script/conditions/AnimationConditionEditor.tsx
// 拡張版: playing/stopped/frameRange の完全実装
// 新機能: アニメーション再生中判定、停止中判定、フレーム範囲判定
// 修正: frameRangeをタプル形式[number, number]に変更

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TriggerCondition } from '../../../../types/editor/GameScript';
import { GameProject } from '../../../../types/editor/GameProject';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { ModernCard } from '../../../ui/ModernCard';
import { ModernButton } from '../../../ui/ModernButton';
import {
  getAnimationConditions,
  getAnimationTargetOptions,
  getFrameNumberOptions,
  getAnimationIndexOptions,
  ANIMATION_DEFAULTS,
  ANIMATION_RANGES
} from '../constants/AnimationConstants';

interface AnimationConditionEditorProps {
  condition: TriggerCondition & { type: 'animation' };
  index: number;
  project: GameProject;
  onUpdate: (index: number, updates: Partial<TriggerCondition>) => void;
}

export const AnimationConditionEditor: React.FC<AnimationConditionEditorProps> = ({
  condition,
  index,
  project,
  onUpdate
}) => {
  const { t } = useTranslation();
  const animationCondition = condition;

  // Get localized options
  const ANIMATION_CONDITIONS = useMemo(() => getAnimationConditions(), []);
  const ANIMATION_TARGET_OPTIONS = useMemo(() => getAnimationTargetOptions(), []);
  const FRAME_NUMBER_OPTIONS = useMemo(() => getFrameNumberOptions(), []);
  const ANIMATION_INDEX_OPTIONS = useMemo(() => getAnimationIndexOptions(), []);

  // Get project objects
  const projectObjects = project.assets?.objects || [];

  // Get selected object's animations
  const getSelectedObjectAnimations = () => {
    if (animationCondition.target === 'background') {
      return project.assets?.background?.frames || [];
    }

    const targetObject = projectObjects.find(obj => obj.id === animationCondition.target);
    return targetObject?.frames || [];
  };

  const selectedObjectFrames = getSelectedObjectAnimations();
  const maxFrameNumber = Math.max(1, selectedObjectFrames.length);
  const availableFrameOptions = FRAME_NUMBER_OPTIONS.slice(0, maxFrameNumber);
  
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
        <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.lg }}>🎬</span>
        {t('editor.animationCondition.title')}
      </h5>

      {/* Animation condition type selection */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <label style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
          color: DESIGN_TOKENS.colors.purple[800],
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'block'
        }}>
          {t('editor.animationCondition.conditionTypeLabel')}
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          {ANIMATION_CONDITIONS.map((option) => (
            <ModernButton
              key={option.value}
              variant={animationCondition.condition === option.value ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onUpdate(index, { condition: option.value as any })}
              style={{
                borderColor: animationCondition.condition === option.value 
                  ? DESIGN_TOKENS.colors.purple[500] 
                  : DESIGN_TOKENS.colors.purple[200],
                backgroundColor: animationCondition.condition === option.value 
                  ? DESIGN_TOKENS.colors.purple[500] 
                  : 'transparent',
                color: animationCondition.condition === option.value 
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

      {/* Animation target selection */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <label style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
          color: DESIGN_TOKENS.colors.purple[800],
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'block'
        }}>
          {t('editor.animationCondition.targetLabel')}
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          {ANIMATION_TARGET_OPTIONS.map((option) => (
            <ModernButton
              key={option.value}
              variant={animationCondition.target === option.value ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onUpdate(index, { target: option.value })}
              style={{
                borderColor: animationCondition.target === option.value 
                  ? DESIGN_TOKENS.colors.purple[500] 
                  : DESIGN_TOKENS.colors.purple[200],
                backgroundColor: animationCondition.target === option.value 
                  ? DESIGN_TOKENS.colors.purple[500] 
                  : 'transparent',
                color: animationCondition.target === option.value 
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

      {/* Frame number selection (for 'frame' condition) */}
      {animationCondition.condition === 'frame' && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.purple[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            {t('editor.animationCondition.frameNumberLabel')}
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
            gap: DESIGN_TOKENS.spacing[2]
          }}>
            {availableFrameOptions.map((option) => (
              <ModernButton
                key={option.value}
                variant={animationCondition.frameNumber === option.value ? 'primary' : 'outline'}
                size="sm"
                onClick={() => onUpdate(index, { frameNumber: option.value })}
                style={{
                  borderColor: animationCondition.frameNumber === option.value 
                    ? DESIGN_TOKENS.colors.purple[500] 
                    : DESIGN_TOKENS.colors.purple[200],
                  backgroundColor: animationCondition.frameNumber === option.value 
                    ? DESIGN_TOKENS.colors.purple[500] 
                    : 'transparent',
                  color: animationCondition.frameNumber === option.value 
                    ? DESIGN_TOKENS.colors.neutral[0] 
                    : DESIGN_TOKENS.colors.purple[800]
                }}
              >
                {option.label}
              </ModernButton>
            ))}
          </div>
        </div>
      )}

      {/* Frame range selection (when condition is 'frameRange') - 修正版: タプル形式に変更 */}
      {animationCondition.condition === 'frameRange' && selectedObjectFrames.length > 0 && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.purple[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            {t('editor.animationCondition.frameRangeLabel')}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: DESIGN_TOKENS.spacing[2] }}>
            <div>
              <label style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, color: DESIGN_TOKENS.colors.purple[700] }}>
                {t('editor.animationCondition.startFrame', { frame: animationCondition.frameRange?.[0] ?? ANIMATION_DEFAULTS.frameRangeStart })}
              </label>
              <input
                type="range"
                min={ANIMATION_RANGES.frameRangeStart.min}
                max={Math.min(ANIMATION_RANGES.frameRangeStart.max, maxFrameNumber)}
                step={ANIMATION_RANGES.frameRangeStart.step}
                value={animationCondition.frameRange?.[0] ?? ANIMATION_DEFAULTS.frameRangeStart}
                onChange={(e) => onUpdate(index, { 
                  frameRange: [
                    parseInt(e.target.value), 
                    animationCondition.frameRange?.[1] ?? ANIMATION_DEFAULTS.frameRangeEnd
                  ] as [number, number]
                })}
                style={{ width: '100%' }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                color: DESIGN_TOKENS.colors.purple[600],
                marginTop: DESIGN_TOKENS.spacing[1]
              }}>
                <span>1</span>
                <span>{Math.min(ANIMATION_RANGES.frameRangeStart.max, maxFrameNumber)}</span>
              </div>
            </div>
            <div>
              <label style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, color: DESIGN_TOKENS.colors.purple[700] }}>
                {t('editor.animationCondition.endFrame', { frame: animationCondition.frameRange?.[1] ?? ANIMATION_DEFAULTS.frameRangeEnd })}
              </label>
              <input
                type="range"
                min={ANIMATION_RANGES.frameRangeEnd.min}
                max={Math.min(ANIMATION_RANGES.frameRangeEnd.max, maxFrameNumber)}
                step={ANIMATION_RANGES.frameRangeEnd.step}
                value={animationCondition.frameRange?.[1] ?? ANIMATION_DEFAULTS.frameRangeEnd}
                onChange={(e) => onUpdate(index, { 
                  frameRange: [
                    animationCondition.frameRange?.[0] ?? ANIMATION_DEFAULTS.frameRangeStart,
                    parseInt(e.target.value)
                  ] as [number, number]
                })}
                style={{ width: '100%' }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                color: DESIGN_TOKENS.colors.purple[600],
                marginTop: DESIGN_TOKENS.spacing[1]
              }}>
                <span>1</span>
                <span>{Math.min(ANIMATION_RANGES.frameRangeEnd.max, maxFrameNumber)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Animation index selection (when condition is 'playing', 'stopped' or 'loop') */}
      {(animationCondition.condition === 'playing' || animationCondition.condition === 'stopped' || animationCondition.condition === 'loop') && selectedObjectFrames.length > 1 && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.purple[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            {t('editor.animationCondition.animationNumberLabel', { number: (animationCondition.animationIndex || ANIMATION_DEFAULTS.animationIndex) + 1 })}
          </label>
          <input
            type="range"
            min="0"
            max={Math.min(7, selectedObjectFrames.length - 1)}
            step="1"
            value={animationCondition.animationIndex || ANIMATION_DEFAULTS.animationIndex}
            onChange={(e) => onUpdate(index, { animationIndex: parseInt(e.target.value) })}
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
            color: DESIGN_TOKENS.colors.purple[500],
            marginTop: DESIGN_TOKENS.spacing[1]
          }}>
            <span>{t('editor.animationCondition.animation', { number: 1 })}</span>
            <span>{t('editor.animationCondition.animation', { number: Math.min(8, selectedObjectFrames.length) })}</span>
          </div>
        </div>
      )}

      {/* Loop count (when condition is 'loop') */}
      {animationCondition.condition === 'loop' && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.purple[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            {t('editor.animationCondition.loopCountLabel', { count: animationCondition.loopCount ?? ANIMATION_DEFAULTS.loopCount })}
          </label>
          <input
            type="range"
            min={ANIMATION_RANGES.loopCount.min}
            max={ANIMATION_RANGES.loopCount.max}
            step={ANIMATION_RANGES.loopCount.step}
            value={animationCondition.loopCount ?? ANIMATION_DEFAULTS.loopCount}
            onChange={(e) => onUpdate(index, { loopCount: parseInt(e.target.value) })}
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
            <span>{ANIMATION_RANGES.loopCount.min}</span>
            <span>{ANIMATION_RANGES.loopCount.max}</span>
          </div>
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
        {t('editor.animationCondition.settingsSummaryTitle')}
        {ANIMATION_CONDITIONS.find(c => c.value === animationCondition.condition)?.description}
        {animationCondition.target === 'background' && t('editor.animationCondition.backgroundAnimation')}
        {animationCondition.target === 'self' && t('editor.animationCondition.thisObjectAnimation')}
        {animationCondition.target !== 'background' && animationCondition.target !== 'self' && t('editor.animationCondition.otherObjectAnimation', {
          name: projectObjects.find(obj => obj.id === animationCondition.target)?.name || animationCondition.target
        })}
        {animationCondition.condition === 'frame' && t('editor.animationCondition.frameNumber', { number: animationCondition.frameNumber || ANIMATION_DEFAULTS.frameNumber })}
        {animationCondition.condition === 'frameRange' && t('editor.animationCondition.frameRangeDisplay', { 
          start: animationCondition.frameRange?.[0] ?? ANIMATION_DEFAULTS.frameRangeStart, 
          end: animationCondition.frameRange?.[1] ?? ANIMATION_DEFAULTS.frameRangeEnd 
        })}
        {(animationCondition.animationIndex || 0) > 0 && t('editor.animationCondition.animationNumber', { number: (animationCondition.animationIndex || 0) + 1 })}
        {selectedObjectFrames.length > 0 && t('editor.animationCondition.framesAvailable', { count: selectedObjectFrames.length })}
      </div>
    </ModernCard>
  );
};