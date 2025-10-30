import React, { useState, useCallback, useRef, useEffect } from 'react';
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
const GAME_SPEED_LEVELS = [
  { value: 0.7, label: 'スロー', description: 'ゆっくり楽しむ', emoji: '🐌' },
  { value: 1.0, label: '標準', description: 'ちょうどいい速さ', emoji: '🚶' },
  { value: 1.3, label: '高速', description: '挑戦的な速さ', emoji: '🏃' },
  { value: 1.6, label: '超高速', description: '上級者向け', emoji: '⚡' },
] as const;

export const SettingsTab: React.FC<SettingsTabProps> = ({ 
  project, 
  onProjectUpdate, 
  onTestPlay,
  onSave
}) => {
  const [isTestPlaying, setIsTestPlaying] = useState(false);
  const [testPlayResult, setTestPlayResult] = useState<'success' | 'failure' | null>(null);
  const [testPlayDetails, setTestPlayDetails] = useState<GameExecutionResult | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [generateThumbnail, setGenerateThumbnail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showFullGame, setShowFullGame] = useState(false);
  const gameTestRef = useRef<HTMLDivElement>(null);
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

  // 🆕 ゲームスピード設定の更新（テストプレイ下に移動）
  const handleGameSpeedChange = useCallback((speed: number) => {
    updateProject({ 
      metadata: {
        ...project.metadata,
        gameSpeed: speed
      }
    });
  }, [updateProject, project.metadata]);

  // テストプレイ機能（EditorGameBridge統合）
  const handleTestPlay = useCallback(async () => {
    console.log('🧪 テストプレイ開始:', project.name);
    setIsTestPlaying(true);
    setTestPlayResult(null);
    setTestPlayDetails(null);
    
    try {
      // プロジェクトバリデーション
      const validationErrors: string[] = [];
      
      if (!project.settings.name?.trim()) {
        validationErrors.push('ゲーム名を入力してください');
      }
      
      if (!project.assets.objects.length && !project.assets.background) {
        validationErrors.push('最低1つのオブジェクトまたは背景を追加してください');
      }
      
      if (!project.script.rules.length) {
        validationErrors.push('最低1つのルールを設定してください');
      }
      
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join('\n'));
      }

      const bridge = bridgeRef.current;
      if (!bridge) {
        throw new Error('ゲームエンジンが初期化されていません');
      }

      console.log('🔄 EditorGameBridge でテストプレイ実行...');
      const result = await bridge.quickTestPlay(project);
      
      console.log('📊 テストプレイ結果:', result);
      setTestPlayDetails(result);
      
      if (result.success && result.completed) {
        setTestPlayResult('success');
      } else {
        setTestPlayResult('failure');
        if (result.errors.length > 0) {
          alert(`テストプレイで問題が発生しました:\n${result.errors.join('\n')}`);
        }
      }
      
      // 統計更新
      updateProject({
        metadata: {
          ...project.metadata,
          statistics: {
            ...project.metadata.statistics,
            testPlayCount: (project.metadata.statistics.testPlayCount || 0) + 1
          }
        }
      });
      
    } catch (error) {
      console.error('❌ テストプレイエラー:', error);
      setTestPlayResult('failure');
      setTestPlayDetails({
        success: false,
        timeElapsed: 0,
        completed: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        performance: { averageFPS: 0, memoryUsage: 0, renderTime: 0, objectCount: 0, ruleExecutions: 0 }
      });
      alert(`テストプレイエラー:\n${error instanceof Error ? error.message : 'テストプレイに失敗しました'}`);
    } finally {
      setIsTestPlaying(false);
    }
  }, [project, updateProject]);

  // フルゲーム実行機能（DOM要素待機対応版）
  const handleFullGamePlay = useCallback(async () => {
    console.log('🎮 フルゲーム実行開始:', project.name);
    
    if (!bridgeRef.current) {
      alert('ゲーム実行環境が準備されていません');
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
        throw new Error('DOM要素の作成に失敗しました');
      }
      
      console.log('✅ DOM要素準備完了、ゲーム実行開始');
      
      await bridgeRef.current.launchFullGame(
        project,
        fullGameRef.current,
        (result) => {
          console.log('🏁 フルゲーム終了:', result);
          setShowFullGame(false);
          
          if (result.success) {
            alert(`ゲーム完了！\nスコア: ${result.score || 0}\n時間: ${result.timeElapsed.toFixed(1)}秒`);
          } else {
            alert(`ゲームエラー:\n${result.errors.join('\n')}`);
          }
        }
      );
      
    } catch (error) {
      console.error('❌ フルゲーム実行エラー:', error);
      setShowFullGame(false);
      alert(`フルゲーム実行エラー:\n${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [project]);

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
        console.log('💾 プロジェクト保存完了:', project.name);
      }
    } catch (error) {
      console.error('保存エラー:', error);
      alert(`保存エラー:\n${error instanceof Error ? error.message : '保存に失敗しました'}`);
    } finally {
      setIsSaving(false);
    }
  }, [project, onSave]);

  // サムネイル自動生成
  const handleGenerateThumbnail = useCallback(async () => {
    setGenerateThumbnail(true);
    
    try {
      console.log('サムネイル生成開始');
      
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Canvas context を取得できません');
      }
      
      // 背景描画（白基調グラデーション）
      if (project.assets.background?.frames?.[0]?.dataUrl) {
        const bgImg = new Image();
        await new Promise((resolve, reject) => {
          bgImg.onload = resolve;
          bgImg.onerror = reject;
          bgImg.src = project.assets.background!.frames[0].dataUrl;
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
      ctx.fillText(`${project.assets.objects.length} Objects`, 150, 325);
      ctx.fillText(`${project.script.rules.length} Rules`, 150, 345);
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
      
      console.log('サムネイル生成完了');
    } catch (error) {
      console.error('サムネイル生成エラー:', error);
      alert(`サムネイル生成エラー:\n${error instanceof Error ? error.message : 'サムネイル生成に失敗しました'}`);
    } finally {
      setGenerateThumbnail(false);
    }
  }, [project, updateSettings]);

  // 🔧 Phase H-2修正: プロジェクト公開（Supabase保存追加）
  const handlePublish = useCallback(async () => {
    setIsPublishing(true);
    setPublishError(null);
    
    try {
      console.log('📤 公開処理開始:', project.name);
      
      // バリデーション
      const errors: string[] = [];
      
      if (!project.settings.name?.trim()) {
        errors.push('ゲーム名を入力してください');
      }
      
      if (!project.assets.objects.length && !project.assets.background) {
        errors.push('最低1つのオブジェクトまたは背景を追加してください');
      }
      
      if (errors.length > 0) {
        throw new Error(errors.join('\n'));
      }
      
      // 🔧 Phase H-2: ユーザーIDを取得
      console.log('🔐 ユーザー認証確認...');
      const user = await auth.getCurrentUser();
      
      if (!user) {
        throw new Error('ログインが必要です。先にログインしてください。');
      }
      
      console.log('✅ ユーザー確認完了:', user.id);
      
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
      console.log('💾 Supabaseに保存中...');
      const storageManager = ProjectStorageManager.getInstance();
      await storageManager.saveToDatabase(projectData, user.id);
      
      console.log('✅ Supabase保存完了！');
      
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
      
      console.log('🎉 公開完了:', { projectId, name: project.settings.name });
      alert(`✅ ゲーム "${project.settings.name}" を公開しました！\n\nSupabaseに保存されたので、ソーシャルフィードに表示されます。`);
      
    } catch (error) {
      console.error('❌ 公開エラー:', error);
      const errorMessage = error instanceof Error ? error.message : '公開に失敗しました';
      setPublishError(errorMessage);
      alert(`❌ 公開エラー:\n${errorMessage}`);
    } finally {
      setIsPublishing(false);
    }
  }, [project, updateProject]);

  // エクスポート機能
  const handleExport = useCallback(async () => {
    try {
      console.log('エクスポート開始');
      
      const exportData = {
        ...project,
        exportedAt: new Date().toISOString(),
        exportSettings: {
          format: 'json',
          version: '1.0.0',
          platform: 'web'
        }
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
      
      console.log('エクスポート完了');
      alert(`ゲーム "${project.settings.name}" をエクスポートしました！`);
      
    } catch (error) {
      console.error('エクスポートエラー:', error);
      alert(`エクスポートエラー:\n${error instanceof Error ? error.message : 'エクスポートに失敗しました'}`);
    }
  }, [project]);

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
            🎮 ゲーム情報
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
                ゲーム名 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={project.settings.name || ''}
                onChange={(e) => handleGameNameChange(e.target.value)}
                placeholder="素晴らしいゲーム名を入力してください"
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
            <div>
              <label style={{ 
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                ゲーム説明
              </label>
              <textarea
                value={project.settings.description || ''}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="このゲームの楽しさを説明してください"
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
            📸 サムネイル
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
                    <div style={{ fontSize: '12px' }}>No Thumbnail</div>
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
                ゲームサムネイル
              </h3>
              <p style={{ 
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '16px'
              }}>
                ゲームの魅力を伝えるサムネイルを設定します
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
                  🎨 自動生成
                </ModernButton>
                
                <label>
                  <ModernButton
                    variant="secondary"
                    size="md"
                    style={{ cursor: 'pointer' }}
                  >
                    📁 アップロード
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
            🎯 テストプレイ
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
                  ゲームをテストしてみましょう
                </h3>
                <p style={{ 
                  color: '#6b7280',
                  marginBottom: '24px',
                  fontSize: '16px'
                }}>
                  作成したゲームが正しく動作するか確認できます
                </p>
                <div style={{ 
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '16px',
                  flexWrap: 'wrap'
                }}>
                  <ModernButton
                    variant="secondary"
                    size="lg"
                    onClick={handleTestPlay}
                    disabled={!project.settings.name || isTestPlaying}
                  >
                    🧪 クイックテスト (3秒)
                  </ModernButton>
                  <ModernButton
                    variant="primary"
                    size="lg"
                    onClick={handleFullGamePlay}
                    disabled={!project.settings.name || isTestPlaying}
                  >
                    ▶️ フルゲーム実行
                  </ModernButton>
                </div>
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
                  テストプレイ中...
                </h3>
                <p style={{ 
                  color: '#6b7280',
                  marginBottom: '24px',
                  fontSize: '16px'
                }}>
                  ゲームの動作を確認しています
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
                  テスト成功！
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
                      <div style={{ color: '#374151' }}>スコア</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ 
                        fontSize: '32px',
                        fontWeight: '700',
                        color: '#10b981'
                      }}>
                        {testPlayDetails.timeElapsed.toFixed(1)}s
                      </div>
                      <div style={{ color: '#374151' }}>プレイ時間</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ 
                        fontSize: '32px',
                        fontWeight: '700',
                        color: '#10b981'
                      }}>
                        {testPlayDetails.finalState?.objectsInteracted?.length || 0}
                      </div>
                      <div style={{ color: '#374151' }}>操作回数</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ 
                        fontSize: '32px',
                        fontWeight: '700',
                        color: '#10b981'
                      }}>
                        {testPlayDetails.finalState?.rulesTriggered?.length || 0}
                      </div>
                      <div style={{ color: '#374151' }}>ルール実行</div>
                    </div>
                  </div>
                </div>
                <div style={{ 
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  <ModernButton
                    variant="secondary"
                    size="md"
                    onClick={() => setTestPlayResult(null)}
                  >
                    もう一度テスト
                  </ModernButton>
                  <ModernButton
                    variant="primary"
                    size="md"
                    onClick={handleFullGamePlay}
                  >
                    フルゲーム実行
                  </ModernButton>
                </div>
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
                  テストで問題発見
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
                    <strong>エラー:</strong>
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
                        <strong style={{ display: 'block', marginTop: '12px' }}>警告:</strong>
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
                  もう一度テスト
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
              ⚡ ゲームスピード（挑戦レベル）
            </h4>
            
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              {GAME_SPEED_LEVELS.map((level) => {
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
                      {level.label}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {level.description}
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
              現在の設定: {
                GAME_SPEED_LEVELS.find(level => level.value === (project.metadata?.gameSpeed || 1.0))?.label || '標準'
              } スピード
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
                  🎮 ゲーム実行中
                </h3>
                <ModernButton
                  variant="error"
                  size="sm"
                  onClick={() => setShowFullGame(false)}
                >
                  ✕ 終了
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
            📊 ゲーム統計
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
                オブジェクト
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '32px',
                fontWeight: '700',
                color: '#10b981'
              }}>
                {project.script.rules.length}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                ルール
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '32px',
                fontWeight: '700',
                color: '#f59e0b'
              }}>
                {project.assets.texts.length}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                テキスト
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
                総容量
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
                テスト回数
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
                  color: project.script.initialState ? '#10b981' : '#f59e0b'
                }}>
                  {project.script.initialState ? '✓' : '⚠️'}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>初期条件</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '32px',
                  fontWeight: '700',
                  color: project.script.layout.objects.length > 0 ? '#10b981' : '#f59e0b'
                }}>
                  {project.script.layout.objects.length}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>配置済み</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '32px',
                  fontWeight: '700',
                  color: project.script.successConditions.length > 0 ? '#10b981' : '#f59e0b'
                }}>
                  {project.script.successConditions.length}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>成功条件</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '32px',
                  fontWeight: '700',
                  color: project.script.statistics?.complexityScore || 0 > 0 ? '#10b981' : '#6b7280'
                }}>
                  {project.script.statistics?.complexityScore || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>複雑度</div>
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
            💾 保存
          </ModernButton>

          <ModernButton
            variant="secondary"
            size="lg"
            onClick={handleTestPlay}
            disabled={!project.settings.name || isTestPlaying}
          >
            🧪 クイックテスト
          </ModernButton>

          <ModernButton
            variant="outline"
            size="lg"
            onClick={handleFullGamePlay}
            disabled={!project.settings.name || isTestPlaying}
          >
            🎮 フルプレイ
          </ModernButton>
          
          <ModernButton
            variant="primary"
            size="lg"
            onClick={handlePublish}
            disabled={!project.settings.name || isPublishing || (!project.assets.objects.length && !project.assets.background)}
            loading={isPublishing}
          >
            {project.settings.publishing?.isPublished ? '🔄 更新' : '🚀 公開'}
          </ModernButton>
          
          <ModernButton
            variant="ghost"
            size="lg"
            onClick={handleExport}
          >
            📦 エクスポート
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
              <span>✅ 公開済み</span>
            {project.settings.publishing?.publishedAt && (
              <span style={{ fontSize: '14px' }}>
              {new Date(project.settings.publishing.publishedAt).toLocaleString('ja-JP')}
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

      {/* アニメーション用スタイル */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes bounce {
            0%, 20%, 53%, 80%, 100% {
              transform: translate3d(0, 0, 0);
            }
            40%, 43% {
              transform: translate3d(0, -30px, 0);
            }
            70% {
              transform: translate3d(0, -15px, 0);
            }
            90% {
              transform: translate3d(0, -4px, 0);
            }
          }
          
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
        `
      }} />
    </div>
  );
};

export default SettingsTab;