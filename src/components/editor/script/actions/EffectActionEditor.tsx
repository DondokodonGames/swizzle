// src/components/editor/script/actions/EffectActionEditor.tsx
// Phase C Step 2完了版: エフェクトアクション詳細設定コンポーネント
// AdvancedRuleModal.tsx分割 - Step 3: アクションエディター分離

import React from 'react';
import { GameAction } from '../../../../types/editor/GameScript';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { ModernCard } from '../../../ui/ModernCard';
import { ModernButton } from '../../../ui/ModernButton';
import { EFFECT_TYPE_OPTIONS } from '../constants/EffectConstants';

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
  const effectAction = action;
  
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
        エフェクト詳細設定
      </h5>

      {/* エフェクトタイプ選択 */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <label style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
          color: DESIGN_TOKENS.colors.success[800],
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'block'
        }}>
          エフェクトタイプ
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
                  duration: 1.0,
                  intensity: 0.8
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

      {/* エフェクト強度設定 */}
      {effectAction.effect?.type && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.success[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            エフェクト強度: {Math.round((effectAction.effect?.intensity || 0.8) * 100)}%
          </label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={effectAction.effect?.intensity || 0.8}
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
            <span>10%</span>
            <span>100%</span>
          </div>
        </div>
      )}

      {/* エフェクト持続時間設定 */}
      {effectAction.effect?.type && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.success[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            持続時間: {effectAction.effect?.duration || 1}秒
          </label>
          <input
            type="range"
            min="0.1"
            max="10"
            step="0.1"
            value={effectAction.effect?.duration || 1}
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
            <span>0.1秒</span>
            <span>10秒</span>
          </div>
        </div>
      )}

      {/* エフェクトプレビューボタン */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <ModernButton
          variant="outline"
          size="sm"
          onClick={() => {
            // TODO: Phase C Step 2で実装予定
            onShowNotification('info', 'エフェクトプレビュー機能は今後実装予定です');
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
          <span>エフェクトプレビュー</span>
        </ModernButton>
      </div>

      <div style={{
        padding: DESIGN_TOKENS.spacing[3],
        backgroundColor: DESIGN_TOKENS.colors.success[100],
        borderRadius: DESIGN_TOKENS.borderRadius.lg,
        fontSize: DESIGN_TOKENS.typography.fontSize.xs,
        color: DESIGN_TOKENS.colors.success[800]
      }}>
        💡 設定内容: 
        {effectAction.effect?.type 
          ? `「${EFFECT_TYPE_OPTIONS.find(e => e.value === effectAction.effect?.type)?.label || 'エフェクト'}」`
          : 'エフェクトタイプを選択してください'}
        {effectAction.effect?.intensity && ` - 強度${Math.round(effectAction.effect.intensity * 100)}%`}
        {effectAction.effect?.duration && ` - ${effectAction.effect.duration}秒間`}
      </div>
    </ModernCard>
  );
};