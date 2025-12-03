// src/components/editor/script/ActionListPanel.tsx
// THEN実行選択パネル（コンパクト・固定高さ・スクロール可能）
// Phase 1: 重複🎲ボタン削除

import React from 'react';
import { useTranslation } from 'react-i18next';
import { GameAction } from '../../../types/editor/GameScript';
import { ModernButton } from '../../ui/ModernButton';
import { PRIORITY_ACTION_LIBRARY, ACTION_LIBRARY } from './constants/RuleLibrary';
import { COLORS, SPACING, BORDER_RADIUS } from './ModalDesignConstants';

interface ActionListPanelProps {
  actions: GameAction[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
  onAdd: (type: string) => void;
}

export const ActionListPanel: React.FC<ActionListPanelProps> = ({
  actions,
  selectedIndex,
  onSelect,
  onRemove,
  onAdd
}) => {
  const { t } = useTranslation();

  return (
    <div style={{
      backgroundColor: COLORS.success[50],
      border: `2px solid ${COLORS.success[200]}`,
      borderRadius: BORDER_RADIUS.xl,
      padding: SPACING[4],
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>
      {/* ヘッダー */}
      <h4 style={{
        fontSize: '16px',
        fontWeight: 'bold',
        color: COLORS.success[800],
        margin: 0,
        marginBottom: SPACING[3],
        display: 'flex',
        alignItems: 'center',
        gap: SPACING[2]
      }}>
        <span style={{ fontSize: '20px' }}>⚡</span>
        {t('editor.script.ruleModal.sections.actions', { count: actions.length })}
      </h4>

      {/* アクション追加ボタン */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))',
        gap: SPACING[1],
        marginBottom: SPACING[3]
      }}>
        {PRIORITY_ACTION_LIBRARY.map((actionType) => (
          <ModernButton
            key={actionType.type}
            variant="outline"
            size="xs"
            onClick={() => onAdd(actionType.type)}
            style={{
              borderColor: COLORS.success[200],
              color: COLORS.success[800],
              fontSize: '20px',
              padding: SPACING[2]
            }}
            title={actionType.description}
          >
            {actionType.icon}
          </ModernButton>
        ))}
        {/* Phase 1: 重複🎲ボタン削除 - PRIORITY_ACTION_LIBRARYにrandomActionが含まれるため不要 */}
      </div>

      {/* アクションリスト（固定高さ・スクロール） */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: SPACING[2]
      }}>
        {actions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: COLORS.neutral[500],
            fontSize: '14px',
            padding: SPACING[4]
          }}>
            {t('editor.script.ruleModal.placeholders.addAction')}
          </div>
        ) : (
          actions.map((action, index) => {
            const actionInfo = PRIORITY_ACTION_LIBRARY.find(a => a.type === action.type) || 
                              ACTION_LIBRARY.find(a => a.type === action.type);
            const icon = action.type === 'randomAction' ? '🎲' : (actionInfo?.icon || '⚡');
            const label = action.type === 'randomAction' 
              ? t('actions.randomAction.label') 
              : (actionInfo?.label || action.type);

            return (
              <div
                key={index}
                onClick={() => onSelect(index)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: SPACING[2],
                  padding: SPACING[2],
                  backgroundColor: selectedIndex === index ? COLORS.success[200] : COLORS.neutral[0],
                  borderRadius: BORDER_RADIUS.lg,
                  cursor: 'pointer',
                  border: `2px solid ${selectedIndex === index ? COLORS.success[500] : 'transparent'}`,
                  transition: 'all 0.2s ease-in-out'
                }}
                onMouseEnter={(e) => {
                  if (selectedIndex !== index) {
                    e.currentTarget.style.backgroundColor = COLORS.success[100];
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedIndex !== index) {
                    e.currentTarget.style.backgroundColor = COLORS.neutral[0];
                  }
                }}
              >
                <span style={{ fontSize: '18px' }}>
                  {selectedIndex === index ? '●' : '○'}
                </span>
                <span style={{ fontSize: '18px' }}>{icon}</span>
                <span style={{ 
                  flex: 1, 
                  fontWeight: selectedIndex === index ? '600' : '400',
                  fontSize: '14px'
                }}>
                  {label}
                </span>
                <ModernButton
                  variant="ghost"
                  size="xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(index);
                  }}
                  style={{ fontSize: '14px' }}
                >
                  ✕
                </ModernButton>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};