// src/components/editor/script/RulePreview.tsx
// 複数ルール対応・位置調整版: フラグ管理の邪魔解消・理想の表示形式実現

import React from 'react';
import { GameRule, TriggerCondition, GameAction, GameFlag } from '../../../types/editor/GameScript';
import { GameProject } from '../../../types/editor/GameProject';
import { DESIGN_TOKENS } from '../../../constants/DesignSystem';
import { ModernCard } from '../../ui/ModernCard';

interface RulePreviewProps {
  // 現在編集中のルール（単一）
  currentRule?: {
    rule: GameRule;
    conditions: TriggerCondition[];
    actions: GameAction[];
    operator: 'AND' | 'OR';
  };
  
  // 対象オブジェクトの全ルール（複数表示用）
  objectRules?: GameRule[];
  
  // プロジェクト情報
  project: GameProject;
  projectFlags: GameFlag[];
  
  // 表示モード
  mode: 'single' | 'multiple';
  
  // オプション
  showTitle?: boolean;
  compact?: boolean;
}

// 条件ライブラリ（AdvancedRuleModalから移植）
const CONDITION_LIBRARY = [
  { type: 'touch', label: 'タッチ', icon: '👆' },
  { type: 'time', label: '時間', icon: '⏰' },
  { type: 'position', label: '位置', icon: '📍' },
  { type: 'collision', label: '衝突', icon: '💥' },
  { type: 'animation', label: 'アニメ', icon: '🎬' },
  { type: 'flag', label: 'フラグ', icon: '🚩' }
];

// アクションライブラリ（AdvancedRuleModalから移植）
const ACTION_LIBRARY = [
  { type: 'success', label: 'ゲームクリア', icon: '🎉' },
  { type: 'failure', label: 'ゲームオーバー', icon: '💀' },
  { type: 'playSound', label: '音再生', icon: '🔊' },
  { type: 'move', label: '移動', icon: '🏃' },
  { type: 'effect', label: 'エフェクト', icon: '✨' },
  { type: 'show', label: '表示', icon: '👁️' },
  { type: 'hide', label: '非表示', icon: '🫥' },
  { type: 'setFlag', label: 'フラグ設定', icon: '🚩' },
  { type: 'switchAnimation', label: 'アニメ変更', icon: '🔄' }
];

