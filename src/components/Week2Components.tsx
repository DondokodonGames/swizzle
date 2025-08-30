// Week2Components.tsx - 全コンポーネント統合版
// 個別ファイル配置不要・1ファイルで全機能提供

import React, { useState, useEffect, useCallback, useRef } from 'react'

// =============================================================================
// 1. TimerBar Component
// =============================================================================

interface TimerBarProps {
  currentTime: number
  totalTime: number
  showNumbers?: boolean
  className?: string
}

export const TimerBar: React.FC<TimerBarProps> = ({
  currentTime,
  totalTime,
  showNumbers = false,
  className = ''
}) => {
  const progress = Math.max(0, Math.min(100, (currentTime / totalTime) * 100))

  return (
    <div 
      className={`timer-bar ${className}`}
      style={{
        width: '100%',
        height: showNumbers ? '40px' : '8px',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Progress Bar */}
      <div
        style={{
          width: `${progress}%`,
          height: '100%',
          background: currentTime > totalTime * 0.3 ? 
            'linear-gradient(90deg, #10b981, #3b82f6)' : 
            'linear-gradient(90deg, #ef4444, #f59e0b)',
          transition: 'width 0.1s ease-out',
          borderRadius: showNumbers ? '4px' : '0'
        }}
      />
      
      {/* Numbers Display */}
      {showNumbers && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          fontSize: '14px',
          fontWeight: 'bold',
          textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
          pointerEvents: 'none'
        }}>
          {currentTime.toFixed(1)}s / {totalTime}s
        </div>
      )}
    </div>
  )
}

// =============================================================================
// 2. VolumeControl Component  
// =============================================================================

interface VolumeSettings {
  bgm: number
  se: number
  muted?: boolean
}

interface VolumeControlProps {
  enabled?: boolean
  simpleMode?: boolean
  onVolumeChange?: (settings: VolumeSettings) => void
  initialBgm?: number
  initialSe?: number
}

export const VolumeControl: React.FC<VolumeControlProps> = ({
  enabled = true,
  simpleMode = false,
  onVolumeChange,
  initialBgm = 70,
  initialSe = 80
}) => {
  const [bgmVolume, setBgmVolume] = useState(initialBgm)
  const [seVolume, setSeVolume] = useState(initialSe)
  const [isMuted, setIsMuted] = useState(false)

  const handleBgmChange = (value: number) => {
    setBgmVolume(value)
    onVolumeChange?.({ bgm: value, se: seVolume, muted: isMuted })
  }

  const handleSeChange = (value: number) => {
    setSeVolume(value)
    onVolumeChange?.({ bgm: bgmVolume, se: value, muted: isMuted })
  }

  const handleMuteToggle = () => {
    const newMuted = !isMuted
    setIsMuted(newMuted)
    onVolumeChange?.({ bgm: bgmVolume, se: seVolume, muted: newMuted })
  }

  if (!enabled) return null

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.95)',
      borderRadius: simpleMode ? '8px' : '12px',
      padding: simpleMode ? '10px' : '15px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      minWidth: simpleMode ? '120px' : '150px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px'
      }}>
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151' }}>
          Volume
        </span>
        <button
          onClick={handleMuteToggle}
          style={{
            background: isMuted ? '#ef4444' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '2px 6px',
            fontSize: '10px',
            cursor: 'pointer'
          }}
        >
          {isMuted ? 'MUTE' : 'ON'}
        </button>
      </div>

      {/* BGM Control */}
      <div style={{ marginBottom: simpleMode ? '8px' : '10px' }}>
        <div style={{ 
          fontSize: '11px', 
          color: '#6b7280', 
          marginBottom: '4px' 
        }}>
          BGM: {bgmVolume}%
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={isMuted ? 0 : bgmVolume}
          onChange={(e) => handleBgmChange(parseInt(e.target.value))}
          disabled={!enabled}
          style={{ width: '100%' }}
        />
      </div>

      {/* SE Control */}
      <div>
        <div style={{ 
          fontSize: '11px', 
          color: '#6b7280', 
          marginBottom: '4px' 
        }}>
          SE: {seVolume}%
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={isMuted ? 0 : seVolume}
          onChange={(e) => handleSeChange(parseInt(e.target.value))}
          disabled={!enabled}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  )
}

// =============================================================================
// 3. GameHeaderButtons Component
// =============================================================================

interface GameHeaderButtonsProps {
  onSkip?: () => void
  onExit?: () => void
  skipEnabled?: boolean
  exitEnabled?: boolean
  showSkip?: boolean
  showExit?: boolean
}

export const GameHeaderButtons: React.FC<GameHeaderButtonsProps> = ({
  onSkip,
  onExit,
  skipEnabled = true,
  exitEnabled = true,
  showSkip = true,
  showExit = true
}) => {
  return (
    <div style={{
      display: 'flex',
      gap: '10px',
      alignItems: 'center'
    }}>
      {showSkip && (
        <button
          onClick={onSkip}
          disabled={!skipEnabled}
          style={{
            padding: '8px 16px',
            backgroundColor: skipEnabled ? '#f59e0b' : '#9ca3af',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: skipEnabled ? 'pointer' : 'not-allowed',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s ease'
          }}
        >
          Skip
        </button>
      )}

      {showExit && (
        <button
          onClick={onExit}
          disabled={!exitEnabled}
          style={{
            padding: '8px 16px',
            backgroundColor: exitEnabled ? '#ef4444' : '#9ca3af',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: exitEnabled ? 'pointer' : 'not-allowed',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s ease'
          }}
        >
          Exit
        </button>
      )}
    </div>
  )
}

// =============================================================================
// 4. TouchEffects Component
// =============================================================================

interface TouchEffect {
  id: number
  x: number
  y: number
  timestamp: number
}

interface TouchEffectsProps {
  enabled?: boolean
  maxEffects?: number
  effectDuration?: number
  effectSize?: number
  className?: string
}

