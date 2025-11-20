import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GameProject } from '../../../types/editor/GameProject';
import { AudioAsset } from '../../../types/editor/ProjectAssets';
import { EDITOR_LIMITS } from '../../../constants/EditorLimits';

interface AudioTabProps {
  project: GameProject;
  onProjectUpdate: (project: GameProject) => void;
}

type AudioType = 'bgm' | 'se';

// FileUploader コンポーネント（簡易版 - インライン実装）
interface FileUploaderProps {
  accept: string;
  maxSize: number;
  onUpload: (files: FileList) => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  accept,
  maxSize,
  onUpload,
  disabled = false,
  className = '',
  children
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onUpload(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onUpload(files);
    }
  };

  return (
    <div
      className={`${className} ${dragOver ? 'bg-purple-50 border-purple-400' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        disabled={disabled}
        className="hidden"
      />
      <div
        onClick={() => !disabled && fileInputRef.current?.click()}
        className="cursor-pointer"
      >
        {children}
      </div>
    </div>
  );
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

// 音声波形を描画
const drawWaveform = (canvas: HTMLCanvasElement, audioBuffer: AudioBuffer) => {
  const ctx = canvas.getContext('2d')!;
  const width = canvas.width;
  const height = canvas.height;
  
  ctx.clearRect(0, 0, width, height);
  
  const data = audioBuffer.getChannelData(0);
  const step = Math.ceil(data.length / width);
  const amp = height / 2;
  
  ctx.fillStyle = '#6366f1';
  ctx.beginPath();
  
  for (let i = 0; i < width; i++) {
    let min = 1.0;
    let max = -1.0;
    
    for (let j = 0; j < step; j++) {
      const datum = data[i * step + j];
      if (datum < min) min = datum;
      if (datum > max) max = datum;
    }
    
    const minY = (1 + min) * amp;
    const maxY = (1 + max) * amp;
    
    ctx.fillRect(i, minY, 1, maxY - minY);
  }
};

// 時間フォーマット (秒 → mm:ss)
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// ファイルサイズフォーマット
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const AudioTab: React.FC<AudioTabProps> = ({ project, onProjectUpdate }) => {
  const { t } = useTranslation();
  const [activeAudioType, setActiveAudioType] = useState<AudioType>('bgm');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(1.0);

  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // 🔧 修正箇所1: 音声容量計算（176-177行目）
  const getAudioSize = useCallback(() => {
    let total = 0;
    // ✅ 修正: オプショナルチェーン追加
    if (project.assets.audio?.bgm) total += project.assets.audio.bgm.fileSize;
    project.assets.audio?.se?.forEach(se => total += se.fileSize);
    return total;
  }, [project.assets.audio]);

  const audioSize = getAudioSize();
  const maxAudioSize = EDITOR_LIMITS.AUDIO.BGM_MAX_SIZE + 
                     (EDITOR_LIMITS.AUDIO.SE_MAX_SIZE * EDITOR_LIMITS.PROJECT.MAX_SE_COUNT);
  const audioSizePercentage = (audioSize / maxAudioSize) * 100;

  // 音声ファイルアップロード処理（修正版 - files型指定）
  const handleAudioUpload = useCallback(async (files: FileList, type: AudioType) => {
    if (uploading) return;
    setUploading(true);

    try {
      const file = files[0];
      
      if (!file || !file.type.startsWith('audio/')) {
        alert('音声ファイルを選択してください');
        return;
      }
      
      // 音声情報取得
      const audioInfo = await getAudioInfo(file);
      
      // 時間制限チェック
      const maxDuration = type === 'bgm' ? EDITOR_LIMITS.AUDIO.BGM_MAX_DURATION : EDITOR_LIMITS.AUDIO.SE_MAX_DURATION;
      if (audioInfo.duration > maxDuration) {
        alert(`音声が長すぎます。最大${maxDuration}秒までです。`);
        return;
      }

      // 🔧 修正箇所2: 容量制限チェック（210行目）
      // ✅ 修正: オプショナルチェーン追加
      if (type === 'se' && (project.assets.audio?.se?.length || 0) >= EDITOR_LIMITS.PROJECT.MAX_SE_COUNT) {
        alert(`効果音は最大${EDITOR_LIMITS.PROJECT.MAX_SE_COUNT}個まで追加できます`);
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

        // 🔧 修正箇所3: 統計更新（265-266行目、273-274行目）
        const imageSize = updatedAssets.objects.reduce((sum, obj) => sum + obj.totalSize, 0) + 
                         (updatedAssets.background?.totalSize || 0);
        // ✅ 修正: オプショナルチェーン追加
        const audioSize = (updatedAssets.audio?.bgm?.fileSize || 0) + 
                         (updatedAssets.audio?.se?.reduce((sum, se) => sum + se.fileSize, 0) || 0);

        updatedAssets.statistics = {
          totalImageSize: imageSize,
          totalAudioSize: audioSize,
          totalSize: imageSize + audioSize,
          usedSlots: {
            background: updatedAssets.background ? 1 : 0,
            objects: updatedAssets.objects.length,
            texts: updatedAssets.texts.length,
            // ✅ 修正: オプショナルチェーン追加
            bgm: updatedAssets.audio?.bgm ? 1 : 0,
            se: updatedAssets.audio?.se?.length || 0
          },
          limitations: {
            isNearImageLimit: false,
            isNearAudioLimit: audioSize > maxAudioSize * 0.8,
            isNearTotalLimit: (imageSize + audioSize) > EDITOR_LIMITS.PROJECT.TOTAL_MAX_SIZE * 0.8,
            hasViolations: false
          }
        };

        updatedAssets.lastModified = now;

        onProjectUpdate({
          ...project,
          assets: updatedAssets,
          totalSize: imageSize + audioSize,
          lastModified: now
        });
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('音声アップロードエラー:', error);
      alert('音声ファイルのアップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  }, [project, onProjectUpdate, uploading, maxAudioSize]);

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
    audioRef.current.volume = audio.volume * volume;
    audioRef.current.loop = audio.loop;
    
    audioRef.current.play().then(() => {
      setPlayingId(audio.id);
    }).catch(error => {
      console.error('音声再生エラー:', error);
      alert('音声の再生に失敗しました');
    });
  }, [playingId, volume]);

  // 音声停止
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingId(null);
    setCurrentTime(0);
  }, []);

  // 🔧 修正箇所4: 音声削除（358行目）
  const deleteAudio = useCallback((type: AudioType, id?: string) => {
    const updatedAssets = { ...project.assets };
    let removedSize = 0;
    const now = new Date().toISOString();

    // ✅ 修正: オプショナルチェーン追加
    if (type === 'bgm' && updatedAssets.audio?.bgm) {
      removedSize = updatedAssets.audio.bgm.fileSize;
      updatedAssets.audio.bgm = null;
    } else if (type === 'se' && id) {
      // ✅ 修正: オプショナルチェーン追加
      const index = updatedAssets.audio?.se?.findIndex(se => se.id === id) ?? -1;
      if (index >= 0 && updatedAssets.audio?.se) {
        removedSize = updatedAssets.audio.se[index].fileSize;
        updatedAssets.audio.se.splice(index, 1);
      }
    }

    // 再生中の音声を削除した場合は停止
    // ✅ 修正: オプショナルチェーン追加
    if ((type === 'bgm' && playingId === project.assets.audio?.bgm?.id) ||
        (type === 'se' && playingId === id)) {
      stopAudio();
    }

    // 🔧 修正箇所5: 統計更新（370-371行目、377-378行目）
    const imageSize = updatedAssets.objects.reduce((sum, obj) => sum + obj.totalSize, 0) + 
                     (updatedAssets.background?.totalSize || 0);
    // ✅ 修正: オプショナルチェーン追加
    const audioSize = (updatedAssets.audio?.bgm?.fileSize || 0) + 
                     (updatedAssets.audio?.se?.reduce((sum, se) => sum + se.fileSize, 0) || 0);

    updatedAssets.statistics = {
      totalImageSize: imageSize,
      totalAudioSize: audioSize,
      totalSize: imageSize + audioSize,
      usedSlots: {
        background: updatedAssets.background ? 1 : 0,
        objects: updatedAssets.objects.length,
        texts: updatedAssets.texts.length,
        // ✅ 修正: オプショナルチェーン追加
        bgm: updatedAssets.audio?.bgm ? 1 : 0,
        se: updatedAssets.audio?.se?.length || 0
      },
      limitations: {
        isNearImageLimit: false,
        isNearAudioLimit: false,
        isNearTotalLimit: false,
        hasViolations: false
      }
    };

    updatedAssets.lastModified = now;

    onProjectUpdate({
      ...project,
      assets: updatedAssets,
      totalSize: project.totalSize - removedSize,
      lastModified: now
    });
  }, [project, onProjectUpdate, playingId, stopAudio]);

  // 音声プロパティ更新
  const updateAudioProperty = useCallback((type: AudioType, id: string, property: string, value: any) => {
    const updatedAssets = { ...project.assets };
    const now = new Date().toISOString();
    
    // ✅ 修正: オプショナルチェーン追加
    if (type === 'bgm' && updatedAssets.audio?.bgm?.id === id) {
      updatedAssets.audio.bgm = {
        ...updatedAssets.audio.bgm,
        [property]: value
      };
    } else if (type === 'se' && updatedAssets.audio?.se) {
      const index = updatedAssets.audio.se.findIndex(se => se.id === id);
      if (index >= 0) {
        updatedAssets.audio.se[index] = {
          ...updatedAssets.audio.se[index],
          [property]: value
        };
      }
    }

    updatedAssets.lastModified = now;

    onProjectUpdate({
      ...project,
      assets: updatedAssets,
      lastModified: now
    });
  }, [project, onProjectUpdate]);

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

  return (
    <div className="audio-tab p-6">
      {/* 容量表示 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-xl">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">音声容量</span>
          <span className="text-sm text-gray-600">
            {formatFileSize(audioSize)} / {formatFileSize(maxAudioSize)}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-300 ${
              audioSizePercentage > 90 ? 'bg-red-500' : 
              audioSizePercentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(audioSizePercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* タブ切り替え */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-xl">
        {[
          { id: 'bgm' as AudioType, label: 'BGM', icon: '🎵' },
          { id: 'se' as AudioType, label: '効果音', icon: '🔊' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveAudioType(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeAudioType === tab.id
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* マスター音量 */}
      <div className="mb-6 p-4 bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">🔊 マスター音量</span>
          <span className="text-sm text-gray-600">{Math.round(volume * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>

      {/* 🔧 修正箇所6: BGM管理（494行目以降） */}
      {activeAudioType === 'bgm' && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            🎵 BGM
            <span className="ml-2 text-sm text-gray-500">(1曲まで)</span>
          </h3>

          {/* ✅ 修正: オプショナルチェーン追加 */}
          {project.assets.audio?.bgm ? (
            <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <h4 className="font-medium text-lg">{project.assets.audio.bgm.name}</h4>
                  <p className="text-sm text-gray-500">
                    {formatTime(project.assets.audio.bgm.duration)} • {formatFileSize(project.assets.audio.bgm.fileSize)}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => playAudio(project.assets.audio.bgm!)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      playingId === project.assets.audio.bgm.id
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    {playingId === project.assets.audio.bgm.id ? '⏹️ 停止' : '▶️ 再生'}
                  </button>
                  <button
                    onClick={() => setEditingId(
                      editingId === project.assets.audio.bgm!.id ? null : project.assets.audio.bgm!.id
                    )}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    ⚙️ 設定
                  </button>
                  <button
                    onClick={() => deleteAudio('bgm')}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                  >
                    🗑️ 削除
                  </button>
                </div>
              </div>

              {/* 波形表示（簡易版） */}
              <div className="mb-4 bg-gray-100 rounded-lg p-4">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={60}
                  className="w-full h-15 bg-gray-50 rounded"
                />
                {playingId === project.assets.audio.bgm.id && (
                  <div className="mt-2 text-sm text-gray-600">
                    再生時間: {formatTime(currentTime)} / {formatTime(project.assets.audio.bgm.duration)}
                  </div>
                )}
              </div>

              {/* 設定パネル */}
              {editingId === project.assets.audio.bgm.id && (
                <div className="border-t pt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      音量 ({Math.round(project.assets.audio.bgm.volume * 100)}%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={project.assets.audio.bgm.volume}
                      onChange={(e) => updateAudioProperty('bgm', project.assets.audio.bgm!.id, 'volume', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={project.assets.audio.bgm.loop}
                        onChange={(e) => updateAudioProperty('bgm', project.assets.audio.bgm!.id, 'loop', e.target.checked)}
                      />
                      <span className="text-sm">ループ再生</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <FileUploader
              accept="audio/*"
              maxSize={EDITOR_LIMITS.AUDIO.BGM_MAX_SIZE}
              onUpload={(files: FileList) => handleAudioUpload(files, 'bgm')}
              disabled={uploading}
              className="mb-4"
            >
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 hover:bg-purple-50 transition-colors">
                <div className="text-6xl mb-4">🎵</div>
                <p className="text-lg font-medium text-gray-700 mb-2">BGMをアップロード</p>
                <p className="text-sm text-gray-500 mb-4">
                  音声ファイルをドラッグ&ドロップするか、クリックして選択
                </p>
                <div className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium inline-block">
                  {uploading ? t('common.processing') : t('common.selectFile')}
                </div>
                <p className="text-xs text-gray-400 mt-4">
                  最大{EDITOR_LIMITS.AUDIO.BGM_MAX_DURATION}秒 • {formatFileSize(EDITOR_LIMITS.AUDIO.BGM_MAX_SIZE)}まで
                </p>
              </div>
            </FileUploader>
          )}
        </div>
      )}

      {/* 🔧 修正箇所7: 効果音管理（608行目以降） */}
      {activeAudioType === 'se' && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            🔊 効果音
            <span className="ml-2 text-sm text-gray-500">
              {/* ✅ 修正: オプショナルチェーン追加 */}
              ({project.assets.audio?.se?.length || 0}/{EDITOR_LIMITS.PROJECT.MAX_SE_COUNT})
            </span>
          </h3>

          {/* 既存効果音一覧 */}
          <div className="space-y-3 mb-6">
            {/* ✅ 修正: オプショナルチェーン追加 */}
            {project.assets.audio?.se?.map((se) => (
              <div key={se.id} className="bg-white rounded-xl border-2 border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{se.name}</h4>
                    <p className="text-sm text-gray-500">
                      {formatTime(se.duration)} • {formatFileSize(se.fileSize)}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => playAudio(se)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        playingId === se.id
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      {playingId === se.id ? '⏹️' : '▶️'}
                    </button>
                    <button
                      onClick={() => setEditingId(editingId === se.id ? null : se.id)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                    >
                      ⚙️
                    </button>
                    <button
                      onClick={() => deleteAudio('se', se.id)}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* SE設定パネル */}
                {editingId === se.id && (
                  <div className="border-t mt-4 pt-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        効果音名
                      </label>
                      <input
                        type="text"
                        value={se.name}
                        onChange={(e) => updateAudioProperty('se', se.id, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        音量 ({Math.round(se.volume * 100)}%)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={se.volume}
                        onChange={(e) => updateAudioProperty('se', se.id, 'volume', parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 🔧 修正箇所8: 新規効果音追加（684行目） */}
          {/* ✅ 修正: オプショナルチェーン追加 */}
          {(project.assets.audio?.se?.length || 0) < EDITOR_LIMITS.PROJECT.MAX_SE_COUNT && (
            <FileUploader
              accept="audio/*"
              maxSize={EDITOR_LIMITS.AUDIO.SE_MAX_SIZE}
              onUpload={(files: FileList) => handleAudioUpload(files, 'se')}
              disabled={uploading}
              className="mb-4"
            >
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-purple-400 hover:bg-purple-50 transition-colors">
                <div className="text-4xl mb-3">🔊</div>
                <p className="text-lg font-medium text-gray-700 mb-2">効果音を追加</p>
                <p className="text-sm text-gray-500 mb-3">
                  音声ファイルをドラッグ&ドロップ
                </p>
                <div className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium inline-block">
                  {uploading ? t('common.processing') : t('common.selectFile')}
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  最大{EDITOR_LIMITS.AUDIO.SE_MAX_DURATION}秒 • {formatFileSize(EDITOR_LIMITS.AUDIO.SE_MAX_SIZE)}まで
                </p>
              </div>
            </FileUploader>
          )}
        </div>
      )}

      {/* 隠し音声要素 */}
      <audio
        ref={audioRef}
        onLoadedData={() => {
          // 波形描画などの処理をここに追加可能
        }}
        preload="none"
      />

      {/* アップロード中表示 */}
      {uploading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center">
            <div className="animate-spin text-4xl mb-4">🎵</div>
            <p className="text-lg font-semibold">{t('editor.assets.processingAudio')}</p>
            <p className="text-sm text-gray-600 mt-2">{t('common.loading')}</p>
          </div>
        </div>
      )}

      {/* 音声コントロール説明 */}
      <div className="mt-8 p-4 bg-blue-50 rounded-xl">
        <h4 className="font-medium text-blue-800 mb-2">💡 音声のヒント</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• BGMは自動ループ、効果音は1回再生されます</li>
          <li>• BGMは最大{EDITOR_LIMITS.AUDIO.BGM_MAX_DURATION}秒、効果音は最大{EDITOR_LIMITS.AUDIO.SE_MAX_DURATION}秒まで</li>
          <li>• 対応形式: MP3, WAV, OGG</li>
          <li>• 音量は0%〜100%で調整できます</li>
        </ul>
      </div>
    </div>
  );
};