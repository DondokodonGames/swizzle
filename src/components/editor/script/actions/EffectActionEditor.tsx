// src/components/editor/script/actions/EffectActionEditor.tsx
// Phase 3-3 Item 7: 3ステップフロー版（数値入力方式）
// 参考: ObjectStateConditionEditor.tsx
// TypeScriptエラー修正版（全機能保持）

import React, { useState, useMemo } from 'react';
import { GameAction, EffectPattern } from '../../../../types/editor/GameScript';
import { GameProject } from '../../../../types/editor/GameProject';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { ModernCard } from '../../../ui/ModernCard';
import { ModernButton } from '../../../ui/ModernButton';

interface EffectActionEditorProps {
  action: GameAction;
  project: GameProject;
  index: number;
  onUpdate: (index: number, updates: Partial<GameAction>) => void;
  onShowNotification?: (type: 'success' | 'error' | 'info', message: string) => void;
}

// 3つのステップ定義
type EditorStep = 'effectType' | 'parameters' | 'confirm';

// エフェクトタイプ定義
type EffectType = 'flash' | 'shake' | 'scale' | 'rotate' | 'particles';

// エフェクトタイプ選択肢（コンポーネント外で定義 - 初期化順序エラー修正）
const EFFECT_TYPE_OPTIONS = [
  { 
    value: 'flash' as EffectType,
    label: 'フラッシュ', 
    icon: '💫', 
    description: '一瞬光る効果',
    color: DESIGN_TOKENS.colors.warning[500],
    defaultParams: { duration: 0.3, intensity: 1.0 }
  },
  { 
    value: 'shake' as EffectType,
    label: '振動', 
    icon: '📳', 
    description: 'ブルブル揺れる',
    color: DESIGN_TOKENS.colors.error[500],
    defaultParams: { duration: 0.5, intensity: 10 }
  },
  { 
    value: 'scale' as EffectType,
    label: '拡大縮小', 
    icon: '🔍', 
    description: 'サイズが変化',
    color: DESIGN_TOKENS.colors.primary[500], // 修正: info[500] → primary[500]
    defaultParams: { duration: 0.3, intensity: 0.5, scaleAmount: 1.5 }
  },
  { 
    value: 'rotate' as EffectType,
    label: '回転', 
    icon: '🌀', 
    description: 'クルクル回る',
    color: DESIGN_TOKENS.colors.success[500],
    defaultParams: { duration: 0.5, intensity: 0.5, rotationAmount: 360 } // 修正: angle → rotationAmount
  },
  { 
    value: 'particles' as EffectType,
    label: 'パーティクル', 
    icon: '✨', 
    description: 'キラキラ効果',
    color: DESIGN_TOKENS.colors.purple[500],
    defaultParams: { duration: 1.0, intensity: 0.5, particleCount: 20 } // 修正: count → particleCount
  }
];

