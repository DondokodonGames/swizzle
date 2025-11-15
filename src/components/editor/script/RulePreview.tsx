// src/components/editor/script/RulePreview.tsx
// 複数ルール対応・位置調整版: フラグ管理の邪魔解消・理想の表示形式実現
// 🔧 TypeScriptエラー修正版（5件のエラーを修正）

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

// 条件ライブラリ（AdvancedRuleModalから移植・位置条件削除）
const CONDITION_LIBRARY = [
  { type: 'touch', label: 'タッチ', icon: '👆' },
  { type: 'time', label: '時間', icon: '⏰' },
  // 位置条件削除: 衝突条件で代用可能
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

  // 条件表示ヘルパー（簡易版）
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
      // 位置条件削除: 衝突条件で代用可能
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

  // 詳細条件表示ヘルパー（新規追加）
  const getDetailedConditionDisplay = (condition: TriggerCondition) => {
    const conditionInfo = CONDITION_LIBRARY.find(c => c.type === condition.type);
    const details: string[] = [];

    switch (condition.type) {
      case 'touch':
        // タッチタイプ
        const touchTypeLabel = condition.touchType === 'down' ? 'タップ' :
                               condition.touchType === 'up' ? 'リリース' : '長押し';
        details.push(`種類: ${touchTypeLabel}`);
        if (condition.touchType === 'hold') {
          details.push(`時間: ${condition.holdDuration || 1}秒`);
        }
        // ターゲット
        if (condition.target === 'self') {
          details.push('対象: このオブジェクト');
        } else if (condition.target === 'stage') {
          details.push('対象: ステージ');
          if (condition.region) {
            const shape = condition.region.shape === 'rect' ? '矩形' : '円形';
            details.push(`範囲: ${shape}（中心: ${(condition.region.x * 100).toFixed(0)}%, ${(condition.region.y * 100).toFixed(0)}%）`);
          }
        } else {
          details.push(`対象: ${condition.target}`);
        }
        break;
      case 'time':
        if (condition.timeType === 'exact') {
          details.push(`${condition.seconds}秒経過後`);
        } else {
          // 🔧 修正1-2: range.start/end → range.min/max
          details.push(`${condition.range?.min || 0}秒〜${condition.range?.max || 10}秒の間`);
        }
        break;
      case 'collision':
        // 衝突タイプ
        const collisionTypeLabel = condition.collisionType === 'enter' ? '衝突開始時' :
                                   condition.collisionType === 'stay' ? '衝突中' : '衝突終了時';
        details.push(`種類: ${collisionTypeLabel}`);
        // 判定方式
        const checkModeLabel = condition.checkMode === 'hitbox' ? '当たり判定' : 'ピクセル判定';
        details.push(`判定: ${checkModeLabel}`);
        // ターゲット
        if (condition.target === 'background') {
          details.push('対象: 背景');
        } else if (condition.target === 'stage') {
          details.push('対象: ステージ範囲');
          if (condition.region) {
            const shape = condition.region.shape === 'rect' ? '矩形' : '円形';
            details.push(`範囲: ${shape}（中心: ${(condition.region.x * 100).toFixed(0)}%, ${(condition.region.y * 100).toFixed(0)}%）`);
          }
        } else {
          details.push(`対象: ${condition.target}`);
        }
        break;
      case 'animation':
        if (condition.condition === 'end') {
          details.push('アニメーション終了時');
        } else {
          details.push(`フレーム${condition.frameNumber}到達時`);
        }
        break;
      case 'flag':
        const flag = projectFlags.find(f => f.id === condition.flagId);
        details.push(`フラグ: ${flag?.name || '未選択'}`);
        details.push(`条件: ${condition.condition}`);
        break;
      case 'gameState':
        const stateLabel = condition.state === 'playing' ? 'プレイ中' :
                          condition.state === 'success' ? 'クリア' :
                          condition.state === 'failure' ? 'ゲームオーバー' : '不明';
        details.push(`状態: ${stateLabel}`);
        break;
    }

    return {
      icon: conditionInfo?.icon || '❓',
      label: conditionInfo?.label || condition.type,
      details
    };
  };

  // アクション表示ヘルパー（簡易版）
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

  // 詳細アクション表示ヘルパー（新規追加）
  const getDetailedActionDisplay = (action: GameAction) => {
    const actionInfo = ACTION_LIBRARY.find(a => a.type === action.type);
    const details: string[] = [];

    switch (action.type) {
      case 'success':
        details.push('ゲームをクリア状態にする');
        break;
      case 'failure':
        details.push('ゲームオーバー状態にする');
        break;
      case 'playSound':
        const sound = project.assets.audio?.se?.find(s => s.id === action.soundId);
        details.push(`音声: ${sound?.name || '未選択'}`);
        details.push(`音量: ${((action.volume || 0.8) * 100).toFixed(0)}%`);
        break;
      case 'move':
        // 🔧 修正3-4: 型安全な方法で movement.type を処理
        const moveTypeLabel = action.movement.type === 'straight' ? '直線移動' :
                             action.movement.type === 'bounce' ? 'バウンド移動' :
                             action.movement.type === 'teleport' ? 'テレポート' :
                             action.movement.type === 'wander' ? 'ランダム移動' :
                             action.movement.type === 'stop' ? '停止' :
                             action.movement.type === 'swap' ? '位置交換' :
                             action.movement.type === 'approach' ? '接近' :
                             action.movement.type === 'orbit' ? '周回' : '不明';
        details.push(`種類: ${moveTypeLabel}`);
        details.push(`速度: ${action.movement.speed}px/秒`);
        details.push(`時間: ${action.movement.duration}秒`);
        break;
      case 'effect':
        const effectTypeLabel = action.effect.type === 'flash' ? '点滅' :
                               action.effect.type === 'shake' ? '振動' :
                               action.effect.type === 'rotate' ? '回転' : '不明';
        details.push(`種類: ${effectTypeLabel}`);
        details.push(`時間: ${action.effect.duration}秒`);
        details.push(`強度: ${((action.effect.intensity || 0.8) * 100).toFixed(0)}%`);
        break;
      case 'show':
        details.push('オブジェクトを表示');
        if (action.fadeIn) {
          details.push(`フェードイン: ${action.duration || 0.5}秒`);
        }
        break;
      case 'hide':
        details.push('オブジェクトを非表示');
        if (action.fadeOut) {
          details.push(`フェードアウト: ${action.duration || 0.5}秒`);
        }
        break;
      case 'setFlag':
        const setFlag = projectFlags.find(f => f.id === action.flagId);
        details.push(`フラグ: ${setFlag?.name || '未選択'}`);
        details.push(`値: ${action.value ? 'ON' : 'OFF'}`);
        break;
      case 'toggleFlag':
        const toggleFlag = projectFlags.find(f => f.id === action.flagId);
        details.push(`フラグ: ${toggleFlag?.name || '未選択'}`);
        details.push('値: 反転');
        break;
      case 'switchAnimation':
        details.push(`アニメーション${action.animationIndex}に切り替え`);
        break;
    }

    return {
      icon: actionInfo?.icon || '❓',
      label: actionInfo?.label || action.type,
      details
    };
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

          {/* 詳細条件一覧 */}
          {currentRule.conditions.length > 0 && (
            <div style={{ marginBottom: DESIGN_TOKENS.spacing[6] }}>
              <h5 style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.base,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                color: DESIGN_TOKENS.colors.purple[800],
                margin: 0,
                marginBottom: DESIGN_TOKENS.spacing[3],
                display: 'flex',
                alignItems: 'center',
                gap: DESIGN_TOKENS.spacing[2]
              }}>
                <span>🔥</span>
                発動条件 ({currentRule.conditions.length}個)
                {currentRule.conditions.length > 1 && (
                  <span style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                    fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                    backgroundColor: DESIGN_TOKENS.colors.purple[100],
                    color: DESIGN_TOKENS.colors.purple[700],
                    padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[2]}`,
                    borderRadius: DESIGN_TOKENS.borderRadius.full
                  }}>
                    {currentRule.operator === 'AND' ? 'すべて' : 'いずれか'}
                  </span>
                )}
              </h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN_TOKENS.spacing[3] }}>
                {currentRule.conditions.map((condition, index) => {
                  const display = getDetailedConditionDisplay(condition);
                  return (
                    <div
                      key={index}
                      style={{
                        padding: DESIGN_TOKENS.spacing[3],
                        backgroundColor: DESIGN_TOKENS.colors.purple[50],
                        borderRadius: DESIGN_TOKENS.borderRadius.lg,
                        border: `2px solid ${DESIGN_TOKENS.colors.purple[200]}`
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: DESIGN_TOKENS.spacing[2],
                        marginBottom: DESIGN_TOKENS.spacing[2]
                      }}>
                        <span style={{
                          fontSize: DESIGN_TOKENS.typography.fontSize.xl,
                          backgroundColor: DESIGN_TOKENS.colors.purple[600],
                          color: DESIGN_TOKENS.colors.neutral[0],
                          width: '32px',
                          height: '32px',
                          borderRadius: DESIGN_TOKENS.borderRadius.full,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {display.icon}
                        </span>
                        <span style={{
                          fontSize: DESIGN_TOKENS.typography.fontSize.base,
                          fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                          color: DESIGN_TOKENS.colors.purple[800]
                        }}>
                          条件{index + 1}: {display.label}
                        </span>
                      </div>
                      <div style={{
                        marginLeft: '40px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: DESIGN_TOKENS.spacing[1]
                      }}>
                        {display.details.map((detail, detailIndex) => (
                          <div
                            key={detailIndex}
                            style={{
                              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                              color: DESIGN_TOKENS.colors.purple[700]
                            }}
                          >
                            • {detail}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 矢印 */}
          {currentRule.conditions.length > 0 && currentRule.actions.length > 0 && (
            <div style={{
              textAlign: 'center',
              margin: `${DESIGN_TOKENS.spacing[4]} 0`,
              fontSize: DESIGN_TOKENS.typography.fontSize['3xl'],
              color: DESIGN_TOKENS.colors.primary[500]
            }}>
              ↓
            </div>
          )}

          {/* 詳細アクション一覧 */}
          {currentRule.actions.length > 0 && (
            <div>
              <h5 style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.base,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                color: DESIGN_TOKENS.colors.success[800],
                margin: 0,
                marginBottom: DESIGN_TOKENS.spacing[3],
                display: 'flex',
                alignItems: 'center',
                gap: DESIGN_TOKENS.spacing[2]
              }}>
                <span>⚡</span>
                実行アクション ({currentRule.actions.length}個)
              </h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN_TOKENS.spacing[3] }}>
                {currentRule.actions.map((action, index) => {
                  const display = getDetailedActionDisplay(action);
                  return (
                    <div
                      key={index}
                      style={{
                        padding: DESIGN_TOKENS.spacing[3],
                        backgroundColor: DESIGN_TOKENS.colors.success[50],
                        borderRadius: DESIGN_TOKENS.borderRadius.lg,
                        border: `2px solid ${DESIGN_TOKENS.colors.success[200]}`
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: DESIGN_TOKENS.spacing[2],
                        marginBottom: DESIGN_TOKENS.spacing[2]
                      }}>
                        <span style={{
                          fontSize: DESIGN_TOKENS.typography.fontSize.xl,
                          // 🔧 修正5: success[700] → success[600] に変更
                          backgroundColor: DESIGN_TOKENS.colors.success[600],
                          color: DESIGN_TOKENS.colors.neutral[0],
                          width: '32px',
                          height: '32px',
                          borderRadius: DESIGN_TOKENS.borderRadius.full,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {display.icon}
                        </span>
                        <span style={{
                          fontSize: DESIGN_TOKENS.typography.fontSize.base,
                          fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                          color: DESIGN_TOKENS.colors.success[800]
                        }}>
                          アクション{index + 1}: {display.label}
                        </span>
                      </div>
                      <div style={{
                        marginLeft: '40px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: DESIGN_TOKENS.spacing[1]
                      }}>
                        {display.details.map((detail, detailIndex) => (
                          <div
                            key={detailIndex}
                            style={{
                              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                              // 🔧 修正5追加: ここも success[700] → success[600] に変更
                              color: DESIGN_TOKENS.colors.success[600]
                            }}
                          >
                            • {detail}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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