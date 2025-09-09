// src/components/editor/tabs/ScriptTab.tsx
// 完成版 - デバッグ削除・ルール設定連携・手軽さ重視

import React, { useState, useRef } from 'react';
import { GameProject } from '../../../types/editor/GameProject';
import { GameRule } from '../../../types/editor/GameScript';
import { CONDITIONS_LIBRARY, ACTIONS_LIBRARY } from '../../../constants/EditorLimits';

interface ScriptTabProps {
  project: GameProject;
  onProjectUpdate: (project: GameProject) => void;
}

export const ScriptTab: React.FC<ScriptTabProps> = ({ project, onProjectUpdate }) => {
  const [mode, setMode] = useState<'layout' | 'rules'>('layout');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [editingRule, setEditingRule] = useState<GameRule | null>(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [forceRender, setForceRender] = useState(0);
  
  const gamePreviewRef = useRef<HTMLDivElement>(null);

  // プロジェクト更新
  const updateProject = (updates: Partial<GameProject>) => {
    const updatedProject = {
      ...project,
      ...updates,
      lastModified: new Date().toISOString()
    };
    
    console.log('[ScriptTab] プロジェクト更新:', Object.keys(updates).join(', '));
    onProjectUpdate(updatedProject);
    setForceRender(prev => prev + 1);
  };

  // オブジェクト配置更新
  const handleObjectPositionUpdate = (objectId: string, position: { x: number; y: number }) => {
    console.log(`[ScriptTab] 配置更新: ${objectId} → (${position.x.toFixed(2)}, ${position.y.toFixed(2)})`);
    
    const updatedScript = JSON.parse(JSON.stringify(project.script));
    const existingIndex = updatedScript.layout.objects.findIndex((obj: any) => obj.objectId === objectId);
    
    if (existingIndex !== -1) {
      updatedScript.layout.objects[existingIndex].position = position;
      console.log(`[ScriptTab] 位置更新: ${objectId}`);
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
        console.log(`[ScriptTab] 新規追加: ${asset.name}`);
      }
    }
    
    updateProject({ script: updatedScript });
    setSelectedObjectId(objectId);
  };

  // 🔧 ルール設定モードに移行
  const handleObjectRuleEdit = (objectId: string) => {
    const asset = project.assets.objects.find(obj => obj.id === objectId);
    if (!asset) return;

    // 既存のルールを検索
    const existingRule = project.script.rules.find(rule => rule.targetObjectId === objectId);
    
    if (existingRule) {
      setEditingRule(existingRule);
    } else {
      // 新規ルール作成
      const newRule: GameRule = {
        id: `rule_${Date.now()}`,
        name: `${asset.name}のルール`,
        enabled: true,
        priority: project.script.rules.length + 1,
        targetObjectId: objectId,
        triggers: {
          operator: 'AND',
          conditions: []
        },
        actions: [],
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };
      setEditingRule(newRule);
    }
    
    setSelectedObjectId(objectId);
    setMode('rules');
    setShowRuleModal(true);
    console.log(`[ScriptTab] ルール編集開始: ${asset.name}`);
  };

  // 背景画像URL取得
  const getBackgroundImageUrl = () => {
    if (!project.assets.background || !project.script.layout.background.visible) {
      return null;
    }
    return project.assets.background.frames?.[0]?.dataUrl || null;
  };

  return (
    <div className="script-tab h-full flex flex-col">
      
      {/* ヘッダー */}
      <div className="flex-shrink-0 border-b-2 border-gray-300 bg-yellow-50">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex space-x-1">
              <button
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  mode === 'layout' ? 'bg-green-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setMode('layout')}
              >
                🎨 レイアウト・配置
              </button>
              <button
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  mode === 'rules' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setMode('rules')}
              >
                🎯 ルール設定
              </button>
            </div>
          </div>

          {/* ステータス表示 */}
          <div className="bg-yellow-200 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-yellow-800">状態:</span>
                <span className="ml-2 text-sm">
                  背景:{project.script.layout.background.visible ? '✓' : '✗'} | 
                  オブジェクト:{project.script.layout.objects.length}個 | 
                  ルール:{project.script.rules.length}個
                </span>
              </div>
              
              {selectedObjectId && (
                <div className="text-sm text-yellow-700">
                  選択: {project.assets.objects.find(obj => obj.id === selectedObjectId)?.name}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-auto">
        
        {/* 🎨 レイアウトモード */}
        {mode === 'layout' && (
          <div className="p-4 lg:p-6">
            <div className="flex flex-col xl:flex-row gap-6">
              
              {/* ゲームプレビューエリア */}
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
                      
                      console.log(`[ScriptTab] ドロップ: ${draggedItem.id} → (${x.toFixed(2)}, ${y.toFixed(2)})`);
                      handleObjectPositionUpdate(draggedItem.id, { x, y });
                      setDraggedItem(null);
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
                    
                    {/* レイヤー4: オブジェクト（シンプル表示） */}
                    {project.script.layout.objects.map((layoutObj, index) => {
                      const asset = project.assets.objects.find(obj => obj.id === layoutObj.objectId);
                      const isSelected = selectedObjectId === layoutObj.objectId;
                      
                      return (
                        <div
                          key={`object-${layoutObj.objectId}-${index}-${forceRender}`}
                          style={{
                            position: 'absolute',
                            left: `${layoutObj.position.x * 100}%`,
                            top: `${layoutObj.position.y * 100}%`,
                            transform: 'translate(-50%, -50%)',
                            width: '50px',
                            height: '50px',
                            zIndex: layoutObj.zIndex + 20,
                            backgroundColor: isSelected ? '#3b82f6' : '#ef4444',
                            border: `3px solid ${isSelected ? '#1d4ed8' : '#dc2626'}`,
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '24px',
                            boxShadow: isSelected 
                              ? '0 4px 16px rgba(59, 130, 246, 0.4)' 
                              : '0 2px 8px rgba(0, 0, 0, 0.2)'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log(`[ScriptTab] オブジェクトクリック → ルール設定: ${asset?.name}`);
                            handleObjectRuleEdit(layoutObj.objectId);
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
                          }}
                          draggable
                          onDragStart={(e) => {
                            setDraggedItem({ id: layoutObj.objectId, type: 'object' });
                            e.dataTransfer.effectAllowed = 'move';
                            console.log(`[ScriptTab] ドラッグ開始: ${asset?.name}`);
                          }}
                        >
                          {/* 🔧 シンプルアイコン表示（画像なし） */}
                          {index < 9 ? (index + 1).toString() : '★'}
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
                          <p className="text-gray-600 text-sm">右のリストからドラッグ&ドロップしてください</p>
                        </div>
                      </div>
                    )}
                    
                    {project.script.layout.objects.length > 0 && (
                      <div className="absolute bottom-2 left-2 right-2" style={{ zIndex: 30 }}>
                        <div className="text-center p-3 bg-black bg-opacity-75 text-white rounded-lg">
                          <div className="text-sm font-medium mb-1">💡 ヒント</div>
                          <div className="text-xs">
                            オブジェクトをクリック → ルール設定 | ドラッグ → 移動
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
              
              {/* サイドパネル */}
              <div className="w-full xl:w-80 space-y-4">
                
                {/* 背景制御 */}
                <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                  <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                    🌄 背景制御
                  </h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-700">表示:</span>
                      <button
                        onClick={() => {
                          const updatedScript = JSON.parse(JSON.stringify(project.script));
                          updatedScript.layout.background.visible = !updatedScript.layout.background.visible;
                          updateProject({ script: updatedScript });
                          console.log('[ScriptTab] 背景切り替え:', updatedScript.layout.background.visible);
                        }}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          project.script.layout.background.visible 
                            ? 'bg-green-500 text-white hover:bg-green-600' 
                            : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                        }`}
                      >
                        {project.script.layout.background.visible ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    
                    <div className="text-xs text-green-600">
                      {project.assets.background ? (
                        <>
                          📁 {project.assets.background.name}<br/>
                          📏 {project.assets.background.frames[0]?.width}×{project.assets.background.frames[0]?.height}px<br/>
                          🖼️ {project.assets.background.frames.length}フレーム
                        </>
                      ) : (
                        '❌ 背景データなし (Assetsタブで追加)'
                      )}
                    </div>
                  </div>
                </div>
                
                {/* 🔧 オブジェクト配置ガイド */}
                {project.assets.objects.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-3">
                      🎯 オブジェクト操作
                    </h4>
                    
                    <div className="space-y-2 text-sm text-blue-700">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-blue-500 rounded"></div>
                        <span>選択中（クリックでルール設定）</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-red-500 rounded"></div>
                        <span>未選択（ドラッグで移動）</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-gray-400 rounded" style={{borderStyle: 'dashed'}}></div>
                        <span>ルール未設定</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-gray-400 rounded" style={{borderStyle: 'solid'}}></div>
                        <span>ルール設定済み</span>
                      </div>
                    </div>
                    
                    <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-600">
                      💡 Assetsタブでオブジェクトを追加してから、<br/>
                      ゲーム画面にドラッグ&ドロップで配置できます
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 🎯 ルール設定モード */}
        {mode === 'rules' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">⚙️ ゲームルール設定</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedObjectId ? (
                    <>
                      対象: <span className="font-medium text-blue-600">
                        📦 {project.assets.objects.find(obj => obj.id === selectedObjectId)?.name}
                      </span>
                    </>
                  ) : (
                    'オブジェクトを選択してルールを設定'
                  )}
                </p>
              </div>
              
              {selectedObjectId && (
                <button
                  onClick={() => {
                    const asset = project.assets.objects.find(obj => obj.id === selectedObjectId);
                    if (asset) {
                      handleObjectRuleEdit(selectedObjectId);
                    }
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  ➕ ルール作成
                </button>
              )}
            </div>
            
            {/* ルール一覧 */}
            <div className="space-y-4">
              {project.script.rules.length === 0 ? (
                <div className="text-center py-12 bg-blue-50 rounded-lg border-2 border-dashed border-blue-300">
                  <div className="text-6xl mb-4">🎯</div>
                  <h4 className="text-lg font-medium text-gray-800 mb-2">ルールを作成しよう！</h4>
                  <p className="text-gray-600">
                    レイアウトモードでオブジェクトをクリックするとルール設定ができます
                  </p>
                  <div className="mt-4">
                    <button
                      onClick={() => setMode('layout')}
                      className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                      🎨 レイアウトモードに戻る
                    </button>
                  </div>
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
                          対象: {rule.targetObjectId === 'stage' ? '🌟 ゲーム全体' : 
                            <>📦 {project.assets.objects.find(obj => obj.id === rule.targetObjectId)?.name || rule.targetObjectId}</>
                          }
                        </div>
                        <div className="text-sm text-gray-400">
                          条件{rule.triggers.conditions.length}個 / アクション{rule.actions.length}個
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingRule(rule);
                            setSelectedObjectId(rule.targetObjectId);
                            setShowRuleModal(true);
                          }}
                          className="text-blue-500 hover:text-blue-700 px-3 py-1 rounded border border-blue-300 hover:bg-blue-50 transition-colors text-sm"
                        >
                          ✏️ 編集
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('このルールを削除しますか？')) {
                              const updatedScript = { ...project.script };
                              updatedScript.rules = updatedScript.rules.filter(r => r.id !== rule.id);
                              updateProject({ script: updatedScript });
                            }
                          }}
                          className="text-red-500 hover:text-red-700 px-3 py-1 rounded border border-red-300 hover:bg-red-50 transition-colors text-sm"
                        >
                          🗑️ 削除
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

      {/* 🔧 簡易ルール編集モーダル */}
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
            } else {
              updatedScript.rules.push(updatedRule);
            }
            
            updateProject({ script: updatedScript });
            setShowRuleModal(false);
            setEditingRule(null);
            console.log(`[ScriptTab] ルール保存: ${rule.name}`);
          }}
          onClose={() => {
            setShowRuleModal(false);
            setEditingRule(null);
          }}
        />
      )}
    </div>
  );
};

// 🔧 簡易ルール編集モーダル
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
            🎯 ルール設定
          </h3>
          <p className="text-blue-100 text-sm mt-1">
            {rule.targetObjectId === 'stage' ? '🌟 ゲーム全体' : `📦 ${rule.targetObjectId}`}
          </p>
        </div>
        
        <div className="p-6">
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
          
          <div className="text-center text-gray-600 mb-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium mb-2">🚧 開発中</p>
            <p className="text-xs">
              詳細な条件・アクション設定は今後のアップデートで実装予定です。<br/>
              現在はルール名の設定のみ可能です。
            </p>
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