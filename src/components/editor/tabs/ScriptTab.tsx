// src/components/editor/tabs/ScriptTab.tsx
// 軽量化版 - コンポーネント分割後のメイン統合ファイル

import React, { useState } from 'react';
import { GameProject } from '../../../types/editor/GameProject';
import { GameRule } from '../../../types/editor/GameScript';
import { GamePreview } from '../script/GamePreview';
import { BackgroundControl } from '../script/BackgroundControl';
import { RuleList } from '../script/RuleList';
import { SimpleRuleModal } from '../script/SimpleRuleModal';

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

  // ルール設定モードに移行
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

  // ルール作成（ボタン経由）
  const handleCreateRule = () => {
    if (selectedObjectId) {
      handleObjectRuleEdit(selectedObjectId);
    }
  };

  // ルール編集
  const handleEditRule = (rule: GameRule) => {
    setEditingRule(rule);
    setSelectedObjectId(rule.targetObjectId);
    setShowRuleModal(true);
  };

  // ルール設定済み判定
  const hasRuleForObject = (objectId: string): boolean => {
    return project.script.rules.some(rule => rule.targetObjectId === objectId);
  };

  // ルール保存
  const handleRuleSave = (rule: GameRule) => {
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
  };

  // モーダルクローズ
  const handleModalClose = () => {
    setShowRuleModal(false);
    setEditingRule(null);
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
              
              {/* サイドパネル */}
              <BackgroundControl
                project={project}
                onProjectUpdate={updateProject}
              />
            </div>
          </div>
        )}

        {/* 🎯 ルール設定モード */}
        {mode === 'rules' && (
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

      {/* 🔧 ルール編集モーダル（Option A実装） */}
      {showRuleModal && editingRule && (
        <SimpleRuleModal
          rule={editingRule}
          onSave={handleRuleSave}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default ScriptTab;