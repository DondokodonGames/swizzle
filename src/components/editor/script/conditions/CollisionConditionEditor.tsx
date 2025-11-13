// src/components/editor/script/conditions/CollisionConditionEditor.tsx
// Phase D Step 1-2修正版: TypeScriptエラー解決・GameScript.ts型定義準拠
// TouchConditionEditor.tsx成功パターン完全踏襲

import React from 'react';
import { TriggerCondition } from '../../../../types/editor/GameScript';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { ModernCard } from '../../../ui/ModernCard';
import { ModernButton } from '../../../ui/ModernButton';
import { 
  COLLISION_TYPE_OPTIONS, 
  COLLISION_TARGET_OPTIONS, 
  COLLISION_CHECK_OPTIONS 
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
  const collisionCondition = condition;
  
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
        衝突条件詳細設定
      </h5>

      {/* 衝突タイプ選択 */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <label style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
          color: DESIGN_TOKENS.colors.purple[800],
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'block'
        }}>
          衝突の種類
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

      {/* 衝突対象選択 */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <label style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
          color: DESIGN_TOKENS.colors.purple[800],
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'block'
        }}>
          衝突対象
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

      {/* 判定方式選択 */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <label style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
          color: DESIGN_TOKENS.colors.purple[800],
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'block'
        }}>
          判定方式
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

      {/* ステージ範囲指定（targetが'stage'の場合のみ表示） */}
      {collisionCondition.target === 'stage' && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.purple[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            衝突判定範囲指定
          </label>

          {/* 範囲形状選択 */}
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
              🔲 矩形
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
              ⭕ 円形
            </ModernButton>
          </div>

          {/* 範囲パラメータ設定 */}
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
                  中心X: {(collisionCondition.region.x * 100).toFixed(0)}%
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
                  中心Y: {(collisionCondition.region.y * 100).toFixed(0)}%
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
                      幅: {((collisionCondition.region.width || 0.4) * 100).toFixed(0)}%
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
                      高さ: {((collisionCondition.region.height || 0.4) * 100).toFixed(0)}%
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
                    半径: {((collisionCondition.region.radius || 0.2) * 100).toFixed(0)}%
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

      {/* 対象オブジェクト選択（他オブジェクトを指定する場合の修正版） */}
      {collisionCondition.target !== 'background' && collisionCondition.target !== 'stage' && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.purple[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            対象オブジェクト
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
            <option value="">オブジェクトを選択</option>
            {/* TODO: プロジェクト内オブジェクト一覧から選択 */}
            <option value="character">キャラクター</option>
            <option value="item">アイテム</option>
            <option value="obstacle">障害物</option>
          </select>
        </div>
      )}

      {/* 設定内容要約表示 */}
      <div style={{
        padding: DESIGN_TOKENS.spacing[3],
        backgroundColor: DESIGN_TOKENS.colors.purple[100],
        borderRadius: DESIGN_TOKENS.borderRadius.lg,
        fontSize: DESIGN_TOKENS.typography.fontSize.xs,
        color: DESIGN_TOKENS.colors.purple[800]
      }}>
        💡 設定内容: {COLLISION_TYPE_OPTIONS.find(t => t.value === collisionCondition.collisionType)?.description}
        {collisionCondition.target === 'background' && ' - 背景との衝突'}
        {collisionCondition.target === 'stage' &&
          (collisionCondition.region ?
            ` - ステージ指定範囲への衝突（${collisionCondition.region.shape === 'rect' ? '矩形' : '円形'}）` :
            ' - ステージ端との衝突')}
        {collisionCondition.target !== 'background' && collisionCondition.target !== 'stage' && ` - 「${collisionCondition.target}」との衝突`}
        {` - ${COLLISION_CHECK_OPTIONS.find(c => c.value === collisionCondition.checkMode)?.label}使用`}
      </div>
    </ModernCard>
  );
};