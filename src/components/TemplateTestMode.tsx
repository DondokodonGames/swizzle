import React, { useState, useEffect } from 'react';
import EnhancedGameCanvas from './EnhancedGameCanvas'; // 変更: GameCanvas → EnhancedGameCanvas
import { GameConfig } from './GameSelector';
import { GameTemplateFactory, GameType, TemplateInfo } from '../game-engine/GameTemplateFactory';

interface TemplateTestModeProps {
  onExit: () => void;
}

const TemplateTestMode: React.FC<TemplateTestModeProps> = ({ onExit }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<GameType | null>(null);
  const [testResult, setTestResult] = useState<string>('');
  const [gameKey, setGameKey] = useState(0);
  const [implementationStatus, setImplementationStatus] = useState<Record<GameType, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [availableTemplates, setAvailableTemplates] = useState<TemplateInfo[]>([]);

  // 実装状況を自動チェック（非同期対応）
  useEffect(() => {
    const checkImplementations = async () => {
      setIsLoading(true);
      try {
        console.log('テンプレート情報を読み込み中...');
        
        // 利用可能なテンプレート一覧を非同期で取得
        const templates = await GameTemplateFactory.getAllTemplates();
        setAvailableTemplates(templates);
        
        console.log(`${templates.length}個のテンプレートを発見`);
        
        // 実装状況をチェック
        const statuses = await GameTemplateFactory.checkAllImplementations();
        setImplementationStatus(statuses);
        
        console.log('実装状況チェック完了:', statuses);
      } catch (error) {
        console.error('実装状況チェックでエラー:', error);
        setAvailableTemplates([]);
        setImplementationStatus({});
      } finally {
        setIsLoading(false);
      }
    };

    checkImplementations();
  }, []);

  // テスト用設定
  const createTestConfig = async (templateId: GameType): Promise<GameConfig | null> => {
    try {
      const templateInfo = await GameTemplateFactory.getTemplateInfo(templateId);
      
      if (!templateInfo) {
        throw new Error(`テンプレート情報が見つかりません: ${templateId}`);
      }

      return {
        gameType: templateInfo.id as any,
        characterType: 'girl',
        difficulty: templateInfo.defaultSettings.difficulty,
        duration: templateInfo.defaultSettings.duration,
        targetScore: templateInfo.defaultSettings.targetScore
      };
    } catch (error) {
      console.error('テスト設定作成エラー:', error);
      return null;
    }
  };

  // テスト開始
  const handleTestTemplate = async (templateId: GameType) => {
    setIsLoading(true);
    
    try {
      const status = implementationStatus[templateId];
      
      if (!status?.implemented) {
        setTestResult(`ℹ️ ${templateId} は未実装のため CuteTapGame で代用テスト中...`);
      } else {
        setTestResult('');
      }
      
      const config = await createTestConfig(templateId);
      
      if (!config) {
        setTestResult(`❌ ${templateId} のテスト設定作成に失敗しました`);
        setIsLoading(false);
        return;
      }
      
      setSelectedTemplate(templateId);
      setGameKey(prev => prev + 1);
    } catch (error) {
      console.error('テスト開始エラー:', error);
      setTestResult(`❌ テスト開始に失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // テスト結果
  const handleTestResult = (success?: boolean, score?: number) => {
    const result = success ? 
      `✅ 成功! スコア: ${score}` : 
      `❌ 失敗 スコア: ${score}`;
    
    const currentStatus = implementationStatus[selectedTemplate!];
    const statusInfo = currentStatus?.implemented ? 
      '(独自実装)' : '(CuteTap代用)';
    
    setTestResult(`${result} ${statusInfo}`);
    
    setTimeout(() => {
      setSelectedTemplate(null);
      setTestResult('');
    }, 3000);
  };

  if (isLoading && availableTemplates.length === 0) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔄</div>
        <div style={{ fontSize: '18px', color: '#374151', marginBottom: '10px' }}>
          実装状況を自動チェック中...
        </div>
        <div style={{ fontSize: '14px', color: '#6b7280' }}>
          全テンプレートの動作確認を行っています
        </div>
      </div>
    );
  }

  if (selectedTemplate) {
    return (
      <div style={{ position: 'relative' }}>
        {/* テスト情報表示 */}
        <div style={{
          position: 'absolute',
          top: '-60px',
          left: '0',
          right: '0',
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          padding: '10px',
          fontSize: '12px',
          textAlign: 'center',
          zIndex: 10,
          border: '2px solid #d946ef'
        }}>
          <div style={{ color: '#d946ef', fontWeight: 'bold', marginBottom: '5px' }}>
            🧪 テストモード: {selectedTemplate}
          </div>
          <div style={{ color: '#374151' }}>
            テスト実行中...（エラーハンドリング強化版）
          </div>
          {testResult && (
            <div style={{ 
              marginTop: '5px', 
              fontWeight: 'bold',
              color: testResult.includes('✅') ? '#10b981' : '#ef4444'
            }}>
              {testResult}
            </div>
          )}
        </div>

        {/* 戻るボタン */}
        <button
          onClick={onExit}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '15px',
            padding: '5px 10px',
            fontSize: '12px',
            cursor: 'pointer',
            zIndex: 10
          }}
        >
          テスト終了
        </button>

        {/* EnhancedGameCanvas */}
        <div style={{ border: '3px solid #d946ef', borderRadius: '12px' }}>
          <TestConfigProvider templateId={selectedTemplate} onGameEnd={handleTestResult} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#f3f4f6',
        borderRadius: '12px'
      }}>
        <h2 style={{ color: '#d946ef', margin: '0 0 10px 0' }}>
          🧪 テンプレート動作確認モード (強化版)
        </h2>
        <p style={{ color: '#6b7280', margin: 0, fontSize: '14px' }}>
          各テンプレートを個別にテスト + エラーハンドリング確認
        </p>
      </div>

      <button
        onClick={onExit}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: '#6b7280',
          color: 'white',
          border: 'none',
          borderRadius: '20px',
          padding: '8px 16px',
          fontSize: '14px',
          cursor: 'pointer'
        }}
      >
        通常モードに戻る
      </button>

      {availableTemplates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
          <div style={{ fontSize: '18px', color: '#dc2626' }}>
            テンプレートが見つかりません
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '10px' }}>
            GameTemplateFactory の初期化に問題がある可能性があります
          </div>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gap: '10px',
          maxHeight: '500px',
          overflowY: 'auto'
        }}>
          {availableTemplates.map((template) => {
            // 自動判定された実装状況を取得
            const status = implementationStatus[template.id] || {
              implemented: false,
              hasFile: false, 
              isRegistered: false,
              error: '状況不明'
            };
            
            // 表示用の色とテキストを決定
            let backgroundColor, borderColor, textColor, buttonText, buttonColor, statusIcon, statusText;
            
            if (status.implemented) {
              // 完全実装済み
              backgroundColor = '#f0f9ff';
              borderColor = '#0ea5e9'; 
              textColor = '#0284c7';
              buttonText = '🧪 テスト実行 (強化版)';
              buttonColor = '#10b981';
              statusIcon = '✅';
              statusText = '実装完了';
            } else if (status.hasFile && !status.isRegistered) {
              // ファイルあり、Factory未登録
              backgroundColor = '#f0fdf4';
              borderColor = '#22c55e';
              textColor = '#15803d'; 
              buttonText = '⚙️ 要Factory登録';
              buttonColor = '#22c55e';
              statusIcon = '🔶';
              statusText = 'ファイルあり・未登録';
            } else if (status.error) {
              // エラーあり
              backgroundColor = '#fef2f2';
              borderColor = '#ef4444';
              textColor = '#dc2626';
              buttonText = '🚨 エラー確認 (強化版)';
              buttonColor = '#ef4444';
              statusIcon = '❌';
              statusText = 'エラー';
            } else {
              // 未実装
              backgroundColor = '#fef3c7';
              borderColor = '#f59e0b';
              textColor = '#d97706';
              buttonText = '⚠️ 代用テスト (強化版)';
              buttonColor = '#f59e0b';
              statusIcon = '⏳';
              statusText = 'ChatGPT制作待ち';
            }
            
            return (
              <div
                key={template.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '15px',
                  backgroundColor,
                  borderRadius: '10px',
                  border: `2px solid ${borderColor}`
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontWeight: 'bold', 
                    color: textColor,
                    marginBottom: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>{statusIcon}</span>
                    {template.name} 
                    <span style={{ fontSize: '12px' }}>
                      [{template.category}]
                    </span>
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#6b7280',
                    marginBottom: '5px'
                  }}>
                    {template.description}
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#9ca3af'
                  }}>
                    {template.defaultSettings.duration}秒 | 
                    目標:{template.defaultSettings.targetScore} | 
                    {template.defaultSettings.difficulty}
                    <span style={{ 
                      marginLeft: '10px',
                      color: textColor,
                      fontWeight: 'bold'
                    }}>
                      | {statusText}
                    </span>
                    {status.error && (
                      <span style={{
                        marginLeft: '5px',
                        fontSize: '10px',
                        backgroundColor: '#fee2e2',
                        color: '#dc2626',
                        padding: '1px 4px',
                        borderRadius: '4px'
                      }}>
                        {status.error}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <button
                    onClick={() => handleTestTemplate(template.id)}
                    disabled={isLoading}
                    style={{
                      backgroundColor: buttonColor,
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '14px',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                      minWidth: '140px',
                      opacity: isLoading ? 0.6 : 1
                    }}
                  >
                    {isLoading ? '⏳ 準備中...' : buttonText}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#fef3c7',
        borderRadius: '10px',
        fontSize: '12px',
        color: '#92400e'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
          🔍 強化版テスト手順
        </div>
        <div style={{ lineHeight: '1.4' }}>
          1. 「🧪 テスト」ボタンをクリック<br/>
          2. ゲームが正常に開始するかチェック<br/>  
          3. キャラクター・UI・操作が正常かチェック<br/>
          4. 制限時間・勝利条件が機能するかチェック<br/>
          5. ゲーム終了時に結果が表示されるかチェック<br/>
          6. <strong>エラー発生時の自動復旧機能をチェック</strong><br/>
          7. <strong>FPS・メモリ使用量の表示確認</strong><br/>
          8. <strong>エラーモーダルの表示・操作確認</strong>
        </div>
      </div>
    </div>
  );
};

// テスト用設定プロバイダーコンポーネント
interface TestConfigProviderProps {
  templateId: GameType;
  onGameEnd: (success?: boolean, score?: number) => void;
}

const TestConfigProvider: React.FC<TestConfigProviderProps> = ({ templateId, onGameEnd }) => {
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const templateInfo = await GameTemplateFactory.getTemplateInfo(templateId);
        
        if (templateInfo) {
          setConfig({
            gameType: templateInfo.id as any,
            characterType: 'girl',
            difficulty: templateInfo.defaultSettings.difficulty,
            duration: templateInfo.defaultSettings.duration,
            targetScore: templateInfo.defaultSettings.targetScore
          });
        }
      } catch (error) {
        console.error('Config loading error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [templateId]);

  if (loading || !config) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center',
        fontSize: '16px',
        color: '#6b7280'
      }}>
        テスト設定を読み込み中...
      </div>
    );
  }

  return <EnhancedGameCanvas config={config} onGameEnd={onGameEnd} />; // 変更: GameCanvas → EnhancedGameCanvas
};

export default TemplateTestMode;