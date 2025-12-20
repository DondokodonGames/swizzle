// src/components/editor/script/GamePreview.tsx
// 配置ツール改善版 - 1080x1920基準、720x1280表示、実際のアセットサイズ反映

import React, { useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { GameProject } from '../../../types/editor/GameProject';
import { DESIGN_TOKENS } from '../../../constants/DesignSystem';
import { getBackgroundUrl, getObjectUrl } from '../../../utils/assetUrl';

interface GamePreviewProps {
  project: GameProject;
  selectedObjectId: string | null;
  draggedItem: any;
  forceRender: number;
  onObjectPositionUpdate: (objectId: string, position: { x: number; y: number }) => void;
  onObjectRuleEdit: (objectId: string) => void;
  onSetDraggedItem: (item: any) => void;
  hasRuleForObject: (objectId: string) => boolean;
  onObjectScaleUpdate?: (objectId: string, scale: { x: number; y: number }) => void;
}

// 🔧 ゲーム画面の実際の解像度
const GAME_WIDTH = 1080;
const GAME_HEIGHT = 1920;

// 🔧 エディター表示サイズ（720x1280 = 2/3縮小）
const PREVIEW_WIDTH = 720;
const PREVIEW_HEIGHT = 1280;
const PREVIEW_SCALE = PREVIEW_WIDTH / GAME_WIDTH; // 0.667

export const GamePreview: React.FC<GamePreviewProps> = ({
  project,
  selectedObjectId,
  draggedItem,
  forceRender,
  onObjectPositionUpdate,
  onObjectRuleEdit,
  onSetDraggedItem,
  hasRuleForObject,
  onObjectScaleUpdate
}) => {
  const { t } = useTranslation();
  const gamePreviewRef = useRef<HTMLDivElement>(null);
  
  // リサイズ状態管理
  const [resizing, setResizing] = useState<{
    objectId: string;
    startX: number;
    startY: number;
    startScale: { x: number; y: number };
  } | null>(null);

  // 背景画像URL取得（storageUrl / dataUrl両対応）
  const getBackgroundImageUrl = () => {
    if (!project.assets.background || !project.script.layout.background.visible) {
      return null;
    }
    return getBackgroundUrl(project.assets.background);
  };

  // リサイズ開始ハンドラ
  const handleResizeStart = useCallback((
    e: React.MouseEvent,
    objectId: string,
    currentScale: { x: number; y: number }
  ) => {
    e.stopPropagation();
    e.preventDefault();
    
    setResizing({
      objectId,
      startX: e.clientX,
      startY: e.clientY,
      startScale: { ...currentScale }
    });
    
    console.log(`[GamePreview] リサイズ開始: ${objectId}`);
  }, []);

  // リサイズ中ハンドラ
  const handleResizeMove = useCallback((e: React.MouseEvent) => {
    if (!resizing || !onObjectScaleUpdate) return;
    
    const deltaX = e.clientX - resizing.startX;
    const deltaY = e.clientY - resizing.startY;
    
    // ドラッグ距離に応じてスケール変更（100px = 1.0スケール変化）
    const scaleChangeX = deltaX / 100;
    const scaleChangeY = deltaY / 100;
    
    const newScaleX = Math.max(0.3, Math.min(5.0, resizing.startScale.x + scaleChangeX));
    const newScaleY = Math.max(0.3, Math.min(5.0, resizing.startScale.y + scaleChangeY));
    
    onObjectScaleUpdate(resizing.objectId, { x: newScaleX, y: newScaleY });
  }, [resizing, onObjectScaleUpdate]);

  // リサイズ終了ハンドラ
  const handleResizeEnd = useCallback(() => {
    if (resizing) {
      console.log(`[GamePreview] リサイズ終了: ${resizing.objectId}`);
      setResizing(null);
    }
  }, [resizing]);

  // スタイル定義
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: DESIGN_TOKENS.colors.neutral[800],
    marginBottom: DESIGN_TOKENS.spacing[2],
    display: 'flex',
    alignItems: 'center',
    gap: DESIGN_TOKENS.spacing[2],
  };

  const previewInfoStyle: React.CSSProperties = {
    marginTop: DESIGN_TOKENS.spacing[2],
    fontSize: '0.65rem',
    color: DESIGN_TOKENS.colors.neutral[500],
  };

  return (
    <div 
      style={containerStyle}
      onMouseMove={resizing ? handleResizeMove : undefined}
      onMouseUp={resizing ? handleResizeEnd : undefined}
      onMouseLeave={resizing ? handleResizeEnd : undefined}
    >
      {/* タイトル */}
      <h3 style={titleStyle}>
        🎮 {t('editor.script.gamePreview.title', 'ゲーム画面')}
        <span style={{ 
          fontSize: '0.65rem', 
          color: DESIGN_TOKENS.colors.neutral[500],
          fontWeight: 400 
        }}>
          ({PREVIEW_WIDTH}×{PREVIEW_HEIGHT})
        </span>
      </h3>
      
      {/* プレビュー画面 */}
      <div
        ref={gamePreviewRef}
        style={{ 
          position: 'relative',
          overflow: 'hidden',
          cursor: resizing ? 'nwse-resize' : 'crosshair',
          width: `${PREVIEW_WIDTH}px`,
          height: `${PREVIEW_HEIGHT}px`,
          border: `2px solid ${DESIGN_TOKENS.colors.neutral[500]}`,
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          backgroundColor: '#1a1a2e'
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(e) => {
          e.preventDefault();
          
          if (!draggedItem) return;
          
          const rect = gamePreviewRef.current?.getBoundingClientRect();
          if (!rect) return;
          
          const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
          
          console.log(`[GamePreview] ドロップ: ${draggedItem.id} → (${x.toFixed(2)}, ${y.toFixed(2)})`);
          onObjectPositionUpdate(draggedItem.id, { x, y });
          onSetDraggedItem(null);
        }}
      >
        
        {/* レイヤー1: 基本背景 */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#87CEEB',
            backgroundImage: 'linear-gradient(to bottom, #87CEEB, #90EE90)',
            zIndex: 1
          }}
        />
        
        {/* レイヤー2: 実際の背景画像 */}
        {(() => {
          const backgroundUrl = getBackgroundImageUrl();
          
          if (backgroundUrl) {
            return (
              <div 
                key={`background-${forceRender}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundImage: `url(${backgroundUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  zIndex: 5
                }}
              />
            );
          }
          return null;
        })()}
        
        {/* レイヤー3: グリッド */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, pointerEvents: 'none' }}>
          {[0.25, 0.5, 0.75].map(x => (
            <div
              key={`v-${x}`}
              style={{ 
                position: 'absolute',
                left: `${x * 100}%`, 
                top: 0,
                bottom: 0,
                borderLeft: '1px dashed rgba(255, 255, 255, 0.15)',
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
                borderTop: '1px dashed rgba(255, 255, 255, 0.15)',
              }}
            />
          ))}
          {/* 中央マーカー */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: '8px',
              height: '8px',
              marginLeft: '-4px',
              marginTop: '-4px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
            }}
          />
        </div>
        
        {/* レイヤー4: オブジェクト（実際のアセットサイズ × スケール × プレビュー縮小率） */}
        {project.script.layout.objects.map((layoutObj, index) => {
          const asset = project.assets.objects.find(obj => obj.id === layoutObj.objectId);
          const isSelected = selectedObjectId === layoutObj.objectId;
          const hasRule = hasRuleForObject(layoutObj.objectId);
          
          // 🔧 実際のアセットサイズを取得
          const frame = asset?.frames?.[0];
          const assetWidth = frame?.width || 100;  // フォールバック: 100px
          const assetHeight = frame?.height || 100;
          
          // スケール取得
          const scaleX = layoutObj.scale?.x || 1.0;
          const scaleY = layoutObj.scale?.y || 1.0;
          
          // 🔧 ゲーム内サイズ = アセットサイズ × スケール
          const objectWidthGame = assetWidth * scaleX;
          const objectHeightGame = assetHeight * scaleY;
          
          // 🔧 プレビューサイズ = ゲーム内サイズ × プレビュー縮小率
          const objectWidth = objectWidthGame * PREVIEW_SCALE;
          const objectHeight = objectHeightGame * PREVIEW_SCALE;
          
          // 最小サイズを確保（クリックしやすいように）
          const minSize = 20;
          const displayWidth = Math.max(objectWidth, minSize);
          const displayHeight = Math.max(objectHeight, minSize);
          
          // 状態に応じた枠線色
          const borderColor = isSelected 
            ? '#3b82f6'
            : hasRule 
              ? '#22c55e'
              : '#ef4444';
          
          const boxShadowColor = isSelected 
            ? 'rgba(59, 130, 246, 0.5)'
            : hasRule 
              ? 'rgba(34, 197, 94, 0.4)'
              : 'rgba(239, 68, 68, 0.4)';

          return (
            <div
              key={`object-${layoutObj.objectId}-${index}-${forceRender}`}
              style={{
                position: 'absolute',
                left: `${layoutObj.position.x * 100}%`,
                top: `${layoutObj.position.y * 100}%`,
                transform: 'translate(-50%, -50%)',
                width: `${displayWidth}px`,
                height: `${displayHeight}px`,
                zIndex: layoutObj.zIndex + 20,
                border: `2px solid ${borderColor}`,
                borderRadius: DESIGN_TOKENS.borderRadius.md,
                cursor: 'pointer',
                transition: resizing?.objectId === layoutObj.objectId ? 'none' : 'all 0.15s ease',
                boxShadow: `0 4px 16px ${boxShadowColor}`,
                overflow: 'hidden',
                backgroundColor: 'rgba(255, 255, 255, 0.95)'
              }}
              onClick={(e) => {
                e.stopPropagation();
                onObjectRuleEdit(layoutObj.objectId);
              }}
              onMouseEnter={(e) => {
                if (!resizing) {
                  e.currentTarget.style.boxShadow = `0 6px 20px ${boxShadowColor}`;
                }
              }}
              onMouseLeave={(e) => {
                if (!resizing) {
                  e.currentTarget.style.boxShadow = `0 4px 16px ${boxShadowColor}`;
                }
              }}
              draggable={!resizing}
              onDragStart={(e) => {
                if (resizing) {
                  e.preventDefault();
                  return;
                }
                onSetDraggedItem({ id: layoutObj.objectId, type: 'object' });
                e.dataTransfer.effectAllowed = 'move';
              }}
            >
              {/* サムネイル画像表示（storageUrl / dataUrl両対応） */}
              {(() => {
                const assetUrl = getObjectUrl(asset);
                return assetUrl ? (
                  <img
                    src={assetUrl}
                    alt={asset?.name || 'Object'}
                    crossOrigin="anonymous"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      pointerEvents: 'none'
                    }}
                    draggable={false}
                  />
                ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#f3f4f6',
                    color: '#6b7280',
                    fontSize: `${Math.min(displayWidth, displayHeight) * 0.4}px`,
                    fontWeight: 'bold'
                  }}
                >
                  {index < 9 ? (index + 1).toString() : '★'}
                </div>
              )})()}

              {/* 状態インジケーター */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '3px',
                  right: '3px',
                  width: '16px',
                  height: '16px',
                  backgroundColor: hasRule ? '#22c55e' : '#f59e0b',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                }}
              >
                {hasRule ? '✓' : '!'}
              </div>

              {/* サイズ・スケール表示（選択中のみ） */}
              {isSelected && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-26px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    color: 'white',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none'
                  }}
                >
                  {Math.round(objectWidthGame)}×{Math.round(objectHeightGame)} ({scaleX.toFixed(1)}x)
                </div>
              )}

              {/* リサイズハンドル（選択中のみ） */}
              {isSelected && onObjectScaleUpdate && (
                <>
                  {/* 右下ハンドル */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-7px',
                      right: '-7px',
                      width: '14px',
                      height: '14px',
                      backgroundColor: '#3b82f6',
                      border: '2px solid white',
                      borderRadius: '3px',
                      cursor: 'nwse-resize',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      zIndex: 100
                    }}
                    onMouseDown={(e) => handleResizeStart(e, layoutObj.objectId, layoutObj.scale || { x: 1, y: 1 })}
                  />
                  
                  {/* 右ハンドル */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      right: '-7px',
                      width: '8px',
                      height: '24px',
                      marginTop: '-12px',
                      backgroundColor: '#3b82f6',
                      border: '2px solid white',
                      borderRadius: '3px',
                      cursor: 'ew-resize',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      zIndex: 100
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const startX = e.clientX;
                      const startScaleX = layoutObj.scale?.x || 1;
                      
                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        const deltaX = moveEvent.clientX - startX;
                        const newScaleX = Math.max(0.3, Math.min(5.0, startScaleX + deltaX / 80));
                        if (onObjectScaleUpdate) {
                          onObjectScaleUpdate(layoutObj.objectId, { 
                            x: newScaleX, 
                            y: layoutObj.scale?.y || 1 
                          });
                        }
                      };
                      
                      const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                  />
                  
                  {/* 下ハンドル */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-7px',
                      left: '50%',
                      width: '24px',
                      height: '8px',
                      marginLeft: '-12px',
                      backgroundColor: '#3b82f6',
                      border: '2px solid white',
                      borderRadius: '3px',
                      cursor: 'ns-resize',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      zIndex: 100
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const startY = e.clientY;
                      const startScaleY = layoutObj.scale?.y || 1;
                      
                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        const deltaY = moveEvent.clientY - startY;
                        const newScaleY = Math.max(0.3, Math.min(5.0, startScaleY + deltaY / 80));
                        if (onObjectScaleUpdate) {
                          onObjectScaleUpdate(layoutObj.objectId, { 
                            x: layoutObj.scale?.x || 1, 
                            y: newScaleY 
                          });
                        }
                      };
                      
                      const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                  />
                </>
              )}
            </div>
          );
        })}
        
        {/* ガイドメッセージ */}
        {project.assets.objects.length === 0 && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 30,
          }}>
            <div style={{
              textAlign: 'center',
              padding: DESIGN_TOKENS.spacing[6],
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: DESIGN_TOKENS.borderRadius.xl,
              boxShadow: DESIGN_TOKENS.shadows.lg,
              maxWidth: '300px'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: DESIGN_TOKENS.spacing[3] }}>📁</div>
              <h4 style={{
                fontWeight: 600,
                color: DESIGN_TOKENS.colors.neutral[800],
                marginBottom: DESIGN_TOKENS.spacing[2],
                fontSize: '1.1rem'
              }}>
                {t('editor.script.gamePreview.noObjects.title', 'オブジェクトを追加')}
              </h4>
              <p style={{
                color: DESIGN_TOKENS.colors.neutral[600],
                fontSize: '0.9rem',
                margin: 0
              }}>
                {t('editor.script.gamePreview.noObjects.description', 'Assetsタブでオブジェクトを追加してください')}
              </p>
            </div>
          </div>
        )}

        {project.assets.objects.length > 0 && project.script.layout.objects.length === 0 && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 30,
          }}>
            <div style={{
              textAlign: 'center',
              padding: DESIGN_TOKENS.spacing[6],
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: DESIGN_TOKENS.borderRadius.xl,
              boxShadow: DESIGN_TOKENS.shadows.lg,
              maxWidth: '300px'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: DESIGN_TOKENS.spacing[3] }}>🎯</div>
              <h4 style={{
                fontWeight: 600,
                color: DESIGN_TOKENS.colors.neutral[800],
                marginBottom: DESIGN_TOKENS.spacing[2],
                fontSize: '1.1rem'
              }}>
                {t('editor.script.gamePreview.noPlaced.title', 'オブジェクトを配置')}
              </h4>
              <p style={{
                color: DESIGN_TOKENS.colors.neutral[600],
                fontSize: '0.9rem',
                margin: 0
              }}>
                {t('editor.script.gamePreview.noPlaced.description', '右側のパネルから配置ボタンを押してください')}
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* プレビュー情報 */}
      <div style={previewInfoStyle}>
        基準: {GAME_WIDTH}×{GAME_HEIGHT} | 表示: {PREVIEW_WIDTH}×{PREVIEW_HEIGHT} ({(PREVIEW_SCALE * 100).toFixed(0)}%) | オブジェクト: {project.script.layout.objects.length}個
      </div>
    </div>
  );
};