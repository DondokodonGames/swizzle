import React, { useState } from 'react';
import GameSequence from './components/GameSequence';
import TemplateTestMode from './components/TemplateTestMode';

function App() {
  const [mode, setMode] = useState<'sequence' | 'test'>('sequence');

  const handleExitSequence = () => {
    window.location.reload();
  };

  const handleSwitchToTest = () => {
    setMode('test');
  };

  const handleSwitchToSequence = () => {
    setMode('sequence');
  };

  return (
    <div className="App" style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fce7ff 0%, #ccfbf1 100%)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: 'Inter, sans-serif'
    }}>
      <header style={{ marginBottom: '20px', textAlign: 'center' }}>
        <h1 style={{ 
          color: '#a21caf', 
          fontSize: '2.5rem',
          margin: '0 0 10px 0',
          textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
        }}>
          🌟 Swizzle Platform
        </h1>
        <p style={{ 
          color: '#52525b',
          margin: 0,
          fontSize: '1.2rem',
          fontWeight: '500'
        }}>
          {mode === 'sequence' ? 
            'メイドイン俺風・完全自動連続ゲーム体験' : 
            'テンプレート動作確認モード'
          }
        </p>

        {/* モード切り替えボタン */}
        <div style={{ marginTop: '15px' }}>
          <button
            onClick={mode === 'sequence' ? handleSwitchToTest : handleSwitchToSequence}
            style={{
              backgroundColor: mode === 'sequence' ? '#f59e0b' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              padding: '8px 20px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            {mode === 'sequence' ? '🧪 テストモード' : '🎮 通常プレイ'}
          </button>
        </div>
      </header>

      <main style={{ 
        backgroundColor: 'white',
        borderRadius: '20px',
        padding: '20px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        maxWidth: '450px',
        width: '100%',
        position: 'relative'
      }}>
        {mode === 'sequence' ? (
          <GameSequence onExit={handleExitSequence} />
        ) : (
          <TemplateTestMode onExit={handleSwitchToSequence} />
        )}
      </main>

      <footer style={{ 
        marginTop: '20px',
        color: '#6b7280',
        fontSize: '14px',
        textAlign: 'center'
      }}>
        <div>
          Phase 2: {mode === 'sequence' ? '完全自動連続プレイ' : 'テンプレート動作確認'} | 
          🎯 {mode === 'sequence' ? '真のメイドイン俺体験' : '品質保証テスト'} ✨
        </div>
        <div style={{ fontSize: '12px', marginTop: '5px' }}>
          💡 {mode === 'sequence' ? 
            '修正点: 即座開始、指示画面、結果表示、完全自動進行' : 
            'ChatGPT制作テンプレートの動作確認・デバッグ用'
          }
        </div>
        <div style={{ fontSize: '11px', marginTop: '8px', color: '#9ca3af' }}>
          🚀 進捗: 基盤完成 → テンプレート量産中 → 動作確認段階
        </div>
      </footer>
    </div>
  );
}

export default App;