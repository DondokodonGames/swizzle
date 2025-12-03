// src/components/editor/script/conditions/ObjectStateConditionEditor.tsx
// オブジェクト状態条件エディター（完全修正版）
// DESIGN_TOKENS使用パターンを既存ファイルに完全一致

import React, { useState, useMemo } from 'react';
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

export const ObjectStateConditionEditor: React.FC<ObjectStateConditionEditorProps> = ({
  condition,
  project,
  index,
  onUpdate
}) => {
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

  // ステップナビゲーション
  const steps = [
    { id: 'stateType', label: '状態タイプ選択', icon: '🎭' },
    { id: 'target', label: 'オブジェクト選択', icon: '🎯' },
    { id: 'detail', label: '詳細設定', icon: '⚙️' },
    { id: 'confirm', label: '確認', icon: '✅' }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

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
              {obj.frames && obj.frames[0]?.dataUrl ? (
                <img 
                  src={obj.frames[0].dataUrl} 
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

        {/* animation - 詳細設定あり */}
        {condition.stateType === 'animation' && (
          <div>
            <label style={{
              display: 'block',
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.neutral[700],
              marginBottom: DESIGN_TOKENS.spacing[2]
            }}>
              アニメーション状態
            </label>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: DESIGN_TOKENS.spacing[2],
              marginBottom: DESIGN_TOKENS.spacing[4]
            }}>
              <ModernButton
                variant={condition.condition === 'playing' ? 'primary' : 'outline'}
                size="md"
                onClick={() => onUpdate(index, { condition: 'playing' })}
                style={{
                  backgroundColor: condition.condition === 'playing' 
                    ? DESIGN_TOKENS.colors.primary[500] 
                    : DESIGN_TOKENS.colors.neutral[0],
                  borderColor: condition.condition === 'playing'
                    ? DESIGN_TOKENS.colors.primary[500]
                    : DESIGN_TOKENS.colors.neutral[300],
                  color: condition.condition === 'playing'
                    ? DESIGN_TOKENS.colors.neutral[0]
                    : DESIGN_TOKENS.colors.neutral[800]
                }}
              >
                ▶️ 再生中
              </ModernButton>
              
              <ModernButton
                variant={condition.condition === 'stopped' ? 'primary' : 'outline'}
                size="md"
                onClick={() => onUpdate(index, { condition: 'stopped' })}
                style={{
                  backgroundColor: condition.condition === 'stopped' 
                    ? DESIGN_TOKENS.colors.primary[500] 
                    : DESIGN_TOKENS.colors.neutral[0],
                  borderColor: condition.condition === 'stopped'
                    ? DESIGN_TOKENS.colors.primary[500]
                    : DESIGN_TOKENS.colors.neutral[300],
                  color: condition.condition === 'stopped'
                    ? DESIGN_TOKENS.colors.neutral[0]
                    : DESIGN_TOKENS.colors.neutral[800]
                }}
              >
                ⏹️ 停止中
              </ModernButton>
            </div>

            {/* フレーム指定オプション */}
            <div style={{
              padding: DESIGN_TOKENS.spacing[3],
              backgroundColor: DESIGN_TOKENS.colors.neutral[50],
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
                  checked={!!condition.frameNumber || condition.frameNumber === 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onUpdate(index, { frameNumber: 0 });
                    } else {
                      const updates = { ...condition };
                      delete updates.frameNumber;
                      onUpdate(index, updates);
                    }
                  }}
                />
                特定のフレームを指定
              </label>

              {(condition.frameNumber !== undefined) && selectedObject && (
                <div style={{ marginTop: DESIGN_TOKENS.spacing[2] }}>
                  <label style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                    color: DESIGN_TOKENS.colors.neutral[600],
                    display: 'block',
                    marginBottom: DESIGN_TOKENS.spacing[1]
                  }}>
                    フレーム番号: {condition.frameNumber}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(0, (selectedObject.frames?.length || 1) - 1)}
                    value={condition.frameNumber}
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
                    <span>{Math.max(0, (selectedObject.frames?.length || 1) - 1)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* フレーム範囲指定オプション */}
            <div style={{
              padding: DESIGN_TOKENS.spacing[3],
              backgroundColor: DESIGN_TOKENS.colors.neutral[50],
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
                  checked={!!condition.frameRange}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onUpdate(index, { frameRange: [0, 1] });
                    } else {
                      const updates = { ...condition };
                      delete updates.frameRange;
                      onUpdate(index, updates);
                    }
                  }}
                />
                フレーム範囲を指定
              </label>

              {condition.frameRange && selectedObject && (
                <div style={{ marginTop: DESIGN_TOKENS.spacing[2] }}>
                  <div style={{ marginBottom: DESIGN_TOKENS.spacing[2] }}>
                    <label style={{
                      fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                      color: DESIGN_TOKENS.colors.neutral[600],
                      display: 'block',
                      marginBottom: DESIGN_TOKENS.spacing[1]
                    }}>
                      開始フレーム: {condition.frameRange[0]}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max={Math.max(0, (selectedObject.frames?.length || 1) - 1)}
                      value={condition.frameRange[0]}
                      onChange={(e) => onUpdate(index, {
                        frameRange: [parseInt(e.target.value), condition.frameRange![1]]
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
                      終了フレーム: {condition.frameRange[1]}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max={Math.max(0, (selectedObject.frames?.length || 1) - 1)}
                      value={condition.frameRange[1]}
                      onChange={(e) => onUpdate(index, {
                        frameRange: [condition.frameRange![0], parseInt(e.target.value)]
                      })}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              )}
            </div>

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
              {condition.condition && (
                <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
                  <div style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                    color: DESIGN_TOKENS.colors.neutral[600],
                    marginBottom: DESIGN_TOKENS.spacing[1]
                  }}>
                    アニメーション状態
                  </div>
                  <div style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                    color: DESIGN_TOKENS.colors.neutral[700]
                  }}>
                    {condition.condition === 'playing' ? '▶️ 再生中' : '⏹️ 停止中'}
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
              // 設定完了 - 何もしない（親コンポーネントで管理）
              alert('設定が完了しました！');
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