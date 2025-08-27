import React, { useState } from 'react';
import { GameConfig } from './GameSelector';

interface DemoModeToggleProps {
  onDemoStart: (config: GameConfig) => void;
  isGameRunning: boolean;
}

const DemoModeToggle: React.FC<DemoModeToggleProps> = ({ onDemoStart, isGameRunning }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const demoConfigs: { name: string; config: GameConfig; description: string }[] = [
    {
      name: '🌟 初心者体験',
      config: {
        gameType: 'cute_tap',
        characterType: 'girl',
        difficulty: 'easy',
        duration: 15,
        targetScore: 20
      },
      description: '15秒で20タップ - 誰でも成功できる簡単設定'
    },
    {
      name: '⚡ スピードチャレンジ',
      config: {
        gameType: 'cute_tap',
        characterType: 'animal',
        difficulty: 'hard',
        duration: 8,
        targetScore: 50
      },
      description: '8秒で50タップ - 反射神経が試される！'
    },
    {
      name: '🎯 バランス型',
      config: {
        gameType: 'cute_tap',
        characterType: 'child',
        difficulty: 'normal',
        duration: 12,
        targetScore: 35
      },
      description: '12秒で35タップ - 程よい難易度で楽しめる'
    },
    {
      name: '🏆 エキスパート',
      config: {
        gameType: 'cute_tap',
        characterType: 'girl',
        difficulty: 'hard',
        duration: 10,
        targetScore: 60
      },
      description: '10秒で60タップ - 上級者向けの極限チャレンジ'
    }
  ];

  const handleDemoClick = (config: GameConfig) => {
    onDemoStart(config);
    setIsExpanded(false);
  };

  if (!isExpanded) {
    return (
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '20px',
        opacity: isGameRunning ? 0.5 : 1,
        pointerEvents: isGameRunning ? 'none' : 'auto'
      }}>
        <button
          onClick={() => setIsExpanded(true)}
          disabled={isGameRunning}
          style={{
            backgroundColor: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '25px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: isGameRunning ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          🎪 クイックデモ
        </button>
        <p style={{ 
          fontSize: '12px', 
          color: '#6b7280', 
          margin: '5px 0 0 0' 
        }}>
          設定済みのゲームをすぐに体験
        </p>
      </div>
    );
  }

  return (
    <div style={{ 
      backgroundColor: '#f3f4f6',
      borderRadius: '12px',
      padding: '15px',
      marginBottom: '20px'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h3 style={{ 
          margin: 0,
          fontSize: '16px',
          color: '#374151'
        }}>
          🎪 クイックデモ
        </h3>
        <button
          onClick={() => setIsExpanded(false)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '16px',
            cursor: 'pointer',
            color: '#6b7280'
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'grid', gap: '10px' }}>
        {demoConfigs.map((demo, index) => (
          <button
            key={index}
            onClick={() => handleDemoClick(demo.config)}
            disabled={isGameRunning}
            style={{
              backgroundColor: 'white',
              border: '2px solid #e5e5e5',
              borderRadius: '8px',
              padding: '12px',
              textAlign: 'left',
              cursor: isGameRunning ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: isGameRunning ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!isGameRunning) {
                e.currentTarget.style.borderColor = '#8b5cf6';
                e.currentTarget.style.backgroundColor = '#faf5ff';
              }
            }}
            onMouseLeave={(e) => {
              if (!isGameRunning) {
                e.currentTarget.style.borderColor = '#e5e5e5';
                e.currentTarget.style.backgroundColor = 'white';
              }
            }}
          >
            <div style={{ 
              fontWeight: 'bold', 
              fontSize: '14px',
              marginBottom: '4px',
              color: '#374151'
            }}>
              {demo.name}
            </div>
            <div style={{ 
              fontSize: '12px', 
              color: '#6b7280',
              lineHeight: '1.3'
            }}>
              {demo.description}
            </div>
            <div style={{ 
              fontSize: '11px', 
              color: '#8b5cf6',
              marginTop: '4px',
              fontWeight: 'bold'
            }}>
              {demo.config.characterType === 'girl' ? '👧' : 
               demo.config.characterType === 'animal' ? '🐱' : '🧒'}{' '}
              {demo.config.duration}秒 | 目標{demo.config.targetScore}タップ
            </div>
          </button>
        ))}
      </div>

      <div style={{ 
        textAlign: 'center',
        marginTop: '10px',
        fontSize: '12px',
        color: '#6b7280'
      }}>
        💡 各デモは異なる難易度とキャラクターで設定されています
      </div>
    </div>
  );
};

export default DemoModeToggle;