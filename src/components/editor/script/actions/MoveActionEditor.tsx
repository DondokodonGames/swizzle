// src/components/editor/script/actions/MoveActionEditor.tsx
// Phase 3-2-3 + 3-2-4最終版v2: swap対応、stop直行修正、全9種類対応

import React, { useState, useMemo, useCallback } from 'react';
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

// 3つのステップ定義
type EditorStep = 'movementType' | 'parameter' | 'confirm';

export const MoveActionEditor: React.FC<MoveActionEditorProps> = ({
  action,
  index,
  project,
  onUpdate,
  onShowNotification
}) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<EditorStep>('movementType');

  // ✅ 背景画像URL抽出
  const backgroundUrl = useMemo(() => {
    const background = project.assets.background;
    if (!background || !background.frames || background.frames.length === 0) {
      return undefined;
    }
    return background.frames[0].dataUrl;
  }, [project.assets.background]);

  // 移動タイプオプション（全9種類）
  const MOVEMENT_TYPE_OPTIONS = useMemo(() => getMovementTypeOptions(), []);

  // オブジェクト一覧（swap用）
  const objectOptions = useMemo(() => 
    project.assets.objects.map(obj => ({
      value: obj.id,
      label: obj.name
    })),
  [project.assets.objects]);

  // ✅ target座標をCoordinate形式で取得
  const coordinate = useMemo((): Coordinate => {
    const target = action.movement?.target as any;
    if (target && typeof target === 'object' && 'x' in target && 'y' in target) {
      return {
        x: target.x || 0.5,
        y: target.y || 0.5
      };
    }
    return { x: 0.5, y: 0.5 };
  }, [action.movement?.target]);

  // ✅ Coordinate → target座標変換
  const handleCoordinateChange = useCallback((newCoord: Coordinate) => {
    onUpdate(index, {
      movement: {
        ...action.movement,
        target: {
          x: newCoord.x,
          y: newCoord.y
        }
      }
    });
  }, [index, action.movement, onUpdate]);

  // ステップナビゲーション
  const steps = [
    { id: 'movementType', label: '移動タイプ', icon: '🏃' },
    { id: 'parameter', label: 'パラメータ', icon: '🎯' },
    { id: 'confirm', label: '確認', icon: '✅' }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  // ラベル取得
  const movementTypeLabel = MOVEMENT_TYPE_OPTIONS.find(
    opt => opt.value === action.movement?.type
  )?.label || '未設定';

  // ステップ1: 移動タイプを選択
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
              // 移動タイプに応じて初期値設定
              const newMovement: any = { 
                type: option.value,
                duration: MOVEMENT_DEFAULTS.duration
              };

              if (['straight', 'teleport', 'approach'].includes(option.value)) {
                newMovement.target = { x: 0.5, y: 0.5 };
                newMovement.speed = option.value === 'teleport' ? undefined : MOVEMENT_DEFAULTS.speed;
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
                // swap: 他のオブジェクトを選択
                newMovement.targetObjectId = objectOptions[0]?.value || '';
              } else if (option.value === 'followDrag') {
                newMovement.damping = MOVEMENT_DEFAULTS.damping;
                newMovement.constrainToBounds = false;
              }

              onUpdate(index, { movement: newMovement });

              // ✅ stopの場合は確認画面へ直行
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
              <div style={{ fontWeight: DESIGN_TOKENS.typography.fontWeight.bold, fontSize: DESIGN_TOKENS.typography.fontSize.sm }}>
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

  // ステップ2: パラメータ設定（座標+数値、統合版）
  const renderParameterStep = () => {
    const movementType = action.movement?.type;
    const needsSpeed = movementType && !['stop', 'teleport', 'swap', 'followDrag'].includes(movementType);

    // straight/teleport/approach: 座標指定 + 速度/時間
    if (['straight', 'teleport', 'approach'].includes(movementType || '')) {
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

          {/* CoordinateEditor */}
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <CoordinateEditor
              value={coordinate}
              onChange={handleCoordinateChange}
              previewBackgroundUrl={backgroundUrl}
            />
          </div>

          {/* 速度設定（straightとapproachのみ） */}
          {movementType !== 'teleport' && (
            <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
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
                value={action.movement?.speed || MOVEMENT_DEFAULTS.speed}
                onChange={(e) => onUpdate(index, { 
                  movement: { 
                    ...action.movement,
                    speed: parseInt(e.target.value) 
                  } 
                })}
                style={{
                  width: '100%',
                  padding: DESIGN_TOKENS.spacing[2],
                  border: `2px solid ${DESIGN_TOKENS.colors.success[300]}`,
                  borderRadius: DESIGN_TOKENS.borderRadius.lg,
                  fontSize: DESIGN_TOKENS.typography.fontSize.base
                }}
              />
            </div>
          )}

          {/* 時間設定 */}
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              時間（秒）
            </label>
            <input
              type="number"
              min={MOVEMENT_RANGES.duration.min}
              max={MOVEMENT_RANGES.duration.max}
              step={MOVEMENT_RANGES.duration.step}
              value={action.movement?.duration || MOVEMENT_DEFAULTS.duration}
              onChange={(e) => onUpdate(index, { 
                movement: { 
                  ...action.movement,
                  duration: parseFloat(e.target.value) 
                } 
              })}
              style={{
                width: '100%',
                padding: DESIGN_TOKENS.spacing[2],
                border: `2px solid ${DESIGN_TOKENS.colors.success[300]}`,
                borderRadius: DESIGN_TOKENS.borderRadius.lg,
                fontSize: DESIGN_TOKENS.typography.fontSize.base
              }}
            />
          </div>

          {/* プレビュー説明 */}
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
            {movementType !== 'teleport' && ` 速度${action.movement?.speed || MOVEMENT_DEFAULTS.speed}で`}
            {` ${action.movement?.duration || MOVEMENT_DEFAULTS.duration}秒かけて移動します`}
          </div>

          <div style={{ 
            display: 'flex', 
            gap: DESIGN_TOKENS.spacing[2] 
          }}>
            <ModernButton
              variant="outline"
              size="md"
              onClick={() => setCurrentStep('movementType')}
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

    // swap: 他のオブジェクト選択
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

          <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
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
              value={action.movement?.targetObjectId || ''}
              onChange={(e) => onUpdate(index, {
                movement: {
                  ...action.movement,
                  targetObjectId: e.target.value
                }
              })}
              style={{
                width: '100%',
                padding: DESIGN_TOKENS.spacing[3],
                border: `2px solid ${DESIGN_TOKENS.colors.success[300]}`,
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

          {/* 時間設定 */}
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              入れ替え時間（秒）
            </label>
            <input
              type="number"
              min={MOVEMENT_RANGES.duration.min}
              max={MOVEMENT_RANGES.duration.max}
              step={MOVEMENT_RANGES.duration.step}
              value={action.movement?.duration || MOVEMENT_DEFAULTS.duration}
              onChange={(e) => onUpdate(index, { 
                movement: { 
                  ...action.movement,
                  duration: parseFloat(e.target.value) 
                } 
              })}
              style={{
                width: '100%',
                padding: DESIGN_TOKENS.spacing[2],
                border: `2px solid ${DESIGN_TOKENS.colors.success[300]}`,
                borderRadius: DESIGN_TOKENS.borderRadius.lg,
                fontSize: DESIGN_TOKENS.typography.fontSize.base
              }}
            />
          </div>

          {/* プレビュー説明 */}
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
            {action.movement?.targetObjectId 
              ? `${objectOptions.find(o => o.value === action.movement?.targetObjectId)?.label || '未選択'}と位置を入れ替えます（${action.movement?.duration || MOVEMENT_DEFAULTS.duration}秒）`
              : 'オブジェクトを選択してください'}
          </div>

          <div style={{ 
            display: 'flex', 
            gap: DESIGN_TOKENS.spacing[2] 
          }}>
            <ModernButton
              variant="outline"
              size="md"
              onClick={() => setCurrentStep('movementType')}
            >
              ← 戻る
            </ModernButton>
            <ModernButton
              variant="primary"
              size="md"
              onClick={() => setCurrentStep('confirm')}
              disabled={!action.movement?.targetObjectId}
              style={{ flex: 1 }}
            >
              次へ →
            </ModernButton>
          </div>
        </div>
      );
    }

    // wander: 徘徊半径 + 速度/時間
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

          {/* 徘徊半径 */}
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
              value={action.movement?.wanderRadius || 100}
              onChange={(e) => onUpdate(index, {
                movement: {
                  ...action.movement,
                  wanderRadius: parseInt(e.target.value)
                }
              })}
              style={{
                width: '100%',
                padding: DESIGN_TOKENS.spacing[2],
                border: `2px solid ${DESIGN_TOKENS.colors.success[300]}`,
                borderRadius: DESIGN_TOKENS.borderRadius.lg,
                fontSize: DESIGN_TOKENS.typography.fontSize.base
              }}
            />
          </div>

          {/* 速度 */}
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
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
              value={action.movement?.speed || MOVEMENT_DEFAULTS.speed}
              onChange={(e) => onUpdate(index, { 
                movement: { 
                  ...action.movement,
                  speed: parseInt(e.target.value) 
                } 
              })}
              style={{
                width: '100%',
                padding: DESIGN_TOKENS.spacing[2],
                border: `2px solid ${DESIGN_TOKENS.colors.success[300]}`,
                borderRadius: DESIGN_TOKENS.borderRadius.lg,
                fontSize: DESIGN_TOKENS.typography.fontSize.base
              }}
            />
          </div>

          {/* 時間 */}
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              時間（秒）
            </label>
            <input
              type="number"
              min={MOVEMENT_RANGES.duration.min}
              max={MOVEMENT_RANGES.duration.max}
              step={MOVEMENT_RANGES.duration.step}
              value={action.movement?.duration || MOVEMENT_DEFAULTS.duration}
              onChange={(e) => onUpdate(index, { 
                movement: { 
                  ...action.movement,
                  duration: parseFloat(e.target.value) 
                } 
              })}
              style={{
                width: '100%',
                padding: DESIGN_TOKENS.spacing[2],
                border: `2px solid ${DESIGN_TOKENS.colors.success[300]}`,
                borderRadius: DESIGN_TOKENS.borderRadius.lg,
                fontSize: DESIGN_TOKENS.typography.fontSize.base
              }}
            />
          </div>

          {/* プレビュー説明 */}
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
            半径{action.movement?.wanderRadius || 100}px の範囲を、速度{action.movement?.speed || MOVEMENT_DEFAULTS.speed}で、{action.movement?.duration || MOVEMENT_DEFAULTS.duration}秒間徘徊します
          </div>

          <div style={{ 
            display: 'flex', 
            gap: DESIGN_TOKENS.spacing[2] 
          }}>
            <ModernButton
              variant="outline"
              size="md"
              onClick={() => setCurrentStep('movementType')}
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

    // orbit: 回転半径 + 速度/時間
    if (movementType === 'orbit') {
      return (
        <div>
          <h5 style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.lg,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
            color: DESIGN_TOKENS.colors.neutral[800],
            marginBottom: DESIGN_TOKENS.spacing[4]
          }}>
            回転のパラメータを設定
          </h5>

          {/* 回転半径 */}
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              回転半径（ピクセル）
            </label>
            <input
              type="number"
              min="20"
              max="500"
              step="10"
              value={action.movement?.orbitRadius || 100}
              onChange={(e) => onUpdate(index, {
                movement: {
                  ...action.movement,
                  orbitRadius: parseInt(e.target.value)
                }
              })}
              style={{
                width: '100%',
                padding: DESIGN_TOKENS.spacing[2],
                border: `2px solid ${DESIGN_TOKENS.colors.success[300]}`,
                borderRadius: DESIGN_TOKENS.borderRadius.lg,
                fontSize: DESIGN_TOKENS.typography.fontSize.base
              }}
            />
          </div>

          {/* 速度 */}
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
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
              value={action.movement?.speed || MOVEMENT_DEFAULTS.speed}
              onChange={(e) => onUpdate(index, { 
                movement: { 
                  ...action.movement,
                  speed: parseInt(e.target.value) 
                } 
              })}
              style={{
                width: '100%',
                padding: DESIGN_TOKENS.spacing[2],
                border: `2px solid ${DESIGN_TOKENS.colors.success[300]}`,
                borderRadius: DESIGN_TOKENS.borderRadius.lg,
                fontSize: DESIGN_TOKENS.typography.fontSize.base
              }}
            />
          </div>

          {/* 時間 */}
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              時間（秒）
            </label>
            <input
              type="number"
              min={MOVEMENT_RANGES.duration.min}
              max={MOVEMENT_RANGES.duration.max}
              step={MOVEMENT_RANGES.duration.step}
              value={action.movement?.duration || MOVEMENT_DEFAULTS.duration}
              onChange={(e) => onUpdate(index, { 
                movement: { 
                  ...action.movement,
                  duration: parseFloat(e.target.value) 
                } 
              })}
              style={{
                width: '100%',
                padding: DESIGN_TOKENS.spacing[2],
                border: `2px solid ${DESIGN_TOKENS.colors.success[300]}`,
                borderRadius: DESIGN_TOKENS.borderRadius.lg,
                fontSize: DESIGN_TOKENS.typography.fontSize.base
              }}
            />
          </div>

          {/* プレビュー説明 */}
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
            半径{action.movement?.orbitRadius || 100}px で、速度{action.movement?.speed || MOVEMENT_DEFAULTS.speed}で、{action.movement?.duration || MOVEMENT_DEFAULTS.duration}秒間回転します
          </div>

          <div style={{ 
            display: 'flex', 
            gap: DESIGN_TOKENS.spacing[2] 
          }}>
            <ModernButton
              variant="outline"
              size="md"
              onClick={() => setCurrentStep('movementType')}
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

    // bounce: バウンス強度 + 速度/時間
    if (movementType === 'bounce') {
      return (
        <div>
          <h5 style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.lg,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
            color: DESIGN_TOKENS.colors.neutral[800],
            marginBottom: DESIGN_TOKENS.spacing[4]
          }}>
            バウンスのパラメータを設定
          </h5>

          {/* バウンス強度 */}
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              バウンス強度（0.1～2.0）
            </label>
            <input
              type="number"
              min="0.1"
              max="2.0"
              step="0.1"
              value={action.movement?.bounceStrength || 0.8}
              onChange={(e) => onUpdate(index, {
                movement: {
                  ...action.movement,
                  bounceStrength: parseFloat(e.target.value)
                }
              })}
              style={{
                width: '100%',
                padding: DESIGN_TOKENS.spacing[2],
                border: `2px solid ${DESIGN_TOKENS.colors.success[300]}`,
                borderRadius: DESIGN_TOKENS.borderRadius.lg,
                fontSize: DESIGN_TOKENS.typography.fontSize.base
              }}
            />
          </div>

          {/* 速度 */}
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
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
              value={action.movement?.speed || MOVEMENT_DEFAULTS.speed}
              onChange={(e) => onUpdate(index, { 
                movement: { 
                  ...action.movement,
                  speed: parseInt(e.target.value) 
                } 
              })}
              style={{
                width: '100%',
                padding: DESIGN_TOKENS.spacing[2],
                border: `2px solid ${DESIGN_TOKENS.colors.success[300]}`,
                borderRadius: DESIGN_TOKENS.borderRadius.lg,
                fontSize: DESIGN_TOKENS.typography.fontSize.base
              }}
            />
          </div>

          {/* 時間 */}
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              時間（秒）
            </label>
            <input
              type="number"
              min={MOVEMENT_RANGES.duration.min}
              max={MOVEMENT_RANGES.duration.max}
              step={MOVEMENT_RANGES.duration.step}
              value={action.movement?.duration || MOVEMENT_DEFAULTS.duration}
              onChange={(e) => onUpdate(index, { 
                movement: { 
                  ...action.movement,
                  duration: parseFloat(e.target.value) 
                } 
              })}
              style={{
                width: '100%',
                padding: DESIGN_TOKENS.spacing[2],
                border: `2px solid ${DESIGN_TOKENS.colors.success[300]}`,
                borderRadius: DESIGN_TOKENS.borderRadius.lg,
                fontSize: DESIGN_TOKENS.typography.fontSize.base
              }}
            />
          </div>

          {/* プレビュー説明 */}
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
            強度{action.movement?.bounceStrength || 0.8}で、速度{action.movement?.speed || MOVEMENT_DEFAULTS.speed}で、{action.movement?.duration || MOVEMENT_DEFAULTS.duration}秒間バウンドします
          </div>

          <div style={{ 
            display: 'flex', 
            gap: DESIGN_TOKENS.spacing[2] 
          }}>
            <ModernButton
              variant="outline"
              size="md"
              onClick={() => setCurrentStep('movementType')}
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

    // followDrag: ドラッグ追従設定
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

          {/* 減衰係数 */}
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.success[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              減衰係数（0.0～1.0、大きいほど素早く追従）
            </label>
            <input
              type="number"
              min={MOVEMENT_RANGES.damping.min}
              max={MOVEMENT_RANGES.damping.max}
              step={MOVEMENT_RANGES.damping.step}
              value={action.movement?.damping || MOVEMENT_DEFAULTS.damping}
              onChange={(e) => onUpdate(index, {
                movement: {
                  ...action.movement,
                  damping: parseFloat(e.target.value)
                }
              })}
              style={{
                width: '100%',
                padding: DESIGN_TOKENS.spacing[2],
                border: `2px solid ${DESIGN_TOKENS.colors.success[300]}`,
                borderRadius: DESIGN_TOKENS.borderRadius.lg,
                fontSize: DESIGN_TOKENS.typography.fontSize.base
              }}
            />
          </div>

          {/* 境界制約 */}
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
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
                checked={action.movement?.constrainToBounds || false}
                onChange={(e) => onUpdate(index, {
                  movement: {
                    ...action.movement,
                    constrainToBounds: e.target.checked
                  }
                })}
              />
              画面内に制限する
            </label>
          </div>

          {/* プレビュー説明 */}
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
            減衰係数{action.movement?.damping || MOVEMENT_DEFAULTS.damping}で指をドラッグに追従します
            {action.movement?.constrainToBounds && '（画面内に制限）'}
          </div>

          <div style={{ 
            display: 'flex', 
            gap: DESIGN_TOKENS.spacing[2] 
          }}>
            <ModernButton
              variant="outline"
              size="md"
              onClick={() => setCurrentStep('movementType')}
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

    return null;
  };

  // ステップ3: 確認
  const renderConfirmStep = () => {
    const movementType = action.movement?.type;

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
          {/* 移動タイプ */}
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

          {/* 座標（straight/teleport/approachの場合） */}
          {movementType && ['straight', 'teleport', 'approach'].includes(movementType) && (
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
          )}

          {/* swap対象オブジェクト */}
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
                {objectOptions.find(o => o.value === action.movement?.targetObjectId)?.label || '未選択'}
              </div>
            </div>
          )}

          {/* 徘徊半径（wanderの場合） */}
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
                {action.movement?.wanderRadius || 100}px
              </div>
            </div>
          )}

          {/* 回転半径（orbitの場合） */}
          {movementType === 'orbit' && (
            <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
              <div style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                color: DESIGN_TOKENS.colors.neutral[600],
                marginBottom: DESIGN_TOKENS.spacing[1]
              }}>
                回転半径
              </div>
              <div style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                color: DESIGN_TOKENS.colors.neutral[700]
              }}>
                {action.movement?.orbitRadius || 100}px
              </div>
            </div>
          )}

          {/* バウンス強度（bounceの場合） */}
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
                {action.movement?.bounceStrength || 0.8}
              </div>
            </div>
          )}

          {/* 減衰係数（followDragの場合） */}
          {movementType === 'followDrag' && (
            <>
              <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
                <div style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.neutral[600],
                  marginBottom: DESIGN_TOKENS.spacing[1]
                }}>
                  減衰係数
                </div>
                <div style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  color: DESIGN_TOKENS.colors.neutral[700]
                }}>
                  {action.movement?.damping || MOVEMENT_DEFAULTS.damping}
                </div>
              </div>
              <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
                <div style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.neutral[600],
                  marginBottom: DESIGN_TOKENS.spacing[1]
                }}>
                  境界制約
                </div>
                <div style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  color: DESIGN_TOKENS.colors.neutral[700]
                }}>
                  {action.movement?.constrainToBounds ? '画面内に制限' : '制限なし'}
                </div>
              </div>
            </>
          )}

          {/* 速度（stop/teleport/swap/followDrag以外） */}
          {movementType && !['stop', 'teleport', 'swap', 'followDrag'].includes(movementType) && (
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
                {action.movement?.speed || MOVEMENT_DEFAULTS.speed} ピクセル/秒
              </div>
            </div>
          )}

          {/* 時間（stop/followDrag以外） */}
          {movementType && !['stop', 'followDrag'].includes(movementType) && (
            <div>
              <div style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                color: DESIGN_TOKENS.colors.neutral[600],
                marginBottom: DESIGN_TOKENS.spacing[1]
              }}>
                時間
              </div>
              <div style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                color: DESIGN_TOKENS.colors.neutral[700]
              }}>
                {action.movement?.duration || MOVEMENT_DEFAULTS.duration}秒
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
              // stopの場合はmovementTypeへ、それ以外はparameterへ
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
        {currentStep === 'movementType' && renderMovementTypeStep()}
        {currentStep === 'parameter' && renderParameterStep()}
        {currentStep === 'confirm' && renderConfirmStep()}
      </div>
    </ModernCard>
  );
};