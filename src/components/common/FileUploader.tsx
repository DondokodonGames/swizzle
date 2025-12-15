import React, { useCallback, useRef, useState } from 'react';
import { EDITOR_LIMITS } from '../../constants/EditorLimits';


interface FileUploaderProps {
  accept: string;
  maxSize: number;
  maxFiles?: number;
  onUpload: (files: FileList) => void;
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
  dragText?: string;
  uploadText?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  accept,
  maxSize,
  maxFiles = 1,
  onUpload,
  disabled = false,
  children,
  className = '',
  dragText = 'ドラッグ&ドロップでファイルを追加',
  uploadText = 'ファイルを選択'
}) => {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ファイルサイズを人間が読みやすい形式に変換
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 許可された拡張子のホワイトリスト
  const ALLOWED_EXTENSIONS: Record<string, string[]> = {
    'image/*': ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'],
    'audio/*': ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac'],
  };

  // ファイル拡張子を取得
  const getFileExtension = (filename: string): string => {
    const parts = filename.toLowerCase().split('.');
    return parts.length > 1 ? parts.pop() || '' : '';
  };

  // ファイル名の安全性チェック
  const isValidFileName = (filename: string): boolean => {
    // 空のファイル名を拒否
    if (!filename || filename.trim().length === 0) return false;
    // パストラバーサル攻撃の防止
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) return false;
    // 隠しファイルを拒否
    if (filename.startsWith('.')) return false;
    // 制御文字を含むファイル名を拒否
    if (/[\x00-\x1f\x7f]/.test(filename)) return false;
    return true;
  };

  // ファイル検証
  const validateFiles = useCallback((files: FileList): boolean => {
    if (files.length === 0) return false;

    if (files.length > maxFiles) {
      alert(`最大${maxFiles}ファイルまで選択できます`);
      return false;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // ファイル名の安全性チェック
      if (!isValidFileName(file.name)) {
        alert(`無効なファイル名です: ${file.name}`);
        return false;
      }

      // ファイルタイプチェック（MIMEタイプ）
      if (!file.type.match(accept.replace('*', '.*'))) {
        alert(`対応していないファイル形式です: ${file.name}`);
        return false;
      }

      // 拡張子ベースのバリデーション（追加のセキュリティ層）
      const extension = getFileExtension(file.name);
      const allowedExtensions = ALLOWED_EXTENSIONS[accept] || [];

      if (allowedExtensions.length > 0 && !allowedExtensions.includes(extension)) {
        alert(`対応していないファイル拡張子です: .${extension}\n許可された拡張子: ${allowedExtensions.join(', ')}`);
        return false;
      }

      // MIMEタイプと拡張子の一貫性チェック
      const mimeTypeCategory = file.type.split('/')[0];
      const acceptCategory = accept.split('/')[0];
      if (mimeTypeCategory !== acceptCategory) {
        alert(`ファイル形式が一致しません: ${file.name}`);
        return false;
      }

      // ファイルサイズチェック
      if (file.size > maxSize) {
        alert(`ファイルサイズが大きすぎます: ${file.name}\n最大${formatFileSize(maxSize)}まで対応しています`);
        return false;
      }
    }

    return true;
  }, [accept, maxSize, maxFiles]);

  // ファイル処理
  const handleFiles = useCallback((files: FileList) => {
    if (disabled || !validateFiles(files)) return;
    onUpload(files);
  }, [disabled, validateFiles, onUpload]);

  // ドラッグ&ドロップイベント
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
      handleFiles(files);
    }
  };

  // クリックイベント
  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFiles(files);
    }
    // inputをリセット（同じファイルを再選択可能にするため）
    e.target.value = '';
  };

  return (
    <div
      className={`relative cursor-pointer transition-all duration-200 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      {children || (
        <div className={`
          border-2 border-dashed rounded-xl p-8 text-center transition-colors
          ${dragOver && !disabled ? 'border-purple-400 bg-purple-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'bg-gray-100' : ''}
        `}>
          <div className="text-4xl mb-4">
            {accept.includes('image') ? '🖼️' : accept.includes('audio') ? '🎵' : '📁'}
          </div>
          <h3 className="text-lg font-medium mb-2">{uploadText}</h3>
          <p className="text-gray-500 mb-2">{dragText}</p>
          <p className="text-xs text-gray-400">
            最大{formatFileSize(maxSize)}, {maxFiles}ファイルまで
          </p>
        </div>
      )}
      
      {/* ドラッグオーバー時のオーバーレイ */}
      {dragOver && !disabled && (
        <div className="absolute inset-0 bg-purple-500 bg-opacity-10 border-2 border-purple-400 border-dashed rounded-xl flex items-center justify-center">
          <div className="text-center text-purple-600">
            <div className="text-2xl mb-2">⬇️</div>
            <p className="font-medium">ここにドロップ</p>
          </div>
        </div>
      )}

      {/* 隠しファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={maxFiles > 1}
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
      />
    </div>
  );
};

// アセット種類別のプリセット設定
export const AssetUploaderPresets = {
  IMAGE: {
    accept: 'image/*',
    maxSize: EDITOR_LIMITS.IMAGE.OBJECT_FRAME_MAX_SIZE,
    dragText: '画像をドラッグ&ドロップ',
    uploadText: '画像を選択'
  },
  
  BACKGROUND: {
    accept: 'image/*',
    maxSize: EDITOR_LIMITS.IMAGE.BACKGROUND_FRAME_MAX_SIZE,
    dragText: '背景画像をドラッグ&ドロップ',
    uploadText: '背景画像を選択'
  },
  
  AUDIO: {
    accept: 'audio/*',
    maxSize: EDITOR_LIMITS.AUDIO.SE_MAX_SIZE,
    dragText: '音声ファイルをドラッグ&ドロップ',
    uploadText: '音声を選択'
  },
  
  BGM: {
    accept: 'audio/*',
    maxSize: EDITOR_LIMITS.AUDIO.BGM_MAX_SIZE,
    dragText: 'BGMをドラッグ&ドロップ',
    uploadText: 'BGMを選択'
  }
};