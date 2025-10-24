// src/components/editor/script/conditions/AnimationConditionEditor.tsx
// Phase E Step 2: アニメーション条件詳細設定コンポーネント
// CollisionConditionEditor.tsx成功パターン完全踏襲

import React from 'react';
import { TriggerCondition } from '../../../../types/editor/GameScript';
import { GameProject } from '../../../../types/editor/GameProject';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { ModernCard } from '../../../ui/ModernCard';
import { ModernButton } from '../../../ui/ModernButton';
import { 
  ANIMATION_CONDITIONS, 
  ANIMATION_TARGET_OPTIONS,
  FRAME_NUMBER_OPTIONS,
  ANIMATION_INDEX_OPTIONS
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
  const animationCondition = condition;
  
  // プロジェクト内オブジェクト取得
  const projectObjects = project.assets?.objects || [];
  
  // 選択されたオブジェクトのアニメーション情報取得
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
        アニメーション条件詳細設定
      </h5>

      {/* アニメーション対象選択 */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <label style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
          color: DESIGN_TOKENS.colors.purple[800],
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'block'
        }}>
          対象
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          {ANIMATION_TARGET_OPTIONS.map((option) => {
            const isSelected = (
              (option.value === 'background' && animationCondition.target === 'background') ||
              (option.value === 'this' && animationCondition.target !== 'background' && !projectObjects.find(obj => obj.id === animationCondition.target)) ||
              (option.value === 'other' && projectObjects.find(obj => obj.id === animationCondition.target))
            );
            
            return (
              <ModernButton
                key={option.value}
                variant={isSelected ? 'primary' : 'outline'}
                size="sm"
                onClick={() => {
                  let newTarget = animationCondition.target;
                  if (option.value === 'background') {
                    newTarget = 'background';
                  } else if (option.value === 'this') {
                    newTarget = 'self'; // GameScript.ts準拠
                  } else if (option.value === 'other' && projectObjects.length > 0) {
                    newTarget = projectObjects[0].id;
                  }
                  onUpdate(index, { target: newTarget });
                }}
                style={{
                  borderColor: isSelected 
                    ? DESIGN_TOKENS.colors.purple[500] 
                    : DESIGN_TOKENS.colors.purple[200],
                  backgroundColor: isSelected 
                    ? DESIGN_TOKENS.colors.purple[500] 
                    : 'transparent',
                  color: isSelected 
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
            );
          })}
        </div>
      </div>

      {/* 他オブジェクト選択（otherの場合のみ表示） */}
      {animationCondition.target !== 'background' && animationCondition.target !== 'self' && projectObjects.length > 0 && (
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
            value={animationCondition.target}
            onChange={(e) => onUpdate(index, { target: e.target.value })}
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
            {projectObjects.map((obj) => (
              <option key={obj.id} value={obj.id}>
                {obj.name || `オブジェクト${obj.id.slice(-1)}`} ({obj.frames.length}フレーム)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* アニメーション条件選択 */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <label style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
          color: DESIGN_TOKENS.colors.purple[800],
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'block'
        }}>
          発動タイミング
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

      {/* フレーム番号指定（frameの場合のみ表示） */}
      {animationCondition.condition === 'frame' && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.purple[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            対象フレーム番号 (最大{maxFrameNumber}フレーム)
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
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
                  {option.value}
                </span>
              </ModernButton>
            ))}
          </div>
        </div>
      )}

      {/* アニメーション番号指定（複数アニメーションがある場合） */}
      {selectedObjectFrames.length > 1 && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.purple[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            アニメーション番号: {(animationCondition.animationIndex || 0) + 1}
          </label>
          <input
            type="range"
            min="0"
            max={Math.min(7, selectedObjectFrames.length - 1)}
            step="1"
            value={animationCondition.animationIndex || 0}
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
            <span>アニメ1</span>
            <span>アニメ{Math.min(8, selectedObjectFrames.length)}</span>
          </div>
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
        💡 設定内容: {ANIMATION_CONDITIONS.find(c => c.value === animationCondition.condition)?.description}
        {animationCondition.target === 'background' && ' - 背景アニメーション'}
        {animationCondition.target === 'self' && ' - このオブジェクトのアニメーション'}
        {animationCondition.target !== 'background' && animationCondition.target !== 'self' && ` - 「${projectObjects.find(obj => obj.id === animationCondition.target)?.name || animationCondition.target}」のアニメーション`}
        {animationCondition.condition === 'frame' && ` (フレーム${animationCondition.frameNumber || 1})`}
        {(animationCondition.animationIndex || 0) > 0 && ` - アニメ${(animationCondition.animationIndex || 0) + 1}`}
        {selectedObjectFrames.length > 0 && ` (${selectedObjectFrames.length}フレーム利用可能)`}
      </div>
    </ModernCard>
  );
};