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

// 画像ファイルをリサイズ・最適化
const optimizeImage = async (file: File, maxWidth: number, maxHeight: number, quality: number = 0.8): Promise<Blob> => {
  return new Promise((resolve) => {
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
      canvas.toBlob(resolve, 'image/webp', quality);
    };
    
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
        const updatedAssets = { ...project.assets };

        if (activeAssetType === 'background') {
          updatedAssets.background = {
            id: crypto.randomUUID(),
            name: 'Background',
            frames: [frame],
            animationSettings: { speed: 10, loop: true, pingPong: false },
            totalSize: frame.fileSize,
            createdAt: new Date().toISOString()
          };
        } else if (activeAssetType === 'objects') {
          const newObject: ObjectAsset = {
            id: crypto.randomUUID(),
            name: `オブジェクト${updatedAssets.objects.length + 1}`,
            frames: [frame],
            animationSettings: { speed: 10, loop: true, pingPong: false },
            totalSize: frame.fileSize,
            createdAt: new Date().toISOString()
          };
          updatedAssets.objects.push(newObject);
        }

        // 統計更新
        updatedAssets.statistics = {
          totalImageSize: getTotalSize() + frame.fileSize,
          totalAudioSize: updatedAssets.statistics.totalAudioSize,
          usedSlots: {
            objects: updatedAssets.objects.length,
            texts: updatedAssets.texts.length,
            sounds: updatedAssets.statistics.usedSlots.sounds
          }
        };

        onProjectUpdate({
          ...project,
          assets: updatedAssets,
          totalSize: project.totalSize + frame.fileSize,
          lastModified: new Date().toISOString()
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

  // テキストアセット追加
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

    const newText: TextAsset = {
      id: crypto.randomUUID(),
      content: textContent.trim(),
      style: {
        fontSize,
        color: textColor,
        fontWeight,
        fontFamily: 'Inter, sans-serif'
      },
      createdAt: new Date().toISOString()
    };

    const updatedAssets = { ...project.assets };
    updatedAssets.texts.push(newText);
    updatedAssets.statistics = {
      ...updatedAssets.statistics,
      usedSlots: {
        ...updatedAssets.statistics.usedSlots,
        texts: updatedAssets.texts.length
      }
    };

    onProjectUpdate({
      ...project,
      assets: updatedAssets,
      lastModified: new Date().toISOString()
    });

    // フォームリセット
    setTextContent('');
    setEditMode('none');
  }, [textContent, textColor, fontSize, fontWeight, project, onProjectUpdate]);

  // アセット削除
  const deleteAsset = useCallback((type: AssetType, id?: string) => {
    const updatedAssets = { ...project.assets };
    let removedSize = 0;

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

    // 統計更新
    updatedAssets.statistics = {
      totalImageSize: updatedAssets.statistics.totalImageSize - removedSize,
      totalAudioSize: updatedAssets.statistics.totalAudioSize,
      usedSlots: {
        objects: updatedAssets.objects.length,
        texts: updatedAssets.texts.length,
        sounds: updatedAssets.statistics.usedSlots.sounds
      }
    };

    onProjectUpdate({
      ...project,
      assets: updatedAssets,
      totalSize: project.totalSize - removedSize,
      lastModified: new Date().toISOString()
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
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 背景管理 */}
      {activeAssetType === 'background' && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            🖼️ 背景画像
            <span className="ml-2 text-sm text-gray-500">(1枚まで)</span>
          </h3>
          
          {project.assets.background ? (
            <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
              <div className="aspect-[9/16] bg-gray-100 rounded-lg overflow-hidden mb-4">
                <img 
                  src={project.assets.background.frames[0].dataUrl}
                  alt="Background"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{project.assets.background.name}</p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(project.assets.background.totalSize)}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setEditMode('animation')}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200"
                  >
                    アニメ編集
                  </button>
                  <button
                    onClick={() => deleteAsset('background')}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                dragOver ? 'border-purple-400 bg-purple-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-4xl mb-4">🖼️</div>
              <h3 className="text-lg font-medium mb-2">背景画像をアップロード</h3>
              <p className="text-gray-500 mb-4">
                ドラッグ&ドロップ または クリックしてファイルを選択
              </p>
              <p className="text-xs text-gray-400">
                推奨: 1080×1920px, 最大{formatFileSize(EDITOR_LIMITS.IMAGE.BACKGROUND_FRAME_MAX_SIZE)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* オブジェクト管理 */}
      {activeAssetType === 'objects' && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            🎨 オブジェクト
            <span className="ml-2 text-sm text-gray-500">
              ({project.assets.objects.length}/{EDITOR_LIMITS.PROJECT.MAX_OBJECTS})
            </span>
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {project.assets.objects.map((obj) => (
              <div key={obj.id} className="bg-white rounded-xl border-2 border-gray-200 p-3">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-2">
                  <img 
                    src={obj.frames[0].dataUrl}
                    alt={obj.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="font-medium text-sm truncate">{obj.name}</p>
                <p className="text-xs text-gray-500 mb-2">
                  {formatFileSize(obj.totalSize)}
                </p>
                <div className="flex space-x-1">
                  <button
                    onClick={() => {
                      setSelectedAssetId(obj.id);
                      setEditMode('animation');
                    }}
                    className="flex-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => deleteAsset('objects', obj.id)}
                    className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
            
            {/* 新規追加ボタン */}
            {project.assets.objects.length < EDITOR_LIMITS.PROJECT.MAX_OBJECTS && (
              <div
                className={`aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors ${
                  dragOver ? 'border-purple-400 bg-purple-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-2xl mb-2">➕</div>
                <p className="text-sm text-gray-600 text-center">
                  オブジェクト<br />追加
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* テキスト管理 */}
      {activeAssetType === 'texts' && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            📝 テキスト
            <span className="ml-2 text-sm text-gray-500">
              ({project.assets.texts.length}/{EDITOR_LIMITS.TEXT.MAX_COUNT})
            </span>
          </h3>
          
          {/* 既存テキスト一覧 */}
          <div className="space-y-3 mb-6">
            {project.assets.texts.map((text) => (
              <div key={text.id} className="bg-white rounded-xl border-2 border-gray-200 p-4">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <p className="font-medium" style={{ color: text.style.color }}>
                      {text.content}
                    </p>
                    <p className="text-sm text-gray-500">
                      サイズ: {text.style.fontSize}px, 太さ: {text.style.fontWeight}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteAsset('texts', text.id)}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {/* 新規テキスト追加 */}
          {project.assets.texts.length < EDITOR_LIMITS.TEXT.MAX_COUNT && (
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-medium mb-4">新しいテキストを追加</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    テキスト内容 ({textContent.length}/{EDITOR_LIMITS.TEXT.MAX_LENGTH})
                  </label>
                  <input
                    type="text"
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    maxLength={EDITOR_LIMITS.TEXT.MAX_LENGTH}
                    placeholder="テキストを入力..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      文字色
                    </label>
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      文字サイズ
                    </label>
                    <input
                      type="range"
                      min={EDITOR_LIMITS.TEXT.MIN_FONT_SIZE}
                      max={EDITOR_LIMITS.TEXT.MAX_FONT_SIZE}
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 text-center">{fontSize}px</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    文字の太さ
                  </label>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setFontWeight('normal')}
                      className={`flex-1 py-2 rounded-lg text-sm ${
                        fontWeight === 'normal' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      標準
                    </button>
                    <button
                      onClick={() => setFontWeight('bold')}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold ${
                        fontWeight === 'bold' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      太字
                    </button>
                  </div>
                </div>
                
                {/* プレビュー */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">プレビュー:</p>
                  <div
                    style={{
                      fontSize: `${fontSize}px`,
                      color: textColor,
                      fontWeight,
                      fontFamily: 'Inter, sans-serif'
                    }}
                  >
                    {textContent || 'テキストプレビュー'}
                  </div>
                </div>
                
                <button
                  onClick={addTextAsset}
                  disabled={!textContent.trim() || uploading}
                  className="w-full py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  テキストを追加
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* アップロード用input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
        className="hidden"
      />

      {/* ローディング表示 */}
      {uploading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center">
            <div className="animate-spin text-4xl mb-4">🔄</div>
            <p className="text-lg font-semibold">画像を最適化中...</p>
            <p className="text-sm text-gray-600 mt-2">少々お待ちください</p>
          </div>
        </div>
      )}
    </div>
  );
};