// src/components/editor/tabs/AssetsTab.tsx
// 🎨 Phase 2完成版: テキスト機能削除・音声機能統合・3タブ対応
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GameProject } from '../../../types/editor/GameProject';
import { ProjectAssets, BackgroundAsset, ObjectAsset, AssetFrame, AudioAsset } from '../../../types/editor/ProjectAssets';
import { EDITOR_LIMITS } from '../../../constants/EditorLimits';
import { DESIGN_TOKENS } from '../../../constants/DesignSystem';
import { ModernButton } from '../../ui/ModernButton';
import { ModernCard } from '../../ui/ModernCard';
import { DragDropZone, FileProcessingResult } from '../../ui/DragDropZone';
import { createDefaultInitialState, syncInitialStateWithLayout } from '../../../types/editor/GameScript';

interface AssetsTabProps {
  project: GameProject;
  onProjectUpdate: (project: GameProject) => void;
}

// 🔧 修正: テキスト削除・サウンド追加
type AssetType = 'background' | 'objects' | 'sound';
type EditMode = 'none' | 'background' | 'object' | 'animation';
type SoundType = 'bgm' | 'se';

// ファイルサイズを人間が読みやすい形式に変換
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 時間フォーマット (秒 → mm:ss)
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// 音声ファイルの情報を取得
const getAudioInfo = (file: File): Promise<{
  duration: number;
  format: string;
}> => {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    
    audio.addEventListener('loadedmetadata', () => {
      resolve({
        duration: audio.duration,
        format: file.type.split('/')[1] || 'unknown'
      });
      URL.revokeObjectURL(url);
    });
    
    audio.addEventListener('error', () => {
      reject(new Error('音声ファイルの読み込みに失敗しました'));
      URL.revokeObjectURL(url);
    });
    
    audio.src = url;
  });
};

// 画像ファイルをリサイズ・最適化
const optimizeImage = async (file: File, maxWidth: number, maxHeight: number, quality: number = 0.8): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      // アスペクト比を保持してリサイズ
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // 画像を描画
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      // Blobとして出力
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas to blob conversion failed'));
        }
      }, 'image/webp', quality);
    };
    
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = URL.createObjectURL(file);
  });
};

