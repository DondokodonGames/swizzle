// Phase 4 Week 2統合テスト用ページ
// 新しい共通UIシステムの動作確認

import React from 'react';
import { GameUIPreview } from './GameUISystem';

export const Week2TestPage: React.FC = () => {
  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 10000
    }}>
      <GameUIPreview />
      
      {/* テスト終了ボタン */}
      <button
        onClick={() => window.location.reload()}
        style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          padding: '8px 16px',
          backgroundColor: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '12px',
          cursor: 'pointer',
          zIndex: 10001
        }}
      >
        ❌ テスト終了
      </button>
      
      {/* 説明パネル */}
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '11px',
        maxWidth: '250px',
        zIndex: 10001
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
          🧪 Week 2 UI Test
        </div>
        <div style={{ lineHeight: 1.4 }}>
          ✨ タイマーバー（下部）<br/>
          🎵 音量設定（右上）<br/>
          🎮 ゲーム操作（上部）<br/>
          ✋ タッチエフェクト（画面タップ）<br/>
          <br/>
          💡 UキーでUI表示切り替え
        </div>
      </div>
    </div>
  );
};

export default Week2TestPage;