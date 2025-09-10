// src/components/editor/tabs/ScriptTab.tsx
// 最終版 - 美しいモダンデザイン + パラメータ位置問題完全解決

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
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-gray-100">
      
      {/* ヘッダー - 洗練されたモダンデザイン */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white relative overflow-hidden shadow-xl">
        {/* 装飾的背景エフェクト */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-indigo-600/10"></div>
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400"></div>
        
        <div className="relative z-10 p-6">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold flex items-center gap-3 text-white">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-xl">📝</span>
                </div>
                <span>スクリプト設定</span>
              </h2>
              <p className="text-slate-300 text-sm font-medium ml-13">
                高度なゲームロジック設定・複数条件・フラグ管理システム
              </p>
            </div>
            
            {/* モード切り替え - エレガントなデザイン */}
            <div className="flex bg-slate-700/50 rounded-2xl p-1.5 backdrop-blur-sm border border-slate-600/30 shadow-lg">
              <button
                onClick={() => setMode('layout')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 text-sm ${
                  mode === 'layout' 
                    ? 'bg-white text-slate-700 shadow-lg' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-600/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>🎨</span>
                  <span>レイアウト</span>
                </div>
              </button>
              <button
                onClick={() => setMode('rules')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 text-sm ${
                  mode === 'rules' 
                    ? 'bg-white text-slate-700 shadow-lg' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-600/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>⚙️</span>
                  <span>ルール ({project.script.rules.length})</span>
                </div>
              </button>
            </div>
          </div>
          
          {/* プロジェクト統計 - 洗練された情報表示 */}
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 bg-slate-700/30 rounded-xl p-3 border border-slate-600/20">
              <div className="w-3 h-3 bg-blue-400 rounded-full shadow-sm"></div>
              <div>
                <div className="text-xs text-slate-400 font-medium">オブジェクト</div>
                <div className="text-sm font-bold text-white">{project.script.layout.objects.length}個</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-700/30 rounded-xl p-3 border border-slate-600/20">
              <div className="w-3 h-3 bg-purple-400 rounded-full shadow-sm"></div>
              <div>
                <div className="text-xs text-slate-400 font-medium">ルール</div>
                <div className="text-sm font-bold text-white">{project.script.rules.length}個</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-700/30 rounded-xl p-3 border border-slate-600/20">
              <div className="w-3 h-3 bg-amber-400 rounded-full shadow-sm"></div>
              <div>
                <div className="text-xs text-slate-400 font-medium">フラグ</div>
                <div className="text-sm font-bold text-white">{project.script.flags?.length || 0}個</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-700/30 rounded-xl p-3 border border-slate-600/20">
              <div className="w-3 h-3 bg-green-400 rounded-full shadow-sm"></div>
              <div>
                <div className="text-xs text-slate-400 font-medium">アクティブ</div>
                <div className="text-sm font-bold text-white">{project.script.rules.filter(r => r.enabled).length}個</div>
              </div>
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
            
            {/* 右サイドパネル - モダンな統合デザイン */}
            <div className="w-80 bg-white border-l border-slate-200 overflow-y-auto shadow-inner">
              <BackgroundControl
                project={project}
                onProjectUpdate={updateProject}
              />
              
              {/* フラグ統計表示 - 洗練されたデザイン */}
              {project.script.flags && project.script.flags.length > 0 && (
                <div className="p-6">
                  <div className="p-5 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl border border-amber-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-lg flex items-center justify-center shadow-sm">
                        <span className="text-white text-sm">🚩</span>
                      </div>
                      <div>
                        <h5 className="text-lg font-bold text-amber-800">プロジェクトフラグ</h5>
                        <p className="text-xs text-amber-600">ゲーム状態管理</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {project.script.flags.map((flag) => (
                        <div key={flag.id} className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border border-amber-100">
                          <span className="text-sm font-semibold text-slate-700">{flag.name}</span>
                          <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                            flag.initialValue 
                              ? 'bg-green-100 text-green-700 border border-green-200' 
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}>
                            {flag.initialValue ? 'ON' : 'OFF'}
                          </div>
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