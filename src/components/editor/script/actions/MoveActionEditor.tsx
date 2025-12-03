// src/components/editor/script/actions/MoveActionEditor.tsx
// 完全修正版: GameScript.tsの型定義に完全一致
// 修正内容: followDragはGameActionとして別途存在するため、MovementPatternから削除
//          damping, constrainToBounds, boundingBoxはMovementPatternに存在しないため削除

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { GameAction } from '../../../../types/editor/GameScript';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { ModernCard } from '../../../ui/ModernCard';
import { ModernButton } from '../../../ui/ModernButton';
import { 
  getMovementTypeOptions,
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

  // Get localized options - 修正: followDragを除外
  const MOVEMENT_TYPE_OPTIONS = useMemo(() => 
    getMovementTypeOptions().filter(opt => opt.value !== 'followDrag'), 
  []);
  
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

      {/* Movement type selection - 修正: followDragを除外 */}
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
          {MOVEMENT_TYPE_OPTIONS.map((option) => (
            <ModernButton
              key={option.value}
              variant={moveAction.movement?.type === option.value ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onUpdate(index, { 
                movement: { 
                  type: option.value as any,
                  target: option.value === 'stop' ? undefined : { x: 0.5, y: 0.5 },
                  speed: option.value === 'teleport' ? undefined : MOVEMENT_DEFAULTS.speed,
                  duration: MOVEMENT_DEFAULTS.duration
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

      {/* Movement speed setting (for non-stop and non-teleport types) */}
      {moveAction.movement?.type && !['stop', 'teleport'].includes(moveAction.movement.type) && (
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
      {moveAction.movement?.type && !['stop'].includes(moveAction.movement.type) && (
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
            <span>{t('editor.moveAction.seconds', { value: MOVEMENT_RANGES.duration.min })}</span>
            <span>{t('editor.moveAction.seconds', { value: MOVEMENT_RANGES.duration.max })}</span>
          </div>
        </div>
      )}

      {/* Wander radius (when movement type is 'wander') */}
      {moveAction.movement?.type === 'wander' && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.success[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            {t('editor.moveAction.wanderRadiusLabel', { radius: moveAction.movement?.wanderRadius || 100 })}
          </label>
          <input
            type="range"
            min="20"
            max="500"
            step="10"
            value={moveAction.movement?.wanderRadius || 100}
            onChange={(e) => onUpdate(index, {
              movement: {
                ...moveAction.movement,
                wanderRadius: parseInt(e.target.value)
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
            <span>20px</span>
            <span>500px</span>
          </div>
        </div>
      )}

      {/* Orbit radius (when movement type is 'orbit') */}
      {moveAction.movement?.type === 'orbit' && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.success[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            {t('editor.moveAction.orbitRadiusLabel', { radius: moveAction.movement?.orbitRadius || 100 })}
          </label>
          <input
            type="range"
            min="20"
            max="500"
            step="10"
            value={moveAction.movement?.orbitRadius || 100}
            onChange={(e) => onUpdate(index, {
              movement: {
                ...moveAction.movement,
                orbitRadius: parseInt(e.target.value)
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
            <span>20px</span>
            <span>500px</span>
          </div>
        </div>
      )}

      {/* Bounce strength (when movement type is 'bounce') */}
      {moveAction.movement?.type === 'bounce' && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.success[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            {t('editor.moveAction.bounceStrengthLabel', { strength: moveAction.movement?.bounceStrength || 0.8 })}
          </label>
          <input
            type="range"
            min="0.1"
            max="2.0"
            step="0.1"
            value={moveAction.movement?.bounceStrength || 0.8}
            onChange={(e) => onUpdate(index, {
              movement: {
                ...moveAction.movement,
                bounceStrength: parseFloat(e.target.value)
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
            <span>0.1</span>
            <span>2.0</span>
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
                min="0"
                max="1"
                step="0.01"
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
                min="0"
                max="1"
                step="0.01"
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
        {moveAction.movement?.type && !['stop', 'teleport'].includes(moveAction.movement.type) &&
          t('editor.moveAction.withSpeed', { speed: moveAction.movement?.speed || MOVEMENT_DEFAULTS.speed })}
        {moveAction.movement?.duration && t('editor.moveAction.forDuration', { seconds: moveAction.movement.duration })}
      </div>

      {/* ℹ️ Info: followDragについて */}
      <div style={{
        marginTop: DESIGN_TOKENS.spacing[4],
        padding: DESIGN_TOKENS.spacing[3],
        backgroundColor: DESIGN_TOKENS.colors.primary[50],
        border: `1px solid ${DESIGN_TOKENS.colors.primary[200]}`,
        borderRadius: DESIGN_TOKENS.borderRadius.lg,
        fontSize: DESIGN_TOKENS.typography.fontSize.xs,
        color: DESIGN_TOKENS.colors.primary[800]
      }}>
        <strong>ℹ️ ドラッグ追従機能について:</strong>
        <div style={{ marginTop: DESIGN_TOKENS.spacing[2] }}>
          ドラッグ追従機能は別のアクションタイプ「followDrag」として実装されています。
          この機能を使用する場合は、「移動」アクションではなく、アクション一覧から「ドラッグ追従」を選択してください。
        </div>
      </div>
    </ModernCard>
  );
};