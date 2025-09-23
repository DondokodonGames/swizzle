// src/social/services/RealtimeUpdates.ts

export interface RealtimeEvent {
  id: string;
  type: 'like' | 'follow' | 'comment' | 'share' | 'reaction' | 'game_update' | 'user_online' | 'notification';
  payload: any;
  timestamp: string;
  userId: string;
  gameId?: string;
  metadata?: Record<string, any>;
}

export interface ConnectionConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  timeout: number;
  authentication?: {
    token: string;
    userId: string;
  };
}

export interface RealtimeStats {
  connected: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  latency: number;
  reconnectAttempts: number;
  messagesReceived: number;
  messagesSent: number;
  uptime: number;
  lastConnected?: string;
}

export type EventHandler = (event: RealtimeEvent) => void;
export type ConnectionHandler = (connected: boolean, stats: RealtimeStats) => void;

export class RealtimeUpdates {
  private static instance: RealtimeUpdates;
  private ws: WebSocket | null = null;
  private eventSource: EventSource | null = null;
  private config: ConnectionConfig;
  private eventHandlers: Map<string, EventHandler[]> = new Map();
  private connectionHandlers: ConnectionHandler[] = [];
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private isReconnecting: boolean = false;
  private stats: RealtimeStats = {
    connected: false,
    connectionQuality: 'disconnected',
    latency: 0,
    reconnectAttempts: 0,
    messagesReceived: 0,
    messagesSent: 0,
    uptime: 0
  };
  private connectionStartTime: number = 0;
  private messageQueue: RealtimeEvent[] = [];
  private connectionType: 'websocket' | 'sse' | 'polling' = 'websocket';

  static getInstance(): RealtimeUpdates {
    if (!RealtimeUpdates.instance) {
      RealtimeUpdates.instance = new RealtimeUpdates();
    }
    return RealtimeUpdates.instance;
  }

