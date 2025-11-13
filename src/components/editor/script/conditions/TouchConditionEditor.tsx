// src/components/editor/script/conditions/TouchConditionEditor.tsx
// Phase C Step 1-1完了版: タッチ条件詳細設定コンポーネント
// AdvancedRuleModal.tsx分割 - Step 2: 条件エディター分離

import React from 'react';
import { TriggerCondition } from '../../../../types/editor/GameScript';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { ModernCard } from '../../../ui/ModernCard';
import { ModernButton } from '../../../ui/ModernButton';
import { TOUCH_TYPE_OPTIONS, TOUCH_TARGET_OPTIONS } from '../constants/TouchConstants';

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
  const touchCondition = condition;
  
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
        タッチ条件詳細設定
      </h5>

      {/* タッチタイプ選択 */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <label style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
          color: DESIGN_TOKENS.colors.purple[800],
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'block'
        }}>
          タッチの種類
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

      {/* 長押し時間設定（holdの場合のみ表示） */}
      {touchCondition.touchType === 'hold' && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.purple[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            長押し時間: {touchCondition.holdDuration || 1}秒
          </label>
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.5"
            value={touchCondition.holdDuration || 1}
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
            color: DESIGN_TOKENS.colors.purple[500],
            marginTop: DESIGN_TOKENS.spacing[1]
          }}>
            <span>0.5秒</span>
            <span>5秒</span>
          </div>
        </div>
      )}

      {/* タッチ対象選択 */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <label style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
          color: DESIGN_TOKENS.colors.purple[800],
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'block'
        }}>
          タッチ対象
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
              <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, fontWeight: DESIGN_TOKENS.typography.fontWeight.medium, textAlign: 'center' }}>
                {option.label}
              </span>
            </ModernButton>
          ))}
        </div>
      </div>

      {/* ステージ範囲指定（targetが'stage'の場合のみ表示） */}
      {touchCondition.target === 'stage' && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.purple[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            タッチ範囲指定
          </label>

          {/* 範囲形状選択 */}
          <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[2], marginBottom: DESIGN_TOKENS.spacing[3] }}>
            <ModernButton
              variant={touchCondition.region?.shape === 'rect' || !touchCondition.region ? 'primary' : 'outline'}
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
              🔲 矩形
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
                borderColor: DESIGN_TOKENS.colors.purple[200],
                flex: 1
              }}
            >
              ⭕ 円形
            </ModernButton>
          </div>

          {/* 範囲パラメータ設定 */}
          {touchCondition.region && (
            <div style={{
              backgroundColor: DESIGN_TOKENS.colors.neutral[50],
              padding: DESIGN_TOKENS.spacing[3],
              borderRadius: DESIGN_TOKENS.borderRadius.md,
              display: 'grid',
              gap: DESIGN_TOKENS.spacing[2]
            }}>
              <div>
                <label style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, color: DESIGN_TOKENS.colors.purple[700] }}>
                  中心X: {(touchCondition.region.x * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={touchCondition.region.x}
                  onChange={(e) => onUpdate(index, {
                    region: { ...touchCondition.region!, x: parseFloat(e.target.value) }
                  })}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, color: DESIGN_TOKENS.colors.purple[700] }}>
                  中心Y: {(touchCondition.region.y * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={touchCondition.region.y}
                  onChange={(e) => onUpdate(index, {
                    region: { ...touchCondition.region!, y: parseFloat(e.target.value) }
                  })}
                  style={{ width: '100%' }}
                />
              </div>

              {touchCondition.region.shape === 'rect' ? (
                <>
                  <div>
                    <label style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, color: DESIGN_TOKENS.colors.purple[700] }}>
                      幅: {((touchCondition.region.width || 0.4) * 100).toFixed(0)}%
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
                      高さ: {((touchCondition.region.height || 0.4) * 100).toFixed(0)}%
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
                    半径: {((touchCondition.region.radius || 0.2) * 100).toFixed(0)}%
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
            </div>
          )}
        </div>
      )}

      <div style={{
        padding: DESIGN_TOKENS.spacing[3],
        backgroundColor: DESIGN_TOKENS.colors.purple[100],
        borderRadius: DESIGN_TOKENS.borderRadius.lg,
        fontSize: DESIGN_TOKENS.typography.fontSize.xs,
        color: DESIGN_TOKENS.colors.purple[800]
      }}>
        💡 設定内容: {TOUCH_TYPE_OPTIONS.find(t => t.value === touchCondition.touchType)?.description}
        {touchCondition.touchType === 'hold' && `（${touchCondition.holdDuration || 1}秒間）`}
        {touchCondition.target === 'self' ? ' - このオブジェクトへのタッチ' :
         touchCondition.target === 'stage' ?
           (touchCondition.region ?
             ` - ステージ指定範囲へのタッチ（${touchCondition.region.shape === 'rect' ? '矩形' : '円形'}）` :
             ' - ステージ全体へのタッチ') :
         ' - 指定オブジェクトへのタッチ'}
      </div>
    </ModernCard>
  );
};