// src/components/editor/common/CoordinateEditor.tsx
// Phase 3-2-3: クリックで座標指定エディター
// 機能: 1点のみ指定、背景画像表示/非表示切り替え、正規化座標（0.0～1.0）

import React, { useRef, useState, useCallback } from 'react';
import { DESIGN_TOKENS } from '../../../constants/DesignSystem';
import { ModernButton } from '../../ui/ModernButton';

// 座標型定義（正規化座標 0.0～1.0）
export interface Coordinate {
  x: number;  // 0.0～1.0
  y: number;  // 0.0～1.0
}

interface CoordinateEditorProps {
  value: Coordinate;
  onChange: (coord: Coordinate) => void;
  previewBackgroundUrl?: string;  // 背景画像URL（オプション）
}

// GamePreview.tsxと同じ座標系定義
const GAME_WIDTH = 1080;
const GAME_HEIGHT = 1920;
const PREVIEW_WIDTH = 720;
const PREVIEW_HEIGHT = 1280;
const PREVIEW_SCALE = 0.667; // 720/1080 = 0.667

export const CoordinateEditor: React.FC<CoordinateEditorProps> = ({
  value,
  onChange,
  previewBackgroundUrl
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showBackground, setShowBackground] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  // 背景画像の読み込み
  const backgroundImage = useRef<HTMLImageElement | null>(null);
  React.useEffect(() => {
    if (previewBackgroundUrl) {
      const img = new Image();
      img.onload = () => {
        backgroundImage.current = img;
        redraw();
      };
      img.src = previewBackgroundUrl;
    }
  }, [previewBackgroundUrl]);

  // Canvas座標 → 正規化座標（0.0～1.0）
  const canvasToNormalized = useCallback((canvasX: number, canvasY: number): Coordinate => {
    return {
      x: Math.max(0, Math.min(1, canvasX / PREVIEW_WIDTH)),
      y: Math.max(0, Math.min(1, canvasY / PREVIEW_HEIGHT))
    };
  }, []);

  // 正規化座標 → Canvas座標
  const normalizedToCanvas = useCallback((coord: Coordinate): { x: number; y: number } => {
    return {
      x: coord.x * PREVIEW_WIDTH,
      y: coord.y * PREVIEW_HEIGHT
    };
  }, []);

  // キャンバス再描画
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // クリア
    ctx.clearRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);

    // 背景画像描画（表示ONの場合）
    if (showBackground && backgroundImage.current && previewBackgroundUrl) {
      ctx.drawImage(backgroundImage.current, 0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
    } else {
      // 背景なし or 非表示: 薄いグレー背景
      ctx.fillStyle = DESIGN_TOKENS.colors.neutral[100];
      ctx.fillRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
    }

    // グリッド線描画（1/4, 1/2, 3/4）
    ctx.strokeStyle = DESIGN_TOKENS.colors.neutral[300];
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    // 縦線
    [0.25, 0.5, 0.75].forEach(ratio => {
      const x = ratio * PREVIEW_WIDTH;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, PREVIEW_HEIGHT);
      ctx.stroke();
    });

    // 横線
    [0.25, 0.5, 0.75].forEach(ratio => {
      const y = ratio * PREVIEW_HEIGHT;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(PREVIEW_WIDTH, y);
      ctx.stroke();
    });

    ctx.setLineDash([]);

    // 現在の座標点を描画
    const canvasPoint = normalizedToCanvas(value);

    // 十字線（薄い紫）
    ctx.strokeStyle = DESIGN_TOKENS.colors.purple[300];
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    // 縦線
    ctx.beginPath();
    ctx.moveTo(canvasPoint.x, 0);
    ctx.lineTo(canvasPoint.x, PREVIEW_HEIGHT);
    ctx.stroke();
    // 横線
    ctx.beginPath();
    ctx.moveTo(0, canvasPoint.y);
    ctx.lineTo(PREVIEW_WIDTH, canvasPoint.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // 座標点（大きめの紫丸）
    ctx.fillStyle = DESIGN_TOKENS.colors.purple[500];
    ctx.strokeStyle = DESIGN_TOKENS.colors.neutral[0];
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(canvasPoint.x, canvasPoint.y, 12, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // 中心点（白い小丸）
    ctx.fillStyle = DESIGN_TOKENS.colors.neutral[0];
    ctx.beginPath();
    ctx.arc(canvasPoint.x, canvasPoint.y, 4, 0, 2 * Math.PI);
    ctx.fill();

  }, [value, showBackground, previewBackgroundUrl, normalizedToCanvas]);

  // 初回描画 & value変更時再描画
  React.useEffect(() => {
    redraw();
  }, [redraw]);

  // マウスダウン
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const coord = canvasToNormalized(x, y);
    onChange(coord);
    setIsDragging(true);
  }, [canvasToNormalized, onChange]);

  // マウス移動（ドラッグ中）
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const coord = canvasToNormalized(x, y);
    onChange(coord);
  }, [isDragging, canvasToNormalized, onChange]);

  // マウスアップ
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // マウスがキャンバス外に出た
  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: DESIGN_TOKENS.spacing[3]
    }}>
      {/* キャンバス */}
      <div style={{
        position: 'relative',
        width: `${PREVIEW_WIDTH}px`,
        height: `${PREVIEW_HEIGHT}px`,
        border: `2px solid ${DESIGN_TOKENS.colors.purple[300]}`,
        borderRadius: DESIGN_TOKENS.borderRadius.lg,
        overflow: 'hidden',
        cursor: 'crosshair',
        margin: '0 auto'
      }}>
        <canvas
          ref={canvasRef}
          width={PREVIEW_WIDTH}
          height={PREVIEW_HEIGHT}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{
            display: 'block',
            width: '100%',
            height: '100%'
          }}
        />
      </div>

      {/* コントロール */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: DESIGN_TOKENS.spacing[2],
        alignItems: 'center'
      }}>
        {/* 背景表示/非表示切り替えボタン（常時表示） */}
        <ModernButton
          variant="outline"
          size="sm"
          onClick={() => setShowBackground(!showBackground)}
          disabled={!previewBackgroundUrl}
          style={{
            borderColor: DESIGN_TOKENS.colors.purple[300],
            color: DESIGN_TOKENS.colors.purple[700],
            opacity: previewBackgroundUrl ? 1.0 : 0.5,
            cursor: previewBackgroundUrl ? 'pointer' : 'not-allowed'
          }}
        >
          {previewBackgroundUrl ? (
            <>🖼️ 背景を{showBackground ? '隠す' : '表示'}</>
          ) : (
            <>🖼️ 背景画像なし</>
          )}
        </ModernButton>

        {/* 座標値表示 */}
        <div style={{
          fontSize: DESIGN_TOKENS.typography.fontSize.xs,
          color: DESIGN_TOKENS.colors.neutral[600],
          textAlign: 'center'
        }}>
          座標: ({value.x.toFixed(2)}, {value.y.toFixed(2)})
        </div>
      </div>

      {/* 使い方説明 */}
      <div style={{
        padding: DESIGN_TOKENS.spacing[2],
        backgroundColor: DESIGN_TOKENS.colors.primary[50],
        border: `1px solid ${DESIGN_TOKENS.colors.primary[200]}`,
        borderRadius: DESIGN_TOKENS.borderRadius.md,
        fontSize: DESIGN_TOKENS.typography.fontSize.xs,
        color: DESIGN_TOKENS.colors.primary[800],
        textAlign: 'center'
      }}>
        💡 画面をクリックまたはドラッグして移動先を指定してください
      </div>
    </div>
  );
};