export const RulePreview: React.FC<RulePreviewProps> = ({
  currentRule,
  objectRules = [],
  project,
  projectFlags,
  mode = 'single',
  showTitle = true,
  compact = false
}) => {

  // 条件表示ヘルパー
  const getConditionDisplay = (condition: TriggerCondition) => {
    const conditionInfo = CONDITION_LIBRARY.find(c => c.type === condition.type);
    let details = '';
    
    switch (condition.type) {
      case 'touch':
        details = condition.touchType === 'hold' ? `${condition.holdDuration || 1}秒長押し` : condition.touchType;
        break;
      case 'time':
        details = condition.timeType === 'exact' ? `${condition.seconds}秒後` : '時間範囲';
        break;
      case 'position':
        details = condition.area === 'inside' ? 'エリア内' : 'エリア外';
        break;
      case 'collision':
        details = `${condition.target}と${condition.collisionType}`;
        break;
      case 'animation':
        details = condition.condition === 'end' ? '終了時' : `フレーム${condition.frameNumber}`;
        break;
      case 'flag':
        const flag = projectFlags.find(f => f.id === condition.flagId);
        details = `${flag?.name || '???'} ${condition.condition}`;
        break;
    }
    
    return { icon: conditionInfo?.icon || '❓', label: conditionInfo?.label || condition.type, details };
  };

  // アクション表示ヘルパー
  const getActionDisplay = (action: GameAction) => {
    const actionInfo = ACTION_LIBRARY.find(a => a.type === action.type);
    let details = '';
    
    switch (action.type) {
      case 'playSound':
        const sound = project.assets.audio?.se?.find(s => s.id === action.soundId);
        details = sound?.name || '音声選択';
        break;
      case 'move':
        details = `${action.movement.type}移動`;
        break;
      case 'effect':
        details = action.effect.type;
        break;
      case 'setFlag':
        const flag = projectFlags.find(f => f.id === action.flagId);
        details = `${flag?.name || '???'} ${action.value ? 'ON' : 'OFF'}`;
        break;
      case 'switchAnimation':
        details = `アニメ${action.animationIndex}`;
        break;
    }
    
    return { icon: actionInfo?.icon || '❓', label: actionInfo?.label || action.type, details };
  };

  // 単一ルール用の条件・アクション文字列生成
  const generateRuleText = (rule: GameRule, conditions: TriggerCondition[], actions: GameAction[], operator: 'AND' | 'OR') => {
    // 条件部分
    const conditionTexts = conditions.map(condition => {
      const display = getConditionDisplay(condition);
      return `${display.icon}${display.label}`;
    });
    
    const conditionPart = conditionTexts.length > 1 
      ? `${conditionTexts.join(operator === 'AND' ? '＋' : '・')}`
      : conditionTexts[0] || '条件なし';

    // アクション部分
    const actionTexts = actions.map(action => {
      const display = getActionDisplay(action);
      return `${display.icon}${display.label}`;
    });
    
    const actionPart = actionTexts.join('・') || 'アクションなし';

    return { conditionPart, actionPart };
  };

  // 複数ルール表示用の文字列生成
  const generateMultipleRulesText = (rules: GameRule[]) => {
    return rules.map((rule, index) => {
      const conditions = rule.triggers.conditions;
      const actions = rule.actions;
      const operator = rule.triggers.operator;
      
      const { conditionPart, actionPart } = generateRuleText(rule, conditions, actions, operator);
      
      return {
        index: index + 1,
        name: rule.name,
        conditionPart,
        actionPart,
        enabled: rule.enabled
      };
    });
  };

  return (
    <ModernCard 
      variant="outlined" 
      size={compact ? "md" : "lg"}
      style={{ 
        backgroundColor: DESIGN_TOKENS.colors.primary[50],
        border: `2px solid ${DESIGN_TOKENS.colors.primary[200]}`
      }}
    >
      {showTitle && (
        <h4 style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.xl,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
          color: DESIGN_TOKENS.colors.primary[800],
          margin: 0,
          marginBottom: DESIGN_TOKENS.spacing[6],
          display: 'flex',
          alignItems: 'center',
          gap: DESIGN_TOKENS.spacing[2]
        }}>
          <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize['2xl'] }}>📋</span>
          ルールプレビュー
        </h4>
      )}

      {mode === 'multiple' && objectRules.length > 0 ? (
        /* 複数ルール一覧表示 - フィードバック要求形式 */
        <div>
          {/* ヘッダー情報 */}
          <div style={{
            marginBottom: DESIGN_TOKENS.spacing[6],
            padding: DESIGN_TOKENS.spacing[4],
            backgroundColor: DESIGN_TOKENS.colors.primary[100],
            borderRadius: DESIGN_TOKENS.borderRadius.xl,
            border: `1px solid ${DESIGN_TOKENS.colors.primary[200]}`
          }}>
            <div style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              color: DESIGN_TOKENS.colors.primary[800],
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              textAlign: 'center'
            }}>
              📋 このオブジェクトには{objectRules.length}個のルールが設定されています
            </div>
          </div>

          {/* ルール一覧（フィードバック要求形式） */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN_TOKENS.spacing[3] }}>
            {generateMultipleRulesText(objectRules).map((ruleInfo) => (
              <div 
                key={ruleInfo.index}
                style={{
                  padding: DESIGN_TOKENS.spacing[4],
                  backgroundColor: ruleInfo.enabled 
                    ? DESIGN_TOKENS.colors.neutral[0] 
                    : DESIGN_TOKENS.colors.neutral[100],
                  borderRadius: DESIGN_TOKENS.borderRadius.lg,
                  border: `1px solid ${ruleInfo.enabled 
                    ? DESIGN_TOKENS.colors.primary[200] 
                    : DESIGN_TOKENS.colors.neutral[300]}`,
                  boxShadow: DESIGN_TOKENS.shadows.sm,
                  opacity: ruleInfo.enabled ? 1 : 0.7
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: DESIGN_TOKENS.spacing[4],
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.medium
                }}>
                  {/* ルール番号・名前 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: DESIGN_TOKENS.spacing[2],
                    color: DESIGN_TOKENS.colors.primary[700],
                    fontWeight: DESIGN_TOKENS.typography.fontWeight.bold
                  }}>
                    <span style={{ 
                      backgroundColor: DESIGN_TOKENS.colors.primary[600],
                      color: DESIGN_TOKENS.colors.neutral[0],
                      borderRadius: DESIGN_TOKENS.borderRadius.full,
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: DESIGN_TOKENS.typography.fontSize.xs
                    }}>
                      {ruleInfo.index}
                    </span>
                    <span>ルール{ruleInfo.index}</span>
                  </div>

                  {/* フロー表示（フィードバック要求形式） */}
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: DESIGN_TOKENS.spacing[3],
                    color: DESIGN_TOKENS.colors.neutral[700]
                  }}>
                    {/* 発動条件 */}
                    <div style={{
                      padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[3]}`,
                      backgroundColor: DESIGN_TOKENS.colors.purple[50],
                      borderRadius: DESIGN_TOKENS.borderRadius.lg,
                      border: `1px solid ${DESIGN_TOKENS.colors.purple[200]}`,
                      fontSize: DESIGN_TOKENS.typography.fontSize.xs
                    }}>
                      🔥 {ruleInfo.conditionPart}
                    </div>

                    {/* 矢印 */}
                    <span style={{ 
                      fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                      color: DESIGN_TOKENS.colors.primary[500]
                    }}>
                      →
                    </span>

                    {/* アクション */}
                    <div style={{
                      padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[3]}`,
                      backgroundColor: DESIGN_TOKENS.colors.success[50],
                      borderRadius: DESIGN_TOKENS.borderRadius.lg,
                      border: `1px solid ${DESIGN_TOKENS.colors.success[200]}`,
                      fontSize: DESIGN_TOKENS.typography.fontSize.xs
                    }}>
                      ⚡ {ruleInfo.actionPart}
                    </div>
                  </div>

                  {/* 有効・無効バッジ */}
                  <div 
                    style={{
                      padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[3]}`,
                      borderRadius: DESIGN_TOKENS.borderRadius.lg,
                      fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                      fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                      backgroundColor: ruleInfo.enabled 
                        ? DESIGN_TOKENS.colors.success[100] 
                        : DESIGN_TOKENS.colors.neutral[200],
                      color: ruleInfo.enabled 
                        ? DESIGN_TOKENS.colors.success[800] 
                        : DESIGN_TOKENS.colors.neutral[600],
                      border: `1px solid ${ruleInfo.enabled 
                        ? DESIGN_TOKENS.colors.success[600] 
                        : DESIGN_TOKENS.colors.neutral[400]}`
                    }}
                  >
                    {ruleInfo.enabled ? '✅ 有効' : '⏸️ 無効'}
                  </div>
                </div>

                {/* ルール名表示（小さく） */}
                <div style={{
                  marginTop: DESIGN_TOKENS.spacing[2],
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  color: DESIGN_TOKENS.colors.neutral[500],
                  fontStyle: 'italic'
                }}>
                  「{ruleInfo.name}」
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : mode === 'single' && currentRule ? (
        /* 単一ルール編集時のプレビュー */
        <div>
          {/* 実行フロー説明 */}
          {currentRule.conditions.length > 0 && currentRule.actions.length > 0 && (
            <div style={{
              padding: DESIGN_TOKENS.spacing[4],
              backgroundColor: DESIGN_TOKENS.colors.primary[100],
              borderRadius: DESIGN_TOKENS.borderRadius.xl,
              border: `1px solid ${DESIGN_TOKENS.colors.primary[200]}`,
              textAlign: 'center',
              marginBottom: DESIGN_TOKENS.spacing[6]
            }}>
              <div style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                color: DESIGN_TOKENS.colors.primary[800],
                fontWeight: DESIGN_TOKENS.typography.fontWeight.medium
              }}>
                {currentRule.conditions.length > 1 && currentRule.operator === 'AND' 
                  ? '🔥 すべての条件が満たされた時に → ⚡ アクションを順番に実行'
                  : currentRule.conditions.length > 1 && currentRule.operator === 'OR'
                  ? '🔥 いずれかの条件が満たされた時に → ⚡ アクションを順番に実行'
                  : '🔥 条件が満たされた時に → ⚡ アクションを順番に実行'
                }
              </div>
            </div>
          )}

          {/* 簡潔なルール表示 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: DESIGN_TOKENS.spacing[4],
            padding: DESIGN_TOKENS.spacing[4],
            backgroundColor: DESIGN_TOKENS.colors.neutral[0],
            borderRadius: DESIGN_TOKENS.borderRadius.lg,
            border: `1px solid ${DESIGN_TOKENS.colors.primary[200]}`,
            boxShadow: DESIGN_TOKENS.shadows.sm
          }}>
            {/* 条件部分 */}
            <div style={{
              padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[3]}`,
              backgroundColor: DESIGN_TOKENS.colors.purple[50],
              borderRadius: DESIGN_TOKENS.borderRadius.lg,
              border: `1px solid ${DESIGN_TOKENS.colors.purple[200]}`,
              fontSize: DESIGN_TOKENS.typography.fontSize.sm
            }}>
              🔥 {currentRule.conditions.length === 0 ? '条件なし' : 
                currentRule.conditions.map(condition => {
                  const display = getConditionDisplay(condition);
                  return `${display.icon}${display.label}`;
                }).join(currentRule.operator === 'AND' ? '＋' : '・')
              }
            </div>

            {/* 矢印 */}
            <span style={{ 
              fontSize: DESIGN_TOKENS.typography.fontSize.xl,
              color: DESIGN_TOKENS.colors.primary[500]
            }}>
              →
            </span>

            {/* アクション部分 */}
            <div style={{
              padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[3]}`,
              backgroundColor: DESIGN_TOKENS.colors.success[50],
              borderRadius: DESIGN_TOKENS.borderRadius.lg,
              border: `1px solid ${DESIGN_TOKENS.colors.success[200]}`,
              fontSize: DESIGN_TOKENS.typography.fontSize.sm
            }}>
              ⚡ {currentRule.actions.length === 0 ? 'アクションなし' : 
                currentRule.actions.map(action => {
                  const display = getActionDisplay(action);
                  return `${display.icon}${display.label}`;
                }).join('・')
              }
            </div>
          </div>
        </div>
      ) : (
        /* 空状態 */
        <div style={{
          padding: DESIGN_TOKENS.spacing[8],
          textAlign: 'center',
          color: DESIGN_TOKENS.colors.neutral[500]
        }}>
          <div style={{ fontSize: DESIGN_TOKENS.typography.fontSize['3xl'], marginBottom: DESIGN_TOKENS.spacing[3] }}>
            📋
          </div>
          <div style={{ fontSize: DESIGN_TOKENS.typography.fontSize.sm }}>
            {mode === 'single' ? 'ルールを設定してプレビューを確認' : 'ルールが設定されていません'}
          </div>
        </div>
      )}
    </ModernCard>
  );
};