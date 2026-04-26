// src/components/editor/script/RulePreview.tsx
// 複数ルール対応・位置調整版: フラグ管理の邪魔解消・理想の表示形式実現
// 🔧 TypeScriptエラー修正版（5件のエラーを修正）

import React from 'react';
import { useTranslation } from 'react-i18next';
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

  // 編集コールバック
  onConditionEdit?: (index: number) => void;
  onActionEdit?: (index: number) => void;
}

export const RulePreview: React.FC<RulePreviewProps> = ({
  currentRule,
  objectRules = [],
  project,
  projectFlags,
  mode = 'single',
  showTitle = true,
  compact = false,
  onConditionEdit,
  onActionEdit
}) => {
  const { t } = useTranslation();

  // 条件ライブラリ（多言語化対応）
  const CONDITION_LIBRARY = React.useMemo(() => [
    { type: 'touch', label: t('editor.rulePreview.conditionLabels.touch'), icon: '👆' },
    { type: 'time', label: t('editor.rulePreview.conditionLabels.time'), icon: '⏰' },
    { type: 'collision', label: t('editor.rulePreview.conditionLabels.collision'), icon: '💥' },
    { type: 'animation', label: t('editor.rulePreview.conditionLabels.animation'), icon: '🎬' },
    { type: 'flag', label: t('editor.rulePreview.conditionLabels.flag'), icon: '🚩' }
  ], [t]);

  // アクションライブラリ（多言語化対応）
  const ACTION_LIBRARY = React.useMemo(() => [
    { type: 'success', label: t('editor.rulePreview.actionLabels.success'), icon: '🎉' },
    { type: 'failure', label: t('editor.rulePreview.actionLabels.failure'), icon: '💀' },
    { type: 'playSound', label: t('editor.rulePreview.actionLabels.playSound'), icon: '🔊' },
    { type: 'move', label: t('editor.rulePreview.actionLabels.move'), icon: '🏃' },
    { type: 'effect', label: t('editor.rulePreview.actionLabels.effect'), icon: '✨' },
    { type: 'show', label: t('editor.rulePreview.actionLabels.show'), icon: '👁️' },
    { type: 'hide', label: t('editor.rulePreview.actionLabels.hide'), icon: '🫥' },
    { type: 'setFlag', label: t('editor.rulePreview.actionLabels.setFlag'), icon: '🚩' },
    { type: 'switchAnimation', label: t('editor.rulePreview.actionLabels.switchAnimation'), icon: '🔄' }
  ], [t]);

  // 条件表示ヘルパー（簡易版）
  const getConditionDisplay = (condition: TriggerCondition) => {
    const conditionInfo = CONDITION_LIBRARY.find(c => c.type === condition.type);
    let details = '';

    switch (condition.type) {
      case 'touch':
        details = condition.touchType === 'hold' ? t('editor.rulePreview.touchDetails.holdSecond', { duration: condition.holdDuration || 1 }) : condition.touchType;
        break;
      case 'time':
        details = condition.timeType === 'exact' ? t('editor.rulePreview.timeDetails.secondsAfter', { seconds: condition.seconds }) : t('editor.rulePreview.timeDetails.timeRange');
        break;
      // 位置条件削除: 衝突条件で代用可能
      case 'collision':
        details = t('editor.rulePreview.collisionDetails.collisionWith', { target: condition.target, collisionType: condition.collisionType });
        break;
      case 'animation':
        details = condition.condition === 'end' ? t('editor.rulePreview.general.animationEnd') : t('editor.rulePreview.general.frameNumber', { number: condition.frameNumber });
        break;
      case 'flag':
        const flag = projectFlags.find(f => f.id === condition.flagId);
        details = t('editor.rulePreview.flagDetails.flagCondition', { name: flag?.name || '???', condition: condition.condition });
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
        const touchTypeLabel = condition.touchType === 'down' ? t('editor.rulePreview.touchDetails.tap') :
                               condition.touchType === 'up' ? t('editor.rulePreview.touchDetails.release') : t('editor.rulePreview.touchDetails.hold');
        details.push(t('editor.rulePreview.touchDetails.type', { type: touchTypeLabel }));
        if (condition.touchType === 'hold') {
          details.push(t('editor.rulePreview.touchDetails.holdDuration', { duration: condition.holdDuration || 1 }));
        }
        // ターゲット
        if (condition.target === 'self') {
          details.push(t('editor.rulePreview.touchDetails.targetThis'));
        } else if (condition.target === 'stage') {
          details.push(t('editor.rulePreview.touchDetails.targetStage'));
          if (condition.region) {
            const shape = condition.region.shape === 'rect' ? t('editor.rulePreview.touchDetails.shapeRect') : t('editor.rulePreview.touchDetails.shapeCircle');
            details.push(t('editor.rulePreview.touchDetails.range', { shape, x: (condition.region.x * 100).toFixed(0), y: (condition.region.y * 100).toFixed(0) }));
          }
        } else {
          details.push(t('editor.rulePreview.touchDetails.target', { target: condition.target }));
        }
        break;
      case 'time':
        if (condition.timeType === 'exact') {
          details.push(t('editor.rulePreview.timeDetails.exactTime', { seconds: condition.seconds }));
        } else {
          // 🔧 修正1-2: range.start/end → range.min/max
          details.push(t('editor.rulePreview.timeDetails.rangeTime', { min: condition.range?.min || 0, max: condition.range?.max || 10 }));
        }
        break;
      case 'collision':
        // 衝突タイプ
        const collisionTypeLabel = condition.collisionType === 'enter' ? t('editor.rulePreview.collisionDetails.enter') :
                                   condition.collisionType === 'stay' ? t('editor.rulePreview.collisionDetails.stay') : t('editor.rulePreview.collisionDetails.exit');
        details.push(t('editor.rulePreview.collisionDetails.type', { type: collisionTypeLabel }));
        // 判定方式
        const checkModeLabel = condition.checkMode === 'hitbox' ? t('editor.rulePreview.collisionDetails.detectionHitbox') : t('editor.rulePreview.collisionDetails.detectionPixel');
        details.push(t('editor.rulePreview.collisionDetails.detection', { mode: checkModeLabel }));
        // ターゲット
        if (condition.target === 'background') {
          details.push(t('editor.rulePreview.collisionDetails.targetBackground'));
        } else if (condition.target === 'stage') {
          details.push(t('editor.rulePreview.collisionDetails.targetStageRange'));
          if (condition.region) {
            const shape = condition.region.shape === 'rect' ? t('editor.rulePreview.collisionDetails.shapeRect') : t('editor.rulePreview.collisionDetails.shapeCircle');
            details.push(t('editor.rulePreview.collisionDetails.range', { shape, x: (condition.region.x * 100).toFixed(0), y: (condition.region.y * 100).toFixed(0) }));
          }
        } else {
          details.push(t('editor.rulePreview.collisionDetails.target', { target: condition.target }));
        }
        break;
      case 'animation':
        if (condition.condition === 'end') {
          details.push(t('editor.rulePreview.animationDetails.animationEnd'));
        } else {
          details.push(t('editor.rulePreview.general.frameNumber', { number: condition.frameNumber }) + t('editor.rulePreview.animationDetails.frameReached'));
        }
        break;
      case 'flag':
        const flag = projectFlags.find(f => f.id === condition.flagId);
        details.push(t('editor.rulePreview.flagDetails.flag', { name: flag?.name || t('editor.rulePreview.flagDetails.notSelected') }));
        details.push(t('editor.rulePreview.flagDetails.condition', { condition: condition.condition }));
        break;
      case 'gameState':
        const stateLabel = condition.state === 'playing' ? t('editor.rulePreview.gameStateDetails.playing') :
                          condition.state === 'success' ? t('editor.rulePreview.gameStateDetails.clear') :
                          condition.state === 'failure' ? t('editor.rulePreview.gameStateDetails.gameOver') : t('editor.rulePreview.gameStateDetails.unknown');
        details.push(t('editor.rulePreview.gameStateDetails.state', { state: stateLabel }));
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
        details = sound?.name || t('editor.rulePreview.soundDetails.selectSound');
        break;
      case 'move':
        details = t('editor.rulePreview.moveDetails.moveType', { type: action.movement.type });
        break;
      case 'effect':
        details = action.effect.type;
        break;
      case 'setFlag':
        const flag = projectFlags.find(f => f.id === action.flagId);
        details = t('editor.rulePreview.flagActionDetails.flagValue', { name: flag?.name || '???', value: action.value ? 'ON' : 'OFF' });
        break;
      case 'switchAnimation':
        details = t('editor.rulePreview.animationActionDetails.animationNumber', { number: action.animationIndex });
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
        details.push(t('editor.rulePreview.resultDetails.gameClear'));
        break;
      case 'failure':
        details.push(t('editor.rulePreview.resultDetails.gameOver'));
        break;
      case 'playSound':
        const sound = project.assets.audio?.se?.find(s => s.id === action.soundId);
        details.push(t('editor.rulePreview.soundDetails.sound', { name: sound?.name || t('editor.rulePreview.soundDetails.notSelected') }));
        details.push(t('editor.rulePreview.soundDetails.volume', { volume: ((action.volume || 0.8) * 100).toFixed(0) }));
        break;
      case 'move':
        // 🔧 修正3-4: 型安全な方法で movement.type を処理
        const moveTypeLabel = action.movement.type === 'straight' ? t('editor.rulePreview.moveDetails.straight') :
                             action.movement.type === 'bounce' ? t('editor.rulePreview.moveDetails.bounce') :
                             action.movement.type === 'teleport' ? t('editor.rulePreview.moveDetails.teleport') :
                             action.movement.type === 'wander' ? t('editor.rulePreview.moveDetails.wander') :
                             action.movement.type === 'stop' ? t('editor.rulePreview.moveDetails.stop') :
                             action.movement.type === 'swap' ? t('editor.rulePreview.moveDetails.swap') :
                             action.movement.type === 'approach' ? t('editor.rulePreview.moveDetails.approach') :
                             action.movement.type === 'orbit' ? t('editor.rulePreview.moveDetails.orbit') : t('editor.rulePreview.moveDetails.unknown');
        details.push(t('editor.rulePreview.moveDetails.type', { type: moveTypeLabel }));
        details.push(t('editor.rulePreview.moveDetails.speed', { speed: action.movement.speed }));
        details.push(t('editor.rulePreview.moveDetails.duration', { duration: action.movement.duration }));
        break;
      case 'effect':
        const effectTypeLabel = action.effect.type === 'flash' ? t('editor.rulePreview.effectDetails.flash') :
                               action.effect.type === 'shake' ? t('editor.rulePreview.effectDetails.shake') :
                               action.effect.type === 'rotate' ? t('editor.rulePreview.effectDetails.rotate') : t('editor.rulePreview.effectDetails.unknown');
        details.push(t('editor.rulePreview.effectDetails.type', { type: effectTypeLabel }));
        details.push(t('editor.rulePreview.effectDetails.duration', { duration: action.effect.duration }));
        details.push(t('editor.rulePreview.effectDetails.intensity', { intensity: ((action.effect.intensity || 0.8) * 100).toFixed(0) }));
        break;
      case 'show':
        details.push(t('editor.rulePreview.showHideDetails.show'));
        if (action.fadeIn) {
          details.push(t('editor.rulePreview.showHideDetails.fadeIn', { duration: action.duration || 0.5 }));
        }
        break;
      case 'hide':
        details.push(t('editor.rulePreview.showHideDetails.hide'));
        if (action.fadeOut) {
          details.push(t('editor.rulePreview.showHideDetails.fadeOut', { duration: action.duration || 0.5 }));
        }
        break;
      case 'setFlag':
        const setFlag = projectFlags.find(f => f.id === action.flagId);
        details.push(t('editor.rulePreview.flagActionDetails.setFlag', { name: setFlag?.name || t('editor.rulePreview.flagDetails.notSelected') }));
        details.push(t('editor.rulePreview.flagActionDetails.value', { value: action.value ? 'ON' : 'OFF' }));
        break;
      case 'toggleFlag':
        const toggleFlag = projectFlags.find(f => f.id === action.flagId);
        details.push(t('editor.rulePreview.flagActionDetails.toggleFlag', { name: toggleFlag?.name || t('editor.rulePreview.flagDetails.notSelected') }));
        details.push(t('editor.rulePreview.flagActionDetails.toggleValue'));
        break;
      case 'switchAnimation':
        details.push(t('editor.rulePreview.animationActionDetails.switchToAnimation', { number: action.animationIndex }));
        break;
    }

    return {
      icon: actionInfo?.icon || '❓',
      label: actionInfo?.label || action.type,
      details
    };
  };

  // 単一ルール用の条件・アクション文字列生成
  const generateRuleText = (_rule: GameRule, conditions: TriggerCondition[], actions: GameAction[], operator: 'AND' | 'OR') => {
    // 条件部分
    const conditionTexts = conditions.map(condition => {
      const display = getConditionDisplay(condition);
      return `${display.icon}${display.label}`;
    });
    
    const conditionPart = conditionTexts.length > 1
      ? `${conditionTexts.join(operator === 'AND' ? '＋' : '・')}`
      : conditionTexts[0] || t('editor.rulePreview.general.noCondition');

    // アクション部分
    const actionTexts = actions.map(action => {
      const display = getActionDisplay(action);
      return `${display.icon}${display.label}`;
    });

    const actionPart = actionTexts.join('・') || t('editor.rulePreview.general.noAction');

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
          {t('editor.rulePreview.title')}
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
              {t('editor.rulePreview.multipleRules.header', { count: objectRules.length })}
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
                    <span>{t('editor.rulePreview.multipleRules.ruleNumber', { number: ruleInfo.index })}</span>
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
                    {ruleInfo.enabled ? t('editor.rulePreview.multipleRules.enabled') : t('editor.rulePreview.multipleRules.disabled')}
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
                  ? t('editor.rulePreview.singleRule.flowAll')
                  : currentRule.conditions.length > 1 && currentRule.operator === 'OR'
                  ? t('editor.rulePreview.singleRule.flowAny')
                  : t('editor.rulePreview.singleRule.flowSingle')
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
                {t('editor.rulePreview.singleRule.conditionsCount', { count: currentRule.conditions.length })}
                {currentRule.conditions.length > 1 && (
                  <span style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                    fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                    backgroundColor: DESIGN_TOKENS.colors.purple[100],
                    color: DESIGN_TOKENS.colors.purple[700],
                    padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[2]}`,
                    borderRadius: DESIGN_TOKENS.borderRadius.full
                  }}>
                    {currentRule.operator === 'AND' ? t('editor.rulePreview.general.allConditions') : t('editor.rulePreview.general.anyCondition')}
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
                        marginBottom: DESIGN_TOKENS.spacing[2],
                        justifyContent: 'space-between'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: DESIGN_TOKENS.spacing[2]
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
                            {t('editor.rulePreview.singleRule.conditionNumber', { number: index + 1, label: display.label })}
                          </span>
                        </div>
                        {onConditionEdit && (
                          <button
                            onClick={() => onConditionEdit(index)}
                            style={{
                              padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[3]}`,
                              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                              backgroundColor: DESIGN_TOKENS.colors.purple[600],
                              color: DESIGN_TOKENS.colors.neutral[0],
                              border: 'none',
                              borderRadius: DESIGN_TOKENS.borderRadius.md,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: DESIGN_TOKENS.spacing[1],
                              transition: `all ${DESIGN_TOKENS.animation.duration.fast} ${DESIGN_TOKENS.animation.easing.inOut}`
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = DESIGN_TOKENS.colors.purple[700];
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = DESIGN_TOKENS.colors.purple[600];
                            }}
                          >
                            ✏️ 編集
                          </button>
                        )}
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
                {t('editor.rulePreview.singleRule.actionsCount', { count: currentRule.actions.length })}
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
                        marginBottom: DESIGN_TOKENS.spacing[2],
                        justifyContent: 'space-between'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: DESIGN_TOKENS.spacing[2]
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
                            {t('editor.rulePreview.singleRule.actionNumber', { number: index + 1, label: display.label })}
                          </span>
                        </div>
                        {onActionEdit && (
                          <button
                            onClick={() => onActionEdit(index)}
                            style={{
                              padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[3]}`,
                              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                              backgroundColor: DESIGN_TOKENS.colors.success[600],
                              color: DESIGN_TOKENS.colors.neutral[0],
                              border: 'none',
                              borderRadius: DESIGN_TOKENS.borderRadius.md,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: DESIGN_TOKENS.spacing[1],
                              transition: `all ${DESIGN_TOKENS.animation.duration.fast} ${DESIGN_TOKENS.animation.easing.inOut}`
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = DESIGN_TOKENS.colors.success[800];
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = DESIGN_TOKENS.colors.success[600];
                            }}
                          >
                            ✏️ 編集
                          </button>
                        )}
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
            {mode === 'single' ? t('editor.rulePreview.general.noRules') : t('editor.rulePreview.general.noRulesSet')}
          </div>
        </div>
      )}
    </ModernCard>
  );
};