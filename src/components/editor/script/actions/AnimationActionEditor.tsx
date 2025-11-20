// src/components/editor/script/actions/AnimationActionEditor.tsx
// Phase E Step 3修正版: TypeScriptエラー解決・GameScript.ts型定義完全準拠
// SoundActionEditor.tsx + ShowHideActionEditor.tsx成功パターン完全踏襲

import React from 'react';
import { useTranslation } from 'react-i18next';
import { GameAction } from '../../../../types/editor/GameScript';
import { GameProject } from '../../../../types/editor/GameProject';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { ModernCard } from '../../../ui/ModernCard';
import { ModernButton } from '../../../ui/ModernButton';
import {
  ANIMATION_INDEX_OPTIONS
} from '../constants/AnimationConstants';

interface AnimationActionEditorProps {
  action: GameAction & { type: 'switchAnimation' };
  index: number;
  project: GameProject;
  onUpdate: (index: number, updates: Partial<GameAction>) => void;
  onShowNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const AnimationActionEditor: React.FC<AnimationActionEditorProps> = ({
  action,
  index,
  project,
  onUpdate,
  onShowNotification
}) => {
  const { t } = useTranslation();
  const animationAction = action;
  
  // プロジェクト内オブジェクト取得
  const projectObjects = project.assets?.objects || [];
  
  // 選択されたオブジェクトのアニメーション情報取得
  const getSelectedObjectAnimations = () => {
    const targetObject = projectObjects.find(obj => obj.id === animationAction.targetId);
    return targetObject?.frames || [];
  };
  
  const selectedObjectFrames = getSelectedObjectAnimations();
  const maxAnimationIndex = Math.max(0, selectedObjectFrames.length - 1);
  const availableAnimationOptions = ANIMATION_INDEX_OPTIONS.slice(0, selectedObjectFrames.length);
  
  // 選択されたオブジェクト情報
  const selectedObject = projectObjects.find(obj => obj.id === animationAction.targetId);
  
  return (
    <ModernCard 
      variant="outlined" 
      size="md"
      style={{ 
        backgroundColor: DESIGN_TOKENS.colors.purple[50],
        border: `2px solid ${DESIGN_TOKENS.colors.purple[200]}`,
        marginTop: DESIGN_TOKENS.spacing[3]
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
        {t('editor.animationAction.title')}
      </h5>

      {/* オブジェクト選択 */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <label style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
          color: DESIGN_TOKENS.colors.purple[800],
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'block'
        }}>
          {t('editor.animationAction.targetObjectLabel')}
        </label>
        <select
          value={animationAction.targetId || ''}
          onChange={(e) => {
            onUpdate(index, {
              targetId: e.target.value,
              // オブジェクト変更時はアニメーション番号をリセット
              animationIndex: 0
            });
            if (e.target.value) {
              const obj = projectObjects.find(o => o.id === e.target.value);
              onShowNotification('success', t('editor.animationAction.objectSelected', { name: obj?.name || 'Object' }));
            }
          }}
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
          <option value="">{t('editor.animationAction.selectObjectPlaceholder')}</option>
          {projectObjects.map((obj) => (
            <option key={obj.id} value={obj.id}>
              {obj.name || `Object${obj.id.slice(-1)}`} ({t('editor.animationAction.animationsCount', { count: obj.frames.length })})
            </option>
          ))}
        </select>

        {/* 選択オブジェクト情報表示 */}
        {selectedObject && (
          <div style={{
            marginTop: DESIGN_TOKENS.spacing[2],
            padding: DESIGN_TOKENS.spacing[2],
            backgroundColor: DESIGN_TOKENS.colors.purple[100],
            borderRadius: DESIGN_TOKENS.borderRadius.lg,
            fontSize: DESIGN_TOKENS.typography.fontSize.xs,
            color: DESIGN_TOKENS.colors.purple[800]
          }}>
            🎯 {t('editor.animationAction.selectedPrefix')} 「{selectedObject.name || 'Object'}」
            - {t('editor.animationAction.animationsAvailable', { count: selectedObject.frames.length })}
          </div>
        )}
      </div>

      {/* アニメーション番号選択（オブジェクト選択済みの場合のみ表示） */}
      {animationAction.targetId && selectedObjectFrames.length > 0 && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.purple[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            {t('editor.animationAction.switchToAnimationLabel')} {availableAnimationOptions[(animationAction.animationIndex || 0)]?.label || t('editor.animationAction.animationLabel', { number: 1 })}
          </label>

          {/* スライダー制御 */}
          <input
            type="range"
            min="0"
            max={maxAnimationIndex}
            step="1"
            value={animationAction.animationIndex || 0}
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
            color: DESIGN_TOKENS.colors.purple[600],
            marginTop: DESIGN_TOKENS.spacing[1]
          }}>
            <span>{t('editor.animationAction.animationLabel', { number: 1 })}</span>
            <span>{t('editor.animationAction.animationLabel', { number: selectedObjectFrames.length })}</span>
          </div>

          {/* アニメーション選択ボタン（4個以下の場合のみ表示） */}
          {selectedObjectFrames.length <= 4 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: DESIGN_TOKENS.spacing[2],
              marginTop: DESIGN_TOKENS.spacing[3]
            }}>
              {availableAnimationOptions.map((option) => (
                <ModernButton
                  key={option.value}
                  variant={(animationAction.animationIndex || 0) === option.value ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => onUpdate(index, { animationIndex: option.value })}
                  style={{
                    borderColor: (animationAction.animationIndex || 0) === option.value 
                      ? DESIGN_TOKENS.colors.purple[500] 
                      : DESIGN_TOKENS.colors.purple[200],
                    backgroundColor: (animationAction.animationIndex || 0) === option.value 
                      ? DESIGN_TOKENS.colors.purple[500] 
                      : 'transparent',
                    color: (animationAction.animationIndex || 0) === option.value 
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
          )}
        </div>
      )}

      {/* アニメーション速度設定 */}
      {animationAction.targetId && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.purple[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            {t('editor.animationAction.speedLabel', { speed: animationAction.speed || 12 })}
          </label>
          <input
            type="range"
            min="1"
            max="60"
            step="1"
            value={animationAction.speed || 12}
            onChange={(e) => onUpdate(index, { speed: parseInt(e.target.value) })}
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
            <span>{t('editor.animationAction.lowSpeed', { fps: 1 })}</span>
            <span>{t('editor.animationAction.highSpeed', { fps: 60 })}</span>
          </div>

          {/* 速度プリセット */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
            gap: DESIGN_TOKENS.spacing[2],
            marginTop: DESIGN_TOKENS.spacing[2]
          }}>
            {[
              { value: 6, label: t('editor.animationAction.speedPresets.slow'), icon: '🐌' },
              { value: 12, label: t('editor.animationAction.speedPresets.normal'), icon: '🚶' },
              { value: 24, label: t('editor.animationAction.speedPresets.fast'), icon: '🏃' },
              { value: 48, label: t('editor.animationAction.speedPresets.veryFast'), icon: '⚡' }
            ].map((preset) => (
              <ModernButton
                key={preset.value}
                variant={(animationAction.speed || 12) === preset.value ? 'primary' : 'outline'}
                size="xs"
                onClick={() => onUpdate(index, { speed: preset.value })}
                style={{
                  borderColor: (animationAction.speed || 12) === preset.value 
                    ? DESIGN_TOKENS.colors.purple[500] 
                    : DESIGN_TOKENS.colors.purple[200],
                  backgroundColor: (animationAction.speed || 12) === preset.value 
                    ? DESIGN_TOKENS.colors.purple[500] 
                    : 'transparent',
                  color: (animationAction.speed || 12) === preset.value 
                    ? DESIGN_TOKENS.colors.neutral[0] 
                    : DESIGN_TOKENS.colors.purple[800],
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[2]}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: DESIGN_TOKENS.spacing[1]
                }}
              >
                <span>{preset.icon}</span>
                <span>{preset.label}</span>
              </ModernButton>
            ))}
          </div>
        </div>
      )}

      {/* 将来実装予定の詳細オプション（TypeScript型エラー回避のため一時的に非表示） */}
      {animationAction.targetId && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <div style={{
            padding: DESIGN_TOKENS.spacing[3],
            backgroundColor: DESIGN_TOKENS.colors.purple[100],
            borderRadius: DESIGN_TOKENS.borderRadius.lg,
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            color: DESIGN_TOKENS.colors.purple[800]
          }}>
            💡 {t('editor.animationAction.futureOptionsTitle')}
            <br />• {t('editor.animationAction.futureOptionsLoop')}
            <br />• {t('editor.animationAction.futureOptionsAutoStart')}
            <br />• {t('editor.animationAction.futureOptionsStartFrame')}
            <br />※ {t('editor.animationAction.futureOptionsNote')}
          </div>
        </div>
      )}

      {/* プレビューボタン */}
      {animationAction.targetId && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <ModernButton
            variant="outline"
            size="sm"
            onClick={() => {
              // TODO: Phase E Step 4で実装予定
              onShowNotification('info', t('editor.animationAction.previewNotice'));
            }}
            style={{
              borderColor: DESIGN_TOKENS.colors.purple[200],
              color: DESIGN_TOKENS.colors.purple[600],
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: DESIGN_TOKENS.spacing[2]
            }}
          >
            <span>🎬</span>
            <span>{t('editor.animationAction.previewButton')}</span>
          </ModernButton>
        </div>
      )}

      {/* 設定内容要約表示（TypeScript型定義準拠版） */}
      <div style={{
        padding: DESIGN_TOKENS.spacing[3],
        backgroundColor: DESIGN_TOKENS.colors.purple[100],
        borderRadius: DESIGN_TOKENS.borderRadius.lg,
        fontSize: DESIGN_TOKENS.typography.fontSize.xs,
        color: DESIGN_TOKENS.colors.purple[800]
      }}>
        💡 {t('editor.animationAction.settingsSummaryTitle')}
        {animationAction.targetId ? (
          <>
            「{selectedObject?.name || animationAction.targetId}」{t('editor.animationAction.switchToAnimation', { index: (animationAction.animationIndex || 0) + 1 })}
            {animationAction.speed && t('editor.animationAction.withSpeed', { speed: animationAction.speed })}
          </>
        ) : (
          t('editor.animationAction.pleaseSelectObject')
        )}
      </div>
    </ModernCard>
  );
};