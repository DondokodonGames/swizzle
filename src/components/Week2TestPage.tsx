// Week2TestPage.tsx - ゲーム機能統合版
// 実際にゲームが動作するバージョン

import React, { useState, useEffect, useRef } from 'react'
import { TimerBar, VolumeControl, GameHeaderButtons, TouchEffects, GameUISystem } from './Week2Components'

// 簡易ゲーム実装
interface GameState {
  score: number
  isPlaying: boolean
  gameType: 'tap' | 'dodge' | 'collect'
  objects: GameObject[]
}

interface GameObject {
  id: number
  x: number
  y: number
  vx?: number
  vy?: number
  type: 'target' | 'obstacle' | 'collectible'
  size: number
}

const Week2TestPage: React.FC = () => {
  // UI状態管理
  const [gameTime, setGameTime] = useState<number>(30)
  const [maxTime] = useState<number>(30)
  const [isGameActive, setIsGameActive] = useState<boolean>(false)
  const [touchEffectsEnabled, setTouchEffectsEnabled] = useState<boolean>(true)
  const [volume, setVolume] = useState({ bgm: 70, se: 80 })
  const [showSettings, setShowSettings] = useState<boolean>(true)
  
  // ゲーム状態管理
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    isPlaying: false,
    gameType: 'tap',
    objects: []
  })
  
  const gameLoopRef = useRef<number>()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // タイマー制御
  useEffect(() => {
    if (!isGameActive || gameTime <= 0) {
      if (gameState.isPlaying) {
        setGameState(prev => ({ ...prev, isPlaying: false }))
      }
      return
    }

    const timer = setInterval(() => {
      setGameTime(prev => {
        const newTime = prev - 0.1
        if (newTime <= 0) {
          setIsGameActive(false)
          setGameState(prev => ({ ...prev, isPlaying: false }))
          return 0
        }
        return newTime
      })
    }, 100)

    return () => clearInterval(timer)
  }, [isGameActive, gameTime, gameState.isPlaying])

  // ゲームループ
  useEffect(() => {
    if (!gameState.isPlaying || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const gameLoop = () => {
      // キャンバスクリア
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // 背景グラデーション
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      gradient.addColorStop(0, 'rgba(102, 126, 234, 0.3)')
      gradient.addColorStop(1, 'rgba(118, 75, 162, 0.3)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // ゲームオブジェクト更新・描画
      setGameState(prev => {
        const newObjects = prev.objects.map(obj => {
          // 物理更新
          const newObj = {
            ...obj,
            x: obj.x + (obj.vx || 0),
            y: obj.y + (obj.vy || 0)
          }

          // 画面外チェック
          if (newObj.x < -obj.size || newObj.x > canvas.width + obj.size ||
              newObj.y < -obj.size || newObj.y > canvas.height + obj.size) {
            return null // 削除対象
          }

          return newObj
        }).filter(obj => obj !== null) as GameObject[]

        // 新しいオブジェクト生成（確率的）
        if (Math.random() < 0.02) { // 2%の確率
          const gameType = prev.gameType
          let newObject: GameObject

          if (gameType === 'tap') {
            newObject = {
              id: Date.now() + Math.random(),
              x: Math.random() * (canvas.width - 60) + 30,
              y: Math.random() * (canvas.height - 60) + 30,
              type: 'target',
              size: 40
            }
          } else if (gameType === 'dodge') {
            newObject = {
              id: Date.now() + Math.random(),
              x: Math.random() * canvas.width,
              y: -30,
              vx: (Math.random() - 0.5) * 4,
              vy: Math.random() * 3 + 2,
              type: 'obstacle',
              size: 30
            }
          } else { // collect
            newObject = {
              id: Date.now() + Math.random(),
              x: Math.random() * (canvas.width - 40) + 20,
              y: -20,
              vy: Math.random() * 2 + 1,
              type: 'collectible',
              size: 25
            }
          }

          newObjects.push(newObject)
        }

        return { ...prev, objects: newObjects }
      })

      // オブジェクト描画
      gameState.objects.forEach(obj => {
        ctx.save()
        ctx.translate(obj.x, obj.y)

        if (obj.type === 'target') {
          // タップターゲット（緑の円）
          ctx.fillStyle = '#10b981'
          ctx.strokeStyle = '#065f46'
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.arc(0, 0, obj.size / 2, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
          
          // 内部のプラス記号
          ctx.strokeStyle = 'white'
          ctx.lineWidth = 4
          ctx.beginPath()
          ctx.moveTo(-10, 0)
          ctx.lineTo(10, 0)
          ctx.moveTo(0, -10)
          ctx.lineTo(0, 10)
          ctx.stroke()
          
        } else if (obj.type === 'obstacle') {
          // 障害物（赤の三角形）
          ctx.fillStyle = '#ef4444'
          ctx.strokeStyle = '#7f1d1d'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(0, -obj.size / 2)
          ctx.lineTo(-obj.size / 2, obj.size / 2)
          ctx.lineTo(obj.size / 2, obj.size / 2)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
          
        } else if (obj.type === 'collectible') {
          // 収集アイテム（青のダイヤモンド）
          ctx.fillStyle = '#3b82f6'
          ctx.strokeStyle = '#1e40af'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(0, -obj.size / 2)
          ctx.lineTo(obj.size / 2, 0)
          ctx.lineTo(0, obj.size / 2)
          ctx.lineTo(-obj.size / 2, 0)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
        }

        ctx.restore()
      })

      // UI描画
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.fillRect(10, 10, 150, 60)
      ctx.fillStyle = '#374151'
      ctx.font = 'bold 16px Arial'
      ctx.fillText(`Score: ${gameState.score}`, 20, 30)
      ctx.fillText(`Time: ${gameTime.toFixed(1)}s`, 20, 50)
      
      // ゲーム説明
      const instructions = {
        tap: 'Tap green circles!',
        dodge: 'Avoid red triangles!',
        collect: 'Auto-collect diamonds!'
      }
      ctx.fillText(instructions[gameState.gameType], 20, 65)

      gameLoopRef.current = requestAnimationFrame(gameLoop)
    }

    gameLoop()
    
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [gameState.isPlaying, gameState.gameType, gameTime, gameState.score])

  // キャンバスクリック処理
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!gameState.isPlaying) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const clickX = event.clientX - rect.left
    const clickY = event.clientY - rect.top

    setGameState(prev => {
      const newObjects = [...prev.objects]
      let newScore = prev.score

      // タップゲームの場合、ターゲットをクリックしたかチェック
      if (prev.gameType === 'tap') {
        for (let i = newObjects.length - 1; i >= 0; i--) {
          const obj = newObjects[i]
          if (obj.type === 'target') {
            const distance = Math.sqrt(
              Math.pow(clickX - obj.x, 2) + Math.pow(clickY - obj.y, 2)
            )
            
            if (distance <= obj.size / 2) {
              // ヒット！
              newObjects.splice(i, 1)
              newScore += 10
              console.log('Target hit! Score:', newScore)
              break
            }
          }
        }
      }

      return {
        ...prev,
        objects: newObjects,
        score: newScore
      }
    })
  }

  // ハンドラー
  const handleSkip = () => {
    console.log('Skip pressed')
    setIsGameActive(false)
    setGameState(prev => ({ ...prev, isPlaying: false }))
    setGameTime(0)
  }

  const handleExit = () => {
    console.log('Exit pressed')
    setIsGameActive(false)
    setGameState(prev => ({ ...prev, isPlaying: false }))
    setGameTime(maxTime)
  }

  const handleStart = () => {
    setIsGameActive(true)
    setGameState(prev => ({ 
      ...prev, 
      isPlaying: true, 
      score: 0,
      objects: []
    }))
    setGameTime(maxTime)
    setShowSettings(false)
  }

  const handleReset = () => {
    setIsGameActive(false)
    setGameState(prev => ({ 
      ...prev, 
      isPlaying: false, 
      score: 0,
      objects: []
    }))
    setGameTime(maxTime)
  }

  const handleVolumeChange = (settings: any) => {
    if (typeof settings === 'object' && settings.bgm !== undefined) {
      setVolume({ bgm: settings.bgm, se: settings.se })
      console.log(`Volume changed - BGM: ${settings.bgm}%, SE: ${settings.se}%`)
    }
  }

  const handleGameTypeChange = (type: 'tap' | 'dodge' | 'collect') => {
    setGameState(prev => ({ 
      ...prev, 
      gameType: type, 
      objects: [],
      score: 0 
    }))
  }

  return (
    <div 
      className="week2-test-page" 
      style={{ 
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}
    >
      {/* Touch Effects */}
      <TouchEffects
        enabled={touchEffectsEnabled}
        maxEffects={3}
        effectDuration={800}
        effectSize={100}
      />

      {/* ゲームUI（設定画面非表示時のみ表示） */}
      {!showSettings && (
        <>
          {/* Game Canvas（中央） */}
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            onClick={handleCanvasClick}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '10px',
              background: 'rgba(0, 0, 0, 0.1)',
              cursor: gameState.gameType === 'tap' ? 'crosshair' : 'default',
              zIndex: 10
            }}
          />

          {/* Game Header Buttons（左上） */}
          <div style={{ 
            position: 'fixed', 
            top: '30px', 
            left: '30px', 
            zIndex: 9999
          }}>
            <GameHeaderButtons
              onSkip={handleSkip}
              onExit={handleExit}
              skipEnabled={isGameActive}
              exitEnabled={true}
            />
          </div>

          {/* Volume Control（右上） */}
          <div style={{ 
            position: 'fixed', 
            top: '30px', 
            right: '30px', 
            zIndex: 9999
          }}>
            <VolumeControl
              enabled={true}
              simpleMode={false}
              onVolumeChange={handleVolumeChange}
              initialBgm={volume.bgm}
              initialSe={volume.se}
            />
          </div>

          {/* Game Type Selector（左下） */}
          <div style={{
            position: 'fixed',
            bottom: '80px',
            left: '30px',
            zIndex: 9999,
            display: 'flex',
            gap: '10px'
          }}>
            {(['tap', 'dodge', 'collect'] as const).map(type => (
              <button
                key={type}
                onClick={() => handleGameTypeChange(type)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: gameState.gameType === type ? '#10b981' : 'rgba(255, 255, 255, 0.8)',
                  color: gameState.gameType === type ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                {type.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Settings Return Button（右下） */}
          <button
            onClick={() => setShowSettings(true)}
            style={{
              position: 'fixed',
              bottom: '80px',
              right: '30px',
              padding: '12px 20px',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              color: '#4c1d95',
              border: 'none',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              zIndex: 9999
            }}
          >
            Settings
          </button>
        </>
      )}

      {/* 設定画面 */}
      {showSettings && (
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '600px',
            background: 'rgba(255, 255, 255, 0.98)',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            zIndex: 10000,
            textAlign: 'center'
          }}
        >
          <h1 style={{ 
            color: '#4c1d95', 
            fontSize: '1.8rem', 
            margin: '0 0 20px 0',
            fontWeight: 'bold'
          }}>
            Week 2 UI + Game Integration Test
          </h1>

          {/* Game Type Selection */}
          <div style={{
            background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
            borderRadius: '15px',
            padding: '20px',
            marginBottom: '25px'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#374151' }}>
              Select Game Type
            </h3>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {([
                { type: 'tap', name: 'Tap Game', desc: 'Click green targets' },
                { type: 'dodge', name: 'Dodge Game', desc: 'Avoid red triangles' },
                { type: 'collect', name: 'Collect Game', desc: 'Auto-collect diamonds' }
              ] as const).map(game => (
                <button
                  key={game.type}
                  onClick={() => handleGameTypeChange(game.type)}
                  style={{
                    padding: '15px 20px',
                    backgroundColor: gameState.gameType === game.type ? '#3b82f6' : '#e5e7eb',
                    color: gameState.gameType === game.type ? 'white' : '#374151',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    textAlign: 'center',
                    minWidth: '120px'
                  }}
                >
                  <div>{game.name}</div>
                  <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px' }}>
                    {game.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Status Display */}
          <div style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            borderRadius: '15px',
            padding: '20px',
            marginBottom: '25px',
            textAlign: 'left'
          }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '15px',
              fontSize: '0.9rem'
            }}>
              <div>
                <div style={{ color: '#6b7280', marginBottom: '5px' }}>Game Type</div>
                <div style={{ fontWeight: 'bold', color: '#3b82f6' }}>
                  {gameState.gameType.toUpperCase()}
                </div>
              </div>
              
              <div>
                <div style={{ color: '#6b7280', marginBottom: '5px' }}>Score</div>
                <div style={{ fontWeight: 'bold', color: '#10b981' }}>
                  {gameState.score} points
                </div>
              </div>
              
              <div>
                <div style={{ color: '#6b7280', marginBottom: '5px' }}>Timer</div>
                <div style={{ 
                  color: isGameActive ? '#dc2626' : '#059669', 
                  fontWeight: 'bold'
                }}>
                  {gameTime.toFixed(1)}s / {maxTime}s
                </div>
              </div>
              
              <div>
                <div style={{ color: '#6b7280', marginBottom: '5px' }}>Status</div>
                <div style={{ 
                  color: gameState.isPlaying ? '#f59e0b' : '#6b7280',
                  fontWeight: 'bold'
                }}>
                  {gameState.isPlaying ? 'Playing' : 'Idle'}
                </div>
              </div>
            </div>
          </div>

          {/* Control Buttons */}
          <div style={{ 
            display: 'flex', 
            gap: '15px', 
            flexWrap: 'wrap', 
            justifyContent: 'center',
            marginBottom: '25px'
          }}>
            <button
              onClick={handleStart}
              disabled={isGameActive}
              style={{
                padding: '15px 25px',
                backgroundColor: isGameActive ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: isGameActive ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
              }}
            >
              {isGameActive ? 'Game Running...' : 'Start Game + UI Test'}
            </button>
            
            <button
              onClick={handleReset}
              style={{
                padding: '15px 25px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
              }}
            >
              Reset Everything
            </button>
            
            <button
              onClick={() => setTouchEffectsEnabled(!touchEffectsEnabled)}
              style={{
                padding: '15px 25px',
                backgroundColor: touchEffectsEnabled ? '#f59e0b' : '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
              }}
            >
              {touchEffectsEnabled ? 'Disable Effects' : 'Enable Effects'}
            </button>
          </div>

          {/* Instructions */}
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '10px',
            padding: '15px',
            fontSize: '0.85rem',
            textAlign: 'left'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '10px', textAlign: 'center' }}>
              Integration Test Instructions
            </div>
            <ol style={{ paddingLeft: '20px', color: '#374151', lineHeight: '1.6' }}>
              <li><strong>Choose Game Type</strong> and click "Start Game + UI Test"</li>
              <li><strong>Game Canvas</strong> - Play the actual game in center</li>
              <li><strong>Skip/Exit Buttons</strong> - Top-left corner controls</li>
              <li><strong>Volume Sliders</strong> - Top-right corner controls</li>
              <li><strong>Timer Bar</strong> - Bottom edge progress indicator</li>
              <li><strong>Touch Effects</strong> - Click anywhere for visual effects</li>
            </ol>
            
            <div style={{ 
              marginTop: '10px', 
              padding: '8px',
              background: 'rgba(16, 185, 129, 0.2)',
              borderRadius: '6px',
              fontSize: '0.8rem',
              textAlign: 'center'
            }}>
              This tests both UI components AND actual game functionality!
            </div>
          </div>
        </div>
      )}

      {/* Timer Bar（画面下部・常時表示） */}
      <div style={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        zIndex: 9999
      }}>
        <TimerBar
          currentTime={gameTime}
          totalTime={maxTime}
          showNumbers={false}
        />
      </div>

      {/* Debug Info */}
      <div style={{
        position: 'fixed',
        bottom: '25px',
        right: '25px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '11px',
        zIndex: 9999,
        minWidth: '180px'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Debug Info</div>
        <div>Mode: {showSettings ? 'Settings' : 'Game'}</div>
        <div>Game: {gameState.gameType.toUpperCase()}</div>
        <div>Score: {gameState.score}</div>
        <div>Objects: {gameState.objects.length}</div>
        <div>Playing: {gameState.isPlaying ? 'Yes' : 'No'}</div>
        <div>Timer: {gameTime.toFixed(1)}s</div>
        <div style={{ marginTop: '5px', color: '#fbbf24', fontSize: '10px' }}>
          Game + UI Integration Test
        </div>
      </div>
    </div>
  )
}

export default Week2TestPage