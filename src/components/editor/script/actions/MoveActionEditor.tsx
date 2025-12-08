// src/components/editor/script/actions/MoveActionEditor.tsx
// Phase 3完了版: duration入力欄削除、speedのみに統一

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GameAction } from '../../../../types/editor/GameScript';
import { GameProject } from '../../../../types/editor/GameProject';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { ModernCard } from '../../../ui/ModernCard';
import { ModernButton } from '../../../ui/ModernButton';
import { CoordinateEditor, Coordinate } from '../../common/CoordinateEditor';
import { 
  getMovementTypeOptions,
  MOVEMENT_DEFAULTS,
  MOVEMENT_RANGES
} from '../constants/MovementConstants';

interface MoveActionEditorProps {
  action: GameAction & { type: 'move' };
  index: number;
  project: GameProject;
  onUpdate: (index: number, updates: Partial<GameAction>) => void;
  onShowNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

type EditorStep = 'movementType' | 'parameter' | 'confirm';
type MovementDirection = 'up' | 'down' | 'left' | 'right' | 'upLeft' | 'upRight' | 'downLeft' | 'downRight';
type StraightMode = 'direction' | 'coordinate';

const DIRECTION_OPTIONS: Array<{
  value: MovementDirection;
  label: string;
  icon: string;
  description: string;
}> = [
  { value: 'up', label: '上', icon: '⬆️', description: '上方向へ移動' },
  { value: 'upRight', label: '右上', icon: '↗️', description: '右上方向へ移動' },
  { value: 'right', label: '右', icon: '➡️', description: '右方向へ移動' },
  { value: 'downRight', label: '右下', icon: '↘️', description: '右下方向へ移動' },
  { value: 'down', label: '下', icon: '⬇️', description: '下方向へ移動' },
  { value: 'downLeft', label: '左下', icon: '↙️', description: '左下方向へ移動' },
  { value: 'left', label: '左', icon: '⬅️', description: '左方向へ移動' },
  { value: 'upLeft', label: '左上', icon: '↖️', description: '左上方向へ移動' }
];

export const MoveActionEditor: React.FC<MoveActionEditorProps> = ({
  action,
  index,
  project,
  onUpdate,
  onShowNotification
}) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<EditorStep>('movementType');
  const [straightMode, setStraightMode] = useState<StraightMode>('direction');

  const backgroundUrl = useMemo(() => {
    const background = project.assets.background;
    if (!background || !background.frames || background.frames.length === 0) {
      return undefined;
    }
    return background.frames[0].dataUrl;
  }, [project.assets.background]);

  const MOVEMENT_TYPE_OPTIONS = useMemo(() => getMovementTypeOptions(), []);

  const objectOptions = useMemo(() => 
    project.assets.objects.map(obj => ({
      value: obj.id,
      label: obj.name
    })),
  [project.assets.objects]);

  const coordinate = useMemo((): Coordinate => {
    const movement = action.movement as any;
    const target = movement?.target;
    if (target && typeof target === 'object' && 'x' in target && 'y' in target) {
      return {
        x: typeof target.x === 'number' ? target.x : 0.5,
        y: typeof target.y === 'number' ? target.y : 0.5
      };
    }
    return { x: 0.5, y: 0.5 };
  }, [action.movement]);

  // straightモードの初期化（既存のactionから判定）
  useEffect(() => {
    const movement = action.movement as any;
    if (movement?.type === 'straight') {
      if (movement?.target && typeof movement.target === 'object') {
        setStraightMode('coordinate');
      } else if (movement?.direction) {
        setStraightMode('direction');
      }
    }
  }, [action.movement]);

  const handleCoordinateChange = useCallback((newCoord: Coordinate) => {
    onUpdate(index, {
      movement: {
        ...action.movement,
        target: {
          x: newCoord.x,
          y: newCoord.y
        },
        direction: undefined // 座標を使う場合は方向をクリア
      } as any
    });
  }, [index, action.movement, onUpdate]);

  const handleDirectionChange = useCallback((direction: MovementDirection) => {
    onUpdate(index, {
      movement: {
        ...action.movement,
        direction: direction,
        target: undefined // 方向を使う場合は座標をクリア
      } as any
    });
    onShowNotification('success', `${DIRECTION_OPTIONS.find(d => d.value === direction)?.label}方向に設定しました`);
  }, [index, action.movement, onUpdate, onShowNotification]);

  const steps = [
    { id: 'movementType', label: '移動タイプ', icon: '🏃' },
    { id: 'parameter', label: 'パラメータ', icon: '🎯' },
    { id: 'confirm', label: '確認', icon: '✅' }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const movementTypeLabel = MOVEMENT_TYPE_OPTIONS.find(
    opt => opt.value === action.movement?.type
  )?.label || '未設定';

  const renderMovementTypeStep = () => (
    <div>
      <h5 style={{
        fontSize: DESIGN_TOKENS.typography.fontSize.lg,
        fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
        color: DESIGN_TOKENS.colors.neutral[800],
        marginBottom: DESIGN_TOKENS.spacing[4]
      }}>
        どんな移動をしますか？
      </h5>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: DESIGN_TOKENS.spacing[3]
      }}>
        {MOVEMENT_TYPE_OPTIONS.map((option) => (
          <ModernButton
            key={option.value}
            variant={action.movement?.type === option.value ? 'primary' : 'outline'}
            size="lg"
            onClick={() => {
              const newMovement: any = { 
                type: option.value,
                duration: MOVEMENT_DEFAULTS.duration
              };

              if (['straight', 'teleport', 'approach'].includes(option.value)) {
                newMovement.target = { x: 0.5, y: 0.5 };
                newMovement.speed = option.value === 'teleport' ? undefined : MOVEMENT_DEFAULTS.speed;
                if (option.value === 'straight') {
                  newMovement.direction = 'down';
                  newMovement.target = undefined; // 初期状態は方向モード
                }
              } else if (option.value === 'wander') {
                newMovement.wanderRadius = 100;
                newMovement.speed = MOVEMENT_DEFAULTS.speed;
              } else if (option.value === 'orbit') {
                newMovement.orbitRadius = 100;
                newMovement.speed = MOVEMENT_DEFAULTS.speed;
              } else if (option.value === 'bounce') {
                newMovement.bounceStrength = 0.8;
                newMovement.speed = MOVEMENT_DEFAULTS.speed;
              } else if (option.value === 'swap') {
                newMovement.targetObjectId = objectOptions[0]?.value || '';
              } else if (option.value === 'followDrag') {
                newMovement.damping = 0.1;
                newMovement.constrainToBounds = true;
              }

              onUpdate(index, { movement: newMovement });

              if (option.value === 'stop') {
                setCurrentStep('confirm');
                onShowNotification('info', '停止アクションを設定しました');
              } else {
                setCurrentStep('parameter');
              }
            }}
            style={{
              padding: DESIGN_TOKENS.spacing[4],
              flexDirection: 'column',
              alignItems: 'center',
              gap: DESIGN_TOKENS.spacing[2],
              backgroundColor: action.movement?.type === option.value 
                ? DESIGN_TOKENS.colors.success[500] 
                : DESIGN_TOKENS.colors.neutral[0],
              borderColor: action.movement?.type === option.value
                ? DESIGN_TOKENS.colors.success[500]
                : DESIGN_TOKENS.colors.neutral[300],
              color: action.movement?.type === option.value
                ? DESIGN_TOKENS.colors.neutral[0]
                : DESIGN_TOKENS.colors.neutral[800]
            }}
          >
            <span style={{ fontSize: '40px' }}>{option.icon}</span>
            <div>
              <div style={{ 
                fontWeight: DESIGN_TOKENS.typography.fontWeight.bold, 
                fontSize: DESIGN_TOKENS.typography.fontSize.sm 
              }}>
                {option.label}
              </div>
              <div style={{ 
                fontSize: DESIGN_TOKENS.typography.fontSize.xs, 
                opacity: 0.8 
              }}>
                {option.description}
              </div>
            </div>
          </ModernButton>
        ))}
      </div>
    </div>
  );

  const renderParameterStep = () => {
    const movementType = action.movement?.type as string;
    const movement = action.movement as any;

    if (movementType === 'straight') {
      return (
        <div>
          <h5 style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.lg,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
            color: DESIGN_TOKENS.colors.neutral[800],
            marginBottom: DESIGN_TOKENS.spacing[4]
          }}>
            直線移動のパラメータを設定
          </h5>

          {/* モード選択 */}
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              移動の指定方法
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: DESIGN_TOKENS.spacing[2]
            }}>
              <ModernButton
                variant={straightMode === 'direction' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => {
                  setStraightMode('direction');
                  onUpdate(index, {
                    movement: {
                      ...action.movement,
                      direction: movement?.direction || 'down',
                      target: undefined
                    } as any
                  });
                }}
                style={{
                  padding: DESIGN_TOKENS.spacing[3],
                  backgroundColor: straightMode === 'direction'
                    ? DESIGN_TOKENS.colors.success[500]
                    : DESIGN_TOKENS.colors.neutral[0],
                  borderColor: straightMode === 'direction'
                    ? DESIGN_TOKENS.colors.success[500]
                    : DESIGN_TOKENS.colors.success[200],
                  color: straightMode === 'direction'
                    ? DESIGN_TOKENS.colors.neutral[0]
                    : DESIGN_TOKENS.colors.neutral[800]
                }}
              >
                🧭 方向で指定
              </ModernButton>
              <ModernButton
                variant={straightMode === 'coordinate' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => {
                  setStraightMode('coordinate');
                  onUpdate(index, {
                    movement: {
                      ...action.movement,
                      target: { x: 0.5, y: 0.5 },
                      direction: undefined
                    } as any
                  });
                }}
                style={{
                  padding: DESIGN_TOKENS.spacing[3],
                  backgroundColor: straightMode === 'coordinate'
                    ? DESIGN_TOKENS.colors.success[500]
                    : DESIGN_TOKENS.colors.neutral[0],
                  borderColor: straightMode === 'coordinate'
                    ? DESIGN_TOKENS.colors.success[500]
                    : DESIGN_TOKENS.colors.success[200],
                  color: straightMode === 'coordinate'
                    ? DESIGN_TOKENS.colors.neutral[0]
                    : DESIGN_TOKENS.colors.neutral[800]
                }}
              >
                📍 座標で指定
              </ModernButton>
            </div>
          </div>

          {/* 方向モード */}
          {straightMode === 'direction' && (
            <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
              <label style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                color: DESIGN_TOKENS.colors.success[800],
                marginBottom: DESIGN_TOKENS.spacing[2],
                display: 'block'
              }}>
                移動方向を選択
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: DESIGN_TOKENS.spacing[2]
              }}>
                {DIRECTION_OPTIONS.map((dir) => (
                  <ModernButton
                    key={dir.value}
                    variant={movement?.direction === dir.value ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => handleDirectionChange(dir.value)}
                    style={{
                      padding: DESIGN_TOKENS.spacing[3],
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: DESIGN_TOKENS.spacing[1],
                      backgroundColor: movement?.direction === dir.value
                        ? DESIGN_TOKENS.colors.success[500]
                        : DESIGN_TOKENS.colors.neutral[0],
                      borderColor: movement?.direction === dir.value
                        ? DESIGN_TOKENS.colors.success[500]
                        : DESIGN_TOKENS.colors.success[200],
                      color: movement?.direction === dir.value
                        ? DESIGN_TOKENS.colors.neutral[0]
                        : DESIGN_TOKENS.colors.neutral[800]
                    }}
                    title={dir.description}
                  >
                    <span style={{ fontSize: '24px' }}>{dir.icon}</span>
                    <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs }}>
                      {dir.label}
                    </span>
                  </ModernButton>
                ))}
              </div>
            </div>
          )}

          {/* 座標モード */}
          {straightMode === 'coordinate' && (
            <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
              <CoordinateEditor
                value={coordinate}
                onChange={handleCoordinateChange}
                previewBackgroundUrl={backgroundUrl}
              />
            </div>
          )}

          {/* 速度設定 */}
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              速度（ピクセル/秒）
            </label>
            <input
              type="number"
              min={MOVEMENT_RANGES.speed.min}
              max={MOVEMENT_RANGES.speed.max}
              step={MOVEMENT_RANGES.speed.step}
              value={movement?.speed || MOVEMENT_DEFAULTS.speed}
              onChange={(e) => onUpdate(index, { 
                movement: { 
                  ...action.movement,
                  speed: parseInt(e.target.value) 
                } as any
              })}
              style={{
                width: '100%',
                padding: DESIGN_TOKENS.spacing[2],
                border: `2px solid ${DESIGN_TOKENS.colors.success[200]}`,
                borderRadius: DESIGN_TOKENS.borderRadius.lg,
                fontSize: DESIGN_TOKENS.typography.fontSize.base
              }}
            />
          </div>

          {/* 設定概要 */}
          <div style={{
            padding: DESIGN_TOKENS.spacing[3],
            backgroundColor: DESIGN_TOKENS.colors.primary[50],
            border: `1px solid ${DESIGN_TOKENS.colors.primary[200]}`,
            borderRadius: DESIGN_TOKENS.borderRadius.lg,
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            color: DESIGN_TOKENS.colors.primary[800],
            marginBottom: DESIGN_TOKENS.spacing[4]
          }}>
            <strong>📊 設定内容:</strong><br />
            {straightMode === 'direction' ? (
              <>方向: {DIRECTION_OPTIONS.find(d => d.value === movement?.direction)?.label || '下'} へ</>
            ) : (
              <>座標 ({coordinate.x.toFixed(2)}, {coordinate.y.toFixed(2)}) へ</>
            )}
            {` 速度${movement?.speed || MOVEMENT_DEFAULTS.speed}で移動します`}
          </div>

          <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[2] }}>
            <ModernButton variant="outline" size="md" onClick={() => setCurrentStep('movementType')}>
              ← 戻る
            </ModernButton>
            <ModernButton variant="primary" size="md" onClick={() => setCurrentStep('confirm')} style={{ flex: 1 }}>
              次へ →
            </ModernButton>
          </div>
        </div>
      );
    }

    if (['teleport', 'approach'].includes(movementType || '')) {
      return (
        <div>
          <h5 style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.lg,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
            color: DESIGN_TOKENS.colors.neutral[800],
            marginBottom: DESIGN_TOKENS.spacing[4]
          }}>
            移動先の座標とパラメータを設定
          </h5>

          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <CoordinateEditor
              value={coordinate}
              onChange={handleCoordinateChange}
              previewBackgroundUrl={backgroundUrl}
            />
          </div>

          {movementType !== 'teleport' && (
            <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
              <label style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                color: DESIGN_TOKENS.colors.success[800],
                marginBottom: DESIGN_TOKENS.spacing[2],
                display: 'block'
              }}>
                速度（ピクセル/秒）
              </label>
              <input
                type="number"
                min={MOVEMENT_RANGES.speed.min}
                max={MOVEMENT_RANGES.speed.max}
                step={MOVEMENT_RANGES.speed.step}
                value={movement?.speed || MOVEMENT_DEFAULTS.speed}
                onChange={(e) => onUpdate(index, { 
                  movement: { 
                    ...action.movement,
                    speed: parseInt(e.target.value) 
                  } as any
                })}
                style={{
                  width: '100%',
                  padding: DESIGN_TOKENS.spacing[2],
                  border: `2px solid ${DESIGN_TOKENS.colors.success[200]}`,
                  borderRadius: DESIGN_TOKENS.borderRadius.lg,
                  fontSize: DESIGN_TOKENS.typography.fontSize.base
                }}
              />
            </div>
          )}

          <div style={{
            padding: DESIGN_TOKENS.spacing[3],
            backgroundColor: DESIGN_TOKENS.colors.primary[50],
            border: `1px solid ${DESIGN_TOKENS.colors.primary[200]}`,
            borderRadius: DESIGN_TOKENS.borderRadius.lg,
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            color: DESIGN_TOKENS.colors.primary[800],
            marginBottom: DESIGN_TOKENS.spacing[4]
          }}>
            <strong>📊 設定内容:</strong><br />
            座標 ({coordinate.x.toFixed(2)}, {coordinate.y.toFixed(2)}) へ
            {movementType !== 'teleport' && ` 速度${movement?.speed || MOVEMENT_DEFAULTS.speed}で`}
            移動します
          </div>

          <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[2] }}>
            <ModernButton variant="outline" size="md" onClick={() => setCurrentStep('movementType')}>
              ← 戻る
            </ModernButton>
            <ModernButton variant="primary" size="md" onClick={() => setCurrentStep('confirm')} style={{ flex: 1 }}>
              次へ →
            </ModernButton>
          </div>
        </div>
      );
    }

    if (movementType === 'swap') {
      return (
        <div>
          <h5 style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.lg,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
            color: DESIGN_TOKENS.colors.neutral[800],
            marginBottom: DESIGN_TOKENS.spacing[4]
          }}>
            位置を入れ替えるオブジェクトを選択
          </h5>

          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              入れ替え対象のオブジェクト
            </label>
            <select
              value={movement?.targetObjectId || ''}
              onChange={(e) => onUpdate(index, {
                movement: { ...action.movement, targetObjectId: e.target.value } as any
              })}
              style={{
                width: '100%',
                padding: DESIGN_TOKENS.spacing[3],
                border: `2px solid ${DESIGN_TOKENS.colors.success[200]}`,
                borderRadius: DESIGN_TOKENS.borderRadius.lg,
                fontSize: DESIGN_TOKENS.typography.fontSize.base,
                backgroundColor: DESIGN_TOKENS.colors.neutral[0]
              }}
            >
              <option value="">選択してください</option>
              {objectOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div style={{
            padding: DESIGN_TOKENS.spacing[3],
            backgroundColor: DESIGN_TOKENS.colors.primary[50],
            border: `1px solid ${DESIGN_TOKENS.colors.primary[200]}`,
            borderRadius: DESIGN_TOKENS.borderRadius.lg,
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            color: DESIGN_TOKENS.colors.primary[800],
            marginBottom: DESIGN_TOKENS.spacing[4]
          }}>
            <strong>📊 設定内容:</strong><br />
            {movement?.targetObjectId 
              ? `${objectOptions.find(o => o.value === movement?.targetObjectId)?.label || '未選択'}と位置を入れ替えます`
              : 'オブジェクトを選択してください'}
          </div>

          <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[2] }}>
            <ModernButton variant="outline" size="md" onClick={() => setCurrentStep('movementType')}>
              ← 戻る
            </ModernButton>
            <ModernButton 
              variant="primary" 
              size="md" 
              onClick={() => setCurrentStep('confirm')}
              disabled={!movement?.targetObjectId}
              style={{ flex: 1 }}
            >
              次へ →
            </ModernButton>
          </div>
        </div>
      );
    }

    if (movementType === 'wander') {
      return (
        <div>
          <h5 style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.lg,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
            color: DESIGN_TOKENS.colors.neutral[800],
            marginBottom: DESIGN_TOKENS.spacing[4]
          }}>
            徘徊のパラメータを設定
          </h5>

          <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              徘徊半径（ピクセル）
            </label>
            <input
              type="number"
              min="20"
              max="500"
              step="10"
              value={movement?.wanderRadius || 100}
              onChange={(e) => onUpdate(index, {
                movement: { ...action.movement, wanderRadius: parseInt(e.target.value) } as any
              })}
              style={{
                width: '100%',
                padding: DESIGN_TOKENS.spacing[2],
                border: `2px solid ${DESIGN_TOKENS.colors.success[200]}`,
                borderRadius: DESIGN_TOKENS.borderRadius.lg,
                fontSize: DESIGN_TOKENS.typography.fontSize.base
              }}
            />
          </div>

          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              速度（ピクセル/秒）
            </label>
            <input
              type="number"
              min={MOVEMENT_RANGES.speed.min}
              max={MOVEMENT_RANGES.speed.max}
              step={MOVEMENT_RANGES.speed.step}
              value={movement?.speed || MOVEMENT_DEFAULTS.speed}
              onChange={(e) => onUpdate(index, { 
                movement: { ...action.movement, speed: parseInt(e.target.value) } as any
              })}
              style={{
                width: '100%',
                padding: DESIGN_TOKENS.spacing[2],
                border: `2px solid ${DESIGN_TOKENS.colors.success[200]}`,
                borderRadius: DESIGN_TOKENS.borderRadius.lg,
                fontSize: DESIGN_TOKENS.typography.fontSize.base
              }}
            />
          </div>

          <div style={{
            padding: DESIGN_TOKENS.spacing[3],
            backgroundColor: DESIGN_TOKENS.colors.primary[50],
            border: `1px solid ${DESIGN_TOKENS.colors.primary[200]}`,
            borderRadius: DESIGN_TOKENS.borderRadius.lg,
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            color: DESIGN_TOKENS.colors.primary[800],
            marginBottom: DESIGN_TOKENS.spacing[4]
          }}>
            <strong>📊 設定内容:</strong><br />
            半径{movement?.wanderRadius || 100}px の範囲を、速度{movement?.speed || MOVEMENT_DEFAULTS.speed}で徘徊します
          </div>

          <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[2] }}>
            <ModernButton variant="outline" size="md" onClick={() => setCurrentStep('movementType')}>
              ← 戻る
            </ModernButton>
            <ModernButton variant="primary" size="md" onClick={() => setCurrentStep('confirm')} style={{ flex: 1 }}>
              次へ →
            </ModernButton>
          </div>
        </div>
      );
    }

    if (movementType === 'orbit') {
      return (
        <div>
          <h5 style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.lg,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
            color: DESIGN_TOKENS.colors.neutral[800],
            marginBottom: DESIGN_TOKENS.spacing[4]
          }}>
            周回のパラメータを設定
          </h5>

          <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              周回半径（ピクセル）
            </label>
            <input
              type="number"
              min="20"
              max="500"
              step="10"
              value={movement?.orbitRadius || 100}
              onChange={(e) => onUpdate(index, {
                movement: { ...action.movement, orbitRadius: parseInt(e.target.value) } as any
              })}
              style={{
                width: '100%',
                padding: DESIGN_TOKENS.spacing[2],
                border: `2px solid ${DESIGN_TOKENS.colors.success[200]}`,
                borderRadius: DESIGN_TOKENS.borderRadius.lg,
                fontSize: DESIGN_TOKENS.typography.fontSize.base
              }}
            />
          </div>

          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              速度（ピクセル/秒）
            </label>
            <input
              type="number"
              min={MOVEMENT_RANGES.speed.min}
              max={MOVEMENT_RANGES.speed.max}
              step={MOVEMENT_RANGES.speed.step}
              value={movement?.speed || MOVEMENT_DEFAULTS.speed}
              onChange={(e) => onUpdate(index, { 
                movement: { ...action.movement, speed: parseInt(e.target.value) } as any
              })}
              style={{
                width: '100%',
                padding: DESIGN_TOKENS.spacing[2],
                border: `2px solid ${DESIGN_TOKENS.colors.success[200]}`,
                borderRadius: DESIGN_TOKENS.borderRadius.lg,
                fontSize: DESIGN_TOKENS.typography.fontSize.base
              }}
            />
          </div>

          <div style={{
            padding: DESIGN_TOKENS.spacing[3],
            backgroundColor: DESIGN_TOKENS.colors.primary[50],
            border: `1px solid ${DESIGN_TOKENS.colors.primary[200]}`,
            borderRadius: DESIGN_TOKENS.borderRadius.lg,
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            color: DESIGN_TOKENS.colors.primary[800],
            marginBottom: DESIGN_TOKENS.spacing[4]
          }}>
            <strong>📊 設定内容:</strong><br />
            半径{movement?.orbitRadius || 100}px で、速度{movement?.speed || MOVEMENT_DEFAULTS.speed}で周回します
          </div>

          <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[2] }}>
            <ModernButton variant="outline" size="md" onClick={() => setCurrentStep('movementType')}>
              ← 戻る
            </ModernButton>
            <ModernButton variant="primary" size="md" onClick={() => setCurrentStep('confirm')} style={{ flex: 1 }}>
              次へ →
            </ModernButton>
          </div>
        </div>
      );
    }

    if (movementType === 'bounce') {
      return (
        <div>
          <h5 style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.lg,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
            color: DESIGN_TOKENS.colors.neutral[800],
            marginBottom: DESIGN_TOKENS.spacing[4]
          }}>
            バウンドのパラメータを設定
          </h5>

          <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              バウンス強度（0.0～1.0）
            </label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={movement?.bounceStrength || 0.8}
              onChange={(e) => onUpdate(index, {
                movement: { ...action.movement, bounceStrength: parseFloat(e.target.value) } as any
              })}
              style={{
                width: '100%',
                padding: DESIGN_TOKENS.spacing[2],
                border: `2px solid ${DESIGN_TOKENS.colors.success[200]}`,
                borderRadius: DESIGN_TOKENS.borderRadius.lg,
                fontSize: DESIGN_TOKENS.typography.fontSize.base
              }}
            />
          </div>

          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              速度（ピクセル/秒）
            </label>
            <input
              type="number"
              min={MOVEMENT_RANGES.speed.min}
              max={MOVEMENT_RANGES.speed.max}
              step={MOVEMENT_RANGES.speed.step}
              value={movement?.speed || MOVEMENT_DEFAULTS.speed}
              onChange={(e) => onUpdate(index, { 
                movement: { ...action.movement, speed: parseInt(e.target.value) } as any
              })}
              style={{
                width: '100%',
                padding: DESIGN_TOKENS.spacing[2],
                border: `2px solid ${DESIGN_TOKENS.colors.success[200]}`,
                borderRadius: DESIGN_TOKENS.borderRadius.lg,
                fontSize: DESIGN_TOKENS.typography.fontSize.base
              }}
            />
          </div>

          <div style={{
            padding: DESIGN_TOKENS.spacing[3],
            backgroundColor: DESIGN_TOKENS.colors.primary[50],
            border: `1px solid ${DESIGN_TOKENS.colors.primary[200]}`,
            borderRadius: DESIGN_TOKENS.borderRadius.lg,
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            color: DESIGN_TOKENS.colors.primary[800],
            marginBottom: DESIGN_TOKENS.spacing[4]
          }}>
            <strong>📊 設定内容:</strong><br />
            バウンス強度{movement?.bounceStrength || 0.8}で、速度{movement?.speed || MOVEMENT_DEFAULTS.speed}でバウンドします
          </div>

          <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[2] }}>
            <ModernButton variant="outline" size="md" onClick={() => setCurrentStep('movementType')}>
              ← 戻る
            </ModernButton>
            <ModernButton variant="primary" size="md" onClick={() => setCurrentStep('confirm')} style={{ flex: 1 }}>
              次へ →
            </ModernButton>
          </div>
        </div>
      );
    }

    if (movementType === 'followDrag') {
      return (
        <div>
          <h5 style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.lg,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
            color: DESIGN_TOKENS.colors.neutral[800],
            marginBottom: DESIGN_TOKENS.spacing[4]
          }}>
            ドラッグ追従のパラメータを設定
          </h5>

          <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              減衰率（0.0～1.0）
            </label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={movement?.damping || 0.1}
              onChange={(e) => onUpdate(index, {
                movement: { ...action.movement, damping: parseFloat(e.target.value) } as any
              })}
              style={{
                width: '100%',
                padding: DESIGN_TOKENS.spacing[2],
                border: `2px solid ${DESIGN_TOKENS.colors.success[200]}`,
                borderRadius: DESIGN_TOKENS.borderRadius.lg,
                fontSize: DESIGN_TOKENS.typography.fontSize.base
              }}
            />
            <div style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.neutral[600],
              marginTop: DESIGN_TOKENS.spacing[1]
            }}>
              小さいほど滑らか、大きいほど素早く追従
            </div>
          </div>

          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'flex',
              alignItems: 'center',
              gap: DESIGN_TOKENS.spacing[2]
            }}>
              <input
                type="checkbox"
                checked={movement?.constrainToBounds !== false}
                onChange={(e) => onUpdate(index, {
                  movement: { ...action.movement, constrainToBounds: e.target.checked } as any
                })}
              />
              画面内に制限
            </label>
            <div style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.neutral[600],
              marginLeft: DESIGN_TOKENS.spacing[6]
            }}>
              オンにすると画面外に出ません
            </div>
          </div>

          <div style={{
            padding: DESIGN_TOKENS.spacing[3],
            backgroundColor: DESIGN_TOKENS.colors.primary[50],
            border: `1px solid ${DESIGN_TOKENS.colors.primary[200]}`,
            borderRadius: DESIGN_TOKENS.borderRadius.lg,
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            color: DESIGN_TOKENS.colors.primary[800],
            marginBottom: DESIGN_TOKENS.spacing[4]
          }}>
            <strong>📊 設定内容:</strong><br />
            減衰率{movement?.damping || 0.1}でドラッグ位置に追従します
            {movement?.constrainToBounds !== false && '（画面内制限あり）'}
          </div>

          <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[2] }}>
            <ModernButton variant="outline" size="md" onClick={() => setCurrentStep('movementType')}>
              ← 戻る
            </ModernButton>
            <ModernButton variant="primary" size="md" onClick={() => setCurrentStep('confirm')} style={{ flex: 1 }}>
              次へ →
            </ModernButton>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderConfirmStep = () => {
    const movementType = action.movement?.type as string;
    const movement = action.movement as any;

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
              移動タイプ
            </div>
            <div style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.base,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
              color: DESIGN_TOKENS.colors.neutral[800]
            }}>
              {movementTypeLabel}
            </div>
          </div>

          {movementType === 'straight' && movement?.direction && (
            <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
              <div style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                color: DESIGN_TOKENS.colors.neutral[600],
                marginBottom: DESIGN_TOKENS.spacing[1]
              }}>
                移動方向
              </div>
              <div style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                color: DESIGN_TOKENS.colors.neutral[700]
              }}>
                {DIRECTION_OPTIONS.find(d => d.value === movement?.direction)?.icon}{' '}
                {DIRECTION_OPTIONS.find(d => d.value === movement?.direction)?.label || '下'}
              </div>
            </div>
          )}

          {(movementType === 'straight' && movement?.target) || ['teleport', 'approach'].includes(movementType || '') ? (
            <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
              <div style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                color: DESIGN_TOKENS.colors.neutral[600],
                marginBottom: DESIGN_TOKENS.spacing[1]
              }}>
                移動先座標
              </div>
              <div style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                color: DESIGN_TOKENS.colors.neutral[700]
              }}>
                ({coordinate.x.toFixed(2)}, {coordinate.y.toFixed(2)})
              </div>
            </div>
          ) : null}

          {movementType === 'swap' && (
            <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
              <div style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                color: DESIGN_TOKENS.colors.neutral[600],
                marginBottom: DESIGN_TOKENS.spacing[1]
              }}>
                入れ替え対象
              </div>
              <div style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                color: DESIGN_TOKENS.colors.neutral[700]
              }}>
                {objectOptions.find(o => o.value === movement?.targetObjectId)?.label || '未選択'}
              </div>
            </div>
          )}

          {movementType === 'wander' && (
            <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
              <div style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                color: DESIGN_TOKENS.colors.neutral[600],
                marginBottom: DESIGN_TOKENS.spacing[1]
              }}>
                徘徊半径
              </div>
              <div style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                color: DESIGN_TOKENS.colors.neutral[700]
              }}>
                {movement?.wanderRadius || 100} ピクセル
              </div>
            </div>
          )}

          {movementType === 'orbit' && (
            <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
              <div style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                color: DESIGN_TOKENS.colors.neutral[600],
                marginBottom: DESIGN_TOKENS.spacing[1]
              }}>
                周回半径
              </div>
              <div style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                color: DESIGN_TOKENS.colors.neutral[700]
              }}>
                {movement?.orbitRadius || 100} ピクセル
              </div>
            </div>
          )}

          {movementType === 'bounce' && (
            <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
              <div style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                color: DESIGN_TOKENS.colors.neutral[600],
                marginBottom: DESIGN_TOKENS.spacing[1]
              }}>
                バウンス強度
              </div>
              <div style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                color: DESIGN_TOKENS.colors.neutral[700]
              }}>
                {movement?.bounceStrength || 0.8}
              </div>
            </div>
          )}

          {movementType === 'followDrag' && (
            <>
              <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
                <div style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.neutral[600],
                  marginBottom: DESIGN_TOKENS.spacing[1]
                }}>
                  減衰率
                </div>
                <div style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  color: DESIGN_TOKENS.colors.neutral[700]
                }}>
                  {movement?.damping || 0.1}
                </div>
              </div>
              <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
                <div style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.neutral[600],
                  marginBottom: DESIGN_TOKENS.spacing[1]
                }}>
                  画面内制限
                </div>
                <div style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  color: DESIGN_TOKENS.colors.neutral[700]
                }}>
                  {movement?.constrainToBounds !== false ? 'あり' : 'なし'}
                </div>
              </div>
            </>
          )}

          {movementType !== 'stop' && movementType !== 'teleport' && movementType !== 'followDrag' && (
            <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
              <div style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                color: DESIGN_TOKENS.colors.neutral[600],
                marginBottom: DESIGN_TOKENS.spacing[1]
              }}>
                速度
              </div>
              <div style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                color: DESIGN_TOKENS.colors.neutral[700]
              }}>
                {movement?.speed || MOVEMENT_DEFAULTS.speed} ピクセル/秒
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[2] }}>
          <ModernButton
            variant="outline"
            size="md"
            onClick={() => {
              if (movementType === 'stop') {
                setCurrentStep('movementType');
              } else {
                setCurrentStep('parameter');
              }
            }}
          >
            ← 戻る
          </ModernButton>
          <ModernButton
            variant="primary"
            size="md"
            onClick={() => {
              onShowNotification('success', '移動アクションを設定しました');
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
          <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize['2xl'] }}>🏃</span>
          移動アクション
        </h4>
        <p style={{
          margin: 0,
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          color: DESIGN_TOKENS.colors.neutral[600]
        }}>
          オブジェクトの移動方法を設定
        </p>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: DESIGN_TOKENS.spacing[6],
        padding: DESIGN_TOKENS.spacing[4],
        backgroundColor: DESIGN_TOKENS.colors.neutral[50],
        borderRadius: DESIGN_TOKENS.borderRadius.lg
      }}>
        {steps.map((step, idx) => (
          <React.Fragment key={step.id}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: DESIGN_TOKENS.spacing[2],
              flex: 1
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: idx <= currentStepIndex 
                  ? DESIGN_TOKENS.colors.success[500] 
                  : DESIGN_TOKENS.colors.neutral[300],
                color: DESIGN_TOKENS.colors.neutral[0],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                transition: 'all 0.3s ease'
              }}>
                {step.icon}
              </div>
              <div style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                fontWeight: idx === currentStepIndex 
                  ? DESIGN_TOKENS.typography.fontWeight.semibold 
                  : DESIGN_TOKENS.typography.fontWeight.normal,
                color: idx === currentStepIndex 
                  ? DESIGN_TOKENS.colors.success[600] 
                  : DESIGN_TOKENS.colors.neutral[600]
              }}>
                {step.label}
              </div>
            </div>
            {idx < steps.length - 1 && (
              <div style={{
                height: '2px',
                flex: 1,
                backgroundColor: idx < currentStepIndex 
                  ? DESIGN_TOKENS.colors.success[500] 
                  : DESIGN_TOKENS.colors.neutral[300],
                transition: 'all 0.3s ease'
              }} />
            )}
          </React.Fragment>
        ))}
      </div>

      <div>
        {currentStep === 'movementType' && renderMovementTypeStep()}
        {currentStep === 'parameter' && renderParameterStep()}
        {currentStep === 'confirm' && renderConfirmStep()}
      </div>
    </ModernCard>
  );
};