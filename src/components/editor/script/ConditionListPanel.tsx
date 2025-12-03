// src/components/editor/script/ConditionListPanel.tsx
// IF条件選択パネル（コンパクト・固定高さ・スクロール可能）

import React from 'react';
import { useTranslation } from 'react-i18next';
import { TriggerCondition } from '../../../types/editor/GameScript';
import { ModernButton } from '../../ui/ModernButton';
import { CONDITION_LIBRARY, PRIORITY_CONDITION_LIBRARY } from './constants/RuleLibrary';
import { COLORS, SPACING, BORDER_RADIUS } from './ModalDesignConstants';

interface ConditionListPanelProps {
  conditions: TriggerCondition[];
  selectedIndex: number | null;
  operator: 'AND' | 'OR';
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
  onAdd: (type: string) => void;
  onOperatorChange: (operator: 'AND' | 'OR') => void;
}

export const ConditionListPanel: React.FC<ConditionListPanelProps> = ({
  conditions,
  selectedIndex,
  operator,
  onSelect,
  onRemove,
  onAdd,
  onOperatorChange
}) => {
  const { t } = useTranslation();

  return (
    <div style={{
      backgroundColor: COLORS.purple[50],
      border: `2px solid ${COLORS.purple[200]}`,
      borderRadius: BORDER_RADIUS.xl,
      padding: SPACING[4],
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>
      {/* ヘッダー */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: SPACING[3]
      }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: COLORS.purple[800],
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: SPACING[2]
        }}>
          <span style={{ fontSize: '20px' }}>🔥</span>
          {t('editor.script.ruleModal.sections.conditions', { count: conditions.length })}
        </h4>
        <select
          value={operator}
          onChange={(e) => onOperatorChange(e.target.value as 'AND' | 'OR')}
          style={{
            fontSize: '12px',
            border: `1px solid ${COLORS.purple[200]}`,
            borderRadius: BORDER_RADIUS.lg,
            padding: `${SPACING[1]} ${SPACING[2]}`,
            backgroundColor: COLORS.neutral[0]
          }}
        >
          <option value="AND">{t('editor.script.ruleModal.operators.and')}</option>
          <option value="OR">{t('editor.script.ruleModal.operators.or')}</option>
        </select>
      </div>

      {/* 条件追加ボタン */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))',
        gap: SPACING[1],
        marginBottom: SPACING[3]
      }}>
        {PRIORITY_CONDITION_LIBRARY.map((conditionType) => (
          <ModernButton
            key={conditionType.type}
            variant="outline"
            size="xs"
            onClick={() => onAdd(conditionType.type)}
            style={{
              borderColor: COLORS.purple[200],
              color: COLORS.purple[800],
              fontSize: '20px',
              padding: SPACING[2]
            }}
            title={conditionType.description}
          >
            {conditionType.icon}
          </ModernButton>
        ))}
      </div>

      {/* 条件リスト（固定高さ・スクロール） */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: SPACING[2]
      }}>
        {conditions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: COLORS.neutral[500],
            fontSize: '14px',
            padding: SPACING[4]
          }}>
            {t('editor.script.ruleModal.placeholders.addCondition')}
          </div>
        ) : (
          conditions.map((condition, index) => (
            <div
              key={index}
              onClick={() => onSelect(index)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: SPACING[2],
                padding: SPACING[2],
                backgroundColor: selectedIndex === index ? COLORS.purple[200] : COLORS.neutral[0],
                borderRadius: BORDER_RADIUS.lg,
                cursor: 'pointer',
                border: `2px solid ${selectedIndex === index ? COLORS.purple[500] : 'transparent'}`,
                transition: 'all 0.2s ease-in-out'
              }}
              onMouseEnter={(e) => {
                if (selectedIndex !== index) {
                  e.currentTarget.style.backgroundColor = COLORS.purple[100];
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
              <span style={{ fontSize: '18px' }}>
                {CONDITION_LIBRARY.find(c => c.type === condition.type)?.icon}
              </span>
              <span style={{ 
                flex: 1, 
                fontWeight: selectedIndex === index ? '600' : '400',
                fontSize: '14px'
              }}>
                {CONDITION_LIBRARY.find(c => c.type === condition.type)?.label}
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
          ))
        )}
      </div>
    </div>
  );
};