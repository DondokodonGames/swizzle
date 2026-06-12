// src/components/editor/script/actions/GameStateActionEditor.tsx

import React from 'react';
import { GameAction } from '../../../../types/editor/GameScript';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { EditorCard, SummaryBox } from '../shared';
import { ModernButton } from '../../../ui/ModernButton';
import { COLORS, SPACING, BORDER_RADIUS } from '../ModalDesignConstants';

interface GameStateActionEditorProps {
  action: GameAction;
  index: number;
  onUpdate: (index: number, updates: Partial<GameAction>) => void;
  onShowNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

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
  const currentType = action.type === 'success' || action.type === 'failure' ||
                      action.type === 'pause' || action.type === 'restart'
    ? action.type
    : 'success';

  const handleStateTypeChange = (newType: 'success' | 'failure' | 'pause' | 'restart') => {
    const option = GAME_STATE_OPTIONS.find(opt => opt.value === newType);
    if (option) {
      onUpdate(index, option.defaultData);
      onShowNotification('success', `${option.label}に設定しました`);
    }
  };

  const currentOption = GAME_STATE_OPTIONS.find(opt => opt.value === currentType);

  return (
    <EditorCard colorTheme="action" icon="🎮" title="ゲーム状態の変更">
      {/* 状態タイプ選択 */}
      <div style={{ marginBottom: SPACING[4] }}>
        <label style={{
          fontSize: '14px',
          fontWeight: '500',
          color: COLORS.success[800],
          marginBottom: SPACING[2],
          display: 'block',
        }}>
          状態タイプ
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: SPACING[2],
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
                minHeight: '80px',
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

      {/* pause用の詳細設定 */}
      {currentType === 'pause' && (
        <div style={{
          marginBottom: SPACING[4],
          padding: SPACING[3],
          backgroundColor: DESIGN_TOKENS.colors.warning[100],
          borderRadius: BORDER_RADIUS.lg,
        }}>
          <label style={{
            fontSize: '14px',
            fontWeight: '500',
            color: DESIGN_TOKENS.colors.warning[800],
            marginBottom: SPACING[2],
            display: 'block',
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
              border: `1px solid ${DESIGN_TOKENS.colors.warning[100]}`,
              borderRadius: BORDER_RADIUS.lg,
              fontSize: '14px',
            }}
          />
          <div style={{
            fontSize: '12px',
            color: DESIGN_TOKENS.colors.warning[800],
            marginTop: SPACING[2],
          }}>
            💡 0秒で無制限ポーズ（手動再開まで停止）
          </div>
        </div>
      )}

      <SummaryBox colorTheme="action">
        <strong>✅ 現在の設定:</strong> {currentOption?.label || '未設定'}
        {currentType === 'pause' && ` / 時間: ${(action as Extract<GameAction, { type: 'pause' }>).duration || 3}秒`}
      </SummaryBox>
    </EditorCard>
  );
};
