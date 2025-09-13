// src/components/editor/script/TimeBarSelector.tsx
// Phase C Step 2-1: 時間条件詳細化 - 時間バー選択UI新規作成
// TouchConditionEditor成功パターン踏襲・purple系配色統一・DESIGN_TOKENS完全準拠

import React, { useState, useCallback } from 'react';
import { DESIGN_TOKENS } from '../../../constants/DesignSystem';
import { ModernCard } from '../../ui/ModernCard';
import { ModernButton } from '../../ui/ModernButton';

export interface TimeBarSelectorProps {
  gameDuration: number;        // ゲーム全体時間（秒）
  selectedTime?: number;       // 選択時間
  selectedRange?: {start: number, end: number}; // 範囲選択
  timeType: 'exact' | 'range' | 'interval';
  onTimeSelect: (time: number) => void;
  onRangeSelect: (range: {start: number, end: number}) => void;
  onTypeChange: (type: 'exact' | 'range' | 'interval') => void;
}

// 時間タイプ定義（TouchConditionEditorパターン踏襲）
const TIME_TYPE_OPTIONS = [
  { value: 'exact', label: '正確な時刻', icon: '⏰', description: '特定の時間に発動' },
  { value: 'range', label: '時間範囲', icon: '📏', description: '指定範囲内で発動' },
  { value: 'interval', label: '定期間隔', icon: '🔄', description: '一定間隔で繰り返し発動' }
];

