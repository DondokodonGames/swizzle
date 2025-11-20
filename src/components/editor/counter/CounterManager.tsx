// src/components/editor/counter/CounterManager.tsx
// カウンター管理UIコンポーネント - SettingsTab統合用

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GameProject } from '../../../types/editor/GameProject';
import { 
  GameCounter, 
  PRESET_COUNTERS, 
  createCounterFromPreset, 
  createCounter,
  CounterCategory,
  CounterFormat,
  formatCounterValue
} from '../../../types/counterTypes';
import { DESIGN_TOKENS } from '../../../constants/DesignSystem';
import { ModernCard } from '../../ui/ModernCard';
import { ModernButton } from '../../ui/ModernButton';

interface CounterManagerProps {
  project: GameProject;
  onProjectUpdate: (project: GameProject) => void;
  onNotification?: (type: 'success' | 'error' | 'info', message: string) => void;
}

// カウンター編集モーダルの状態
interface CounterEditState {
  counter: GameCounter | null;
  isNew: boolean;
  isVisible: boolean;
}

export const CounterManager: React.FC<CounterManagerProps> = ({ 
  project, 
  onProjectUpdate,
  onNotification 
}) => {
  // 状態管理
  const [editState, setEditState] = useState<CounterEditState>({
    counter: null,
    isNew: false,
    isVisible: false
  });
  const [showPresetModal, setShowPresetModal] = useState(false);

  // 通知ヘルパー
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    if (onNotification) {
      onNotification(type, message);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  };

  // プロジェクト更新ヘルパー
  const updateProject = (updates: Partial<GameProject>) => {
    const updatedProject = {
      ...project,
      ...updates,
      lastModified: new Date().toISOString()
    };
    onProjectUpdate(updatedProject);
  };

  // カウンター一覧取得
  const getCounters = (): GameCounter[] => {
    return project.script?.counters || [];
  };

  // カウンター使用状況取得（ルール数をカウント）
  const getCounterUsageCount = (counterName: string): number => {
    if (!project.script?.rules) return 0;
    
    return project.script.rules.reduce((count, rule) => {
      // 条件での使用
      const conditionCount = rule.triggers.conditions.filter(condition => 
        condition.type === 'counter' && 
        'counterName' in condition && 
        condition.counterName === counterName
      ).length;
      
      // アクションでの使用
      const actionCount = rule.actions.filter(action => 
        action.type === 'counter' && 
        'counterName' in action && 
        action.counterName === counterName
      ).length;
      
      return count + conditionCount + actionCount;
    }, 0);
  };

  const { t } = useTranslation();

  // プリセットカウンター追加
  const handleAddPresetCounter = (presetId: string) => {
    const presetCounter = createCounterFromPreset(presetId);

    if (!presetCounter) {
      showNotification('error', t('editor.counter.presetCreationFailed'));
      return;
    }
    
    // 同名カウンターが既に存在するかチェック
    const existingCounters = getCounters();
    const nameExists = existingCounters.some(counter => counter.name === presetCounter.name);
    
    if (nameExists) {
      // 自動的に番号を付けて重複回避
      let counter = 1;
      let newName = presetCounter.name;
      while (existingCounters.some(c => c.name === newName)) {
        newName = `${presetCounter.name}${counter}`;
        counter++;
      }
      presetCounter.name = newName;
    }
    
    // プロジェクトに追加
    const updatedCounters = [...existingCounters, presetCounter];
    updateProject({
      script: {
        ...project.script,
        counters: updatedCounters
      }
    });
    
    setShowPresetModal(false);
    showNotification('success', t('editor.counter.presetCounterAdded', { name: presetCounter.name }));
  };

  // カスタムカウンター作成
  const handleCreateCustomCounter = () => {
    const newCounter = createCounter(t('editor.counter.newCounter'), 0);
    
    setEditState({
      counter: newCounter,
      isNew: true,
      isVisible: true
    });
  };

  // カウンター編集
  const handleEditCounter = (counter: GameCounter) => {
    setEditState({
      counter: { ...counter }, // コピーを作成
      isNew: false,
      isVisible: true
    });
  };

  // カウンター削除
  const handleDeleteCounter = (counterId: string) => {
    const existingCounters = getCounters();
    const counterToDelete = existingCounters.find(c => c.id === counterId);
    
    if (!counterToDelete) return;
    
    // 使用状況をチェック
    const usageCount = getCounterUsageCount(counterToDelete.name);
    
    if (usageCount > 0) {
      const confirmDelete = window.confirm(
        `カウンター「${counterToDelete.name}」は${usageCount}箇所のルールで使用されています。\n削除しますか？`
      );
      
      if (!confirmDelete) return;
    }
    
    // カウンターを削除
    const updatedCounters = existingCounters.filter(c => c.id !== counterId);
    updateProject({
      script: {
        ...project.script,
        counters: updatedCounters
      }
    });
    
    showNotification('success', t('editor.counter.counterDeleted', { name: counterToDelete.name }));
  };

  // カウンター保存
  const handleSaveCounter = (updatedCounter: GameCounter) => {
    const existingCounters = getCounters();
    
    if (editState.isNew) {
      // 新規追加
      const nameExists = existingCounters.some(c => c.name === updatedCounter.name && c.id !== updatedCounter.id);
      
      if (nameExists) {
        showNotification('error', t('editor.counter.nameAlreadyUsed', { name: updatedCounter.name }));
        return;
      }
      
      const updatedCounterList = [...existingCounters, updatedCounter];
      updateProject({
        script: {
          ...project.script,
          counters: updatedCounterList
        }
      });
      
      showNotification('success', t('editor.counter.counterCreated', { name: updatedCounter.name }));
    } else {
      // 既存更新
      const updatedCounterList = existingCounters.map(c => 
        c.id === updatedCounter.id ? updatedCounter : c
      );
      
      updateProject({
        script: {
          ...project.script,
          counters: updatedCounterList
        }
      });
      
      showNotification('success', t('editor.counter.counterUpdated', { name: updatedCounter.name }));
    }
    
    setEditState({ counter: null, isNew: false, isVisible: false });
  };

  // カテゴリアイコン取得
  const getCategoryIcon = (category: CounterCategory): string => {
    const icons: Record<CounterCategory, string> = {
      score: '🏆',
      status: '❤️',
      resource: '💰',
      progress: '📊',
      time: '⏱️',
      custom: '⚙️'
    };
    return icons[category] || '⚙️';
  };

  const counters = getCounters();

  return (
    <ModernCard variant="filled" size="md" style={{ backgroundColor: DESIGN_TOKENS.colors.purple[50] }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[3], marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <div 
          style={{
            width: '32px',
            height: '32px',
            backgroundColor: DESIGN_TOKENS.colors.purple[500],
            borderRadius: DESIGN_TOKENS.borderRadius.lg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: DESIGN_TOKENS.shadows.sm
          }}
        >
          <span style={{ color: DESIGN_TOKENS.colors.neutral[0], fontSize: DESIGN_TOKENS.typography.fontSize.sm }}>🔢</span>
        </div>
        <div>
          <h5 
            style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.lg,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
              color: DESIGN_TOKENS.colors.purple[800],
              margin: 0
            }}
          >
            ゲームカウンター設定（全オブジェクト共有）
          </h5>
          <p 
            style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.purple[600],
              margin: 0
            }}
          >
            スコア・ライフ・時間等を管理。全てのオブジェクトから操作可能
          </p>
        </div>
      </div>

      {/* カウンター追加ボタン */}
      <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[2], marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <ModernButton
          variant="primary"
          size="sm"
          onClick={() => setShowPresetModal(true)}
          style={{
            backgroundColor: DESIGN_TOKENS.colors.success[500],
            borderColor: DESIGN_TOKENS.colors.success[500]
          }}
        >
          📋 プリセット追加
        </ModernButton>
        
        <ModernButton
          variant="outline"
          size="sm"
          onClick={handleCreateCustomCounter}
          style={{
            borderColor: DESIGN_TOKENS.colors.purple[300],
            color: DESIGN_TOKENS.colors.purple[800]
          }}
        >
          ⚙️ カスタム作成
        </ModernButton>
      </div>

      {/* カウンター一覧 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN_TOKENS.spacing[3] }}>
        {counters.length === 0 ? (
          <div style={{
            padding: DESIGN_TOKENS.spacing[6],
            textAlign: 'center',
            backgroundColor: DESIGN_TOKENS.colors.neutral[0],
            borderRadius: DESIGN_TOKENS.borderRadius.xl,
            border: `2px dashed ${DESIGN_TOKENS.colors.purple[200]}`
          }}>
            <div style={{ fontSize: DESIGN_TOKENS.typography.fontSize['2xl'], marginBottom: DESIGN_TOKENS.spacing[3] }}>
              🔢
            </div>
            <p style={{ 
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              color: DESIGN_TOKENS.colors.purple[600],
              margin: 0,
              marginBottom: DESIGN_TOKENS.spacing[2]
            }}>
              カウンターが設定されていません
            </p>
            <p style={{ 
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.neutral[500],
              margin: 0
            }}>
              「プリセット追加」または「カスタム作成」から始めましょう
            </p>
          </div>
        ) : (
          counters.map((counter) => {
            const usageCount = getCounterUsageCount(counter.name);
            
            return (
              <div 
                key={counter.id}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: DESIGN_TOKENS.spacing[4], 
                  backgroundColor: DESIGN_TOKENS.colors.neutral[0], 
                  borderRadius: DESIGN_TOKENS.borderRadius.xl, 
                  boxShadow: DESIGN_TOKENS.shadows.sm, 
                  border: `1px solid ${DESIGN_TOKENS.colors.purple[100]}`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[3], flex: 1 }}>
                  {/* カテゴリアイコン */}
                  <div style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: DESIGN_TOKENS.colors.purple[100],
                    borderRadius: DESIGN_TOKENS.borderRadius.lg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: DESIGN_TOKENS.typography.fontSize.lg
                  }}>
                    {getCategoryIcon(counter.category || 'custom')}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: DESIGN_TOKENS.typography.fontSize.base,
                      fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                      color: DESIGN_TOKENS.colors.neutral[800],
                      marginBottom: DESIGN_TOKENS.spacing[1]
                    }}>
                      {counter.name}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[4] }}>
                      <div style={{
                        fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                        color: DESIGN_TOKENS.colors.neutral[600]
                      }}>
                        初期値: {formatCounterValue(counter.initialValue, counter.display?.format || 'number')}
                      </div>
                      
                      {(counter.min !== undefined || counter.max !== undefined) && (
                        <div style={{
                          fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                          color: DESIGN_TOKENS.colors.neutral[500],
                          padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[2]}`,
                          backgroundColor: DESIGN_TOKENS.colors.neutral[100],
                          borderRadius: DESIGN_TOKENS.borderRadius.md
                        }}>
                          範囲: {counter.min ?? '-∞'} ～ {counter.max ?? '+∞'}
                        </div>
                      )}
                      
                      {usageCount > 0 && (
                        <div style={{
                          fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                          color: DESIGN_TOKENS.colors.success[800],
                          padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[2]}`,
                          backgroundColor: DESIGN_TOKENS.colors.success[100],
                          borderRadius: DESIGN_TOKENS.borderRadius.md,
                          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium
                        }}>
                          使用中: {usageCount}箇所
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 操作ボタン */}
                <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[2] }}>
                  <ModernButton
                    variant="outline"
                    size="xs"
                    onClick={() => handleEditCounter(counter)}
                    style={{
                      borderColor: DESIGN_TOKENS.colors.purple[200],
                      color: DESIGN_TOKENS.colors.purple[800]
                    }}
                  >
                    ✏️ 編集
                  </ModernButton>
                  
                  <ModernButton
                    variant="ghost"
                    size="xs"
                    onClick={() => handleDeleteCounter(counter.id)}
                    style={{
                      color: DESIGN_TOKENS.colors.error[600]
                    }}
                  >
                    🗑️ 削除
                  </ModernButton>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 説明テキスト */}
      <div style={{
        marginTop: DESIGN_TOKENS.spacing[4],
        padding: DESIGN_TOKENS.spacing[3],
        backgroundColor: DESIGN_TOKENS.colors.purple[100],
        borderRadius: DESIGN_TOKENS.borderRadius.lg,
        fontSize: DESIGN_TOKENS.typography.fontSize.xs,
        color: DESIGN_TOKENS.colors.purple[800]
      }}>
        💡 カウンターの使い方：
        <br />• フラグと同様に、全てのオブジェクトから同じカウンターを操作できます
        <br />• ルール設定でカウンター条件・アクションを追加してください
        <br />• プリセット：よく使われる5種類（スコア・ライフ・時間・アイテム・進行度）
      </div>

      {/* プリセット選択モーダル */}
      {showPresetModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: DESIGN_TOKENS.zIndex.modal,
            padding: DESIGN_TOKENS.spacing[4]
          }}
        >
          <ModernCard 
            variant="elevated" 
            size="lg"
            style={{
              backgroundColor: DESIGN_TOKENS.colors.neutral[0],
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
          >
            <div style={{ padding: DESIGN_TOKENS.spacing[6] }}>
              <h3 style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.xl,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                color: DESIGN_TOKENS.colors.purple[800],
                margin: 0,
                marginBottom: DESIGN_TOKENS.spacing[4],
                display: 'flex',
                alignItems: 'center',
                gap: DESIGN_TOKENS.spacing[3]
              }}>
                <span>📋</span>
                プリセットカウンター選択
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: DESIGN_TOKENS.spacing[4] }}>
                {PRESET_COUNTERS.map((preset) => (
                  <div
                    key={preset.id}
                    style={{
                      padding: DESIGN_TOKENS.spacing[4],
                      border: `1px solid ${DESIGN_TOKENS.colors.purple[200]}`,
                      borderRadius: DESIGN_TOKENS.borderRadius.xl,
                      cursor: 'pointer',
                      transition: `all ${DESIGN_TOKENS.animation.duration.normal} ${DESIGN_TOKENS.animation.easing.inOut}`
                    }}
                    onClick={() => handleAddPresetCounter(preset.id)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = DESIGN_TOKENS.colors.purple[400];
                      e.currentTarget.style.backgroundColor = DESIGN_TOKENS.colors.purple[50];
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = DESIGN_TOKENS.colors.purple[200];
                      e.currentTarget.style.backgroundColor = DESIGN_TOKENS.colors.neutral[0];
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[3], marginBottom: DESIGN_TOKENS.spacing[3] }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        backgroundColor: DESIGN_TOKENS.colors.purple[100],
                        borderRadius: DESIGN_TOKENS.borderRadius.lg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: DESIGN_TOKENS.typography.fontSize.xl
                      }}>
                        {preset.icon}
                      </div>
                      <div>
                        <div style={{
                          fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                          fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                          color: DESIGN_TOKENS.colors.neutral[800]
                        }}>
                          {preset.name}
                        </div>
                        <div style={{
                          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                          color: DESIGN_TOKENS.colors.neutral[600]
                        }}>
                          {preset.description}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{
                      fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                      color: DESIGN_TOKENS.colors.neutral[500],
                      padding: DESIGN_TOKENS.spacing[2],
                      backgroundColor: DESIGN_TOKENS.colors.neutral[50],
                      borderRadius: DESIGN_TOKENS.borderRadius.md
                    }}>
                      初期値: {formatCounterValue(preset.defaultConfig.initialValue, preset.defaultConfig.display?.format || 'number')}
                      {preset.defaultConfig.min !== undefined && ` • 最小: ${preset.defaultConfig.min}`}
                      {preset.defaultConfig.max !== undefined && ` • 最大: ${preset.defaultConfig.max}`}
                    </div>
                  </div>
                ))}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: DESIGN_TOKENS.spacing[6] }}>
                <ModernButton
                  variant="secondary"
                  size="md"
                  onClick={() => setShowPresetModal(false)}
                >
                  キャンセル
                </ModernButton>
              </div>
            </div>
          </ModernCard>
        </div>
      )}

      {/* カウンター編集モーダル */}
      {editState.isVisible && editState.counter && (
        <CounterEditModal
          counter={editState.counter}
          isNew={editState.isNew}
          onSave={handleSaveCounter}
          onCancel={() => setEditState({ counter: null, isNew: false, isVisible: false })}
        />
      )}
    </ModernCard>
  );
};

