// src/components/editor/script/actions/ObjectStateActionEditor.tsx
// Phase 3-3 Item 7: 3ステップフロー版
// 参考: ObjectStateConditionEditor.tsx

import React, { useState, useMemo } from 'react';
import { GameAction } from '../../../../types/editor/GameScript';
import { GameProject } from '../../../../types/editor/GameProject';
import { ObjectAsset } from '../../../../types/editor/ProjectAssets';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { ModernCard } from '../../../ui/ModernCard';
import { ModernButton } from '../../../ui/ModernButton';

interface ObjectStateActionEditorProps {
  action: GameAction;
  project: GameProject;
  index: number;
  onUpdate: (index: number, updates: Partial<GameAction>) => void;
  onShowNotification?: (type: 'success' | 'error' | 'info', message: string) => void;
}

// 3つのステップ定義
type EditorStep = 'actionType' | 'targetAndDetail' | 'confirm';

export const ObjectStateActionEditor: React.FC<ObjectStateActionEditorProps> = ({
  action,
  project,
  index,
  onUpdate,
  onShowNotification
}) => {
  const [currentStep, setCurrentStep] = useState<EditorStep>('actionType');

  // オブジェクトリスト取得
  const objects = useMemo(() => {
    return project.assets.objects || [];
  }, [project.assets.objects]);

  // 選択中のオブジェクト
  const selectedObject = useMemo(() => {
    if (action.type !== 'show' && action.type !== 'hide' && action.type !== 'switchAnimation') {
      return null;
    }
    if (!action.targetId) return null;
    return objects.find((obj: ObjectAsset) => obj.id === action.targetId) || null;
  }, [action, objects]);

  // 現在のターゲットタイプを判定
  const getCurrentTargetType = (): 'background' | 'this' | 'other' => {
    if (action.type !== 'show' && action.type !== 'hide' && action.type !== 'switchAnimation') {
      return 'this';
    }
    const targetId = action.targetId;
    if (targetId === 'background') return 'background';
    if (targetId === 'this') return 'this';
    return 'other';
  };

  const currentTargetType = getCurrentTargetType();

  // ステップナビゲーション
  const steps = [
    { id: 'actionType', label: 'アクション選択', icon: '🎬' },
    { id: 'targetAndDetail', label: 'ターゲット・詳細', icon: '🎯' },
    { id: 'confirm', label: '確認', icon: '✅' }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  // アクションタイプ選択肢
  const ACTION_TYPE_OPTIONS = [
    { value: 'show', label: '表示する', icon: '👁️', description: 'オブジェクトを表示' },
    { value: 'hide', label: '非表示にする', icon: '🙈', description: 'オブジェクトを非表示' },
    { value: 'switchAnimation', label: 'アニメーション', icon: '🎬', description: 'アニメーション切替' }
  ];

  // ターゲットタイプ選択肢
  const TARGET_TYPE_OPTIONS = [
    { value: 'background', label: '背景', icon: '🖼️' },
    { value: 'this', label: 'このオブジェクト', icon: '📦' },
    { value: 'other', label: '他のオブジェクト', icon: '🎯' }
  ];

  // ステップ1: アクションタイプ選択
  const renderActionTypeStep = () => (
    <div>
      <h5 style={{
        fontSize: DESIGN_TOKENS.typography.fontSize.lg,
        fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
        color: DESIGN_TOKENS.colors.neutral[800],
        marginBottom: DESIGN_TOKENS.spacing[4]
      }}>
        どの操作を実行しますか？
      </h5>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: DESIGN_TOKENS.spacing[3]
      }}>
        {ACTION_TYPE_OPTIONS.map((option) => (
          <ModernButton
            key={option.value}
            variant={action.type === option.value ? 'primary' : 'outline'}
            size="lg"
            onClick={() => {
              const currentTargetId = action.type === 'show' || action.type === 'hide' || action.type === 'switchAnimation' 
                ? action.targetId || 'this'
                : 'this';

              if (option.value === 'switchAnimation') {
                onUpdate(index, {
                  type: 'switchAnimation',
                  targetId: currentTargetId,
                  animationIndex: 0,
                  autoPlay: false,
                  loop: false,
                  speed: 12
                });
              } else {
                onUpdate(index, {
                  type: option.value as 'show' | 'hide',
                  targetId: currentTargetId
                });
              }
              setCurrentStep('targetAndDetail');
              if (onShowNotification) {
                onShowNotification('success', `「${option.label}」を選択しました`);
              }
            }}
            style={{
              padding: DESIGN_TOKENS.spacing[4],
              flexDirection: 'column',
              alignItems: 'center',
              gap: DESIGN_TOKENS.spacing[2],
              backgroundColor: action.type === option.value 
                ? DESIGN_TOKENS.colors.success[500] 
                : DESIGN_TOKENS.colors.neutral[0],
              borderColor: action.type === option.value
                ? DESIGN_TOKENS.colors.success[500]
                : DESIGN_TOKENS.colors.neutral[300],
              color: action.type === option.value
                ? DESIGN_TOKENS.colors.neutral[0]
                : DESIGN_TOKENS.colors.neutral[800]
            }}
          >
            <span style={{ fontSize: '48px' }}>{option.icon}</span>
            <div>
              <div style={{ fontWeight: DESIGN_TOKENS.typography.fontWeight.bold }}>{option.label}</div>
              <div style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, opacity: 0.8 }}>
                {option.description}
              </div>
            </div>
          </ModernButton>
        ))}
      </div>
    </div>
  );

  // ステップ2: ターゲット選択 + 詳細設定
  const renderTargetAndDetailStep = () => (
    <div>
      <h5 style={{
        fontSize: DESIGN_TOKENS.typography.fontSize.lg,
        fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
        color: DESIGN_TOKENS.colors.neutral[800],
        marginBottom: DESIGN_TOKENS.spacing[4]
      }}>
        どのオブジェクトに適用しますか？
      </h5>

      {/* ターゲットタイプ選択 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: DESIGN_TOKENS.spacing[2],
        marginBottom: DESIGN_TOKENS.spacing[4]
      }}>
        {TARGET_TYPE_OPTIONS.map((option) => (
          <ModernButton
            key={option.value}
            variant={currentTargetType === option.value ? 'primary' : 'outline'}
            size="md"
            onClick={() => {
              let targetId: string = option.value;
              if (option.value === 'other' && objects.length > 0) {
                targetId = objects[0].id;
              }
              onUpdate(index, { targetId });
              if (onShowNotification) {
                onShowNotification('success', `ターゲットを「${option.label}」に変更しました`);
              }
            }}
            style={{
              borderColor: currentTargetType === option.value
                ? DESIGN_TOKENS.colors.success[500]
                : DESIGN_TOKENS.colors.neutral[300],
              backgroundColor: currentTargetType === option.value 
                ? DESIGN_TOKENS.colors.success[500] 
                : DESIGN_TOKENS.colors.neutral[0],
              color: currentTargetType === option.value
                ? DESIGN_TOKENS.colors.neutral[0]
                : DESIGN_TOKENS.colors.neutral[800],
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: DESIGN_TOKENS.spacing[1],
              padding: DESIGN_TOKENS.spacing[3]
            }}
          >
            <span style={{ fontSize: '24px' }}>{option.icon}</span>
            <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.sm }}>{option.label}</span>
          </ModernButton>
        ))}
      </div>

      {/* 他のオブジェクト選択時のオブジェクト一覧 */}
      {currentTargetType === 'other' && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
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
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: DESIGN_TOKENS.spacing[3]
            }}>
              {objects.map((obj: ObjectAsset) => {
                const isSelected = action.type === 'show' || action.type === 'hide' || action.type === 'switchAnimation'
                  ? action.targetId === obj.id
                  : false;
                
                return (
                  <ModernButton
                    key={obj.id}
                    variant={isSelected ? 'primary' : 'outline'}
                    size="md"
                    onClick={() => {
                      onUpdate(index, { targetId: obj.id });
                      if (onShowNotification) {
                        onShowNotification('success', `「${obj.name}」を選択しました`);
                      }
                    }}
                    style={{
                      padding: DESIGN_TOKENS.spacing[3],
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: DESIGN_TOKENS.spacing[2],
                      backgroundColor: isSelected
                        ? DESIGN_TOKENS.colors.success[500] 
                        : DESIGN_TOKENS.colors.neutral[0],
                      borderColor: isSelected
                        ? DESIGN_TOKENS.colors.success[500]
                        : DESIGN_TOKENS.colors.neutral[300],
                      color: isSelected
                        ? DESIGN_TOKENS.colors.neutral[0]
                        : DESIGN_TOKENS.colors.neutral[800]
                    }}
                  >
                    {obj.frames && obj.frames[0]?.dataUrl ? (
                      <img 
                        src={obj.frames[0].dataUrl} 
                        alt={obj.name}
                        style={{
                          width: '48px',
                          height: '48px',
                          objectFit: 'contain',
                          borderRadius: DESIGN_TOKENS.borderRadius.md
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '48px',
                        height: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isSelected 
                          ? DESIGN_TOKENS.colors.success[500]
                          : DESIGN_TOKENS.colors.neutral[100],
                        borderRadius: DESIGN_TOKENS.borderRadius.md,
                        fontSize: DESIGN_TOKENS.typography.fontSize.xl
                      }}>
                        🎨
                      </div>
                    )}
                    <span style={{ 
                      fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                      fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                      textAlign: 'center',
                      wordBreak: 'break-word'
                    }}>
                      {obj.name}
                    </span>
                  </ModernButton>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* アニメーション詳細設定（switchAnimationの場合のみ） */}
      {action.type === 'switchAnimation' && (
        <div style={{
          padding: DESIGN_TOKENS.spacing[4],
          backgroundColor: DESIGN_TOKENS.colors.neutral[50],
          borderRadius: DESIGN_TOKENS.borderRadius.lg,
          marginBottom: DESIGN_TOKENS.spacing[4]
        }}>
          <h6 style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.base,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
            color: DESIGN_TOKENS.colors.neutral[800],
            marginBottom: DESIGN_TOKENS.spacing[3]
          }}>
            アニメーション詳細設定
          </h6>

          {selectedObject && selectedObject.frames && selectedObject.frames.length > 0 ? (
            <>
              {/* アニメーションフレーム選択 */}
              <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
                <label style={{
                  display: 'block',
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                  color: DESIGN_TOKENS.colors.neutral[700],
                  marginBottom: DESIGN_TOKENS.spacing[2]
                }}>
                  アニメーションフレーム
                </label>

                <input
                  type="range"
                  min="0"
                  max={selectedObject.frames.length - 1}
                  value={action.animationIndex || 0}
                  onChange={(e) => onUpdate(index, { animationIndex: parseInt(e.target.value) })}
                  style={{ 
                    width: '100%',
                    marginBottom: DESIGN_TOKENS.spacing[2]
                  }}
                />
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                    color: DESIGN_TOKENS.colors.neutral[600]
                  }}>
                    フレーム: {action.animationIndex || 0}
                  </span>
                  <span style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                    color: DESIGN_TOKENS.colors.neutral[500]
                  }}>
                    全{selectedObject.frames.length}フレーム
                  </span>
                </div>

                {/* フレームプレビュー */}
                {selectedObject.frames[action.animationIndex || 0]?.dataUrl && (
                  <div style={{
                    marginTop: DESIGN_TOKENS.spacing[3],
                    padding: DESIGN_TOKENS.spacing[4],
                    backgroundColor: DESIGN_TOKENS.colors.neutral[100],
                    borderRadius: DESIGN_TOKENS.borderRadius.md,
                    display: 'flex',
                    justifyContent: 'center'
                  }}>
                    <img
                      src={selectedObject.frames[action.animationIndex || 0].dataUrl}
                      alt={`Frame ${action.animationIndex || 0}`}
                      style={{
                        maxWidth: '128px',
                        maxHeight: '128px',
                        objectFit: 'contain'
                      }}
                    />
                  </div>
                )}
              </div>

              {/* 自動再生設定 */}
              <div style={{
                padding: DESIGN_TOKENS.spacing[3],
                backgroundColor: DESIGN_TOKENS.colors.neutral[100],
                borderRadius: DESIGN_TOKENS.borderRadius.md,
                marginBottom: DESIGN_TOKENS.spacing[3]
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: DESIGN_TOKENS.spacing[2],
                  cursor: 'pointer',
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  color: DESIGN_TOKENS.colors.neutral[700]
                }}>
                  <input
                    type="checkbox"
                    checked={action.autoPlay || false}
                    onChange={(e) => onUpdate(index, { autoPlay: e.target.checked })}
                  />
                  アニメーションを自動再生
                </label>
                <p style={{
                  margin: 0,
                  marginTop: DESIGN_TOKENS.spacing[2],
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.neutral[600]
                }}>
                  ONにすると、設定後すぐにアニメーションが再生されます
                </p>
              </div>

              {/* ループ設定 */}
              <div style={{
                padding: DESIGN_TOKENS.spacing[3],
                backgroundColor: DESIGN_TOKENS.colors.neutral[100],
                borderRadius: DESIGN_TOKENS.borderRadius.md,
                marginBottom: DESIGN_TOKENS.spacing[3]
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: DESIGN_TOKENS.spacing[2],
                  cursor: 'pointer',
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  color: DESIGN_TOKENS.colors.neutral[700]
                }}>
                  <input
                    type="checkbox"
                    checked={action.loop || false}
                    onChange={(e) => onUpdate(index, { loop: e.target.checked })}
                  />
                  アニメーションをループ再生
                </label>
                <p style={{
                  margin: 0,
                  marginTop: DESIGN_TOKENS.spacing[2],
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.neutral[600]
                }}>
                  ONにすると、アニメーションが繰り返し再生されます
                </p>
              </div>

              {/* 再生速度設定 */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                  color: DESIGN_TOKENS.colors.neutral[700],
                  marginBottom: DESIGN_TOKENS.spacing[2]
                }}>
                  再生速度（FPS）
                </label>
                <input
                  type="range"
                  min="1"
                  max="60"
                  value={action.speed || 12}
                  onChange={(e) => onUpdate(index, { speed: parseInt(e.target.value) })}
                  style={{ 
                    width: '100%',
                    marginBottom: DESIGN_TOKENS.spacing[2]
                  }}
                />
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                    color: DESIGN_TOKENS.colors.neutral[600]
                  }}>
                    {action.speed || 12} FPS
                  </span>
                  <span style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                    color: DESIGN_TOKENS.colors.neutral[500]
                  }}>
                    (1 FPS = 遅い ～ 60 FPS = 速い)
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div style={{
              padding: DESIGN_TOKENS.spacing[4],
              backgroundColor: DESIGN_TOKENS.colors.warning[100],
              borderRadius: DESIGN_TOKENS.borderRadius.md,
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              color: DESIGN_TOKENS.colors.warning[800]
            }}>
              ⚠️ このオブジェクトにはフレームがありません
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
          onClick={() => setCurrentStep('actionType')}
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

  // ステップ3: 確認
  const renderConfirmStep = () => {
    const actionTypeLabel = ACTION_TYPE_OPTIONS.find(opt => opt.value === action.type)?.label || '';
    const targetTypeLabel = TARGET_TYPE_OPTIONS.find(opt => opt.value === currentTargetType)?.label || '';

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
          backgroundColor: DESIGN_TOKENS.colors.success[50],
          border: `2px solid ${DESIGN_TOKENS.colors.success[200]}`,
          borderRadius: DESIGN_TOKENS.borderRadius.lg,
          marginBottom: DESIGN_TOKENS.spacing[4]
        }}>
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
            <div style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.neutral[600],
              marginBottom: DESIGN_TOKENS.spacing[1]
            }}>
              実行するアクション
            </div>
            <div style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.base,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
              color: DESIGN_TOKENS.colors.neutral[800]
            }}>
              {actionTypeLabel}
            </div>
          </div>

          <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
            <div style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.neutral[600],
              marginBottom: DESIGN_TOKENS.spacing[1]
            }}>
              適用先
            </div>
            <div style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.base,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
              color: DESIGN_TOKENS.colors.neutral[800]
            }}>
              {currentTargetType === 'other' ? selectedObject?.name || '未選択' : targetTypeLabel}
            </div>
          </div>

          {action.type === 'switchAnimation' && (
            <>
              <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
                <div style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.neutral[600],
                  marginBottom: DESIGN_TOKENS.spacing[1]
                }}>
                  フレーム番号
                </div>
                <div style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  color: DESIGN_TOKENS.colors.neutral[700]
                }}>
                  フレーム {action.animationIndex || 0}
                </div>
              </div>

              {action.autoPlay && (
                <div style={{ marginBottom: DESIGN_TOKENS.spacing[2] }}>
                  <span style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                    color: DESIGN_TOKENS.colors.success[600]
                  }}>
                    ▶️ 自動再生ON
                  </span>
                </div>
              )}

              {action.loop && (
                <div style={{ marginBottom: DESIGN_TOKENS.spacing[2] }}>
                  <span style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                    color: DESIGN_TOKENS.colors.success[600]
                  }}>
                    🔄 ループ再生ON
                  </span>
                </div>
              )}

              <div>
                <div style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.neutral[600],
                  marginBottom: DESIGN_TOKENS.spacing[1]
                }}>
                  再生速度
                </div>
                <div style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  color: DESIGN_TOKENS.colors.neutral[700]
                }}>
                  {action.speed || 12} FPS
                </div>
              </div>
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
            onClick={() => setCurrentStep('targetAndDetail')}
          >
            ← 戻る
          </ModernButton>
          <ModernButton
            variant="primary"
            size="md"
            onClick={() => {
              if (onShowNotification) {
                onShowNotification('success', '設定が完了しました！');
              }
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
        border: `2px solid ${DESIGN_TOKENS.colors.success[300]}`,
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
          color: DESIGN_TOKENS.colors.success[700],
          margin: 0,
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'flex',
          alignItems: 'center',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize['2xl'] }}>👁️</span>
          オブジェクト状態の変更
        </h4>
        <p style={{
          margin: 0,
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          color: DESIGN_TOKENS.colors.neutral[600]
        }}>
          オブジェクトの表示/非表示やアニメーションを制御します
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
          backgroundColor: DESIGN_TOKENS.colors.success[500],
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
                ? DESIGN_TOKENS.colors.success[500] 
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
                ? DESIGN_TOKENS.colors.success[700] 
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
        {currentStep === 'actionType' && renderActionTypeStep()}
        {currentStep === 'targetAndDetail' && renderTargetAndDetailStep()}
        {currentStep === 'confirm' && renderConfirmStep()}
      </div>
    </ModernCard>
  );
};