import React, { useState, useEffect, useRef } from 'react';
import { GameConfig } from './GameSelector';

interface GameFeedItem {
  id: string;
  title: string;
  config: GameConfig;
  thumbnail: string;
  creator: string;
  likes: number;
  isLiked: boolean;
}

interface GameFeedProps {
  onGameStart: (config: GameConfig) => void;
}

const GameFeed: React.FC<GameFeedProps> = ({ onGameStart }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const feedRef = useRef<HTMLDivElement>(null);
  const autoPlayTimer = useRef<number | null>(null);

  // サンプルゲームデータ（将来はAPIから取得）
  const sampleGames: GameFeedItem[] = [
    {
      id: '001',
      title: '魔法少女みあちゃん',
      config: {
        gameType: 'cute_tap',
        characterType: 'girl',
        difficulty: 'normal',
        duration: 10,
        targetScore: 30
      },
      thumbnail: '👧',
      creator: 'あいうえお',
      likes: 245,
      isLiked: false
    },
    {
      id: '002', 
      title: 'にゃんにゃん大作戦',
      config: {
        gameType: 'cute_tap',
        characterType: 'animal',
        difficulty: 'easy',
        duration: 12,
        targetScore: 20
      },
      thumbnail: '🐱',
      creator: 'ねこすき',
      likes: 189,
      isLiked: true
    },
    {
      id: '003',
      title: 'げんきっこチャレンジ',
      config: {
        gameType: 'cute_tap',
        characterType: 'child',
        difficulty: 'hard',
        duration: 8,
        targetScore: 45
      },
      thumbnail: '🧒',
      creator: 'たのしい',
      likes: 312,
      isLiked: false
    },
    {
      id: '004',
      title: 'スピード魔法使い',
      config: {
        gameType: 'cute_tap',
        characterType: 'girl',
        difficulty: 'hard',
        duration: 7,
        targetScore: 50
      },
      thumbnail: '⚡',
      creator: 'はやい',
      likes: 156,
      isLiked: false
    },
    {
      id: '005',
      title: 'ほんわか動物園',
      config: {
        gameType: 'cute_tap',
        characterType: 'animal',
        difficulty: 'easy',
        duration: 15,
        targetScore: 25
      },
      thumbnail: '🦁',
      creator: 'どうぶつ',
      likes: 98,
      isLiked: true
    }
  ];

  const [games] = useState<GameFeedItem[]>(sampleGames);

  // 自動再生タイマー
  useEffect(() => {
    if (isAutoPlaying) {
      autoPlayTimer.current = window.setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % games.length);
      }, 4000); // 4秒後に次へ
    }

    return () => {
      if (autoPlayTimer.current) {
        clearTimeout(autoPlayTimer.current);
      }
    };
  }, [currentIndex, isAutoPlaying, games.length]);

  // スクロール処理
  const handleScroll = (direction: 'up' | 'down') => {
    setIsAutoPlaying(false);
    if (direction === 'down') {
      setCurrentIndex(prev => (prev + 1) % games.length);
    } else {
      setCurrentIndex(prev => prev === 0 ? games.length - 1 : prev - 1);
    }
  };

  // タッチ処理
  const handleTouchStart = useRef<number>(0);
  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientY;
    const diff = handleTouchStart.current - touchEnd;
    
    if (Math.abs(diff) > 50) { // 50px以上の移動で反応
      if (diff > 0) {
        handleScroll('down');
      } else {
        handleScroll('up');  
      }
    }
  };

  // ゲーム開始
  const handlePlayGame = () => {
    onGameStart(games[currentIndex].config);
  };

  // いいね切り替え
  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    // 将来的にはAPIコール
    console.log('Like toggled for game:', games[currentIndex].id);
  };

  // シェア機能
  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    // 将来的にはシェア機能
    console.log('Share game:', games[currentIndex].id);
  };

  const currentGame = games[currentIndex];

  return (
    <div 
      ref={feedRef}
      style={{
        height: '600px',
        width: '100%',
        backgroundColor: '#000',
        borderRadius: '12px',
        overflow: 'hidden',
        position: 'relative',
        userSelect: 'none'
      }}
      onTouchStart={(e) => {
        handleTouchStart.current = e.touches[0].clientY;
        setIsAutoPlaying(false);
      }}
      onTouchEnd={handleTouchEnd}
      onClick={handlePlayGame}
    >
      {/* メインコンテンツエリア */}
      <div style={{
        height: '100%',
        background: `linear-gradient(135deg, 
          ${currentGame.config.characterType === 'girl' ? '#fce7ff, #d946ef' : 
            currentGame.config.characterType === 'animal' ? '#fff7ed, #f97316' : 
            '#f0f9ff, #0ea5e9'})`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer'
      }}>
        
        {/* ゲームプレビュー */}
        <div style={{
          fontSize: '120px',
          marginBottom: '20px',
          textShadow: '0 4px 8px rgba(0,0,0,0.3)'
        }}>
          {currentGame.thumbnail}
        </div>

        {/* ゲームタイトル */}
        <h2 style={{
          color: 'white',
          fontSize: '24px',
          fontWeight: 'bold',
          margin: '0 0 10px 0',
          textAlign: 'center',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)'
        }}>
          {currentGame.title}
        </h2>

        {/* ゲーム説明 */}
        <p style={{
          color: 'rgba(255,255,255,0.9)',
          fontSize: '16px',
          margin: '0 20px 20px 20px',
          textAlign: 'center',
          textShadow: '0 1px 2px rgba(0,0,0,0.5)'
        }}>
          {currentGame.config.duration}秒で{currentGame.config.targetScore}タップ！
        </p>

        {/* プレイボタン */}
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.2)',
          borderRadius: '50px',
          padding: '15px 30px',
          backdropFilter: 'blur(10px)',
          border: '2px solid rgba(255,255,255,0.3)'
        }}>
          <span style={{
            color: 'white',
            fontSize: '18px',
            fontWeight: 'bold'
          }}>
            ▶️ タップしてプレイ
          </span>
        </div>
      </div>

      {/* サイドバー（右側） */}
      <div style={{
        position: 'absolute',
        right: '15px',
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        zIndex: 10
      }}>
        
        {/* いいねボタン */}
        <button
          onClick={handleLike}
          style={{
            backgroundColor: 'rgba(0,0,0,0.3)',
            border: 'none',
            borderRadius: '25px',
            width: '50px',
            height: '50px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)'
          }}
        >
          <span style={{ fontSize: '20px' }}>
            {currentGame.isLiked ? '❤️' : '🤍'}
          </span>
          <span style={{ 
            color: 'white', 
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {currentGame.likes}
          </span>
        </button>

        {/* シェアボタン */}
        <button
          onClick={handleShare}
          style={{
            backgroundColor: 'rgba(0,0,0,0.3)',
            border: 'none',
            borderRadius: '25px',
            width: '50px',
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)'
          }}
        >
          <span style={{ fontSize: '20px' }}>📤</span>
        </button>
      </div>

      {/* 下部情報 */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        right: '80px'
      }}>
        <div style={{ marginBottom: '10px' }}>
          <span style={{
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)'
          }}>
            @{currentGame.creator}
          </span>
        </div>
        
        {/* 進行インジケーター */}
        <div style={{
          display: 'flex',
          gap: '4px',
          alignItems: 'center'
        }}>
          {games.map((_, index) => (
            <div
              key={index}
              style={{
                width: index === currentIndex ? '20px' : '6px',
                height: '6px',
                backgroundColor: index === currentIndex ? 'white' : 'rgba(255,255,255,0.4)',
                borderRadius: '3px',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>
      </div>

      {/* 操作説明（最初だけ表示） */}
      {currentIndex === 0 && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '10px',
          borderRadius: '8px',
          fontSize: '12px',
          backdropFilter: 'blur(10px)'
        }}>
          <div>👆 タップ: プレイ</div>
          <div>↕️ スワイプ: 次/前</div>
        </div>
      )}
    </div>
  );
};

export default GameFeed;