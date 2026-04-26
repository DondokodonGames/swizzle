// src/components/editor/tabs/assets/sections/SoundSection.tsx
// 🔧 Phase E-1修正版: TypeScriptエラー解決・nullチェック追加
// 🔧 audio プロパティエラー修正版（約40箇所修正）
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GameProject } from '../../../../../types/editor/GameProject';
import { AudioAsset } from '../../../../../types/editor/ProjectAssets';
import { EDITOR_LIMITS } from '../../../../../constants/EditorLimits';
import { DESIGN_TOKENS } from '../../../../../constants/DesignSystem';
import { ModernButton } from '../../../../ui/ModernButton';
import { ModernCard } from '../../../../ui/ModernCard';
import { DragDropZone } from '../../../../ui/DragDropZone';
import { useAssetUpload } from '../../../../../hooks/editor/useAssetUpload';
import { useNotification } from '../../../../../hooks/editor/useNotification';
import { useAudioPlayback } from '../../../../../hooks/editor/useAudioPlayback';

interface SoundSectionProps {
  project: GameProject;
  onProjectUpdate: (project: GameProject) => void;
}

type SoundType = 'bgm' | 'se';

// ファイルサイズを人間が読みやすい形式に変換
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const SoundSection: React.FC<SoundSectionProps> = ({
  project,
  onProjectUpdate
}) => {
  const { t } = useTranslation();
  const { uploading, uploadAudioFile, deleteAsset, updateAssetProperty } = useAssetUpload(project, onProjectUpdate);
  const { showSuccess, showError } = useNotification();
  const {
    playbackState,
    audioRef,
    playAudio,
    stopAudio,
    isPlaying,
    formatTime
  } = useAudioPlayback();

  // サウンド管理用状態
  const [activeSoundType, setActiveSoundType] = useState<SoundType>('bgm');
  const [editingAudioId, setEditingAudioId] = useState<string | null>(null);

  // 音声ファイルアップロード処理
  const handleAudioUpload = async (files: FileList, type: SoundType) => {
    if (uploading) return;

    const file = files[0];
    if (!file) {
      showError(t('errors.fileNotSelected'));
      return;
    }

    const result = await uploadAudioFile(file, type);
    if (result.success) {
      showSuccess(result.message);
    } else {
      showError(result.message);
    }
  };

  // 🔧 修正箇所1: 音声削除処理（71行目付近）
  const handleAudioDelete = (type: SoundType, id?: string) => {
    // 再生中の音声を削除する場合は停止
    // ✅ 修正: オプショナルチェーン追加
    if ((type === 'bgm' && project.assets.audio?.bgm && playbackState.playingId === project.assets.audio.bgm.id) ||
        (type === 'se' && playbackState.playingId === id)) {
      stopAudio();
    }

    const result = deleteAsset(type, id);
    if (result.success) {
      showSuccess(result.message);
    } else {
      showError(result.message);
    }
  };

  // 音声プロパティ更新処理
  const handlePropertyUpdate = (type: SoundType, id: string, property: string, value: any) => {
    const result = updateAssetProperty(type, id, property, value);
    if (!result.success) {
      showError(result.message);
    }
  };

  // 音声再生処理
  const handleAudioPlay = async (audio: AudioAsset) => {
    try {
      await playAudio(audio);
    } catch (error) {
      showError(t('errors.audioPlaybackFailed'));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: DESIGN_TOKENS.spacing[4] }}>
        <h3
          style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.lg,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
            color: DESIGN_TOKENS.colors.neutral[800],
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: DESIGN_TOKENS.spacing[2]
          }}
        >
          {t('editor.assets.soundTitle')}
          <span
            style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              color: DESIGN_TOKENS.colors.neutral[500],
              fontWeight: DESIGN_TOKENS.typography.fontWeight.normal
            }}
          >
            {/* 🔧 修正箇所2: カウント表示（123行目） */}
            {/* ✅ 修正: オプショナルチェーン追加 */}
            (BGM: {project.assets.audio?.bgm ? 1 : 0}/1, SE: {project.assets.audio?.se?.length || 0}/{EDITOR_LIMITS.PROJECT.MAX_SE_COUNT})
          </span>
        </h3>
      </div>

      {/* サウンドタブ切り替え（BGM・SE） */}
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
        {/* 🔧 修正箇所3: タブカウント（140-141行目） */}
        {[
          /* ✅ 修正: オプショナルチェーン追加 */
          { id: 'bgm' as SoundType, label: t('editor.assets.bgm'), icon: '🎵', count: project.assets.audio?.bgm ? 1 : 0 },
          { id: 'se' as SoundType, label: t('editor.assets.soundEffects'), icon: '🔊', count: project.assets.audio?.se?.length || 0 }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSoundType(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: DESIGN_TOKENS.spacing[2],
              padding: `${DESIGN_TOKENS.spacing[3]} ${DESIGN_TOKENS.spacing[4]}`,
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              backgroundColor: activeSoundType === tab.id 
                ? DESIGN_TOKENS.colors.purple[500]
                : 'transparent',
              color: activeSoundType === tab.id 
                ? DESIGN_TOKENS.colors.neutral[0]
                : DESIGN_TOKENS.colors.neutral[600],
              border: 'none',
              borderRadius: DESIGN_TOKENS.borderRadius.md,
              cursor: 'pointer',
              transition: `all ${DESIGN_TOKENS.animation.duration.fast} ${DESIGN_TOKENS.animation.easing.inOut}`
            }}
            onMouseEnter={(e) => {
              if (activeSoundType !== tab.id) {
                e.currentTarget.style.backgroundColor = DESIGN_TOKENS.colors.neutral[100];
                e.currentTarget.style.color = DESIGN_TOKENS.colors.neutral[800];
              }
            }}
            onMouseLeave={(e) => {
              if (activeSoundType !== tab.id) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = DESIGN_TOKENS.colors.neutral[600];
              }
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span 
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[2]}`,
                  backgroundColor: activeSoundType === tab.id 
                    ? DESIGN_TOKENS.colors.neutral[0]
                    : DESIGN_TOKENS.colors.purple[100],
                  color: activeSoundType === tab.id 
                    ? DESIGN_TOKENS.colors.purple[600]
                    : DESIGN_TOKENS.colors.purple[700],
                  borderRadius: DESIGN_TOKENS.borderRadius.full,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                  minWidth: '20px',
                  textAlign: 'center'
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 🔧 修正箇所4: BGM管理（208行目以降） */}
      {activeSoundType === 'bgm' && (
        <div>
          {/* ✅ 修正: オプショナルチェーン追加 */}
          {project.assets.audio?.bgm ? (
            <ModernCard variant="elevated" size="md" style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[4] }}>
                <div style={{ flex: 1 }}>
                  <h4 
                    style={{
                      fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                      fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                      color: DESIGN_TOKENS.colors.neutral[800],
                      margin: `0 0 ${DESIGN_TOKENS.spacing[1]} 0`
                    }}
                  >
                    {project.assets.audio.bgm.name}
                  </h4>
                  <p 
                    style={{
                      fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                      color: DESIGN_TOKENS.colors.neutral[500],
                      margin: 0
                    }}
                  >
                    {formatTime(project.assets.audio.bgm.duration ?? 0)} • {formatFileSize(project.assets.audio.bgm.fileSize ?? 0)} • {(project.assets.audio.bgm.format ?? 'audio').toUpperCase()}
                  </p>
                  {project.assets.audio.bgm && isPlaying(project.assets.audio.bgm.id) && (
                    <p 
                      style={{
                        fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                        color: DESIGN_TOKENS.colors.primary[600],
                        margin: `${DESIGN_TOKENS.spacing[1]} 0 0 0`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: DESIGN_TOKENS.spacing[1]
                      }}
                    >
                      ▶️ {formatTime(playbackState.currentTime ?? 0)} / {formatTime(project.assets.audio.bgm.duration ?? 0)}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[2] }}>
                  <ModernButton
                    variant={project.assets.audio.bgm && isPlaying(project.assets.audio.bgm.id) ? "secondary" : "primary"}
                    size="sm"
                    icon={project.assets.audio.bgm && isPlaying(project.assets.audio.bgm.id) ? '⏹️' : '▶️'}
                    onClick={() => {
                      // 修正: nullチェック追加
                      if (project.assets.audio?.bgm) {
                        isPlaying(project.assets.audio.bgm.id) ? stopAudio() : handleAudioPlay(project.assets.audio.bgm);
                      }
                    }}
                    disabled={playbackState.isLoading}
                  >
                    {project.assets.audio.bgm && isPlaying(project.assets.audio.bgm.id) ? t('common.stop') : t('common.play')}
                  </ModernButton>
                  <ModernButton
                    variant="outline"
                    size="sm"
                    icon="⚙️"
                    onClick={() => setEditingAudioId(
                      project.assets.audio?.bgm && editingAudioId === project.assets.audio.bgm.id ? null : project.assets.audio?.bgm?.id || null
                    )}
                  >
                    {t('common.settings')}
                  </ModernButton>
                  <ModernButton
                    variant="error"
                    size="sm"
                    icon="🗑️"
                    onClick={() => handleAudioDelete('bgm')}
                    disabled={uploading}
                  >
                    {t('common.delete')}
                  </ModernButton>
                </div>
              </div>

              {/* BGM設定パネル */}
              {project.assets.audio.bgm && editingAudioId === project.assets.audio.bgm.id && (
                <div
                  style={{
                    borderTop: `1px solid ${DESIGN_TOKENS.colors.neutral[200]}`,
                    paddingTop: DESIGN_TOKENS.spacing[4],
                    marginTop: DESIGN_TOKENS.spacing[4]
                  }}
                >
                  <h5
                    style={{
                      fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                      fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                      color: DESIGN_TOKENS.colors.primary[600],
                      margin: `0 0 ${DESIGN_TOKENS.spacing[3]} 0`
                    }}
                  >
                    {t('editor.assets.bgmSettings')}
                  </h5>

                  <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                        fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                        color: DESIGN_TOKENS.colors.neutral[700],
                        marginBottom: DESIGN_TOKENS.spacing[2]
                      }}
                    >
                      {t('editor.assets.volume', { percent: Math.round(project.assets.audio.bgm.volume * 100) })}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={project.assets.audio.bgm.volume}
                      onChange={(e) => handlePropertyUpdate('bgm', project.assets.audio.bgm!.id, 'volume', parseFloat(e.target.value))}
                      style={{
                        width: '100%',
                        height: '6px',
                        borderRadius: DESIGN_TOKENS.borderRadius.full,
                        background: DESIGN_TOKENS.colors.neutral[200],
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN_TOKENS.spacing[2] }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[2] }}>
                      <input
                        type="checkbox"
                        checked={project.assets.audio.bgm.loop}
                        onChange={(e) => handlePropertyUpdate('bgm', project.assets.audio.bgm!.id, 'loop', e.target.checked)}
                      />
                      <span
                        style={{
                          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                          color: DESIGN_TOKENS.colors.neutral[700]
                        }}
                      >
                        {t('editor.assets.loopPlayback')}
                      </span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[2] }}>
                      <input
                        type="checkbox"
                        checked={project.assets.audio.bgm.autoPlay || false}
                        onChange={(e) => handlePropertyUpdate('bgm', project.assets.audio.bgm!.id, 'autoPlay', e.target.checked)}
                      />
                      <span
                        style={{
                          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                          color: DESIGN_TOKENS.colors.neutral[700]
                        }}
                      >
                        {t('editor.assets.autoPlayOnStart')}
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </ModernCard>
          ) : (
            <DragDropZone
              accept={['audio/*']}
              maxFiles={1}
              maxSize={EDITOR_LIMITS.AUDIO.BGM_MAX_SIZE}
              variant="large"
              title={t('editor.assets.uploadBGM')}
              description={t('editor.assets.dragDropOrClickAudio')}
              buttonText={t('common.selectFile')}
              onFilesDrop={(results) => {
                const files = new DataTransfer();
                results.forEach(result => {
                  if (result.accepted) files.items.add(result.file);
                });
                handleAudioUpload(files.files, 'bgm');
              }}
              loading={uploading}
              style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}
            />
          )}

          <ModernCard variant="filled" size="sm">
            <h4
              style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                color: DESIGN_TOKENS.colors.primary[800],
                margin: `0 0 ${DESIGN_TOKENS.spacing[2]} 0`
              }}
            >
              {t('editor.assets.bgmHints')}
            </h4>
            <ul
              style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                color: DESIGN_TOKENS.colors.primary[700],
                margin: 0,
                paddingLeft: DESIGN_TOKENS.spacing[4],
                lineHeight: DESIGN_TOKENS.typography.lineHeight.relaxed
              }}
            >
              <li>{t('editor.assets.bgmMaxDurationSize', { duration: EDITOR_LIMITS.AUDIO.BGM_MAX_DURATION, size: formatFileSize(EDITOR_LIMITS.AUDIO.BGM_MAX_SIZE) })}</li>
              <li>{t('editor.assets.supportedFormats')}</li>
              <li>{t('editor.assets.autoLoop')}</li>
              <li>{t('editor.assets.autoPlayFromStart')}</li>
            </ul>
          </ModernCard>
        </div>
      )}

      {/* 🔧 修正箇所5: SE（効果音）管理（408行目以降） */}
      {activeSoundType === 'se' && (
        <div>
          {/* 既存効果音一覧 */}
          <div style={{ marginBottom: DESIGN_TOKENS.spacing[6] }}>
            {/* ✅ 修正: オプショナルチェーン追加 */}
            {project.assets.audio?.se?.map((se) => (
              <ModernCard key={se.id} variant="elevated" size="md" style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[4] }}>
                  <div style={{ flex: 1 }}>
                    <h4 
                      style={{
                        fontSize: DESIGN_TOKENS.typography.fontSize.base,
                        fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                        color: DESIGN_TOKENS.colors.neutral[800],
                        margin: `0 0 ${DESIGN_TOKENS.spacing[1]} 0`
                      }}
                    >
                      {se.name}
                    </h4>
                    <p 
                      style={{
                        fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                        color: DESIGN_TOKENS.colors.neutral[500],
                        margin: 0
                      }}
                    >
                      {formatTime(se.duration ?? 0)} • {formatFileSize(se.fileSize ?? 0)} • {(se.format ?? 'audio').toUpperCase()}
                    </p>
                    {isPlaying(se.id) && (
                      <p
                        style={{
                          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                          color: DESIGN_TOKENS.colors.success[600],
                          margin: `${DESIGN_TOKENS.spacing[1]} 0 0 0`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: DESIGN_TOKENS.spacing[1]
                        }}
                      >
                        {t('editor.assets.nowPlaying')}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[2] }}>
                    <ModernButton
                      variant={isPlaying(se.id) ? "secondary" : "primary"}
                      size="xs"
                      icon={isPlaying(se.id) ? '⏹️' : '▶️'}
                      onClick={() => isPlaying(se.id) ? stopAudio() : handleAudioPlay(se)}
                      disabled={playbackState.isLoading}
                    />
                    <ModernButton
                      variant="outline"
                      size="xs"
                      icon="⚙️"
                      onClick={() => setEditingAudioId(editingAudioId === se.id ? null : se.id)}
                    />
                    <ModernButton
                      variant="error"
                      size="xs"
                      icon="🗑️"
                      onClick={() => handleAudioDelete('se', se.id)}
                      disabled={uploading}
                    />
                  </div>
                </div>

                {/* SE設定パネル */}
                {editingAudioId === se.id && (
                  <div
                    style={{
                      borderTop: `1px solid ${DESIGN_TOKENS.colors.neutral[200]}`,
                      paddingTop: DESIGN_TOKENS.spacing[4],
                      marginTop: DESIGN_TOKENS.spacing[4]
                    }}
                  >
                    <h5
                      style={{
                        fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                        fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                        color: DESIGN_TOKENS.colors.success[600],
                        margin: `0 0 ${DESIGN_TOKENS.spacing[3]} 0`
                      }}
                    >
                      {t('editor.assets.soundEffectSettings')}
                    </h5>

                    <div style={{ marginBottom: DESIGN_TOKENS.spacing[3] }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                          color: DESIGN_TOKENS.colors.neutral[700],
                          marginBottom: DESIGN_TOKENS.spacing[2]
                        }}
                      >
                        {t('editor.assets.soundEffectName')}
                      </label>
                      <input
                        type="text"
                        value={se.name}
                        onChange={(e) => handlePropertyUpdate('se', se.id, 'name', e.target.value)}
                        style={{
                          width: '100%',
                          padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[3]}`,
                          fontSize: DESIGN_TOKENS.typography.fontSize.base,
                          backgroundColor: DESIGN_TOKENS.colors.neutral[0],
                          border: `1px solid ${DESIGN_TOKENS.colors.neutral[300]}`,
                          borderRadius: DESIGN_TOKENS.borderRadius.md,
                          outline: 'none'
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                          color: DESIGN_TOKENS.colors.neutral[700],
                          marginBottom: DESIGN_TOKENS.spacing[2]
                        }}
                      >
                        {t('editor.assets.volume', { percent: Math.round(se.volume * 100) })}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={se.volume}
                        onChange={(e) => handlePropertyUpdate('se', se.id, 'volume', parseFloat(e.target.value))}
                        style={{
                          width: '100%',
                          height: '6px',
                          borderRadius: DESIGN_TOKENS.borderRadius.full,
                          background: DESIGN_TOKENS.colors.neutral[200],
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      />
                    </div>
                  </div>
                )}
              </ModernCard>
            ))}
          </div>

          {/* 🔧 修正箇所6: 新規効果音追加（577行目） */}
          {/* ✅ 修正: オプショナルチェーン追加 */}
          {(project.assets.audio?.se?.length || 0) < EDITOR_LIMITS.PROJECT.MAX_SE_COUNT && (
            <DragDropZone
              accept={['audio/*']}
              maxFiles={EDITOR_LIMITS.PROJECT.MAX_SE_COUNT - (project.assets.audio?.se?.length || 0)}
              maxSize={EDITOR_LIMITS.AUDIO.SE_MAX_SIZE}
              variant="default"
              title={t('editor.assets.addSoundEffect')}
              description={t('editor.assets.dragDropAudioMax', { max: EDITOR_LIMITS.PROJECT.MAX_SE_COUNT - (project.assets.audio?.se?.length || 0) })}
              buttonText={t('common.selectFile')}
              onFilesDrop={(results) => {
                results.forEach(result => {
                  if (result.accepted) {
                    const files = new DataTransfer();
                    files.items.add(result.file);
                    handleAudioUpload(files.files, 'se');
                  }
                });
              }}
              loading={uploading}
              style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}
            />
          )}

          {/* SE上限メッセージ */}
          {/* ✅ 修正: オプショナルチェーン追加 */}
          {(project.assets.audio?.se?.length || 0) >= EDITOR_LIMITS.PROJECT.MAX_SE_COUNT && (
            <ModernCard variant="filled" size="sm" style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
              <p
                style={{
                  textAlign: 'center',
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  color: DESIGN_TOKENS.colors.neutral[600],
                  margin: 0
                }}
              >
                {t('editor.assets.soundEffectMaxLimit', { max: EDITOR_LIMITS.PROJECT.MAX_SE_COUNT })}
              </p>
            </ModernCard>
          )}

          <ModernCard variant="filled" size="sm">
            <h4
              style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                color: DESIGN_TOKENS.colors.success[800],
                margin: `0 0 ${DESIGN_TOKENS.spacing[2]} 0`
              }}
            >
              {t('editor.assets.soundEffectHints')}
            </h4>
            <ul
              style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                color: DESIGN_TOKENS.colors.success[600],
                margin: 0,
                paddingLeft: DESIGN_TOKENS.spacing[4],
                lineHeight: DESIGN_TOKENS.typography.lineHeight.relaxed
              }}
            >
              <li>{t('editor.assets.seMaxDurationSize', { duration: EDITOR_LIMITS.AUDIO.SE_MAX_DURATION, size: formatFileSize(EDITOR_LIMITS.AUDIO.SE_MAX_SIZE) })}</li>
              <li>{t('editor.assets.supportedFormats')}</li>
              <li>{t('editor.assets.singlePlayNoLoop')}</li>
              <li>{t('editor.assets.setPlayConditionsInScript')}</li>
              <li>{t('editor.assets.soundEffectNameEditable')}</li>
            </ul>
          </ModernCard>
        </div>
      )}

      {/* 隠し音声要素 */}
      <audio
        ref={audioRef}
        preload="none"
        style={{ display: 'none' }}
      />
    </div>
  );
};