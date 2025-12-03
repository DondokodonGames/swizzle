// src/components/editor/script/actions/ObjectStateActionEditor.tsx
// オブジェクト状態アクションエディター（完全修正版）
// DESIGN_TOKENS使用パターンを既存ファイルに完全一致

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
}

// 4つのステップ定義
type EditorStep = 'actionType' | 'target' | 'detail' | 'confirm';

export const ObjectStateActionEditor: React.FC<ObjectStateActionEditorProps> = ({
  action,
  project,
  index,
  onUpdate
}) => {
  const [currentStep, setCurrentStep] = useState<EditorStep>('actionType');

  // オブジェクトリスト取得
  const objects = useMemo(() => {
    return project.assets.objects || [];
  }, [project.assets.objects]);

  // 選択中のオブジェクト
  const selectedObject = useMemo(() => {
    // 型ガード: targetIdを持つアクションタイプかチェック
    if (action.type !== 'show' && action.type !== 'hide' && action.type !== 'switchAnimation') {
      return null;
    }
    if (!action.targetId) return null;
    return objects.find((obj: ObjectAsset) => obj.id === action.targetId) || null;
  }, [action, objects]);

  // ステップナビゲーション
  const steps = [
    { id: 'actionType', label: 'アクション選択', icon: '⚡' },
    { id: 'target', label: 'オブジェクト選択', icon: '🎯' },
    { id: 'detail', label: '詳細設定', icon: '⚙️' },
    { id: 'confirm', label: '確認', icon: '✅' }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  // ステップ1: アクションタイプ選択
  const renderActionTypeStep = () => (
    <div>
      <h5 style={{
        fontSize: DESIGN_TOKENS.typography.fontSize.lg,
        fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
        color: DESIGN_TOKENS.colors.neutral[800],
        marginBottom: DESIGN_TOKENS.spacing[4]
      }}>
        どの状態を変更しますか？
      </h5>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: DESIGN_TOKENS.spacing[3]
      }}>
        {/* showアクション */}
        <ModernButton
          variant={action.type === 'show' ? 'primary' : 'outline'}
          size="lg"
          onClick={() => {
            onUpdate(index, { type: 'show' });
            setCurrentStep('target');
          }}
          style={{
            padding: DESIGN_TOKENS.spacing[4],
            flexDirection: 'column',
            alignItems: 'center',
            gap: DESIGN_TOKENS.spacing[2],
            backgroundColor: action.type === 'show' 
              ? DESIGN_TOKENS.colors.primary[500] 
              : DESIGN_TOKENS.colors.neutral[0],
            borderColor: action.type === 'show'
              ? DESIGN_TOKENS.colors.primary[500]
              : DESIGN_TOKENS.colors.neutral[300],
            color: action.type === 'show'
              ? DESIGN_TOKENS.colors.neutral[0]
              : DESIGN_TOKENS.colors.neutral[800]
          }}
        >
          <span style={{ fontSize: '48px' }}>👁️</span>
          <div>
            <div style={{ fontWeight: DESIGN_TOKENS.typography.fontWeight.bold }}>表示する</div>
            <div style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, opacity: 0.8 }}>
              オブジェクトを表示
            </div>
          </div>
        </ModernButton>

        {/* hideアクション */}
        <ModernButton
          variant={action.type === 'hide' ? 'primary' : 'outline'}
          size="lg"
          onClick={() => {
            onUpdate(index, { type: 'hide' });
            setCurrentStep('target');
          }}
          style={{
            padding: DESIGN_TOKENS.spacing[4],
            flexDirection: 'column',
            alignItems: 'center',
            gap: DESIGN_TOKENS.spacing[2],
            backgroundColor: action.type === 'hide' 
              ? DESIGN_TOKENS.colors.primary[500] 
              : DESIGN_TOKENS.colors.neutral[0],
            borderColor: action.type === 'hide'
              ? DESIGN_TOKENS.colors.primary[500]
              : DESIGN_TOKENS.colors.neutral[300],
            color: action.type === 'hide'
              ? DESIGN_TOKENS.colors.neutral[0]
              : DESIGN_TOKENS.colors.neutral[800]
          }}
        >
          <span style={{ fontSize: '48px' }}>🙈</span>
          <div>
            <div style={{ fontWeight: DESIGN_TOKENS.typography.fontWeight.bold }}>非表示にする</div>
            <div style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, opacity: 0.8 }}>
              オブジェクトを非表示
            </div>
          </div>
        </ModernButton>

        {/* switchAnimationアクション */}
        <ModernButton
          variant={action.type === 'switchAnimation' ? 'primary' : 'outline'}
          size="lg"
          onClick={() => {
            onUpdate(index, { type: 'switchAnimation' });
            setCurrentStep('target');
          }}
          style={{
            padding: DESIGN_TOKENS.spacing[4],
            flexDirection: 'column',
            alignItems: 'center',
            gap: DESIGN_TOKENS.spacing[2],
            backgroundColor: action.type === 'switchAnimation' 
              ? DESIGN_TOKENS.colors.primary[500] 
              : DESIGN_TOKENS.colors.neutral[0],
            borderColor: action.type === 'switchAnimation'
              ? DESIGN_TOKENS.colors.primary[500]
              : DESIGN_TOKENS.colors.neutral[300],
            color: action.type === 'switchAnimation'
              ? DESIGN_TOKENS.colors.neutral[0]
              : DESIGN_TOKENS.colors.neutral[800]
          }}
        >
          <span style={{ fontSize: '48px' }}>🎬</span>
          <div>
            <div style={{ fontWeight: DESIGN_TOKENS.typography.fontWeight.bold }}>アニメーション設定</div>
            <div style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, opacity: 0.8 }}>
              アニメーションを変更
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
        どのオブジェクトに適用しますか？
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
          {objects.map((obj: ObjectAsset) => {
            // 型ガード: targetIdを持つアクションタイプかチェック
            const isSelected = (action.type === 'show' || action.type === 'hide' || action.type === 'switchAnimation') 
              && action.targetId === obj.id;
            
            return (
              <ModernButton
                key={obj.id}
                variant={isSelected ? 'primary' : 'outline'}
                size="md"
                onClick={() => {
                  onUpdate(index, { targetId: obj.id });
                  setCurrentStep('detail');
                }}
                style={{
                  padding: DESIGN_TOKENS.spacing[3],
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: DESIGN_TOKENS.spacing[2],
                  backgroundColor: isSelected
                    ? DESIGN_TOKENS.colors.primary[500] 
                    : DESIGN_TOKENS.colors.neutral[0],
                  borderColor: isSelected
                    ? DESIGN_TOKENS.colors.primary[500]
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
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[2] }}>
        <ModernButton
          variant="outline"
          size="md"
          onClick={() => setCurrentStep('actionType')}
        >
          ← 戻る
        </ModernButton>
      </div>
    </div>
  );

  // ステップ3: 詳細設定
  const renderDetailStep = () => {
    if (!action.type) return null;

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

        {/* show/hide - 追加設定なし */}
        {(action.type === 'show' || action.type === 'hide') && (
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
              {action.type === 'show' 
                ? 'オブジェクトを表示状態にします'
                : 'オブジェクトを非表示状態にします'}
            </p>
          </div>
        )}

        {/* switchAnimation - 詳細設定あり */}
        {action.type === 'switchAnimation' && (
          <div>
            {/* アニメーションインデックス設定 */}
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

              {selectedObject && selectedObject.frames && selectedObject.frames.length > 0 ? (
                <>
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
                      padding: DESIGN_TOKENS.spacing[3],
                      backgroundColor: DESIGN_TOKENS.colors.neutral[50],
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
                </>
              ) : (
                <div style={{
                  padding: DESIGN_TOKENS.spacing[3],
                  backgroundColor: DESIGN_TOKENS.colors.warning[100],
                  borderRadius: DESIGN_TOKENS.borderRadius.md,
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  color: DESIGN_TOKENS.colors.warning[800]
                }}>
                  ⚠️ このオブジェクトにはフレームがありません
                </div>
              )}
            </div>

            {/* 自動再生設定 */}
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
            <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
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
    const actionTypeLabel = 
      action.type === 'show' ? '表示する' :
      action.type === 'hide' ? '非表示にする' :
      action.type === 'switchAnimation' ? 'アニメーション設定' : '';

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
          backgroundColor: DESIGN_TOKENS.colors.success[100],
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

          {action.type === 'switchAnimation' && (
            <>
              <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
                <div style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.neutral[600],
                  marginBottom: DESIGN_TOKENS.spacing[1]
                }}>
                  アニメーションフレーム
                </div>
                <div style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  color: DESIGN_TOKENS.colors.neutral[700]
                }}>
                  フレーム {action.animationIndex || 0}
                </div>
              </div>

              {action.autoPlay && (
                <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
                  <div style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                    color: DESIGN_TOKENS.colors.success[600]
                  }}>
                    ▶️ 自動再生ON
                  </div>
                </div>
              )}

              {action.loop && (
                <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
                  <div style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                    color: DESIGN_TOKENS.colors.success[600]
                  }}>
                    🔄 ループ再生ON
                  </div>
                </div>
              )}

              <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
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
        border: `2px solid ${DESIGN_TOKENS.colors.success[200]}`,
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
          color: DESIGN_TOKENS.colors.success[600],
          margin: 0,
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'flex',
          alignItems: 'center',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize['2xl'] }}>⚡</span>
          オブジェクト状態アクション
        </h4>
        <p style={{
          margin: 0,
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          color: DESIGN_TOKENS.colors.neutral[600]
        }}>
          オブジェクトの表示/非表示やアニメーションを制御
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
                ? DESIGN_TOKENS.colors.success[600] 
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
        {currentStep === 'target' && renderTargetStep()}
        {currentStep === 'detail' && renderDetailStep()}
        {currentStep === 'confirm' && renderConfirmStep()}
      </div>
    </ModernCard>
  );
};