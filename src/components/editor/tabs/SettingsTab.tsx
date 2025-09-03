import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GameProject } from '../../../types/editor/GameProject';
import { GameSettings } from '../../../types/editor/GameProject';

interface SettingsTabProps {
  project: GameProject;
  onProjectUpdate: (project: GameProject) => void;
}

// ゲーム時間のプリセット
const DURATION_PRESETS = [
  { value: 5, label: '5秒', description: 'サクッと', emoji: '⚡', color: 'bg-yellow-100 border-yellow-300' },
  { value: 10, label: '10秒', description: 'ちょうどいい', emoji: '⏰', color: 'bg-blue-100 border-blue-300' },
  { value: 15, label: '15秒', description: 'じっくり', emoji: '🎯', color: 'bg-green-100 border-green-300' },
  { value: 30, label: '30秒', description: 'たっぷり', emoji: '🏃', color: 'bg-purple-100 border-purple-300' },
] as const;

// 難易度設定
const DIFFICULTY_LEVELS = [
  { value: 'easy', label: 'やさしい', description: '誰でも楽しめる', emoji: '😊', color: 'bg-green-100 border-green-300' },
  { value: 'normal', label: 'ふつう', description: 'ちょうどいい挑戦', emoji: '🙂', color: 'bg-blue-100 border-blue-300' },
  { value: 'hard', label: 'むずかしい', description: '上級者向け', emoji: '😤', color: 'bg-red-100 border-red-300' },
] as const;

export const SettingsTab: React.FC<SettingsTabProps> = ({ project, onProjectUpdate }) => {
  const [isTestPlaying, setIsTestPlaying] = useState(false);
  const [testPlayResult, setTestPlayResult] = useState<'success' | 'failure' | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [generateThumbnail, setGenerateThumbnail] = useState(false);
  const gameTestRef = useRef<HTMLDivElement>(null);

  // プロジェクト更新ヘルパー
  const updateProject = useCallback((updates: Partial<GameProject>) => {
    onProjectUpdate({ ...project, ...updates });
  }, [project, onProjectUpdate]);

  // 設定更新ヘルパー
  const updateSettings = useCallback((updates: Partial<GameSettings>) => {
    const newSettings = { ...project.settings, ...updates };
    updateProject({ settings: newSettings });
  }, [project.settings, updateProject]);

  // ゲーム名の更新
  const handleGameNameChange = useCallback((name: string) => {
    updateSettings({ name: name.slice(0, 50) }); // 50文字制限
  }, [updateSettings]);

  // ゲーム説明の更新
  const handleDescriptionChange = useCallback((description: string) => {
    updateSettings({ description: description.slice(0, 200) }); // 200文字制限
  }, [updateSettings]);

  // ゲーム時間設定の更新
  const handleDurationChange = useCallback((seconds: number) => {
    updateSettings({
      duration: {
        type: 'fixed',
        seconds: seconds as 5 | 10 | 15 | 20 | 30
      }
    });
  }, [updateSettings]);

  // 難易度設定の更新
  const handleDifficultyChange = useCallback((difficulty: 'easy' | 'normal' | 'hard') => {
    updateSettings({ difficulty });
  }, [updateSettings]);

  // テストプレイ機能
  const handleTestPlay = useCallback(async () => {
    setIsTestPlaying(true);
    setTestPlayResult(null);
    
    try {
      // 簡単なプロジェクト検証
      if (!project.assets.objects.length && !project.assets.background) {
        throw new Error('ゲームにオブジェクトまたは背景を追加してください');
      }
      
      if (!project.script.rules.length && !project.script.successConditions.length) {
        throw new Error('ゲームルールまたは成功条件を設定してください');
      }
      
      // テストプレイシミュレーション（3秒間）
      setTimeout(() => {
        // ランダムに成功/失敗を決定（デモ用）
        const success = Math.random() > 0.3;
        setTestPlayResult(success ? 'success' : 'failure');
        setIsTestPlaying(false);
      }, 3000);
      
    } catch (error) {
      console.error('Test play error:', error);
      setTestPlayResult('failure');
      setIsTestPlaying(false);
    }
  }, [project]);

  // サムネイル自動生成
  const handleGenerateThumbnail = useCallback(async () => {
    setGenerateThumbnail(true);
    
    try {
      // 実際の実装では、ゲーム画面のスクリーンショットを撮る
      // ここではダミー実装
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // 背景グラデーション
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, '#3B82F6');
        gradient.addColorStop(1, '#1D4ED8');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 300, 400);
        
        // ゲーム名表示
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(project.settings.name || 'My Game', 150, 50);
        
        // 背景画像があれば表示（簡略版）
        if (project.assets.background?.frames[0]) {
          ctx.fillStyle = 'rgba(255,255,255,0.1)';
          ctx.fillRect(50, 100, 200, 150);
          ctx.fillStyle = 'white';
          ctx.font = '16px Arial';
          ctx.fillText('Background Image', 150, 175);
        }
        
        // オブジェクト数表示
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = '14px Arial';
        ctx.fillText(`Objects: ${project.assets.objects.length}`, 150, 300);
        ctx.fillText(`Rules: ${project.script.rules.length}`, 150, 320);
        ctx.fillText(`Duration: ${project.settings.duration?.seconds || 10}s`, 150, 340);
      }
      
      const thumbnailDataUrl = canvas.toDataURL('image/png');
      
      updateSettings({
        preview: {
          ...project.settings.preview,
          thumbnailDataUrl
        }
      });
      
    } catch (error) {
      console.error('Thumbnail generation error:', error);
    } finally {
      setGenerateThumbnail(false);
    }
  }, [project, updateSettings]);

  // プロジェクト公開
  const handlePublish = useCallback(async () => {
    setIsPublishing(true);
    setPublishError(null);
    
    try {
      // 必須項目チェック
      if (!project.settings.name?.trim()) {
        throw new Error('ゲーム名を入力してください');
      }
      
      if (!project.assets.objects.length && !project.assets.background) {
        throw new Error('最低1つのオブジェクトまたは背景を追加してください');
      }
      
      if (!project.script.rules.length && !project.script.successConditions.length) {
        throw new Error('ゲームルールまたは成功条件を設定してください');
      }
      
      // 公開処理のシミュレーション
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 公開設定を更新
      updateSettings({
        publishing: {
          ...project.settings.publishing,
          isPublished: true,
          publishedAt: new Date().toISOString(),
          visibility: 'public'
        }
      });
      
      // ステータス更新
      updateProject({ status: 'published' });
      
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : '公開に失敗しました');
    } finally {
      setIsPublishing(false);
    }
  }, [project, updateSettings, updateProject]);

  // エクスポート機能
  const handleExport = useCallback(async () => {
    try {
      const exportData = {
        ...project,
        exportedAt: new Date().toISOString(),
        exportSettings: project.settings.export
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.settings.name || 'my-game'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Export error:', error);
    }
  }, [project]);

  return (
    <div className="settings-tab h-full overflow-auto">
      <div className="max-w-4xl mx-auto p-6">
        
        {/* ゲーム基本情報 */}
        <section className="mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            🎮 ゲーム情報
          </h3>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            {/* ゲーム名 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ゲーム名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={project.settings.name || ''}
                onChange={(e) => handleGameNameChange(e.target.value)}
                placeholder="素晴らしいゲーム名を入力してください"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={50}
              />
              <div className="text-right text-sm text-gray-500 mt-1">
                {(project.settings.name || '').length}/50
              </div>
            </div>
            
            {/* ゲーム説明 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ゲーム説明
              </label>
              <textarea
                value={project.settings.description || ''}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="このゲームの楽しさを説明してください"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                maxLength={200}
              />
              <div className="text-right text-sm text-gray-500 mt-1">
                {(project.settings.description || '').length}/200
              </div>
            </div>
          </div>
        </section>

        {/* ゲーム設定 */}
        <section className="mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            ⚙️ ゲーム設定
          </h3>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {/* ゲーム時間設定 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                ゲーム時間
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {DURATION_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handleDurationChange(preset.value)}
                    className={`p-4 border-2 rounded-lg text-center transition-all hover:scale-105 ${
                      project.settings.duration?.seconds === preset.value
                        ? preset.color + ' border-current shadow-lg'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{preset.emoji}</div>
                    <div className="font-semibold">{preset.label}</div>
                    <div className="text-xs text-gray-600">{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* 難易度設定 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                難易度
              </label>
              <div className="grid grid-cols-3 gap-3">
                {DIFFICULTY_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => handleDifficultyChange(level.value)}
                    className={`p-4 border-2 rounded-lg text-center transition-all hover:scale-105 ${
                      project.settings.difficulty === level.value
                        ? level.color + ' border-current shadow-lg'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{level.emoji}</div>
                    <div className="font-semibold">{level.label}</div>
                    <div className="text-xs text-gray-600">{level.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* テストプレイ */}
        <section className="mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            🎯 テストプレイ
          </h3>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex flex-col items-center text-center">
              {!isTestPlaying && testPlayResult === null && (
                <>
                  <div className="text-6xl mb-4">🕹️</div>
                  <h4 className="text-lg font-medium text-gray-800 mb-2">
                    ゲームをテストしてみましょう
                  </h4>
                  <p className="text-gray-600 mb-6">
                    作成したゲームが正しく動作するか確認できます
                  </p>
                  <button
                    onClick={handleTestPlay}
                    disabled={!project.settings.name}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-medium transition-colors"
                  >
                    ▶️ テストプレイ開始
                  </button>
                </>
              )}
              
              {isTestPlaying && (
                <>
                  <div className="text-6xl mb-4 animate-bounce">🎮</div>
                  <h4 className="text-lg font-medium text-gray-800 mb-2">
                    テストプレイ中...
                  </h4>
                  <p className="text-gray-600">ゲームの動作を確認しています</p>
                  <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
                  </div>
                </>
              )}
              
              {testPlayResult === 'success' && (
                <>
                  <div className="text-6xl mb-4">🎉</div>
                  <h4 className="text-lg font-medium text-green-600 mb-2">
                    テスト成功！
                  </h4>
                  <p className="text-gray-600 mb-4">
                    ゲームが正常に動作しています
                  </p>
                  <button
                    onClick={() => setTestPlayResult(null)}
                    className="text-blue-500 hover:text-blue-700 font-medium"
                  >
                    もう一度テスト
                  </button>
                </>
              )}
              
              {testPlayResult === 'failure' && (
                <>
                  <div className="text-6xl mb-4">⚠️</div>
                  <h4 className="text-lg font-medium text-red-600 mb-2">
                    テストで問題発見
                  </h4>
                  <p className="text-gray-600 mb-4">
                    ゲーム設定を確認して、再度テストしてください
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setTestPlayResult(null)}
                      className="text-blue-500 hover:text-blue-700 font-medium"
                    >
                      もう一度テスト
                    </button>
                    <button
                      onClick={() => {/* ルールタブに移動 */}}
                      className="text-orange-500 hover:text-orange-700 font-medium"
                    >
                      ルール設定を確認
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* サムネイル設定 */}
        <section className="mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            📸 サムネイル
          </h3>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-6">
              {/* サムネイルプレビュー */}
              <div className="flex-shrink-0">
                <div className="w-32 h-40 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                  {project.settings.preview?.thumbnailDataUrl ? (
                    <img
                      src={project.settings.preview.thumbnailDataUrl}
                      alt="Game Thumbnail"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-gray-500">
                      <div className="text-2xl mb-1">📸</div>
                      <div className="text-xs">No Thumbnail</div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* サムネイル設定 */}
              <div className="flex-1">
                <h4 className="font-medium text-gray-800 mb-2">ゲームサムネイル</h4>
                <p className="text-sm text-gray-600 mb-4">
                  ゲームの魅力を伝えるサムネイルを設定します
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={handleGenerateThumbnail}
                    disabled={generateThumbnail}
                    className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    {generateThumbnail ? '生成中...' : '🎨 自動生成'}
                  </button>
                  
                  <label className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer">
                    📁 アップロード
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (e) => {
                            const thumbnailDataUrl = e.target?.result as string;
                            updateSettings({
                              preview: {
                                ...project.settings.preview,
                                thumbnailDataUrl
                              }
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 公開設定 */}
        <section className="mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            🌐 公開設定
          </h3>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={project.settings.publishing?.visibility === 'public'}
                  onChange={(e) => updateSettings({
                    publishing: {
                      ...project.settings.publishing,
                      visibility: e.target.checked ? 'public' : 'private'
                    }
                  })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-800">🌍 一般公開</div>
                  <div className="text-sm text-gray-600">誰でもゲームを遊べるようにする</div>
                </div>
              </label>
              
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={project.settings.publishing?.allowComments || false}
                  onChange={(e) => updateSettings({
                    publishing: {
                      ...project.settings.publishing,
                      allowComments: e.target.checked
                    }
                  })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-800">💬 コメント許可</div>
                  <div className="text-sm text-gray-600">ユーザーがコメントできるようにする</div>
                </div>
              </label>
              
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={project.settings.publishing?.allowRemix || false}
                  onChange={(e) => updateSettings({
                    publishing: {
                      ...project.settings.publishing,
                      allowRemix: e.target.checked
                    }
                  })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-800">🔄 リミックス許可</div>
                  <div className="text-sm text-gray-600">他のユーザーがゲームを改変できるようにする</div>
                </div>
              </label>
            </div>
            
            {publishError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-red-600 text-sm">⚠️ {publishError}</div>
              </div>
            )}
          </div>
        </section>

        {/* アクションボタン */}
        <section className="flex flex-wrap gap-4 justify-center">
          <button
            onClick={handleTestPlay}
            disabled={!project.settings.name || isTestPlaying}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            🎯 テストプレイ
          </button>
          
          <button
            onClick={handlePublish}
            disabled={!project.settings.name || isPublishing || !project.assets.objects.length}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {isPublishing ? '公開中...' : project.settings.publishing?.isPublished ? '🔄 更新' : '🚀 公開'}
          </button>
          
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            📦 エクスポート
          </button>
        </section>
        
        {/* 公開ステータス表示 */}
        {project.settings.publishing?.isPublished && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 px-4 py-2 rounded-lg">
              <span className="text-green-600">✅ 公開済み</span>
              {project.settings.publishing?.publishedAt && (
                <span className="text-green-600 text-sm">
                  {new Date(project.settings.publishing.publishedAt).toLocaleString('ja-JP')}
                </span>
              )}
            </div>
          </div>
        )}
        
        {/* ゲーム統計情報 */}
        <section className="mt-8 bg-gray-50 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-800 mb-4">📊 ゲーム統計</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {project.assets.objects.length}
              </div>
              <div className="text-sm text-gray-600">オブジェクト</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {project.script.rules.length}
              </div>
              <div className="text-sm text-gray-600">ルール</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {project.assets.texts.length}
              </div>
              <div className="text-sm text-gray-600">テキスト</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round((project.totalSize || 0) / 1024 / 1024 * 10) / 10}MB
              </div>
              <div className="text-sm text-gray-600">総容量</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsTab;