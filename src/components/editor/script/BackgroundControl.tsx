// src/components/editor/script/BackgroundControl.tsx
// 背景制御サイドパネルコンポーネント

import React from 'react';
import { useTranslation } from 'react-i18next';
import { GameProject } from '../../../types/editor/GameProject';

interface BackgroundControlProps {
  project: GameProject;
  onProjectUpdate: (project: GameProject) => void;
}

export const BackgroundControl: React.FC<BackgroundControlProps> = ({
  project,
  onProjectUpdate
}) => {
  const { t } = useTranslation();

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
          🌄 {t('editor.script.backgroundControl.title', '背景制御')}
        </h4>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-green-700">{t('editor.script.backgroundControl.visibility', '表示')}:</span>
            <button
              onClick={toggleBackgroundVisibility}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                project.script.layout.background.visible
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
              }`}
            >
              {project.script.layout.background.visible ? t('common.on', 'ON') : t('common.off', 'OFF')}
            </button>
          </div>

          <div className="text-xs text-green-600">
            {project.assets.background ? (
              <>
                📁 {project.assets.background.name}<br/>
                📏 {project.assets.background.frames[0]?.width}×{project.assets.background.frames[0]?.height}px<br/>
                🖼️ {project.assets.background.frames.length}{t('editor.script.backgroundControl.frames', 'フレーム')}
              </>
            ) : (
              t('editor.script.backgroundControl.noBackground', '❌ 背景データなし (Assetsタブで追加)')
            )}
          </div>

          {/* 状態説明 */}
          <div className="mt-4 p-3 bg-green-100 rounded text-xs text-green-600">
            💡 <strong>{t('editor.script.backgroundControl.hints.title', '操作方法')}</strong><br/>
            • {t('editor.script.backgroundControl.hints.addAssets', 'Assetsタブでオブジェクトを追加')}<br/>
            • {t('editor.script.backgroundControl.hints.dragDrop', 'ゲーム画面にドラッグ&ドロップで配置')}<br/>
            • {t('editor.script.backgroundControl.hints.clickRule', 'オブジェクトクリックでルール設定')}<br/>
            • {t('editor.script.backgroundControl.hints.colorBorder', '色付き枠線で状態確認')}
          </div>
        </div>
      </div>
    </div>
  );
};