// src/components/editor/script/conditions/ObjectStateConditionEditor.tsx
// オブジェクト状態条件エディター（Phase 2拡張版）
// AnimationConditionEditor の機能を完全統合
// start/end/frame/playing/stopped/loop/frameRange 全対応

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TriggerCondition } from '../../../../types/editor/GameScript';
import { GameProject } from '../../../../types/editor/GameProject';
import { ObjectAsset } from '../../../../types/editor/ProjectAssets';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { ModernCard } from '../../../ui/ModernCard';
import { ModernButton } from '../../../ui/ModernButton';

interface ObjectStateConditionEditorProps {
  condition: TriggerCondition & { type: 'objectState' };
  project: GameProject;
  index: number;
  onUpdate: (index: number, updates: Partial<TriggerCondition>) => void;
}

// 4つのステップ定義
type EditorStep = 'stateType' | 'target' | 'detail' | 'confirm';

// ✅ Phase 2: アニメーション条件タイプの定義（AnimationConditionEditorから統合）
type AnimationConditionType = 'start' | 'end' | 'frame' | 'playing' | 'stopped' | 'loop' | 'frameRange';

export const ObjectStateConditionEditor: React.FC<ObjectStateConditionEditorProps> = ({
  condition,
  project,
  index,
  onUpdate
}) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<EditorStep>('stateType');

  // オブジェクトリスト取得
  const objects = useMemo(() => {
    return project.assets.objects || [];
  }, [project.assets.objects]);

  // 選択中のオブジェクト
  const selectedObject = useMemo(() => {
    if (!condition.target) return null;
    return objects.find((obj: ObjectAsset) => obj.id === condition.target) || null;
  }, [condition.target, objects]);

  // ✅ Phase 2: 選択中のオブジェクトのフレーム数
  const maxFrameNumber = useMemo(() => {
    if (!selectedObject) return 1;
    return Math.max(1, selectedObject.frames?.length || 1);
  }, [selectedObject]);

  // ステップナビゲーション
  const steps = [
    { id: 'stateType', label: '状態タイプ選択', icon: '🎭' },
    { id: 'target', label: 'オブジェクト選択', icon: '🎯' },
    { id: 'detail', label: '詳細設定', icon: '⚙️' },
    { id: 'confirm', label: '確認', icon: '✅' }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  // ✅ Phase 2: アニメーション条件オプション（AnimationConditionEditorから統合）
  const ANIMATION_CONDITIONS = [
    { value: 'start' as AnimationConditionType, label: '開始時', icon: '▶️', description: 'アニメーション開始時' },
    { value: 'end' as AnimationConditionType, label: '終了時', icon: '⏹️', description: 'アニメーション終了時' },
    { value: 'frame' as AnimationConditionType, label: 'フレーム到達', icon: '🎞️', description: '特定フレーム到達時' },
    { value: 'playing' as AnimationConditionType, label: '再生中', icon: '▶️', description: 'アニメーション再生中' },
    { value: 'stopped' as AnimationConditionType, label: '停止中', icon: '⏸️', description: 'アニメーション停止中' },
    { value: 'loop' as AnimationConditionType, label: 'ループ回数', icon: '🔄', description: '指定回数ループ時' },
    { value: 'frameRange' as AnimationConditionType, label: 'フレーム範囲', icon: '📏', description: 'フレーム範囲内' }
  ];

  // ステップ1: 状態タイプ選択
  const renderStateTypeStep = () => (
    <div>
      <h5 style={{
        fontSize: DESIGN_TOKENS.typography.fontSize.lg,
        fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
        color: DESIGN_TOKENS.colors.neutral[800],
        marginBottom: DESIGN_TOKENS.spacing[4]
      }}>
        どの状態をチェックしますか？
      </h5>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: DESIGN_TOKENS.spacing[3]
      }}>
        {/* visible状態 */}
        <ModernButton
          variant={condition.stateType === 'visible' ? 'primary' : 'outline'}
          size="lg"
          onClick={() => {
            onUpdate(index, { stateType: 'visible' });
            setCurrentStep('target');
          }}
          style={{
            padding: DESIGN_TOKENS.spacing[4],
            flexDirection: 'column',
            alignItems: 'center',
            gap: DESIGN_TOKENS.spacing[2],
            backgroundColor: condition.stateType === 'visible' 
              ? DESIGN_TOKENS.colors.primary[500] 
              : DESIGN_TOKENS.colors.neutral[0],
            borderColor: condition.stateType === 'visible'
              ? DESIGN_TOKENS.colors.primary[500]
              : DESIGN_TOKENS.colors.neutral[300],
            color: condition.stateType === 'visible'
              ? DESIGN_TOKENS.colors.neutral[0]
              : DESIGN_TOKENS.colors.neutral[800]
          }}
        >
          <span style={{ fontSize: '48px' }}>👁️</span>
          <div>
            <div style={{ fontWeight: DESIGN_TOKENS.typography.fontWeight.bold }}>表示状態</div>
            <div style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, opacity: 0.8 }}>
              オブジェクトが表示されているか
            </div>
          </div>
        </ModernButton>

        {/* hidden状態 */}
        <ModernButton
          variant={condition.stateType === 'hidden' ? 'primary' : 'outline'}
          size="lg"
          onClick={() => {
            onUpdate(index, { stateType: 'hidden' });
            setCurrentStep('target');
          }}
          style={{
            padding: DESIGN_TOKENS.spacing[4],
            flexDirection: 'column',
            alignItems: 'center',
            gap: DESIGN_TOKENS.spacing[2],
            backgroundColor: condition.stateType === 'hidden' 
              ? DESIGN_TOKENS.colors.primary[500] 
              : DESIGN_TOKENS.colors.neutral[0],
            borderColor: condition.stateType === 'hidden'
              ? DESIGN_TOKENS.colors.primary[500]
              : DESIGN_TOKENS.colors.neutral[300],
            color: condition.stateType === 'hidden'
              ? DESIGN_TOKENS.colors.neutral[0]
              : DESIGN_TOKENS.colors.neutral[800]
          }}
        >
          <span style={{ fontSize: '48px' }}>🙈</span>
          <div>
            <div style={{ fontWeight: DESIGN_TOKENS.typography.fontWeight.bold }}>非表示状態</div>
            <div style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, opacity: 0.8 }}>
              オブジェクトが非表示か
            </div>
          </div>
        </ModernButton>

        {/* animation状態 */}
        <ModernButton
          variant={condition.stateType === 'animation' ? 'primary' : 'outline'}
          size="lg"
          onClick={() => {
            onUpdate(index, { stateType: 'animation' });
            setCurrentStep('target');
          }}
          style={{
            padding: DESIGN_TOKENS.spacing[4],
            flexDirection: 'column',
            alignItems: 'center',
            gap: DESIGN_TOKENS.spacing[2],
            backgroundColor: condition.stateType === 'animation' 
              ? DESIGN_TOKENS.colors.primary[500] 
              : DESIGN_TOKENS.colors.neutral[0],
            borderColor: condition.stateType === 'animation'
              ? DESIGN_TOKENS.colors.primary[500]
              : DESIGN_TOKENS.colors.neutral[300],
            color: condition.stateType === 'animation'
              ? DESIGN_TOKENS.colors.neutral[0]
              : DESIGN_TOKENS.colors.neutral[800]
          }}
        >
          <span style={{ fontSize: '48px' }}>🎬</span>
          <div>
            <div style={{ fontWeight: DESIGN_TOKENS.typography.fontWeight.bold }}>アニメーション状態</div>
            <div style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, opacity: 0.8 }}>
              アニメーション再生状態
            </div>
          </div>
        </ModernButton>
      </div>
    </div>
  );

  // ステップ2: オブジェクト選択
  const renderTargetStep = () => (
    <div>
      <h5 style={{
        fontSize: DESIGN_TOKENS.typography.fontSize.lg,
        fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
        color: DESIGN_TOKENS.colors.neutral[800],
        marginBottom: DESIGN_TOKENS.spacing[4]
      }}>
        どのオブジェクトをチェックしますか？
      </h5>

      {objects.length === 0 ? (
        <div style={{
          padding: DESIGN_TOKENS.spacing[6],
          textAlign: 'center',
          color: DESIGN_TOKENS.colors.neutral[500],
          backgroundColor: DESIGN_TOKENS.colors.neutral[50],
          borderRadius: DESIGN_TOKENS.borderRadius.lg
        }}>
          オブジェクトが登録されていません
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: DESIGN_TOKENS.spacing[3],
          marginBottom: DESIGN_TOKENS.spacing[4]
        }}>
          {objects.map((obj: ObjectAsset) => (
            <ModernButton
              key={obj.id}
              variant={condition.target === obj.id ? 'primary' : 'outline'}
              size="md"
              onClick={() => {
                onUpdate(index, { target: obj.id });
                setCurrentStep('detail');
              }}
              style={{
                padding: DESIGN_TOKENS.spacing[3],
                flexDirection: 'column',
                alignItems: 'center',
                gap: DESIGN_TOKENS.spacing[2],
                backgroundColor: condition.target === obj.id 
                  ? DESIGN_TOKENS.colors.primary[500] 
                  : DESIGN_TOKENS.colors.neutral[0],
                borderColor: condition.target === obj.id
                  ? DESIGN_TOKENS.colors.primary[500]
                  : DESIGN_TOKENS.colors.neutral[300],
                color: condition.target === obj.id
                  ? DESIGN_TOKENS.colors.neutral[0]
                  : DESIGN_TOKENS.colors.neutral[800]
              }}
            >
              {obj.frames && (obj.frames[0]?.storageUrl || obj.frames[0]?.dataUrl) ? (
                <img
                  src={obj.frames[0]?.storageUrl || obj.frames[0]?.dataUrl}
                  alt={obj.name}
                  style={{
                    width: '64px',
                    height: '64px',
                    objectFit: 'contain',
                    borderRadius: DESIGN_TOKENS.borderRadius.md
                  }}
                />
              ) : (
                <div style={{
                  width: '64px',
                  height: '64px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: DESIGN_TOKENS.colors.neutral[100],
                  borderRadius: DESIGN_TOKENS.borderRadius.md,
                  fontSize: DESIGN_TOKENS.typography.fontSize.xl
                }}>
                  🎨
                </div>
              )}
              <span style={{ 
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.medium
              }}>
                {obj.name}
              </span>
            </ModernButton>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[2] }}>
        <ModernButton
          variant="outline"
          size="md"
          onClick={() => setCurrentStep('stateType')}
        >
          ← 戻る
        </ModernButton>
      </div>
    </div>
  );

  // ステップ3: 詳細設定
  const renderDetailStep = () => {
    if (!condition.stateType) return null;

    return (
      <div>
        <h5 style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.lg,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
          color: DESIGN_TOKENS.colors.neutral[800],
          marginBottom: DESIGN_TOKENS.spacing[4]
        }}>
          詳細設定
        </h5>

        {/* visible/hidden - 追加設定なし */}
        {(condition.stateType === 'visible' || condition.stateType === 'hidden') && (
          <div style={{
            padding: DESIGN_TOKENS.spacing[4],
            backgroundColor: DESIGN_TOKENS.colors.neutral[50],
            borderRadius: DESIGN_TOKENS.borderRadius.lg,
            marginBottom: DESIGN_TOKENS.spacing[4]
          }}>
            <p style={{ 
              margin: 0,
              color: DESIGN_TOKENS.colors.neutral[600],
              fontSize: DESIGN_TOKENS.typography.fontSize.sm
            }}>
              {condition.stateType === 'visible' 
                ? 'オブジェクトが表示されているときに条件を満たします'
                : 'オブジェクトが非表示のときに条件を満たします'}
            </p>
          </div>
        )}

        {/* ✅ Phase 2: animation - 拡張された詳細設定 */}
        {condition.stateType === 'animation' && (
          <div>
            {/* アニメーション条件タイプ選択 */}
            <label style={{
              display: 'block',
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.neutral[700],
              marginBottom: DESIGN_TOKENS.spacing[2]
            }}>
              アニメーション条件タイプ
            </label>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: DESIGN_TOKENS.spacing[2],
              marginBottom: DESIGN_TOKENS.spacing[4]
            }}>
              {ANIMATION_CONDITIONS.map((option) => (
                <ModernButton
                  key={option.value}
                  variant={condition.condition === option.value ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => onUpdate(index, { condition: option.value })}
                  style={{
                    padding: DESIGN_TOKENS.spacing[2],
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: DESIGN_TOKENS.spacing[1],
                    backgroundColor: condition.condition === option.value 
                      ? DESIGN_TOKENS.colors.primary[500] 
                      : DESIGN_TOKENS.colors.neutral[0],
                    borderColor: condition.condition === option.value
                      ? DESIGN_TOKENS.colors.primary[500]
                      : DESIGN_TOKENS.colors.neutral[300],
                    color: condition.condition === option.value
                      ? DESIGN_TOKENS.colors.neutral[0]
                      : DESIGN_TOKENS.colors.neutral[800]
                  }}
                  title={option.description}
                >
                  <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.base }}>{option.icon}</span>
                  <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, fontWeight: DESIGN_TOKENS.typography.fontWeight.medium }}>
                    {option.label}
                  </span>
                </ModernButton>
              ))}
            </div>

            {/* フレーム番号指定（frame条件の場合） */}
            {condition.condition === 'frame' && selectedObject && (
              <div style={{
                padding: DESIGN_TOKENS.spacing[3],
                backgroundColor: DESIGN_TOKENS.colors.neutral[50],
                borderRadius: DESIGN_TOKENS.borderRadius.md,
                marginBottom: DESIGN_TOKENS.spacing[3]
              }}>
                <label style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  color: DESIGN_TOKENS.colors.neutral[700],
                  display: 'block',
                  marginBottom: DESIGN_TOKENS.spacing[2]
                }}>
                  フレーム番号: {condition.frameNumber ?? 0}
                </label>
                <input
                  type="range"
                  min="0"
                  max={maxFrameNumber - 1}
                  value={condition.frameNumber ?? 0}
                  onChange={(e) => onUpdate(index, { frameNumber: parseInt(e.target.value) })}
                  style={{ width: '100%' }}
                />
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.neutral[500],
                  marginTop: DESIGN_TOKENS.spacing[1]
                }}>
                  <span>0</span>
                  <span>{maxFrameNumber - 1}</span>
                </div>
              </div>
            )}

            {/* フレーム範囲指定（frameRange条件の場合） */}
            {condition.condition === 'frameRange' && selectedObject && (
              <div style={{
                padding: DESIGN_TOKENS.spacing[3],
                backgroundColor: DESIGN_TOKENS.colors.neutral[50],
                borderRadius: DESIGN_TOKENS.borderRadius.md,
                marginBottom: DESIGN_TOKENS.spacing[3]
              }}>
                <label style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  color: DESIGN_TOKENS.colors.neutral[700],
                  display: 'block',
                  marginBottom: DESIGN_TOKENS.spacing[2]
                }}>
                  フレーム範囲
                </label>
                
                <div style={{ marginBottom: DESIGN_TOKENS.spacing[2] }}>
                  <label style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                    color: DESIGN_TOKENS.colors.neutral[600],
                    display: 'block',
                    marginBottom: DESIGN_TOKENS.spacing[1]
                  }}>
                    開始フレーム: {condition.frameRange?.[0] ?? 0}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={maxFrameNumber - 1}
                    value={condition.frameRange?.[0] ?? 0}
                    onChange={(e) => onUpdate(index, {
                      frameRange: [parseInt(e.target.value), condition.frameRange?.[1] ?? 1] as [number, number]
                    })}
                    style={{ width: '100%' }}
                  />
                </div>
                
                <div>
                  <label style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                    color: DESIGN_TOKENS.colors.neutral[600],
                    display: 'block',
                    marginBottom: DESIGN_TOKENS.spacing[1]
                  }}>
                    終了フレーム: {condition.frameRange?.[1] ?? 1}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={maxFrameNumber - 1}
                    value={condition.frameRange?.[1] ?? 1}
                    onChange={(e) => onUpdate(index, {
                      frameRange: [condition.frameRange?.[0] ?? 0, parseInt(e.target.value)] as [number, number]
                    })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.neutral[500],
                  marginTop: DESIGN_TOKENS.spacing[1]
                }}>
                  <span>0</span>
                  <span>{maxFrameNumber - 1}</span>
                </div>
              </div>
            )}

            {/* アニメーションインデックス（playing/stopped/loop条件の場合） */}
            {(condition.condition === 'playing' || condition.condition === 'stopped' || condition.condition === 'loop') && selectedObject && selectedObject.frames && selectedObject.frames.length > 1 && (
              <div style={{
                padding: DESIGN_TOKENS.spacing[3],
                backgroundColor: DESIGN_TOKENS.colors.neutral[50],
                borderRadius: DESIGN_TOKENS.borderRadius.md,
                marginBottom: DESIGN_TOKENS.spacing[3]
              }}>
                <label style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  color: DESIGN_TOKENS.colors.neutral[700],
                  display: 'block',
                  marginBottom: DESIGN_TOKENS.spacing[2]
                }}>
                  アニメーション番号: {(condition.animationIndex ?? 0) + 1}
                </label>
                <input
                  type="range"
                  min="0"
                  max={Math.min(7, selectedObject.frames.length - 1)}
                  value={condition.animationIndex ?? 0}
                  onChange={(e) => onUpdate(index, { animationIndex: parseInt(e.target.value) })}
                  style={{ width: '100%' }}
                />
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.neutral[500],
                  marginTop: DESIGN_TOKENS.spacing[1]
                }}>
                  <span>1</span>
                  <span>{Math.min(8, selectedObject.frames.length)}</span>
                </div>
              </div>
            )}

            {/* ループ回数（loop条件の場合） */}
            {condition.condition === 'loop' && (
              <div style={{
                padding: DESIGN_TOKENS.spacing[3],
                backgroundColor: DESIGN_TOKENS.colors.neutral[50],
                borderRadius: DESIGN_TOKENS.borderRadius.md,
                marginBottom: DESIGN_TOKENS.spacing[3]
              }}>
                <label style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  color: DESIGN_TOKENS.colors.neutral[700],
                  display: 'block',
                  marginBottom: DESIGN_TOKENS.spacing[2]
                }}>
                  ループ回数: {condition.loopCount ?? 1}
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={condition.loopCount ?? 1}
                  onChange={(e) => onUpdate(index, { loopCount: parseInt(e.target.value) })}
                  style={{ width: '100%' }}
                />
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.neutral[500],
                  marginTop: DESIGN_TOKENS.spacing[1]
                }}>
                  <span>1回</span>
                  <span>10回</span>
                </div>
              </div>
            )}
          </div>
        )}

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
    const stateTypeLabel = 
      condition.stateType === 'visible' ? '表示状態' :
      condition.stateType === 'hidden' ? '非表示状態' :
      condition.stateType === 'animation' ? 'アニメーション状態' : '';

    const conditionLabel = condition.condition 
      ? ANIMATION_CONDITIONS.find(c => c.value === condition.condition)?.label 
      : '';

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
          backgroundColor: DESIGN_TOKENS.colors.primary[50],
          border: `2px solid ${DESIGN_TOKENS.colors.primary[200]}`,
          borderRadius: DESIGN_TOKENS.borderRadius.lg,
          marginBottom: DESIGN_TOKENS.spacing[4]
        }}>
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
            <div style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.neutral[600],
              marginBottom: DESIGN_TOKENS.spacing[1]
            }}>
              チェックする状態
            </div>
            <div style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.base,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
              color: DESIGN_TOKENS.colors.neutral[800]
            }}>
              {stateTypeLabel}
            </div>
          </div>

          <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
            <div style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.neutral[600],
              marginBottom: DESIGN_TOKENS.spacing[1]
            }}>
              対象オブジェクト
            </div>
            <div style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.base,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
              color: DESIGN_TOKENS.colors.neutral[800]
            }}>
              {selectedObject?.name || '未選択'}
            </div>
          </div>

          {condition.stateType === 'animation' && (
            <>
              {conditionLabel && (
                <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
                  <div style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                    color: DESIGN_TOKENS.colors.neutral[600],
                    marginBottom: DESIGN_TOKENS.spacing[1]
                  }}>
                    アニメーション条件
                  </div>
                  <div style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                    color: DESIGN_TOKENS.colors.neutral[700]
                  }}>
                    {conditionLabel}
                  </div>
                </div>
              )}

              {(condition.frameNumber !== undefined) && (
                <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
                  <div style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                    color: DESIGN_TOKENS.colors.neutral[600],
                    marginBottom: DESIGN_TOKENS.spacing[1]
                  }}>
                    フレーム指定
                  </div>
                  <div style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                    color: DESIGN_TOKENS.colors.neutral[700]
                  }}>
                    フレーム {condition.frameNumber}
                  </div>
                </div>
              )}

              {condition.frameRange && (
                <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
                  <div style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                    color: DESIGN_TOKENS.colors.neutral[600],
                    marginBottom: DESIGN_TOKENS.spacing[1]
                  }}>
                    フレーム範囲
                  </div>
                  <div style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                    color: DESIGN_TOKENS.colors.neutral[700]
                  }}>
                    {condition.frameRange[0]} ～ {condition.frameRange[1]}
                  </div>
                </div>
              )}

              {(condition.animationIndex !== undefined) && (
                <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
                  <div style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                    color: DESIGN_TOKENS.colors.neutral[600],
                    marginBottom: DESIGN_TOKENS.spacing[1]
                  }}>
                    アニメーション番号
                  </div>
                  <div style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                    color: DESIGN_TOKENS.colors.neutral[700]
                  }}>
                    アニメーション {condition.animationIndex + 1}
                  </div>
                </div>
              )}

              {(condition.loopCount !== undefined) && (
                <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
                  <div style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                    color: DESIGN_TOKENS.colors.neutral[600],
                    marginBottom: DESIGN_TOKENS.spacing[1]
                  }}>
                    ループ回数
                  </div>
                  <div style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                    color: DESIGN_TOKENS.colors.neutral[700]
                  }}>
                    {condition.loopCount}回
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ 
          display: 'flex', 
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          <ModernButton
            variant="outline"
            size="md"
            onClick={() => setCurrentStep('detail')}
          >
            ← 戻る
          </ModernButton>
          <ModernButton
            variant="primary"
            size="md"
            onClick={() => {
              // 設定完了
              alert(t('errors.settingsComplete'));
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
        border: `2px solid ${DESIGN_TOKENS.colors.primary[300]}`,
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
          color: DESIGN_TOKENS.colors.primary[700],
          margin: 0,
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'flex',
          alignItems: 'center',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize['2xl'] }}>🎭</span>
          オブジェクト状態条件
        </h4>
        <p style={{
          margin: 0,
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          color: DESIGN_TOKENS.colors.neutral[600]
        }}>
          オブジェクトの表示状態やアニメーション状態をチェック
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
          backgroundColor: DESIGN_TOKENS.colors.primary[500],
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
                ? DESIGN_TOKENS.colors.primary[500] 
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
                ? DESIGN_TOKENS.colors.primary[700] 
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
        {currentStep === 'stateType' && renderStateTypeStep()}
        {currentStep === 'target' && renderTargetStep()}
        {currentStep === 'detail' && renderDetailStep()}
        {currentStep === 'confirm' && renderConfirmStep()}
      </div>
    </ModernCard>
  );
};