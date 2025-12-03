// src/components/editor/script/actions/MoveActionEditor.tsx
// 拡張版: followDrag の完全実装
// 新機能: ドラッグ追従移動、減衰係数、境界制約

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { GameAction } from '../../../../types/editor/GameScript';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { ModernCard } from '../../../ui/ModernCard';
import { ModernButton } from '../../../ui/ModernButton';
import { 
  getMovementTypeOptions,
  getFollowDragOptions,
  MOVEMENT_DEFAULTS,
  MOVEMENT_RANGES
} from '../constants/MovementConstants';

interface MoveActionEditorProps {
  action: GameAction & { type: 'move' };
  index: number;
  onUpdate: (index: number, updates: Partial<GameAction>) => void;
  onShowNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const MoveActionEditor: React.FC<MoveActionEditorProps> = ({
  action,
  index,
  onUpdate,
  onShowNotification
}) => {
  const { t } = useTranslation();
  const moveAction = action;

  // Get localized options
  const MOVEMENT_TYPE_OPTIONS = useMemo(() => getMovementTypeOptions(), []);
  const FOLLOW_DRAG_OPTIONS = useMemo(() => getFollowDragOptions(), []);
  
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
        <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.lg }}>🏃</span>
        {t('editor.moveAction.title')}
      </h5>

      {/* Movement type selection */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <label style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
          color: DESIGN_TOKENS.colors.success[800],
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'block'
        }}>
          {t('editor.moveAction.movementTypeLabel')}
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          {MOVEMENT_TYPE_OPTIONS.slice(0, 5).map((option) => (
            <ModernButton
              key={option.value}
              variant={moveAction.movement?.type === option.value ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onUpdate(index, { 
                movement: { 
                  ...moveAction.movement,
                  type: option.value as any,
                  target: option.value === 'stop' ? undefined : { x: 0.5, y: 0.5 },
                  speed: option.value === 'teleport' ? undefined : MOVEMENT_DEFAULTS.speed,
                  duration: option.value === 'teleport' ? MOVEMENT_DEFAULTS.teleportDuration : MOVEMENT_DEFAULTS.duration
                } 
              })}
              style={{
                borderColor: moveAction.movement?.type === option.value 
                  ? DESIGN_TOKENS.colors.success[500] 
                  : DESIGN_TOKENS.colors.success[200],
                backgroundColor: moveAction.movement?.type === option.value 
                  ? DESIGN_TOKENS.colors.success[500] 
                  : 'transparent',
                color: moveAction.movement?.type === option.value 
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
        
        {/* Additional movement types (2nd row) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: DESIGN_TOKENS.spacing[2],
          marginTop: DESIGN_TOKENS.spacing[2]
        }}>
          {MOVEMENT_TYPE_OPTIONS.slice(5).map((option) => (
            <ModernButton
              key={option.value}
              variant={moveAction.movement?.type === option.value ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onUpdate(index, { 
                movement: { 
                  ...moveAction.movement,
                  type: option.value as any,
                  target: option.value === 'stop' ? undefined : { x: 0.5, y: 0.5 },
                  speed: option.value === 'teleport' ? undefined : MOVEMENT_DEFAULTS.speed,
                  duration: option.value === 'teleport' ? MOVEMENT_DEFAULTS.teleportDuration : MOVEMENT_DEFAULTS.duration
                } 
              })}
              style={{
                borderColor: moveAction.movement?.type === option.value 
                  ? DESIGN_TOKENS.colors.success[500] 
                  : DESIGN_TOKENS.colors.success[200],
                backgroundColor: moveAction.movement?.type === option.value 
                  ? DESIGN_TOKENS.colors.success[500] 
                  : 'transparent',
                color: moveAction.movement?.type === option.value 
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

      {/* FollowDrag settings (when movement type is 'followDrag') */}
      {moveAction.movement?.type === 'followDrag' && (
        <>
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              {t('editor.moveAction.followDragDampingLabel')}
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
              gap: DESIGN_TOKENS.spacing[2],
              marginBottom: DESIGN_TOKENS.spacing[2]
            }}>
              {FOLLOW_DRAG_OPTIONS.map((option) => (
                <ModernButton
                  key={option.value}
                  variant={moveAction.movement?.damping === option.value ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => onUpdate(index, { 
                    movement: { 
                      ...moveAction.movement,
                      damping: option.value
                    } 
                  })}
                  style={{
                    borderColor: moveAction.movement?.damping === option.value 
                      ? DESIGN_TOKENS.colors.success[500] 
                      : DESIGN_TOKENS.colors.success[200],
                    backgroundColor: moveAction.movement?.damping === option.value 
                      ? DESIGN_TOKENS.colors.success[500] 
                      : 'transparent',
                    color: moveAction.movement?.damping === option.value 
                      ? DESIGN_TOKENS.colors.neutral[0] 
                      : DESIGN_TOKENS.colors.success[800]
                  }}
                >
                  <span>{option.label}</span>
                </ModernButton>
              ))}
            </div>

            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              {t('editor.moveAction.dampingValueLabel', { damping: (moveAction.movement?.damping ?? MOVEMENT_DEFAULTS.damping).toFixed(1) })}
            </label>
            <input
              type="range"
              min={MOVEMENT_RANGES.damping.min}
              max={MOVEMENT_RANGES.damping.max}
              step={MOVEMENT_RANGES.damping.step}
              value={moveAction.movement?.damping ?? MOVEMENT_DEFAULTS.damping}
              onChange={(e) => onUpdate(index, {
                movement: {
                  ...moveAction.movement,
                  damping: parseFloat(e.target.value)
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
              <span>{t('editor.moveAction.highDamping')}</span>
              <span>{t('editor.moveAction.noDamping')}</span>
            </div>
          </div>

          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: DESIGN_TOKENS.spacing[2],
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              color: DESIGN_TOKENS.colors.success[800]
            }}>
              <input
                type="checkbox"
                checked={moveAction.movement?.constrainToBounds ?? false}
                onChange={(e) => onUpdate(index, {
                  movement: {
                    ...moveAction.movement,
                    constrainToBounds: e.target.checked
                  }
                })}
              />
              {t('editor.moveAction.constrainToBoundsLabel')}
            </label>
          </div>

          {moveAction.movement?.constrainToBounds && (
            <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
              <label style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                color: DESIGN_TOKENS.colors.success[800],
                marginBottom: DESIGN_TOKENS.spacing[2],
                display: 'block'
              }}>
                {t('editor.moveAction.boundingBoxLabel')}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: DESIGN_TOKENS.spacing[2] }}>
                <div>
                  <label style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, color: DESIGN_TOKENS.colors.success[700] }}>
                    X最小: {((moveAction.movement?.boundingBox?.minX ?? 0) * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min={MOVEMENT_RANGES.boundingBoxValue.min}
                    max={MOVEMENT_RANGES.boundingBoxValue.max}
                    step={MOVEMENT_RANGES.boundingBoxValue.step}
                    value={moveAction.movement?.boundingBox?.minX ?? 0}
                    onChange={(e) => onUpdate(index, {
                      movement: {
                        ...moveAction.movement,
                        boundingBox: {
                          ...moveAction.movement?.boundingBox,
                          minX: parseFloat(e.target.value)
                        }
                      }
                    })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, color: DESIGN_TOKENS.colors.success[700] }}>
                    X最大: {((moveAction.movement?.boundingBox?.maxX ?? 1) * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min={MOVEMENT_RANGES.boundingBoxValue.min}
                    max={MOVEMENT_RANGES.boundingBoxValue.max}
                    step={MOVEMENT_RANGES.boundingBoxValue.step}
                    value={moveAction.movement?.boundingBox?.maxX ?? 1}
                    onChange={(e) => onUpdate(index, {
                      movement: {
                        ...moveAction.movement,
                        boundingBox: {
                          ...moveAction.movement?.boundingBox,
                          maxX: parseFloat(e.target.value)
                        }
                      }
                    })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, color: DESIGN_TOKENS.colors.success[700] }}>
                    Y最小: {((moveAction.movement?.boundingBox?.minY ?? 0) * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min={MOVEMENT_RANGES.boundingBoxValue.min}
                    max={MOVEMENT_RANGES.boundingBoxValue.max}
                    step={MOVEMENT_RANGES.boundingBoxValue.step}
                    value={moveAction.movement?.boundingBox?.minY ?? 0}
                    onChange={(e) => onUpdate(index, {
                      movement: {
                        ...moveAction.movement,
                        boundingBox: {
                          ...moveAction.movement?.boundingBox,
                          minY: parseFloat(e.target.value)
                        }
                      }
                    })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, color: DESIGN_TOKENS.colors.success[700] }}>
                    Y最大: {((moveAction.movement?.boundingBox?.maxY ?? 1) * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min={MOVEMENT_RANGES.boundingBoxValue.min}
                    max={MOVEMENT_RANGES.boundingBoxValue.max}
                    step={MOVEMENT_RANGES.boundingBoxValue.step}
                    value={moveAction.movement?.boundingBox?.maxY ?? 1}
                    onChange={(e) => onUpdate(index, {
                      movement: {
                        ...moveAction.movement,
                        boundingBox: {
                          ...moveAction.movement?.boundingBox,
                          maxY: parseFloat(e.target.value)
                        }
                      }
                    })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Movement speed setting (for non-stop and non-teleport types) */}
      {moveAction.movement?.type && !['stop', 'teleport', 'followDrag'].includes(moveAction.movement.type) && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.success[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            {t('editor.moveAction.speedLabel', { speed: moveAction.movement?.speed || MOVEMENT_DEFAULTS.speed })}
          </label>
          <input
            type="range"
            min={MOVEMENT_RANGES.speed.min}
            max={MOVEMENT_RANGES.speed.max}
            step={MOVEMENT_RANGES.speed.step}
            value={moveAction.movement?.speed || MOVEMENT_DEFAULTS.speed}
            onChange={(e) => onUpdate(index, { 
              movement: { 
                ...moveAction.movement,
                speed: parseInt(e.target.value) 
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
            <span>{t('editor.moveAction.speedUnit', { speed: MOVEMENT_RANGES.speed.min })}</span>
            <span>{t('editor.moveAction.speedUnit', { speed: MOVEMENT_RANGES.speed.max })}</span>
          </div>
        </div>
      )}

      {/* Movement duration setting (for non-stop types) */}
      {moveAction.movement?.type && !['stop', 'followDrag'].includes(moveAction.movement.type) && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.success[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            {t('editor.moveAction.durationLabel', { seconds: moveAction.movement?.duration || MOVEMENT_DEFAULTS.duration })}
          </label>
          <input
            type="range"
            min={MOVEMENT_RANGES.duration.min}
            max={MOVEMENT_RANGES.duration.max}
            step={MOVEMENT_RANGES.duration.step}
            value={moveAction.movement?.duration || MOVEMENT_DEFAULTS.duration}
            onChange={(e) => onUpdate(index, { 
              movement: { 
                ...moveAction.movement,
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
            <span>{t('editor.moveAction.seconds', { seconds: MOVEMENT_RANGES.duration.min })}</span>
            <span>{t('editor.moveAction.seconds', { seconds: MOVEMENT_RANGES.duration.max })}</span>
          </div>
        </div>
      )}

      {/* Movement target coordinates (for types requiring coordinates) */}
      {moveAction.movement?.type && ['straight', 'teleport', 'approach'].includes(moveAction.movement.type) && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.success[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            {t('editor.moveAction.targetCoordinatesLabel')}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: DESIGN_TOKENS.spacing[2] }}>
            <div>
              <label style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                color: DESIGN_TOKENS.colors.success[800],
                marginBottom: DESIGN_TOKENS.spacing[1],
                display: 'block'
              }}>
                {t('editor.moveAction.xCoordinate', { value: ((moveAction.movement?.target as any)?.x || 0.5).toFixed(2) })}
              </label>
              <input
                type="range"
                min={MOVEMENT_RANGES.coordinates.min}
                max={MOVEMENT_RANGES.coordinates.max}
                step={MOVEMENT_RANGES.coordinates.step}
                value={(moveAction.movement?.target as any)?.x || 0.5}
                onChange={(e) => onUpdate(index, { 
                  movement: { 
                    ...moveAction.movement,
                    target: {
                      x: parseFloat(e.target.value),
                      y: (moveAction.movement?.target as any)?.y || 0.5
                    }
                  } 
                })}
                style={{
                  width: '100%',
                  height: '6px',
                  backgroundColor: DESIGN_TOKENS.colors.success[200],
                  borderRadius: DESIGN_TOKENS.borderRadius.full,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
            </div>
            <div>
              <label style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                color: DESIGN_TOKENS.colors.success[800],
                marginBottom: DESIGN_TOKENS.spacing[1],
                display: 'block'
              }}>
                {t('editor.moveAction.yCoordinate', { value: ((moveAction.movement?.target as any)?.y || 0.5).toFixed(2) })}
              </label>
              <input
                type="range"
                min={MOVEMENT_RANGES.coordinates.min}
                max={MOVEMENT_RANGES.coordinates.max}
                step={MOVEMENT_RANGES.coordinates.step}
                value={(moveAction.movement?.target as any)?.y || 0.5}
                onChange={(e) => onUpdate(index, { 
                  movement: { 
                    ...moveAction.movement,
                    target: {
                      x: (moveAction.movement?.target as any)?.x || 0.5,
                      y: parseFloat(e.target.value)
                    }
                  } 
                })}
                style={{
                  width: '100%',
                  height: '6px',
                  backgroundColor: DESIGN_TOKENS.colors.success[200],
                  borderRadius: DESIGN_TOKENS.borderRadius.full,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Movement preview button */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <ModernButton
          variant="outline"
          size="sm"
          onClick={() => {
            onShowNotification('info', t('editor.moveAction.previewNotice'));
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
          <span>{t('editor.moveAction.previewButton')}</span>
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
        {t('editor.moveAction.settingsSummaryTitle')}
        {moveAction.movement?.type
          ? t('editor.moveAction.movementType', {
              type: MOVEMENT_TYPE_OPTIONS.find(m => m.value === moveAction.movement?.type)?.label || t('editor.moveAction.movementTypeLabel')
            })
          : t('editor.moveAction.selectMovementType')}
        {moveAction.movement?.type && !['stop', 'teleport', 'followDrag'].includes(moveAction.movement.type) &&
          t('editor.moveAction.withSpeed', { speed: moveAction.movement?.speed || MOVEMENT_DEFAULTS.speed })}
        {moveAction.movement?.duration && t('editor.moveAction.forDuration', { seconds: moveAction.movement.duration })}
      </div>
    </ModernCard>
  );
};