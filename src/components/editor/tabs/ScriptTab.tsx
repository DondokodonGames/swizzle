// src/components/editor/tabs/ScriptTab.tsx
// AdvancedRuleModal統合更新版 - UI/UX改善・統合管理強化
// 提供ファイルベース統合更新版

import React, { useState } from 'react';
import { GameProject } from '../../../types/editor/GameProject';
import { GameRule } from '../../../types/editor/GameScript';
import { GamePreview } from '../script/GamePreview';
import { BackgroundControl } from '../script/BackgroundControl';
import { RuleList } from '../script/RuleList';
import { AdvancedRuleModal } from '../script/AdvancedRuleModal';

interface ScriptTabProps {
  project: GameProject;
  onProjectUpdate: (project: GameProject) => void;
}

export const ScriptTab: React.FC<ScriptTabProps> = ({ project, onProjectUpdate }) => {
  // 状態管理
  const [mode, setMode] = useState<'layout' | 'rules'>('layout');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [editingRule, setEditingRule] = useState<GameRule | null>(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [forceRender, setForceRender] = useState(0);

  // プロジェクト更新（強制再レンダリング付き）
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
    console.log(`[ScriptTab] 位置更新: ${objectId} → (${position.x.toFixed(2)}, ${position.y.toFixed(2)})`);
    
    const updatedScript = JSON.parse(JSON.stringify(project.script));
    
    // 既存のレイアウトオブジェクトを探す
    const existingIndex = updatedScript.layout.objects.findIndex((obj: any) => obj.objectId === objectId);
    
    if (existingIndex >= 0) {
      // 既存オブジェクトの位置を更新
      updatedScript.layout.objects[existingIndex].position = position;
    } else {
      // 新しいオブジェクトを追加
      const asset = project.assets.objects.find(obj => obj.id === objectId);
      if (asset) {
        updatedScript.layout.objects.push({
          objectId: objectId,
          position: position,
          scale: { x: 1.0, y: 1.0 },
          rotation: 0,
          zIndex: updatedScript.layout.objects.length + 10,
          initialState: {
            visible: true,
            animation: 0,
            animationSpeed: 12,
            autoStart: false
          }
        });
        console.log(`[ScriptTab] 新規配置: ${asset.name}`);
      }
    }
    
    updateProject({ script: updatedScript });
  };

  // オブジェクトルール編集
  const handleObjectRuleEdit = (objectId: string) => {
    console.log(`[ScriptTab] ルール編集: ${objectId}`);
    setSelectedObjectId(objectId);
    
    // 既存ルールを検索
    const existingRule = project.script.rules.find(rule => rule.targetObjectId === objectId);
    
    if (existingRule) {
      // 既存ルール編集
      setEditingRule(existingRule);
    } else {
      // 新規ルール作成
      const asset = project.assets.objects.find(obj => obj.id === objectId);
      const newRule: GameRule = {
        id: `rule_${Date.now()}`,
        name: `${asset?.name || 'オブジェクト'}のルール`,
        enabled: true,
        priority: 50,
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
    
    setShowRuleModal(true);
  };

  // ルール保存（フラグ情報も同時更新）
  const handleSaveRule = (rule: GameRule) => {
    console.log('[ScriptTab] ルール保存:', rule.name);
    
    const updatedScript = { ...project.script };
    const existingIndex = updatedScript.rules.findIndex(r => r.id === rule.id);
    
    if (existingIndex >= 0) {
      // 既存ルール更新
      updatedScript.rules[existingIndex] = rule;
    } else {
      // 新規ルール追加
      updatedScript.rules.push(rule);
    }
    
    updateProject({ script: updatedScript });
    setShowRuleModal(false);
    setEditingRule(null);
  };

  // 新規ルール作成
  const handleCreateRule = () => {
    if (!selectedObjectId) return;
    
    const asset = project.assets.objects.find(obj => obj.id === selectedObjectId);
    const newRule: GameRule = {
      id: `rule_${Date.now()}`,
      name: `${asset?.name || 'オブジェクト'}のルール`,
      enabled: true,
      priority: 50,
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
  };

  // ルール編集
  const handleEditRule = (rule: GameRule) => {
    setEditingRule(rule);
    setShowRuleModal(true);
  };

  // オブジェクトのルール有無確認
  const hasRuleForObject = (objectId: string): boolean => {
    return project.script.rules.some(rule => rule.targetObjectId === objectId && rule.enabled);
  };

  return (
    <div className="h-full flex flex-col">
      {/* ヘッダー - UI/UX改善版 */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white p-4 relative overflow-hidden">
        {/* 装飾的背景エフェクト */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-blue-500/20"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-pink-400 to-cyan-400"></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-3">
                <span className="text-2xl">📝</span>
                <span>スクリプト設定</span>
              </h2>
              <p className="text-indigo-100 text-sm mt-1">
                高度なゲームロジック・複数条件・フラグ管理・包括的ルールシステム
              </p>
            </div>
            
            {/* モード切り替え - デザイン改善版 */}
            <div className="flex bg-white bg-opacity-20 rounded-xl p-1 backdrop-blur-sm">
              <button
                onClick={() => setMode('layout')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  mode === 'layout' 
                    ? 'bg-white text-indigo-600 shadow-lg' 
                    : 'text-white hover:bg-white hover:bg-opacity-20'
                }`}
              >
                🎨 レイアウト
              </button>
              <button
                onClick={() => setMode('rules')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  mode === 'rules' 
                    ? 'bg-white text-purple-600 shadow-lg' 
                    : 'text-white hover:bg-white hover:bg-opacity-20'
                }`}
              >
                ⚙️ ルール ({project.script.rules.length})
              </button>
            </div>
          </div>
          
          {/* プロジェクト統計 - デザイン改善版 */}
          <div className="mt-4 flex items-center gap-6 text-sm text-indigo-100">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-white/30 rounded-full"></span>
              <span>📦 オブジェクト: {project.script.layout.objects.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-white/30 rounded-full"></span>
              <span>⚙️ ルール: {project.script.rules.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-white/30 rounded-full"></span>
              <span>🚩 フラグ: {project.script.flags?.length || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-400 rounded-full"></span>
              <span>🔥 アクティブルール: {project.script.rules.filter(r => r.enabled).length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* コンテンツエリア */}
      <div className="flex-1 overflow-hidden">
        {mode === 'layout' ? (
          <div className="h-full flex">
            {/* ゲームプレビュー */}
            <GamePreview
              project={project}
              selectedObjectId={selectedObjectId}
              draggedItem={draggedItem}
              forceRender={forceRender}
              onObjectPositionUpdate={handleObjectPositionUpdate}
              onObjectRuleEdit={handleObjectRuleEdit}
              onSetDraggedItem={setDraggedItem}
              hasRuleForObject={hasRuleForObject}
            />
            
            {/* 右サイドパネル - デザイン改善版 */}
            <div className="w-80 bg-gradient-to-b from-gray-50 to-white border-l border-gray-200 overflow-y-auto shadow-inner">
              <BackgroundControl
                project={project}
                onProjectUpdate={updateProject}
              />
              
              {/* プロジェクトフラグ統計のみ表示 - デザイン改善版 */}
              {project.script.flags && project.script.flags.length > 0 && (
                <div className="p-4">
                  <div className="p-4 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl border border-yellow-200 shadow-sm">
                    <h5 className="text-sm font-bold text-yellow-800 mb-3 flex items-center gap-2">
                      <span className="text-lg">🚩</span>
                      プロジェクトフラグ
                    </h5>
                    <div className="space-y-2">
                      {project.script.flags.map((flag) => (
                        <div key={flag.id} className="flex items-center justify-between text-xs bg-white rounded-lg p-2 shadow-sm">
                          <span className="text-yellow-700 font-medium">{flag.name}</span>
                          <span className={`px-2 py-1 rounded-md font-bold text-xs ${
                            flag.initialValue 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {flag.initialValue ? 'ON' : 'OFF'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <RuleList
            project={project}
            selectedObjectId={selectedObjectId}
            onProjectUpdate={updateProject}
            onEditRule={handleEditRule}
            onCreateRule={handleCreateRule}
            onModeChange={setMode}
          />
        )}
      </div>

      {/* AdvancedRuleModal - 統合版 */}
      {showRuleModal && editingRule && (
        <AdvancedRuleModal
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