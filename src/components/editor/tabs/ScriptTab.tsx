// src/components/editor/tabs/ScriptTab.tsx
// AdvancedRuleModal統合版 - 修正版（真っ白画面解決）

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
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">📝 スクリプト設定</h2>
            <p className="text-blue-100 text-sm mt-1">
              高度なゲームロジック・複数条件・フラグ管理・包括的ルールシステム
            </p>
          </div>
          
          {/* モード切り替え */}
          <div className="flex bg-white bg-opacity-20 rounded-lg p-1">
            <button
              onClick={() => setMode('layout')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                mode === 'layout' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-white hover:bg-white hover:bg-opacity-20'
              }`}
            >
              🎨 レイアウト
            </button>
            <button
              onClick={() => setMode('rules')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                mode === 'rules' 
                  ? 'bg-white text-purple-600 shadow-sm' 
                  : 'text-white hover:bg-white hover:bg-opacity-20'
              }`}
            >
              ⚙️ ルール ({project.script.rules.length})
            </button>
          </div>
        </div>
        
        {/* プロジェクト統計 */}
        <div className="mt-3 flex items-center gap-4 text-sm text-blue-100">
          <span>📦 オブジェクト: {project.script.layout.objects.length}</span>
          <span>⚙️ ルール: {project.script.rules.length}</span>
          <span>🚩 フラグ: {project.script.flags?.length || 0}</span>
          <span>🔥 アクティブルール: {project.script.rules.filter(r => r.enabled).length}</span>
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
            
            {/* 右サイドパネル */}
            <div className="w-80 bg-gray-50 border-l border-gray-200 overflow-y-auto">
              <BackgroundControl
                project={project}
                onProjectUpdate={updateProject}
              />
              
              {/* プロジェクトフラグ統計のみ表示 */}
              {project.script.flags && project.script.flags.length > 0 && (
                <div className="p-4">
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h5 className="text-sm font-medium text-yellow-800 mb-2">🚩 プロジェクトフラグ</h5>
                    <div className="space-y-1">
                      {project.script.flags.map((flag) => (
                        <div key={flag.id} className="flex items-center justify-between text-xs">
                          <span className="text-yellow-700">{flag.name}</span>
                          <span className={`px-2 py-1 rounded ${
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

      {/* AdvancedRuleModal */}
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