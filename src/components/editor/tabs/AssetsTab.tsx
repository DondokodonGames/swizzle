import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GameProject } from '../../../types/editor/GameProject';
import { ProjectAssets, BackgroundAsset, ObjectAsset, TextAsset, AssetFrame } from '../../../types/editor/ProjectAssets';
import { EDITOR_LIMITS } from '../../../constants/EditorLimits';

interface AssetsTabProps {
  project: GameProject;
  onProjectUpdate: (project: GameProject) => void;
}

type AssetType = 'background' | 'objects' | 'texts';
type EditMode = 'none' | 'background' | 'object' | 'text' | 'animation';

// ファイルサイズを人間が読みやすい形式に変換
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 画像ファイルをリサイズ・最適化（修正版）
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
      
      // Blobとして出力（修正版）
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
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // テキストエディット用状態
  const [textContent, setTextContent] = useState('');
  const [textColor, setTextColor] = useState('#000000');
  const [fontSize, setFontSize] = useState(24);
  const [fontWeight, setFontWeight] = useState<'normal' | 'bold'>('normal');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 容量計算
  const getTotalSize = useCallback(() => {
    let total = 0;
    if (project.assets.background) total += project.assets.background.totalSize;
    project.assets.objects.forEach(obj => total += obj.totalSize);
    return total;
  }, [project.assets]);

  const totalSize = getTotalSize();
  const sizePercentage = (totalSize / EDITOR_LIMITS.PROJECT.TOTAL_MAX_SIZE) * 100;

  // ファイルアップロード処理
  const handleFileUpload = useCallback(async (files: FileList) => {
    if (uploading) return;
    setUploading(true);

    try {
      const file = files[0];
      if (!file || !file.type.startsWith('image/')) {
        alert('画像ファイルを選択してください');
        return;
      }

      // サイズチェック
      const maxSize = activeAssetType === 'background' 
        ? EDITOR_LIMITS.IMAGE.BACKGROUND_FRAME_MAX_SIZE
        : EDITOR_LIMITS.IMAGE.OBJECT_FRAME_MAX_SIZE;

      if (file.size > maxSize) {
        alert(`ファイルサイズが大きすぎます。最大${formatFileSize(maxSize)}まで対応しています。`);
        return;
      }

      // 画像最適化
      const optimized = await optimizeImage(
        file, 
        activeAssetType === 'background' ? 1080 : 512, 
        activeAssetType === 'background' ? 1920 : 512,
        0.8
      );

      // Base64に変換
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        
        // アセットフレーム作成
        const frame: AssetFrame = {
          id: crypto.randomUUID(),
          dataUrl,
          originalName: file.name,
          width: activeAssetType === 'background' ? 1080 : 512,
          height: activeAssetType === 'background' ? 1920 : 512,
          fileSize: optimized?.size || file.size,
          uploadedAt: new Date().toISOString()
        };

        // プロジェクト更新
        const now = new Date().toISOString();
        const updatedAssets = { ...project.assets };

        if (activeAssetType === 'background') {
          updatedAssets.background = {
            id: crypto.randomUUID(),
            name: 'Background',
            frames: [frame],
            animationSettings: { speed: 10, loop: true, pingPong: false, autoStart: true }, // autoStart追加
            totalSize: frame.fileSize,
            createdAt: now,
            lastModified: now
          };
        } else if (activeAssetType === 'objects') {
          const newObject: ObjectAsset = {
            id: crypto.randomUUID(),
            name: `オブジェクト${updatedAssets.objects.length + 1}`,
            frames: [frame],
            animationSettings: { speed: 10, loop: true, pingPong: false, autoStart: true }, // autoStart追加
            totalSize: frame.fileSize,
            createdAt: now,
            lastModified: now,
            defaultScale: 1.0,
            defaultOpacity: 1.0
          };
          updatedAssets.objects.push(newObject);
        }

        // 統計更新（修正版 - sounds → bgm + se分離）
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
            texts: updatedAssets.texts.length,
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

        onProjectUpdate({
          ...project,
          assets: updatedAssets,
          totalSize: imageSize + audioSize,
          lastModified: now
        });
      };

      reader.readAsDataURL(optimized || file);
    } catch (error) {
      console.error('ファイルアップロードエラー:', error);
      alert('ファイルのアップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  }, [activeAssetType, project, onProjectUpdate, uploading, getTotalSize]);

  // テキストアセット追加（修正版）
  const addTextAsset = useCallback(() => {
    if (project.assets.texts.length >= EDITOR_LIMITS.TEXT.MAX_COUNT) {
      alert(`テキストは最大${EDITOR_LIMITS.TEXT.MAX_COUNT}個まで追加できます`);
      return;
    }

    if (!textContent.trim()) {
      alert('テキストを入力してください');
      return;
    }

    if (textContent.length > EDITOR_LIMITS.TEXT.MAX_LENGTH) {
      alert(`テキストは${EDITOR_LIMITS.TEXT.MAX_LENGTH}文字以内で入力してください`);
      return;
    }

    const now = new Date().toISOString();

    const newText: TextAsset = {
      id: crypto.randomUUID(),
      content: textContent.trim(),
      style: {
        fontSize,
        color: textColor,
        fontWeight,
        fontFamily: 'Inter, sans-serif'
      },
      createdAt: now,
      lastModified: now  // lastModified追加
    };

    const updatedAssets = { ...project.assets };
    updatedAssets.texts.push(newText);
    updatedAssets.lastModified = now;

    // 統計更新（修正版 - sounds → bgm + se分離）
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
        texts: updatedAssets.texts.length,
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

    onProjectUpdate({
      ...project,
      assets: updatedAssets,
      lastModified: now
    });

    // フォームリセット
    setTextContent('');
    setEditMode('none');
  }, [textContent, textColor, fontSize, fontWeight, project, onProjectUpdate]);

  // アセット削除
  const deleteAsset = useCallback((type: AssetType, id?: string) => {
    const updatedAssets = { ...project.assets };
    let removedSize = 0;
    const now = new Date().toISOString();

    if (type === 'background') {
      if (updatedAssets.background) {
        removedSize = updatedAssets.background.totalSize;
        updatedAssets.background = null;
      }
    } else if (type === 'objects' && id) {
      const index = updatedAssets.objects.findIndex(obj => obj.id === id);
      if (index >= 0) {
        removedSize = updatedAssets.objects[index].totalSize;
        updatedAssets.objects.splice(index, 1);
      }
    } else if (type === 'texts' && id) {
      const index = updatedAssets.texts.findIndex(text => text.id === id);
      if (index >= 0) {
        updatedAssets.texts.splice(index, 1);
      }
    }

    // 統計更新（修正版）
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
        texts: updatedAssets.texts.length,
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

    onProjectUpdate({
      ...project,
      assets: updatedAssets,
      totalSize: project.totalSize - removedSize,
      lastModified: now
    });
  }, [project, onProjectUpdate]);

  // ドラッグ&ドロップ処理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  return (
    <div className="assets-tab p-6">
      {/* 容量表示 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-xl">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">使用容量</span>
          <span className="text-sm text-gray-600">
            {formatFileSize(totalSize)} / {formatFileSize(EDITOR_LIMITS.PROJECT.TOTAL_MAX_SIZE)}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-300 ${
              sizePercentage > 90 ? 'bg-red-500' : 
              sizePercentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(sizePercentage, 100)}%` }}
          />
        </div>
        {sizePercentage > 80 && (
          <p className="text-xs text-orange-600 mt-1">
            容量が不足しています。不要なアセットを削除してください。
          </p>
        )}
      </div>

      {/* タブ切り替え */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-xl">
        {[
          { id: 'background' as AssetType, label: '背景', icon: '🖼️' },
          { id: 'objects' as AssetType, label: 'オブジェクト', icon: '🎨' },
          { id: 'texts' as AssetType, label: 'テキスト', icon: '📝' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveAssetType(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeAssetType === tab.id
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'