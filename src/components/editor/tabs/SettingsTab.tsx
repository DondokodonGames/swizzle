import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GameProject } from '../../../types/editor/GameProject';
import { GameSettings } from '../../../types/editor/GameProject';
import ModernCard from '../../ui/ModernCard';
import ModernButton from '../../ui/ModernButton';
// 🔧 追加: EditorGameBridge統合
import EditorGameBridge, { GameExecutionResult } from '../../../services/editor/EditorGameBridge';
// 🔧 Phase H-2追加: Supabase保存機能
import { ProjectStorageManager } from '../../../services/ProjectStorageManager';
import { auth } from '../../../lib/supabase';

// 🔧 Props型定義修正: onTestPlay と onSave を追加
interface SettingsTabProps {
  project: GameProject;
  onProjectUpdate: (project: GameProject) => void;
  onTestPlay?: () => void;
  onSave?: () => void;
}

// 🆕 ゲームスピード設定（テストプレイ下に移動）
const getGameSpeedLevels = (_t: any) => [
  { value: 0.7, labelKey: 'editor.settings.testPlay.gameSpeed.slow.label', descriptionKey: 'editor.settings.testPlay.gameSpeed.slow.description', emoji: '🐌' },
  { value: 1.0, labelKey: 'editor.settings.testPlay.gameSpeed.normal.label', descriptionKey: 'editor.settings.testPlay.gameSpeed.normal.description', emoji: '🚶' },
  { value: 1.3, labelKey: 'editor.settings.testPlay.gameSpeed.fast.label', descriptionKey: 'editor.settings.testPlay.gameSpeed.fast.description', emoji: '🏃' },
  { value: 1.6, labelKey: 'editor.settings.testPlay.gameSpeed.superFast.label', descriptionKey: 'editor.settings.testPlay.gameSpeed.superFast.description', emoji: '⚡' },
] as const;

