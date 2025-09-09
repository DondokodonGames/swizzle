// src/components/editor/script/RuleList.tsx
// ルール一覧表示コンポーネント

import React from 'react';
import { GameProject } from '../../../types/editor/GameProject';
import { GameRule } from '../../../types/editor/GameScript';

interface RuleListProps {
  project: GameProject;
  selectedObjectId: string | null;
  onProjectUpdate: (project: GameProject) => void;
  onEditRule: (rule: GameRule) => void;
  onCreateRule: () => void;
  onModeChange: (mode: 'layout' | 'rules') => void;
}

export const RuleList: React.FC<RuleListProps> = ({
  project,
  selectedObjectId,
  onProjectUpdate,
  onEditRule,
  onCreateRule,
  onModeChange
}) => {
  
  // ルール削除
  const handleDeleteRule = (ruleId: string) => {
    if (confirm('このルールを削除しますか？')) {
      const updatedScript = { ...project.script };
      updatedScript.rules = updatedScript.rules.filter(r => r.id !== ruleId);
      
      const updatedProject = {
        ...project,
        script: updatedScript,
        lastModified: new Date().toISOString()
      };
      
      onProjectUpdate(updatedProject);
    }
  };

  return (
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
            onClick={onCreateRule}
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
                onClick={() => onModeChange('layout')}
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
                    onClick={() => onEditRule(rule)}
                    className="text-blue-500 hover:text-blue-700 px-3 py-1 rounded border border-blue-300 hover:bg-blue-50 transition-colors text-sm"
                  >
                    ✏️ 編集
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
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
  );
};