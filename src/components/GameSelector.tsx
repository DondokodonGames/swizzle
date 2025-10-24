import React, { useState } from 'react';

export type GameType = 'cute_tap' | 'memory_match' | 'quick_dodge';
export type CharacterType = 'girl' | 'animal' | 'child';
export type DifficultyType = 'easy' | 'normal' | 'hard';

export interface GameConfig {
  gameType: GameType;
  characterType: CharacterType;
  difficulty: DifficultyType;
  duration: number;
  targetScore: number;
}

interface GameSelectorProps {
  onGameStart: (config: GameConfig) => void;
  isGameRunning: boolean;
}

const GameSelector: React.FC<GameSelectorProps> = ({ onGameStart, isGameRunning }) => {
  const [config, setConfig] = useState<GameConfig>({
    gameType: 'cute_tap',
    characterType: 'girl',
    difficulty: 'normal',
    duration: 10,
    targetScore: 30
  });

  const gameTemplates = {
    cute_tap: {
      name: '🌟 キュートタップ',
      description: 'キャラクターをタップしてスコアを稼ごう！',
      icon: '👆'
    },
    memory_match: {
      name: '🧠 メモリーマッチ',
      description: '同じ絵柄を見つけてペアにしよう！（準備中）',
      icon: '🎴'
    },
    quick_dodge: {
      name: '⚡ クイックドッジ',
      description: '落ちてくるものを避け続けよう！（準備中）',
      icon: '🏃'
    }
  };

  const characters = {
    girl: { name: '女の子', icon: '👧', description: '可愛い魔法少女' },
    animal: { name: '動物', icon: '🐱', description: 'ふわふわの猫ちゃん' },
    child: { name: '子供', icon: '🧒', description: '元気な子供' }
  };

  const difficulties = {
    easy: { name: '簡単', color: '#10b981', target: 20, time: 15 },
    normal: { name: '普通', color: '#f59e0b', target: 30, time: 10 },
    hard: { name: '難しい', color: '#ef4444', target: 50, time: 8 }
  };

  const handleConfigChange = (key: keyof GameConfig, value: any) => {
    const newConfig = { ...config, [key]: value };
    
    // 難易度に応じて目標スコアと時間を自動調整
    if (key === 'difficulty') {
      const diff = difficulties[value as DifficultyType];
      newConfig.targetScore = diff.target;
      newConfig.duration = diff.time;
    }
    
    setConfig(newConfig);
  };

  const handleStartGame = () => {
    if (config.gameType === 'cute_tap') {
      onGameStart(config);
    } else {
      alert('このゲームはまだ準備中です！キュートタップをお楽しみください 😊');
    }
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '15px',
    marginBottom: '15px',
    border: '2px solid #e5e5e5',
    transition: 'all 0.2s ease'
  };

  const selectedCardStyle: React.CSSProperties = {
    ...cardStyle,
    borderColor: '#d946ef',
    backgroundColor: '#fce7ff'
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '20px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    margin: '0 5px 5px 0',
    transition: 'all 0.2s ease'
  };

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '400px', 
      fontFamily: 'Inter, sans-serif'
    }}>
      <h2 style={{ 
        color: '#d946ef', 
        textAlign: 'center', 
        marginBottom: '20px' 
      }}>
        🎮 ゲームを選ぼう
      </h2>

      {/* ゲームテンプレート選択 */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '10px', color: '#374151' }}>
          ゲームの種類
        </h3>
        {Object.entries(gameTemplates).map(([key, template]) => (
          <div
            key={key}
            style={config.gameType === key ? selectedCardStyle : cardStyle}
            onClick={() => handleConfigChange('gameType', key)}
            onMouseEnter={(e) => {
              if (config.gameType !== key) {
                e.currentTarget.style.borderColor = '#d946ef';
                e.currentTarget.style.backgroundColor = '#fafafa';
              }
            }}
            onMouseLeave={(e) => {
              if (config.gameType !== key) {
                e.currentTarget.style.borderColor = '#e5e5e5';
                e.currentTarget.style.backgroundColor = 'white';
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '24px', marginRight: '10px' }}>
                {template.icon}
              </span>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                  {template.name}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {template.description}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* キャラクター選択 */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '10px', color: '#374151' }}>
          キャラクター
        </h3>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {Object.entries(characters).map(([key, char]) => (
            <button
              key={key}
              style={{
                ...buttonStyle,
                backgroundColor: config.characterType === key ? '#d946ef' : '#f3f4f6',
                color: config.characterType === key ? 'white' : '#374151'
              }}
              onClick={() => handleConfigChange('characterType', key)}
            >
              {char.icon} {char.name}
            </button>
          ))}
        </div>
        <p style={{ 
          fontSize: '12px', 
          color: '#6b7280', 
          marginTop: '5px',
          textAlign: 'center' 
        }}>
          {characters[config.characterType].description}
        </p>
      </div>

      {/* 難易度選択 */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '10px', color: '#374151' }}>
          難易度
        </h3>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {Object.entries(difficulties).map(([key, diff]) => (
            <button
              key={key}
              style={{
                ...buttonStyle,
                backgroundColor: config.difficulty === key ? diff.color : '#f3f4f6',
                color: config.difficulty === key ? 'white' : '#374151'
              }}
              onClick={() => handleConfigChange('difficulty', key)}
            >
              {diff.name}
            </button>
          ))}
        </div>
        <div style={{ 
          fontSize: '12px', 
          color: '#6b7280', 
          marginTop: '10px',
          textAlign: 'center',
          padding: '8px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px'
        }}>
          目標: {config.targetScore}タップ / 制限時間: {config.duration}秒
        </div>
      </div>

      {/* カスタム設定（上級者向け） */}
      <details style={{ marginBottom: '20px' }}>
        <summary style={{ 
          fontSize: '14px', 
          color: '#6b7280', 
          cursor: 'pointer',
          marginBottom: '10px'
        }}>
          ⚙️ カスタム設定（上級者向け）
        </summary>
        <div style={{ 
          backgroundColor: '#f9fafb', 
          padding: '15px', 
          borderRadius: '8px' 
        }}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '12px', color: '#374151' }}>
              制限時間: {config.duration}秒
            </label>
            <input
              type="range"
              min="5"
              max="30"
              step="1"
              value={config.duration}
              onChange={(e) => handleConfigChange('duration', parseInt(e.target.value))}
              style={{ width: '100%', marginTop: '5px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#374151' }}>
              目標スコア: {config.targetScore}タップ
            </label>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={config.targetScore}
              onChange={(e) => handleConfigChange('targetScore', parseInt(e.target.value))}
              style={{ width: '100%', marginTop: '5px' }}
            />
          </div>
        </div>
      </details>

      {/* スタートボタン */}
      <button
        onClick={handleStartGame}
        disabled={isGameRunning}
        style={{
          width: '100%',
          padding: '15px',
          fontSize: '18px',
          fontWeight: 'bold',
          backgroundColor: isGameRunning ? '#9ca3af' : '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          cursor: isGameRunning ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          if (!isGameRunning) {
            e.currentTarget.style.backgroundColor = '#059669';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isGameRunning) {
            e.currentTarget.style.backgroundColor = '#10b981';
            e.currentTarget.style.transform = 'translateY(0)';
          }
        }}
      >
        {isGameRunning ? '🎮 ゲーム実行中...' : '🚀 ゲームスタート！'}
      </button>
    </div>
  );
};

export default GameSelector;