export const SettingsTab: React.FC<SettingsTabProps> = ({
  project,
  onProjectUpdate,
  onTestPlay: _onTestPlay,
  onSave
}) => {
  const { t } = useTranslation();
  const [isTestPlaying, _setIsTestPlaying] = useState(false);
  const [testPlayResult, setTestPlayResult] = useState<'success' | 'failure' | null>(null);
  const [testPlayDetails, _setTestPlayDetails] = useState<GameExecutionResult | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [generateThumbnail, setGenerateThumbnail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showFullGame, setShowFullGame] = useState(false);
  const fullGameRef = useRef<HTMLDivElement>(null);

  // EditorGameBridge インスタンス
  const bridgeRef = useRef<EditorGameBridge | null>(null);
  
  useEffect(() => {
    bridgeRef.current = EditorGameBridge.getInstance();
    return () => {
      bridgeRef.current?.reset();
    };
  }, []);

  // プロジェクト更新ヘルパー
  const updateProject = useCallback((updates: Partial<GameProject>) => {
    onProjectUpdate({ ...project, ...updates });
  }, [project, onProjectUpdate]);

  // 設定更新ヘルパー
  const updateSettings = useCallback((updates: Partial<GameSettings>) => {
    const newSettings = { ...project.settings, ...updates };
    updateProject({ settings: newSettings });
  }, [project.settings, updateProject]);

  // ゲーム名の更新
  const handleGameNameChange = useCallback((name: string) => {
    updateSettings({ name: name.slice(0, 50) });
    updateProject({ name: name.slice(0, 50) });
  }, [updateSettings, updateProject]);

  // ゲーム説明の更新
  const handleDescriptionChange = useCallback((description: string) => {
    updateSettings({ description: description.slice(0, 200) });
  }, [updateSettings]);

  // ジャンル（カテゴリ）の更新
  const handleCategoryChange = useCallback((category: string) => {
    updateSettings({
      publishing: {
        ...project.settings.publishing,
        isPublished: project.settings.publishing?.isPublished || false,
        visibility: project.settings.publishing?.visibility || 'public',
        allowComments: project.settings.publishing?.allowComments ?? true,
        allowRemix: project.settings.publishing?.allowRemix ?? true,
        category
      }
    });
  }, [updateSettings, project.settings.publishing]);

  // タグの更新
  const handleTagsChange = useCallback((tagsString: string) => {
    const tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    updateSettings({
      publishing: {
        ...project.settings.publishing,
        isPublished: project.settings.publishing?.isPublished || false,
        visibility: project.settings.publishing?.visibility || 'public',
        allowComments: project.settings.publishing?.allowComments ?? true,
        allowRemix: project.settings.publishing?.allowRemix ?? true,
        tags
      }
    });
  }, [updateSettings, project.settings.publishing]);

  // パクり禁止（allowRemix）の更新
  const handleAllowRemixChange = useCallback((allowRemix: boolean) => {
    updateSettings({
      publishing: {
        ...project.settings.publishing,
        isPublished: project.settings.publishing?.isPublished || false,
        visibility: project.settings.publishing?.visibility || 'public',
        allowComments: project.settings.publishing?.allowComments ?? true,
        allowRemix
      }
    });
  }, [updateSettings, project.settings.publishing]);

  // 🆕 ゲームスピード設定の更新（テストプレイ下に移動）
  const handleGameSpeedChange = useCallback((speed: number) => {
    updateProject({ 
      metadata: {
        ...project.metadata,
        gameSpeed: speed
      }
    });
  }, [updateProject, project.metadata]);


  // フルゲーム実行機能（DOM要素待機対応版）
  const handleFullGamePlay = useCallback(async () => {
    if (!bridgeRef.current) {
      alert(t('errors.testPlayFailed'));
      return;
    }
    
    try {
      setShowFullGame(true);
      
      // DOM要素が作成されるまで待機
      await new Promise<void>((resolve) => {
        const checkElement = () => {
          if (fullGameRef.current) {
            resolve();
          } else {
            requestAnimationFrame(checkElement);
          }
        };
        checkElement();
      });
      
      if (!fullGameRef.current) {
        throw new Error(t('errors.generic'));
      }
      
      await bridgeRef.current.launchFullGame(
        project,
        fullGameRef.current,
        (result: GameExecutionResult) => {
          setShowFullGame(false);

          if (result.success) {
            alert(`${t('game.success')}\n${t('editor.settings.testPlay.stats.score')}: ${result.score || 0}\n${t('editor.settings.testPlay.stats.playTime')}: ${result.timeElapsed.toFixed(1)}s`);
          } else {
            alert(`${t('errors.generic')}:\n${result.errors.join('\n')}`);
          }
        }
      );
      
    } catch (error) {
      console.error('❌ フルゲーム実行エラー:', error);
      setShowFullGame(false);
      alert(`${t('errors.testPlayFailed')}:\n${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [project, t]);

  // 保存機能
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    
    try {
      if (onSave) {
        await onSave();
      } else {
        // フォールバック保存処理
        const projectData = {
          ...project,
          lastModified: new Date().toISOString(),
          metadata: {
            ...project.metadata,
            statistics: {
              ...project.metadata.statistics,
              saveCount: (project.metadata.statistics.saveCount || 0) + 1
            }
          }
        };
        
        const savedProjects = JSON.parse(localStorage.getItem('editor_projects') || '[]');
        const existingIndex = savedProjects.findIndex((p: any) => p.id === project.id);
        
        if (existingIndex !== -1) {
          savedProjects[existingIndex] = projectData;
        } else {
          savedProjects.push(projectData);
        }
        
        localStorage.setItem('editor_projects', JSON.stringify(savedProjects));
      }
    } catch (error) {
      console.error('保存エラー:', error);
      alert(`${t('errors.projectSaveFailed')}:\n${error instanceof Error ? error.message : t('errors.projectSaveFailed')}`);
    } finally {
      setIsSaving(false);
    }
  }, [project, onSave, t]);

  // サムネイル自動生成
  const handleGenerateThumbnail = useCallback(async () => {
    setGenerateThumbnail(true);
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error(t('errors.generic'));
      }
      
      // 背景描画（白基調グラデーション）
      const bgSrc = project.assets.background?.frames?.[0]?.storageUrl || project.assets.background?.frames?.[0]?.dataUrl;
      if (bgSrc) {
        const bgImg = new Image();
        bgImg.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          bgImg.onload = resolve;
          bgImg.onerror = reject;
          bgImg.src = bgSrc;
        });
        ctx.drawImage(bgImg, 0, 0, 300, 400);
      } else {
        // 白基調グラデーション
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, '#f8fafc');
        gradient.addColorStop(1, '#e2e8f0');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 300, 400);
      }
      
      // ゲーム名表示
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.1)';
      ctx.shadowBlur = 2;
      ctx.fillText(project.settings.name || 'My Game', 150, 50);
      ctx.shadowBlur = 0;
      
      // 統計情報（白基調カード）
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(20, 300, 260, 80);
      
      // 枠線
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.strokeRect(20, 300, 260, 80);
      
      ctx.fillStyle = '#475569';
      ctx.font = '16px Arial';
      ctx.fillText(`${project.assets?.objects?.length || 0} Objects`, 150, 325);
      ctx.fillText(`${project.script?.rules?.length || 0} Rules`, 150, 345);
      const duration = project.settings.duration?.seconds 
        ? `${project.settings.duration.seconds}s` 
        : 'Unlimited';
      ctx.fillText(duration, 150, 365);
      
      const thumbnailDataUrl = canvas.toDataURL('image/png');
      
      updateSettings({
        preview: {
          ...project.settings.preview,
          thumbnailDataUrl
        }
      });
      
    } catch (error) {
      console.error('サムネイル生成エラー:', error);
      alert(`${t('errors.generic')}:\n${error instanceof Error ? error.message : t('errors.generic')}`);
    } finally {
      setGenerateThumbnail(false);
    }
  }, [project, updateSettings, t]);

  // 🔧 Phase H-2修正: プロジェクト公開（Supabase保存追加）
  const handlePublish = useCallback(async () => {
    setIsPublishing(true);
    setPublishError(null);
    
    try {
      // バリデーション
      const errors: string[] = [];

      if (!project.settings?.name?.trim()) {
        errors.push(t('editor.settings.gameNameRequired'));
      }

      if (!(project.assets?.objects?.length || 0) && !project.assets?.background) {
        errors.push(t('errors.noAssets'));
      }

      if (errors.length > 0) {
        throw new Error(errors.join('\n'));
      }

      // 🔧 Phase H-2: ユーザーIDを取得
      const user = await auth.getCurrentUser();

      if (!user) {
        throw new Error(t('editor.app.loginRequired'));
      }

      // プロジェクトデータを更新
      const projectData: GameProject = {
        ...project,
        //publishedAt: new Date().toISOString(),
        version: project.version ? `${project.version}.1` : '1.0.0',
        status: 'published' as const,
        settings: {
          ...project.settings,
          publishing: {
            ...project.settings.publishing,
            isPublished: true,
            publishedAt: new Date().toISOString(),
            visibility: project.settings.publishing?.visibility || 'public'
          }
        }
      };
      
      // 🔧 Phase H-2: Supabaseに保存
      const storageManager = ProjectStorageManager.getInstance();
      await storageManager.saveToDatabase(projectData, user.id);

      // ローカルストレージにも保存（従来通り）
      const projectId = project.id || `project_${Date.now()}`;
      const savedProjects = JSON.parse(localStorage.getItem('savedProjects') || '[]');
      
      const existingIndex = savedProjects.findIndex((p: any) => p.id === projectId);
      if (existingIndex !== -1) {
        savedProjects[existingIndex] = projectData;
      } else {
        savedProjects.push(projectData);
      }
      
      localStorage.setItem('savedProjects', JSON.stringify(savedProjects));
      
      const publishedGames = JSON.parse(localStorage.getItem('publishedGames') || '[]');
      const publishedGame = {
        id: projectId,
        name: project.settings.name,
        description: project.settings.description || '',
        thumbnailUrl: project.settings.preview?.thumbnailDataUrl || '',
        author: user.email || 'Current User',
        publishedAt: new Date().toISOString(),
        stats: { plays: 0, likes: 0, shares: 0 }
      };
      
      const existingPublishedIndex = publishedGames.findIndex((g: any) => g.id === projectId);
      if (existingPublishedIndex !== -1) {
        publishedGames[existingPublishedIndex] = publishedGame;
      } else {
        publishedGames.push(publishedGame);
      }
      
      localStorage.setItem('publishedGames', JSON.stringify(publishedGames));
      
      // プロジェクト状態を更新
      updateProject({ 
        ...projectData,
        id: projectId
      });
      
      alert(`✅ ${t('editor.app.projectPublished')}`);

    } catch (error) {
      console.error('❌ 公開エラー:', error);
      const errorMessage = error instanceof Error ? error.message : t('errors.publishFailed');
      setPublishError(errorMessage);
      alert(`❌ ${t('errors.publishFailed')}:\n${errorMessage}`);
    } finally {
      setIsPublishing(false);
    }
  }, [project, updateProject, t]);

// エクスポート機能（ProjectExportData形式対応）
const handleExport = useCallback(async () => {
  try {
    // ✅ ProjectExportData形式で出力
    const exportData = {
      project: project,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.settings.name || 'my-game'}.json`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert(t('editor.app.projectExported'));

  } catch (error) {
    console.error('エクスポートエラー:', error);
    alert(`${t('errors.exportFailed')}:\n${error instanceof Error ? error.message : t('errors.exportFailed')}`);
  }
}, [project, t]);

  return (
    <div style={{ 
      background: '#f8fafc', 
      minHeight: '100vh',
      padding: '24px'
    }}>
      <div style={{ maxWidth: '1024px', margin: '0 auto' }}>
        
        {/* 1️⃣ ゲーム基本情報 */}
        <ModernCard variant="default" size="lg" style={{ marginBottom: '24px' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#1e293b',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🎮 {t('editor.settings.gameInfo.title')}
          </h2>
          
          <div style={{ marginBottom: '24px' }}>
            {/* ゲーム名 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                {t('editor.settings.gameName')} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={project.settings.name || ''}
                onChange={(e) => handleGameNameChange(e.target.value)}
                placeholder={t('editor.settings.gameNamePlaceholder')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: '#ffffff',
                  color: '#1f2937',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
                maxLength={50}
              />
              <div style={{ 
                textAlign: 'right',
                fontSize: '12px',
                color: '#6b7280',
                marginTop: '4px'
              }}>
                {(project.settings.name || '').length}/50
              </div>
            </div>
            
            {/* ゲーム説明 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                {t('editor.settings.description')}
              </label>
              <textarea
                value={project.settings.description || ''}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder={t('editor.settings.descriptionPlaceholder')}
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: '#ffffff',
                  color: '#1f2937',
                  outline: 'none',
                  transition: 'all 0.2s',
                  resize: 'none'
                }}
                maxLength={200}
              />
              <div style={{
                textAlign: 'right',
                fontSize: '12px',
                color: '#6b7280',
                marginTop: '4px'
              }}>
                {(project.settings.description || '').length}/200
              </div>
            </div>

            {/* ジャンル（カテゴリ）選択 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                {t('editor.settings.gameInfo.genre')}
              </label>
              <select
                value={project.settings.publishing?.category || ''}
                onChange={(e) => handleCategoryChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: '#ffffff',
                  color: '#1f2937',
                  outline: 'none',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
              >
                <option value="">{t('editor.settings.gameInfo.genrePlaceholder')}</option>
                <option value="action">🎯 {t('editor.settings.gameInfo.genres.action')}</option>
                <option value="puzzle">🧩 {t('editor.settings.gameInfo.genres.puzzle')}</option>
                <option value="adventure">🗺️ {t('editor.settings.gameInfo.genres.adventure')}</option>
                <option value="rpg">⚔️ {t('editor.settings.gameInfo.genres.rpg')}</option>
                <option value="shooting">🔫 {t('editor.settings.gameInfo.genres.shooting')}</option>
                <option value="racing">🏎️ {t('editor.settings.gameInfo.genres.racing')}</option>
                <option value="sports">⚽ {t('editor.settings.gameInfo.genres.sports')}</option>
                <option value="simulation">🎮 {t('editor.settings.gameInfo.genres.simulation')}</option>
                <option value="casual">🌟 {t('editor.settings.gameInfo.genres.casual')}</option>
                <option value="educational">📚 {t('editor.settings.gameInfo.genres.educational')}</option>
                <option value="music">🎵 {t('editor.settings.gameInfo.genres.music')}</option>
                <option value="other">✨ {t('editor.settings.gameInfo.genres.other')}</option>
              </select>
            </div>

            {/* ゲームタグ */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                {t('editor.settings.gameInfo.tags')}
              </label>
              <input
                type="text"
                value={project.settings.publishing?.tags?.join(', ') || ''}
                onChange={(e) => handleTagsChange(e.target.value)}
                placeholder={t('editor.settings.gameInfo.tagsPlaceholder')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: '#ffffff',
                  color: '#1f2937',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                marginTop: '4px'
              }}>
                💡 {t('editor.settings.gameInfo.tagsHint')}
              </div>
            </div>
          </div>
        </ModernCard>

        {/* 2️⃣ サムネイル設定 */}
        <ModernCard variant="default" size="lg" style={{ marginBottom: '24px' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#1e293b',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📸 {t('editor.settings.thumbnail.title')}
          </h2>
          
          <div style={{ 
            display: 'flex',
            flexDirection: window.innerWidth < 768 ? 'column' : 'row',
            alignItems: 'center',
            gap: '24px'
          }}>
            <div style={{ flexShrink: 0 }}>
              <div style={{
                width: '128px',
                height: '160px',
                border: '2px dashed #d1d5db',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                backgroundColor: '#ffffff'
              }}>
                {project.settings.preview?.thumbnailDataUrl ? (
                  <img
                    src={project.settings.preview.thumbnailDataUrl}
                    alt="Game Thumbnail"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '8px'
                    }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📸</div>
                    <div style={{ fontSize: '12px' }}>{t('editor.settings.thumbnail.noThumbnail')}</div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ flex: 1, textAlign: window.innerWidth < 768 ? 'center' : 'left' }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '8px'
              }}>
                {t('editor.settings.thumbnail.title')}
              </h3>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '16px'
              }}>
                {t('editor.settings.thumbnail.subtitle')}
              </p>
              
              <div style={{ 
                display: 'flex',
                flexDirection: window.innerWidth < 640 ? 'column' : 'row',
                gap: '12px',
                justifyContent: window.innerWidth < 768 ? 'center' : 'flex-start'
              }}>
                <ModernButton
                  variant="primary"
                  size="md"
                  onClick={handleGenerateThumbnail}
                  disabled={generateThumbnail}
                  loading={generateThumbnail}
                >
                  🎨 {t('editor.settings.thumbnail.generate')}
                </ModernButton>

                <label>
                  <ModernButton
                    variant="secondary"
                    size="md"
                    style={{ cursor: 'pointer' }}
                  >
                    📁 {t('editor.settings.thumbnail.upload')}
                  </ModernButton>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          const thumbnailDataUrl = e.target?.result as string;
                          updateSettings({
                            preview: {
                              ...project.settings.preview,
                              thumbnailDataUrl
                            }
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        </ModernCard>

        {/* 2️⃣.5 公開設定 */}
        <ModernCard variant="default" size="lg" style={{ marginBottom: '24px' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#1e293b',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🔒 {t('editor.settings.publishing.title')}
          </h2>

          <div style={{ marginBottom: '24px' }}>
            {/* パクり禁止設定 (allowRemix) */}
            <div style={{
              padding: '20px',
              backgroundColor: '#fef3c7',
              border: '2px solid #fbbf24',
              borderRadius: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <input
                  type="checkbox"
                  id="allowRemix"
                  checked={!(project.settings.publishing?.allowRemix ?? true)}
                  onChange={(e) => handleAllowRemixChange(!e.target.checked)}
                  style={{
                    width: '20px',
                    height: '20px',
                    marginTop: '2px',
                    cursor: 'pointer',
                    accentColor: '#ef4444'
                  }}
                />
                <label htmlFor="allowRemix" style={{ flex: 1, cursor: 'pointer' }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#92400e',
                    marginBottom: '4px'
                  }}>
                    🚫 {t('editor.settings.publishing.noRemix')}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#78350f',
                    lineHeight: '1.6'
                  }}>
                    {t('editor.settings.publishing.noRemixDescription')}
                  </div>
                </label>
              </div>

              <div style={{
                marginTop: '12px',
                padding: '12px',
                backgroundColor: '#fef9f3',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#78350f'
              }}>
                💡 <strong>{t('common.help')}:</strong> {t('editor.settings.publishing.noRemixHint')}
              </div>
            </div>
          </div>
        </ModernCard>

        {/* 3️⃣ テストプレイセクション */}
        <ModernCard variant="default" size="lg" style={{ marginBottom: '24px' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#1e293b',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🎯 {t('editor.settings.testPlay.title')}
          </h2>
          
          <div style={{ textAlign: 'center' }}>
            {!isTestPlaying && testPlayResult === null && (
              <div>
                <div style={{ fontSize: '96px', marginBottom: '16px' }}>🕹️</div>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '8px'
                }}>
                  {t('editor.settings.testPlay.start')}
                </h3>
                <p style={{
                  color: '#6b7280',
                  marginBottom: '24px',
                  fontSize: '16px'
                }}>
                  {t('editor.settings.testPlay.startDescription')}
                </p>
                <ModernButton
                  variant="primary"
                  size="lg"
                  onClick={handleFullGamePlay}
                  disabled={!project.settings.name || isTestPlaying}
                >
                  ▶️ {t('editor.settings.testPlay.startButton')}
                </ModernButton>
              </div>
            )}
            
            {isTestPlaying && (
              <div>
                <div style={{
                  fontSize: '96px',
                  marginBottom: '16px',
                  animation: 'bounce 1s infinite'
                }}>
                  🎮
                </div>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '8px'
                }}>
                  {t('editor.settings.testPlay.testing')}
                </h3>
                <p style={{
                  color: '#6b7280',
                  marginBottom: '24px',
                  fontSize: '16px'
                }}>
                  {t('editor.settings.testPlay.testingDescription')}
                </p>
                <div style={{
                  width: '100%',
                  maxWidth: '300px',
                  height: '8px',
                  backgroundColor: '#e5e7eb',
                  borderRadius: '4px',
                  margin: '0 auto',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: '70%',
                    backgroundColor: '#3b82f6',
                    borderRadius: '4px',
                    animation: 'pulse 2s infinite'
                  }} />
                </div>
              </div>
            )}
            
            {testPlayResult === 'success' && testPlayDetails && (
              <div>
                <div style={{ fontSize: '96px', marginBottom: '16px' }}>🎉</div>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#10b981',
                  marginBottom: '16px'
                }}>
                  {t('editor.settings.testPlay.success')}
                </h3>
                <div style={{
                  maxWidth: '500px',
                  margin: '0 auto 24px',
                  padding: '16px',
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #d1fae5',
                  borderRadius: '12px'
                }}>
                  <div style={{ 
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: '16px',
                    fontSize: '14px'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '32px',
                        fontWeight: '700',
                        color: '#10b981'
                      }}>
                        {testPlayDetails.score || 0}
                      </div>
                      <div style={{ color: '#374151' }}>{t('editor.settings.testPlay.stats.score')}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '32px',
                        fontWeight: '700',
                        color: '#10b981'
                      }}>
                        {testPlayDetails.timeElapsed.toFixed(1)}s
                      </div>
                      <div style={{ color: '#374151' }}>{t('editor.settings.testPlay.stats.playTime')}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '32px',
                        fontWeight: '700',
                        color: '#10b981'
                      }}>
                        {testPlayDetails.finalState?.objectsInteracted?.length || 0}
                      </div>
                      <div style={{ color: '#374151' }}>{t('editor.settings.testPlay.stats.interactions')}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '32px',
                        fontWeight: '700',
                        color: '#10b981'
                      }}>
                        {testPlayDetails.finalState?.rulesTriggered?.length || 0}
                      </div>
                      <div style={{ color: '#374151' }}>{t('editor.settings.testPlay.stats.rulesTriggered')}</div>
                    </div>
                  </div>
                </div>
                <ModernButton
                  variant="primary"
                  size="md"
                  onClick={() => setTestPlayResult(null)}
                >
                  {t('editor.settings.testPlay.tryAgain')}
                </ModernButton>
              </div>
            )}

            {testPlayResult === 'failure' && testPlayDetails && (
              <div>
                <div style={{ fontSize: '96px', marginBottom: '16px' }}>⚠️</div>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#ef4444',
                  marginBottom: '16px'
                }}>
                  {t('editor.settings.testPlay.failure')}
                </h3>
                <div style={{
                  maxWidth: '500px',
                  margin: '0 auto 24px',
                  padding: '16px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '12px',
                  textAlign: 'left'
                }}>
                  <div style={{ fontSize: '14px', color: '#374151' }}>
                    <strong>{t('editor.settings.testPlay.errors')}</strong>
                    <ul style={{
                      listStyle: 'disc',
                      listStylePosition: 'inside',
                      marginTop: '8px',
                      marginBottom: '0'
                    }}>
                      {testPlayDetails.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                    {testPlayDetails.warnings.length > 0 && (
                      <>
                        <strong style={{ display: 'block', marginTop: '12px' }}>{t('editor.settings.testPlay.warnings')}</strong>
                        <ul style={{
                          listStyle: 'disc',
                          listStylePosition: 'inside',
                          marginTop: '8px',
                          marginBottom: '0'
                        }}>
                          {testPlayDetails.warnings.map((warning, index) => (
                            <li key={index}>{warning}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </div>
                <ModernButton
                  variant="secondary"
                  size="md"
                  onClick={() => setTestPlayResult(null)}
                >
                  {t('editor.settings.testPlay.tryAgain')}
                </ModernButton>
              </div>
            )}
          </div>

          {/* 🆕 ゲームスピード設定（テストプレイボタンの下に移動） */}
          <div style={{
            marginTop: '40px',
            paddingTop: '32px',
            borderTop: '1px solid #e5e7eb'
          }}>
            <h4 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              justifyContent: 'center'
            }}>
              ⚡ {t('editor.settings.testPlay.gameSpeed.title')}
            </h4>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              {getGameSpeedLevels(t).map((level) => {
                const isSelected = (project.metadata?.gameSpeed || 1.0) === level.value;

                return (
                  <button
                    key={level.value}
                    onClick={() => handleGameSpeedChange(level.value)}
                    style={{
                      padding: '16px',
                      border: isSelected ? '2px solid #10b981' : '1px solid #d1d5db',
                      borderRadius: '12px',
                      backgroundColor: isSelected ? '#ecfdf5' : '#ffffff',
                      color: '#1f2937',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                    onMouseOver={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = '#f9fafb';
                        e.currentTarget.style.borderColor = '#9ca3af';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.borderColor = '#d1d5db';
                      }
                    }}
                  >
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>{level.emoji}</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                      {t(level.labelKey)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {t(level.descriptionKey)}
                    </div>
                  </button>
                );
              })}
            </div>
            
            {/* 現在の設定表示 */}
            <div style={{
              marginTop: '16px',
              textAlign: 'center',
              fontSize: '14px',
              color: '#6b7280'
            }}>
              {t('editor.settings.testPlay.gameSpeed.current', {
                speed: t(getGameSpeedLevels(t).find(level => level.value === (project.metadata?.gameSpeed || 1.0))?.labelKey || 'editor.settings.testPlay.gameSpeed.normal.label')
              })}
            </div>
          </div>
        </ModernCard>

        {/* フルゲーム表示エリア */}
        {showFullGame && (
          <ModernCard variant="default" size="lg" style={{ marginBottom: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px'
              }}>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#1f2937',
                  margin: '0'
                }}>
                  🎮 {t('editor.settings.testPlay.fullGame.title')}
                </h3>
                <ModernButton
                  variant="error"
                  size="sm"
                  onClick={() => setShowFullGame(false)}
                >
                  ✕ {t('editor.settings.testPlay.fullGame.end')}
                </ModernButton>
              </div>
              <div
                ref={fullGameRef}
                style={{ 
                  width: '100%',
                  minHeight: '400px',
                  backgroundColor: '#f8fafc',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                {/* ゲームキャンバスがここに挿入される */}
              </div>
            </div>
          </ModernCard>
        )}

        {/* 4️⃣ ゲーム統計情報 */}
        <ModernCard variant="default" size="lg" style={{ marginBottom: '24px' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#1e293b',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📊 {t('editor.settings.stats.title')}
          </h2>
          
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '16px',
            marginBottom: '32px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '32px',
                fontWeight: '700',
                color: '#3b82f6'
              }}>
                {project.assets.objects.length}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                {t('editor.settings.stats.objects')}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '32px',
                fontWeight: '700',
                color: '#10b981'
              }}>
                {project.script?.rules?.length || 0}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                {t('editor.settings.stats.rules')}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '32px',
                fontWeight: '700',
                color: '#f59e0b'
              }}>
                {project.assets?.texts?.length || 0}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                {t('editor.settings.stats.texts')}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '32px',
                fontWeight: '700',
                color: '#8b5cf6'
              }}>
                {Math.round((project.totalSize || 0) / 1024 / 1024 * 10) / 10}MB
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                {t('editor.settings.stats.capacity')}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '32px',
                fontWeight: '700',
                color: '#ef4444'
              }}>
                {project.metadata?.statistics?.testPlayCount || 0}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                {t('editor.settings.stats.testPlayCount')}
              </div>
            </div>
          </div>
          
          {/* プロジェクト健全性 */}
          <div style={{
            paddingTop: '24px',
            borderTop: '1px solid #e5e7eb'
          }}>
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
              gap: '16px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  color: project.script?.initialState ? '#10b981' : '#f59e0b'
                }}>
                  {project.script?.initialState ? '✓' : '⚠️'}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>{t('editor.settings.stats.health.initialState')}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  color: (project.script?.layout?.objects?.length || 0) > 0 ? '#10b981' : '#f59e0b'
                }}>
                  {project.script?.layout?.objects?.length || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>{t('editor.settings.stats.health.placedObjects')}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  color: (project.script?.successConditions?.length || 0) > 0 ? '#10b981' : '#f59e0b'
                }}>
                  {project.script?.successConditions?.length || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>{t('editor.settings.stats.health.successConditions')}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  color: project.script.statistics?.complexityScore || 0 > 0 ? '#10b981' : '#6b7280'
                }}>
                  {project.script.statistics?.complexityScore || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>{t('editor.settings.stats.health.complexity')}</div>
              </div>
            </div>
          </div>
        </ModernCard>

        {/* 5️⃣ 公開・アクションボタン */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          justifyContent: 'center',
          marginBottom: '24px'
        }}>
          <ModernButton
            variant="success"
            size="lg"
            onClick={handleSave}
            disabled={isSaving}
            loading={isSaving}
          >
            💾 {t('editor.settings.actions.save')}
          </ModernButton>

          <ModernButton
            variant="secondary"
            size="lg"
            onClick={handleFullGamePlay}
            disabled={!project.settings.name || isTestPlaying}
          >
            ▶️ {t('editor.settings.actions.test')}
          </ModernButton>

          <ModernButton
            variant="primary"
            size="lg"
            onClick={handlePublish}
            disabled={!project.settings.name || isPublishing || (!project.assets.objects.length && !project.assets.background)}
            loading={isPublishing}
          >
            {project.settings.publishing?.isPublished ? `🔄 ${t('editor.settings.actions.update')}` : `🚀 ${t('editor.settings.actions.publish')}`}
          </ModernButton>

          <ModernButton
            variant="ghost"
            size="lg"
            onClick={handleExport}
          >
            📦 {t('editor.settings.actions.export')}
          </ModernButton>
        </div>
        
        {/* 公開ステータス表示 */}
        {project.settings.publishing?.isPublished && (
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #d1fae5',
              borderRadius: '8px',
              color: '#10b981'
            }}>
              <span>✅ {t('editor.settings.actions.published')}</span>
            {project.settings.publishing?.publishedAt && (
              <span style={{ fontSize: '14px' }}>
              {new Date(project.settings.publishing.publishedAt).toLocaleString()}
              </span>
          )}
            </div>
          </div>
        )}
        
        {/* エラー表示 */}
        {publishError && (
          <div style={{
            padding: '16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            color: '#ef4444',
            textAlign: 'center',
            marginBottom: '24px'
          }}>
            ❌ {publishError}
          </div>
        )}
      </div>

    </div>
  );
};

export default SettingsTab;