// src/components/editor/script/actions/ObjectStateActionEditor.tsx
// Phase 1: オブジェクト状態変更エディター（1画面形式）
// 既存の良いUIを活かしつつ、ステップバイステップではなく1画面で全設定

import React, { useMemo } from 'react';
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

export const ObjectStateActionEditor: React.FC<ObjectStateActionEditorProps> = ({
  action,
  project,
  index,
  onUpdate,
  onShowNotification
}) => {
  // オブジェクトリスト取得
  const objects = useMemo(() => {
    return project.assets.objects || [];
  }, [project.assets.objects]);

  // 選択中のオブジェクト取得
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

  // ターゲットタイプ変更ハンドラー
  const handleTargetTypeChange = (newTargetType: 'background' | 'this' | 'other') => {
    let targetId: string = newTargetType;  // ← 型を string に指定
    
    if (newTargetType === 'other' && objects.length > 0) {
      targetId = objects[0].id;
    }

    onUpdate(index, { targetId });
    if (onShowNotification) {
      const label = newTargetType === 'background' ? '背景' : 
                    newTargetType === 'this' ? 'このオブジェクト' : '他のオブジェクト';
      onShowNotification('success', `ターゲットを「${label}」に変更しました`);
    }
  };

  // オブジェクト選択ハンドラー
  const handleObjectSelect = (objectId: string) => {
    onUpdate(index, { targetId: objectId });
    const obj = objects.find(o => o.id === objectId);
    if (onShowNotification && obj) {
      onShowNotification('success', `「${obj.name}」を選択しました`);
    }
  };

  // アクションタイプ変更ハンドラー
  const handleActionTypeChange = (newType: 'show' | 'hide' | 'switchAnimation') => {
    const currentTargetId = action.type === 'show' || action.type === 'hide' || action.type === 'switchAnimation' 
      ? action.targetId || 'this'
      : 'this';

    if (newType === 'switchAnimation') {
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
        type: newType,
        targetId: currentTargetId
      });
    }

    if (onShowNotification) {
      const label = newType === 'show' ? '表示' : newType === 'hide' ? '非表示' : 'アニメーション設定';
      onShowNotification('success', `「${label}」に変更しました`);
    }
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

      {/* セクション1: アクションタイプ選択 */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[6] }}>
        <h5 style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.lg,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
          color: DESIGN_TOKENS.colors.neutral[800],
          marginBottom: DESIGN_TOKENS.spacing[3],
          display: 'flex',
          alignItems: 'center',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          <span style={{ 
            width: '24px',
            height: '24px',
            borderRadius: DESIGN_TOKENS.borderRadius.full,
            backgroundColor: DESIGN_TOKENS.colors.success[500],
            color: DESIGN_TOKENS.colors.neutral[0],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.bold
          }}>
            1
          </span>
          どの状態を変更しますか？
        </h5>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: DESIGN_TOKENS.spacing[3]
        }}>
          {/* showアクション */}
          <ModernButton
            variant={action.type === 'show' ? 'primary' : 'outline'}
            size="lg"
            onClick={() => handleActionTypeChange('show')}
            style={{
              padding: DESIGN_TOKENS.spacing[4],
              flexDirection: 'column',
              alignItems: 'center',
              gap: DESIGN_TOKENS.spacing[2],
              backgroundColor: action.type === 'show' 
                ? DESIGN_TOKENS.colors.success[500] 
                : DESIGN_TOKENS.colors.neutral[0],
              borderColor: action.type === 'show'
                ? DESIGN_TOKENS.colors.success[500]
                : DESIGN_TOKENS.colors.neutral[300],
              color: action.type === 'show'
                ? DESIGN_TOKENS.colors.neutral[0]
                : DESIGN_TOKENS.colors.neutral[800]
            }}
          >
            <span style={{ fontSize: '40px' }}>👁️</span>
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
            onClick={() => handleActionTypeChange('hide')}
            style={{
              padding: DESIGN_TOKENS.spacing[4],
              flexDirection: 'column',
              alignItems: 'center',
              gap: DESIGN_TOKENS.spacing[2],
              backgroundColor: action.type === 'hide' 
                ? DESIGN_TOKENS.colors.success[500] 
                : DESIGN_TOKENS.colors.neutral[0],
              borderColor: action.type === 'hide'
                ? DESIGN_TOKENS.colors.success[500]
                : DESIGN_TOKENS.colors.neutral[300],
              color: action.type === 'hide'
                ? DESIGN_TOKENS.colors.neutral[0]
                : DESIGN_TOKENS.colors.neutral[800]
            }}
          >
            <span style={{ fontSize: '40px' }}>🙈</span>
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
            onClick={() => handleActionTypeChange('switchAnimation')}
            style={{
              padding: DESIGN_TOKENS.spacing[4],
              flexDirection: 'column',
              alignItems: 'center',
              gap: DESIGN_TOKENS.spacing[2],
              backgroundColor: action.type === 'switchAnimation' 
                ? DESIGN_TOKENS.colors.success[500] 
                : DESIGN_TOKENS.colors.neutral[0],
              borderColor: action.type === 'switchAnimation'
                ? DESIGN_TOKENS.colors.success[500]
                : DESIGN_TOKENS.colors.neutral[300],
              color: action.type === 'switchAnimation'
                ? DESIGN_TOKENS.colors.neutral[0]
                : DESIGN_TOKENS.colors.neutral[800]
            }}
          >
            <span style={{ fontSize: '40px' }}>🎬</span>
            <div>
              <div style={{ fontWeight: DESIGN_TOKENS.typography.fontWeight.bold }}>アニメーション</div>
              <div style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, opacity: 0.8 }}>
                アニメーション切替
              </div>
            </div>
          </ModernButton>
        </div>
      </div>

      {/* セクション2: ターゲット選択 */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[6] }}>
        <h5 style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.lg,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
          color: DESIGN_TOKENS.colors.neutral[800],
          marginBottom: DESIGN_TOKENS.spacing[3],
          display: 'flex',
          alignItems: 'center',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          <span style={{ 
            width: '24px',
            height: '24px',
            borderRadius: DESIGN_TOKENS.borderRadius.full,
            backgroundColor: DESIGN_TOKENS.colors.success[500],
            color: DESIGN_TOKENS.colors.neutral[0],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.bold
          }}>
            2
          </span>
          どのオブジェクトに適用しますか？
        </h5>

        {/* ターゲットタイプ選択 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: DESIGN_TOKENS.spacing[2],
          marginBottom: DESIGN_TOKENS.spacing[4]
        }}>
          <ModernButton
            variant={currentTargetType === 'background' ? 'primary' : 'outline'}
            size="md"
            onClick={() => handleTargetTypeChange('background')}
            style={{
              borderColor: currentTargetType === 'background'
                ? DESIGN_TOKENS.colors.success[500]
                : DESIGN_TOKENS.colors.neutral[300],
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: DESIGN_TOKENS.spacing[1],
              padding: DESIGN_TOKENS.spacing[3]
            }}
          >
            <span style={{ fontSize: '24px' }}>🖼️</span>
            <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.sm }}>背景</span>
          </ModernButton>

          <ModernButton
            variant={currentTargetType === 'this' ? 'primary' : 'outline'}
            size="md"
            onClick={() => handleTargetTypeChange('this')}
            style={{
              borderColor: currentTargetType === 'this'
                ? DESIGN_TOKENS.colors.success[500]
                : DESIGN_TOKENS.colors.neutral[300],
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: DESIGN_TOKENS.spacing[1],
              padding: DESIGN_TOKENS.spacing[3]
            }}
          >
            <span style={{ fontSize: '24px' }}>📦</span>
            <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.sm }}>このオブジェクト</span>
          </ModernButton>

          <ModernButton
            variant={currentTargetType === 'other' ? 'primary' : 'outline'}
            size="md"
            onClick={() => handleTargetTypeChange('other')}
            style={{
              borderColor: currentTargetType === 'other'
                ? DESIGN_TOKENS.colors.success[500]
                : DESIGN_TOKENS.colors.neutral[300],
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: DESIGN_TOKENS.spacing[1],
              padding: DESIGN_TOKENS.spacing[3]
            }}
          >
            <span style={{ fontSize: '24px' }}>🎯</span>
            <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.sm }}>他のオブジェクト</span>
          </ModernButton>
        </div>

        {/* 他のオブジェクト選択時のオブジェクト一覧 */}
        {currentTargetType === 'other' && (
          <div>
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
                      onClick={() => handleObjectSelect(obj.id)}
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
      </div>

      {/* セクション3: 詳細設定（switchAnimationの場合のみ） */}
      {action.type === 'switchAnimation' && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[6] }}>
          <h5 style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.lg,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
            color: DESIGN_TOKENS.colors.neutral[800],
            marginBottom: DESIGN_TOKENS.spacing[3],
            display: 'flex',
            alignItems: 'center',
            gap: DESIGN_TOKENS.spacing[2]
          }}>
            <span style={{ 
              width: '24px',
              height: '24px',
              borderRadius: DESIGN_TOKENS.borderRadius.full,
              backgroundColor: DESIGN_TOKENS.colors.success[500],
              color: DESIGN_TOKENS.colors.neutral[0],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.bold
            }}>
              3
            </span>
            アニメーション詳細設定
          </h5>

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

      {/* 設定概要 */}
      <div style={{
        padding: DESIGN_TOKENS.spacing[4],
        backgroundColor: DESIGN_TOKENS.colors.success[50],
        border: `2px solid ${DESIGN_TOKENS.colors.success[200]}`,
        borderRadius: DESIGN_TOKENS.borderRadius.lg
      }}>
        <h6 style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
          color: DESIGN_TOKENS.colors.success[800],
          margin: 0,
          marginBottom: DESIGN_TOKENS.spacing[2]
        }}>
          📋 現在の設定
        </h6>

        <div style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          color: DESIGN_TOKENS.colors.neutral[700],
          lineHeight: '1.6'
        }}>
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[1] }}>
            <strong>アクション:</strong>{' '}
            {action.type === 'show' ? '表示する' :
             action.type === 'hide' ? '非表示にする' :
             action.type === 'switchAnimation' ? 'アニメーション切替' : '未設定'}
          </div>
          
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[1] }}>
            <strong>ターゲット:</strong>{' '}
            {currentTargetType === 'background' ? '背景' :
             currentTargetType === 'this' ? 'このオブジェクト' :
             selectedObject?.name || '未選択'}
          </div>

          {action.type === 'switchAnimation' && (
            <>
              <div style={{ marginBottom: DESIGN_TOKENS.spacing[1] }}>
                <strong>フレーム:</strong> {action.animationIndex || 0}
              </div>
              {action.autoPlay && (
                <div style={{ marginBottom: DESIGN_TOKENS.spacing[1], color: DESIGN_TOKENS.colors.success[600] }}>
                  ▶️ 自動再生ON
                </div>
              )}
              {action.loop && (
                <div style={{ marginBottom: DESIGN_TOKENS.spacing[1], color: DESIGN_TOKENS.colors.success[600] }}>
                  🔄 ループ再生ON
                </div>
              )}
              <div>
                <strong>速度:</strong> {action.speed || 12} FPS
              </div>
            </>
          )}
        </div>
      </div>
    </ModernCard>
  );
};