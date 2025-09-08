// src/components/editor/tabs/ScriptTab.tsx
// 現行動作版 + RuleEngine統合 + ビジュアル強化版 + 配置システム修復・初期条件連携

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { GameProject } from '../../../types/editor/GameProject';
import { GameRule, TriggerCondition, GameAction, MovementPattern, EffectPattern, createDefaultInitialState, syncInitialStateWithLayout } from '../../../types/editor/GameScript';
import { CONDITIONS_LIBRARY, ACTIONS_LIBRARY, MOVEMENT_PATTERNS } from '../../../constants/EditorLimits';
import RuleEngine from '../../../services/rule-engine/RuleEngine';

interface ScriptTabProps {
  project: GameProject;
  onProjectUpdate: (project: GameProject) => void;
}

export const ScriptTab: React.FC<ScriptTabProps> = ({ project, onProjectUpdate }) => {
  const [mode, setMode] = useState<'layout' | 'rules'>('layout'); // 🔧 デフォルトをlayoutに変更
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<GameRule | null>(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [ruleTestMode, setRuleTestMode] = useState(false);
  const [showInitialStateEditor, setShowInitialStateEditor] = useState(false); // 🔧 追加
  const gamePreviewRef = useRef<HTMLDivElement>(null);

  // 🔧 RuleEngine インスタンス
  const ruleEngine = useMemo(() => new RuleEngine(), []);

  // プロジェクト更新ヘルパー
  const updateProject = useCallback((updates: Partial<GameProject>) => {
    onProjectUpdate({ ...project, ...updates });
  }, [project, onProjectUpdate]);

  // 🔧 スクリプト更新時にRuleEngineも同期
  const updateScript = useCallback((updates: Partial<typeof project.script>) => {
    const newScript = { ...project.script, ...updates };
    
    // RuleEngineにルールを同期
    if (updates.rules) {
      ruleEngine.reset();
      updates.rules.forEach(rule => ruleEngine.addRule(rule));
    }
    
    updateProject({ 
      script: newScript,
      lastModified: new Date().toISOString()
    });
  }, [project, updateProject, ruleEngine]);

  // 🔧 初期条件の取得・作成ヘルパー
  const ensureInitialState = useCallback(() => {
    if (!project.script.initialState) {
      console.log('⚠️ 初期条件なし→デフォルト作成');
      const defaultInitialState = createDefaultInitialState();
      const syncedInitialState = syncInitialStateWithLayout(defaultInitialState, project.script.layout);
      
      updateScript({
        initialState: syncedInitialState
      });
      
      return syncedInitialState;
    }
    return project.script.initialState;
  }, [project.script, updateScript]);

  // 🔧 強化: オブジェクト配置更新（初期条件連携）
  const handleObjectPositionUpdate = useCallback((objectId: string, position: { x: number; y: number }) => {
    console.log('🔧 オブジェクト配置更新:', objectId, position);
    
    const updatedScript = { ...project.script };
    
    // 1. レイアウト配置データ更新
    const layoutObjectIndex = updatedScript.layout.objects.findIndex(obj => obj.objectId === objectId);
    if (layoutObjectIndex !== -1) {
      updatedScript.layout.objects[layoutObjectIndex].position = position;
    } else {
      // 新規オブジェクトの場合はレイアウトに追加
      const asset = project.assets.objects.find(obj => obj.id === objectId);
      if (asset) {
        updatedScript.layout.objects.push({
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
        });
      }
    }
    
    // 2. 初期条件の確保・同期更新
    if (!updatedScript.initialState) {
      updatedScript.initialState = createDefaultInitialState();
    }
    
    const initialObjectIndex = updatedScript.initialState.layout.objects.findIndex(obj => obj.id === objectId);
    if (initialObjectIndex !== -1) {
      // 既存の初期条件を更新
      updatedScript.initialState.layout.objects[initialObjectIndex].position = position;
    } else {
      // 新規オブジェクトの初期条件を追加
      const asset = project.assets.objects.find(obj => obj.id === objectId);
      if (asset) {
        updatedScript.initialState.layout.objects.push({
          id: objectId,
          position: position,
          visible: true,
          scale: { x: 1, y: 1 },
          rotation: 0,
          zIndex: updatedScript.layout.objects.length,
          animationIndex: 0,
          animationSpeed: 12,
          autoStart: false
        });
      }
    }
    
    // 3. 統計情報更新
    updatedScript.statistics = {
      ...updatedScript.statistics,
      totalRules: updatedScript.rules.length,
      totalConditions: updatedScript.rules.reduce((sum, r) => sum + r.triggers.conditions.length, 0),
      totalActions: updatedScript.rules.reduce((sum, r) => sum + r.actions.length, 0)
    };
    
    updateProject({ script: updatedScript });
    
    console.log('✅ 配置更新完了 - レイアウト・初期条件両方同期');
  }, [project, updateProject]);

  // 🔧 新規: アセットからのオブジェクト追加
  const handleAddObjectToLayout = useCallback((assetId: string, position?: { x: number; y: number }) => {
    console.log('➕ オブジェクトをレイアウトに追加:', assetId);
    
    const asset = project.assets.objects.find(obj => obj.id === assetId);
    if (!asset) {
      console.warn('アセットが見つかりません:', assetId);
      return;
    }
    
    // デフォルト配置位置
    const defaultPosition = position || {
      x: 0.3 + (Math.random() * 0.4), // 0.3-0.7の範囲
      y: 0.3 + (Math.random() * 0.4)  // 0.3-0.7の範囲
    };
    
    handleObjectPositionUpdate(assetId, defaultPosition);
  }, [project.assets.objects, handleObjectPositionUpdate]);

  // 🔧 新規: オブジェクト初期状態更新
  const handleObjectInitialStateUpdate = useCallback((objectId: string, updates: Partial<{
    visible: boolean;
    scale: { x: number; y: number };
    rotation: number;
    animationIndex: number;
    animationSpeed: number;
    autoStart: boolean;
  }>) => {
    console.log('🔧 オブジェクト初期状態更新:', objectId, updates);
    
    const updatedScript = { ...project.script };
    
    // 初期条件の確保
    if (!updatedScript.initialState) {
      updatedScript.initialState = createDefaultInitialState();
    }
    
    const initialObjectIndex = updatedScript.initialState.layout.objects.findIndex(obj => obj.id === objectId);
    if (initialObjectIndex !== -1) {
      updatedScript.initialState.layout.objects[initialObjectIndex] = {
        ...updatedScript.initialState.layout.objects[initialObjectIndex],
        ...updates
      };
    }
    
    // レイアウトの同期（initialStateがある場合）
    const layoutObjectIndex = updatedScript.layout.objects.findIndex(obj => obj.objectId === objectId);
    if (layoutObjectIndex !== -1 && updates.visible !== undefined) {
      updatedScript.layout.objects[layoutObjectIndex].initialState.visible = updates.visible;
      if (updates.animationIndex !== undefined) {
        updatedScript.layout.objects[layoutObjectIndex].initialState.animation = updates.animationIndex;
      }
      if (updates.animationSpeed !== undefined) {
        updatedScript.layout.objects[layoutObjectIndex].initialState.animationSpeed = updates.animationSpeed;
      }
      if (updates.autoStart !== undefined) {
        updatedScript.layout.objects[layoutObjectIndex].initialState.autoStart = updates.autoStart;
      }
    }
    
    updateProject({ script: updatedScript });
  }, [project.script, updateProject]);

  // レイアウトモード: オブジェクト配置（既存のまま使用）
  // [既存のhandleObjectPositionUpdateは上で強化版に置き換え済み]

  // ルール追加
  const handleAddRule = useCallback(() => {
    const now = new Date().toISOString();
    const newRule: GameRule = {
      id: `rule_${Date.now()}`,
      name: '新しいルール',
      enabled: true,
      priority: project.script.rules.length + 1,
      targetObjectId: selectedObjectId || 'stage',
      triggers: {
        operator: 'AND',
        conditions: []
      },
      actions: [],
      createdAt: now,
      lastModified: now
    };
    
    setEditingRule(newRule);
    setShowRuleModal(true);
  }, [project.script.rules.length, selectedObjectId]);

  // ルール保存（RuleEngine統合版）
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
      ruleEngine.updateRule(updatedRule); // 🔧 RuleEngine同期
    } else {
      updatedScript.rules.push(updatedRule);
      ruleEngine.addRule(updatedRule); // 🔧 RuleEngine同期
    }
    
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
    setShowRuleModal(false);
    setEditingRule(null);
  }, [project.script, updateProject, ruleEngine]);

  // ルール削除（RuleEngine統合版）
  const handleDeleteRule = useCallback((ruleId: string) => {
    if (!confirm('このルールを削除しますか？')) return;
    
    const updatedScript = { ...project.script };
    updatedScript.rules = updatedScript.rules.filter(r => r.id !== ruleId);
    
    ruleEngine.removeRule(ruleId); // 🔧 RuleEngine同期
    
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
  }, [project.script, updateProject, ruleEngine]);

  // 🔧 ルールテスト機能
  const handleTestRules = useCallback(() => {
    console.log('🎮 ルールテスト開始');
    setRuleTestMode(true);
    
    // ダミーのコンテキストでテスト
    const testContext = {
      gameState: { isPlaying: true, score: 0, timeElapsed: 0, flags: new Map() },
      objects: new Map(),
      events: [{ type: 'touch', timestamp: Date.now(), data: { x: 100, y: 100, target: 'stage' } }],
      canvas: { width: 360, height: 640 }
    };
    
    const results = ruleEngine.evaluateAndExecuteRules(testContext);
    console.log('ルールテスト結果:', results);
    
    setTimeout(() => setRuleTestMode(false), 2000);
  }, [ruleEngine]);

  // 🔧 ルール有効/無効切り替え（RuleEngine統合版）
  const handleToggleRule = useCallback((ruleId: string) => {
    const updatedScript = { ...project.script };
    const ruleIndex = updatedScript.rules.findIndex(r => r.id === ruleId);
    
    if (ruleIndex !== -1) {
      updatedScript.rules[ruleIndex].enabled = !updatedScript.rules[ruleIndex].enabled;
      ruleEngine.updateRule(updatedScript.rules[ruleIndex]); // 🔧 RuleEngine同期
      updateProject({ script: updatedScript });
    }
  }, [project.script, updateProject, ruleEngine]);

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
    
    console.log('🎯 ドロップ:', draggedItem, { x: clampedX, y: clampedY });
    
    if (draggedItem.type === 'object') {
      handleObjectPositionUpdate(draggedItem.id, { x: clampedX, y: clampedY });
    } else if (draggedItem.type === 'asset') {
      // アセットパネルからのドロップ
      handleAddObjectToLayout(draggedItem.id, { x: clampedX, y: clampedY });
    }
    
    setDraggedItem(null);
  }, [mode, draggedItem, handleObjectPositionUpdate, handleAddObjectToLayout]);

  // 🔧 条件・アクションの視覚的フォーマット（改良版）
  const formatConditionVisual = useCallback((condition: TriggerCondition): { icon: string; text: string; color: string } => {
    const conditionInfo = CONDITIONS_LIBRARY.find(c => c.type === condition.type);
    const icon = conditionInfo?.icon || '❓';
    const color = conditionInfo?.color || 'bg-gray-100';
    
    switch (condition.type) {
      case 'touch':
        return { icon, text: `${condition.target}をタッチ`, color };
      case 'time':
        return { icon, text: `${(condition as any).seconds || 0}秒経過`, color };
      case 'flag':
        return { icon, text: `${(condition as any).flagId}フラグ${(condition as any).condition}`, color };
      case 'collision':
        return { icon, text: `${condition.target}と衝突`, color };
      default:
        return { icon, text: condition.type, color };
    }
  }, []);

  const formatActionVisual = useCallback((action: GameAction): { icon: string; text: string; color: string } => {
    const actionInfo = ACTIONS_LIBRARY.find(a => a.type === action.type);
    const icon = actionInfo?.icon || '❓';
    const color = actionInfo?.color || 'bg-gray-100';
    
    switch (action.type) {
      case 'addScore':
        return { icon, text: `+${(action as any).points || 10}点`, color };
      case 'success':
        return { icon, text: 'ゲーム成功', color };
      case 'failure':
        return { icon, text: 'ゲーム失敗', color };
      case 'setFlag':
        return { icon, text: `${(action as any).flagId}=${(action as any).value}`, color };
      case 'playSound':
        return { icon, text: '音声再生', color };
      case 'showMessage':
        return { icon, text: `"${(action as any).text || 'メッセージ'}"`, color };
      default:
        return { icon, text: action.type, color };
    }
  }, []);

  return (
    <div className="script-tab h-full flex flex-col">
      {/* タブ切り替え + RuleEngineステータス + 初期条件状態 */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white p-4">
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

          {/* 🔧 RuleEngineステータス + 初期条件状態表示 */}
          <div className="flex items-center gap-4">
            <div className="text-xs text-gray-500">
              Engine: <span className="text-green-600 font-medium">Ready</span>
            </div>
            <div className="text-xs text-gray-500">
              初期条件: <span className={`font-medium ${project.script.initialState ? 'text-green-600' : 'text-orange-600'}`}>
                {project.script.initialState ? '設定済み' : '未設定'}
              </span>
            </div>
            {mode === 'rules' && (
              <button
                onClick={handleTestRules}
                disabled={ruleTestMode || project.script.rules.length === 0}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  ruleTestMode
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {ruleTestMode ? '⚡ テスト中...' : '🧪 ルールテスト'}
              </button>
            )}
            {mode === 'layout' && (
              <button
                onClick={() => setShowInitialStateEditor(!showInitialStateEditor)}
                className="px-3 py-1 rounded text-sm font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
              >
                ⚙️ 初期条件
              </button>
            )}
          </div>
        </div>

        {/* 統計情報（強化版） */}
        <div className="grid grid-cols-5 gap-4">
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
          <div className="bg-indigo-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-indigo-600">{project.script.layout.objects.length}</div>
            <div className="text-sm text-indigo-700">配置数</div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-auto">
        
        {/* 🔧 強化: レイアウトモード（配置システム修復版） */}
        {mode === 'layout' && (
          <div className="flex flex-1 gap-4 p-6">
            {/* ゲームプレビューエリア */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-800">🎮 ゲーム画面</h3>
                <div className="text-sm text-gray-600">
                  オブジェクトをドラッグして配置してください
                </div>
              </div>
              
              <div
                ref={gamePreviewRef}
                className="relative w-full bg-gradient-to-b from-sky-200 to-green-200 rounded-xl border-2 border-gray-300 overflow-hidden cursor-crosshair"
                style={{ aspectRatio: '9/16', minHeight: '400px' }}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {/* 背景表示 */}
                {project.script.layout.background.visible && project.assets.background && (
                  <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: project.assets.background.frames?.[0]?.dataUrl 
                        ? `url(${project.assets.background.frames[0].dataUrl})` 
                        : 'linear-gradient(to bottom, #87CEEB, #90EE90)'
                    }}
                  />
                )}
                
                {/* 🔧 配置オブジェクト表示（初期条件反映版） */}
                {project.script.layout.objects.map((layoutObj, index) => {
                  const asset = project.assets.objects.find(obj => obj.id === layoutObj.objectId);
                  const initialState = project.script.initialState?.layout.objects.find(obj => obj.id === layoutObj.objectId);
                  
                  if (!asset) {
                    return (
                      <div
                        key={`placeholder-${index}`}
                        className={`absolute cursor-move border-2 border-dashed transition-all bg-gray-200 rounded flex items-center justify-center ${
                          selectedObjectId === layoutObj.objectId 
                            ? 'border-blue-500 shadow-lg' 
                            : 'border-gray-400 hover:border-blue-300'
                        }`}
                        style={{
                          left: `${layoutObj.position.x * 100}%`,
                          top: `${layoutObj.position.y * 100}%`,
                          transform: 'translate(-50%, -50%)',
                          zIndex: layoutObj.zIndex,
                          width: '64px',
                          height: '64px',
                          opacity: initialState?.visible !== false ? 1 : 0.3
                        }}
                        onClick={() => setSelectedObjectId(layoutObj.objectId)}
                        draggable
                        onDragStart={(e) => {
                          setDraggedItem({ id: layoutObj.objectId, type: 'object' });
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                      >
                        <span className="text-xs text-gray-600">Missing Asset</span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={layoutObj.objectId}
                      className={`absolute cursor-move border-2 border-dashed transition-all ${
                        selectedObjectId === layoutObj.objectId 
                          ? 'border-blue-500 shadow-lg bg-blue-50' 
                          : 'border-transparent hover:border-blue-300 hover:bg-blue-50'
                      }`}
                      style={{
                        left: `${layoutObj.position.x * 100}%`,
                        top: `${layoutObj.position.y * 100}%`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: layoutObj.zIndex,
                        opacity: initialState?.visible !== false ? 1 : 0.3
                      }}
                      onClick={() => setSelectedObjectId(layoutObj.objectId)}
                      draggable
                      onDragStart={(e) => {
                        setDraggedItem({ id: layoutObj.objectId, type: 'object' });
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                    >
                      {asset.frames?.[0]?.dataUrl ? (
                        <img
                          src={asset.frames[0].dataUrl}
                          alt={asset.name}
                          className="max-w-16 max-h-16 object-contain pointer-events-none"
                          style={{
                            transform: `scale(${layoutObj.scale.x}, ${layoutObj.scale.y}) rotate(${layoutObj.rotation}deg)`
                          }}
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-300 rounded flex items-center justify-center">
                          <span className="text-xs text-gray-600">{asset.name}</span>
                        </div>
                      )}
                      
                      {/* 選択状態の表示 */}
                      {selectedObjectId === layoutObj.objectId && (
                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                          {asset.name}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* 🔧 アセットライブラリからドロップ可能なオブジェクト表示 */}
                {project.assets.objects.length > 0 && project.script.layout.objects.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center p-6 bg-white bg-opacity-90 rounded-lg max-w-sm">
                      <div className="text-4xl mb-2">🎯</div>
                      <h4 className="font-medium text-gray-800 mb-2">オブジェクトを配置しよう</h4>
                      <p className="text-gray-600 mb-3 text-sm">
                        右のパネルからオブジェクトをドラッグして、<br />
                        ゲーム画面に配置してください
                      </p>
                      <div className="text-xs text-gray-500">
                        配置後にルールを設定できます
                      </div>
                    </div>
                  </div>
                )}
                
                {/* アセットなしの場合 */}
                {project.assets.objects.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center p-6 bg-white bg-opacity-90 rounded-lg">
                      <div className="text-4xl mb-2">📁</div>
                      <p className="text-gray-600 mb-3">アセットタブでオブジェクトを追加してください</p>
                      <div className="text-xs text-gray-500">
                        Assets タブ → オブジェクト追加 → ここで配置
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* 🔧 強化: 右サイドパネル（オブジェクト管理 + 初期条件設定） */}
            <div className="w-80 space-y-4">
              
              {/* オブジェクト設定パネル */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  🔧 オブジェクト設定
                  {selectedObjectId && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      選択中
                    </span>
                  )}
                </h4>
                
                {selectedObjectId ? (
                  <div className="space-y-4">
                    {(() => {
                      const selectedObj = project.script.layout.objects.find(obj => obj.objectId === selectedObjectId);
                      const selectedAsset = project.assets.objects.find(obj => obj.id === selectedObjectId);
                      const initialState = project.script.initialState?.layout.objects.find(obj => obj.id === selectedObjectId);
                      
                      if (!selectedObj) {
                        return <p className="text-gray-500">オブジェクトが見つかりません</p>;
                      }
                      
                      return (
                        <>
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
                                  onChange={(e) => {
                                    const newX = parseFloat(e.target.value);
                                    handleObjectPositionUpdate(selectedObjectId, {
                                      x: newX,
                                      y: selectedObj.position.y
                                    });
                                  }}
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
                                  onChange={(e) => {
                                    const newY = parseFloat(e.target.value);
                                    handleObjectPositionUpdate(selectedObjectId, {
                                      x: selectedObj.position.x,
                                      y: newY
                                    });
                                  }}
                                  className="w-full"
                                />
                                <span className="text-xs text-gray-500">{Math.round(selectedObj.position.y * 100)}%</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* 🔧 強化: 初期状態設定 */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">初期状態</label>
                            <div className="space-y-2">
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={initialState?.visible !== false}
                                  onChange={(e) => {
                                    handleObjectInitialStateUpdate(selectedObjectId, {
                                      visible: e.target.checked
                                    });
                                  }}
                                  className="mr-2"
                                />
                                <span className="text-sm">最初から表示</span>
                              </label>
                              
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={initialState?.autoStart || false}
                                  onChange={(e) => {
                                    handleObjectInitialStateUpdate(selectedObjectId, {
                                      autoStart: e.target.checked
                                    });
                                  }}
                                  className="mr-2"
                                />
                                <span className="text-sm">アニメ自動開始</span>
                              </label>
                              
                              <div>
                                <label className="text-xs text-gray-500">初期回転</label>
                                <input
                                  type="range"
                                  min="0"
                                  max="360"
                                  value={initialState?.rotation || 0}
                                  onChange={(e) => {
                                    handleObjectInitialStateUpdate(selectedObjectId, {
                                      rotation: parseInt(e.target.value)
                                    });
                                  }}
                                  className="w-full"
                                />
                                <span className="text-xs text-gray-500">{initialState?.rotation || 0}°</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* ルール設定ボタン */}
                          <div className="pt-2 border-t">
                            <button
                              onClick={() => {
                                setMode('rules');
                                handleAddRule();
                              }}
                              className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                              🎯 このオブジェクトにルール設定
                            </button>
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
              
              {/* 🔧 アセットライブラリ（ドラッグ可能） */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="font-semibold text-gray-800 mb-3">📦 オブジェクト一覧</h4>
                
                {project.assets.objects.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {project.assets.objects.map((asset) => {
                      const isPlaced = project.script.layout.objects.some(obj => obj.objectId === asset.id);
                      
                      return (
                        <div
                          key={asset.id}
                          className={`relative p-2 border rounded-lg cursor-move transition-all hover:scale-105 ${
                            isPlaced 
                              ? 'bg-green-50 border-green-300' 
                              : 'bg-gray-50 border-gray-300 hover:bg-blue-50 hover:border-blue-300'
                          }`}
                          draggable
                          onDragStart={(e) => {
                            setDraggedItem({ id: asset.id, type: 'asset' });
                            e.dataTransfer.effectAllowed = 'copy';
                          }}
                          onClick={() => {
                            if (!isPlaced) {
                              handleAddObjectToLayout(asset.id);
                            }
                          }}
                        >
                          {asset.frames?.[0]?.dataUrl ? (
                            <img
                              src={asset.frames[0].dataUrl}
                              alt={asset.name}
                              className="w-full h-12 object-contain"
                            />
                          ) : (
                            <div className="w-full h-12 bg-gray-200 rounded flex items-center justify-center">
                              <span className="text-xs text-gray-500">No Image</span>
                            </div>
                          )}
                          <div className="text-xs text-center mt-1 truncate">{asset.name}</div>
                          
                          {isPlaced && (
                            <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                              <span className="text-xs">✓</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    <div className="text-2xl mb-1">📁</div>
                    <div className="text-sm">Assets タブで<br />オブジェクトを追加</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ルールモード（既存版を保持） */}
        {mode === 'rules' && (
          <div className="p-6">
            
            {/* ヘッダー・追加ボタン */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">⚙️ IF-THEN ルール設定</h3>
                <p className="text-sm text-gray-600 mt-1">
                  アイコンでゲームの動作ルールを直感的に設定
                  {selectedObjectId && (
                    <span className="text-blue-600 font-medium"> - 選択中: {selectedObjectId}</span>
                  )}
                </p>
              </div>
              <button
                onClick={handleAddRule}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                ➕ ルール追加
              </button>
            </div>
            
            {/* ルール一覧（ビジュアル強化版） */}
            <div className="space-y-4">
              {project.script.rules.length === 0 ? (
                <div className="text-center py-12 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border-2 border-dashed border-blue-300">
                  <div className="text-6xl mb-4">🎯</div>
                  <h4 className="text-lg font-medium text-gray-800 mb-2">IF-THENルールを作成しよう！</h4>
                  <p className="text-gray-600 mb-4">
                    「もし〇〇したら→△△する」のルールで簡単にゲームを作れます
                  </p>
                  <button
                    onClick={handleAddRule}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    🚀 最初のルールを作成
                  </button>
                </div>
              ) : (
                project.script.rules.map((rule, index) => (
                  <div
                    key={rule.id}
                    className={`border rounded-lg p-4 transition-all ${
                      rule.enabled 
                        ? 'border-green-200 bg-gradient-to-r from-green-50 to-blue-50' 
                        : 'border-gray-200 bg-gray-50'
                    } hover:shadow-md`}
                  >
                    
                    {/* ルールヘッダー */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleRule(rule.id)}
                          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                            rule.enabled
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-400 text-gray-400 hover:border-green-400'
                          }`}
                        >
                          {rule.enabled ? '✓' : '○'}
                        </button>
                        
                        <div>
                          <h4 className="font-medium text-gray-800 text-lg">{rule.name}</h4>
                          <div className="text-sm text-gray-500 flex items-center gap-3">
                            <span>#{index + 1}</span>
                            <span>優先度: {rule.priority}</span>
                            <span>対象: {rule.targetObjectId === 'stage' ? '🌟 ゲーム全体' : `📦 ${rule.targetObjectId}`}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingRule(rule);
                            setShowRuleModal(true);
                          }}
                          className="text-blue-500 hover:text-blue-700 px-3 py-1 rounded border border-blue-300 hover:bg-blue-50 transition-colors"
                        >
                          ✏️ 編集
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="text-red-500 hover:text-red-700 px-3 py-1 rounded border border-red-300 hover:bg-red-50 transition-colors"
                        >
                          🗑️ 削除
                        </button>
                      </div>
                    </div>

                    {/* 🔧 IF-THEN ビジュアル表示（強化版） */}
                    <div className="bg-white rounded-lg p-4 border">
                      
                      {/* IF条件 */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg font-bold text-blue-600">🔍 IF</span>
                          <span className="text-sm text-gray-600">
                            ({rule.triggers.operator === 'AND' ? '🔗 すべて' : '🌈 どれか'})
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {rule.triggers.conditions.length === 0 ? (
                            <span className="text-gray-400 text-sm italic">条件なし</span>
                          ) : (
                            rule.triggers.conditions.map((condition, condIndex) => {
                              const visual = formatConditionVisual(condition);
                              return (
                                <div
                                  key={condIndex}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-blue-200 ${visual.color}`}
                                >
                                  <span className="text-xl">{visual.icon}</span>
                                  <span className="text-sm font-medium">{visual.text}</span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* THEN矢印 */}
                      <div className="text-center my-3">
                        <span className="text-2xl text-gray-400">⬇️</span>
                      </div>

                      {/* THENアクション */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg font-bold text-green-600">⚡ THEN</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {rule.actions.length === 0 ? (
                            <span className="text-gray-400 text-sm italic">アクションなし</span>
                          ) : (
                            rule.actions.map((action, actionIndex) => {
                              const visual = formatActionVisual(action);
                              return (
                                <div
                                  key={actionIndex}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-green-200 ${visual.color}`}
                                >
                                  <span className="text-xl">{visual.icon}</span>
                                  <span className="text-sm font-medium">{visual.text}</span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ルール編集モーダル（既存版を保持） */}
      {showRuleModal && editingRule && (
        <EnhancedRuleEditorModal
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

// 🔧 強化版ルール編集モーダル（既存版ベース + ビジュアル強化）
interface EnhancedRuleEditorModalProps {
  rule: GameRule;
  project: GameProject;
  onSave: (rule: GameRule) => void;
  onClose: () => void;
}

const EnhancedRuleEditorModal: React.FC<EnhancedRuleEditorModalProps> = ({ 
  rule: initialRule, 
  project, 
  onSave, 
  onClose 
}) => {
  const [rule, setRule] = useState<GameRule>(initialRule);

  const handleSave = () => {
    if (!rule.name.trim()) {
      alert('ルール名を入力してください');
      return;
    }
    if (rule.triggers.conditions.length === 0) {
      alert('最低1つの条件を設定してください');
      return;
    }
    if (rule.actions.length === 0) {
      alert('最低1つのアクションを設定してください');
      return;
    }
    onSave(rule);
  };

  // 条件追加処理（現行版を保持・改良）
  const handleAddCondition = (conditionType: string) => {
    const conditionConfig = CONDITIONS_LIBRARY.find(c => c.type === conditionType);
    let newCondition: TriggerCondition;
    
    switch (conditionType) {
      case 'touch':
        newCondition = {
          type: 'touch',
          target: 'self',
          touchType: 'down'
        };
        break;
      case 'time':
        newCondition = {
          type: 'time',
          timeType: 'exact',
          seconds: 5
        };
        break;
      case 'flag':
        newCondition = {
          type: 'flag',
          flagId: 'flag1',
          condition: 'ON'
        };
        break;
      default:
        newCondition = {
          type: conditionType as any,
          target: 'self'
        } as any;
    }
    
    setRule({
      ...rule,
      triggers: {
        ...rule.triggers,
        conditions: [...rule.triggers.conditions, newCondition]
      }
    });
  };

  // アクション追加処理（現行版を保持・改良）
  const handleAddAction = (actionType: string) => {
    let newAction: GameAction;
    
    switch (actionType) {
      case 'addScore':
        newAction = { type: 'addScore', points: 10 };
        break;
      case 'success':
        newAction = { type: 'success', score: 100, message: 'やったね！' };
        break;
      case 'failure':
        newAction = { type: 'failure', message: 'ざんねん...' };
        break;
      case 'setFlag':
        newAction = { type: 'setFlag', flagId: 'flag1', value: true };
        break;
      case 'playSound':
        newAction = { type: 'playSound', soundId: 'default', volume: 0.8 };
        break;
      case 'showMessage':
        newAction = { type: 'showMessage', text: 'メッセージ', duration: 2 };
        break;
      default:
        newAction = { type: actionType as any } as any;
    }
    
    setRule({
      ...rule,
      actions: [...rule.actions, newAction]
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-auto">
        
        {/* 🔧 強化されたヘッダー */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-xl">
          <h3 className="text-2xl font-bold flex items-center gap-3">
            🎯 IF-THEN ルール設定
            <span className="text-lg font-normal opacity-80">
              {initialRule.id.startsWith('rule_') ? '新規作成' : '編集'}
            </span>
          </h3>
          <p className="mt-2 opacity-90">
            アイコンを使って簡単にゲームのルールを作ろう！
          </p>
        </div>
        
        <div className="p-6">
          {/* ルール基本情報 */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ルール名 *</label>
              <input
                type="text"
                value={rule.name}
                onChange={(e) => setRule({ ...rule, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例: 星をタッチで得点"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">対象オブジェクト</label>
              <select
                value={rule.targetObjectId}
                onChange={(e) => setRule({ ...rule, targetObjectId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="stage">🌟 ゲーム全体</option>
                {project.assets.objects.map((obj) => (
                  <option key={obj.id} value={obj.id}>
                    📦 {obj.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">優先度 (1-100)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={rule.priority}
                onChange={(e) => setRule({ ...rule, priority: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          {/* 🔧 IF条件設定（ビジュアル強化版） */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-blue-600 mb-4 flex items-center gap-2">
              🔍 IF - 条件設定
            </h4>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              {/* 条件の組み合わせ方法 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">条件の組み合わせ方法</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setRule({
                      ...rule,
                      triggers: { ...rule.triggers, operator: 'AND' }
                    })}
                    className={`px-4 py-2 rounded-lg border-2 transition-all ${
                      rule.triggers.operator === 'AND' 
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'border-blue-300 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    🔗 すべて満たす (AND)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRule({
                      ...rule,
                      triggers: { ...rule.triggers, operator: 'OR' }
                    })}
                    className={`px-4 py-2 rounded-lg border-2 transition-all ${
                      rule.triggers.operator === 'OR' 
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'border-blue-300 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    🌈 どれか満たす (OR)
                  </button>
                </div>
              </div>
              
              {/* 条件ライブラリ */}
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">条件を追加</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {CONDITIONS_LIBRARY.map((condition) => (
                    <button
                      key={condition.type}
                      type="button"
                      onClick={() => handleAddCondition(condition.type)}
                      className={`p-3 text-center rounded-lg border-2 border-dashed transition-all hover:scale-105 ${condition.color} hover:shadow-md`}
                    >
                      <div className="text-2xl mb-1">{condition.icon}</div>
                      <div className="text-xs font-medium">{condition.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* 設定済み条件一覧 */}
              <div className="space-y-3">
                {rule.triggers.conditions.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 bg-white rounded-lg border-2 border-dashed border-gray-300">
                    <div className="text-3xl mb-2">🔍</div>
                    <div>上のボタンから条件を追加してください</div>
                  </div>
                ) : (
                  rule.triggers.conditions.map((condition, index) => (
                    <div key={index} className="bg-white rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">
                            {CONDITIONS_LIBRARY.find(c => c.type === condition.type)?.icon || '❓'}
                          </span>
                          <span className="font-medium">
                            {CONDITIONS_LIBRARY.find(c => c.type === condition.type)?.label || condition.type}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            const newConditions = rule.triggers.conditions.filter((_, i) => i !== index);
                            setRule({
                              ...rule,
                              triggers: { ...rule.triggers, conditions: newConditions }
                            });
                          }}
                          className="text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                        >
                          🗑️
                        </button>
                      </div>
                      
                      {/* 条件詳細設定 */}
                      {condition.type === 'time' && (
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">秒数</label>
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={(condition as any).seconds || 5}
                            onChange={(e) => {
                              const newConditions = [...rule.triggers.conditions];
                              (newConditions[index] as any).seconds = parseFloat(e.target.value);
                              setRule({
                                ...rule,
                                triggers: { ...rule.triggers, conditions: newConditions }
                              });
                            }}
                            className="w-24 px-2 py-1 border rounded text-sm"
                          />
                          <span className="text-sm text-gray-500 ml-1">秒後</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          
          {/* 🔧 THENアクション設定（ビジュアル強化版） */}
          <div className="mb-6">
            <h4 className="text-xl font-semibold text-green-600 mb-4 flex items-center gap-2">
              ⚡ THEN - アクション設定
            </h4>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              {/* アクションライブラリ */}
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">アクションを追加</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {ACTIONS_LIBRARY.map((action) => (
                    <button
                      key={action.type}
                      type="button"
                      onClick={() => handleAddAction(action.type)}
                      className={`p-3 text-center rounded-lg border-2 border-dashed transition-all hover:scale-105 ${action.color} hover:shadow-md`}
                    >
                      <div className="text-2xl mb-1">{action.icon}</div>
                      <div className="text-xs font-medium">{action.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* 設定済みアクション一覧 */}
              <div className="space-y-3">
                {rule.actions.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 bg-white rounded-lg border-2 border-dashed border-gray-300">
                    <div className="text-3xl mb-2">⚡</div>
                    <div>上のボタンからアクションを追加してください</div>
                  </div>
                ) : (
                  rule.actions.map((action, index) => (
                    <div key={index} className="bg-white rounded-lg p-4 border border-green-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">
                            {ACTIONS_LIBRARY.find(a => a.type === action.type)?.icon || '❓'}
                          </span>
                          <span className="font-medium">
                            {ACTIONS_LIBRARY.find(a => a.type === action.type)?.label || action.type}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            const newActions = rule.actions.filter((_, i) => i !== index);
                            setRule({ ...rule, actions: newActions });
                          }}
                          className="text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                        >
                          🗑️
                        </button>
                      </div>
                      
                      {/* アクション詳細設定 */}
                      {action.type === 'addScore' && (
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">得点</label>
                          <input
                            type="number"
                            value={(action as any).points || 10}
                            onChange={(e) => {
                              const newActions = [...rule.actions];
                              (newActions[index] as any).points = parseInt(e.target.value) || 10;
                              setRule({ ...rule, actions: newActions });
                            }}
                            className="w-24 px-2 py-1 border rounded text-sm"
                          />
                        </div>
                      )}

                      {action.type === 'showMessage' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">メッセージ</label>
                            <input
                              type="text"
                              value={(action as any).text || 'メッセージ'}
                              onChange={(e) => {
                                const newActions = [...rule.actions];
                                (newActions[index] as any).text = e.target.value;
                                setRule({ ...rule, actions: newActions });
                              }}
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">表示時間(秒)</label>
                            <input
                              type="number"
                              min="0.5"
                              step="0.5"
                              value={(action as any).duration || 2}
                              onChange={(e) => {
                                const newActions = [...rule.actions];
                                (newActions[index] as any).duration = parseFloat(e.target.value) || 2;
                                setRule({ ...rule, actions: newActions });
                              }}
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* モーダルフッター */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            💾 保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScriptTab;