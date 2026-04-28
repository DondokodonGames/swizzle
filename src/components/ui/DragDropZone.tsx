/**
 * モダンドラッグ&ドロップゾーンコンポーネント
 * Phase 1-B: 基本UI・ファイル管理改善用
 */

import React, { useState, useCallback, useRef, DragEvent, ChangeEvent } from 'react';
import { DESIGN_TOKENS } from '../../constants/DesignSystem';
import { ModernButton } from './ModernButton';

// 📁 ファイル処理結果
export interface FileProcessingResult {
  file: File;
  id: string;
  type: 'image' | 'audio' | 'other';
  preview?: string;  // 画像の場合のプレビューURL
  size: number;
  accepted: boolean;
  error?: string;
}

// 🎯 ドラッグ&ドロップゾーンProps
export interface DragDropZoneProps {
  // ファイル制限
  accept?: string[];          // 許可ファイル形式 ['image/*', 'audio/*']
  maxFiles?: number;          // 最大ファイル数
  maxSize?: number;           // 最大ファイルサイズ（bytes）
  
  // UI設定
  variant?: 'default' | 'compact' | 'large';
  disabled?: boolean;
  loading?: boolean;
  
  // コンテンツ
  title?: string;
  description?: string;
  buttonText?: string;
  
  // イベントハンドラー
  onFilesDrop: (results: FileProcessingResult[]) => void;
  onFileSelect?: (results: FileProcessingResult[]) => void;
  onError?: (error: string) => void;
  
  // カスタマイズ
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

// 🎨 バリアント別スタイル
const getVariantStyles = (variant: 'default' | 'compact' | 'large') => {
  const styles = {
    default: {
      minHeight: '200px',
      padding: DESIGN_TOKENS.spacing[8]
    },
    compact: {
      minHeight: '120px',
      padding: DESIGN_TOKENS.spacing[4]
    },
    large: {
      minHeight: '300px',
      padding: DESIGN_TOKENS.spacing[12]
    }
  };

  return styles[variant] || styles.default;
};

// 🔍 ファイル種別判定
const getFileType = (file: File): 'image' | 'audio' | 'other' => {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'other';
};

// 📏 ファイルサイズフォーマッター
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// 🖼️ 画像プレビュー生成
const generateImagePreview = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// 🎮 DragDropZone コンポーネント
export const DragDropZone: React.FC<DragDropZoneProps> = ({
  accept = ['image/*', 'audio/*'],
  maxFiles = 10,
  maxSize = 50 * 1024 * 1024, // 50MB
  variant = 'default',
  disabled = false,
  loading = false,
  title = 'ファイルをドラッグ&ドロップ',
  description = 'または、クリックしてファイルを選択',
  buttonText = 'ファイルを選択',
  onFilesDrop,
  onFileSelect,
  onError,
  children,
  className = '',
  style = {}
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [_isDragActive, setIsDragActive] = useState(false);
  const [processingFiles, setProcessingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 📁 ファイル処理関数
  const processFiles = useCallback(async (files: FileList | File[]): Promise<FileProcessingResult[]> => {
    setProcessingFiles(true);
    
    const fileArray = Array.from(files);
    const results: FileProcessingResult[] = [];

    // ファイル数チェック
    if (fileArray.length > maxFiles) {
      onError?.(`最大${maxFiles}個までのファイルを選択してください`);
      setProcessingFiles(false);
      return [];
    }

    for (const file of fileArray) {
      const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fileType = getFileType(file);
      
      let accepted = true;
      let error: string | undefined;
      let preview: string | undefined;

      // ファイル形式チェック
      const isAcceptedType = accept.some(acceptType => {
        if (acceptType.endsWith('/*')) {
          const baseType = acceptType.slice(0, -2);
          return file.type.startsWith(baseType);
        }
        return file.type === acceptType;
      });

      if (!isAcceptedType) {
        accepted = false;
        error = `対応していないファイル形式です (${file.type})`;
      }

      // ファイルサイズチェック
      if (file.size > maxSize) {
        accepted = false;
        error = `ファイルサイズが上限(${formatFileSize(maxSize)})を超えています`;
      }

      // 画像プレビュー生成
      if (accepted && fileType === 'image') {
        try {
          preview = await generateImagePreview(file);
        } catch (err) {
          console.warn('プレビュー生成に失敗:', err);
        }
      }

      results.push({
        file,
        id,
        type: fileType,
        preview,
        size: file.size,
        accepted,
        error
      });
    }

    setProcessingFiles(false);
    return results;
  }, [accept, maxFiles, maxSize, onError]);

  // 🎯 ドラッグイベントハンドラー
  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!disabled && !loading) {
      setIsDragOver(true);
      setIsDragActive(true);
    }
  }, [disabled, loading]);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // ドラッグが要素の外に出た場合のみ状態をリセット
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
      setIsDragActive(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragOver(false);
    setIsDragActive(false);

    if (disabled || loading) return;

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    try {
      const results = await processFiles(files);
      onFilesDrop(results);
    } catch (error) {
      onError?.('ファイルの処理中にエラーが発生しました');
      console.error('File processing error:', error);
    }
  }, [disabled, loading, processFiles, onFilesDrop, onError]);

  // 📁 ファイル選択ハンドラー
  const handleFileSelect = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const results = await processFiles(files);
      onFileSelect?.(results) || onFilesDrop(results);
    } catch (error) {
      onError?.('ファイルの処理中にエラーが発生しました');
      console.error('File processing error:', error);
    }

    // input要素をリセット（同じファイルを再選択可能にする）
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles, onFileSelect, onFilesDrop, onError]);

  // 🎨 スタイル計算
  const variantStyles = getVariantStyles(variant);
  
  const zoneStyle: React.CSSProperties = {
    ...variantStyles,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    border: `2px dashed ${
      isDragOver 
        ? DESIGN_TOKENS.colors.primary[400]
        : disabled 
          ? DESIGN_TOKENS.colors.neutral[300]
          : DESIGN_TOKENS.colors.neutral[400]
    }`,
    borderRadius: DESIGN_TOKENS.borderRadius.lg,
    backgroundColor: isDragOver 
      ? `${DESIGN_TOKENS.colors.primary[50]}`
      : disabled 
        ? DESIGN_TOKENS.colors.neutral[50]
        : DESIGN_TOKENS.colors.neutral[0],
    transition: `all ${DESIGN_TOKENS.animation.duration.normal} ${DESIGN_TOKENS.animation.easing.inOut}`,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    ...style
  };

  // ホバー効果
  if (!disabled && !loading && !isDragOver) {
    Object.assign(zoneStyle, {
      '&:hover': {
        borderColor: DESIGN_TOKENS.colors.primary[300],
        backgroundColor: DESIGN_TOKENS.colors.primary[25]
      }
    });
  }

  return (
    <div
      className={`drag-drop-zone ${className}`}
      style={zoneStyle}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => !disabled && !loading && fileInputRef.current?.click()}
      role="button"
      aria-label="ファイルをアップロード"
      tabIndex={disabled ? -1 : 0}
    >
      {/* 隠しファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={maxFiles > 1}
        accept={accept.join(',')}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={disabled || loading}
      />

      {/* アップロード中オーバーレイ */}
      {(loading || processingFiles) && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'inherit',
            zIndex: DESIGN_TOKENS.zIndex[10]
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              border: '3px solid transparent',
              borderTop: `3px solid ${DESIGN_TOKENS.colors.primary[500]}`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: DESIGN_TOKENS.spacing[2]
            }}
          />
          <p style={{ 
            fontSize: DESIGN_TOKENS.typography.fontSize.sm,
            color: DESIGN_TOKENS.colors.neutral[600],
            margin: 0
          }}>
            {processingFiles ? 'ファイルを処理中...' : 'アップロード中...'}
          </p>
        </div>
      )}

      {/* カスタムコンテンツまたはデフォルトコンテンツ */}
      {children || (
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* アイコン */}
          <div
            style={{
              fontSize: DESIGN_TOKENS.typography.fontSize['5xl'],
              marginBottom: DESIGN_TOKENS.spacing[4],
              color: isDragOver 
                ? DESIGN_TOKENS.colors.primary[500]
                : DESIGN_TOKENS.colors.neutral[400]
            }}
          >
            {isDragOver ? '📎' : '📁'}
          </div>

          {/* タイトル */}
          <h3
            style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.lg,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
              color: DESIGN_TOKENS.colors.neutral[800],
              margin: `0 0 ${DESIGN_TOKENS.spacing[2]} 0`
            }}
          >
            {title}
          </h3>

          {/* 説明 */}
          <p
            style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              color: DESIGN_TOKENS.colors.neutral[600],
              margin: `0 0 ${DESIGN_TOKENS.spacing[4]} 0`,
              lineHeight: DESIGN_TOKENS.typography.lineHeight.normal
            }}
          >
            {description}
          </p>

          {/* 選択ボタン */}
          <ModernButton
            variant="outline"
            size="md"
            disabled={disabled || loading}
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            {buttonText}
          </ModernButton>

          {/* ファイル制限情報 */}
          <div
            style={{
              marginTop: DESIGN_TOKENS.spacing[4],
              fontSize: DESIGN_TOKENS.typography.fontSize.xs,
              color: DESIGN_TOKENS.colors.neutral[500]
            }}
          >
            <p style={{ margin: 0 }}>
              最大{maxFiles}個 • {formatFileSize(maxSize)}まで
            </p>
            <p style={{ margin: 0 }}>
              対応形式: {accept.join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* ドラッグオーバー時のエフェクト */}
      {isDragOver && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            border: `3px solid ${DESIGN_TOKENS.colors.primary[500]}`,
            borderRadius: 'inherit',
            pointerEvents: 'none',
            animation: 'pulse 1s ease-in-out infinite'
          }}
        />
      )}
    </div>
  );
};

// アニメーション用CSS（グローバルに追加が必要）
const animationKeyframes = `
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;

// スタイルを動的に追加
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = animationKeyframes;
  if (!document.head.querySelector('style[data-drag-drop-zone]')) {
    styleElement.setAttribute('data-drag-drop-zone', 'true');
    document.head.appendChild(styleElement);
  }
}

// 🎨 デフォルトエクスポート
export default DragDropZone;