export const EffectActionEditor: React.FC<EffectActionEditorProps> = ({
  action,
  project: _project,
  index,
  onUpdate,
  onShowNotification
}) => {
  const [currentStep, setCurrentStep] = useState<EditorStep>('effectType');

  // オブジェクトリスト取得
  // 現在のエフェクトタイプ
  const currentEffectType: EffectType = action.type === 'effect' && action.effect?.type
    ? action.effect.type as EffectType
    : 'flash';

  // エフェクトタイプオプション
  const currentEffectOption = useMemo(() => {
    return EFFECT_TYPE_OPTIONS.find(opt => opt.value === currentEffectType);
  }, [currentEffectType]);

  // ヘルパー関数: 完全なEffectPatternを生成（TypeScriptエラー修正用）
  const getCompleteEffect = (updates: Partial<EffectPattern> = {}): EffectPattern => {
    return {
      type: currentEffectType,
      duration: 0.5,
      intensity: 0.5,
      ...((currentEffectOption?.defaultParams || {}) as Partial<EffectPattern>),
      ...(action.type === 'effect' ? action.effect : {}),
      ...updates
    } as EffectPattern;
  };

  // ステップナビゲーション
  const steps = [
    { id: 'effectType', label: 'エフェクト選択', icon: '✨' },
    { id: 'parameters', label: 'パラメータ設定', icon: '🎛️' },
    { id: 'confirm', label: '確認', icon: '✅' }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  // ステップ1: エフェクトタイプ選択
  const renderEffectTypeStep = () => (
    <div>
      <h5 style={{
        fontSize: DESIGN_TOKENS.typography.fontSize.lg,
        fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
        color: DESIGN_TOKENS.colors.neutral[800],
        marginBottom: DESIGN_TOKENS.spacing[4]
      }}>
        どのエフェクトを実行しますか？
      </h5>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: DESIGN_TOKENS.spacing[3]
      }}>
        {EFFECT_TYPE_OPTIONS.map((option) => {
          const isSelected = currentEffectType === option.value;
          
          return (
            <ModernButton
              key={option.value}
              variant={isSelected ? 'primary' : 'outline'}
              size="lg"
              onClick={() => {
                // 修正: getCompleteEffect()を使用
                const newEffect = getCompleteEffect({
                  type: option.value,
                  ...option.defaultParams
                });
                
                onUpdate(index, {
                  type: 'effect',
                  targetId: action.type === 'effect' ? action.targetId || 'this' : 'this',
                  effect: newEffect
                });
                setCurrentStep('parameters');
                if (onShowNotification) {
                  onShowNotification('success', `「${option.label}」を選択しました`);
                }
              }}
              style={{
                padding: DESIGN_TOKENS.spacing[4],
                flexDirection: 'column',
                alignItems: 'center',
                gap: DESIGN_TOKENS.spacing[2],
                backgroundColor: isSelected 
                  ? option.color
                  : DESIGN_TOKENS.colors.neutral[0],
                borderColor: isSelected
                  ? option.color
                  : DESIGN_TOKENS.colors.neutral[300],
                color: isSelected
                  ? DESIGN_TOKENS.colors.neutral[0]
                  : DESIGN_TOKENS.colors.neutral[800],
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ fontSize: '48px' }}>{option.icon}</span>
              <div>
                <div style={{ 
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                  marginBottom: DESIGN_TOKENS.spacing[1]
                }}>
                  {option.label}
                </div>
                <div style={{ 
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs, 
                  opacity: isSelected ? 0.9 : 0.7
                }}>
                  {option.description}
                </div>
              </div>
            </ModernButton>
          );
        })}
      </div>
    </div>
  );

  // ステップ2: パラメータ設定
  const renderParametersStep = () => {
    const effectOption = EFFECT_TYPE_OPTIONS.find(opt => opt.value === currentEffectType);
    
    return (
      <div>
        <h5 style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.lg,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
          color: DESIGN_TOKENS.colors.neutral[800],
          marginBottom: DESIGN_TOKENS.spacing[2]
        }}>
          {effectOption?.label}のパラメータ設定
        </h5>
        <p style={{
          margin: 0,
          marginBottom: DESIGN_TOKENS.spacing[4],
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          color: DESIGN_TOKENS.colors.neutral[600]
        }}>
          {effectOption?.description}
        </p>

        <div style={{
          padding: DESIGN_TOKENS.spacing[4],
          backgroundColor: DESIGN_TOKENS.colors.neutral[50],
          borderRadius: DESIGN_TOKENS.borderRadius.lg,
          marginBottom: DESIGN_TOKENS.spacing[4]
        }}>
          {/* Flash エフェクト */}
          {currentEffectType === 'flash' && (
            <>
              <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
                <label style={{
                  display: 'block',
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                  color: DESIGN_TOKENS.colors.neutral[700],
                  marginBottom: DESIGN_TOKENS.spacing[2]
                }}>
                  継続時間（秒）
                </label>
                <input
                  type="number"
                  min="0.1"
                  max="3"
                  step="0.1"
                  value={action.type === 'effect' ? action.effect?.duration || 0.3 : 0.3}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (isNaN(value)) return;
                    // 修正: getCompleteEffect()を使用
                    const newEffect = getCompleteEffect({ duration: value });
                    onUpdate(index, { effect: newEffect });
                  }}
                  style={{
                    width: '100%',
                    padding: DESIGN_TOKENS.spacing[3],
                    fontSize: DESIGN_TOKENS.typography.fontSize.base,
                    border: `2px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                    borderRadius: DESIGN_TOKENS.borderRadius.md
                  }}
                />
                <p style={{
                  margin: 0,
                  marginTop: DESIGN_TOKENS.spacing[2],
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.neutral[600]
                }}>
                  推奨: 0.1〜1.0秒
                </p>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                  color: DESIGN_TOKENS.colors.neutral[700],
                  marginBottom: DESIGN_TOKENS.spacing[2]
                }}>
                  明るさ（0.0〜2.0）
                </label>
                <input
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={action.type === 'effect' ? action.effect?.intensity || 1.0 : 1.0}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (isNaN(value)) return;
                    // 修正: getCompleteEffect()を使用
                    const newEffect = getCompleteEffect({ intensity: value });
                    onUpdate(index, { effect: newEffect });
                  }}
                  style={{
                    width: '100%',
                    padding: DESIGN_TOKENS.spacing[3],
                    fontSize: DESIGN_TOKENS.typography.fontSize.base,
                    border: `2px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                    borderRadius: DESIGN_TOKENS.borderRadius.md
                  }}
                />
                <p style={{
                  margin: 0,
                  marginTop: DESIGN_TOKENS.spacing[2],
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.neutral[600]
                }}>
                  1.0 = 標準、2.0 = 最大
                </p>
              </div>
            </>
          )}

          {/* Shake エフェクト */}
          {currentEffectType === 'shake' && (
            <>
              <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
                <label style={{
                  display: 'block',
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                  color: DESIGN_TOKENS.colors.neutral[700],
                  marginBottom: DESIGN_TOKENS.spacing[2]
                }}>
                  継続時間（秒）
                </label>
                <input
                  type="number"
                  min="0.1"
                  max="3"
                  step="0.1"
                  value={action.type === 'effect' ? action.effect?.duration || 0.5 : 0.5}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (isNaN(value)) return;
                    // 修正: getCompleteEffect()を使用
                    const newEffect = getCompleteEffect({ duration: value });
                    onUpdate(index, { effect: newEffect });
                  }}
                  style={{
                    width: '100%',
                    padding: DESIGN_TOKENS.spacing[3],
                    fontSize: DESIGN_TOKENS.typography.fontSize.base,
                    border: `2px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                    borderRadius: DESIGN_TOKENS.borderRadius.md
                  }}
                />
                <p style={{
                  margin: 0,
                  marginTop: DESIGN_TOKENS.spacing[2],
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.neutral[600]
                }}>
                  推奨: 0.2〜1.0秒
                </p>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                  color: DESIGN_TOKENS.colors.neutral[700],
                  marginBottom: DESIGN_TOKENS.spacing[2]
                }}>
                  振動の強さ（px）
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  step="1"
                  value={action.type === 'effect' ? action.effect?.intensity || 10 : 10}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (isNaN(value)) return;
                    // 修正: getCompleteEffect()を使用
                    const newEffect = getCompleteEffect({ intensity: value });
                    onUpdate(index, { effect: newEffect });
                  }}
                  style={{
                    width: '100%',
                    padding: DESIGN_TOKENS.spacing[3],
                    fontSize: DESIGN_TOKENS.typography.fontSize.base,
                    border: `2px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                    borderRadius: DESIGN_TOKENS.borderRadius.md
                  }}
                />
                <p style={{
                  margin: 0,
                  marginTop: DESIGN_TOKENS.spacing[2],
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.neutral[600]
                }}>
                  5px = 弱い、20px = 強い
                </p>
              </div>
            </>
          )}

          {/* Scale エフェクト */}
          {currentEffectType === 'scale' && (
            <>
              <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
                <label style={{
                  display: 'block',
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                  color: DESIGN_TOKENS.colors.neutral[700],
                  marginBottom: DESIGN_TOKENS.spacing[2]
                }}>
                  継続時間（秒）
                </label>
                <input
                  type="number"
                  min="0.1"
                  max="3"
                  step="0.1"
                  value={action.type === 'effect' ? action.effect?.duration || 0.3 : 0.3}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (isNaN(value)) return;
                    // 修正: getCompleteEffect()を使用
                    const newEffect = getCompleteEffect({ duration: value });
                    onUpdate(index, { effect: newEffect });
                  }}
                  style={{
                    width: '100%',
                    padding: DESIGN_TOKENS.spacing[3],
                    fontSize: DESIGN_TOKENS.typography.fontSize.base,
                    border: `2px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                    borderRadius: DESIGN_TOKENS.borderRadius.md
                  }}
                />
                <p style={{
                  margin: 0,
                  marginTop: DESIGN_TOKENS.spacing[2],
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.neutral[600]
                }}>
                  推奨: 0.2〜1.0秒
                </p>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                  color: DESIGN_TOKENS.colors.neutral[700],
                  marginBottom: DESIGN_TOKENS.spacing[2]
                }}>
                  拡大率（倍）
                </label>
                <input
                  type="number"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={action.type === 'effect' ? action.effect?.scaleAmount || 1.5 : 1.5}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (isNaN(value)) return;
                    // 修正: getCompleteEffect()を使用
                    const newEffect = getCompleteEffect({ scaleAmount: value });
                    onUpdate(index, { effect: newEffect });
                  }}
                  style={{
                    width: '100%',
                    padding: DESIGN_TOKENS.spacing[3],
                    fontSize: DESIGN_TOKENS.typography.fontSize.base,
                    border: `2px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                    borderRadius: DESIGN_TOKENS.borderRadius.md
                  }}
                />
                <p style={{
                  margin: 0,
                  marginTop: DESIGN_TOKENS.spacing[2],
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.neutral[600]
                }}>
                  1.0 = 元のサイズ、2.0 = 2倍
                </p>
              </div>
            </>
          )}

          {/* Rotate エフェクト */}
          {currentEffectType === 'rotate' && (
            <>
              <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
                <label style={{
                  display: 'block',
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                  color: DESIGN_TOKENS.colors.neutral[700],
                  marginBottom: DESIGN_TOKENS.spacing[2]
                }}>
                  継続時間（秒）
                </label>
                <input
                  type="number"
                  min="0.1"
                  max="3"
                  step="0.1"
                  value={action.type === 'effect' ? action.effect?.duration || 0.5 : 0.5}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (isNaN(value)) return;
                    // 修正: getCompleteEffect()を使用
                    const newEffect = getCompleteEffect({ duration: value });
                    onUpdate(index, { effect: newEffect });
                  }}
                  style={{
                    width: '100%',
                    padding: DESIGN_TOKENS.spacing[3],
                    fontSize: DESIGN_TOKENS.typography.fontSize.base,
                    border: `2px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                    borderRadius: DESIGN_TOKENS.borderRadius.md
                  }}
                />
                <p style={{
                  margin: 0,
                  marginTop: DESIGN_TOKENS.spacing[2],
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.neutral[600]
                }}>
                  推奨: 0.3〜1.0秒
                </p>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                  color: DESIGN_TOKENS.colors.neutral[700],
                  marginBottom: DESIGN_TOKENS.spacing[2]
                }}>
                  回転角度（度）
                </label>
                <input
                  type="number"
                  min="-720"
                  max="720"
                  step="45"
                  value={action.type === 'effect' ? action.effect?.rotationAmount || 360 : 360}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (isNaN(value)) return;
                    // 修正: getCompleteEffect()を使用、angle → rotationAmount
                    const newEffect = getCompleteEffect({ rotationAmount: value });
                    onUpdate(index, { effect: newEffect });
                  }}
                  style={{
                    width: '100%',
                    padding: DESIGN_TOKENS.spacing[3],
                    fontSize: DESIGN_TOKENS.typography.fontSize.base,
                    border: `2px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                    borderRadius: DESIGN_TOKENS.borderRadius.md
                  }}
                />
                <p style={{
                  margin: 0,
                  marginTop: DESIGN_TOKENS.spacing[2],
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.neutral[600]
                }}>
                  360度 = 1回転、負の値で逆回転
                </p>
              </div>
            </>
          )}

          {/* Particles エフェクト */}
          {currentEffectType === 'particles' && (
            <>
              <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
                <label style={{
                  display: 'block',
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                  color: DESIGN_TOKENS.colors.neutral[700],
                  marginBottom: DESIGN_TOKENS.spacing[2]
                }}>
                  継続時間（秒）
                </label>
                <input
                  type="number"
                  min="0.1"
                  max="3"
                  step="0.1"
                  value={action.type === 'effect' ? action.effect?.duration || 1.0 : 1.0}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (isNaN(value)) return;
                    // 修正: getCompleteEffect()を使用
                    const newEffect = getCompleteEffect({ duration: value });
                    onUpdate(index, { effect: newEffect });
                  }}
                  style={{
                    width: '100%',
                    padding: DESIGN_TOKENS.spacing[3],
                    fontSize: DESIGN_TOKENS.typography.fontSize.base,
                    border: `2px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                    borderRadius: DESIGN_TOKENS.borderRadius.md
                  }}
                />
                <p style={{
                  margin: 0,
                  marginTop: DESIGN_TOKENS.spacing[2],
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.neutral[600]
                }}>
                  推奨: 0.5〜2.0秒
                </p>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                  color: DESIGN_TOKENS.colors.neutral[700],
                  marginBottom: DESIGN_TOKENS.spacing[2]
                }}>
                  パーティクル数
                </label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  step="5"
                  value={action.type === 'effect' ? action.effect?.particleCount || 20 : 20}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (isNaN(value)) return;
                    // 修正: getCompleteEffect()を使用、count → particleCount
                    const newEffect = getCompleteEffect({ particleCount: value });
                    onUpdate(index, { effect: newEffect });
                  }}
                  style={{
                    width: '100%',
                    padding: DESIGN_TOKENS.spacing[3],
                    fontSize: DESIGN_TOKENS.typography.fontSize.base,
                    border: `2px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                    borderRadius: DESIGN_TOKENS.borderRadius.md
                  }}
                />
                <p style={{
                  margin: 0,
                  marginTop: DESIGN_TOKENS.spacing[2],
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.neutral[600]
                }}>
                  10個 = 控えめ、50個 = 派手
                </p>
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
            onClick={() => setCurrentStep('effectType')}
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

  // ステップ3: 確認
  const renderConfirmStep = () => {
    const effectOption = EFFECT_TYPE_OPTIONS.find(opt => opt.value === currentEffectType);
    const effect = action.type === 'effect' ? action.effect : null;

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
          backgroundColor: effectOption?.color ? `${effectOption.color}15` : DESIGN_TOKENS.colors.neutral[50],
          border: `2px solid ${effectOption?.color || DESIGN_TOKENS.colors.neutral[300]}`,
          borderRadius: DESIGN_TOKENS.borderRadius.lg,
          marginBottom: DESIGN_TOKENS.spacing[4]
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: DESIGN_TOKENS.spacing[3],
            marginBottom: DESIGN_TOKENS.spacing[4],
            paddingBottom: DESIGN_TOKENS.spacing[3],
            borderBottom: `1px solid ${effectOption?.color || DESIGN_TOKENS.colors.neutral[300]}`
          }}>
            <span style={{ fontSize: '48px' }}>{effectOption?.icon}</span>
            <div>
              <div style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.xl,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                color: DESIGN_TOKENS.colors.neutral[800]
              }}>
                {effectOption?.label}
              </div>
              <div style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                color: DESIGN_TOKENS.colors.neutral[600]
              }}>
                {effectOption?.description}
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: DESIGN_TOKENS.spacing[3]
          }}>
            <div>
              <div style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                color: DESIGN_TOKENS.colors.neutral[600],
                marginBottom: DESIGN_TOKENS.spacing[1]
              }}>
                継続時間
              </div>
              <div style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                color: DESIGN_TOKENS.colors.neutral[800]
              }}>
                {effect?.duration || 0}秒
              </div>
            </div>

            {currentEffectType === 'flash' && (
              <div>
                <div style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.neutral[600],
                  marginBottom: DESIGN_TOKENS.spacing[1]
                }}>
                  明るさ
                </div>
                <div style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                  color: DESIGN_TOKENS.colors.neutral[800]
                }}>
                  {effect?.intensity || 0}
                </div>
              </div>
            )}

            {currentEffectType === 'shake' && (
              <div>
                <div style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.neutral[600],
                  marginBottom: DESIGN_TOKENS.spacing[1]
                }}>
                  振動の強さ
                </div>
                <div style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                  color: DESIGN_TOKENS.colors.neutral[800]
                }}>
                  {effect?.intensity || 0}px
                </div>
              </div>
            )}

            {currentEffectType === 'scale' && (
              <div>
                <div style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.neutral[600],
                  marginBottom: DESIGN_TOKENS.spacing[1]
                }}>
                  拡大率
                </div>
                <div style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                  color: DESIGN_TOKENS.colors.neutral[800]
                }}>
                  {effect?.scaleAmount || 0}倍
                </div>
              </div>
            )}

            {currentEffectType === 'rotate' && (
              <div>
                <div style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.neutral[600],
                  marginBottom: DESIGN_TOKENS.spacing[1]
                }}>
                  回転角度
                </div>
                <div style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                  color: DESIGN_TOKENS.colors.neutral[800]
                }}>
                  {effect?.rotationAmount || 0}度
                </div>
              </div>
            )}

            {currentEffectType === 'particles' && (
              <div>
                <div style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.neutral[600],
                  marginBottom: DESIGN_TOKENS.spacing[1]
                }}>
                  パーティクル数
                </div>
                <div style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                  color: DESIGN_TOKENS.colors.neutral[800]
                }}>
                  {effect?.particleCount || 0}個
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ 
          display: 'flex', 
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          <ModernButton
            variant="outline"
            size="md"
            onClick={() => setCurrentStep('parameters')}
          >
            ← 戻る
          </ModernButton>
          <ModernButton
            variant="primary"
            size="md"
            onClick={() => {
              if (onShowNotification) {
                onShowNotification('success', 'エフェクト設定が完了しました！');
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
          <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize['2xl'] }}>✨</span>
          エフェクトの実行
        </h4>
        <p style={{
          margin: 0,
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          color: DESIGN_TOKENS.colors.neutral[600]
        }}>
          オブジェクトに視覚的なエフェクトを適用します
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
        {currentStep === 'effectType' && renderEffectTypeStep()}
        {currentStep === 'parameters' && renderParametersStep()}
        {currentStep === 'confirm' && renderConfirmStep()}
      </div>
    </ModernCard>
  );
};