// カウンター編集モーダルコンポーネント
interface CounterEditModalProps {
  counter: GameCounter;
  isNew: boolean;
  onSave: (counter: GameCounter) => void;
  onCancel: () => void;
}

const CounterEditModal: React.FC<CounterEditModalProps> = ({ counter, isNew, onSave, onCancel }) => {
  const { t } = useTranslation();
  const [editingCounter, setEditingCounter] = useState<GameCounter>({ ...counter });

  const handleSave = () => {
    // 基本検証
    if (!editingCounter.name.trim()) {
      alert(t('editor.counter.counterNameRequired'));
      return;
    }

    // 範囲検証
    if (editingCounter.min !== undefined && editingCounter.max !== undefined) {
      if (editingCounter.min > editingCounter.max) {
        alert(t('editor.counter.minMaxValidation'));
        return;
      }
    }

    const updatedCounter = {
      ...editingCounter,
      lastModified: new Date().toISOString()
    };

    onSave(updatedCounter);
  };

  const updateCounterField = <K extends keyof GameCounter>(field: K, value: GameCounter[K]) => {
    setEditingCounter(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: DESIGN_TOKENS.zIndex.modal,
        padding: DESIGN_TOKENS.spacing[4]
      }}
    >
      <ModernCard 
        variant="elevated" 
        size="lg"
        style={{
          backgroundColor: DESIGN_TOKENS.colors.neutral[0],
          maxWidth: '500px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto'
        }}
      >
        <div style={{ padding: DESIGN_TOKENS.spacing[6] }}>
          <h3 style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.xl,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
            color: DESIGN_TOKENS.colors.purple[800],
            margin: 0,
            marginBottom: DESIGN_TOKENS.spacing[4]
          }}>
            {isNew ? '📝 新しいカウンター作成' : '✏️ カウンター編集'}
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN_TOKENS.spacing[4] }}>
            {/* カウンター名 */}
            <div>
              <label style={{
                display: 'block',
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                color: DESIGN_TOKENS.colors.neutral[700],
                marginBottom: DESIGN_TOKENS.spacing[2]
              }}>
                カウンター名
              </label>
              <input
                type="text"
                value={editingCounter.name}
                onChange={(e) => updateCounterField('name', e.target.value)}
                placeholder="score, lives, time..."
                style={{
                  width: '100%',
                  padding: DESIGN_TOKENS.spacing[3],
                  border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                  borderRadius: DESIGN_TOKENS.borderRadius.md,
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm
                }}
              />
            </div>

            {/* 初期値 */}
            <div>
              <label style={{
                display: 'block',
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                color: DESIGN_TOKENS.colors.neutral[700],
                marginBottom: DESIGN_TOKENS.spacing[2]
              }}>
                初期値
              </label>
              <input
                type="number"
                value={editingCounter.initialValue}
                onChange={(e) => updateCounterField('initialValue', Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: DESIGN_TOKENS.spacing[3],
                  border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                  borderRadius: DESIGN_TOKENS.borderRadius.md,
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm
                }}
              />
            </div>

            {/* 範囲設定 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: DESIGN_TOKENS.spacing[3] }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                  color: DESIGN_TOKENS.colors.neutral[700],
                  marginBottom: DESIGN_TOKENS.spacing[2]
                }}>
                  最小値（オプション）
                </label>
                <input
                  type="number"
                  value={editingCounter.min || ''}
                  onChange={(e) => updateCounterField('min', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder={t('editor.counter.noLimit')}
                  style={{
                    width: '100%',
                    padding: DESIGN_TOKENS.spacing[3],
                    border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                    borderRadius: DESIGN_TOKENS.borderRadius.md,
                    fontSize: DESIGN_TOKENS.typography.fontSize.sm
                  }}
                />
              </div>
              
              <div>
                <label style={{
                  display: 'block',
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                  color: DESIGN_TOKENS.colors.neutral[700],
                  marginBottom: DESIGN_TOKENS.spacing[2]
                }}>
                  最大値（オプション）
                </label>
                <input
                  type="number"
                  value={editingCounter.max || ''}
                  onChange={(e) => updateCounterField('max', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder={t('editor.counter.noLimit')}
                  style={{
                    width: '100%',
                    padding: DESIGN_TOKENS.spacing[3],
                    border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                    borderRadius: DESIGN_TOKENS.borderRadius.md,
                    fontSize: DESIGN_TOKENS.typography.fontSize.sm
                  }}
                />
              </div>
            </div>

            {/* 説明文 */}
            <div>
              <label style={{
                display: 'block',
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                color: DESIGN_TOKENS.colors.neutral[700],
                marginBottom: DESIGN_TOKENS.spacing[2]
              }}>
                説明（オプション）
              </label>
              <textarea
                value={editingCounter.description || ''}
                onChange={(e) => updateCounterField('description', e.target.value)}
                placeholder={t('editor.counter.descriptionPlaceholder')}
                rows={3}
                style={{
                  width: '100%',
                  padding: DESIGN_TOKENS.spacing[3],
                  border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                  borderRadius: DESIGN_TOKENS.borderRadius.md,
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  resize: 'vertical'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: DESIGN_TOKENS.spacing[3], marginTop: DESIGN_TOKENS.spacing[6] }}>
            <ModernButton
              variant="secondary"
              size="md"
              onClick={onCancel}
            >
              キャンセル
            </ModernButton>
            
            <ModernButton
              variant="primary"
              size="md"
              onClick={handleSave}
              style={{
                backgroundColor: DESIGN_TOKENS.colors.purple[600],
                borderColor: DESIGN_TOKENS.colors.purple[600]
              }}
            >
              {isNew ? '作成' : '更新'}
            </ModernButton>
          </div>
        </div>
      </ModernCard>
    </div>
  );
};