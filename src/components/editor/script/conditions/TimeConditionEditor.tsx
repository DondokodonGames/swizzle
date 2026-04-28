// src/components/editor/script/conditions/TimeConditionEditor.tsx
// Phase 3-3-1完了版: 3ステップフロー + 1本レンジスライダー統合

import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { TriggerCondition } from '../../../../types/editor/GameScript';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { ModernCard } from '../../../ui/ModernCard';
import { ModernButton } from '../../../ui/ModernButton';
import { getTimeConditionOptions } from '../constants/TimeConstants';

interface TimeConditionEditorProps {
  condition: TriggerCondition & { type: 'time' };
  index: number;
  onUpdate: (index: number, updates: Partial<TriggerCondition>) => void;
  onShowNotification?: (type: 'success' | 'error' | 'info', message: string) => void;
  gameDuration?: number;
}

type EditorStep = 'timeType' | 'parameter' | 'confirm';

export const TimeConditionEditor: React.FC<TimeConditionEditorProps> = ({
  condition,
  index,
  onUpdate,
  onShowNotification,
  gameDuration = 30
}) => {
  const { t: _t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<EditorStep>('timeType');
  const timeCondition = condition;

  const TIME_CONDITION_OPTIONS = useMemo(() => getTimeConditionOptions(), []);

  const steps = [
    { id: 'timeType', label: '時間タイプ', icon: '⏰' },
    { id: 'parameter', label: 'パラメータ', icon: '🎯' },
    { id: 'confirm', label: '確認', icon: '✅' }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const timeTypeLabel = TIME_CONDITION_OPTIONS.find(
    opt => opt.value === timeCondition.timeType
  )?.label || '未設定';

  // ダブルレンジスライダーのコンポーネント
  const DoubleRangeSlider: React.FC<{
    min: number;
    max: number;
    valueMin: number;
    valueMax: number;
    onChange: (min: number, max: number) => void;
  }> = ({ min, max, valueMin, valueMax, onChange }) => {
    const [isDraggingMin, setIsDraggingMin] = useState(false);
    const [isDraggingMax, setIsDraggingMax] = useState(false);

    const handleMinChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const newMin = parseFloat(e.target.value);
      if (newMin < valueMax - 0.1) {
        onChange(newMin, valueMax);
      }
    }, [valueMax, onChange]);

    const handleMaxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const newMax = parseFloat(e.target.value);
      if (newMax > valueMin + 0.1) {
        onChange(valueMin, newMax);
      }
    }, [valueMin, onChange]);

    const minPercent = ((valueMin - min) / (max - min)) * 100;
    const maxPercent = ((valueMax - min) / (max - min)) * 100;

    return (
      <div style={{ position: 'relative', height: '60px' }}>
        {/* 背景トラック */}
        <div style={{
          position: 'absolute',
          top: '26px',
          left: '0',
          right: '0',
          height: '8px',
          backgroundColor: DESIGN_TOKENS.colors.purple[200],
          borderRadius: DESIGN_TOKENS.borderRadius.full
        }} />

        {/* アクティブ範囲 */}
        <div style={{
          position: 'absolute',
          top: '26px',
          left: `${minPercent}%`,
          width: `${maxPercent - minPercent}%`,
          height: '8px',
          backgroundColor: DESIGN_TOKENS.colors.purple[500],
          borderRadius: DESIGN_TOKENS.borderRadius.full
        }} />

        {/* 最小値スライダー */}
        <input
          type="range"
          min={min}
          max={max}
          step="0.1"
          value={valueMin}
          onChange={handleMinChange}
          onMouseDown={() => setIsDraggingMin(true)}
          onMouseUp={() => setIsDraggingMin(false)}
          onTouchStart={() => setIsDraggingMin(true)}
          onTouchEnd={() => setIsDraggingMin(false)}
          style={{
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '60px',
            margin: '0',
            padding: '0',
            opacity: 0,
            cursor: 'pointer',
            zIndex: isDraggingMin ? 5 : 3,
            pointerEvents: 'all'
          }}
        />

        {/* 最大値スライダー */}
        <input
          type="range"
          min={min}
          max={max}
          step="0.1"
          value={valueMax}
          onChange={handleMaxChange}
          onMouseDown={() => setIsDraggingMax(true)}
          onMouseUp={() => setIsDraggingMax(false)}
          onTouchStart={() => setIsDraggingMax(true)}
          onTouchEnd={() => setIsDraggingMax(false)}
          style={{
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '60px',
            margin: '0',
            padding: '0',
            opacity: 0,
            cursor: 'pointer',
            zIndex: isDraggingMax ? 5 : 4,
            pointerEvents: 'all'
          }}
        />

        {/* 最小値サム */}
        <div style={{
          position: 'absolute',
          top: '18px',
          left: `calc(${minPercent}% - 12px)`,
          width: '24px',
          height: '24px',
          backgroundColor: DESIGN_TOKENS.colors.purple[500],
          border: `3px solid ${DESIGN_TOKENS.colors.neutral[0]}`,
          borderRadius: '50%',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          cursor: 'pointer',
          zIndex: 2,
          pointerEvents: 'none'
        }} />

        {/* 最大値サム */}
        <div style={{
          position: 'absolute',
          top: '18px',
          left: `calc(${maxPercent}% - 12px)`,
          width: '24px',
          height: '24px',
          backgroundColor: DESIGN_TOKENS.colors.purple[500],
          border: `3px solid ${DESIGN_TOKENS.colors.neutral[0]}`,
          borderRadius: '50%',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          cursor: 'pointer',
          zIndex: 2,
          pointerEvents: 'none'
        }} />

        {/* 値表示 */}
        <div style={{
          position: 'absolute',
          top: '45px',
          left: '0',
          right: '0',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: DESIGN_TOKENS.typography.fontSize.xs,
          color: DESIGN_TOKENS.colors.purple[600],
          fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold
        }}>
          <span>{valueMin.toFixed(1)}秒</span>
          <span>{valueMax.toFixed(1)}秒</span>
        </div>
      </div>
    );
  };

  const renderTimeTypeStep = () => (
    <div>
      <h5 style={{
        fontSize: DESIGN_TOKENS.typography.fontSize.lg,
        fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
        color: DESIGN_TOKENS.colors.neutral[800],
        marginBottom: DESIGN_TOKENS.spacing[4]
      }}>
        どのタイミングで実行しますか？
      </h5>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: DESIGN_TOKENS.spacing[3]
      }}>
        {TIME_CONDITION_OPTIONS.map((option) => (
          <ModernButton
            key={option.value}
            variant={timeCondition.timeType === option.value ? 'primary' : 'outline'}
            size="lg"
            onClick={() => {
              const updates: any = { timeType: option.value };
              
              // デフォルト値を設定
              if (option.value === 'exact') {
                updates.seconds = 3;
              } else if (option.value === 'range') {
                updates.range = { min: 2, max: 5 };
              } else if (option.value === 'interval') {
                updates.interval = 2;
              }
              
              onUpdate(index, updates);
              setCurrentStep('parameter');
            }}
            style={{
              padding: DESIGN_TOKENS.spacing[4],
              flexDirection: 'column',
              alignItems: 'center',
              gap: DESIGN_TOKENS.spacing[2],
              backgroundColor: timeCondition.timeType === option.value 
                ? DESIGN_TOKENS.colors.purple[500] 
                : DESIGN_TOKENS.colors.neutral[0],
              borderColor: timeCondition.timeType === option.value
                ? DESIGN_TOKENS.colors.purple[500]
                : DESIGN_TOKENS.colors.purple[200],
              color: timeCondition.timeType === option.value
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
                opacity: 0.8,
                marginTop: DESIGN_TOKENS.spacing[1]
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
    const timeType = timeCondition.timeType;

    if (timeType === 'exact') {
      return (
        <div>
          <h5 style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.lg,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
            color: DESIGN_TOKENS.colors.neutral[800],
            marginBottom: DESIGN_TOKENS.spacing[4]
          }}>
            正確な実行時刻を設定
          </h5>

          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.purple[800],
              marginBottom: DESIGN_TOKENS.spacing[3],
              display: 'block'
            }}>
              実行時刻: {timeCondition.seconds || 3} 秒後
            </label>
            <input
              type="range"
              min="0.1"
              max={gameDuration}
              step="0.1"
              value={timeCondition.seconds || 3}
              onChange={(e) => onUpdate(index, { seconds: parseFloat(e.target.value) })}
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: DESIGN_TOKENS.colors.purple[200],
                borderRadius: DESIGN_TOKENS.borderRadius.full,
                outline: 'none',
                cursor: 'pointer',
                appearance: 'none',
                WebkitAppearance: 'none'
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.purple[500],
              marginTop: DESIGN_TOKENS.spacing[2]
            }}>
              <span>0秒</span>
              <span>{gameDuration}秒</span>
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
            ゲーム開始から {timeCondition.seconds || 3} 秒後に1回だけ実行されます
          </div>

          <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[2] }}>
            <ModernButton variant="outline" size="md" onClick={() => setCurrentStep('timeType')}>
              ← 戻る
            </ModernButton>
            <ModernButton variant="primary" size="md" onClick={() => setCurrentStep('confirm')} style={{ flex: 1 }}>
              次へ →
            </ModernButton>
          </div>
        </div>
      );
    }

    if (timeType === 'range') {
      return (
        <div>
          <h5 style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.lg,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
            color: DESIGN_TOKENS.colors.neutral[800],
            marginBottom: DESIGN_TOKENS.spacing[4]
          }}>
            実行する時間範囲を設定
          </h5>

          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.purple[800],
              marginBottom: DESIGN_TOKENS.spacing[3],
              display: 'block'
            }}>
              実行時間範囲: {timeCondition.range?.min || 2}秒 ～ {timeCondition.range?.max || 5}秒
            </label>

            <DoubleRangeSlider
              min={0}
              max={gameDuration}
              valueMin={timeCondition.range?.min || 2}
              valueMax={timeCondition.range?.max || 5}
              onChange={(min, max) => onUpdate(index, { range: { min, max } })}
            />

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.purple[500],
              marginTop: DESIGN_TOKENS.spacing[4]
            }}>
              <span>0秒</span>
              <span>{gameDuration}秒</span>
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
            {timeCondition.range?.min || 2}秒から{timeCondition.range?.max || 5}秒の間、条件が満たされた時に実行されます
          </div>

          <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[2] }}>
            <ModernButton variant="outline" size="md" onClick={() => setCurrentStep('timeType')}>
              ← 戻る
            </ModernButton>
            <ModernButton variant="primary" size="md" onClick={() => setCurrentStep('confirm')} style={{ flex: 1 }}>
              次へ →
            </ModernButton>
          </div>
        </div>
      );
    }

    if (timeType === 'interval') {
      return (
        <div>
          <h5 style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.lg,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
            color: DESIGN_TOKENS.colors.neutral[800],
            marginBottom: DESIGN_TOKENS.spacing[4]
          }}>
            実行間隔を設定
          </h5>

          <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.purple[800],
              marginBottom: DESIGN_TOKENS.spacing[3],
              display: 'block'
            }}>
              実行間隔: {timeCondition.interval || 2} 秒ごと
            </label>
            <input
              type="range"
              min="0.1"
              max="10"
              step="0.1"
              value={timeCondition.interval || 2}
              onChange={(e) => onUpdate(index, { interval: parseFloat(e.target.value) })}
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: DESIGN_TOKENS.colors.purple[200],
                borderRadius: DESIGN_TOKENS.borderRadius.full,
                outline: 'none',
                cursor: 'pointer',
                appearance: 'none',
                WebkitAppearance: 'none'
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.purple[500],
              marginTop: DESIGN_TOKENS.spacing[2]
            }}>
              <span>0.1秒</span>
              <span>10秒</span>
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
            {timeCondition.interval || 2}秒ごとに繰り返し実行されます
          </div>

          <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[2] }}>
            <ModernButton variant="outline" size="md" onClick={() => setCurrentStep('timeType')}>
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
    const timeType = timeCondition.timeType;

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
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
            <div style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.neutral[600],
              marginBottom: DESIGN_TOKENS.spacing[1]
            }}>
              時間タイプ
            </div>
            <div style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.base,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
              color: DESIGN_TOKENS.colors.neutral[800]
            }}>
              {TIME_CONDITION_OPTIONS.find(opt => opt.value === timeType)?.icon}{' '}
              {timeTypeLabel}
            </div>
          </div>

          {timeType === 'exact' && (
            <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
              <div style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                color: DESIGN_TOKENS.colors.neutral[600],
                marginBottom: DESIGN_TOKENS.spacing[1]
              }}>
                実行時刻
              </div>
              <div style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                color: DESIGN_TOKENS.colors.neutral[700]
              }}>
                ゲーム開始から {timeCondition.seconds || 3} 秒後
              </div>
            </div>
          )}

          {timeType === 'range' && (
            <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
              <div style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                color: DESIGN_TOKENS.colors.neutral[600],
                marginBottom: DESIGN_TOKENS.spacing[1]
              }}>
                実行時間範囲
              </div>
              <div style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                color: DESIGN_TOKENS.colors.neutral[700]
              }}>
                {timeCondition.range?.min || 2} 秒 ～ {timeCondition.range?.max || 5} 秒
              </div>
            </div>
          )}

          {timeType === 'interval' && (
            <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
              <div style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                color: DESIGN_TOKENS.colors.neutral[600],
                marginBottom: DESIGN_TOKENS.spacing[1]
              }}>
                実行間隔
              </div>
              <div style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                color: DESIGN_TOKENS.colors.neutral[700]
              }}>
                {timeCondition.interval || 2} 秒ごと
              </div>
            </div>
          )}

          <div style={{
            marginTop: DESIGN_TOKENS.spacing[4],
            paddingTop: DESIGN_TOKENS.spacing[3],
            borderTop: `1px solid ${DESIGN_TOKENS.colors.purple[200]}`,
            fontSize: DESIGN_TOKENS.typography.fontSize.xs,
            color: DESIGN_TOKENS.colors.purple[700]
          }}>
            <strong>💡 実行タイミング:</strong><br />
            {timeType === 'exact' && `ゲーム開始から ${timeCondition.seconds || 3}秒後に1回だけ実行されます`}
            {timeType === 'range' && `${timeCondition.range?.min || 2}秒から${timeCondition.range?.max || 5}秒の間、条件が満たされた時に実行されます`}
            {timeType === 'interval' && `${timeCondition.interval || 2}秒ごとに繰り返し実行されます`}
          </div>
        </div>

        <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[2] }}>
          <ModernButton
            variant="outline"
            size="md"
            onClick={() => setCurrentStep('parameter')}
          >
            ← 戻る
          </ModernButton>
          <ModernButton
            variant="primary"
            size="md"
            onClick={() => {
              if (onShowNotification) {
                onShowNotification('success', '時間条件を設定しました');
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
        border: `2px solid ${DESIGN_TOKENS.colors.purple[200]}`,
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
          color: DESIGN_TOKENS.colors.purple[600],
          margin: 0,
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'flex',
          alignItems: 'center',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize['2xl'] }}>⏰</span>
          時間条件
        </h4>
        <p style={{
          margin: 0,
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          color: DESIGN_TOKENS.colors.neutral[600]
        }}>
          実行するタイミングを設定
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
                  ? DESIGN_TOKENS.colors.purple[500] 
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
                  ? DESIGN_TOKENS.colors.purple[600] 
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
                  ? DESIGN_TOKENS.colors.purple[500] 
                  : DESIGN_TOKENS.colors.neutral[300],
                transition: 'all 0.3s ease'
              }} />
            )}
          </React.Fragment>
        ))}
      </div>

      <div>
        {currentStep === 'timeType' && renderTimeTypeStep()}
        {currentStep === 'parameter' && renderParameterStep()}
        {currentStep === 'confirm' && renderConfirmStep()}
      </div>
    </ModernCard>
  );
};