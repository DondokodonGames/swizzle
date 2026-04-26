// src/components/editor/script/DetailEditorPanel.tsx
// 詳細設定エリア（広い・選択されたルールを編集）
// Phase 3-1修正: CollisionConditionEditorにproject追加（項目6&7対応）

import React from 'react';
import { useTranslation } from 'react-i18next';
import { TriggerCondition, GameAction, GameFlag } from '../../../types/editor/GameScript';
import { GameProject } from '../../../types/editor/GameProject';
import { GameCounter } from '../../../types/counterTypes';
import { ModernCard } from '../../ui/ModernCard';
import { COLORS, SPACING, BORDER_RADIUS } from './ModalDesignConstants';

// 条件エディターインポート
import { TouchConditionEditor } from './conditions/TouchConditionEditor';
import { TimeConditionEditor } from './conditions/TimeConditionEditor';
import { FlagConditionEditor } from './conditions/FlagConditionEditor';
import { CollisionConditionEditor } from './conditions/CollisionConditionEditor';
import { GameStateConditionEditor } from './conditions/GameStateConditionEditor';
import { AnimationConditionEditor } from './conditions/AnimationConditionEditor';
import { ObjectStateConditionEditor } from './conditions/ObjectStateConditionEditor';
import { CounterConditionEditor } from './CounterRuleComponents';
import { RandomConditionEditor } from './RandomRuleComponents';

// アクションエディターインポート
import { SoundActionEditor } from './actions/SoundActionEditor';
import { MoveActionEditor } from './actions/MoveActionEditor';
import { EffectActionEditor } from './actions/EffectActionEditor';
import { FlagActionEditor } from './actions/FlagActionEditor';
import { CounterActionEditor } from './CounterRuleComponents';
import { RandomActionEditor } from './RandomRuleComponents';
// Phase 1: 新規統合エディター追加
import { GameStateActionEditor } from './actions/GameStateActionEditor';
import { ObjectStateActionEditor } from './actions/ObjectStateActionEditor';

