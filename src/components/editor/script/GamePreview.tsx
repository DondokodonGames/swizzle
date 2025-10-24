// src/components/editor/script/GamePreview.tsx
// ゲーム画面プレビュー表示コンポーネント

import React, { useRef } from 'react';
import { GameProject } from '../../../types/editor/GameProject';

interface GamePreviewProps {
  project: GameProject;
  selectedObjectId: string | null;
  draggedItem: any;
  forceRender: number;
  onObjectPositionUpdate: (objectId: string, position: { x: number; y: number }) => void;
  onObjectRuleEdit: (objectId: string) => void;
  onSetDraggedItem: (item: any) => void;
  hasRuleForObject: (objectId: string) => boolean;
}

export const GamePreview: React.FC<GamePreviewProps> = ({
  project,
  selectedObjectId,
  draggedItem,
  forceRender,
  onObjectPositionUpdate,
  onObjectRuleEdit,
  onSetDraggedItem,
  hasRuleForObject
}) => {
  const gamePreviewRef = useRef<HTMLDivElement>(null);

  // 背景画像URL取得
  const getBackgroundImageUrl = () => {
    if (!project.assets.background || !project.script.layout.background.visible) {
      return null;
    }
    return project.assets.background.frames?.[0]?.dataUrl || null;
  };

  return (
    <div className="flex-1">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        🎮 ゲーム画面 (9:16)
      </h3>
      
      <div className="flex justify-center">
        <div
          ref={gamePreviewRef}
          className="relative overflow-hidden cursor-crosshair"
          style={{ 
            width: '300px',
            height: '533px',
            border: '3px solid #6b7280',
            borderRadius: '16px',
            position: 'relative',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
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
          
          {/* レイヤー3: グリッド（薄く表示） */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}>
            {[0.25, 0.5, 0.75].map(x => (
              <div
                key={`v-${x}`}
                style={{ 
                  position: 'absolute',
                  left: `${x * 100}%`, 
                  top: 0,
                  bottom: 0,
                  borderLeft: '1px dashed rgba(255, 255, 255, 0.3)',
                  pointerEvents: 'none'
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
                  borderTop: '1px dashed rgba(255, 255, 255, 0.3)',
                  pointerEvents: 'none'
                }}
              />
            ))}
          </div>
          
          {/* レイヤー4: オブジェクト（サムネイル画像表示） */}
          {project.script.layout.objects.map((layoutObj, index) => {
            const asset = project.assets.objects.find(obj => obj.id === layoutObj.objectId);
            const isSelected = selectedObjectId === layoutObj.objectId;
            const hasRule = hasRuleForObject(layoutObj.objectId);
            
            // 状態に応じた枠線色
            const borderColor = isSelected 
              ? '#1d4ed8' // 青（選択中）
              : hasRule 
                ? '#16a34a' // 緑（ルール設定済み）
                : '#dc2626'; // 赤（未設定）
            
            const boxShadowColor = isSelected 
              ? 'rgba(59, 130, 246, 0.4)'
              : hasRule 
                ? 'rgba(34, 197, 94, 0.4)'
                : 'rgba(239, 68, 68, 0.3)';

            return (
              <div
                key={`object-${layoutObj.objectId}-${index}-${forceRender}`}
                style={{
                  position: 'absolute',
                  left: `${layoutObj.position.x * 100}%`,
                  top: `${layoutObj.position.y * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '60px',
                  height: '60px',
                  zIndex: layoutObj.zIndex + 20,
                  border: `3px solid ${borderColor}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: `0 4px 16px ${boxShadowColor}`,
                  overflow: 'hidden',
                  backgroundColor: '#ffffff'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log(`[GamePreview] オブジェクトクリック → ルール設定: ${asset?.name}`);
                  onObjectRuleEdit(layoutObj.objectId);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
                }}
                draggable
                onDragStart={(e) => {
                  onSetDraggedItem({ id: layoutObj.objectId, type: 'object' });
                  e.dataTransfer.effectAllowed = 'move';
                  console.log(`[GamePreview] ドラッグ開始: ${asset?.name}`);
                }}
              >
                {/* サムネイル画像表示 */}
                {asset?.frames?.[0]?.dataUrl ? (
                  <img
                    src={asset.frames[0].dataUrl}
                    alt={asset.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      pointerEvents: 'none'
                    }}
                  />
                ) : (
                  // フォールバック：画像がない場合
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#f3f4f6',
                      color: '#6b7280',
                      fontSize: '24px',
                      fontWeight: 'bold'
                    }}
                  >
                    {index < 9 ? (index + 1).toString() : '★'}
                  </div>
                )}
                
                {/* 状態インジケーター（小さなアイコン） */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '2px',
                    right: '2px',
                    width: '16px',
                    height: '16px',
                    backgroundColor: hasRule ? '#16a34a' : '#f59e0b',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 'bold'
                  }}
                >
                  {hasRule ? '✓' : '!'}
                </div>
              </div>
            );
          })}
          
          {/* ガイドメッセージ */}
          {project.assets.objects.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 30 }}>
              <div className="text-center p-6 bg-white bg-opacity-95 rounded-lg shadow-lg">
                <div className="text-4xl mb-3">📁</div>
                <h4 className="font-semibold text-gray-800 mb-2">オブジェクトを追加</h4>
                <p className="text-gray-600 text-sm">Assetsタブでオブジェクトを追加してください</p>
              </div>
            </div>
          )}
          
          {project.assets.objects.length > 0 && project.script.layout.objects.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 30 }}>
              <div className="text-center p-6 bg-white bg-opacity-95 rounded-lg shadow-lg">
                <div className="text-4xl mb-3">🎯</div>
                <h4 className="font-semibold text-gray-800 mb-2">オブジェクトを配置</h4>
                <p className="text-gray-600 text-sm">
                  Assetsタブで追加したオブジェクトを<br/>
                  この画面にドラッグ&ドロップして配置してください
                </p>
              </div>
            </div>
          )}
          
          {project.script.layout.objects.length > 0 && (
            <div className="absolute bottom-2 left-2 right-2" style={{ zIndex: 30 }}>
              <div className="text-center p-3 bg-black bg-opacity-75 text-white rounded-lg">
                <div className="text-sm font-medium mb-1">💡 操作ヒント</div>
                <div className="text-xs">
                  <span style={{color: '#3b82f6'}}>■</span> 選択中 | 
                  <span style={{color: '#16a34a'}}>■</span> ルール設定済み | 
                  <span style={{color: '#dc2626'}}>■</span> ルール未設定<br/>
                  クリック → ルール設定 | ドラッグ → 移動
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* プレビュー情報 */}
        <div className="mt-3 text-center text-sm text-gray-500">
          画面サイズ: 300×533px (9:16) | 
          背景: {project.script.layout.background.visible ? '表示' : '非表示'} | 
          オブジェクト: {project.script.layout.objects.length}個
        </div>
      </div>
    </div>
  );
};