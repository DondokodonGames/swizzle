// src/components/editor/script/BackgroundControl.tsx
// 背景制御サイドパネルコンポーネント

import React from 'react';
import { GameProject } from '../../../types/editor/GameProject';

interface BackgroundControlProps {
  project: GameProject;
  onProjectUpdate: (project: GameProject) => void;
}

export const BackgroundControl: React.FC<BackgroundControlProps> = ({
  project,
  onProjectUpdate
}) => {
  
  // 背景表示切り替え
  const toggleBackgroundVisibility = () => {
    const updatedScript = JSON.parse(JSON.stringify(project.script));
    updatedScript.layout.background.visible = !updatedScript.layout.background.visible;
    
    const updatedProject = {
      ...project,
      script: updatedScript,
      lastModified: new Date().toISOString()
    };
    
    onProjectUpdate(updatedProject);
    console.log('[BackgroundControl] 背景切り替え:', updatedScript.layout.background.visible);
  };

  return (
    <div className="w-full xl:w-80">
      <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
        <h4 className="font-semibold text-green-800 mb-3 flex items-center">
          🌄 背景制御
        </h4>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-green-700">表示:</span>
            <button
              onClick={toggleBackgroundVisibility}
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
          
          {/* 状態説明 */}
          <div className="mt-4 p-3 bg-green-100 rounded text-xs text-green-600">
            💡 <strong>操作方法</strong><br/>
            • Assetsタブでオブジェクトを追加<br/>
            • ゲーム画面にドラッグ&ドロップで配置<br/>
            • オブジェクトクリックでルール設定<br/>
            • 色付き枠線で状態確認
          </div>
        </div>
      </div>
    </div>
  );
};