  constructor() {
    this.config = {
      url: this.getRealtimeUrl(),
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      timeout: 10000
    };

    // ネットワーク状態監視
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
      window.addEventListener('beforeunload', () => this.disconnect());
    }
  }

  // 接続開始
  async connect(config?: Partial<ConnectionConfig>): Promise<boolean> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    try {
      this.connectionStartTime = Date.now();
      this.updateStats({ connected: false, connectionQuality: 'poor' });

      // 接続方式の自動選択
      const connectionMethod = await this.selectBestConnectionMethod();
      
      switch (connectionMethod) {
        case 'websocket':
          return this.connectWebSocket();
        case 'sse':
          return this.connectSSE();
        case 'polling':
          return this.connectPolling();
        default:
          throw new Error('No supported connection method available');
      }
    } catch (error) {
      console.error('Connection failed:', error);
      this.scheduleReconnect();
      return false;
    }
  }

  // WebSocket接続
  private connectWebSocket(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.config.url.replace('http', 'ws') + '/websocket';
        this.ws = new WebSocket(wsUrl);
        this.connectionType = 'websocket';

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.onConnectionOpen();
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          this.onConnectionClose();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.onConnectionError();
          reject(error);
        };

        // 接続タイムアウト
        setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            this.ws?.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, this.config.timeout);

      } catch (error) {
        reject(error);
      }
    });
  }

  // Server-Sent Events接続
  private connectSSE(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        const sseUrl = `${this.config.url}/events`;
        const urlWithAuth = this.config.authentication 
          ? `${sseUrl}?token=${this.config.authentication.token}&userId=${this.config.authentication.userId}`
          : sseUrl;

        this.eventSource = new EventSource(urlWithAuth);
        this.connectionType = 'sse';

        this.eventSource.onopen = () => {
          console.log('SSE connected');
          this.onConnectionOpen();
          resolve(true);
        };

        this.eventSource.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.eventSource.onerror = (error) => {
          console.error('SSE error:', error);
          this.onConnectionError();
          reject(error);
        };

        // SSE接続タイムアウト
        setTimeout(() => {
          if (this.eventSource?.readyState !== EventSource.OPEN) {
            this.eventSource?.close();
            reject(new Error('SSE connection timeout'));
          }
        }, this.config.timeout);

      } catch (error) {
        reject(error);
      }
    });
  }

  // ポーリング接続
  private async connectPolling(): Promise<boolean> {
    this.connectionType = 'polling';
    this.onConnectionOpen();
    this.startPolling();
    return true;
  }

  // 最適な接続方式の選択
  private async selectBestConnectionMethod(): Promise<'websocket' | 'sse' | 'polling'> {
    // ブラウザサポート確認
    const supportsWebSocket = typeof WebSocket !== 'undefined';
    const supportsSSE = typeof EventSource !== 'undefined';

    // ネットワーク品質テスト
    const networkQuality = await this.testNetworkQuality();

    if (supportsWebSocket && networkQuality === 'excellent') {
      return 'websocket';
    } else if (supportsSSE && networkQuality !== 'poor') {
      return 'sse';
    } else {
      return 'polling';
    }
  }

  // ネットワーク品質テスト
  private async testNetworkQuality(): Promise<'excellent' | 'good' | 'poor'> {
    try {
      const startTime = performance.now();
      const response = await fetch(`${this.config.url}/ping`, {
        method: 'GET',
        cache: 'no-cache'
      });
      const endTime = performance.now();
      const latency = endTime - startTime;

      this.stats.latency = latency;

      if (latency < 100 && response.ok) {
        return 'excellent';
      } else if (latency < 300 && response.ok) {
        return 'good';
      } else {
        return 'poor';
      }
    } catch (error) {
      console.error('Network quality test failed:', error);
      return 'poor';
    }
  }

  // 接続成功時の処理
  private onConnectionOpen(): void {
    this.reconnectAttempts = 0;
    this.isReconnecting = false;
    this.updateStats({
      connected: true,
      connectionQuality: this.getConnectionQuality(),
      reconnectAttempts: this.reconnectAttempts,
      uptime: 0
    });

    // 認証
    if (this.config.authentication) {
      this.authenticate();
    }

    // ハートビート開始
    this.startHeartbeat();

    // キューに溜まったメッセージを送信
    this.flushMessageQueue();

    // 接続ハンドラー通知
    this.notifyConnectionHandlers(true);
  }

  // 接続切断時の処理
  private onConnectionClose(): void {
    this.updateStats({ connected: false, connectionQuality: 'disconnected' });
    this.stopHeartbeat();
    this.notifyConnectionHandlers(false);

    if (!this.isReconnecting && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  // エラー時の処理
  private onConnectionError(): void {
    this.updateStats({ connected: false, connectionQuality: 'poor' });
    this.scheduleReconnect();
  }

  // 再接続スケジュール
  private scheduleReconnect(): void {
    if (this.isReconnecting || this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      60000 // 最大60秒
    );

    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  // メッセージハンドリング
  private handleMessage(data: string): void {
    try {
      const event: RealtimeEvent = JSON.parse(data);
      this.stats.messagesReceived++;
      
      // イベントハンドラー実行
      const handlers = this.eventHandlers.get(event.type) || [];
      const allHandlers = this.eventHandlers.get('*') || [];
      
      [...handlers, ...allHandlers].forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error('Event handler error:', error);
        }
      });

      // 統計更新
      this.updateConnectionQuality();

    } catch (error) {
      console.error('Message parsing error:', error);
    }
  }

  // ポーリング処理
  private startPolling(): void {
    const poll = async () => {
      try {
        const response = await fetch(`${this.config.url}/poll`, {
          method: 'GET',
          headers: this.getAuthHeaders(),
          cache: 'no-cache'
        });

        if (response.ok) {
          const events = await response.json();
          events.forEach((event: RealtimeEvent) => {
            this.handleMessage(JSON.stringify(event));
          });
        }
      } catch (error) {
        console.error('Polling error:', error);
        this.onConnectionError();
      }

      if (this.stats.connected) {
        setTimeout(poll, 1000); // 1秒間隔でポーリング
      }
    };

    poll();
  }

  // 認証処理
  private authenticate(): void {
    if (!this.config.authentication) return;

    const authMessage: RealtimeEvent = {
      id: `auth_${Date.now()}`,
      type: 'authentication',
      payload: {
        token: this.config.authentication.token,
        userId: this.config.authentication.userId
      },
      timestamp: new Date().toISOString(),
      userId: this.config.authentication.userId
    };

    this.sendMessage(authMessage);
  }

  // ハートビート開始
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const pingMessage: RealtimeEvent = {
        id: `ping_${Date.now()}`,
        type: 'ping',
        payload: { timestamp: Date.now() },
        timestamp: new Date().toISOString(),
        userId: this.config.authentication?.userId || 'anonymous'
      };

      this.sendMessage(pingMessage);
    }, this.config.heartbeatInterval);
  }

  // ハートビート停止
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // メッセージ送信
  sendMessage(event: RealtimeEvent): boolean {
    const message = JSON.stringify(event);

    if (!this.stats.connected) {
      // オフライン時はキューに追加
      this.messageQueue.push(event);
      return false;
    }

    try {
      switch (this.connectionType) {
        case 'websocket':
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(message);
            this.stats.messagesSent++;
            return true;
          }
          break;
        case 'sse':
        case 'polling':
          // SSE/ポーリングでは送信はPOSTリクエスト
          this.sendViaHTTP(event);
          return true;
      }
    } catch (error) {
      console.error('Send message error:', error);
      this.messageQueue.push(event);
    }

    return false;
  }

  // HTTP経由でのメッセージ送信
  private async sendViaHTTP(event: RealtimeEvent): Promise<void> {
    try {
      await fetch(`${this.config.url}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders()
        },
        body: JSON.stringify(event)
      });
      this.stats.messagesSent++;
    } catch (error) {
      console.error('HTTP send error:', error);
      this.messageQueue.push(event);
    }
  }

  // キューのメッセージ送信
  private flushMessageQueue(): void {
    const queue = [...this.messageQueue];
    this.messageQueue = [];

    queue.forEach(event => {
      this.sendMessage(event);
    });
  }

  // 認証ヘッダー取得
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    
    if (this.config.authentication) {
      headers['Authorization'] = `Bearer ${this.config.authentication.token}`;
      headers['X-User-ID'] = this.config.authentication.userId;
    }
    
    return headers;
  }

  // イベントリスナー登録
  on(eventType: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  // イベントリスナー削除
  off(eventType: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // 接続状態リスナー登録
  onConnection(handler: ConnectionHandler): void {
    this.connectionHandlers.push(handler);
  }

  // 接続状態リスナー削除
  offConnection(handler: ConnectionHandler): void {
    const index = this.connectionHandlers.indexOf(handler);
    if (index !== -1) {
      this.connectionHandlers.splice(index, 1);
    }
  }

  // 接続状態通知
  private notifyConnectionHandlers(connected: boolean): void {
    this.connectionHandlers.forEach(handler => {
      try {
        handler(connected, this.stats);
      } catch (error) {
        console.error('Connection handler error:', error);
      }
    });
  }

  // 統計更新
  private updateStats(updates: Partial<RealtimeStats>): void {
    this.stats = { ...this.stats, ...updates };
    
    if (this.stats.connected && this.connectionStartTime > 0) {
      this.stats.uptime = Date.now() - this.connectionStartTime;
    }
  }

  // 接続品質更新
  private updateConnectionQuality(): void {
    const quality = this.getConnectionQuality();
    this.updateStats({ connectionQuality: quality });
  }

  // 接続品質計算
  private getConnectionQuality(): 'excellent' | 'good' | 'poor' | 'disconnected' {
    if (!this.stats.connected) return 'disconnected';
    
    if (this.stats.latency < 100) return 'excellent';
    if (this.stats.latency < 300) return 'good';
    return 'poor';
  }

  // ネットワーク状態変化
  private handleNetworkChange(online: boolean): void {
    if (online && !this.stats.connected) {
      console.log('Network back online, attempting to reconnect');
      this.connect();
    } else if (!online) {
      console.log('Network offline');
      this.updateStats({ connected: false, connectionQuality: 'disconnected' });
    }
  }

  // リアルタイムURL取得
  private getRealtimeUrl(): string {
    // 実装時は環境変数から取得
    const baseUrl = process.env.REACT_APP_REALTIME_URL || 'ws://localhost:3001';
    return baseUrl;
  }

  // 統計取得
  getStats(): RealtimeStats {
    return { ...this.stats };
  }

  // 接続状態確認
  isConnected(): boolean {
    return this.stats.connected;
  }

  // 切断
  disconnect(): void {
    this.isReconnecting = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.updateStats({ 
      connected: false, 
      connectionQuality: 'disconnected',
      uptime: 0
    });

    this.notifyConnectionHandlers(false);
  }

  // 即座に再接続
  reconnect(): Promise<boolean> {
    this.disconnect();
    this.reconnectAttempts = 0;
    return this.connect();
  }

  // 便利なメソッド：特定のイベント送信
  sendLike(gameId: string, userId: string, isLiked: boolean): boolean {
    const event: RealtimeEvent = {
      id: `like_${Date.now()}`,
      type: 'like',
      payload: { gameId, userId, isLiked },
      timestamp: new Date().toISOString(),
      userId,
      gameId
    };
    return this.sendMessage(event);
  }

  sendFollow(targetUserId: string, followerId: string, isFollowing: boolean): boolean {
    const event: RealtimeEvent = {
      id: `follow_${Date.now()}`,
      type: 'follow',
      payload: { targetUserId, followerId, isFollowing },
      timestamp: new Date().toISOString(),
      userId: followerId
    };
    return this.sendMessage(event);
  }

  sendReaction(gameId: string, userId: string, reactionType: string): boolean {
    const event: RealtimeEvent = {
      id: `reaction_${Date.now()}`,
      type: 'reaction',
      payload: { gameId, userId, reactionType },
      timestamp: new Date().toISOString(),
      userId,
      gameId
    };
    return this.sendMessage(event);
  }

  sendUserOnline(userId: string, isOnline: boolean): boolean {
    const event: RealtimeEvent = {
      id: `user_online_${Date.now()}`,
      type: 'user_online',
      payload: { userId, isOnline },
      timestamp: new Date().toISOString(),
      userId
    };
    return this.sendMessage(event);
  }
}