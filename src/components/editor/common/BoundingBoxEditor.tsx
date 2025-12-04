// src/components/editor/common/BoundingBoxEditor.tsx
// Phase 3-2-1最終版: 背景画像表示切り替え（常に表示）、座標表示完全削除

import React, { useRef, useState, useCallback } from 'react';
import { DESIGN_TOKENS } from '../../../constants/DesignSystem';

// GamePreview.tsxと同じ座標系定義
const GAME_WIDTH = 1080;
const GAME_HEIGHT = 1920;
const PREVIEW_WIDTH = 720;
const PREVIEW_HEIGHT = 1280;
const PREVIEW_SCALE = PREVIEW_WIDTH / GAME_WIDTH; // 0.667

// 矩形範囲（正規化座標 0.0～1.0）
export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface BoundingBoxEditorProps {
  value: BoundingBox;
  onChange: (boundingBox: BoundingBox) => void;
  previewBackgroundUrl?: string;  // 背景画像URL（オプション）
}

export const BoundingBoxEditor: React.FC<BoundingBoxEditorProps> = ({
  value,
  onChange,
  previewBackgroundUrl
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);
  const [showBackground, setShowBackground] = useState(true); // 背景表示状態

  // 座標変換: クリック座標 → 正規化座標（0.0～1.0）
  const getRelativeCoordinates = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    if (!containerRef.current) return null;

    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    return { x, y };
  }, []);

  // マウスダウン: ドラッグ開始
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const coords = getRelativeCoordinates(e.clientX, e.clientY);
    if (coords) {
      setIsDragging(true);
      setStartPoint(coords);
      setCurrentPoint(coords);
    }
  }, [getRelativeCoordinates]);

  // マウス移動: ドラッグ中
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !startPoint) return;
    
    const coords = getRelativeCoordinates(e.clientX, e.clientY);
    if (coords) {
      setCurrentPoint(coords);
    }
  }, [isDragging, startPoint, getRelativeCoordinates]);

  // マウスアップ: ドラッグ終了
  const handleMouseUp = useCallback(() => {
    if (!isDragging || !startPoint || !currentPoint) {
      setIsDragging(false);
      return;
    }

    // 矩形範囲を計算
    const minX = Math.min(startPoint.x, currentPoint.x);
    const maxX = Math.max(startPoint.x, currentPoint.x);
    const minY = Math.min(startPoint.y, currentPoint.y);
    const maxY = Math.max(startPoint.y, currentPoint.y);

    // 最小サイズチェック（5%以上）
    if (maxX - minX >= 0.05 && maxY - minY >= 0.05) {
      onChange({ minX, minY, maxX, maxY });
    }

    setIsDragging(false);
    setStartPoint(null);
    setCurrentPoint(null);
  }, [isDragging, startPoint, currentPoint, onChange]);

  // マウスリーブ: ドラッグ中に画面外に出た場合
  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      handleMouseUp();
    }
  }, [isDragging, handleMouseUp]);

  // 表示用の矩形範囲（ドラッグ中は仮の範囲、確定後は保存された値）
  const displayRect = isDragging && startPoint && currentPoint
    ? {
        minX: Math.min(startPoint.x, currentPoint.x),
        minY: Math.min(startPoint.y, currentPoint.y),
        maxX: Math.max(startPoint.x, currentPoint.x),
        maxY: Math.max(startPoint.y, currentPoint.y)
      }
    : value;

  return (
    <div style={{ marginBottom: DESIGN_TOKENS.spacing[4] }}>
      {/* タイトル + 背景表示切り替えボタン */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: DESIGN_TOKENS.spacing[2]
      }}>
        <label style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.sm,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
          color: DESIGN_TOKENS.colors.purple[800]
        }}>
          📱 ドラッグで範囲を選択
        </label>

        {/* 背景表示切り替えボタン（常に表示） */}
        <button
          onClick={() => setShowBackground(!showBackground)}
          disabled={!previewBackgroundUrl}
          style={{
            padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[2]}`,
            backgroundColor: showBackground 
              ? DESIGN_TOKENS.colors.purple[100]
              : DESIGN_TOKENS.colors.neutral[100],
            border: `1px solid ${showBackground 
              ? DESIGN_TOKENS.colors.purple[300]
              : DESIGN_TOKENS.colors.neutral[300]}`,
            borderRadius: DESIGN_TOKENS.borderRadius.md,
            fontSize: DESIGN_TOKENS.typography.fontSize.xs,
            color: showBackground 
              ? DESIGN_TOKENS.colors.purple[700]
              : DESIGN_TOKENS.colors.neutral[600],
            cursor: previewBackgroundUrl ? 'pointer' : 'not-allowed',
            fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: DESIGN_TOKENS.spacing[1],
            opacity: previewBackgroundUrl ? 1 : 0.5
          }}
          onMouseEnter={(e) => {
            if (!previewBackgroundUrl) return;
            if (showBackground) {
              e.currentTarget.style.backgroundColor = DESIGN_TOKENS.colors.purple[200];
            } else {
              e.currentTarget.style.backgroundColor = DESIGN_TOKENS.colors.neutral[200];
            }
          }}
          onMouseLeave={(e) => {
            if (!previewBackgroundUrl) return;
            if (showBackground) {
              e.currentTarget.style.backgroundColor = DESIGN_TOKENS.colors.purple[100];
            } else {
              e.currentTarget.style.backgroundColor = DESIGN_TOKENS.colors.neutral[100];
            }
          }}
        >
          {previewBackgroundUrl 
            ? (showBackground ? '🖼️ 背景を隠す' : '🖼️ 背景を表示')
            : '🖼️ 背景画像なし'
          }
        </button>
      </div>

      {/* プレビュー画面 */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          overflow: 'hidden',
          cursor: isDragging ? 'crosshair' : 'crosshair',
          width: `${PREVIEW_WIDTH}px`,
          height: `${PREVIEW_HEIGHT}px`,
          border: `2px solid ${DESIGN_TOKENS.colors.purple[300]}`,
          borderRadius: DESIGN_TOKENS.borderRadius.lg,
          boxShadow: DESIGN_TOKENS.shadows.md,
          backgroundColor: '#1a1a2e'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {/* 背景画像（オプション） */}
        {previewBackgroundUrl && showBackground && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `url(${previewBackgroundUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              opacity: 0.3,
              zIndex: 1
            }}
          />
        )}

        {/* グリッド */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2, pointerEvents: 'none' }}>
          {[0.25, 0.5, 0.75].map(x => (
            <div
              key={`v-${x}`}
              style={{
                position: 'absolute',
                left: `${x * 100}%`,
                top: 0,
                bottom: 0,
                borderLeft: '1px dashed rgba(255, 255, 255, 0.15)'
              }}
            />
          ))}
          {[0.25, 0.5, 0.75].map(y => (
            <div
              key={`h-${y}`}
              style={{
                position: 'absolute',
                top: `${y * 100}%`,
                left: 0,
                right: 0,
                borderTop: '1px dashed rgba(255, 255, 255, 0.15)'
              }}
            />
          ))}
        </div>

        {/* 選択範囲表示 */}
        {displayRect && displayRect.maxX - displayRect.minX >= 0.05 && displayRect.maxY - displayRect.minY >= 0.05 && (
          <div
            style={{
              position: 'absolute',
              left: `${displayRect.minX * 100}%`,
              top: `${displayRect.minY * 100}%`,
              width: `${(displayRect.maxX - displayRect.minX) * 100}%`,
              height: `${(displayRect.maxY - displayRect.minY) * 100}%`,
              backgroundColor: isDragging 
                ? 'rgba(147, 51, 234, 0.4)'  // ドラッグ中: 濃い紫
                : 'rgba(147, 51, 234, 0.3)', // 確定後: 薄い紫
              border: `2px solid ${DESIGN_TOKENS.colors.purple[500]}`,
              borderRadius: DESIGN_TOKENS.borderRadius.md,
              zIndex: 5,
              pointerEvents: 'none',
              transition: isDragging ? 'none' : 'all 0.2s ease'
            }}
          />
        )}

        {/* ガイドメッセージ */}
        {!isDragging && (displayRect.maxX - displayRect.minX < 0.05 || displayRect.maxY - displayRect.minY < 0.05) && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 15,
              pointerEvents: 'none'
            }}
          >
            <div style={{
              backgroundColor: 'rgba(147, 51, 234, 0.9)',
              color: DESIGN_TOKENS.colors.neutral[0],
              padding: DESIGN_TOKENS.spacing[3],
              borderRadius: DESIGN_TOKENS.borderRadius.lg,
              fontSize: DESIGN_TOKENS.typography.fontSize.sm,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
              textAlign: 'center',
              maxWidth: '300px'
            }}>
              ✋ ドラッグして範囲を選択してください
            </div>
          </div>
        )}
      </div>

      {/* 使い方ヒント */}
      <div style={{
        marginTop: DESIGN_TOKENS.spacing[3],
        padding: DESIGN_TOKENS.spacing[3],
        backgroundColor: DESIGN_TOKENS.colors.purple[50],
        borderRadius: DESIGN_TOKENS.borderRadius.lg,
        fontSize: DESIGN_TOKENS.typography.fontSize.xs,
        color: DESIGN_TOKENS.colors.purple[700]
      }}>
        <div style={{ 
          fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
          marginBottom: DESIGN_TOKENS.spacing[1]
        }}>
          💡 使い方
        </div>
        <ul style={{ 
          margin: 0, 
          paddingLeft: DESIGN_TOKENS.spacing[4],
          lineHeight: 1.6
        }}>
          <li>プレビュー画面上でドラッグして範囲を選択</li>
          <li>グリッド線を参考に、画面の1/4、1/2などの位置を決定</li>
          <li>最小サイズ: 画面の5%以上（小さすぎる範囲は無効）</li>
          {previewBackgroundUrl && (
            <li>背景画像の表示/非表示を切り替えて配置を確認</li>
          )}
        </ul>
      </div>
    </div>
  );
};