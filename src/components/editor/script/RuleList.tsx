// src/components/editor/script/RuleList.tsx
// IF-THEN設定詳細表示対応版 - TypeScriptエラー修正

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GameProject } from '../../../types/editor/GameProject';
import { GameRule, TriggerCondition, GameAction } from '../../../types/editor/GameScript';
import { DESIGN_TOKENS } from '../../../constants/DesignSystem';
import { ModernCard } from '../../ui/ModernCard';
import { ModernButton } from '../../ui/ModernButton';

interface RuleListProps {
  project: GameProject;
  selectedObjectId: string | null;
  onProjectUpdate: (project: GameProject) => void;
  onEditRule: (rule: GameRule) => void;
  onCreateRule: () => void;
  onModeChange: (mode: 'layout' | 'rules') => void;
}

export const RuleList: React.FC<RuleListProps> = ({
  project,
  selectedObjectId: _selectedObjectId,
  onProjectUpdate,
  onEditRule,
  onCreateRule: _onCreateRule,
  onModeChange
}) => {
  const { t } = useTranslation();
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  
  // 🔧 新規: 展開状態管理（ルールIDをキーとして管理）
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // 🔧 新規: ルールの展開/折りたたみ切り替え
  const toggleRuleExpand = (ruleId: string) => {
    setExpandedRules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ruleId)) {
        newSet.delete(ruleId);
      } else {
        newSet.add(ruleId);
      }
      return newSet;
    });
  };

  // 🔧 新規: 全ルール展開/折りたたみ
  const toggleAllRules = () => {
    if (expandedRules.size === project.script.rules.length) {
      setExpandedRules(new Set());
    } else {
      setExpandedRules(new Set(project.script.rules.map(r => r.id)));
    }
  };

  const handleDeleteRule = (ruleId: string) => {
    const rule = project.script.rules.find(r => r.id === ruleId);
    if (confirm(t('editor.script.ruleList.confirmDelete', { name: rule?.name || t('editor.script.ruleList.untitled') }))) {
      const updatedScript = { ...project.script };
      updatedScript.rules = updatedScript.rules.filter(r => r.id !== ruleId);

      const updatedProject = {
        ...project,
        script: updatedScript,
        lastModified: new Date().toISOString()
      };

      onProjectUpdate(updatedProject);
      showNotification('success', t('editor.script.ruleList.deleted'));
    }
  };

  const getObjectName = (objectId: string) => {
    if (objectId === 'stage') return t('editor.script.ruleList.gameOverall');

    const obj = project.assets.objects.find(obj => obj.id === objectId);

    if (!obj) {
      return objectId;
    }

    // @ts-ignore
    return obj.name || obj.id;
  };

  // 🔧 新規: 条件タイプを人間が読める形式に変換
  const formatCondition = (condition: TriggerCondition, _index: number): React.ReactNode => {
    const conditionType = condition.type;
    
    switch (conditionType) {
      case 'touch':
        const touchCond = condition as Extract<TriggerCondition, { type: 'touch' }>;
        const touchTarget = touchCond.target === 'self' ? t('editor.script.conditions.touch.self') : 
                           touchCond.target === 'stage' ? t('editor.script.conditions.touch.stage') : 
                           getObjectName(touchCond.target || '');
        const touchType = touchCond.touchType === 'down' ? t('editor.script.conditions.touch.down') :
                         touchCond.touchType === 'up' ? t('editor.script.conditions.touch.up') :
                         touchCond.touchType === 'hold' ? t('editor.script.conditions.touch.hold') : touchCond.touchType;
        return (
          <span>
            <strong>👆 タッチ</strong>: {touchTarget} を {touchType}
          </span>
        );

      case 'time':
        const timeCond = condition as Extract<TriggerCondition, { type: 'time' }>;
        if (timeCond.timeType === 'exact') {
          return <span><strong>⏱️ 時間</strong>: {timeCond.seconds}秒 ちょうど</span>;
        } else if (timeCond.timeType === 'interval') {
          return <span><strong>⏱️ 時間</strong>: {timeCond.interval}秒ごと</span>;
        } else if (timeCond.timeType === 'range') {
          return <span><strong>⏱️ 時間</strong>: {timeCond.range?.min}〜{timeCond.range?.max}秒</span>;
        }
        return <span><strong>⏱️ 時間</strong>: {timeCond.timeType}</span>;

      case 'collision':
        const collCond = condition as Extract<TriggerCondition, { type: 'collision' }>;
        const collTarget = getObjectName(collCond.target || '');
        return <span><strong>💥 衝突</strong>: {collTarget} に {collCond.collisionType === 'enter' ? '接触' : '離れる'}</span>;

      case 'counter':
        const counterCond = condition as Extract<TriggerCondition, { type: 'counter' }>;
        // 🔧 修正: 正しい比較演算子名を使用
        const compOp = counterCond.comparison === 'equals' ? '=' :
                      counterCond.comparison === 'greater' ? '>' :
                      counterCond.comparison === 'less' ? '<' :
                      counterCond.comparison === 'greaterOrEqual' ? '>=' :
                      counterCond.comparison === 'lessOrEqual' ? '<=' :
                      counterCond.comparison === 'notEquals' ? '!=' : counterCond.comparison;
        return <span><strong>🔢 カウンター</strong>: {counterCond.counterName} {compOp} {counterCond.value}</span>;

      case 'flag':
        const flagCond = condition as Extract<TriggerCondition, { type: 'flag' }>;
        return <span><strong>🚩 フラグ</strong>: {flagCond.flagId} が {flagCond.condition === 'ON' ? 'ON' : 'OFF'}</span>;

      case 'random':
        const randCond = condition as Extract<TriggerCondition, { type: 'random' }>;
        return <span><strong>🎲 ランダム</strong>: {Math.round((randCond.probability || 0) * 100)}%（{randCond.interval}ms間隔）</span>;

      case 'position':
        // 🔧 修正: 正しい型定義に合わせる
        const posCond = condition as Extract<TriggerCondition, { type: 'position' }>;
        const areaText = posCond.area === 'inside' ? '内部' : 
                        posCond.area === 'outside' ? '外部' : '交差';
        const shapeText = posCond.region?.shape === 'circle' ? '円形' : '矩形';
        return <span><strong>📍 位置</strong>: {getObjectName(posCond.target)} が {shapeText}領域の{areaText}</span>;

      case 'animation':
        // 🔧 修正: 正しい型定義に合わせる
        const animCond = condition as Extract<TriggerCondition, { type: 'animation' }>;
        const condText = animCond.condition === 'end' ? '終了' :
                        animCond.condition === 'start' ? '開始' :
                        animCond.condition === 'frame' ? `フレーム${animCond.frameNumber}` :
                        animCond.condition === 'loop' ? 'ループ' : animCond.condition;
        return <span><strong>🎬 アニメ</strong>: {condText}</span>;

      case 'gameState':
        const stateCond = condition as Extract<TriggerCondition, { type: 'gameState' }>;
        return <span><strong>🎮 状態</strong>: {stateCond.state}</span>;

      default:
        return <span><strong>❓</strong>: {conditionType}</span>;
    }
  };

  // 🔧 新規: アクションタイプを人間が読める形式に変換
  const formatAction = (action: GameAction, _index: number): React.ReactNode => {
    const actionType = action.type;
    
    switch (actionType) {
      case 'success':
        const successAction = action as Extract<GameAction, { type: 'success' }>;
        return <span><strong>🎉 成功</strong>: {successAction.message || 'クリア！'}</span>;

      case 'failure':
        const failAction = action as Extract<GameAction, { type: 'failure' }>;
        return <span><strong>💀 失敗</strong>: {failAction.message || 'ゲームオーバー'}</span>;

      case 'show':
        const showAction = action as Extract<GameAction, { type: 'show' }>;
        return <span><strong>👁️ 表示</strong>: {getObjectName(showAction.targetId)}</span>;

      case 'hide':
        const hideAction = action as Extract<GameAction, { type: 'hide' }>;
        return <span><strong>🙈 非表示</strong>: {getObjectName(hideAction.targetId)}</span>;

      case 'move':
        const moveAction = action as Extract<GameAction, { type: 'move' }>;
        const moveType = moveAction.movement?.type || 'straight';
        const speed = moveAction.movement?.speed || 1;
        const targetPos = moveAction.movement?.target;
        // 🔧 修正: targetがstring | Positionなので型チェック
        let posText = '';
        if (targetPos && typeof targetPos === 'object' && 'x' in targetPos && 'y' in targetPos) {
          posText = ` → (${targetPos.x?.toFixed(2)}, ${targetPos.y?.toFixed(2)})`;
        } else if (typeof targetPos === 'string') {
          posText = ` → ${targetPos}`;
        }
        return (
          <span>
            <strong>🚀 移動</strong>: {getObjectName(moveAction.targetId)} 
            {posText}
            {` [${moveType}, 速度${speed}]`}
          </span>
        );

      case 'effect':
        const effectAction = action as Extract<GameAction, { type: 'effect' }>;
        const effectType = effectAction.effect?.type || 'scale';
        return <span><strong>✨ エフェクト</strong>: {getObjectName(effectAction.targetId)} [{effectType}]</span>;

      case 'playSound':
        const soundAction = action as Extract<GameAction, { type: 'playSound' }>;
        return <span><strong>🔊 音声</strong>: {soundAction.soundId}</span>;

      case 'switchAnimation':
        const animAction = action as Extract<GameAction, { type: 'switchAnimation' }>;
        return <span><strong>🎬 アニメ切替</strong>: {getObjectName(animAction.targetId)} → フレーム{animAction.animationIndex}</span>;

      case 'setFlag':
        const setFlagAction = action as Extract<GameAction, { type: 'setFlag' }>;
        return <span><strong>🚩 フラグ設定</strong>: {setFlagAction.flagId} = {setFlagAction.value ? 'ON' : 'OFF'}</span>;

      case 'toggleFlag':
        const toggleFlagAction = action as Extract<GameAction, { type: 'toggleFlag' }>;
        return <span><strong>🔄 フラグ反転</strong>: {toggleFlagAction.flagId}</span>;

      case 'counter':
        const counterAction = action as Extract<GameAction, { type: 'counter' }>;
        const op = counterAction.operation === 'add' ? '+' :
                  counterAction.operation === 'subtract' ? '-' :
                  counterAction.operation === 'set' ? '=' :
                  counterAction.operation === 'multiply' ? '×' : counterAction.operation;
        return <span><strong>🔢 カウンター</strong>: {counterAction.counterName} {op} {counterAction.value}</span>;

      case 'addScore':
        const scoreAction = action as Extract<GameAction, { type: 'addScore' }>;
        return <span><strong>⭐ スコア</strong>: +{scoreAction.points}点</span>;

      case 'randomAction':
        const randAction = action as Extract<GameAction, { type: 'randomAction' }>;
        return <span><strong>🎲 ランダム実行</strong>: {randAction.actions?.length || 0}個のアクションから選択</span>;

      default:
        return <span><strong>❓</strong>: {actionType}</span>;
    }
  };

  return (
    <div 
      style={{ 
        height: '100%',
        padding: DESIGN_TOKENS.spacing[6],
        backgroundColor: DESIGN_TOKENS.colors.neutral[50],
        fontFamily: DESIGN_TOKENS.typography.fontFamily.sans.join(', '),
        color: DESIGN_TOKENS.colors.neutral[800],
        overflowY: 'auto'
      }}
    >
      
      {/* 通知表示 */}
      {notification && (
        <div 
          style={{
            position: 'fixed',
            top: DESIGN_TOKENS.spacing[4],
            right: DESIGN_TOKENS.spacing[4],
            zIndex: DESIGN_TOKENS.zIndex.notification,
            maxWidth: '400px'
          }}
        >
          <ModernCard variant="elevated" size="sm">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ 
                fontSize: DESIGN_TOKENS.typography.fontSize.xl, 
                marginRight: DESIGN_TOKENS.spacing[3] 
              }}>
                {notification.type === 'success' ? '✅' :
                 notification.type === 'error' ? '❌' : 'ℹ️'}
              </span>
              <p style={{ 
                fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                margin: 0,
                flex: 1,
                color: notification.type === 'success' 
                  ? DESIGN_TOKENS.colors.success[800] 
                  : notification.type === 'error' 
                    ? DESIGN_TOKENS.colors.error[800] 
                    : DESIGN_TOKENS.colors.primary[800]
              }}>
                {notification.message}
              </p>
              <ModernButton
                variant="ghost"
                size="xs"
                onClick={() => setNotification(null)}
                style={{ marginLeft: DESIGN_TOKENS.spacing[2] }}
              >
                ✕
              </ModernButton>
            </div>
          </ModernCard>
        </div>
      )}

      {/* 🔧 新規: ルール一覧ヘッダー（全展開/折りたたみボタン） */}
      {project.script.rules.length > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: DESIGN_TOKENS.spacing[4],
          padding: `${DESIGN_TOKENS.spacing[3]} ${DESIGN_TOKENS.spacing[4]}`,
          backgroundColor: DESIGN_TOKENS.colors.purple[100],
          borderRadius: DESIGN_TOKENS.borderRadius.lg
        }}>
          <div style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.lg,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
            color: DESIGN_TOKENS.colors.purple[800]
          }}>
            📋 ルール一覧（{project.script.rules.length}個）
          </div>
          <ModernButton
            variant="outline"
            size="sm"
            onClick={toggleAllRules}
            style={{
              borderColor: DESIGN_TOKENS.colors.purple[400],
              color: DESIGN_TOKENS.colors.purple[800]
            }}
          >
            {expandedRules.size === project.script.rules.length ? '📁 すべて折りたたむ' : '📂 すべて展開'}
          </ModernButton>
        </div>
      )}
      
      {/* ルール一覧 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN_TOKENS.spacing[4] }}>
        {project.script.rules.length === 0 ? (
          /* 空状態表示 */
          <ModernCard 
            variant="outlined" 
            size="xl"
            style={{ 
              backgroundColor: DESIGN_TOKENS.colors.neutral[0],
              border: `2px dashed ${DESIGN_TOKENS.colors.purple[400]}`,
              textAlign: 'center',
              padding: DESIGN_TOKENS.spacing[12]
            }}
          >
            <div style={{ marginBottom: DESIGN_TOKENS.spacing[6] }}>
              <div 
                style={{
                  fontSize: '4rem',
                  marginBottom: DESIGN_TOKENS.spacing[4],
                  filter: 'grayscale(0.3)'
                }}
              >
                🎯
              </div>
              <h4
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize['2xl'],
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                  color: DESIGN_TOKENS.colors.neutral[800],
                  marginBottom: DESIGN_TOKENS.spacing[3]
                }}
              >
                {t('editor.script.ruleList.empty.title')}
              </h4>
              <p
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                  color: DESIGN_TOKENS.colors.neutral[600],
                  lineHeight: DESIGN_TOKENS.typography.lineHeight.relaxed,
                  margin: 0,
                  maxWidth: '500px',
                  marginLeft: 'auto',
                  marginRight: 'auto',
                  marginBottom: DESIGN_TOKENS.spacing[6]
                }}
              >
                {t('editor.script.ruleList.empty.description')}
              </p>
              
              {/* 特徴紹介カード */}
              <div 
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: DESIGN_TOKENS.spacing[4],
                  marginBottom: DESIGN_TOKENS.spacing[8],
                  maxWidth: '600px',
                  marginLeft: 'auto',
                  marginRight: 'auto'
                }}
              >
                <div style={{ 
                  padding: DESIGN_TOKENS.spacing[4],
                  backgroundColor: DESIGN_TOKENS.colors.primary[100],
                  borderRadius: DESIGN_TOKENS.borderRadius.lg,
                  border: `1px solid ${DESIGN_TOKENS.colors.primary[300]}`
                }}>
                  <div style={{ fontSize: DESIGN_TOKENS.typography.fontSize['2xl'], marginBottom: DESIGN_TOKENS.spacing[2] }}>🔥</div>
                  <div style={{
                    fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                    color: DESIGN_TOKENS.colors.neutral[800],
                    fontSize: DESIGN_TOKENS.typography.fontSize.sm
                  }}>
                    {t('editor.script.ruleList.empty.features.conditions')}
                  </div>
                  <div style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                    color: DESIGN_TOKENS.colors.neutral[600]
                  }}>
                    {t('editor.script.ruleList.empty.features.conditionsDesc')}
                  </div>
                </div>

                <div style={{ 
                  padding: DESIGN_TOKENS.spacing[4],
                  backgroundColor: DESIGN_TOKENS.colors.success[100],
                  borderRadius: DESIGN_TOKENS.borderRadius.lg,
                  border: `1px solid ${DESIGN_TOKENS.colors.success[600]}`
                }}>
                  <div style={{ fontSize: DESIGN_TOKENS.typography.fontSize['2xl'], marginBottom: DESIGN_TOKENS.spacing[2] }}>⚡</div>
                  <div style={{
                    fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                    color: DESIGN_TOKENS.colors.neutral[800],
                    fontSize: DESIGN_TOKENS.typography.fontSize.sm
                  }}>
                    {t('editor.script.ruleList.empty.features.actions')}
                  </div>
                  <div style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                    color: DESIGN_TOKENS.colors.neutral[600]
                  }}>
                    {t('editor.script.ruleList.empty.features.actionsDesc')}
                  </div>
                </div>

                <div style={{ 
                  padding: DESIGN_TOKENS.spacing[4],
                  backgroundColor: DESIGN_TOKENS.colors.warning[100],
                  borderRadius: DESIGN_TOKENS.borderRadius.lg,
                  border: `1px solid ${DESIGN_TOKENS.colors.warning[600]}`
                }}>
                  <div style={{ fontSize: DESIGN_TOKENS.typography.fontSize['2xl'], marginBottom: DESIGN_TOKENS.spacing[2] }}>🚩</div>
                  <div style={{
                    fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                    color: DESIGN_TOKENS.colors.neutral[800],
                    fontSize: DESIGN_TOKENS.typography.fontSize.sm
                  }}>
                    {t('editor.script.ruleList.empty.features.flags')}
                  </div>
                  <div style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                    color: DESIGN_TOKENS.colors.neutral[600]
                  }}>
                    {t('editor.script.ruleList.empty.features.flagsDesc')}
                  </div>
                </div>
              </div>
            </div>
            
            <ModernButton
              variant="primary"
              size="lg"
              onClick={() => onModeChange('layout')}
              style={{
                backgroundColor: DESIGN_TOKENS.colors.success[500],
                borderColor: DESIGN_TOKENS.colors.success[500],
                fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                padding: `${DESIGN_TOKENS.spacing[4]} ${DESIGN_TOKENS.spacing[8]}`
              }}
            >
              <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.xl }}>🎨</span>
              {t('editor.script.ruleList.empty.backToLayout')}
            </ModernButton>
          </ModernCard>
        ) : (
          /* ルール一覧表示 - IF-THEN詳細表示対応版 */
          project.script.rules.map((rule, _index) => {
            const isExpanded = expandedRules.has(rule.id);
            
            return (
              <ModernCard
                key={rule.id}
                variant="elevated"
                size="lg"
                style={{ 
                  backgroundColor: rule.enabled 
                    ? DESIGN_TOKENS.colors.neutral[0] 
                    : DESIGN_TOKENS.colors.neutral[100],
                  border: rule.enabled 
                    ? `2px solid ${DESIGN_TOKENS.colors.purple[300]}` 
                    : `2px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                  opacity: rule.enabled ? 1 : 0.8,
                  transition: `all ${DESIGN_TOKENS.animation.duration.normal} ${DESIGN_TOKENS.animation.easing.inOut}`
                }}
              >
                {/* ルールヘッダー（クリックで展開/折りたたみ） */}
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    gap: DESIGN_TOKENS.spacing[4],
                    cursor: 'pointer'
                  }}
                  onClick={() => toggleRuleExpand(rule.id)}
                >
                  
                  {/* 左側: ルール情報 */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[4] }}>
                    
                    {/* 展開/折りたたみアイコン */}
                    <div 
                      style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: isExpanded 
                          ? DESIGN_TOKENS.colors.purple[500] 
                          : DESIGN_TOKENS.colors.neutral[300],
                        borderRadius: DESIGN_TOKENS.borderRadius.lg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: `all ${DESIGN_TOKENS.animation.duration.fast} ${DESIGN_TOKENS.animation.easing.inOut}`
                      }}
                    >
                      <span style={{ 
                        color: DESIGN_TOKENS.colors.neutral[0], 
                        fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: `transform ${DESIGN_TOKENS.animation.duration.fast} ${DESIGN_TOKENS.animation.easing.inOut}`
                      }}>
                        ▶
                      </span>
                    </div>
                    
                    {/* ルール詳細 */}
                    <div style={{ flex: 1 }}>
                      <h4 
                        style={{
                          fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                          fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                          color: DESIGN_TOKENS.colors.neutral[800],
                          margin: 0,
                          marginBottom: DESIGN_TOKENS.spacing[1],
                          lineHeight: DESIGN_TOKENS.typography.lineHeight.tight
                        }}
                      >
                        {rule.name}
                      </h4>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[3], flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                            color: DESIGN_TOKENS.colors.neutral[600],
                            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium
                          }}
                        >
                          🎯 {getObjectName(rule.targetObjectId)}
                        </span>

                        <div
                          style={{
                            padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[2]}`,
                            borderRadius: DESIGN_TOKENS.borderRadius.md,
                            fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                            fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                            backgroundColor: rule.enabled
                              ? DESIGN_TOKENS.colors.success[100]
                              : DESIGN_TOKENS.colors.neutral[200],
                            color: rule.enabled
                              ? DESIGN_TOKENS.colors.success[800]
                              : DESIGN_TOKENS.colors.neutral[600]
                          }}
                        >
                          {rule.enabled ? '✅ 有効' : '⏸️ 無効'}
                        </div>

                        <span
                          style={{
                            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                            color: DESIGN_TOKENS.colors.neutral[500],
                            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium
                          }}
                        >
                          🔥 {rule.triggers.conditions.length}条件 ⚡ {rule.actions.length}アクション
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* 右側: アクションボタン */}
                  <div 
                    style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[2], flexShrink: 0 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ModernButton
                      variant="outline"
                      size="sm"
                      onClick={() => onEditRule(rule)}
                      style={{
                        borderColor: DESIGN_TOKENS.colors.purple[500],
                        color: DESIGN_TOKENS.colors.purple[800]
                      }}
                    >
                      ✏️ 編集
                    </ModernButton>
                    <ModernButton
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteRule(rule.id)}
                      style={{
                        borderColor: DESIGN_TOKENS.colors.error[500],
                        color: DESIGN_TOKENS.colors.error[600]
                      }}
                    >
                      🗑️
                    </ModernButton>
                  </div>
                </div>

                {/* 🔧 新規: IF-THEN詳細表示（展開時のみ） */}
                {isExpanded && (
                  <div 
                    style={{
                      marginTop: DESIGN_TOKENS.spacing[4],
                      paddingTop: DESIGN_TOKENS.spacing[4],
                      borderTop: `1px solid ${DESIGN_TOKENS.colors.neutral[200]}`
                    }}
                  >
                    {/* IF: 条件一覧 */}
                    <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
                      <div 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: DESIGN_TOKENS.spacing[2],
                          marginBottom: DESIGN_TOKENS.spacing[2],
                          padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[3]}`,
                          backgroundColor: DESIGN_TOKENS.colors.primary[100],
                          borderRadius: DESIGN_TOKENS.borderRadius.md,
                          borderLeft: `4px solid ${DESIGN_TOKENS.colors.primary[500]}`
                        }}
                      >
                        <span style={{ 
                          fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                          fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                          color: DESIGN_TOKENS.colors.primary[800]
                        }}>
                          IF
                        </span>
                        <span style={{ 
                          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                          color: DESIGN_TOKENS.colors.primary[600]
                        }}>
                          （{rule.triggers.operator === 'AND' ? 'すべて満たす' : 'いずれかを満たす'}）
                        </span>
                      </div>
                      
                      {rule.triggers.conditions.length === 0 ? (
                        <div style={{
                          padding: DESIGN_TOKENS.spacing[3],
                          backgroundColor: DESIGN_TOKENS.colors.neutral[100],
                          borderRadius: DESIGN_TOKENS.borderRadius.md,
                          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                          color: DESIGN_TOKENS.colors.neutral[500],
                          fontStyle: 'italic'
                        }}>
                          条件が設定されていません
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN_TOKENS.spacing[2] }}>
                          {rule.triggers.conditions.map((condition, idx) => (
                            <div 
                              key={idx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: DESIGN_TOKENS.spacing[2],
                                padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[3]}`,
                                backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                                borderRadius: DESIGN_TOKENS.borderRadius.md,
                                border: `1px solid ${DESIGN_TOKENS.colors.primary[200]}`,
                                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                                color: DESIGN_TOKENS.colors.neutral[700]
                              }}
                            >
                              <span style={{ 
                                color: DESIGN_TOKENS.colors.primary[500],
                                fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                                minWidth: '20px'
                              }}>
                                {idx + 1}.
                              </span>
                              {formatCondition(condition, idx)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* THEN: アクション一覧 */}
                    <div>
                      <div 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: DESIGN_TOKENS.spacing[2],
                          marginBottom: DESIGN_TOKENS.spacing[2],
                          padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[3]}`,
                          backgroundColor: DESIGN_TOKENS.colors.success[100],
                          borderRadius: DESIGN_TOKENS.borderRadius.md,
                          borderLeft: `4px solid ${DESIGN_TOKENS.colors.success[500]}`
                        }}
                      >
                        <span style={{ 
                          fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                          fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                          color: DESIGN_TOKENS.colors.success[800]
                        }}>
                          THEN
                        </span>
                        <span style={{ 
                          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                          color: DESIGN_TOKENS.colors.success[600]
                        }}>
                          （順番に実行）
                        </span>
                      </div>
                      
                      {rule.actions.length === 0 ? (
                        <div style={{
                          padding: DESIGN_TOKENS.spacing[3],
                          backgroundColor: DESIGN_TOKENS.colors.neutral[100],
                          borderRadius: DESIGN_TOKENS.borderRadius.md,
                          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                          color: DESIGN_TOKENS.colors.neutral[500],
                          fontStyle: 'italic'
                        }}>
                          アクションが設定されていません
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN_TOKENS.spacing[2] }}>
                          {rule.actions.map((action, idx) => (
                            <div 
                              key={idx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: DESIGN_TOKENS.spacing[2],
                                padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[3]}`,
                                backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                                borderRadius: DESIGN_TOKENS.borderRadius.md,
                                border: `1px solid ${DESIGN_TOKENS.colors.success[200]}`,
                                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                                color: DESIGN_TOKENS.colors.neutral[700]
                              }}
                            >
                              <span style={{ 
                                color: DESIGN_TOKENS.colors.success[500],
                                fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                                minWidth: '20px'
                              }}>
                                {idx + 1}.
                              </span>
                              {formatAction(action, idx)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </ModernCard>
            );
          })
        )}
      </div>
    </div>
  );
};