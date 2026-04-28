// src/components/editor/script/conditions/TouchConditionEditor.tsx
// Phase 3-2-1最終版: BoundingBoxEditor統合 + 背景画像表示
// ステージ範囲（矩形）をビジュアル設定可能に

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TriggerCondition } from '../../../../types/editor/GameScript';
import { GameProject } from '../../../../types/editor/GameProject';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { ModernCard } from '../../../ui/ModernCard';
import { ModernButton } from '../../../ui/ModernButton';
import { BoundingBoxEditor, BoundingBox } from '../../common/BoundingBoxEditor';
import { 
  getTouchTypeOptions, 
  getTouchTargetOptions
} from '../constants/TouchConstants';

interface TouchConditionEditorProps {
  condition: TriggerCondition & { type: 'touch' };
  index: number;
  project: GameProject;  // 背景画像取得のため追加
  onUpdate: (index: number, updates: Partial<TriggerCondition>) => void;
}

// 4つのステップ定義（順序変更）
type EditorStep = 'touchType' | 'target' | 'detail' | 'confirm';

export const TouchConditionEditor: React.FC<TouchConditionEditorProps> = ({
  condition,
  index,
  project,
  onUpdate
}) => {
  const { t: _t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<EditorStep>('touchType');

  // Get localized options（drag/swipe/flickは除外済み）
  const TOUCH_TYPE_OPTIONS = useMemo(() => getTouchTypeOptions(), []);
  const TOUCH_TARGET_OPTIONS = useMemo(() => getTouchTargetOptions(), []);

  // 背景画像URL取得
  const backgroundUrl = useMemo(() => {
    const background = project.assets.background;
    if (!background || !background.frames || background.frames.length === 0) {
      return undefined;
    }
    return background.frames[0].storageUrl || background.frames[0].dataUrl;
  }, [project.assets.background]);

  // ステップナビゲーション（順序変更）
  const steps = [
    { id: 'touchType', label: 'タッチの種類', icon: '👆' },
    { id: 'target', label: 'タッチの対象', icon: '🎯' },
    { id: 'detail', label: '範囲設定', icon: '📐' },
    { id: 'confirm', label: '確認', icon: '✅' }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  // 🔄 座標変換: BoundingBox → region (rect)
  const boundingBoxToRegion = (bbox: BoundingBox) => {
    const centerX = (bbox.minX + bbox.maxX) / 2;
    const centerY = (bbox.minY + bbox.maxY) / 2;
    const width = bbox.maxX - bbox.minX;
    const height = bbox.maxY - bbox.minY;

    return {
      shape: 'rect' as const,
      x: centerX,
      y: centerY,
      width,
      height
    };
  };

  // 🔄 座標変換: region (rect) → BoundingBox
  const regionToBoundingBox = (region: NonNullable<typeof condition.region>): BoundingBox => {
    const halfWidth = (region.width || 0.4) / 2;
    const halfHeight = (region.height || 0.4) / 2;
    const centerX = region.x || 0.5;
    const centerY = region.y || 0.5;

    return {
      minX: Math.max(0, centerX - halfWidth),
      minY: Math.max(0, centerY - halfHeight),
      maxX: Math.min(1, centerX + halfWidth),
      maxY: Math.min(1, centerY + halfHeight)
    };
  };

  // ステップ1: タッチの種類を選択
  const renderTouchTypeStep = () => (
    <div>
      <h5 style={{
        fontSize: DESIGN_TOKENS.typography.fontSize.lg,
        fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
        color: DESIGN_TOKENS.colors.neutral[800],
        marginBottom: DESIGN_TOKENS.spacing[4]
      }}>
        どんなタッチで発動しますか？
      </h5>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: DESIGN_TOKENS.spacing[3]
      }}>
        {TOUCH_TYPE_OPTIONS.map((option) => (
          <ModernButton
            key={option.value}
            variant={condition.touchType === option.value ? 'primary' : 'outline'}
            size="lg"
            onClick={() => {
              onUpdate(index, { touchType: option.value as any });
              setCurrentStep('target');
            }}
            style={{
              padding: DESIGN_TOKENS.spacing[4],
              flexDirection: 'column',
              alignItems: 'center',
              gap: DESIGN_TOKENS.spacing[2],
              backgroundColor: condition.touchType === option.value 
                ? DESIGN_TOKENS.colors.purple[500] 
                : DESIGN_TOKENS.colors.neutral[0],
              borderColor: condition.touchType === option.value
                ? DESIGN_TOKENS.colors.purple[500]
                : DESIGN_TOKENS.colors.neutral[300],
              color: condition.touchType === option.value
                ? DESIGN_TOKENS.colors.neutral[0]
                : DESIGN_TOKENS.colors.neutral[800]
            }}
          >
            <span style={{ fontSize: '48px' }}>{option.icon}</span>
            <div>
              <div style={{ fontWeight: DESIGN_TOKENS.typography.fontWeight.bold }}>
                {option.label}
              </div>
              <div style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, opacity: 0.8 }}>
                {option.description}
              </div>
            </div>
          </ModernButton>
        ))}
      </div>
    </div>
  );

  // ステップ2: タッチの対象を選択
  const renderTargetStep = () => (
    <div>
      <h5 style={{
        fontSize: DESIGN_TOKENS.typography.fontSize.lg,
        fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
        color: DESIGN_TOKENS.colors.neutral[800],
        marginBottom: DESIGN_TOKENS.spacing[4]
      }}>
        どこをタッチした時に発動しますか？
      </h5>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: DESIGN_TOKENS.spacing[3]
      }}>
        {TOUCH_TARGET_OPTIONS.map((option) => (
          <ModernButton
            key={option.value}
            variant={condition.target === option.value ? 'primary' : 'outline'}
            size="lg"
            onClick={() => {
              onUpdate(index, { target: option.value });
              // stageAreaの場合は詳細設定へ、それ以外は確認へ
              if (option.value === 'stageArea') {
                setCurrentStep('detail');
              } else {
                setCurrentStep('confirm');
              }
            }}
            style={{
              padding: DESIGN_TOKENS.spacing[4],
              flexDirection: 'column',
              alignItems: 'center',
              gap: DESIGN_TOKENS.spacing[2],
              backgroundColor: condition.target === option.value 
                ? DESIGN_TOKENS.colors.purple[500] 
                : DESIGN_TOKENS.colors.neutral[0],
              borderColor: condition.target === option.value
                ? DESIGN_TOKENS.colors.purple[500]
                : DESIGN_TOKENS.colors.neutral[300],
              color: condition.target === option.value
                ? DESIGN_TOKENS.colors.neutral[0]
                : DESIGN_TOKENS.colors.neutral[800]
            }}
          >
            <span style={{ fontSize: '48px' }}>{option.icon}</span>
            <div>
              <div style={{ fontWeight: DESIGN_TOKENS.typography.fontWeight.bold }}>
                {option.label}
              </div>
              <div style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, opacity: 0.8 }}>
                {option.description}
              </div>
            </div>
          </ModernButton>
        ))}
      </div>

      <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[2], marginTop: DESIGN_TOKENS.spacing[4] }}>
        <ModernButton
          variant="outline"
          size="md"
          onClick={() => setCurrentStep('touchType')}
        >
          ← 戻る
        </ModernButton>
      </div>
    </div>
  );

  // ステップ3: 詳細設定（ステージ範囲 - 矩形のみ、円形削除）
  const renderDetailStep = () => {
    // regionが未設定の場合はデフォルト値を設定
    const currentRegion = condition.region || {
      shape: 'rect' as const,
      x: 0.5,
      y: 0.5,
      width: 0.5,
      height: 0.5
    };

    return (
      <div>
        <h5 style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.lg,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
          color: DESIGN_TOKENS.colors.neutral[800],
          marginBottom: DESIGN_TOKENS.spacing[4]
        }}>
          ステージ範囲を設定
        </h5>

        {/* 矩形選択のみ（円形/矩形選択ボタン削除、円形スライダー削除） */}
        {/* 背景画像URL渡す */}
        <BoundingBoxEditor
          value={regionToBoundingBox(currentRegion)}
          onChange={(bbox) => {
            const newRegion = boundingBoxToRegion(bbox);
            onUpdate(index, { region: newRegion });
          }}
          previewBackgroundUrl={backgroundUrl}
        />

        <div style={{ 
          display: 'flex', 
          gap: DESIGN_TOKENS.spacing[2],
          marginTop: DESIGN_TOKENS.spacing[4]
        }}>
          <ModernButton
            variant="outline"
            size="md"
            onClick={() => setCurrentStep('target')}
          >
            ← 戻る
          </ModernButton>
          <ModernButton
            variant="primary"
            size="md"
            onClick={() => setCurrentStep('confirm')}
            style={{ flex: 1 }}
          >
            次へ →
          </ModernButton>
        </div>
      </div>
    );
  };

  // ステップ4: 確認
  const renderConfirmStep = () => {
    const touchTypeLabel = TOUCH_TYPE_OPTIONS.find(t => t.value === condition.touchType)?.label || '未選択';
    const targetLabel = TOUCH_TARGET_OPTIONS.find(t => t.value === condition.target)?.label || '未選択';

    return (
      <div>
        <h5 style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.lg,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
          color: DESIGN_TOKENS.colors.neutral[800],
          marginBottom: DESIGN_TOKENS.spacing[4]
        }}>
          設定内容の確認
        </h5>

        <div style={{
          padding: DESIGN_TOKENS.spacing[4],
          backgroundColor: DESIGN_TOKENS.colors.purple[50],
          border: `2px solid ${DESIGN_TOKENS.colors.purple[200]}`,
          borderRadius: DESIGN_TOKENS.borderRadius.lg,
          marginBottom: DESIGN_TOKENS.spacing[4]
        }}>
          {/* タッチの種類 */}
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
            <div style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.neutral[600],
              marginBottom: DESIGN_TOKENS.spacing[1]
            }}>
              タッチの種類
            </div>
            <div style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.base,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
              color: DESIGN_TOKENS.colors.neutral[800]
            }}>
              {touchTypeLabel}
            </div>
          </div>

          {/* タッチの対象 */}
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
            <div style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.neutral[600],
              marginBottom: DESIGN_TOKENS.spacing[1]
            }}>
              タッチの対象
            </div>
            <div style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.base,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
              color: DESIGN_TOKENS.colors.neutral[800]
            }}>
              {targetLabel}
            </div>
          </div>

          {/* ステージ範囲（stageAreaの場合） */}
          {condition.target === 'stageArea' && condition.region && (
            <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
              <div style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                color: DESIGN_TOKENS.colors.neutral[600],
                marginBottom: DESIGN_TOKENS.spacing[1]
              }}>
                範囲設定
              </div>
              <div style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                color: DESIGN_TOKENS.colors.neutral[700]
              }}>
                ⬜ 矩形 / 
                中心({((condition.region.x || 0.5) * 100).toFixed(0)}%, {((condition.region.y || 0.5) * 100).toFixed(0)}%) / 
                サイズ({((condition.region.width || 0.5) * 100).toFixed(0)}% × {((condition.region.height || 0.5) * 100).toFixed(0)}%)
              </div>
            </div>
          )}
        </div>

        <div style={{ 
          display: 'flex', 
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          <ModernButton
            variant="outline"
            size="md"
            onClick={() => {
              // stageAreaの場合はdetailへ、それ以外はtargetへ
              if (condition.target === 'stageArea') {
                setCurrentStep('detail');
              } else {
                setCurrentStep('target');
              }
            }}
          >
            ← 戻る
          </ModernButton>
          <ModernButton
            variant="primary"
            size="md"
            onClick={() => {
              // 設定完了（何もしない、モーダルが閉じる）
            }}
            style={{ flex: 1 }}
          >
            ✅ 完了
          </ModernButton>
        </div>
      </div>
    );
  };

  return (
    <ModernCard 
      variant="outlined"
      size="md"
      style={{
        backgroundColor: DESIGN_TOKENS.colors.neutral[0],
        border: `2px solid ${DESIGN_TOKENS.colors.purple[300]}`,
        marginTop: DESIGN_TOKENS.spacing[4]
      }}
    >
      {/* ヘッダー */}
      <div style={{
        marginBottom: DESIGN_TOKENS.spacing[6],
        paddingBottom: DESIGN_TOKENS.spacing[4],
        borderBottom: `2px solid ${DESIGN_TOKENS.colors.neutral[200]}`
      }}>
        <h4 style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.xl,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
          color: DESIGN_TOKENS.colors.purple[700],
          margin: 0,
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'flex',
          alignItems: 'center',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize['2xl'] }}>👆</span>
          タッチ条件
        </h4>
        <p style={{
          margin: 0,
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          color: DESIGN_TOKENS.colors.neutral[600]
        }}>
          タッチ操作で条件を満たす設定
        </p>
      </div>

      {/* ステップインジケーター */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: DESIGN_TOKENS.spacing[6],
        position: 'relative'
      }}>
        {/* 進捗バー背景 */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '5%',
          right: '5%',
          height: '4px',
          backgroundColor: DESIGN_TOKENS.colors.neutral[200],
          zIndex: 0
        }} />
        
        {/* 進捗バー前景 */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '5%',
          width: `${(currentStepIndex / (steps.length - 1)) * 90}%`,
          height: '4px',
          backgroundColor: DESIGN_TOKENS.colors.purple[500],
          zIndex: 1,
          transition: 'width 0.3s ease'
        }} />

        {steps.map((step, idx) => (
          <div
            key={step.id}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: DESIGN_TOKENS.spacing[2],
              position: 'relative',
              zIndex: 2
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: DESIGN_TOKENS.borderRadius.full,
              backgroundColor: idx <= currentStepIndex 
                ? DESIGN_TOKENS.colors.purple[500] 
                : DESIGN_TOKENS.colors.neutral[200],
              color: idx <= currentStepIndex 
                ? DESIGN_TOKENS.colors.neutral[0] 
                : DESIGN_TOKENS.colors.neutral[500],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: DESIGN_TOKENS.typography.fontSize.lg,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
              transition: 'all 0.3s ease',
              border: `3px solid ${DESIGN_TOKENS.colors.neutral[0]}`
            }}>
              {step.icon}
            </div>
            <span style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              fontWeight: idx === currentStepIndex 
                ? DESIGN_TOKENS.typography.fontWeight.semibold 
                : DESIGN_TOKENS.typography.fontWeight.normal,
              color: idx <= currentStepIndex 
                ? DESIGN_TOKENS.colors.purple[700] 
                : DESIGN_TOKENS.colors.neutral[500],
              textAlign: 'center'
            }}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* ステップコンテンツ */}
      <div>
        {currentStep === 'touchType' && renderTouchTypeStep()}
        {currentStep === 'target' && renderTargetStep()}
        {currentStep === 'detail' && renderDetailStep()}
        {currentStep === 'confirm' && renderConfirmStep()}
      </div>
    </ModernCard>
  );
};