// src/components/editor/tabs/ScriptTab.tsx
// 問題修正版 - レンダリング・レイアウト・デバッグ修正

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GameProject } from '../../../types/editor/GameProject';
import { GameRule, TriggerCondition, GameAction } from '../../../types/editor/GameScript';
import { CONDITIONS_LIBRARY, ACTIONS_LIBRARY } from '../../../constants/EditorLimits';

interface ScriptTabProps {
  project: GameProject;
  onProjectUpdate: (project: GameProject) => void;
}

export const ScriptTab: React.FC<ScriptTabProps> = ({ project, onProjectUpdate }) => {
  const [mode, setMode] = useState<'layout' | 'rules'>('layout');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<GameRule | null>(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [forceUpdate, setForceUpdate] = useState(0); // 🔧 強制再レンダリング用
  const gamePreviewRef = useRef<HTMLDivElement>(null);

  // 🔧 デバッグログ関数
  const addDebugLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [`${timestamp}: ${message}`, ...prev.slice(0, 4)]);
    console.log(`[ScriptTab] ${message}`); // コンソールにも出力
  }, []);

  // 🔧 強制再レンダリング関数
  const triggerForceUpdate = useCallback(() => {
    setForceUpdate(prev => prev + 1);
    addDebugLog('画面を強制更新しました');
  }, [addDebugLog]);

  // 🔧 プロジェクト更新ヘルパー（修正版）
  const updateProject = useCallback((updates: Partial<GameProject>) => {
    const updatedProject = {
      ...project,
      ...updates,
      lastModified: new Date().toISOString()
    };
    
    // 即座に状態更新
    onProjectUpdate(updatedProject);
    
    // 強制再レンダリング
    setTimeout(() => {
      setForceUpdate(prev => prev + 1);
    }, 100);
    
    addDebugLog(`プロジェクト更新: ${Object.keys(updates).join(', ')}`);
  }, [project, onProjectUpdate, addDebugLog]);

  // 🔧 オブジェクト配置更新（修正版）
  const handleObjectPositionUpdate = useCallback((objectId: string, position: { x: number; y: number }) => {
    addDebugLog(`配置更新開始: ${objectId} → (${position.x.toFixed(2)}, ${position.y.toFixed(2)})`);
    
    // 深いコピーで確実に更新
    const updatedScript = JSON.parse(JSON.stringify(project.script));
    const existingIndex = updatedScript.layout.objects.findIndex((obj: any) => obj.objectId === objectId);
    
    if (existingIndex !== -1) {
      updatedScript.layout.objects[existingIndex].position = position;
      addDebugLog(`既存オブジェクト位置更新: ${objectId} [${existingIndex}]`);
    } else {
      const asset = project.assets.objects.find(obj => obj.id === objectId);
      if (asset) {
        const newLayoutObject = {
          objectId: objectId,
          position: position,
          scale: { x: 1, y: 1 },
          rotation: 0,
          zIndex: updatedScript.layout.objects.length + 1,
          initialState: {
            visible: true,
            animation: 0,
            animationSpeed: 12,
            autoStart: false
          }
        };
        updatedScript.layout.objects.push(newLayoutObject);
        addDebugLog(`新規オブジェクト追加: ${asset.name} (計${updatedScript.layout.objects.length}個)`);
      } else {
        addDebugLog(`❌ アセットが見つからない: ${objectId}`);
        return;
      }
    }
    
    // プロジェクト更新
    updateProject({ script: updatedScript });
    
    // 選択状態更新
    setSelectedObjectId(objectId);
    
  }, [project, updateProject, addDebugLog]);

  // 🔧 デバッグ情報を計算
  const debugData = {
    assetsCount: project.assets.objects.length,
    backgroundExists: !!project.assets.background,
    backgroundVisible: project.script.layout.background.visible,
    layoutObjectsCount: project.script.layout.objects.length,
    rulesCount: project.script.rules.length,
    selectedObject: selectedObjectId,
    mode: mode,
    forceUpdateCount: forceUpdate
  };

  // 🔧 背景画像のパス取得
  const getBackgroundImageUrl = useCallback(() => {
    if (!project.assets.background || !project.script.layout.background.visible) {
      return null;
    }
    const frame = project.assets.background.frames?.[0];
    if (frame?.dataUrl) {
      addDebugLog(`背景画像を取得: ${frame.dataUrl.slice(0, 50)}...`);
      return frame.dataUrl;
    }
    addDebugLog('❌ 背景画像データなし');
    return null;
  }, [project.assets.background, project.script.layout.background.visible, addDebugLog]);

  // 🔧 レンダリング確認用のuseEffect
  useEffect(() => {
    addDebugLog(`レンダリング更新: 配置オブジェクト${project.script.layout.objects.length}個`);
  }, [project.script.layout.objects, addDebugLog]);

  return (
    <div className="script-tab h-full flex flex-col">
      
      {/* 🔧 修正: デバッグヘッダー（確実に表示） */}
      <div className="flex-shrink-0 border-b-2 border-gray-300" style={{ backgroundColor: '#fef3c7' }}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex space-x-1">
              <button
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  mode === 'layout' ? 'bg-green-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => {
                  setMode('layout');
                  addDebugLog('レイアウトモードに切り替え');
                }}
              >
                🎨 レイアウト・配置
              </button>
              <button
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  mode === 'rules' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => {
                  setMode('rules');
                  addDebugLog('ルールモードに切り替え');
                }}
              >
                🎯 ルール設定
              </button>
              
              {/* 🔧 強制更新ボタン */}
              <button
                onClick={triggerForceUpdate}
                className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
              >
                🔄 画面更新
              </button>
            </div>
          </div>

          {/* 🔧 修正: デバッグ情報表示（インラインスタイルで確実に表示） */}
          <div style={{ backgroundColor: '#fbbf24', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
            <h4 style={{ fontWeight: 'bold', color: '#92400e', marginBottom: '8px' }}>🐛 デバッグ情報</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', fontSize: '14px' }}>
              <div>
                <span style={{ color: '#92400e' }}>アセット数:</span>
                <span style={{ marginLeft: '4px', fontWeight: 'bold', color: debugData.assetsCount > 0 ? '#059669' : '#dc2626' }}>
                  {debugData.assetsCount}個
                </span>
              </div>
              <div>
                <span style={{ color: '#92400e' }}>背景:</span>
                <span style={{ marginLeft: '4px', fontWeight: 'bold', color: debugData.backgroundExists ? '#059669' : '#dc2626' }}>
                  {debugData.backgroundExists ? 'あり' : 'なし'}
                </span>
              </div>
              <div>
                <span style={{ color: '#92400e' }}>背景表示:</span>
                <span style={{ marginLeft: '4px', fontWeight: 'bold', color: debugData.backgroundVisible ? '#059669' : '#dc2626' }}>
                  {debugData.backgroundVisible ? 'ON' : 'OFF'}
                </span>
              </div>
              <div>
                <span style={{ color: '#92400e' }}>配置済み:</span>
                <span style={{ marginLeft: '4px', fontWeight: 'bold', color: debugData.layoutObjectsCount > 0 ? '#059669' : '#f59e0b' }}>
                  {debugData.layoutObjectsCount}個
                </span>
              </div>
              <div>
                <span style={{ color: '#92400e' }}>ルール:</span>
                <span style={{ marginLeft: '4px', fontWeight: 'bold', color: debugData.rulesCount > 0 ? '#059669' : '#f59e0b' }}>
                  {debugData.rulesCount}個
                </span>
              </div>
              <div>
                <span style={{ color: '#92400e' }}>更新回数:</span>
                <span style={{ marginLeft: '4px', fontWeight: 'bold', color: '#1f2937' }}>
                  {debugData.forceUpdateCount}
                </span>
              </div>
            </div>
            
            {/* 選択状態 */}
            {selectedObjectId && (
              <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#dbeafe', borderRadius: '6px' }}>
                <span style={{ color: '#1e40af', fontSize: '14px' }}>選択中: </span>
                <span style={{ fontWeight: 'bold', color: '#1e3a8a' }}>{selectedObjectId}</span>
              </div>
            )}
          </div>

          {/* 🔧 最近のログ */}
          {debugInfo.length > 0 && (
            <div style={{ backgroundColor: '#f3f4f6', padding: '12px', borderRadius: '8px' }}>
              <h4 style={{ fontWeight: 'bold', color: '#374151', marginBottom: '8px' }}>📋 アクションログ</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {debugInfo.map((log, index) => (
                  <div key={index} style={{ fontSize: '12px', color: '#4b5563', fontFamily: 'monospace' }}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-auto">
        
        {/* 🎨 レイアウトモード */}
        {mode === 'layout' && (
          <div className="p-6">
            {/* 🔧 修正: レスポンシブレイアウト（縦積み→横並び） */}
            <div className="flex flex-col lg:flex-row gap-6">
              
              {/* ゲームプレビューエリア */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  🎮 ゲーム画面 
                  <span className="text-sm text-gray-500 ml-2">
                    (サイズ: {gamePreviewRef.current?.clientWidth || 0} × {gamePreviewRef.current?.clientHeight || 0})
                  </span>
                </h3>
                
                <div
                  ref={gamePreviewRef}
                  className="relative w-full mx-auto overflow-hidden cursor-crosshair"
                  style={{ 
                    aspectRatio: '9/16', 
                    maxHeight: '600px',
                    maxWidth: '400px',
                    backgroundColor: '#87CEEB',
                    backgroundImage: 'linear-gradient(to bottom, #87CEEB, #90EE90)',
                    border: '4px solid #6b7280',
                    borderRadius: '12px'
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    
                    if (mode !== 'layout' || !draggedItem) {
                      addDebugLog(`❌ ドロップ失敗: mode=${mode}, draggedItem=${!!draggedItem}`);
                      return;
                    }
                    
                    const rect = gamePreviewRef.current?.getBoundingClientRect();
                    if (!rect) {
                      addDebugLog(`❌ ドロップ失敗: プレビュー領域が見つからない`);
                      return;
                    }
                    
                    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
                    
                    addDebugLog(`ドロップ成功: ${draggedItem.id} → (${x.toFixed(2)}, ${y.toFixed(2)})`);
                    handleObjectPositionUpdate(draggedItem.id, { x, y });
                    setDraggedItem(null);
                  }}
                  onClick={() => addDebugLog('ゲーム画面クリック')}
                >
                  {/* 🔧 修正: グリッド表示（確実に見える） */}
                  <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
                    {/* 縦線 */}
                    {[0.25, 0.5, 0.75].map(x => (
                      <div
                        key={`v-${x}`}
                        className="absolute top-0 bottom-0"
                        style={{ 
                          left: `${x * 100}%`, 
                          borderLeft: '2px dashed rgba(255, 255, 255, 0.7)',
                          zIndex: 1
                        }}
                      />
                    ))}
                    {/* 横線 */}
                    {[0.25, 0.5, 0.75].map(y => (
                      <div
                        key={`h-${y}`}
                        className="absolute left-0 right-0"
                        style={{ 
                          top: `${y * 100}%`, 
                          borderTop: '2px dashed rgba(255, 255, 255, 0.7)',
                          zIndex: 1
                        }}
                      />
                    ))}
                  </div>

                  {/* 🔧 修正: 背景表示 */}
                  {(() => {
                    const backgroundUrl = getBackgroundImageUrl();
                    return backgroundUrl ? (
                      <div 
                        className="absolute inset-0"
                        style={{
                          backgroundImage: `url(${backgroundUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          zIndex: 2
                        }}
                      />
                    ) : null;
                  })()}
                  
                  {/* 🔧 背景状態表示 */}
                  <div 
                    className="absolute top-2 left-2 text-white text-xs px-2 py-1 rounded"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 10 }}
                  >
                    背景: {project.script.layout.background.visible ? '表示' : '非表示'} 
                    {project.assets.background ? '(データあり)' : '(データなし)'}
                  </div>
                  
                  {/* 🔧 修正: 配置オブジェクト表示（確実にレンダリング） */}
                  {project.script.layout.objects.map((layoutObj, index) => {
                    const asset = project.assets.objects.find(obj => obj.id === layoutObj.objectId);
                    const isSelected = selectedObjectId === layoutObj.objectId;
                    
                    // デバッグ用：オブジェクト情報をログ出力
                    if (index === 0) {
                      console.log('Rendering objects:', project.script.layout.objects.length, 'first:', layoutObj);
                    }
                    
                    return (
                      <div
                        key={`${layoutObj.objectId}-${forceUpdate}`} // 🔧 強制再レンダリング用key
                        className="absolute cursor-move transition-all"
                        style={{
                          left: `${layoutObj.position.x * 100}%`,
                          top: `${layoutObj.position.y * 100}%`,
                          transform: 'translate(-50%, -50%)',
                          zIndex: layoutObj.zIndex + 10,
                          width: '80px',
                          height: '80px',
                          border: `4px ${isSelected ? 'solid' : 'dashed'} ${isSelected ? '#3b82f6' : '#ef4444'}`,
                          backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          borderRadius: '8px'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedObjectId(layoutObj.objectId);
                          addDebugLog(`オブジェクト選択: ${layoutObj.objectId}`);
                        }}
                        draggable
                        onDragStart={(e) => {
                          setDraggedItem({ id: layoutObj.objectId, type: 'object' });
                          e.dataTransfer.effectAllowed = 'move';
                          addDebugLog(`ドラッグ開始: ${layoutObj.objectId}`);
                        }}
                      >
                        {asset?.frames?.[0]?.dataUrl ? (
                          <img
                            src={asset.frames[0].dataUrl}
                            alt={asset.name}
                            className="w-full h-full object-contain pointer-events-none rounded"
                          />
                        ) : (
                          <div 
                            className="w-full h-full rounded flex items-center justify-center"
                            style={{ backgroundColor: '#fca5a5' }}
                          >
                            <span className="text-xs text-red-600 text-center">
                              {asset ? asset.name : 'Missing'}
                            </span>
                          </div>
                        )}
                        
                        {/* 🔧 位置情報表示（確実に見える） */}
                        <div 
                          className="absolute text-white text-xs px-1 rounded"
                          style={{ 
                            bottom: '-24px', 
                            left: '50%', 
                            transform: 'translateX(-50%)',
                            backgroundColor: '#374151',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          ({layoutObj.position.x.toFixed(2)}, {layoutObj.position.y.toFixed(2)})
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* ガイドメッセージ */}
                  {project.assets.objects.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 20 }}>
                      <div className="text-center p-6 bg-white bg-opacity-90 rounded-lg">
                        <div className="text-4xl mb-2">📁</div>
                        <p className="text-gray-600">Assetsタブでオブジェクトを追加してください</p>
                      </div>
                    </div>
                  )}
                  
                  {project.assets.objects.length > 0 && project.script.layout.objects.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 20 }}>
                      <div className="text-center p-6 bg-white bg-opacity-90 rounded-lg">
                        <div className="text-4xl mb-2">🎯</div>
                        <p className="text-gray-600">下のオブジェクトをクリックまたはドラッグしてください</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 🔧 修正: サイドパネル（レスポンシブ対応） */}
              <div className="w-full lg:w-80 space-y-4">
                
                {/* 🔧 選択オブジェクト詳細 */}
                {selectedObjectId && (
                  <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-3">
                      🔧 選択中: {selectedObjectId}
                    </h4>
                    {(() => {
                      const selectedObj = project.script.layout.objects.find(obj => obj.objectId === selectedObjectId);
                      const selectedAsset = project.assets.objects.find(obj => obj.id === selectedObjectId);
                      
                      if (!selectedObj) {
                        return (
                          <div>
                            <p className="text-orange-600 text-sm mb-2">⚠️ 未配置のオブジェクト</p>
                            <button
                              onClick={() => {
                                handleObjectPositionUpdate(selectedObjectId, { x: 0.5, y: 0.5 });
                              }}
                              className="w-full bg-green-500 text-white px-3 py-2 rounded text-sm hover:bg-green-600"
                            >
                              中央に配置
                            </button>
                          </div>
                        );
                      }
                      
                      return (
                        <div className="space-y-4">
                          <div className="text-center">
                            {selectedAsset?.frames?.[0]?.dataUrl ? (
                              <img 
                                src={selectedAsset.frames[0].dataUrl} 
                                alt={selectedAsset.name}
                                className="w-16 h-16 mx-auto object-contain border rounded-lg"
                              />
                            ) : (
                              <div className="w-16 h-16 mx-auto bg-gray-200 border rounded-lg flex items-center justify-center">
                                <span className="text-xs text-gray-500">No Image</span>
                              </div>
                            )}
                            <p className="mt-2 font-medium">{selectedAsset?.name || selectedObjectId}</p>
                          </div>
                          
                          {/* 🔧 位置調整 */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              位置調整 (0.00 = 左端/上端, 1.00 = 右端/下端)
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-gray-500">X座標</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="1"
                                  step="0.01"
                                  value={selectedObj.position.x.toFixed(2)}
                                  onChange={(e) => {
                                    const newX = Math.max(0, Math.min(1, parseFloat(e.target.value) || 0));
                                    handleObjectPositionUpdate(selectedObjectId, {
                                      x: newX,
                                      y: selectedObj.position.y
                                    });
                                  }}
                                  className="w-full px-2 py-1 border rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500">Y座標</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="1"
                                  step="0.01"
                                  value={selectedObj.position.y.toFixed(2)}
                                  onChange={(e) => {
                                    const newY = Math.max(0, Math.min(1, parseFloat(e.target.value) || 0));
                                    handleObjectPositionUpdate(selectedObjectId, {
                                      x: selectedObj.position.x,
                                      y: newY
                                    });
                                  }}
                                  className="w-full px-2 py-1 border rounded text-sm"
                                />
                              </div>
                            </div>
                            
                            {/* クイック配置ボタン */}
                            <div className="grid grid-cols-3 gap-1 mt-2">
                              {[
                                { label: '左上', x: 0.2, y: 0.2 },
                                { label: '中上', x: 0.5, y: 0.2 },
                                { label: '右上', x: 0.8, y: 0.2 },
                                { label: '左中', x: 0.2, y: 0.5 },
                                { label: '中央', x: 0.5, y: 0.5 },
                                { label: '右中', x: 0.8, y: 0.5 },
                                { label: '左下', x: 0.2, y: 0.8 },
                                { label: '中下', x: 0.5, y: 0.8 },
                                { label: '右下', x: 0.8, y: 0.8 },
                              ].map((pos) => (
                                <button
                                  key={pos.label}
                                  onClick={() => {
                                    handleObjectPositionUpdate(selectedObjectId, { x: pos.x, y: pos.y });
                                  }}
                                  className="text-xs bg-gray-200 hover:bg-blue-200 px-2 py-1 rounded transition-colors"
                                >
                                  {pos.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          {/* 🔧 修正: ルール設定ボタン */}
                          <button
                            onClick={() => {
                              const newRule: GameRule = {
                                id: `rule_${Date.now()}`,
                                name: `${selectedAsset?.name || selectedObjectId}のルール`,
                                enabled: true,
                                priority: project.script.rules.length + 1,
                                targetObjectId: selectedObjectId,
                                triggers: {
                                  operator: 'AND',
                                  conditions: []
                                },
                                actions: [],
                                createdAt: new Date().toISOString(),
                                lastModified: new Date().toISOString()
                              };
                              
                              setEditingRule(newRule);
                              setShowRuleModal(true);
                              setMode('rules');
                              addDebugLog(`${selectedObjectId}専用ルール作成開始`);
                            }}
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                          >
                            🎯 {selectedAsset?.name || selectedObjectId}にルール設定
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                )}
                
                {/* 🔧 修正: オブジェクト一覧（グリッド表示） */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h4 className="font-semibold text-gray-800 mb-3">📦 オブジェクト一覧</h4>
                  
                  {project.assets.objects.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {project.assets.objects.map((asset) => {
                        const isPlaced = project.script.layout.objects.some(obj => obj.objectId === asset.id);
                        const isSelected = selectedObjectId === asset.id;
                        
                        return (
                          <div
                            key={asset.id}
                            className={`relative p-3 border-2 rounded-lg cursor-pointer transition-all hover:scale-105 ${
                              isPlaced 
                                ? 'bg-green-50 border-green-300' 
                                : 'bg-gray-50 border-gray-300 hover:bg-blue-50'
                            } ${
                              isSelected ? 'ring-2 ring-blue-400' : ''
                            }`}
                            draggable
                            onDragStart={(e) => {
                              setDraggedItem({ id: asset.id, type: 'asset' });
                              e.dataTransfer.effectAllowed = 'copy';
                              addDebugLog(`アセットドラッグ開始: ${asset.name}`);
                            }}
                            onClick={() => {
                              setSelectedObjectId(asset.id);
                              if (!isPlaced) {
                                handleObjectPositionUpdate(asset.id, { 
                                  x: 0.3 + Math.random() * 0.4, 
                                  y: 0.3 + Math.random() * 0.4 
                                });
                              }
                            }}
                          >
                            {asset.frames?.[0]?.dataUrl ? (
                              <img
                                src={asset.frames[0].dataUrl}
                                alt={asset.name}
                                className="w-full h-16 object-contain"
                              />
                            ) : (
                              <div className="w-full h-16 bg-gray-200 rounded flex items-center justify-center">
                                <span className="text-xs text-gray-500">No Image</span>
                              </div>
                            )}
                            <div className="text-xs text-center mt-2 truncate font-medium">{asset.name}</div>
                            
                            {isPlaced && (
                              <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                                <span className="text-xs">✓</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-6">
                      <div className="text-3xl mb-2">📁</div>
                      <div className="text-sm">Assetsタブでオブジェクトを追加してください</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 🎯 ルールモード（シンプル版） */}
        {mode === 'rules' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">⚙️ IF-THEN ルール設定</h3>
                <p className="text-sm text-gray-600 mt-1">
                  現在の対象: {selectedObjectId ? 
                    <span className="font-medium text-blue-600">📦 {selectedObjectId}</span> : 
                    <span className="font-medium text-green-600">🌟 ゲーム全体</span>
                  }
                </p>
              </div>
              <button
                onClick={() => {
                  const targetId = selectedObjectId || 'stage';
                  const newRule: GameRule = {
                    id: `rule_${Date.now()}`,
                    name: `${targetId === 'stage' ? 'ゲーム全体' : targetId}のルール`,
                    enabled: true,
                    priority: project.script.rules.length + 1,
                    targetObjectId: targetId,
                    triggers: {
                      operator: 'AND',
                      conditions: []
                    },
                    actions: [],
                    createdAt: new Date().toISOString(),
                    lastModified: new Date().toISOString()
                  };
                  
                  setEditingRule(newRule);
                  setShowRuleModal(true);
                  addDebugLog(`ルール作成開始: 対象=${targetId}`);
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                ➕ ルール追加
              </button>
            </div>
            
            {/* ルール一覧（簡略版） */}
            <div className="space-y-4">
              {project.script.rules.length === 0 ? (
                <div className="text-center py-12 bg-blue-50 rounded-lg border-2 border-dashed border-blue-300">
                  <div className="text-6xl mb-4">🎯</div>
                  <h4 className="text-lg font-medium text-gray-800 mb-2">ルールを作成しよう！</h4>
                  <p className="text-gray-600">
                    「もし〇〇したら→△△する」のルールでゲームを作れます
                  </p>
                </div>
              ) : (
                project.script.rules.map((rule, index) => (
                  <div
                    key={rule.id}
                    className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-800">{rule.name}</h4>
                        <div className="text-sm text-gray-500">
                          対象: {rule.targetObjectId === 'stage' ? '🌟 ゲーム全体' : `📦 ${rule.targetObjectId}`}
                        </div>
                        <div className="text-sm text-gray-400">
                          条件{rule.triggers.conditions.length}個 / アクション{rule.actions.length}個
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingRule(rule);
                            setShowRuleModal(true);
                            addDebugLog(`ルール編集開始: ${rule.name}`);
                          }}
                          className="text-blue-500 hover:text-blue-700 px-3 py-1 rounded border border-blue-300 hover:bg-blue-50 transition-colors"
                        >
                          ✏️ 編集
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('このルールを削除しますか？')) {
                              const updatedScript = { ...project.script };
                              updatedScript.rules = updatedScript.rules.filter(r => r.id !== rule.id);
                              updateProject({ script: updatedScript });
                              addDebugLog(`ルール削除: ${rule.name}`);
                            }
                          }}
                          className="text-red-500 hover:text-red-700 px-3 py-1 rounded border border-red-300 hover:bg-red-50 transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 簡易ルール編集モーダル */}
      {showRuleModal && editingRule && (
        <SimpleRuleModal
          rule={editingRule}
          onSave={(rule) => {
            const updatedScript = { ...project.script };
            const existingIndex = updatedScript.rules.findIndex(r => r.id === rule.id);
            
            const updatedRule = {
              ...rule,
              lastModified: new Date().toISOString()
            };
            
            if (existingIndex !== -1) {
              updatedScript.rules[existingIndex] = updatedRule;
              addDebugLog(`ルール更新: ${rule.name}`);
            } else {
              updatedScript.rules.push(updatedRule);
              addDebugLog(`ルール新規追加: ${rule.name}`);
            }
            
            updateProject({ script: updatedScript });
            setShowRuleModal(false);
            setEditingRule(null);
          }}
          onClose={() => {
            setShowRuleModal(false);
            setEditingRule(null);
            addDebugLog('ルール編集キャンセル');
          }}
        />
      )}
    </div>
  );
};

// 🔧 簡易ルールモーダル
interface SimpleRuleModalProps {
  rule: GameRule;
  onSave: (rule: GameRule) => void;
  onClose: () => void;
}

const SimpleRuleModal: React.FC<SimpleRuleModalProps> = ({ rule: initialRule, onSave, onClose }) => {
  const [rule, setRule] = useState<GameRule>(initialRule);

  const handleSave = () => {
    if (!rule.name.trim()) {
      alert('ルール名を入力してください');
      return;
    }
    onSave(rule);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="bg-blue-500 text-white p-4 rounded-t-xl">
          <h3 className="text-xl font-bold">
            🎯 {rule.targetObjectId === 'stage' ? '🌟 ゲーム全体' : `📦 ${rule.targetObjectId}`}のルール
          </h3>
        </div>
        
        <div className="p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">ルール名</label>
            <input
              type="text"
              value={rule.name}
              onChange={(e) => setRule({ ...rule, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: タッチで成功"
            />
          </div>
          
          <div className="text-center text-gray-600 mb-4">
            <p className="text-sm">詳細な条件・アクション設定は</p>
            <p className="text-sm">今後のアップデートで実装予定です</p>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            💾 保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScriptTab;