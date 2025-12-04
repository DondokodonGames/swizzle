// src/components/editor/script/actions/GameStateActionEditor.tsx
// Phase 1: ゲーム状態変更エディター（success/failure/pause/resume統合）
// Phase 3-1項目8: 成功/失敗時の入力欄削除、メッセージ・スコア表示も削除、完全簡素化

import React from 'react';
import { useTranslation } from 'react-i18next';
import { GameAction } from '../../../../types/editor/GameScript';
import { ModernCard } from '../../../ui/ModernCard';
import { ModernButton } from '../../../ui/ModernButton';
import { COLORS, SPACING, BORDER_RADIUS } from '../ModalDesignConstants';

interface GameStateActionEditorProps {
  action: GameAction;
  index: number;
  onUpdate: (index: number, updates: Partial<GameAction>) => void;
  onShowNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

// ゲーム状態オプション定義
const GAME_STATE_OPTIONS = [
  { 
    value: 'success', 
    label: '成功', 
    icon: '🏆', 
    description: 'ゲームクリア',
    defaultData: { type: 'success' as const, score: 100, message: 'クリア！' }
  },
  { 
    value: 'failure', 
    label: '失敗', 
    icon: '💥', 
    description: 'ゲームオーバー',
    defaultData: { type: 'failure' as const, message: 'ゲームオーバー' }
  },
  { 
    value: 'pause', 
    label: 'ポーズ', 
    icon: '⏸️', 
    description: 'ゲームを一時停止',
    defaultData: { type: 'pause' as const, duration: 3 }
  },
  { 
    value: 'restart', 
    label: '再開', 
    icon: '▶️', 
    description: 'ゲームを再開',
    defaultData: { type: 'restart' as const }
  }
] as const;

export const GameStateActionEditor: React.FC<GameStateActionEditorProps> = ({
  action,
  index,
  onUpdate,
  onShowNotification
}) => {
  const { t } = useTranslation();

  // 現在のアクション型を取得
  const currentType = action.type === 'success' || action.type === 'failure' || 
                      action.type === 'pause' || action.type === 'restart' 
    ? action.type 
    : 'success'; // デフォルト

  // 状態タイプ変更ハンドラー
  const handleStateTypeChange = (newType: 'success' | 'failure' | 'pause' | 'restart') => {
    const option = GAME_STATE_OPTIONS.find(opt => opt.value === newType);
    if (option) {
      onUpdate(index, option.defaultData);
      onShowNotification('success', `${option.label}に設定しました`);
    }
  };

  // 現在選択されているオプション
  const currentOption = GAME_STATE_OPTIONS.find(opt => opt.value === currentType);

  return (
    <ModernCard 
      variant="outlined" 
      size="md"
      style={{ 
        backgroundColor: COLORS.success[50],
        border: `2px solid ${COLORS.success[200]}`,
        marginTop: SPACING[3]
      }}
    >
      <h5 style={{
        fontSize: '16px',
        fontWeight: '600',
        color: COLORS.success[800],
        marginBottom: SPACING[4],
        display: 'flex',
        alignItems: 'center',
        gap: SPACING[2]
      }}>
        🎮 ゲーム状態の変更
      </h5>

      {/* 状態タイプ選択 */}
      <div style={{ marginBottom: SPACING[4] }}>
        <label style={{
          fontSize: '14px',
          fontWeight: '500',
          color: COLORS.success[800],
          marginBottom: SPACING[2],
          display: 'block'
        }}>
          状態タイプ
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: SPACING[2]
        }}>
          {GAME_STATE_OPTIONS.map((option) => (
            <ModernButton
              key={option.value}
              variant={currentType === option.value ? 'primary' : 'outline'}
              size="sm"
              onClick={() => handleStateTypeChange(option.value)}
              style={{
                borderColor: currentType === option.value 
                  ? COLORS.success[500] 
                  : COLORS.success[200],
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: SPACING[1],
                padding: SPACING[3],
                minHeight: '80px'
              }}
              title={option.description}
            >
              <span style={{ fontSize: '28px' }}>{option.icon}</span>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>
                {option.label}
              </span>
              <span style={{ fontSize: '11px', color: COLORS.neutral[600] }}>
                {option.description}
              </span>
            </ModernButton>
          ))}
        </div>
      </div>

      {/* ❌ Phase 3-1項目8: 成功/失敗時の入力欄を削除（デフォルト値を使用） */}
      {/* 削除: success用のスコア・メッセージ入力欄 */}
      {/* 削除: failure用のメッセージ入力欄 */}

      {/* pause用の詳細設定（ゲーム機能として必要なため保持） */}
      {currentType === 'pause' && (
        <div style={{ 
          marginBottom: SPACING[4],
          padding: SPACING[3],
          backgroundColor: COLORS.warning[100],
          borderRadius: BORDER_RADIUS.lg
        }}>
          <label style={{
            fontSize: '14px',
            fontWeight: '500',
            color: COLORS.warning[800],
            marginBottom: SPACING[2],
            display: 'block'
          }}>
            ⏱️ ポーズ時間（秒）
          </label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={(action as Extract<GameAction, { type: 'pause' }>).duration || 3}
            onChange={(e) => onUpdate(index, { duration: parseFloat(e.target.value) || 3 })}
            style={{
              width: '100%',
              padding: SPACING[2],
              border: `1px solid ${COLORS.warning[100]}`,
              borderRadius: BORDER_RADIUS.lg,
              fontSize: '14px'
            }}
          />
          <div style={{ 
            fontSize: '12px', 
            color: COLORS.warning[800], 
            marginTop: SPACING[2] 
          }}>
            💡 0秒で無制限ポーズ（手動再開まで停止）
          </div>
        </div>
      )}

      {/* 設定概要（完全簡素化：状態タイプ名のみ、ポーズ時のみ時間表示） */}
      <div style={{
        padding: SPACING[3],
        backgroundColor: COLORS.success[100],
        borderRadius: BORDER_RADIUS.lg,
        fontSize: '13px',
        color: COLORS.success[800]
      }}>
        <strong>✅ 現在の設定:</strong> {currentOption?.label || '未設定'}
        {currentType === 'pause' && ` / 時間: ${(action as Extract<GameAction, { type: 'pause' }>).duration || 3}秒`}
      </div>
    </ModernCard>
  );
};