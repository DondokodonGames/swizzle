// src/components/editor/script/conditions/GameStateConditionEditor.tsx
// Phase E Step 0: ゲーム状態条件詳細設定コンポーネント
// TouchConditionEditor.tsx成功パターン完全踏襲

import React from 'react';
import { TriggerCondition } from '../../../../types/editor/GameScript';
import { DESIGN_TOKENS } from '../../../../constants/DesignSystem';
import { ModernCard } from '../../../ui/ModernCard';
import { ModernButton } from '../../../ui/ModernButton';
import { 
  GAME_STATE_OPTIONS, 
  STATE_CHECK_OPTIONS,
  GAME_STATE_DESCRIPTIONS
} from '../constants/GameStateConstants';

interface GameStateConditionEditorProps {
  condition: TriggerCondition & { type: 'gameState' };
  index: number;
  onUpdate: (index: number, updates: Partial<TriggerCondition>) => void;
}

export const GameStateConditionEditor: React.FC<GameStateConditionEditorProps> = ({
  condition,
  index,
  onUpdate
}) => {
  const gameStateCondition = condition;
  
  // 現在選択されている状態の詳細情報を取得
  const getCurrentStateDetails = () => {
    const stateKey = gameStateCondition.state as keyof typeof GAME_STATE_DESCRIPTIONS;
    return GAME_STATE_DESCRIPTIONS[stateKey];
  };
  
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
        <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.lg }}>🎮</span>
        ゲーム状態条件詳細設定
      </h5>

      {/* ゲーム状態選択 */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <label style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
          color: DESIGN_TOKENS.colors.purple[800],
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'block'
        }}>
          ゲーム状態
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          {GAME_STATE_OPTIONS.map((option) => (
            <ModernButton
              key={option.value}
              variant={gameStateCondition.state === option.value ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onUpdate(index, { state: option.value as any })}
              style={{
                borderColor: gameStateCondition.state === option.value 
                  ? DESIGN_TOKENS.colors.purple[500] 
                  : DESIGN_TOKENS.colors.purple[200],
                backgroundColor: gameStateCondition.state === option.value 
                  ? DESIGN_TOKENS.colors.purple[500] 
                  : 'transparent',
                color: gameStateCondition.state === option.value 
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
              <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, fontWeight: DESIGN_TOKENS.typography.fontWeight.medium, textAlign: 'center' }}>
                {option.label}
              </span>
            </ModernButton>
          ))}
        </div>
      </div>

      {/* 状態チェック方式選択 */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <label style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
          color: DESIGN_TOKENS.colors.purple[800],
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'block'
        }}>
          チェック方式
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          {STATE_CHECK_OPTIONS.map((option) => (
            <ModernButton
              key={option.value}
              variant={gameStateCondition.checkType === option.value ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onUpdate(index, { checkType: option.value as any })}
              style={{
                borderColor: gameStateCondition.checkType === option.value 
                  ? DESIGN_TOKENS.colors.purple[500] 
                  : DESIGN_TOKENS.colors.purple[200],
                backgroundColor: gameStateCondition.checkType === option.value 
                  ? DESIGN_TOKENS.colors.purple[500] 
                  : 'transparent',
                color: gameStateCondition.checkType === option.value 
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
              <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xs, fontWeight: DESIGN_TOKENS.typography.fontWeight.medium, textAlign: 'center' }}>
                {option.label}
              </span>
            </ModernButton>
          ))}
        </div>
      </div>

      {/* 選択状態の詳細説明 */}
      {gameStateCondition.state && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <label style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            color: DESIGN_TOKENS.colors.purple[800],
            marginBottom: DESIGN_TOKENS.spacing[2],
            display: 'block'
          }}>
            状態詳細説明
          </label>
          <div style={{
            padding: DESIGN_TOKENS.spacing[3],
            backgroundColor: DESIGN_TOKENS.colors.neutral[100],
            borderRadius: DESIGN_TOKENS.borderRadius.lg,
            border: `1px solid ${DESIGN_TOKENS.colors.purple[200]}`
          }}>
            <div style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              color: DESIGN_TOKENS.colors.purple[800],
              marginBottom: DESIGN_TOKENS.spacing[2],
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium
            }}>
              📝 {getCurrentStateDetails()?.detail}
            </div>
            <div style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.neutral[700]
            }}>
              <strong>例:</strong> {getCurrentStateDetails()?.examples.join('・')}
            </div>
          </div>
        </div>
      )}

      {/* チェック方式の詳細説明（becameの場合） */}
      {gameStateCondition.checkType === 'became' && (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
          <div style={{
            padding: DESIGN_TOKENS.spacing[3],
            backgroundColor: DESIGN_TOKENS.colors.warning[50],
            borderRadius: DESIGN_TOKENS.borderRadius.lg,
            border: `1px solid ${DESIGN_TOKENS.colors.warning[200]}`,
            fontSize: DESIGN_TOKENS.typography.fontSize.xs,
            color: DESIGN_TOKENS.colors.warning[800],
            display: 'flex',
            alignItems: 'center',
            gap: DESIGN_TOKENS.spacing[2]
          }}>
            <span>⚡</span>
            <div>
              <strong>瞬間発動:</strong> 状態変化の瞬間のみ1回発動します。<br/>
              <span style={{ color: DESIGN_TOKENS.colors.neutral[600] }}>
                （例: ゲーム開始瞬間、クリア瞬間、ゲームオーバー瞬間）
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 応用例・使用パターン */}
      <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <label style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
          color: DESIGN_TOKENS.colors.purple[800],
          marginBottom: DESIGN_TOKENS.spacing[2],
          display: 'block'
        }}>
          応用例・使用パターン
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          <div style={{
            padding: DESIGN_TOKENS.spacing[2],
            backgroundColor: DESIGN_TOKENS.colors.neutral[50],
            borderRadius: DESIGN_TOKENS.borderRadius.md,
            fontSize: DESIGN_TOKENS.typography.fontSize.xs,
            color: DESIGN_TOKENS.colors.neutral[700]
          }}>
            💡 <strong>ゲーム開始演出:</strong> プレイ中状態になった瞬間 → BGM再生・UI表示
          </div>
          <div style={{
            padding: DESIGN_TOKENS.spacing[2],
            backgroundColor: DESIGN_TOKENS.colors.neutral[50],
            borderRadius: DESIGN_TOKENS.borderRadius.md,
            fontSize: DESIGN_TOKENS.typography.fontSize.xs,
            color: DESIGN_TOKENS.colors.neutral[700]
          }}>
            🏆 <strong>クリア演出:</strong> 成功状態になった瞬間 → 紙吹雪エフェクト・勝利音
          </div>
          <div style={{
            padding: DESIGN_TOKENS.spacing[2],
            backgroundColor: DESIGN_TOKENS.colors.neutral[50],
            borderRadius: DESIGN_TOKENS.borderRadius.md,
            fontSize: DESIGN_TOKENS.typography.fontSize.xs,
            color: DESIGN_TOKENS.colors.neutral[700]
          }}>
            ⏸️ <strong>ポーズ機能:</strong> 一時停止状態である間 → 操作無効・半透明表示
          </div>
        </div>
      </div>

      {/* 設定内容要約表示 */}
      <div style={{
        padding: DESIGN_TOKENS.spacing[3],
        backgroundColor: DESIGN_TOKENS.colors.purple[100],
        borderRadius: DESIGN_TOKENS.borderRadius.lg,
        fontSize: DESIGN_TOKENS.typography.fontSize.xs,
        color: DESIGN_TOKENS.colors.purple[800]
      }}>
        💡 設定内容: 
        ゲームが
        <strong>
          {GAME_STATE_OPTIONS.find(s => s.value === gameStateCondition.state)?.label || '状態'}
        </strong>
        {gameStateCondition.checkType === 'is' && 'である間'}
        {gameStateCondition.checkType === 'not' && 'でない間'}
        {gameStateCondition.checkType === 'became' && 'になった瞬間'}
        に発動
        <br/>
        <span style={{ color: DESIGN_TOKENS.colors.purple[600] }}>
          {STATE_CHECK_OPTIONS.find(c => c.value === gameStateCondition.checkType)?.description}
        </span>
      </div>
    </ModernCard>
  );
};