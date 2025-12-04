// src/components/editor/script/conditions/CollisionConditionEditor.tsx
// Phase 3-1拡張版: 項目6&7統合 - 段階的選択フロー・ステージ範囲ビジュアル設定・他オブジェクト選択対応
// フロー: 種類→対象→詳細設定→確認

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TriggerCondition } from '../../../../types/editor/GameScript';
import { GameProject } from '../../../../types/editor/GameProject';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { ModernCard } from '../../../ui/ModernCard';
import { ModernButton } from '../../../ui/ModernButton';

interface CollisionConditionEditorProps {
  condition: TriggerCondition & { type: 'collision' };
  index: number;
  project: GameProject;
  onUpdate: (index: number, updates: Partial<TriggerCondition>) => void;
}

// 4つのステップ定義
type EditorStep = 'collisionType' | 'target' | 'detail' | 'confirm';

export const CollisionConditionEditor: React.FC<CollisionConditionEditorProps> = ({
  condition,
  index,
  project,
  onUpdate
}) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<EditorStep>('collisionType');

  // 衝突の種類オプション
  const COLLISION_TYPE_OPTIONS = [
    { 
      value: 'enter', 
      label: '衝突開始', 
      icon: '💥', 
      description: 'オブジェクトが触れた瞬間' 
    },
    { 
      value: 'stay', 
      label: '衝突中', 
      icon: '🔄', 
      description: 'オブジェクトが触れている間' 
    },
    { 
      value: 'exit', 
      label: '衝突終了', 
      icon: '↗️', 
      description: 'オブジェクトが離れた瞬間' 
    }
  ];

  // 衝突の対象オプション
  const COLLISION_TARGET_OPTIONS = [
    { 
      value: 'stageArea', 
      label: 'ステージ範囲', 
      icon: '📱', 
      description: '画面の特定範囲' 
    },
    { 
      value: 'other', 
      label: '他のオブジェクト', 
      icon: '🎯', 
      description: '他のオブジェクトと衝突' 
    }
  ];

  // プロジェクトのオブジェクト一覧
  const objectOptions = useMemo(() => {
    return project.assets.objects.map(obj => ({
      value: obj.id,
      label: obj.name
    }));
  }, [project.assets.objects]);

  // ステップナビゲーション
  const steps = [
    { id: 'collisionType', label: '衝突の種類', icon: '💥' },
    { id: 'target', label: '衝突の対象', icon: '🎯' },
    { id: 'detail', label: '詳細設定', icon: '📐' },
    { id: 'confirm', label: '確認', icon: '✅' }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  // ラベル取得
  const collisionTypeLabel = COLLISION_TYPE_OPTIONS.find(
    opt => opt.value === condition.collisionType
  )?.label || '未設定';

  const targetLabel = COLLISION_TARGET_OPTIONS.find(
    opt => opt.value === condition.target
  )?.label || '未設定';

  const targetObjectName = condition.targetObjectId 
    ? objectOptions.find(opt => opt.value === condition.targetObjectId)?.label 
    : '未選択';

  // ステップ1: 衝突の種類を選択
  const renderCollisionTypeStep = () => (
    <div>
      <h5 style={{
        fontSize: DESIGN_TOKENS.typography.fontSize.lg,
        fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
        color: DESIGN_TOKENS.colors.neutral[800],
        marginBottom: DESIGN_TOKENS.spacing[4]
      }}>
        どんな衝突で発動しますか？
      </h5>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: DESIGN_TOKENS.spacing[3]
      }}>
        {COLLISION_TYPE_OPTIONS.map((option) => (
          <ModernButton
            key={option.value}
            variant={condition.collisionType === option.value ? 'primary' : 'outline'}
            size="lg"
            onClick={() => {
              onUpdate(index, { collisionType: option.value as any });
              setCurrentStep('target');
            }}
            style={{
              padding: DESIGN_TOKENS.spacing[4],
              flexDirection: 'column',
              alignItems: 'center',
              gap: DESIGN_TOKENS.spacing[2],
              backgroundColor: condition.collisionType === option.value 
                ? DESIGN_TOKENS.colors.purple[500] 
                : DESIGN_TOKENS.colors.neutral[0],
              borderColor: condition.collisionType === option.value
                ? DESIGN_TOKENS.colors.purple[500]
                : DESIGN_TOKENS.colors.neutral[300],
              color: condition.collisionType === option.value
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

  // ステップ2: 衝突の対象を選択
  const renderTargetStep = () => (
    <div>
      <h5 style={{
        fontSize: DESIGN_TOKENS.typography.fontSize.lg,
        fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
        color: DESIGN_TOKENS.colors.neutral[800],
        marginBottom: DESIGN_TOKENS.spacing[4]
      }}>
        何と衝突した時に発動しますか？
      </h5>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: DESIGN_TOKENS.spacing[3]
      }}>
        {COLLISION_TARGET_OPTIONS.map((option) => (
          <ModernButton
            key={option.value}
            variant={condition.target === option.value ? 'primary' : 'outline'}
            size="lg"
            onClick={() => {
              onUpdate(index, { target: option.value });
              // 詳細設定が必要な場合は次のステップへ
              setCurrentStep('detail');
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
          onClick={() => setCurrentStep('collisionType')}
        >
          ← 戻る
        </ModernButton>
      </div>
    </div>
  );

  // ステップ3: 詳細設定
  const renderDetailStep = () => {
    // stageArea選択時: ステージ範囲設定
    if (condition.target === 'stageArea') {
      return (
        <div>
          <h5 style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.lg,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
            color: DESIGN_TOKENS.colors.neutral[800],
            marginBottom: DESIGN_TOKENS.spacing[4]
          }}>
            画面端の範囲を設定
          </h5>

          {/* 範囲の形状選択 */}
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.purple[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              範囲の形状
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: DESIGN_TOKENS.spacing[2],
              marginBottom: DESIGN_TOKENS.spacing[3]
            }}>
              <ModernButton
                variant={condition.region?.shape === 'rect' ? 'primary' : 'outline'}
                size="md"
                onClick={() => onUpdate(index, { 
                  region: { 
                    shape: 'rect', 
                    x: 0.5, 
                    y: 0.5, 
                    width: 0.4, 
                    height: 0.4 
                  } 
                })}
                style={{
                  borderColor: condition.region?.shape === 'rect' 
                    ? DESIGN_TOKENS.colors.purple[500] 
                    : DESIGN_TOKENS.colors.purple[200],
                  backgroundColor: condition.region?.shape === 'rect' 
                    ? DESIGN_TOKENS.colors.purple[500] 
                    : 'transparent',
                  color: condition.region?.shape === 'rect' 
                    ? DESIGN_TOKENS.colors.neutral[0] 
                    : DESIGN_TOKENS.colors.purple[800]
                }}
              >
                <span>⬜ 矩形</span>
              </ModernButton>
              <ModernButton
                variant={condition.region?.shape === 'circle' ? 'primary' : 'outline'}
                size="md"
                onClick={() => onUpdate(index, { 
                  region: { 
                    shape: 'circle', 
                    x: 0.5, 
                    y: 0.5, 
                    radius: 0.2 
                  } 
                })}
                style={{
                  borderColor: condition.region?.shape === 'circle' 
                    ? DESIGN_TOKENS.colors.purple[500] 
                    : DESIGN_TOKENS.colors.purple[200],
                  backgroundColor: condition.region?.shape === 'circle' 
                    ? DESIGN_TOKENS.colors.purple[500] 
                    : 'transparent',
                  color: condition.region?.shape === 'circle' 
                    ? DESIGN_TOKENS.colors.neutral[0] 
                    : DESIGN_TOKENS.colors.purple[800]
                }}
              >
                <span>⭕ 円形</span>
              </ModernButton>
            </div>
          </div>

          {/* ゲーム画面プレビュー枠（9:16アスペクト比） */}
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.purple[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              ゲーム画面プレビュー
            </label>
            <div style={{
              width: '100%',
              aspectRatio: '9 / 16',
              backgroundColor: DESIGN_TOKENS.colors.neutral[100],
              border: `2px dashed ${DESIGN_TOKENS.colors.neutral[300]}`,
              borderRadius: DESIGN_TOKENS.borderRadius.lg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: DESIGN_TOKENS.colors.neutral[400],
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              position: 'relative'
            }}>
              {/* TODO: ビジュアル範囲選択機能（将来実装） */}
              <span>📱 9:16 ゲーム画面</span>
              <div style={{
                position: 'absolute',
                bottom: DESIGN_TOKENS.spacing[2],
                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                color: DESIGN_TOKENS.colors.neutral[400]
              }}>
                ビジュアル編集機能は準備中
              </div>
            </div>
          </div>

          {/* 範囲設定（数値入力） */}
          {condition.region && (
            <div style={{
              padding: DESIGN_TOKENS.spacing[3],
              backgroundColor: DESIGN_TOKENS.colors.purple[50],
              border: `1px solid ${DESIGN_TOKENS.colors.purple[200]}`,
              borderRadius: DESIGN_TOKENS.borderRadius.lg,
              marginBottom: DESIGN_TOKENS.spacing[4]
            }}>
              <h6 style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                color: DESIGN_TOKENS.colors.purple[800],
                marginBottom: DESIGN_TOKENS.spacing[3]
              }}>
                範囲の数値設定
              </h6>

              {/* 中心座標 */}
              <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
                <label style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                  color: DESIGN_TOKENS.colors.purple[700],
                  marginBottom: DESIGN_TOKENS.spacing[1],
                  display: 'block'
                }}>
                  中心座標（画面比率 0.0〜1.0）
                </label>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: DESIGN_TOKENS.spacing[2] 
                }}>
                  <div>
                    <label style={{ 
                      fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                      color: DESIGN_TOKENS.colors.neutral[600]
                    }}>
                      X（横）
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.05"
                      value={condition.region.x || 0.5}
                      onChange={(e) => onUpdate(index, {
                        region: { ...condition.region!, x: parseFloat(e.target.value) }
                      })}
                      style={{
                        width: '100%',
                        padding: DESIGN_TOKENS.spacing[2],
                        border: `1px solid ${DESIGN_TOKENS.colors.purple[200]}`,
                        borderRadius: DESIGN_TOKENS.borderRadius.md,
                        fontSize: DESIGN_TOKENS.typography.fontSize.sm
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ 
                      fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                      color: DESIGN_TOKENS.colors.neutral[600]
                    }}>
                      Y（縦）
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.05"
                      value={condition.region.y || 0.5}
                      onChange={(e) => onUpdate(index, {
                        region: { ...condition.region!, y: parseFloat(e.target.value) }
                      })}
                      style={{
                        width: '100%',
                        padding: DESIGN_TOKENS.spacing[2],
                        border: `1px solid ${DESIGN_TOKENS.colors.purple[200]}`,
                        borderRadius: DESIGN_TOKENS.borderRadius.md,
                        fontSize: DESIGN_TOKENS.typography.fontSize.sm
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 矩形の場合: 幅と高さ */}
              {condition.region.shape === 'rect' && (
                <div>
                  <label style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                    fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                    color: DESIGN_TOKENS.colors.purple[700],
                    marginBottom: DESIGN_TOKENS.spacing[1],
                    display: 'block'
                  }}>
                    サイズ（画面比率 0.0〜1.0）
                  </label>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: DESIGN_TOKENS.spacing[2] 
                  }}>
                    <div>
                      <label style={{ 
                        fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                        color: DESIGN_TOKENS.colors.neutral[600]
                      }}>
                        幅（Width）
                      </label>
                      <input
                        type="number"
                        min="0.1"
                        max="1"
                        step="0.05"
                        value={condition.region.width || 0.4}
                        onChange={(e) => onUpdate(index, {
                          region: { ...condition.region!, width: parseFloat(e.target.value) }
                        })}
                        style={{
                          width: '100%',
                          padding: DESIGN_TOKENS.spacing[2],
                          border: `1px solid ${DESIGN_TOKENS.colors.purple[200]}`,
                          borderRadius: DESIGN_TOKENS.borderRadius.md,
                          fontSize: DESIGN_TOKENS.typography.fontSize.sm
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ 
                        fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                        color: DESIGN_TOKENS.colors.neutral[600]
                      }}>
                        高さ（Height）
                      </label>
                      <input
                        type="number"
                        min="0.1"
                        max="1"
                        step="0.05"
                        value={condition.region.height || 0.4}
                        onChange={(e) => onUpdate(index, {
                          region: { ...condition.region!, height: parseFloat(e.target.value) }
                        })}
                        style={{
                          width: '100%',
                          padding: DESIGN_TOKENS.spacing[2],
                          border: `1px solid ${DESIGN_TOKENS.colors.purple[200]}`,
                          borderRadius: DESIGN_TOKENS.borderRadius.md,
                          fontSize: DESIGN_TOKENS.typography.fontSize.sm
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 円形の場合: 半径 */}
              {condition.region.shape === 'circle' && (
                <div>
                  <label style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                    fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                    color: DESIGN_TOKENS.colors.purple[700],
                    marginBottom: DESIGN_TOKENS.spacing[1],
                    display: 'block'
                  }}>
                    半径（画面比率 0.0〜1.0）
                  </label>
                  <input
                    type="number"
                    min="0.05"
                    max="1"
                    step="0.05"
                    value={condition.region.radius || 0.2}
                    onChange={(e) => onUpdate(index, {
                      region: { ...condition.region!, radius: parseFloat(e.target.value) }
                    })}
                    style={{
                      width: '100%',
                      padding: DESIGN_TOKENS.spacing[2],
                      border: `1px solid ${DESIGN_TOKENS.colors.purple[200]}`,
                      borderRadius: DESIGN_TOKENS.borderRadius.md,
                      fontSize: DESIGN_TOKENS.typography.fontSize.sm
                    }}
                  />
                </div>
              )}
            </div>
          )}

          <div style={{ 
            display: 'flex', 
            gap: DESIGN_TOKENS.spacing[2] 
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
    }

    // other選択時: 他のオブジェクト選択
    if (condition.target === 'other') {
      return (
        <div>
          <h5 style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.lg,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
            color: DESIGN_TOKENS.colors.neutral[800],
            marginBottom: DESIGN_TOKENS.spacing[4]
          }}>
            衝突するオブジェクトを選択
          </h5>

          {objectOptions.length === 0 ? (
            <div style={{
              padding: DESIGN_TOKENS.spacing[4],
              backgroundColor: DESIGN_TOKENS.colors.warning[100],
              border: `1px solid ${DESIGN_TOKENS.colors.warning[500]}`,
              borderRadius: DESIGN_TOKENS.borderRadius.lg,
              textAlign: 'center',
              color: DESIGN_TOKENS.colors.warning[800],
              marginBottom: DESIGN_TOKENS.spacing[4]
            }}>
              ⚠️ アップロードされたオブジェクトがありません。<br />
              アセットタブでオブジェクトをアップロードしてください。
            </div>
          ) : (
            <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
              <label style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                color: DESIGN_TOKENS.colors.purple[800],
                marginBottom: DESIGN_TOKENS.spacing[2],
                display: 'block'
              }}>
                オブジェクト選択
              </label>
              <select
                value={condition.targetObjectId || ''}
                onChange={(e) => onUpdate(index, { targetObjectId: e.target.value })}
                style={{
                  width: '100%',
                  padding: DESIGN_TOKENS.spacing[3],
                  border: `2px solid ${DESIGN_TOKENS.colors.purple[300]}`,
                  borderRadius: DESIGN_TOKENS.borderRadius.lg,
                  fontSize: DESIGN_TOKENS.typography.fontSize.base,
                  backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                  cursor: 'pointer'
                }}
              >
                <option value="">選択してください</option>
                {objectOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {condition.targetObjectId && (
                <div style={{
                  marginTop: DESIGN_TOKENS.spacing[2],
                  padding: DESIGN_TOKENS.spacing[2],
                  backgroundColor: DESIGN_TOKENS.colors.success[50],
                  border: `1px solid ${DESIGN_TOKENS.colors.success[200]}`,
                  borderRadius: DESIGN_TOKENS.borderRadius.md,
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  color: DESIGN_TOKENS.colors.success[800]
                }}>
                  ✅ 選択中: {targetObjectName}
                </div>
              )}
            </div>
          )}

          <div style={{ 
            display: 'flex', 
            gap: DESIGN_TOKENS.spacing[2] 
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
              disabled={!condition.targetObjectId}
            >
              次へ →
            </ModernButton>
          </div>
        </div>
      );
    }

    return null;
  };

  // ステップ4: 確認
  const renderConfirmStep = () => {
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
          {/* 衝突の種類 */}
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
            <div style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.neutral[600],
              marginBottom: DESIGN_TOKENS.spacing[1]
            }}>
              衝突の種類
            </div>
            <div style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.base,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
              color: DESIGN_TOKENS.colors.neutral[800]
            }}>
              {collisionTypeLabel}
            </div>
          </div>

          {/* 衝突の対象 */}
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
            <div style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.neutral[600],
              marginBottom: DESIGN_TOKENS.spacing[1]
            }}>
              衝突の対象
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
                {condition.region.shape === 'rect' ? '⬜ 矩形' : '⭕ 円形'} / 
                中心({((condition.region.x || 0.5) * 100).toFixed(0)}%, {((condition.region.y || 0.5) * 100).toFixed(0)}%)
                {condition.region.shape === 'rect' 
                  ? ` / サイズ(${((condition.region.width || 0.4) * 100).toFixed(0)}% × ${((condition.region.height || 0.4) * 100).toFixed(0)}%)`
                  : ` / 半径(${((condition.region.radius || 0.2) * 100).toFixed(0)}%)`
                }
              </div>
            </div>
          )}

          {/* 他オブジェクト（otherの場合） */}
          {condition.target === 'other' && condition.targetObjectId && (
            <div>
              <div style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                color: DESIGN_TOKENS.colors.neutral[600],
                marginBottom: DESIGN_TOKENS.spacing[1]
              }}>
                衝突するオブジェクト
              </div>
              <div style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                color: DESIGN_TOKENS.colors.neutral[800]
              }}>
                🎯 {targetObjectName}
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
            onClick={() => setCurrentStep('detail')}
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
          <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize['2xl'] }}>💥</span>
          衝突条件
        </h4>
        <p style={{
          margin: 0,
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          color: DESIGN_TOKENS.colors.neutral[600]
        }}>
          オブジェクトが衝突した時に条件を満たす設定
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
        {currentStep === 'collisionType' && renderCollisionTypeStep()}
        {currentStep === 'target' && renderTargetStep()}
        {currentStep === 'detail' && renderDetailStep()}
        {currentStep === 'confirm' && renderConfirmStep()}
      </div>
    </ModernCard>
  );
};