export const TouchEffects: React.FC<TouchEffectsProps> = ({
  enabled = true,
  maxEffects = 3,
  effectDuration = 800,
  effectSize = 100,
  className = ''
}) => {
  const [effects, setEffects] = useState<TouchEffect[]>([])
  const nextIdRef = useRef<number>(1)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTouch = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    if (!enabled) return

    let clientX: number, clientY: number

    if ('touches' in event && event.touches.length > 0) {
      clientX = event.touches[0].clientX
      clientY = event.touches[0].clientY
    } else if ('clientX' in event && 'clientY' in event) {
      clientX = event.clientX
      clientY = event.clientY
    } else {
      return
    }

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const x = clientX - rect.left
      const y = clientY - rect.top

      const newEffect: TouchEffect = {
        id: nextIdRef.current++,
        x,
        y,
        timestamp: Date.now()
      }

      setEffects(prev => {
        const updatedEffects = [...prev, newEffect]
        return updatedEffects.length > maxEffects 
          ? updatedEffects.slice(-maxEffects)
          : updatedEffects
      })
    }
  }, [enabled, maxEffects])

  useEffect(() => {
    if (effects.length === 0) return

    const cleanupTimer = setInterval(() => {
      const now = Date.now()
      setEffects(prev => prev.filter(effect => 
        now - effect.timestamp < effectDuration
      ))
    }, 100)

    return () => clearInterval(cleanupTimer)
  }, [effects.length, effectDuration])

  if (!enabled) return null

  return (
    <div
      ref={containerRef}
      className={`touch-effects-container ${className}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9999,
        overflow: 'hidden'
      }}
      onTouchStart={handleTouch}
      onMouseDown={handleTouch}
    >
      {effects.map(effect => {
        const age = Date.now() - effect.timestamp
        const progress = Math.min(age / effectDuration, 1)
        const opacity = Math.max(1 - progress, 0)
        const scale = 0.1 + (progress * 0.9)

        return (
          <div
            key={effect.id}
            style={{
              position: 'absolute',
              left: effect.x - effectSize / 2,
              top: effect.y - effectSize / 2,
              width: effectSize,
              height: effectSize,
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.6)',
              border: '2px solid rgba(255, 255, 255, 0.8)',
              transform: `scale(${scale})`,
              opacity: opacity,
              pointerEvents: 'none'
            }}
          />
        )
      })}
    </div>
  )
}

// =============================================================================
// 5. GameUISystem Component (統合システム)
// =============================================================================

interface GameUISystemProps {
  // Timer
  gameTime: { currentTime: number; totalTime: number; showNumbers?: boolean } | number
  maxTime?: number
  showTimer?: boolean

  // Volume
  volume?: VolumeSettings | { enabled?: boolean; simpleMode?: boolean }
  onVolumeChange?: (type: string, value: number) => void | ((settings: VolumeSettings) => void)

  // Buttons
  onSkip?: () => void
  onExit?: () => void
  skipEnabled?: boolean
  exitEnabled?: boolean
  showHeaderButtons?: boolean

  // Touch Effects
  touchEffectsEnabled?: boolean
  maxTouchEffects?: number
  touchEffectDuration?: number

  // Layout
  layout?: 'game' | 'test' | 'minimal'
  className?: string
  style?: React.CSSProperties
}

export const GameUISystem: React.FC<GameUISystemProps> = ({
  gameTime,
  maxTime = 30,
  showTimer = true,
  volume = { enabled: true, simpleMode: false },
  onVolumeChange,
  onSkip,
  onExit,
  skipEnabled = true,
  exitEnabled = true,
  showHeaderButtons = true,
  touchEffectsEnabled = true,
  maxTouchEffects = 3,
  touchEffectDuration = 800,
  layout = 'game',
  className = '',
  style = {}
}) => {
  // gameTime正規化
  const normalizedGameTime = typeof gameTime === 'number' 
    ? { currentTime: gameTime, totalTime: maxTime, showNumbers: false }
    : gameTime

  // volume正規化
  const normalizedVolume = 'enabled' in volume 
    ? { enabled: volume.enabled, simpleMode: volume.simpleMode }
    : volume

  const layoutConfig = {
    minimal: { showTimer: false, showVolumeControl: false, showHeaderButtons: false, touchEffectsEnabled: false },
    test: { showTimer: true, showVolumeControl: true, showHeaderButtons: true, touchEffectsEnabled: true },
    game: { showTimer: true, showVolumeControl: true, showHeaderButtons: true, touchEffectsEnabled: true }
  }[layout]

  const shouldShowTimer = showTimer && layoutConfig.showTimer
  const shouldShowVolumeControl = showHeaderButtons && layoutConfig.showVolumeControl
  const shouldShowHeaderButtons = showHeaderButtons && layoutConfig.showHeaderButtons
  const shouldEnableTouchEffects = touchEffectsEnabled && layoutConfig.touchEffectsEnabled

  return (
    <div 
      className={`game-ui-system ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 50,
        ...style
      }}
    >
      {/* Touch Effects */}
      {shouldEnableTouchEffects && (
        <TouchEffects
          enabled={shouldEnableTouchEffects}
          maxEffects={maxTouchEffects}
          effectDuration={touchEffectDuration}
        />
      )}

      {/* Header Buttons */}
      {shouldShowHeaderButtons && onSkip && onExit && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          pointerEvents: 'auto',
          padding: '20px'
        }}>
          <GameHeaderButtons
            onSkip={onSkip}
            onExit={onExit}
            skipEnabled={skipEnabled}
            exitEnabled={exitEnabled}
          />
        </div>
      )}

      {/* Volume Control */}
      {shouldShowVolumeControl && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 101,
          pointerEvents: 'auto'
        }}>
          <VolumeControl
            enabled={'enabled' in normalizedVolume ? normalizedVolume.enabled : true}
            simpleMode={'simpleMode' in normalizedVolume ? normalizedVolume.simpleMode : false}
            onVolumeChange={(settings) => {
              if (typeof onVolumeChange === 'function') {
                // Try both callback signatures
                try {
                  (onVolumeChange as any)('bgm', settings.bgm)
                  ;(onVolumeChange as any)('se', settings.se)
                } catch {
                  ;(onVolumeChange as any)(settings)
                }
              }
            }}
          />
        </div>
      )}

      {/* Timer Bar */}
      {shouldShowTimer && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          pointerEvents: 'auto'
        }}>
          <TimerBar
            currentTime={normalizedGameTime.currentTime}
            totalTime={normalizedGameTime.totalTime}
            showNumbers={normalizedGameTime.showNumbers || false}
          />
        </div>
      )}
    </div>
  )
}

export default {
  TimerBar,
  VolumeControl,
  GameHeaderButtons,
  TouchEffects,
  GameUISystem
}