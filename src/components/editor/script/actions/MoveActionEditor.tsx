// src/components/editor/script/actions/MoveActionEditor.tsx
// Phase C Step 2完了版: 移動アクション詳細設定コンポーネント
// AdvancedRuleModal.tsx分割 - Step 3: アクションエディター分離

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { GameAction } from '../../../../types/editor/GameScript';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { ModernCard } from '../../../ui/ModernCard';
import { ModernButton } from '../../../ui/ModernButton';
import { getMovementTypeOptions } from '../constants/MovementConstants';

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

  // Get localized options using getter functions that access i18n
  const MOVEMENT_TYPE_OPTIONS = useMemo(() => getMovementTypeOptions(), []);
  
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

      {/* 移動タイプ選択 */}
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
          {MOVEMENT_TYPE_OPTIONS.slice(0, 4).map((option) => (
            <ModernButton
              key={option.value}
              variant={moveAction.movement?.type === option.value ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onUpdate(index, { 
                movement: { 
                  ...moveAction.movement,
                  type: option.value as any,
                  target: option.value === 'stop' ? undefined : { x: 0.5, y: 0.5 },
                  speed: option.value === 'teleport' ? undefined : 300,
                  duration: option.value === 'teleport' ? 0.1 : 2.0
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
        
        {/* 追加移動タイプ（2行目） */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: DESIGN_TOKENS.spacing[2],
          marginTop: DESIGN_TOKENS.spacing[2]
        }}>
          {MOVEMENT_TYPE_OPTIONS.slice(4).map((option) => (
            <ModernButton
              key={option.value}
              variant={moveAction.movement?.type === option.value ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onUpdate(index, { 
                movement: { 
                  ...moveAction.movement,
                  type: option.value as any,
                  target: option.value === 'stop' ? undefined : { x: 0.5, y: 0.5 },
                  speed: option.value === 'teleport' ? undefined : 300,
                  duration: option.value === 'teleport' ? 0.1 : 2.0
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

      {/* 移動速度設定（stopとteleport以外） */}
      {moveAction.movement?.type && !['stop', 'teleport'].includes(moveAction.movement.type) && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.success[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            {t('editor.moveAction.speedLabel', { speed: moveAction.movement?.speed || 300 })}
          </label>
          <input
            type="range"
            min="50"
            max="1000"
            step="50"
            value={moveAction.movement?.speed || 300}
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
            <span>{t('editor.moveAction.speedUnit', { speed: 50 })}</span>
            <span>{t('editor.moveAction.speedUnit', { speed: 1000 })}</span>
          </div>
        </div>
      )}

      {/* 移動時間設定（stopとstraight以外） */}
      {moveAction.movement?.type && !['stop'].includes(moveAction.movement.type) && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.success[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            {t('editor.moveAction.durationLabel', { seconds: moveAction.movement?.duration || 2 })}
          </label>
          <input
            type="range"
            min="0.1"
            max="10"
            step="0.1"
            value={moveAction.movement?.duration || 2}
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
            <span>{t('editor.moveAction.seconds', { seconds: 0.1 })}</span>
            <span>{t('editor.moveAction.seconds', { seconds: 10 })}</span>
          </div>
        </div>
      )}

      {/* 移動座標設定（座標指定が必要なタイプ） */}
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

      {/* 移動プレビューボタン */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <ModernButton
          variant="outline"
          size="sm"
          onClick={() => {
            // TODO: Phase C Step 2で実装予定
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
          t('editor.moveAction.withSpeed', { speed: moveAction.movement?.speed || 300 })}
        {moveAction.movement?.duration && t('editor.moveAction.forDuration', { seconds: moveAction.movement.duration })}
      </div>
    </ModernCard>
  );
};