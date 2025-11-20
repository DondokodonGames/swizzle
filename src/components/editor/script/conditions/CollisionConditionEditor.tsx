// src/components/editor/script/conditions/CollisionConditionEditor.tsx
// Phase D Step 1-2修正版: TypeScriptエラー解決・GameScript.ts型定義準拠
// TouchConditionEditor.tsx成功パターン完全踏襲

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TriggerCondition } from '../../../../types/editor/GameScript';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { ModernCard } from '../../../ui/ModernCard';
import { ModernButton } from '../../../ui/ModernButton';
import {
  getCollisionTypeOptions,
  getCollisionTargetOptions,
  getCollisionCheckOptions
} from '../constants/CollisionConstants';

interface CollisionConditionEditorProps {
  condition: TriggerCondition & { type: 'collision' };
  index: number;
  onUpdate: (index: number, updates: Partial<TriggerCondition>) => void;
}

export const CollisionConditionEditor: React.FC<CollisionConditionEditorProps> = ({
  condition,
  index,
  onUpdate
}) => {
  const { t } = useTranslation();
  const collisionCondition = condition;

  // Get localized options using getter functions that access i18n
  const COLLISION_TYPE_OPTIONS = useMemo(() => getCollisionTypeOptions(), []);
  const COLLISION_TARGET_OPTIONS = useMemo(() => getCollisionTargetOptions(), []);
  const COLLISION_CHECK_OPTIONS = useMemo(() => getCollisionCheckOptions(), []);

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
        <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.lg }}>💥</span>
        {t('editor.collisionCondition.title')}
      </h5>

      {/* Collision type selection */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <label style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
          color: DESIGN_TOKENS.colors.purple[800],
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'block'
        }}>
          {t('editor.collisionCondition.collisionTypeLabel')}
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          {COLLISION_TYPE_OPTIONS.map((option) => (
            <ModernButton
              key={option.value}
              variant={collisionCondition.collisionType === option.value ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onUpdate(index, { collisionType: option.value as any })}
              style={{
                borderColor: collisionCondition.collisionType === option.value 
                  ? DESIGN_TOKENS.colors.purple[500] 
                  : DESIGN_TOKENS.colors.purple[200],
                backgroundColor: collisionCondition.collisionType === option.value 
                  ? DESIGN_TOKENS.colors.purple[500] 
                  : 'transparent',
                color: collisionCondition.collisionType === option.value 
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
              <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, fontWeight: DESIGN_TOKENS.typography.fontWeight.medium }}>
                {option.label}
              </span>
            </ModernButton>
          ))}
        </div>
      </div>

      {/* Collision target selection */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <label style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
          color: DESIGN_TOKENS.colors.purple[800],
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'block'
        }}>
          {t('editor.collisionCondition.collisionTargetLabel')}
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          {COLLISION_TARGET_OPTIONS.map((option) => (
            <ModernButton
              key={option.value}
              variant={collisionCondition.target === option.value ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onUpdate(index, { target: option.value })}
              style={{
                borderColor: collisionCondition.target === option.value 
                  ? DESIGN_TOKENS.colors.purple[500] 
                  : DESIGN_TOKENS.colors.purple[200],
                backgroundColor: collisionCondition.target === option.value 
                  ? DESIGN_TOKENS.colors.purple[500] 
                  : 'transparent',
                color: collisionCondition.target === option.value 
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
              <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, fontWeight: DESIGN_TOKENS.typography.fontWeight.medium, textAlign: 'center' }}>
                {option.label}
              </span>
            </ModernButton>
          ))}
        </div>
      </div>

      {/* Detection method selection */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <label style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
          color: DESIGN_TOKENS.colors.purple[800],
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'block'
        }}>
          {t('editor.collisionCondition.detectionMethodLabel')}
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          {COLLISION_CHECK_OPTIONS.map((option) => (
            <ModernButton
              key={option.value}
              variant={collisionCondition.checkMode === option.value ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onUpdate(index, { checkMode: option.value as any })}
              style={{
                borderColor: collisionCondition.checkMode === option.value 
                  ? DESIGN_TOKENS.colors.purple[500] 
                  : DESIGN_TOKENS.colors.purple[200],
                backgroundColor: collisionCondition.checkMode === option.value 
                  ? DESIGN_TOKENS.colors.purple[500] 
                  : 'transparent',
                color: collisionCondition.checkMode === option.value 
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

      {/* Stage region specification (only shown when target is 'stage') */}
      {collisionCondition.target === 'stage' && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.purple[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            {t('editor.collisionCondition.regionLabel')}
          </label>

          {/* Region shape selection */}
          <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[2], marginBottom: DESIGN_TOKENS.spacing[3] }}>
            <ModernButton
              variant={collisionCondition.region?.shape === 'rect' || !collisionCondition.region ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onUpdate(index, {
                region: {
                  shape: 'rect',
                  x: 0.3,
                  y: 0.3,
                  width: 0.4,
                  height: 0.4
                }
              })}
              style={{
                borderColor: DESIGN_TOKENS.colors.purple[200],
                flex: 1
              }}
            >
              🔲 {t('editor.collisionCondition.shapeRect')}
            </ModernButton>
            <ModernButton
              variant={collisionCondition.region?.shape === 'circle' ? 'primary' : 'outline'}
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
                borderColor: DESIGN_TOKENS.colors.purple[200],
                flex: 1
              }}
            >
              ⭕ {t('editor.collisionCondition.shapeCircle')}
            </ModernButton>
          </div>

          {/* Region parameter settings */}
          {collisionCondition.region && (
            <div style={{
              backgroundColor: DESIGN_TOKENS.colors.neutral[50],
              padding: DESIGN_TOKENS.spacing[3],
              borderRadius: DESIGN_TOKENS.borderRadius.md,
              display: 'grid',
              gap: DESIGN_TOKENS.spacing[2]
            }}>
              <div>
                <label style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, color: DESIGN_TOKENS.colors.purple[700] }}>
                  {t('editor.collisionCondition.centerX', { percent: (collisionCondition.region.x * 100).toFixed(0) })}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={collisionCondition.region.x}
                  onChange={(e) => onUpdate(index, {
                    region: { ...collisionCondition.region!, x: parseFloat(e.target.value) }
                  })}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, color: DESIGN_TOKENS.colors.purple[700] }}>
                  {t('editor.collisionCondition.centerY', { percent: (collisionCondition.region.y * 100).toFixed(0) })}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={collisionCondition.region.y}
                  onChange={(e) => onUpdate(index, {
                    region: { ...collisionCondition.region!, y: parseFloat(e.target.value) }
                  })}
                  style={{ width: '100%' }}
                />
              </div>

              {collisionCondition.region.shape === 'rect' ? (
                <>
                  <div>
                    <label style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, color: DESIGN_TOKENS.colors.purple[700] }}>
                      {t('editor.collisionCondition.width', { percent: ((collisionCondition.region.width || 0.4) * 100).toFixed(0) })}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={collisionCondition.region.width || 0.4}
                      onChange={(e) => onUpdate(index, {
                        region: { ...collisionCondition.region!, width: parseFloat(e.target.value) }
                      })}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, color: DESIGN_TOKENS.colors.purple[700] }}>
                      {t('editor.collisionCondition.height', { percent: ((collisionCondition.region.height || 0.4) * 100).toFixed(0) })}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={collisionCondition.region.height || 0.4}
                      onChange={(e) => onUpdate(index, {
                        region: { ...collisionCondition.region!, height: parseFloat(e.target.value) }
                      })}
                      style={{ width: '100%' }}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, color: DESIGN_TOKENS.colors.purple[700] }}>
                    {t('editor.collisionCondition.radius', { percent: ((collisionCondition.region.radius || 0.2) * 100).toFixed(0) })}
                  </label>
                  <input
                    type="range"
                    min="0.05"
                    max="0.5"
                    step="0.05"
                    value={collisionCondition.region.radius || 0.2}
                    onChange={(e) => onUpdate(index, {
                      region: { ...collisionCondition.region!, radius: parseFloat(e.target.value) }
                    })}
                    style={{ width: '100%' }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Target object selection (shown when target is other object) */}
      {collisionCondition.target !== 'background' && collisionCondition.target !== 'stage' && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.purple[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            {t('editor.collisionCondition.targetObjectLabel')}
          </label>
          <select
            value={typeof collisionCondition.target === 'string' ? collisionCondition.target : ''}
            onChange={(e) => onUpdate(index, { target: e.target.value || 'background' })}
            style={{
              width: '100%',
              padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[3]}`,
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              border: `1px solid ${DESIGN_TOKENS.colors.purple[200]}`,
              borderRadius: DESIGN_TOKENS.borderRadius.lg,
              backgroundColor: DESIGN_TOKENS.colors.neutral[0],
              outline: 'none'
            }}
          >
            <option value="">{t('editor.collisionCondition.selectObjectPlaceholder')}</option>
            {/* TODO: Select from project objects */}
            <option value="character">{t('editor.collisionCondition.objectOptions.character')}</option>
            <option value="item">{t('editor.collisionCondition.objectOptions.item')}</option>
            <option value="obstacle">{t('editor.collisionCondition.objectOptions.obstacle')}</option>
          </select>
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
        {t('editor.collisionCondition.settingsSummaryTitle')} {COLLISION_TYPE_OPTIONS.find(t => t.value === collisionCondition.collisionType)?.description}
        {collisionCondition.target === 'background' && t('editor.collisionCondition.collisionWithBackground')}
        {collisionCondition.target === 'stage' &&
          (collisionCondition.region ?
            t('editor.collisionCondition.collisionWithStageRegion', {
              shape: collisionCondition.region.shape === 'rect' ? t('editor.collisionCondition.shapeRect') : t('editor.collisionCondition.shapeCircle')
            }) :
            t('editor.collisionCondition.collisionWithStageEdge'))}
        {collisionCondition.target !== 'background' && collisionCondition.target !== 'stage' &&
          t('editor.collisionCondition.collisionWithObject', { target: collisionCondition.target })}
        {t('editor.collisionCondition.usingDetection', {
          method: COLLISION_CHECK_OPTIONS.find(c => c.value === collisionCondition.checkMode)?.label
        })}
      </div>
    </ModernCard>
  );
};