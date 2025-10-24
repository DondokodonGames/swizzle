// src/components/editor/script/RuleList.tsx
// 重複削除・整理版: ヘッダーエリア削除・純粋なルール一覧に集約

import React, { useState } from 'react';
import { GameProject } from '../../../types/editor/GameProject';
import { GameRule } from '../../../types/editor/GameScript';
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
  selectedObjectId,
  onProjectUpdate,
  onEditRule,
  onCreateRule,
  onModeChange
}) => {
  // 通知システム（AssetsTabパターン）
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // 通知表示ヘルパー
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };
  
  // ルール削除
  const handleDeleteRule = (ruleId: string) => {
    const rule = project.script.rules.find(r => r.id === ruleId);
    if (confirm(`「${rule?.name || 'このルール'}」を削除しますか？`)) {
      const updatedScript = { ...project.script };
      updatedScript.rules = updatedScript.rules.filter(r => r.id !== ruleId);
      
      const updatedProject = {
        ...project,
        script: updatedScript,
        lastModified: new Date().toISOString()
      };
      
      onProjectUpdate(updatedProject);
      showNotification('success', 'ルールを削除しました');
    }
  };

  // 対象オブジェクト名取得
  const getObjectName = (objectId: string) => {
    if (objectId === 'stage') return '🌟 ゲーム全体';
    const obj = project.assets.objects.find(obj => obj.id === objectId);
    return obj ? `📦 ${obj.name}` : objectId;
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
      
      {/* 通知表示（AssetsTabパターン） */}
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
      
      {/* ルール一覧またはパターン（ヘッダー削除・純粋な一覧表示） */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN_TOKENS.spacing[4] }}>
        {project.script.rules.length === 0 ? (
          /* 空状態表示 - 魅力的な表示 */
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
                ルールを作成しよう！
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
                IF-THENルールで面白いゲームを作成<br />
                レイアウトモードでオブジェクトをクリックするとルール設定ができます
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
                    発動条件
                  </div>
                  <div style={{ 
                    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                    color: DESIGN_TOKENS.colors.neutral[600]
                  }}>
                    タッチ・時間・位置・衝突
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
                    実行アクション
                  </div>
                  <div style={{ 
                    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                    color: DESIGN_TOKENS.colors.neutral[600]
                  }}>
                    移動・効果・音声・成功
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
                    フラグ管理
                  </div>
                  <div style={{ 
                    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                    color: DESIGN_TOKENS.colors.neutral[600]
                  }}>
                    ゲーム状態・変数管理
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
              レイアウトモードに戻る
            </ModernButton>
          </ModernCard>
        ) : (
          /* ルール一覧表示 - シンプル化版 */
          project.script.rules.map((rule, index) => (
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: DESIGN_TOKENS.spacing[4] }}>
                
                {/* 左側: ルール情報 */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[4] }}>
                  
                  {/* アイコン */}
                  <div 
                    style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: rule.enabled 
                        ? DESIGN_TOKENS.colors.purple[500] 
                        : DESIGN_TOKENS.colors.neutral[400],
                      borderRadius: DESIGN_TOKENS.borderRadius.xl,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: DESIGN_TOKENS.shadows.md,
                      flexShrink: 0
                    }}
                  >
                    <span style={{ 
                      color: DESIGN_TOKENS.colors.neutral[0], 
                      fontSize: DESIGN_TOKENS.typography.fontSize.xl 
                    }}>
                      📝
                    </span>
                  </div>
                  
                  {/* ルール詳細 */}
                  <div style={{ flex: 1 }}>
                    <h4 
                      style={{
                        fontSize: DESIGN_TOKENS.typography.fontSize.xl,
                        fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                        color: DESIGN_TOKENS.colors.neutral[800],
                        margin: 0,
                        marginBottom: DESIGN_TOKENS.spacing[1],
                        lineHeight: DESIGN_TOKENS.typography.lineHeight.tight
                      }}
                    >
                      {rule.name}
                    </h4>
                    
                    <div 
                      style={{
                        fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                        color: DESIGN_TOKENS.colors.neutral[600],
                        fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                        marginBottom: DESIGN_TOKENS.spacing[2]
                      }}
                    >
                      対象: {getObjectName(rule.targetObjectId)}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[4] }}>
                      {/* 有効・無効バッジ */}
                      <div 
                        style={{
                          padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[3]}`,
                          borderRadius: DESIGN_TOKENS.borderRadius.lg,
                          fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                          fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                          backgroundColor: rule.enabled 
                            ? DESIGN_TOKENS.colors.success[100] 
                            : DESIGN_TOKENS.colors.neutral[200],
                          color: rule.enabled 
                            ? DESIGN_TOKENS.colors.success[800] 
                            : DESIGN_TOKENS.colors.neutral[600],
                          border: `1px solid ${rule.enabled 
                            ? DESIGN_TOKENS.colors.success[600] 
                            : DESIGN_TOKENS.colors.neutral[400]}`
                        }}
                      >
                        {rule.enabled ? '✅ 有効' : '⏸️ 無効'}
                      </div>

                      {/* 簡単な統計 */}
                      <div 
                        style={{
                          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                          color: DESIGN_TOKENS.colors.neutral[500],
                          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium
                        }}
                      >
                        🔥 {rule.triggers.conditions.length}条件 ⚡ {rule.actions.length}アクション
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 右側: アクションボタン */}
                <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[3], flexShrink: 0 }}>
                  <ModernButton
                    variant="outline"
                    size="md"
                    onClick={() => onEditRule(rule)}
                    style={{
                      borderColor: DESIGN_TOKENS.colors.purple[500],
                      color: DESIGN_TOKENS.colors.purple[700],
                      minWidth: '100px'
                    }}
                  >
                    <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.sm }}>✏️</span>
                    編集
                  </ModernButton>
                  <ModernButton
                    variant="outline"
                    size="md"
                    onClick={() => handleDeleteRule(rule.id)}
                    style={{
                      borderColor: DESIGN_TOKENS.colors.error[500],
                      color: DESIGN_TOKENS.colors.error[600],
                      minWidth: '100px'
                    }}
                  >
                    <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.sm }}>🗑️</span>
                    削除
                  </ModernButton>
                </div>
              </div>
            </ModernCard>
          ))
        )}
      </div>
    </div>
  );
};