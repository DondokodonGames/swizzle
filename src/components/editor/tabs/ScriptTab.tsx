import React, { useState, useCallback, useRef } from 'react';
import { GameProject } from '../../../types/editor/GameProject';
import { GameRule, TriggerCondition, GameAction, MovementPattern, EffectPattern } from '../../../types/editor/GameScript';
import { CONDITIONS_LIBRARY, ACTIONS_LIBRARY, MOVEMENT_PATTERNS } from '../../../constants/EditorLimits';

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
  const gamePreviewRef = useRef<HTMLDivElement>(null);

  // プロジェクト更新ヘルパー
  const updateProject = useCallback((updates: Partial<GameProject>) => {
    onProjectUpdate({ ...project, ...updates });
  }, [project, onProjectUpdate]);

  // レイアウトモード: オブジェクト配置
  const handleObjectPositionUpdate = useCallback((objectId: string, position: { x: number; y: number }) => {
    const updatedScript = { ...project.script };
    const objectIndex = updatedScript.layout.objects.findIndex(obj => obj.objectId === objectId);
    
    if (objectIndex !== -1) {
      updatedScript.layout.objects[objectIndex].position = position;
      updateProject({ script: updatedScript });
    }
  }, [project.script, updateProject]);

  // ルール追加
  const handleAddRule = useCallback(() => {
    const now = new Date().toISOString();
    const newRule: GameRule = {
      id: `rule_${Date.now()}`,
      name: '新しいルール',
      enabled: true,
      priority: project.script.rules.length + 1,
      targetObjectId: 'stage',
      triggers: {
        operator: 'AND',
        conditions: []
      },
      actions: [],
      createdAt: now,
      lastModified: now // ★ 修正: lastModified プロパティを追加
    };
    
    setEditingRule(newRule);
    setShowRuleModal(true);
  }, [project.script.rules.length]);

  // ルール保存
  const handleSaveRule = useCallback((rule: GameRule) => {
    const updatedScript = { ...project.script };
    const existingIndex = updatedScript.rules.findIndex(r => r.id === rule.id);
    
    // 保存時にlastModifiedを更新
    const updatedRule = {
      ...rule,
      lastModified: new Date().toISOString()
    };
    
    if (existingIndex !== -1) {
      updatedScript.rules[existingIndex] = updatedRule;
    } else {
      updatedScript.rules.push(updatedRule);
    }
    
    // ★ 修正: 統計更新（完全な型に対応）
    updatedScript.statistics = {
      totalRules: updatedScript.rules.length,
      totalConditions: updatedScript.rules.reduce((sum, r) => sum + r.triggers.conditions.length, 0),
      totalActions: updatedScript.rules.reduce((sum, r) => sum + r.actions.length, 0),
      complexityScore: Math.min(100, updatedScript.rules.length * 10),
      
      // 追加のプロパティ
      usedTriggerTypes: [...new Set(updatedScript.rules.flatMap(r => r.triggers.conditions.map(c => c.type)))],
      usedActionTypes: [...new Set(updatedScript.rules.flatMap(r => r.actions.map(a => a.type)))],
      flagCount: updatedScript.flags.length,
      estimatedCPUUsage: updatedScript.rules.length > 20 ? 'high' : updatedScript.rules.length > 10 ? 'medium' : 'low',
      estimatedMemoryUsage: updatedScript.rules.length * 0.5, // MB概算
      maxConcurrentEffects: Math.max(0, ...updatedScript.rules.map(r => 
        r.actions.filter(a => a.type === 'effect').length
      ))
    };
    
    updateProject({ script: updatedScript });
    setShowRuleModal(false);
    setEditingRule(null);
  }, [project.script, updateProject]);

  // ルール削除
  const handleDeleteRule = useCallback((ruleId: string) => {
    const updatedScript = { ...project.script };
    updatedScript.rules = updatedScript.rules.filter(r => r.id !== ruleId);
    
    // 統計更新
    updatedScript.statistics = {
      totalRules: updatedScript.rules.length,
      totalConditions: updatedScript.rules.reduce((sum, r) => sum + r.triggers.conditions.length, 0),
      totalActions: updatedScript.rules.reduce((sum, r) => sum + r.actions.length, 0),
      complexityScore: Math.min(100, updatedScript.rules.length * 10),
      usedTriggerTypes: [...new Set(updatedScript.rules.flatMap(r => r.triggers.conditions.map(c => c.type)))],
      usedActionTypes: [...new Set(updatedScript.rules.flatMap(r => r.actions.map(a => a.type)))],
      flagCount: updatedScript.flags.length,
      estimatedCPUUsage: updatedScript.rules.length > 20 ? 'high' : updatedScript.rules.length > 10 ? 'medium' : 'low',
      estimatedMemoryUsage: updatedScript.rules.length * 0.5,
      maxConcurrentEffects: Math.max(0, ...updatedScript.rules.map(r => 
        r.actions.filter(a => a.type === 'effect').length
      ))
    };
    
    updateProject({ script: updatedScript });
  }, [project.script, updateProject]);

  // ドラッグ&ドロップ処理（ゲーム要素配置）
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    if (mode !== 'layout' || !draggedItem) return;
    
    const rect = gamePreviewRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    // 範囲制限（0-1）
    const clampedX = Math.max(0, Math.min(1, x));
    const clampedY = Math.max(0, Math.min(1, y));
    
    handleObjectPositionUpdate(draggedItem.id, { x: clampedX, y: clampedY });
    setDraggedItem(null);
  }, [mode, draggedItem, handleObjectPositionUpdate]);

  return (
    <div className="script-tab h-full flex flex-col">
      {/* タブ切り替え */}
      <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
        <button
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            mode === 'layout' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setMode('layout')}
        >
          🎨 レイアウト
        </button>
        <button
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            mode === 'rules' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setMode('rules')}
        >
          ⚙️ ルール設定
        </button>
      </div>

      {/* レイアウトモード */}
      {mode === 'layout' && (
        <div className="flex flex-1 gap-4">
          {/* ゲームプレビューエリア */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">🎮 ゲーム画面</h3>
            <div
              ref={gamePreviewRef}
              className="relative w-full bg-gradient-to-b from-sky-200 to-green-200 rounded-xl border-2 border-gray-300 overflow-hidden"
              style={{ aspectRatio: '9/16', minHeight: '400px' }}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {/* 背景表示 */}
              {project.script.layout.background.visible && project.assets.background && (
                <div 
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: project.assets.background.frames[0]?.dataUrl 
                      ? `url(${project.assets.background.frames[0].dataUrl})` 
                      : undefined
                  }}
                />
              )}
              
              {/* オブジェクト表示 */}
              {project.script.layout.objects.map((layoutObj, index) => {
                const asset = project.assets.objects.find(obj => obj.id === layoutObj.objectId);
                if (!asset || !asset.frames[0]) return null;
                
                return (
                  <div
                    key={layoutObj.objectId}
                    className={`absolute cursor-move border-2 border-dashed transition-all ${
                      selectedObjectId === layoutObj.objectId 
                        ? 'border-blue-500 shadow-lg' 
                        : 'border-transparent hover:border-blue-300'
                    }`}
                    style={{
                      left: `${layoutObj.position.x * 100}%`,
                      top: `${layoutObj.position.y * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      zIndex: layoutObj.zIndex
                    }}
                    onClick={() => setSelectedObjectId(layoutObj.objectId)}
                    draggable
                    onDragStart={(e) => {
                      setDraggedItem({ id: layoutObj.objectId, type: 'object' });
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                  >
                    <img
                      src={asset.frames[0].dataUrl}
                      alt={asset.name}
                      className="max-w-16 max-h-16 object-contain"
                      style={{
                        transform: `scale(${layoutObj.scale.x}, ${layoutObj.scale.y}) rotate(${layoutObj.rotation}deg)`
                      }}
                    />
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs bg-black bg-opacity-70 text-white px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      {asset.name}
                    </div>
                  </div>
                );
              })}
              
              {/* グリッドヘルパー（開発時のみ表示） */}
              <div className="absolute inset-0 pointer-events-none opacity-10">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={`h-${i}`} className="absolute border-t border-gray-400" style={{ top: `${i * 10}%`, width: '100%' }} />
                ))}
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={`v-${i}`} className="absolute border-l border-gray-400" style={{ left: `${i * 16.67}%`, height: '100%' }} />
                ))}
              </div>
            </div>
          </div>
          
          {/* オブジェクト設定パネル */}
          <div className="w-80 bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3">🔧 オブジェクト設定</h4>
            
            {selectedObjectId ? (
              <div className="space-y-4">
                {(() => {
                  const selectedObj = project.script.layout.objects.find(obj => obj.objectId === selectedObjectId);
                  const selectedAsset = project.assets.objects.find(obj => obj.id === selectedObjectId);
                  
                  if (!selectedObj || !selectedAsset) return <p className="text-gray-500">オブジェクトが見つかりません</p>;
                  
                  return (
                    <>
                      <div className="text-center">
                        <img 
                          src={selectedAsset.frames[0]?.dataUrl} 
                          alt={selectedAsset.name}
                          className="w-16 h-16 mx-auto object-contain border rounded-lg"
                        />
                        <p className="mt-2 font-medium">{selectedAsset.name}</p>
                      </div>
                      
                      {/* 位置設定 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">位置</label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-500">X座標</label>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.01"
                              value={selectedObj.position.x}
                              onChange={(e) => handleObjectPositionUpdate(selectedObjectId, {
                                x: parseFloat(e.target.value),
                                y: selectedObj.position.y
                              })}
                              className="w-full"
                            />
                            <span className="text-xs text-gray-500">{Math.round(selectedObj.position.x * 100)}%</span>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Y座標</label>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.01"
                              value={selectedObj.position.y}
                              onChange={(e) => handleObjectPositionUpdate(selectedObjectId, {
                                x: selectedObj.position.x,
                                y: parseFloat(e.target.value)
                              })}
                              className="w-full"
                            />
                            <span className="text-xs text-gray-500">{Math.round(selectedObj.position.y * 100)}%</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* 初期状態設定 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">初期状態</label>
                        <div className="space-y-2">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedObj.initialState.visible}
                              onChange={(e) => {
                                const updatedScript = { ...project.script };
                                const objIndex = updatedScript.layout.objects.findIndex(obj => obj.objectId === selectedObjectId);
                                if (objIndex !== -1) {
                                  updatedScript.layout.objects[objIndex].initialState.visible = e.target.checked;
                                  updateProject({ script: updatedScript });
                                }
                              }}
                              className="mr-2"
                            />
                            <span className="text-sm">最初から表示</span>
                          </label>
                          
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedObj.initialState.autoStart}
                              onChange={(e) => {
                                const updatedScript = { ...project.script };
                                const objIndex = updatedScript.layout.objects.findIndex(obj => obj.objectId === selectedObjectId);
                                if (objIndex !== -1) {
                                  updatedScript.layout.objects[objIndex].initialState.autoStart = e.target.checked;
                                  updateProject({ script: updatedScript });
                                }
                              }}
                              className="mr-2"
                            />
                            <span className="text-sm">アニメ自動開始</span>
                          </label>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-2">👆</div>
                <p>オブジェクトをタップして<br />設定を変更できます</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ルールモード */}
      {mode === 'rules' && (
        <div className="flex-1">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">⚙️ ゲームルール</h3>
            <button
              onClick={handleAddRule}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              ➕ ルール追加
            </button>
          </div>
          
          {/* 統計表示 */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{project.script.statistics?.totalRules || 0}</div>
              <div className="text-sm text-blue-700">ルール数</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{project.script.statistics?.totalConditions || 0}</div>
              <div className="text-sm text-green-700">条件数</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">{project.script.statistics?.totalActions || 0}</div>
              <div className="text-sm text-purple-700">アクション数</div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-600">{project.script.statistics?.complexityScore || 0}</div>
              <div className="text-sm text-orange-700">複雑度</div>
            </div>
          </div>
          
          {/* ルール一覧 */}
          <div className="space-y-3">
            {project.script.rules.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-6xl mb-4">🎯</div>
                <h4 className="text-lg font-medium text-gray-800 mb-2">ルールがありません</h4>
                <p className="text-gray-600 mb-4">ゲームを動かすためのルールを追加しましょう！</p>
                <button
                  onClick={handleAddRule}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  最初のルールを作成
                </button>
              </div>
            ) : (
              project.script.rules.map((rule) => (
                <div key={rule.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={(e) => {
                            const updatedScript = { ...project.script };
                            const ruleIndex = updatedScript.rules.findIndex(r => r.id === rule.id);
                            if (ruleIndex !== -1) {
                              updatedScript.rules[ruleIndex].enabled = e.target.checked;
                              updateProject({ script: updatedScript });
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="font-medium text-gray-800">{rule.name}</span>
                      </label>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">優先度: {rule.priority}</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingRule(rule);
                          setShowRuleModal(true);
                        }}
                        className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-red-500 hover:text-red-700 text-sm font-medium"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <p><strong>条件:</strong> {rule.triggers.conditions.length}個 ({rule.triggers.operator})</p>
                    <p><strong>アクション:</strong> {rule.actions.length}個</p>
                    {rule.targetObjectId && rule.targetObjectId !== 'stage' && (
                      <p><strong>対象:</strong> {project.assets.objects.find(obj => obj.id === rule.targetObjectId)?.name || rule.targetObjectId}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ルール編集モーダル */}
      {showRuleModal && editingRule && (
        <RuleEditorModal
          rule={editingRule}
          project={project}
          onSave={handleSaveRule}
          onClose={() => {
            setShowRuleModal(false);
            setEditingRule(null);
          }}
        />
      )}
    </div>
  );
};

// ルール編集モーダルコンポーネント
interface RuleEditorModalProps {
  rule: GameRule;
  project: GameProject;
  onSave: (rule: GameRule) => void;
  onClose: () => void;
}

const RuleEditorModal: React.FC<RuleEditorModalProps> = ({ rule: initialRule, project, onSave, onClose }) => {
  const [rule, setRule] = useState<GameRule>(initialRule);

  const handleSave = () => {
    onSave(rule);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800">🔧 ルール編集</h3>
        </div>
        
        <div className="p-6">
          {/* ルール基本情報 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">ルール名</label>
            <input
              type="text"
              value={rule.name}
              onChange={(e) => setRule({ ...rule, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ルール名を入力"
            />
          </div>
          
          {/* 対象オブジェクト選択 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">対象オブジェクト</label>
            <select
              value={rule.targetObjectId}
              onChange={(e) => setRule({ ...rule, targetObjectId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="stage">🎮 ゲーム全体</option>
              {project.assets.objects.map((obj) => (
                <option key={obj.id} value={obj.id}>
                  {obj.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* 条件設定 */}
          <div className="mb-6">
            <h4 className="text-lg font-medium text-gray-800 mb-3">🎯 発動条件</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium">条件の組み合わせ:</span>
                <select
                  value={rule.triggers.operator}
                  onChange={(e) => setRule({
                    ...rule,
                    triggers: { ...rule.triggers, operator: e.target.value as 'AND' | 'OR' }
                  })}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="AND">すべての条件 (AND)</option>
                  <option value="OR">いずれかの条件 (OR)</option>
                </select>
              </div>
              
              {/* 条件ライブラリ */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {CONDITIONS_LIBRARY.map((condition) => (
                  <button
                    key={condition.type}
                    onClick={() => {
                      const newCondition: TriggerCondition = {
                        type: condition.type as any,
                        target: 'self'
                      } as any;
                      
                      setRule({
                        ...rule,
                        triggers: {
                          ...rule.triggers,
                          conditions: [...rule.triggers.conditions, newCondition]
                        }
                      });
                    }}
                    className={`p-3 text-center rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 transition-colors ${condition.color}`}
                  >
                    <div className="text-2xl mb-1">{condition.icon}</div>
                    <div className="text-xs font-medium">{condition.label}</div>
                  </button>
                ))}
              </div>
              
              {/* 追加された条件一覧 */}
              <div className="space-y-2">
                {rule.triggers.conditions.map((condition, index) => (
                  <div key={index} className="flex items-center gap-2 bg-white p-2 rounded border">
                    <span className="text-sm">
                      {CONDITIONS_LIBRARY.find(c => c.type === condition.type)?.label || condition.type}
                    </span>
                    <button
                      onClick={() => {
                        const newConditions = rule.triggers.conditions.filter((_, i) => i !== index);
                        setRule({
                          ...rule,
                          triggers: { ...rule.triggers, conditions: newConditions }
                        });
                      }}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* アクション設定 */}
          <div className="mb-6">
            <h4 className="text-lg font-medium text-gray-800 mb-3">⚡ アクション</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              {/* アクションライブラリ */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {ACTIONS_LIBRARY.map((action) => (
                  <button
                    key={action.type}
                    onClick={() => {
                      const newAction: GameAction = {
                        type: action.type as any
                      } as any;
                      
                      setRule({
                        ...rule,
                        actions: [...rule.actions, newAction]
                      });
                    }}
                    className={`p-3 text-center rounded-lg border-2 border-dashed border-gray-300 hover:border-green-500 transition-colors ${action.color}`}
                  >
                    <div className="text-xl mb-1">{action.icon}</div>
                    <div className="text-xs font-medium">{action.label}</div>
                  </button>
                ))}
              </div>
              
              {/* 追加されたアクション一覧 */}
              <div className="space-y-2">
                {rule.actions.map((action, index) => (
                  <div key={index} className="flex items-center gap-2 bg-white p-2 rounded border">
                    <span className="text-sm">
                      {ACTIONS_LIBRARY.find(a => a.type === action.type)?.label || action.type}
                    </span>
                    <button
                      onClick={() => {
                        const newActions = rule.actions.filter((_, i) => i !== index);
                        setRule({ ...rule, actions: newActions });
                      }}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* モーダルフッター */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScriptTab;