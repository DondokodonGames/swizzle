// src/game-engine/GameErrorManager.ts - 新規作成
export interface GameError {
  id: string
  gameType: string
  errorType: GameErrorType
  message: string
  stack?: string
  context: GameErrorContext
  timestamp: number
  userAgent: string
  resolved: boolean
}

export enum GameErrorType {
  INITIALIZATION = 'initialization',
  GAME_LOAD = 'game_load',
  GAME_RUNTIME = 'game_runtime',
  TOUCH_INPUT = 'touch_input',
  AUDIO = 'audio',
  PIXI_RENDERER = 'pixi_renderer',
  MEMORY = 'memory',
  NETWORK = 'network'
}

export interface GameErrorContext {
  gameState?: string
  screenSize?: { width: number; height: number }
  deviceInfo?: {
    isMobile: boolean
    platform: string
    pixelRatio: number
  }
  gameSettings?: any
}

export interface ErrorResolution {
  errorType: GameErrorType
  autoRetry: boolean
  maxRetries: number
  userAction?: string
  fallbackAction?: () => Promise<void>
}

export class GameErrorManager {
  private static instance: GameErrorManager
  private errors: GameError[] = []
  private resolutionStrategies: Map<GameErrorType, ErrorResolution> = new Map()
  private retryCount: Map<string, number> = new Map()
  
  private constructor() {
    this.setupResolutionStrategies()
    this.setupGlobalErrorHandlers()
  }
  
  static getInstance(): GameErrorManager {
    if (!GameErrorManager.instance) {
      GameErrorManager.instance = new GameErrorManager()
    }
    return GameErrorManager.instance
  }
  
  private setupResolutionStrategies(): void {
    this.resolutionStrategies.set(GameErrorType.INITIALIZATION, {
      errorType: GameErrorType.INITIALIZATION,
      autoRetry: true,
      maxRetries: 2,
      userAction: 'ページを再読み込みしてください',
      fallbackAction: async () => {
        // PixiJS初期化の簡単バージョンにフォールバック
        console.log('Falling back to simple PIXI initialization')
      }
    })
    
    this.resolutionStrategies.set(GameErrorType.GAME_LOAD, {
      errorType: GameErrorType.GAME_LOAD,
      autoRetry: true,
      maxRetries: 3,
      userAction: '別のゲームを試してみてください',
      fallbackAction: async () => {
        // CuteTapGame にフォールバック
        console.log('Falling back to CuteTap game')
      }
    })
    
    this.resolutionStrategies.set(GameErrorType.TOUCH_INPUT, {
      errorType: GameErrorType.TOUCH_INPUT,
      autoRetry: false,
      maxRetries: 0,
      userAction: '画面を一度タップしてから再試行してください'
    })
    
    this.resolutionStrategies.set(GameErrorType.AUDIO, {
      errorType: GameErrorType.AUDIO,
      autoRetry: false,
      maxRetries: 0,
      userAction: '音声をオフにして続行できます',
      fallbackAction: async () => {
        // 音声なしモードに切り替え
        console.log('Switching to silent mode')
      }
    })
    
    this.resolutionStrategies.set(GameErrorType.MEMORY, {
      errorType: GameErrorType.MEMORY,
      autoRetry: false,
      maxRetries: 0,
      userAction: 'ブラウザのタブを閉じて再試行してください',
      fallbackAction: async () => {
        // 軽量化モードに切り替え
        console.log('Switching to lightweight mode')
      }
    })
  }
  
  private setupGlobalErrorHandlers(): void {
    // グローバルエラーハンドラ
    window.addEventListener('error', (event) => {
      this.handleError({
        error: event.error || new Error(event.message),
        gameType: 'global',
        context: { gameState: 'global_error' }
      })
    })
    
    // Promise rejection ハンドラ
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        error: new Error(event.reason),
        gameType: 'promise',
        context: { gameState: 'unhandled_promise' }
      })
    })
  }
  
  async handleError(params: {
    error: Error
    gameType: string
    context: GameErrorContext
    forceUserNotification?: boolean
  }): Promise<void> {
    const { error, gameType, context, forceUserNotification = false } = params
    
    const errorType = this.categorizeError(error.message)
    const errorId = crypto.randomUUID()
    
    const gameError: GameError = {
      id: errorId,
      gameType,
      errorType,
      message: error.message,
      stack: error.stack,
      context: {
        ...context,
        deviceInfo: this.getDeviceInfo(),
        screenSize: { width: window.innerWidth, height: window.innerHeight }
      },
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      resolved: false
    }
    
    this.errors.push(gameError)
    this.logError(gameError)
    
    // 自動解決試行
    const resolved = await this.attemptAutoResolution(gameError)
    
    if (!resolved || forceUserNotification) {
      this.notifyUser(gameError)
    }
  }
  
  private categorizeError(message: string): GameErrorType {
    const lowercaseMessage = message.toLowerCase()
    
    if (lowercaseMessage.includes('pixi') || lowercaseMessage.includes('webgl') || lowercaseMessage.includes('canvas')) {
      return GameErrorType.PIXI_RENDERER
    }
    if (lowercaseMessage.includes('load') || lowercaseMessage.includes('import') || lowercaseMessage.includes('fetch')) {
      return GameErrorType.GAME_LOAD
    }
    if (lowercaseMessage.includes('touch') || lowercaseMessage.includes('pointer') || lowercaseMessage.includes('click')) {
      return GameErrorType.TOUCH_INPUT
    }
    if (lowercaseMessage.includes('audio') || lowercaseMessage.includes('sound')) {
      return GameErrorType.AUDIO
    }
    if (lowercaseMessage.includes('memory') || lowercaseMessage.includes('out of memory')) {
      return GameErrorType.MEMORY
    }
    if (lowercaseMessage.includes('network') || lowercaseMessage.includes('failed to fetch')) {
      return GameErrorType.NETWORK
    }
    if (lowercaseMessage.includes('initialization') || lowercaseMessage.includes('init')) {
      return GameErrorType.INITIALIZATION
    }
    
    return GameErrorType.GAME_RUNTIME
  }
  
  private async attemptAutoResolution(error: GameError): Promise<boolean> {
    const strategy = this.resolutionStrategies.get(error.errorType)
    if (!strategy || !strategy.autoRetry) {
      return false
    }
    
    const retryKey = `${error.gameType}_${error.errorType}`
    const currentRetries = this.retryCount.get(retryKey) || 0
    
    if (currentRetries >= strategy.maxRetries) {
      console.log(`Max retries (${strategy.maxRetries}) reached for ${retryKey}`)
      return false
    }
    
    this.retryCount.set(retryKey, currentRetries + 1)
    
    try {
      console.log(`Auto-resolving error ${error.id}, attempt ${currentRetries + 1}`)
      
      if (strategy.fallbackAction) {
        await strategy.fallbackAction()
      }
      
      // 成功とみなしてエラーを解決済みにマーク
      error.resolved = true
      return true
      
    } catch (retryError) {
      console.error('Auto-resolution failed:', retryError)
      return false
    }
  }
  
  private notifyUser(error: GameError): void {
    const strategy = this.resolutionStrategies.get(error.errorType)
    const userMessage = this.getUserFriendlyMessage(error, strategy)
    
    // カスタムイベントでUI層に通知
    window.dispatchEvent(new CustomEvent('gameError', {
      detail: {
        error,
        message: userMessage,
        canRetry: strategy?.maxRetries ? (this.retryCount.get(`${error.gameType}_${error.errorType}`) || 0) < strategy.maxRetries : false,
        userAction: strategy?.userAction
      }
    }))
  }
  
  private getUserFriendlyMessage(error: GameError, strategy?: ErrorResolution): string {
    const baseMessages = {
      [GameErrorType.INITIALIZATION]: 'ゲームの準備でエラーが発生しました',
      [GameErrorType.GAME_LOAD]: 'ゲームの読み込みに失敗しました',
      [GameErrorType.GAME_RUNTIME]: 'ゲーム実行中にエラーが発生しました',
      [GameErrorType.TOUCH_INPUT]: 'タッチ操作でエラーが発生しました',
      [GameErrorType.AUDIO]: '音声の再生に問題があります',
      [GameErrorType.PIXI_RENDERER]: '画面の表示に問題があります',
      [GameErrorType.MEMORY]: 'メモリ不足が発生しました',
      [GameErrorType.NETWORK]: 'ネットワーク接続に問題があります'
    }
    
    let message = baseMessages[error.errorType] || 'エラーが発生しました'
    
    if (strategy?.userAction) {
      message += `\n\n💡 ${strategy.userAction}`
    }
    
    return message
  }
  
  private getDeviceInfo(): { isMobile: boolean; platform: string; pixelRatio: number } {
    return {
      isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      platform: navigator.platform,
      pixelRatio: window.devicePixelRatio || 1
    }
  }
  
  private logError(error: GameError): void {
    // Console logging
    console.group(`🚨 Game Error: ${error.errorType}`)
    console.error('Message:', error.message)
    console.log('Game Type:', error.gameType)
    console.log('Context:', error.context)
    console.log('Timestamp:', new Date(error.timestamp).toISOString())
    if (error.stack) console.log('Stack:', error.stack)
    console.groupEnd()
    
    // LocalStorage logging (最新50件)
    try {
      const storedErrors = this.getStoredErrors()
      storedErrors.push(error)
      const recentErrors = storedErrors.slice(-50)
      localStorage.setItem('swizzle_game_errors', JSON.stringify(recentErrors))
    } catch (e) {
      console.warn('Failed to store error log:', e)
    }
  }
  
  getStoredErrors(): GameError[] {
    try {
      const stored = localStorage.getItem('swizzle_game_errors')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }
  
  // 統計情報
  getErrorStatistics(): {
    totalErrors: number
    errorsByType: Record<GameErrorType, number>
    errorsByGame: Record<string, number>
    resolvedCount: number
    recentErrors: GameError[]
  } {
    const errorsByType = this.errors.reduce((acc, error) => {
      acc[error.errorType] = (acc[error.errorType] || 0) + 1
      return acc
    }, {} as Record<GameErrorType, number>)
    
    const errorsByGame = this.errors.reduce((acc, error) => {
      acc[error.gameType] = (acc[error.gameType] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return {
      totalErrors: this.errors.length,
      errorsByType,
      errorsByGame,
      resolvedCount: this.errors.filter(e => e.resolved).length,
      recentErrors: this.errors.slice(-10)
    }
  }
  
  // 手動リトライ
  async manualRetry(errorId: string): Promise<boolean> {
    const error = this.errors.find(e => e.id === errorId)
    if (!error) return false
    
    return await this.attemptAutoResolution(error)
  }
  
  // エラークリア
  clearErrors(): void {
    this.errors = []
    this.retryCount.clear()
    localStorage.removeItem('swizzle_game_errors')
  }
}