interface DetailEditorPanelProps {
  selectedType: 'condition' | 'action' | null;
  selectedCondition: TriggerCondition | null;
  selectedConditionIndex: number | null;
  selectedAction: GameAction | null;
  selectedActionIndex: number | null;
  project: GameProject;
  projectFlags: GameFlag[];
  projectCounters: GameCounter[];
  onConditionUpdate: (index: number, updates: Partial<TriggerCondition>) => void;
  onActionUpdate: (index: number, updates: Partial<GameAction>) => void;
  onConditionRemove: (index: number) => void;
  onActionRemove: (index: number) => void;
  onShowNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const DetailEditorPanel: React.FC<DetailEditorPanelProps> = ({
  selectedType,
  selectedCondition,
  selectedConditionIndex,
  selectedAction,
  selectedActionIndex,
  project,
  projectFlags,
  projectCounters,
  onConditionUpdate,
  onActionUpdate,
  onConditionRemove,
  onActionRemove,
  onShowNotification
}) => {
  const { t } = useTranslation();

  // 条件エディター分岐レンダリング
  const renderConditionEditor = () => {
    if (!selectedCondition || selectedConditionIndex === null) return null;

    switch (selectedCondition.type) {
      case 'touch':
        return (
          <TouchConditionEditor
            condition={selectedCondition}
            index={selectedConditionIndex}
            project={project}  // ✅ この行を追加
            onUpdate={onConditionUpdate}
          />
        );
      case 'time':
        return (
          <TimeConditionEditor
            condition={selectedCondition}
            index={selectedConditionIndex}
            onUpdate={onConditionUpdate}
          />
        );
      case 'collision':
        return (
          <CollisionConditionEditor
            condition={selectedCondition}
            index={selectedConditionIndex}
            project={project}
            onUpdate={onConditionUpdate}
          />
        );
      case 'gameState':
        return (
          <GameStateConditionEditor
            condition={selectedCondition}
            index={selectedConditionIndex}
            onUpdate={onConditionUpdate}
          />
        );
      
      // ✅ Phase 2: objectState条件エディター追加
      case 'objectState':
        return (
          <ObjectStateConditionEditor
            condition={selectedCondition as TriggerCondition & { type: 'objectState' }}
            project={project}
            index={selectedConditionIndex}
            onUpdate={onConditionUpdate}
          />
        );

      // 既存のanimation条件エディター（後方互換性のため保持）
      case 'animation':
        return (
          <AnimationConditionEditor
            condition={selectedCondition}
            index={selectedConditionIndex}
            project={project}
            onUpdate={onConditionUpdate}
          />
        );
      
      case 'flag':
        return (
          <FlagConditionEditor
            condition={selectedCondition}
            index={selectedConditionIndex}
            projectFlags={projectFlags}
            onUpdate={onConditionUpdate}
          />
        );
      case 'counter':
        return (
          <CounterConditionEditor
            condition={selectedCondition as Extract<TriggerCondition, { type: 'counter' }>}
            project={{ ...project, script: { ...project.script, counters: projectCounters } }}
            onChange={(updatedCondition) => onConditionUpdate(selectedConditionIndex, updatedCondition)}
            onRemove={() => onConditionRemove(selectedConditionIndex)}
          />
        );
      case 'random':
        return (
          <RandomConditionEditor
            condition={selectedCondition as Extract<TriggerCondition, { type: 'random' }>}
            onChange={(updatedCondition) => onConditionUpdate(selectedConditionIndex, updatedCondition)}
            onRemove={() => onConditionRemove(selectedConditionIndex)}
          />
        );
      default:
        return null;
    }
  };

  // アクションエディター分岐レンダリング
  const renderActionEditor = () => {
    if (!selectedAction || selectedActionIndex === null) return null;

    switch (selectedAction.type) {
      // ✅ Phase 1修正: 既存の型でGameStateActionEditorを呼び出す
      case 'success':
      case 'failure':
      case 'pause':
      case 'restart':
        return (
          <GameStateActionEditor
            action={selectedAction}
            index={selectedActionIndex}
            onUpdate={onActionUpdate}
            onShowNotification={onShowNotification}
          />
        );
      
      // ✅ Phase 1修正: 既存の型でObjectStateActionEditorを呼び出す
      case 'show':
      case 'hide':
      case 'switchAnimation':
        return (
          <ObjectStateActionEditor
            action={selectedAction}
            project={project}
            index={selectedActionIndex}
            onUpdate={onActionUpdate}
            onShowNotification={onShowNotification}
          />
        );

      // 既存のエディター（そのまま保持）
      case 'playSound':
        return (
          <SoundActionEditor
            action={selectedAction}
            index={selectedActionIndex}
            project={project}
            onUpdate={onActionUpdate}
            onShowNotification={onShowNotification}
          />
        );
      case 'move':
        return (
          <MoveActionEditor
            action={selectedAction}
            index={selectedActionIndex}
            project={project} 
            onUpdate={onActionUpdate}
            onShowNotification={onShowNotification}
          />
        );
      case 'effect':
        return (
          <EffectActionEditor
            action={selectedAction}
            index={selectedActionIndex}
            project={project}
            onUpdate={onActionUpdate}
            onShowNotification={onShowNotification}
          />
        );
      case 'setFlag':
      case 'toggleFlag':
        return (
          <FlagActionEditor
            action={selectedAction}
            index={selectedActionIndex}
            projectFlags={projectFlags}
            onUpdate={onActionUpdate}
            onShowNotification={onShowNotification}
          />
        );
      case 'counter':
        return (
          <CounterActionEditor
            action={selectedAction as Extract<GameAction, { type: 'counter' }>}
            project={{ ...project, script: { ...project.script, counters: projectCounters } }}
            onChange={(updatedAction) => onActionUpdate(selectedActionIndex, updatedAction)}
            onRemove={() => onActionRemove(selectedActionIndex)}
          />
        );
      case 'randomAction':
        return (
          <RandomActionEditor
            action={selectedAction as Extract<GameAction, { type: 'randomAction' }>}
            onChange={(updatedAction) => onActionUpdate(selectedActionIndex, updatedAction)}
            onRemove={() => onActionRemove(selectedActionIndex)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <ModernCard
      variant="outlined"
      size="lg"
      style={{
        minHeight: '400px',
        backgroundColor: COLORS.neutral[50],
        border: `2px solid ${COLORS.neutral[200]}`
      }}
    >
      {selectedType === null ? (
        // 何も選択されていない状態
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          color: COLORS.neutral[500]
        }}>
          <span style={{ fontSize: '64px', marginBottom: SPACING[4] }}>🔍</span>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '600',
            margin: 0,
            marginBottom: SPACING[2]
          }}>
            {t('editor.script.ruleModal.placeholders.selectRule')}
          </h3>
          <p style={{ 
            fontSize: '14px',
            margin: 0,
            textAlign: 'center',
            maxWidth: '400px'
          }}>
            {t('editor.script.ruleModal.placeholders.selectRuleDescription')}
          </p>
        </div>
      ) : selectedType === 'condition' ? (
        // 条件の詳細設定
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: SPACING[3],
            marginBottom: SPACING[4],
            paddingBottom: SPACING[3],
            borderBottom: `2px solid ${COLORS.purple[200]}`
          }}>
            <span style={{ 
              fontSize: '32px',
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: COLORS.purple[100],
              borderRadius: BORDER_RADIUS.lg
            }}>
              🔥
            </span>
            <div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: COLORS.purple[800],
                margin: 0,
                marginBottom: SPACING[1]
              }}>
                {t('editor.script.ruleModal.titles.conditionDetail')}
              </h3>
              <p style={{
                fontSize: '14px',
                color: COLORS.neutral[600],
                margin: 0
              }}>
                {t('editor.script.ruleModal.descriptions.conditionDetail')}
              </p>
            </div>
          </div>
          {renderConditionEditor()}
        </div>
      ) : (
        // アクションの詳細設定
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: SPACING[3],
            marginBottom: SPACING[4],
            paddingBottom: SPACING[3],
            borderBottom: `2px solid ${COLORS.success[200]}`
          }}>
            <span style={{ 
              fontSize: '32px',
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: COLORS.success[100],
              borderRadius: BORDER_RADIUS.lg
            }}>
              ⚡
            </span>
            <div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: COLORS.success[800],
                margin: 0,
                marginBottom: SPACING[1]
              }}>
                {t('editor.script.ruleModal.titles.actionDetail')}
              </h3>
              <p style={{
                fontSize: '14px',
                color: COLORS.neutral[600],
                margin: 0
              }}>
                {t('editor.script.ruleModal.descriptions.actionDetail')}
              </p>
            </div>
          </div>
          {renderActionEditor()}
        </div>
      )}
    </ModernCard>
  );
};