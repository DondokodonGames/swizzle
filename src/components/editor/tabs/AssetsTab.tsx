// src/components/editor/tabs/AssetsTab.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GameProject } from '../../../types/editor/GameProject';
import { EDITOR_LIMITS } from '../../../constants/EditorLimits';
import { DESIGN_TOKENS } from '../../../constants/DesignSystem';
import { ModernCard } from '../../ui/ModernCard';
import { useNotification } from '../../../hooks/editor/useNotification';

// セクションコンポーネントインポート（3つ完成）
import { BackgroundSection } from './assets/sections/BackgroundSection';
import { ObjectSection } from './assets/sections/ObjectSection';
import { SoundSection } from './assets/sections/SoundSection';

interface AssetsTabProps {
  project: GameProject;
  onProjectUpdate: (project: GameProject) => void;
}

type AssetType = 'background' | 'objects' | 'sound';

// ファイルサイズを人間が読みやすい形式に変換
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const AssetsTab: React.FC<AssetsTabProps> = ({ project, onProjectUpdate }) => {
  const { t } = useTranslation();
  const [activeAssetType, setActiveAssetType] = useState<AssetType>('background');
  const { notifications, hideNotification } = useNotification();

  // 容量計算（画像+音声）
  const totalSize = project.assets.statistics?.totalSize || 0;
  const sizePercentage = (totalSize / EDITOR_LIMITS.PROJECT.TOTAL_MAX_SIZE) * 100;

  return (
    <div 
      style={{ 
        padding: DESIGN_TOKENS.spacing[6],
        fontFamily: DESIGN_TOKENS.typography.fontFamily.sans.join(', '),
        backgroundColor: DESIGN_TOKENS.colors.neutral[50],
        minHeight: '100%'
      }}
    >
      {/* 通知表示システム */}
      {notifications.map((notification) => (
        <div 
          key={notification.id}
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
              <button
                onClick={() => hideNotification(notification.id)}
                style={{
                  marginLeft: DESIGN_TOKENS.spacing[2],
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  color: DESIGN_TOKENS.colors.neutral[500]
                }}
              >
                ✕
              </button>
            </div>
          </ModernCard>
        </div>
      ))}

      {/* 分割アーキテクチャ完成通知 */}
      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-green-600 font-medium">🎉 分割アーキテクチャ完成:</span>
            <span className="text-sm">
              3セクション統合完了・1000行→300行×3・保守性劇的向上
            </span>
          </div>
          <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded font-bold">
            Phase E-1 完了
          </span>
        </div>
      </div>

      {/* 容量表示（画像+音声統合） */}
      <ModernCard variant="filled" size="sm" style={{ marginBottom: DESIGN_TOKENS.spacing[6] }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: DESIGN_TOKENS.spacing[2] }}>
          <span 
            style={{ 
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              color: DESIGN_TOKENS.colors.neutral[700] 
            }}
          >
            {t('editor.assets.usedCapacity')}
          </span>
          <span 
            style={{ 
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              color: DESIGN_TOKENS.colors.neutral[600] 
            }}
          >
            {formatFileSize(totalSize)} / {formatFileSize(EDITOR_LIMITS.PROJECT.TOTAL_MAX_SIZE)}
          </span>
        </div>
        <div 
          style={{
            width: '100%',
            height: '8px',
            backgroundColor: DESIGN_TOKENS.colors.neutral[200],
            borderRadius: DESIGN_TOKENS.borderRadius.full,
            overflow: 'hidden'
          }}
        >
          <div 
            style={{
              height: '100%',
              backgroundColor: sizePercentage > 90 
                ? DESIGN_TOKENS.colors.error[500] 
                : sizePercentage > 70 
                  ? DESIGN_TOKENS.colors.warning[500] 
                  : DESIGN_TOKENS.colors.success[500],
              width: `${Math.min(sizePercentage, 100)}%`,
              transition: `all ${DESIGN_TOKENS.animation.duration.normal} ${DESIGN_TOKENS.animation.easing.inOut}`
            }}
          />
        </div>
        {sizePercentage > 80 && (
          <p 
            style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.warning[600],
              margin: `${DESIGN_TOKENS.spacing[1]} 0 0 0`
            }}
          >
            {t('editor.assets.capacityWarning')}
          </p>
        )}
      </ModernCard>

      {/* メインタブ切り替え（背景・オブジェクト・サウンド） */}
      <div 
        style={{
          display: 'flex',
          backgroundColor: DESIGN_TOKENS.colors.neutral[0],
          borderRadius: DESIGN_TOKENS.borderRadius.lg,
          padding: DESIGN_TOKENS.spacing[1],
          marginBottom: DESIGN_TOKENS.spacing[6],
          boxShadow: DESIGN_TOKENS.shadows.sm
        }}
      >
        {[
          { 
            id: 'background' as AssetType, 
            label: t('editor.assets.background'), 
            icon: '🖼️', 
            count: project.assets.background ? 1 : 0,
            status: '✅ 完成'
          },
          { 
            id: 'objects' as AssetType, 
            label: t('editor.assets.objects'), 
            icon: '🎨', 
            count: project.assets.objects.length,
            status: '🎬 アニメ統合'
          },
          { 
            id: 'sound' as AssetType, 
            label: t('editor.assets.sound'), 
            icon: '🎵', 
            count: (project.assets.audio?.bgm ? 1 : 0) + (project.assets.audio?.se?.length || 0),
            status: '✅ 完成'
          }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveAssetType(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: DESIGN_TOKENS.spacing[1],
              padding: `${DESIGN_TOKENS.spacing[3]} ${DESIGN_TOKENS.spacing[2]}`,
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              backgroundColor: activeAssetType === tab.id 
                ? DESIGN_TOKENS.colors.purple[500]
                : 'transparent',
              color: activeAssetType === tab.id 
                ? DESIGN_TOKENS.colors.neutral[0]
                : DESIGN_TOKENS.colors.neutral[600],
              border: 'none',
              borderRadius: DESIGN_TOKENS.borderRadius.md,
              cursor: 'pointer',
              transition: `all ${DESIGN_TOKENS.animation.duration.fast} ${DESIGN_TOKENS.animation.easing.inOut}`
            }}
            onMouseEnter={(e) => {
              if (activeAssetType !== tab.id) {
                e.currentTarget.style.backgroundColor = DESIGN_TOKENS.colors.neutral[100];
                e.currentTarget.style.color = DESIGN_TOKENS.colors.neutral[800];
              }
            }}
            onMouseLeave={(e) => {
              if (activeAssetType !== tab.id) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = DESIGN_TOKENS.colors.neutral[600];
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[1] }}>
              <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.base }}>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span 
                  style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                    padding: `2px ${DESIGN_TOKENS.spacing[1]}`,
                    backgroundColor: activeAssetType === tab.id 
                      ? DESIGN_TOKENS.colors.neutral[0]
                      : DESIGN_TOKENS.colors.purple[100],
                    color: activeAssetType === tab.id 
                      ? DESIGN_TOKENS.colors.purple[600]
                      : DESIGN_TOKENS.colors.purple[700],
                    borderRadius: DESIGN_TOKENS.borderRadius.full,
                    fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                    minWidth: '16px',
                    textAlign: 'center'
                  }}
                >
                  {tab.count}
                </span>
              )}
            </div>
            <span 
              style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                opacity: 0.8,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.normal
              }}
            >
              {tab.status}
            </span>
          </button>
        ))}
      </div>

      {/* 3セクション表示 */}
      {activeAssetType === 'background' && (
        <BackgroundSection 
          project={project} 
          onProjectUpdate={onProjectUpdate}
        />
      )}

      {activeAssetType === 'objects' && (
        <ObjectSection 
          project={project} 
          onProjectUpdate={onProjectUpdate}
        />
      )}

      {activeAssetType === 'sound' && (
        <SoundSection 
          project={project} 
          onProjectUpdate={onProjectUpdate}
        />
      )}
    </div>
  );
};