export const AssetsTab: React.FC<AssetsTabProps> = ({ project, onProjectUpdate }) => {
  const [activeAssetType, setActiveAssetType] = useState<AssetType>('background');
  const [editMode, setEditMode] = useState<EditMode>('none');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // サウンド管理用状態
  const [activeSoundType, setActiveSoundType] = useState<SoundType>('bgm');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [editingAudioId, setEditingAudioId] = useState<string | null>(null);
  const [masterVolume, setMasterVolume] = useState<number>(1.0);
  
  // 音声再生用Ref
  const audioRef = useRef<HTMLAudioElement>(null);

  // 通知表示ヘルパー
  const showNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  // 容量計算（画像+音声）
  const getTotalSize = useCallback(() => {
    let total = 0;
    if (project.assets.background) total += project.assets.background.totalSize;
    project.assets.objects.forEach(obj => total += obj.totalSize);
    if (project.assets.audio.bgm) total += project.assets.audio.bgm.fileSize;
    project.assets.audio.se.forEach(se => total += se.fileSize);
    return total;
  }, [project.assets]);

  const totalSize = getTotalSize();
  const sizePercentage = (totalSize / EDITOR_LIMITS.PROJECT.TOTAL_MAX_SIZE) * 100;

  // プロジェクト更新ヘルパー（script・layout同期機能付き）
  const updateProjectWithSync = useCallback((updates: Partial<GameProject>) => {
    const updatedProject = { ...project, ...updates };
    
    // 初期条件の確保・同期
    if (updates.assets && !updatedProject.script.initialState) {
      console.log('🔧 初期条件なし→デフォルト作成・同期');
      updatedProject.script.initialState = createDefaultInitialState();
      updatedProject.script.initialState = syncInitialStateWithLayout(
        updatedProject.script.initialState, 
        updatedProject.script.layout
      );
    }
    
    onProjectUpdate(updatedProject);
  }, [project, onProjectUpdate]);

  // 音声ファイルアップロード処理
  const handleAudioUpload = useCallback(async (files: FileList, type: SoundType) => {
    if (uploading) return;
    setUploading(true);

    try {
      const file = files[0];
      
      if (!file || !file.type.startsWith('audio/')) {
        showNotification('error', '音声ファイルを選択してください');
        return;
      }
      
      // 音声情報取得
      const audioInfo = await getAudioInfo(file);
      
      // 時間制限チェック
      const maxDuration = type === 'bgm' ? EDITOR_LIMITS.AUDIO.BGM_MAX_DURATION : EDITOR_LIMITS.AUDIO.SE_MAX_DURATION;
      if (audioInfo.duration > maxDuration) {
        showNotification('error', `音声が長すぎます。最大${maxDuration}秒までです。`);
        return;
      }

      // 容量制限チェック
      if (type === 'se' && project.assets.audio.se.length >= EDITOR_LIMITS.PROJECT.MAX_SE_COUNT) {
        showNotification('error', `効果音は最大${EDITOR_LIMITS.PROJECT.MAX_SE_COUNT}個まで追加できます`);
        return;
      }

      // Base64変換
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const now = new Date().toISOString();
        
        const newAudioAsset: AudioAsset = {
          id: crypto.randomUUID(),
          name: file.name.replace(/\.[^/.]+$/, ''), // 拡張子除去
          dataUrl,
          originalName: file.name,
          duration: audioInfo.duration,
          fileSize: file.size,
          format: audioInfo.format,
          volume: 0.8,
          loop: type === 'bgm',
          uploadedAt: now
        };

        // プロジェクト更新
        const updatedAssets = { ...project.assets };
        
        if (type === 'bgm') {
          updatedAssets.audio.bgm = newAudioAsset;
        } else {
          updatedAssets.audio.se.push(newAudioAsset);
        }

        // 統計更新
        const imageSize = updatedAssets.objects.reduce((sum, obj) => sum + obj.totalSize, 0) + 
                         (updatedAssets.background?.totalSize || 0);
        const audioSize = (updatedAssets.audio.bgm?.fileSize || 0) + 
                         updatedAssets.audio.se.reduce((sum, se) => sum + se.fileSize, 0);

        updatedAssets.statistics = {
          totalImageSize: imageSize,
          totalAudioSize: audioSize,
          totalSize: imageSize + audioSize,
          usedSlots: {
            background: updatedAssets.background ? 1 : 0,
            objects: updatedAssets.objects.length,
            bgm: updatedAssets.audio.bgm ? 1 : 0,
            se: updatedAssets.audio.se.length
          },
          limitations: {
            isNearImageLimit: false,
            isNearAudioLimit: audioSize > (EDITOR_LIMITS.AUDIO.BGM_MAX_SIZE + EDITOR_LIMITS.AUDIO.SE_MAX_SIZE * EDITOR_LIMITS.PROJECT.MAX_SE_COUNT) * 0.8,
            isNearTotalLimit: (imageSize + audioSize) > EDITOR_LIMITS.PROJECT.TOTAL_MAX_SIZE * 0.8,
            hasViolations: false
          }
        };

        updatedAssets.lastModified = now;

        updateProjectWithSync({
          assets: updatedAssets,
          totalSize: imageSize + audioSize,
          lastModified: now
        });

        showNotification('success', `${type === 'bgm' ? 'BGM' : '効果音'}をアップロードしました`);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('音声アップロードエラー:', error);
      showNotification('error', '音声ファイルのアップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  }, [project, updateProjectWithSync, uploading, showNotification]);

  // 音声再生
  const playAudio = useCallback((audio: AudioAsset) => {
    if (!audioRef.current) return;

    // 既に再生中の場合は停止
    if (playingId === audio.id) {
      audioRef.current.pause();
      setPlayingId(null);
      return;
    }

    audioRef.current.src = audio.dataUrl;
    audioRef.current.volume = audio.volume * masterVolume;
    audioRef.current.loop = audio.loop;
    
    audioRef.current.play().then(() => {
      setPlayingId(audio.id);
    }).catch(error => {
      console.error('音声再生エラー:', error);
      showNotification('error', '音声の再生に失敗しました');
    });
  }, [playingId, masterVolume, showNotification]);

  // 音声停止
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingId(null);
    setCurrentTime(0);
  }, []);

  // 音声削除
  const deleteAudio = useCallback((type: SoundType, id?: string) => {
    const updatedAssets = { ...project.assets };
    let removedSize = 0;
    const now = new Date().toISOString();

    if (type === 'bgm' && updatedAssets.audio.bgm) {
      removedSize = updatedAssets.audio.bgm.fileSize;
      updatedAssets.audio.bgm = null;
    } else if (type === 'se' && id) {
      const index = updatedAssets.audio.se.findIndex(se => se.id === id);
      if (index >= 0) {
        removedSize = updatedAssets.audio.se[index].fileSize;
        updatedAssets.audio.se.splice(index, 1);
      }
    }

    // 再生中の音声を削除した場合は停止
    if ((type === 'bgm' && playingId === project.assets.audio.bgm?.id) ||
        (type === 'se' && playingId === id)) {
      stopAudio();
    }

    // 統計更新
    const imageSize = updatedAssets.objects.reduce((sum, obj) => sum + obj.totalSize, 0) + 
                     (updatedAssets.background?.totalSize || 0);
    const audioSize = (updatedAssets.audio.bgm?.fileSize || 0) + 
                     updatedAssets.audio.se.reduce((sum, se) => sum + se.fileSize, 0);

    updatedAssets.statistics = {
      totalImageSize: imageSize,
      totalAudioSize: audioSize,
      totalSize: imageSize + audioSize,
      usedSlots: {
        background: updatedAssets.background ? 1 : 0,
        objects: updatedAssets.objects.length,
        bgm: updatedAssets.audio.bgm ? 1 : 0,
        se: updatedAssets.audio.se.length
      },
      limitations: {
        isNearImageLimit: false,
        isNearAudioLimit: false,
        isNearTotalLimit: false,
        hasViolations: false
      }
    };

    updatedAssets.lastModified = now;

    updateProjectWithSync({
      assets: updatedAssets,
      totalSize: project.totalSize - removedSize,
      lastModified: now
    });

    showNotification('success', '音声を削除しました');
  }, [project, updateProjectWithSync, playingId, stopAudio, showNotification]);

  // 音声プロパティ更新
  const updateAudioProperty = useCallback((type: SoundType, id: string, property: string, value: any) => {
    const updatedAssets = { ...project.assets };
    const now = new Date().toISOString();
    
    if (type === 'bgm' && updatedAssets.audio.bgm?.id === id) {
      updatedAssets.audio.bgm = {
        ...updatedAssets.audio.bgm,
        [property]: value
      };
    } else if (type === 'se') {
      const index = updatedAssets.audio.se.findIndex(se => se.id === id);
      if (index >= 0) {
        updatedAssets.audio.se[index] = {
          ...updatedAssets.audio.se[index],
          [property]: value
        };
      }
    }

    updatedAssets.lastModified = now;

    updateProjectWithSync({
      assets: updatedAssets,
      lastModified: now
    });
  }, [project, updateProjectWithSync]);

  // 音声再生時間更新
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const onEnded = () => {
      setPlayingId(null);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  // 画像ファイルアップロード処理
  const handleMultipleFileUpload = useCallback(async (results: FileProcessingResult[]) => {
    if (uploading) return;
    setUploading(true);

    try {
      const now = new Date().toISOString();
      const updatedAssets = { ...project.assets };
      const updatedScript = { ...project.script };
      let addedCount = 0;

      for (const result of results) {
        if (!result.accepted) {
          showNotification('error', result.error || 'ファイルが受け入れられませんでした');
          continue;
        }

        if (result.type !== 'image') {
          showNotification('error', '画像ファイルのみアップロード可能です');
          continue;
        }

        // サイズチェック
        const maxSize = activeAssetType === 'background' 
          ? EDITOR_LIMITS.IMAGE.BACKGROUND_FRAME_MAX_SIZE
          : EDITOR_LIMITS.IMAGE.OBJECT_FRAME_MAX_SIZE;

        if (result.file.size > maxSize) {
          showNotification('error', `ファイルサイズが大きすぎます: ${result.file.name}`);
          continue;
        }

        // 画像最適化
        const optimized = await optimizeImage(
          result.file, 
          activeAssetType === 'background' ? 1080 : 512, 
          activeAssetType === 'background' ? 1920 : 512,
          0.8
        );

        // Base64に変換
        const reader = new FileReader();
        
        await new Promise<void>((resolve, reject) => {
          reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            
            // アセットフレーム作成
            const frame: AssetFrame = {
              id: crypto.randomUUID(),
              dataUrl,
              originalName: result.file.name,
              width: activeAssetType === 'background' ? 1080 : 512,
              height: activeAssetType === 'background' ? 1920 : 512,
              fileSize: optimized?.size || result.file.size,
              uploadedAt: now
            };

            // プロジェクト更新
            if (activeAssetType === 'background') {
              // 背景アセット作成
              updatedAssets.background = {
                id: crypto.randomUUID(),
                name: 'Background',
                frames: [frame],
                animationSettings: { speed: 10, loop: true, pingPong: false, autoStart: true },
                totalSize: frame.fileSize,
                createdAt: now,
                lastModified: now
              };
              
              // layout.background.visible を true に設定
              updatedScript.layout.background = {
                ...updatedScript.layout.background,
                visible: true,
                animationSpeed: 10,
                autoStart: false,
                initialAnimation: 0
              };
              
              // 初期条件の背景状態も更新
              if (!updatedScript.initialState) {
                updatedScript.initialState = createDefaultInitialState();
              }
              updatedScript.initialState.layout.background = {
                visible: true,
                frameIndex: 0,
                animationSpeed: 10,
                autoStart: false
              };
              
              console.log('✅ 背景追加: layout.background.visible = true 設定完了');
              addedCount++;
              
            } else if (activeAssetType === 'objects') {
              // オブジェクト数制限チェック
              if (updatedAssets.objects.length >= EDITOR_LIMITS.PROJECT.MAX_OBJECTS) {
                showNotification('error', `オブジェクトは最大${EDITOR_LIMITS.PROJECT.MAX_OBJECTS}個まで追加できます`);
                resolve();
                return;
              }

              const newObject: ObjectAsset = {
                id: crypto.randomUUID(),
                name: `オブジェクト${updatedAssets.objects.length + 1}`,
                frames: [frame],
                animationSettings: { speed: 10, loop: true, pingPong: false, autoStart: true },
                totalSize: frame.fileSize,
                createdAt: now,
                lastModified: now,
                defaultScale: 1.0,
                defaultOpacity: 1.0
              };
              updatedAssets.objects.push(newObject);
              addedCount++;
            }

            resolve();
          };

          reader.onerror = reject;
          reader.readAsDataURL(optimized || result.file);
        });
      }

      // 統計更新
      if (addedCount > 0) {
        const imageSize = updatedAssets.objects.reduce((sum, obj) => sum + obj.totalSize, 0) + 
                         (updatedAssets.background?.totalSize || 0);
        const audioSize = (updatedAssets.audio.bgm?.fileSize || 0) + 
                         updatedAssets.audio.se.reduce((sum, se) => sum + se.fileSize, 0);

        updatedAssets.statistics = {
          totalImageSize: imageSize,
          totalAudioSize: audioSize,
          totalSize: imageSize + audioSize,
          usedSlots: {
            background: updatedAssets.background ? 1 : 0,
            objects: updatedAssets.objects.length,
            bgm: updatedAssets.audio.bgm ? 1 : 0,
            se: updatedAssets.audio.se.length
          },
          limitations: {
            isNearImageLimit: imageSize > EDITOR_LIMITS.IMAGE.BACKGROUND_TOTAL_MAX_SIZE * 0.8,
            isNearAudioLimit: audioSize > EDITOR_LIMITS.AUDIO.BGM_MAX_SIZE * 0.8,
            isNearTotalLimit: (imageSize + audioSize) > EDITOR_LIMITS.PROJECT.TOTAL_MAX_SIZE * 0.8,
            hasViolations: false
          }
        };

        updatedAssets.lastModified = now;
        updatedScript.lastModified = now;

        // script と assets 両方を同期更新
        updateProjectWithSync({
          assets: updatedAssets,
          script: updatedScript,
          totalSize: imageSize + audioSize,
          lastModified: now
        });

        showNotification('success', `${addedCount}個のファイルをアップロードしました`);
      }
    } catch (error) {
      console.error('ファイルアップロードエラー:', error);
      showNotification('error', 'ファイルのアップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  }, [activeAssetType, project, updateProjectWithSync, uploading, showNotification]);

  // アセット削除（layout同期対応）
  const deleteAsset = useCallback((type: AssetType, id?: string) => {
    const updatedAssets = { ...project.assets };
    const updatedScript = { ...project.script };
    let removedSize = 0;
    const now = new Date().toISOString();

    if (type === 'background') {
      if (updatedAssets.background) {
        removedSize = updatedAssets.background.totalSize;
        updatedAssets.background = null;
        
        // layout.background.visible も false に設定
        updatedScript.layout.background = {
          ...updatedScript.layout.background,
          visible: false
        };
        
        // 初期条件の背景状態も更新
        if (updatedScript.initialState) {
          updatedScript.initialState.layout.background.visible = false;
        }
        
        console.log('🗑️ 背景削除: layout.background.visible = false 設定完了');
      }
    } else if (type === 'objects' && id) {
      const index = updatedAssets.objects.findIndex(obj => obj.id === id);
      if (index >= 0) {
        removedSize = updatedAssets.objects[index].totalSize;
        updatedAssets.objects.splice(index, 1);
        
        // レイアウトからも削除
        updatedScript.layout.objects = updatedScript.layout.objects.filter(obj => obj.objectId !== id);
        
        // 初期条件からも削除
        if (updatedScript.initialState) {
          updatedScript.initialState.layout.objects = updatedScript.initialState.layout.objects.filter(obj => obj.id !== id);
        }
        
        console.log('🗑️ オブジェクト削除: layoutからも削除完了');
      }
    }

    // 統計更新
    const imageSize = updatedAssets.objects.reduce((sum, obj) => sum + obj.totalSize, 0) + 
                     (updatedAssets.background?.totalSize || 0);
    const audioSize = (updatedAssets.audio.bgm?.fileSize || 0) + 
                     updatedAssets.audio.se.reduce((sum, se) => sum + se.fileSize, 0);

    updatedAssets.statistics = {
      totalImageSize: imageSize,
      totalAudioSize: audioSize,
      totalSize: imageSize + audioSize,
      usedSlots: {
        background: updatedAssets.background ? 1 : 0,
        objects: updatedAssets.objects.length,
        bgm: updatedAssets.audio.bgm ? 1 : 0,
        se: updatedAssets.audio.se.length
      },
      limitations: {
        isNearImageLimit: false,
        isNearAudioLimit: false,
        isNearTotalLimit: false,
        hasViolations: false
      }
    };

    updatedAssets.lastModified = now;
    updatedScript.lastModified = now;

    updateProjectWithSync({
      assets: updatedAssets,
      script: updatedScript,
      totalSize: project.totalSize - removedSize,
      lastModified: now
    });

    showNotification('success', 'アセットを削除しました');
  }, [project, updateProjectWithSync, showNotification]);

  return (
    <div 
      style={{ 
        padding: DESIGN_TOKENS.spacing[6],
        fontFamily: DESIGN_TOKENS.typography.fontFamily.sans.join(', '),
        backgroundColor: DESIGN_TOKENS.colors.neutral[50],
        minHeight: '100%'
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

      {/* デバッグ情報（layout.background.visible状態表示） */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-blue-600 font-medium">🔧 デバッグ情報:</span>
            <span className="text-sm">
              layout.background.visible = 
              <span className={`font-bold ml-1 ${project.script.layout.background.visible ? 'text-green-600' : 'text-red-600'}`}>
                {project.script.layout.background.visible ? 'true' : 'false'}
              </span>
            </span>
          </div>
          {project.assets.background && !project.script.layout.background.visible && (
            <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
              背景非表示中
            </span>
          )}
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
            使用容量（画像+音声）
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
            容量が不足しています。不要なアセットを削除してください。
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
          { id: 'background' as AssetType, label: '背景', icon: '🖼️', count: project.assets.background ? 1 : 0 },
          { id: 'objects' as AssetType, label: 'オブジェクト', icon: '🎨', count: project.assets.objects.length },
          { id: 'sound' as AssetType, label: 'サウンド', icon: '🎵', count: (project.assets.audio.bgm ? 1 : 0) + project.assets.audio.se.length }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveAssetType(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: DESIGN_TOKENS.spacing[2],
              padding: `${DESIGN_TOKENS.spacing[3]} ${DESIGN_TOKENS.spacing[4]}`,
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              backgroundColor: activeAssetType === tab.id 
                ? DESIGN_TOKENS.colors.primary[500]
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
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span 
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                  padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[2]}`,
                  backgroundColor: activeAssetType === tab.id 
                    ? DESIGN_TOKENS.colors.neutral[0]
                    : DESIGN_TOKENS.colors.primary[100],
                  color: activeAssetType === tab.id 
                    ? DESIGN_TOKENS.colors.primary[600]
                    : DESIGN_TOKENS.colors.primary[700],
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

      {/* 背景管理セクション */}
      {activeAssetType === 'background' && (
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
              🖼️ 背景
              <span 
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  color: DESIGN_TOKENS.colors.neutral[500],
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.normal
                }}
              >
                (1枚まで)
              </span>
            </h3>
          </div>

          {project.assets.background ? (
            <ModernCard variant="elevated" size="md" style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[4] }}>
                <img
                  src={project.assets.background.frames[0].dataUrl}
                  alt="背景プレビュー"
                  style={{
                    width: '80px',
                    height: '144px',
                    objectFit: 'cover',
                    borderRadius: DESIGN_TOKENS.borderRadius.md,
                    border: `1px solid ${DESIGN_TOKENS.colors.neutral[200]}`
                  }}
                />
                <div style={{ flex: 1 }}>
                  <h4 
                    style={{
                      fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                      fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                      color: DESIGN_TOKENS.colors.neutral[800],
                      margin: `0 0 ${DESIGN_TOKENS.spacing[1]} 0`
                    }}
                  >
                    {project.assets.background.name}
                  </h4>
                  <p 
                    style={{
                      fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                      color: DESIGN_TOKENS.colors.neutral[500],
                      margin: `0 0 ${DESIGN_TOKENS.spacing[1]} 0`
                    }}
                  >
                    {project.assets.background.frames[0].width}×{project.assets.background.frames[0].height}px
                  </p>
                  <p 
                    style={{
                      fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                      color: DESIGN_TOKENS.colors.neutral[500],
                      margin: 0
                    }}
                  >
                    {formatFileSize(project.assets.background.totalSize)}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      project.script.layout.background.visible 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {project.script.layout.background.visible ? '✅ 表示中' : '❌ 非表示'}
                    </span>
                  </div>
                </div>
                <ModernButton
                  variant="error"
                  size="sm"
                  icon="🗑️"
                  onClick={() => deleteAsset('background')}
                >
                  削除
                </ModernButton>
              </div>
            </ModernCard>
          ) : (
            <DragDropZone
              accept={['image/*']}
              maxFiles={1}
              maxSize={EDITOR_LIMITS.IMAGE.BACKGROUND_FRAME_MAX_SIZE}
              variant="large"
              title="背景画像をアップロード"
              description="画像をドラッグ&ドロップするか、クリックしてファイルを選択"
              buttonText="ファイルを選択"
              onFilesDrop={handleMultipleFileUpload}
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
              💡 背景のヒント
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
              <li>9:16（縦向き）の比率が推奨です</li>
              <li>最大{formatFileSize(EDITOR_LIMITS.IMAGE.BACKGROUND_FRAME_MAX_SIZE)}まで対応</li>
              <li>ファイルサイズが大きい場合は自動で最適化されます</li>
              <li>追加すると自動的に表示設定されます</li>
            </ul>
          </ModernCard>
        </div>
      )}

      {/* オブジェクト管理セクション */}
      {activeAssetType === 'objects' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: DESIGN_TOKENS.spacing[4] }}>
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
              🎨 オブジェクト
              <span 
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  color: DESIGN_TOKENS.colors.neutral[500],
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.normal
                }}
              >
                ({project.assets.objects.length}/{EDITOR_LIMITS.PROJECT.MAX_OBJECTS})
              </span>
            </h3>
          </div>

          {/* ドラッグ&ドロップゾーン */}
          {project.assets.objects.length < EDITOR_LIMITS.PROJECT.MAX_OBJECTS && (
            <DragDropZone
              accept={['image/*']}
              maxFiles={EDITOR_LIMITS.PROJECT.MAX_OBJECTS - project.assets.objects.length}
              maxSize={EDITOR_LIMITS.IMAGE.OBJECT_FRAME_MAX_SIZE}
              variant="default"
              title="オブジェクト画像をアップロード"
              description={`複数ファイルの同時アップロード対応（最大${EDITOR_LIMITS.PROJECT.MAX_OBJECTS - project.assets.objects.length}個）`}
              buttonText="ファイルを選択"
              onFilesDrop={handleMultipleFileUpload}
              loading={uploading}
              style={{ marginBottom: DESIGN_TOKENS.spacing[6] }}
            />
          )}

          {/* 既存オブジェクト一覧 */}
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: DESIGN_TOKENS.spacing[4],
              marginBottom: DESIGN_TOKENS.spacing[6]
            }}
          >
            {project.assets.objects.map((obj) => {
              // レイアウト配置状況確認
              const isPlaced = project.script.layout.objects.some(layoutObj => layoutObj.objectId === obj.id);
              
              return (
                <ModernCard key={obj.id} variant="elevated" size="sm">
                  <img
                    src={obj.frames[0].dataUrl}
                    alt={obj.name}
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      objectFit: 'cover',
                      borderRadius: DESIGN_TOKENS.borderRadius.md,
                      marginBottom: DESIGN_TOKENS.spacing[3]
                    }}
                  />
                  <h4 
                    style={{
                      fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                      fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                      color: DESIGN_TOKENS.colors.neutral[800],
                      margin: `0 0 ${DESIGN_TOKENS.spacing[1]} 0`
                    }}
                  >
                    {obj.name}
                  </h4>
                  <p 
                    style={{
                      fontSize: DESIGN_TOKENS.typography.fontSize.xs,
                      color: DESIGN_TOKENS.colors.neutral[500],
                      margin: `0 0 ${DESIGN_TOKENS.spacing[2]} 0`
                    }}
                  >
                    {formatFileSize(obj.totalSize)}
                  </p>
                  
                  {/* 配置状況表示 */}
                  <div className="mb-3">
                    <span className={`text-xs px-2 py-1 rounded ${
                      isPlaced 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {isPlaced ? '✅ 配置済み' : '📦 未配置'}
                    </span>
                  </div>
                  
                  <ModernButton
                    variant="error"
                    size="xs"
                    fullWidth
                    icon="🗑️"
                    onClick={() => deleteAsset('objects', obj.id)}
                  >
                    削除
                  </ModernButton>
                </ModernCard>
              );
            })}
          </div>

          {project.assets.objects.length >= EDITOR_LIMITS.PROJECT.MAX_OBJECTS && (
            <ModernCard variant="filled" size="sm">
              <p 
                style={{
                  textAlign: 'center',
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  color: DESIGN_TOKENS.colors.neutral[600],
                  margin: 0
                }}
              >
                オブジェクトは最大{EDITOR_LIMITS.PROJECT.MAX_OBJECTS}個まで追加できます
              </p>
            </ModernCard>
          )}
        </div>
      )}

      {/* サウンド管理セクション（AudioTab統合版） */}
      {activeAssetType === 'sound' && (
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
              🎵 サウンド
              <span 
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  color: DESIGN_TOKENS.colors.neutral[500],
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.normal
                }}
              >
                (BGM: {project.assets.audio.bgm ? 1 : 0}/1, SE: {project.assets.audio.se.length}/{EDITOR_LIMITS.PROJECT.MAX_SE_COUNT})
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
            {[
              { id: 'bgm' as SoundType, label: 'BGM', icon: '🎵', count: project.assets.audio.bgm ? 1 : 0 },
              { id: 'se' as SoundType, label: '効果音', icon: '🔊', count: project.assets.audio.se.length }
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

          {/* マスター音量 */}
          <ModernCard variant="filled" size="sm" style={{ marginBottom: DESIGN_TOKENS.spacing[6] }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: DESIGN_TOKENS.spacing[2] }}>
              <span 
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                  color: DESIGN_TOKENS.colors.neutral[700]
                }}
              >
                🔊 マスター音量
              </span>
              <span 
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  color: DESIGN_TOKENS.colors.neutral[600]
                }}
              >
                {Math.round(masterVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={masterVolume}
              onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: DESIGN_TOKENS.borderRadius.full,
                background: DESIGN_TOKENS.colors.neutral[200],
                outline: 'none',
                cursor: 'pointer'
              }}
            />
          </ModernCard>

          {/* BGM管理 */}
          {activeSoundType === 'bgm' && (
            <div>
              {project.assets.audio.bgm ? (
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
                        {formatTime(project.assets.audio.bgm.duration)} • {formatFileSize(project.assets.audio.bgm.fileSize)}
                      </p>
                      {playingId === project.assets.audio.bgm.id && (
                        <p 
                          style={{
                            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                            color: DESIGN_TOKENS.colors.primary[600],
                            margin: `${DESIGN_TOKENS.spacing[1]} 0 0 0`
                          }}
                        >
                          再生時間: {formatTime(currentTime)} / {formatTime(project.assets.audio.bgm.duration)}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[2] }}>
                      <ModernButton
                        variant={playingId === project.assets.audio.bgm.id ? "secondary" : "primary"}
                        size="sm"
                        icon={playingId === project.assets.audio.bgm.id ? '⏹️' : '▶️'}
                        onClick={() => playAudio(project.assets.audio.bgm!)}
                      >
                        {playingId === project.assets.audio.bgm.id ? '停止' : '再生'}
                      </ModernButton>
                      <ModernButton
                        variant="outline"
                        size="sm"
                        icon="⚙️"
                        onClick={() => setEditingAudioId(
                          editingAudioId === project.assets.audio.bgm!.id ? null : project.assets.audio.bgm!.id
                        )}
                      >
                        設定
                      </ModernButton>
                      <ModernButton
                        variant="error"
                        size="sm"
                        icon="🗑️"
                        onClick={() => deleteAudio('bgm')}
                      >
                        削除
                      </ModernButton>
                    </div>
                  </div>

                  {/* BGM設定パネル */}
                  {editingAudioId === project.assets.audio.bgm.id && (
                    <div 
                      style={{
                        borderTop: `1px solid ${DESIGN_TOKENS.colors.neutral[200]}`,
                        paddingTop: DESIGN_TOKENS.spacing[4],
                        marginTop: DESIGN_TOKENS.spacing[4]
                      }}
                    >
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
                          音量 ({Math.round(project.assets.audio.bgm.volume * 100)}%)
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={project.assets.audio.bgm.volume}
                          onChange={(e) => updateAudioProperty('bgm', project.assets.audio.bgm!.id, 'volume', parseFloat(e.target.value))}
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
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: DESIGN_TOKENS.spacing[2] }}>
                          <input
                            type="checkbox"
                            checked={project.assets.audio.bgm.loop}
                            onChange={(e) => updateAudioProperty('bgm', project.assets.audio.bgm!.id, 'loop', e.target.checked)}
                          />
                          <span 
                            style={{
                              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                              color: DESIGN_TOKENS.colors.neutral[700]
                            }}
                          >
                            ループ再生
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
                  title="BGMをアップロード"
                  description="音声ファイルをドラッグ&ドロップするか、クリックしてファイルを選択"
                  buttonText="ファイルを選択"
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
                  💡 BGMのヒント
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
                  <li>最大{EDITOR_LIMITS.AUDIO.BGM_MAX_DURATION}秒、{formatFileSize(EDITOR_LIMITS.AUDIO.BGM_MAX_SIZE)}まで</li>
                  <li>対応形式: MP3, WAV, OGG</li>
                  <li>自動ループ再生されます</li>
                </ul>
              </ModernCard>
            </div>
          )}

          {/* SE（効果音）管理 */}
          {activeSoundType === 'se' && (
            <div>
              {/* 既存効果音一覧 */}
              <div style={{ marginBottom: DESIGN_TOKENS.spacing[6] }}>
                {project.assets.audio.se.map((se) => (
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
                          {formatTime(se.duration)} • {formatFileSize(se.fileSize)}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: DESIGN_TOKENS.spacing[2] }}>
                        <ModernButton
                          variant={playingId === se.id ? "secondary" : "primary"}
                          size="xs"
                          icon={playingId === se.id ? '⏹️' : '▶️'}
                          onClick={() => playAudio(se)}
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
                          onClick={() => deleteAudio('se', se.id)}
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
                            効果音名
                          </label>
                          <input
                            type="text"
                            value={se.name}
                            onChange={(e) => updateAudioProperty('se', se.id, 'name', e.target.value)}
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
                            音量 ({Math.round(se.volume * 100)}%)
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={se.volume}
                            onChange={(e) => updateAudioProperty('se', se.id, 'volume', parseFloat(e.target.value))}
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

              {/* 新規効果音追加 */}
              {project.assets.audio.se.length < EDITOR_LIMITS.PROJECT.MAX_SE_COUNT && (
                <DragDropZone
                  accept={['audio/*']}
                  maxFiles={EDITOR_LIMITS.PROJECT.MAX_SE_COUNT - project.assets.audio.se.length}
                  maxSize={EDITOR_LIMITS.AUDIO.SE_MAX_SIZE}
                  variant="default"
                  title="効果音を追加"
                  description={`音声ファイルをドラッグ&ドロップ（最大${EDITOR_LIMITS.PROJECT.MAX_SE_COUNT - project.assets.audio.se.length}個）`}
                  buttonText="ファイルを選択"
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

              <ModernCard variant="filled" size="sm">
                <h4 
                  style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                    fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
                    color: DESIGN_TOKENS.colors.primary[800],
                    margin: `0 0 ${DESIGN_TOKENS.spacing[2]} 0`
                  }}
                >
                  💡 効果音のヒント
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
                  <li>最大{EDITOR_LIMITS.AUDIO.SE_MAX_DURATION}秒、{formatFileSize(EDITOR_LIMITS.AUDIO.SE_MAX_SIZE)}まで</li>
                  <li>対応形式: MP3, WAV, OGG</li>
                  <li>1回再生（ループなし）で実行されます</li>
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
      )}

      {/* アップロード中オーバーレイ */}
      {uploading && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: DESIGN_TOKENS.zIndex.modal
          }}
        >
          <ModernCard variant="elevated" size="lg">
            <div style={{ textAlign: 'center' }}>
              <div 
                style={{
                  width: '48px',
                  height: '48px',
                  border: '4px solid transparent',
                  borderTop: `4px solid ${DESIGN_TOKENS.colors.primary[500]}`,
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: `0 auto ${DESIGN_TOKENS.spacing[4]} auto`
                }}
              />
              <p 
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.lg,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                  color: DESIGN_TOKENS.colors.neutral[800],
                  margin: 0
                }}
              >
                {activeAssetType === 'sound' ? '音声を処理中...' : '画像を処理中...'}
              </p>
              <p 
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.sm,
                  color: DESIGN_TOKENS.colors.neutral[600],
                  margin: `${DESIGN_TOKENS.spacing[2]} 0 0 0`
                }}
              >
                少々お待ちください
              </p>
            </div>
          </ModernCard>
        </div>
      )}
    </div>
  );
};