export const TimeBarSelector: React.FC<TimeBarSelectorProps> = ({
  gameDuration,
  selectedTime,
  selectedRange,
  timeType,
  onTimeSelect,
  onRangeSelect,
  onTypeChange
}) => {
  // ドラッグ状態管理
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<'point' | 'start' | 'end' | null>(null);

  // 時間→プログレスバー位置変換
  const timeToPosition = useCallback((time: number) => {
    return Math.max(0, Math.min(100, (time / gameDuration) * 100));
  }, [gameDuration]);

  // プログレスバー位置→時間変換
  const positionToTime = useCallback((position: number) => {
    return Math.max(0, Math.min(gameDuration, (position / 100) * gameDuration));
  }, [gameDuration]);

  // マウス位置から時間計算
  const calculateTimeFromMouseEvent = useCallback((e: React.MouseEvent, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    return positionToTime(Math.max(0, Math.min(100, percentage)));
  }, [positionToTime]);

  // プログレスバークリック処理
  const handleBarClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) return;
    
    const time = calculateTimeFromMouseEvent(e, e.currentTarget);
    
    if (timeType === 'exact') {
      onTimeSelect(time);
    } else if (timeType === 'range') {
      if (!selectedRange) {
        onRangeSelect({ start: time, end: time + 1 });
      }
    } else if (timeType === 'interval') {
      onTimeSelect(time);
    }
  }, [isDragging, timeType, selectedRange, calculateTimeFromMouseEvent, onTimeSelect, onRangeSelect]);

  // 時間フォーマット関数
  const formatTime = useCallback((seconds: number) => {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}秒`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}分${remainingSeconds.toFixed(1)}秒`;
    }
  }, []);

  // 時間説明文生成
  const getTimeDescription = useCallback(() => {
    switch (timeType) {
      case 'exact':
        return selectedTime !== undefined 
          ? `ゲーム開始から${formatTime(selectedTime)}後に発動`
          : '時間を選択してください';
      case 'range':
        return selectedRange 
          ? `${formatTime(selectedRange.start)}〜${formatTime(selectedRange.end)}の間で発動`
          : '時間範囲を選択してください';
      case 'interval':
        return selectedTime !== undefined 
          ? `${formatTime(selectedTime)}毎に繰り返し発動`
          : '間隔時間を選択してください';
      default:
        return '';
    }
  }, [timeType, selectedTime, selectedRange, formatTime]);

  return (
    <ModernCard 
      variant="outlined" 
      size="md"
      style={{ 
        backgroundColor: DESIGN_TOKENS.colors.purple[50],
        border: `2px solid ${DESIGN_TOKENS.colors.purple[200]}`,
        marginTop: DESIGN_TOKENS.spacing[4]
      }}
    >
      <h5 style={{
        fontSize: DESIGN_TOKENS.typography.fontSize.base,
        fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
        color: DESIGN_TOKENS.colors.purple[800],
        margin: 0,
        marginBottom: DESIGN_TOKENS.spacing[4],
        display: 'flex',
        alignItems: 'center',
        gap: DESIGN_TOKENS.spacing[2]
      }}>
        <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.lg }}>⏰</span>
        時間条件詳細設定
      </h5>

      {/* 時間タイプ選択（TouchConditionEditorパターン） */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <label style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
          color: DESIGN_TOKENS.colors.purple[800],
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'block'
        }}>
          時間条件タイプ
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          {TIME_TYPE_OPTIONS.map((option) => (
            <ModernButton
              key={option.value}
              variant={timeType === option.value ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onTypeChange(option.value as any)}
              style={{
                borderColor: timeType === option.value 
                  ? DESIGN_TOKENS.colors.purple[500] 
                  : DESIGN_TOKENS.colors.purple[200],
                backgroundColor: timeType === option.value 
                  ? DESIGN_TOKENS.colors.purple[500] 
                  : 'transparent',
                color: timeType === option.value 
                  ? DESIGN_TOKENS.colors.neutral[0] 
                  : DESIGN_TOKENS.colors.purple[800],
                padding: DESIGN_TOKENS.spacing[3],
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: DESIGN_TOKENS.spacing[1]
              }}
            >
              <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.lg }}>{option.icon}</span>
              <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, fontWeight: DESIGN_TOKENS.typography.fontWeight.medium }}>
                {option.label}
              </span>
            </ModernButton>
          ))}
        </div>
      </div>

      {/* ゲーム時間情報表示 */}
      <div style={{
        marginBottom: DESIGN_TOKENS.spacing[4],
        padding: DESIGN_TOKENS.spacing[3],
        backgroundColor: DESIGN_TOKENS.colors.purple[100],
        borderRadius: DESIGN_TOKENS.borderRadius.lg,
        fontSize: DESIGN_TOKENS.typography.fontSize.sm,
        color: DESIGN_TOKENS.colors.purple[800]
      }}>
        📊 ゲーム全体時間: {formatTime(gameDuration)}
      </div>

      {/* 時間バー表示 */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <label style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
          color: DESIGN_TOKENS.colors.purple[800],
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'block'
        }}>
          時間選択バー
        </label>
        
        {/* プログレスバー本体 */}
        <div 
          style={{
            position: 'relative',
            height: '24px',
            backgroundColor: DESIGN_TOKENS.colors.purple[200],
            borderRadius: DESIGN_TOKENS.borderRadius.full,
            cursor: 'pointer',
            marginBottom: DESIGN_TOKENS.spacing[2]
          }}
          onClick={handleBarClick}
        >
          {/* 範囲表示（rangeタイプの場合） */}
          {timeType === 'range' && selectedRange && (
            <div 
              style={{
                position: 'absolute',
                left: `${timeToPosition(selectedRange.start)}%`,
                width: `${timeToPosition(selectedRange.end) - timeToPosition(selectedRange.start)}%`,
                height: '100%',
                backgroundColor: DESIGN_TOKENS.colors.purple[400],
                borderRadius: DESIGN_TOKENS.borderRadius.full,
                opacity: 0.6
              }}
            />
          )}
          
          {/* 正確な時刻ポイント（exactタイプの場合） */}
          {(timeType === 'exact' || timeType === 'interval') && selectedTime !== undefined && (
            <div 
              style={{
                position: 'absolute',
                left: `${timeToPosition(selectedTime)}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '16px',
                height: '16px',
                backgroundColor: DESIGN_TOKENS.colors.purple[600],
                borderRadius: DESIGN_TOKENS.borderRadius.full,
                border: `2px solid ${DESIGN_TOKENS.colors.neutral[0]}`,
                cursor: 'grab',
                boxShadow: DESIGN_TOKENS.shadows.md
              }}
            />
          )}
          
          {/* 範囲選択ハンドル（rangeタイプの場合） */}
          {timeType === 'range' && selectedRange && (
            <>
              {/* 開始ハンドル */}
              <div 
                style={{
                  position: 'absolute',
                  left: `${timeToPosition(selectedRange.start)}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '16px',
                  height: '16px',
                  backgroundColor: DESIGN_TOKENS.colors.purple[600],
                  borderRadius: DESIGN_TOKENS.borderRadius.full,
                  border: `2px solid ${DESIGN_TOKENS.colors.neutral[0]}`,
                  cursor: 'grab',
                  boxShadow: DESIGN_TOKENS.shadows.md
                }}
              />
              
              {/* 終了ハンドル */}
              <div 
                style={{
                  position: 'absolute',
                  left: `${timeToPosition(selectedRange.end)}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '16px',
                  height: '16px',
                  backgroundColor: DESIGN_TOKENS.colors.purple[600],
                  borderRadius: DESIGN_TOKENS.borderRadius.full,
                  border: `2px solid ${DESIGN_TOKENS.colors.neutral[0]}`,
                  cursor: 'grab',
                  boxShadow: DESIGN_TOKENS.shadows.md
                }}
              />
            </>
          )}
        </div>

        {/* 時間目盛り表示 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: DESIGN_TOKENS.typography.fontSize.xs,
          color: DESIGN_TOKENS.colors.purple[500],
          marginTop: DESIGN_TOKENS.spacing[1]
        }}>
          <span>0秒</span>
          <span>{formatTime(gameDuration / 4)}</span>
          <span>{formatTime(gameDuration / 2)}</span>
          <span>{formatTime(gameDuration * 3 / 4)}</span>
          <span>{formatTime(gameDuration)}</span>
        </div>
      </div>

      {/* 数値入力フィールド */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        {timeType === 'exact' && (
          <div>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.purple[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              正確な時刻（秒）
            </label>
            <input
              type="number"
              min="0"
              max={gameDuration}
              step="0.1"
              value={selectedTime || 0}
              onChange={(e) => onTimeSelect(parseFloat(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[3]}`,
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                border: `1px solid ${DESIGN_TOKENS.colors.purple[200]}`,
                borderRadius: DESIGN_TOKENS.borderRadius.lg,
                backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                outline: 'none'
              }}
            />
          </div>
        )}

        {timeType === 'range' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: DESIGN_TOKENS.spacing[2] }}>
            <div>
              <label style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                color: DESIGN_TOKENS.colors.purple[800],
                marginBottom: DESIGN_TOKENS.spacing[2],
                display: 'block'
              }}>
                開始時刻（秒）
              </label>
              <input
                type="number"
                min="0"
                max={gameDuration}
                step="0.1"
                value={selectedRange?.start || 0}
                onChange={(e) => {
                  const start = parseFloat(e.target.value) || 0;
                  onRangeSelect({ 
                    start, 
                    end: selectedRange?.end || start + 1 
                  });
                }}
                style={{
                  width: '100%',
                  padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[3]}`,
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  border: `1px solid ${DESIGN_TOKENS.colors.purple[200]}`,
                  borderRadius: DESIGN_TOKENS.borderRadius.lg,
                  backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                  outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                color: DESIGN_TOKENS.colors.purple[800],
                marginBottom: DESIGN_TOKENS.spacing[2],
                display: 'block'
              }}>
                終了時刻（秒）
              </label>
              <input
                type="number"
                min="0"
                max={gameDuration}
                step="0.1"
                value={selectedRange?.end || 1}
                onChange={(e) => {
                  const end = parseFloat(e.target.value) || 1;
                  onRangeSelect({ 
                    start: selectedRange?.start || 0, 
                    end 
                  });
                }}
                style={{
                  width: '100%',
                  padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[3]}`,
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  border: `1px solid ${DESIGN_TOKENS.colors.purple[200]}`,
                  borderRadius: DESIGN_TOKENS.borderRadius.lg,
                  backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                  outline: 'none'
                }}
              />
            </div>
          </div>
        )}

        {timeType === 'interval' && (
          <div>
            <label style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.purple[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              display: 'block'
            }}>
              間隔時間（秒）
            </label>
            <input
              type="number"
              min="0.1"
              max={gameDuration}
              step="0.1"
              value={selectedTime || 1}
              onChange={(e) => onTimeSelect(parseFloat(e.target.value) || 1)}
              style={{
                width: '100%',
                padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[3]}`,
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                border: `1px solid ${DESIGN_TOKENS.colors.purple[200]}`,
                borderRadius: DESIGN_TOKENS.borderRadius.lg,
                backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                outline: 'none'
              }}
            />
          </div>
        )}
      </div>

      {/* 設定説明表示（TouchConditionEditorパターン） */}
      <div style={{
        padding: DESIGN_TOKENS.spacing[3],
        backgroundColor: DESIGN_TOKENS.colors.purple[100],
        borderRadius: DESIGN_TOKENS.borderRadius.lg,
        fontSize: DESIGN_TOKENS.typography.fontSize.xs,
        color: DESIGN_TOKENS.colors.purple[800]
      }}>
        💡 設定内容: {getTimeDescription()}
      </div>
    </ModernCard>
  );
};