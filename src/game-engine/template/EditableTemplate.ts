import * as PIXI from 'pixi.js';
import { GameTemplate } from '../GameTemplate';
import { UnifiedGameSettings } from '../GameTemplateFactory';

/**
 * エディター対応アセット管理システム
 */
export interface EditableAssets {
  // 必須アセット（全テンプレート共通）
  images: {
    background: string;                // 背景画像
    [key: string]: string;             // テンプレート固有画像
  };
  
  sounds: {
    bgm: string;                       // BGM（5秒ループ）
    success: string;                   // 成功SE
    failure: string;                   // 失敗SE
    [key: string]: string;             // テンプレート固有SE
  };
  
  texts: {
    successMessage: string;            // 成功メッセージ
    failureMessage: string;            // 失敗メッセージ
    [key: string]: string | string[]; // テンプレート固有テキスト
  };
  
  parameters: {
    duration: number;                  // 残り時間（全テンプレート共通）
    [key: string]: number | boolean | string; // テンプレート固有パラメータ
  };
}

/**
 * エディター設定項目定義
 */
export interface EditableProperty {
  key: string;                         // プロパティキー
  type: 'image' | 'sound' | 'text' | 'number' | 'boolean' | 'select';
  label: string;                       // エディター表示名
  description?: string;                // 説明文
  required: boolean;                   // 必須項目か
  defaultValue?: any;                  // デフォルト値
  constraints?: {
    min?: number;                      // 最小値（number型）
    max?: number;                      // 最大値（number型）
    maxLength?: number;                // 最大文字数（text型）
    options?: string[];                // 選択肢（select型）
    fileTypes?: string[];              // 対応ファイル形式（image/sound型）
  };
}

/**
 * テンプレートメタデータ（config.jsonベース）
 */
export interface EditableTemplateConfig {
  id: string;
  name: string;
  description: string;
  instruction: string;
  category: 'action' | 'puzzle' | 'timing' | 'reaction';
  version: string;
  author: string;
  
  // エディター対応情報
  editable: {
    enabled: boolean;                  // エディター対応フラグ
    tier: 'A' | 'B' | 'C';            // 実装優先度
    properties: EditableProperty[];    // 編集可能プロパティ一覧
  };
  
  // デフォルトアセット
  defaultAssets: EditableAssets;
  
  // 実装情報
  implementationStatus: 'implemented' | 'fallback' | 'missing';
  lastModified: string;
}

/**
 * エディター対応テンプレート基底クラス
 */
export abstract class EditableTemplate extends GameTemplate {
  protected assets: EditableAssets;
  protected config: EditableTemplateConfig;
  protected loadedTextures = new Map<string, PIXI.Texture>();
  protected loadedSounds = new Map<string, HTMLAudioElement>();

  // ✅ GameTemplateから継承される必須プロパティ
  public onGameEnd?: (success: boolean, score: number) => void;

  constructor(
    app: PIXI.Application, 
    settings: UnifiedGameSettings,
    config: EditableTemplateConfig,
    assets?: Partial<EditableAssets>
  ) {
    // ✅ 親クラスのコンストラクタに正しく引数を渡す
    super(app, settings);
    this.config = config;
    
    // アセット統合（カスタム + デフォルト）
    this.assets = this.mergeAssets(config.defaultAssets, assets);
    
    console.log(`EditableTemplate: ${config.name} 初期化`, {
      customAssets: !!assets,
      totalImages: Object.keys(this.assets.images).length,
      totalSounds: Object.keys(this.assets.sounds).length
    });
  }

  /**
   * アセット統合（カスタム設定 + デフォルト設定）
   */
  private mergeAssets(defaultAssets: EditableAssets, customAssets?: Partial<EditableAssets>): EditableAssets {
    if (!customAssets) {
      return JSON.parse(JSON.stringify(defaultAssets));
    }
    
    return {
      images: { ...defaultAssets.images, ...customAssets.images },
      sounds: { ...defaultAssets.sounds, ...customAssets.sounds },
      texts: { ...defaultAssets.texts, ...customAssets.texts },
      parameters: { ...defaultAssets.parameters, ...customAssets.parameters }
    };
  }

  /**
   * アセット事前読み込み
   */
  protected async preloadAssets(): Promise<void> {
    try {
      console.log(`${this.config.name}: アセット読み込み開始...`);
      
      // 画像読み込み
      await this.loadImages();
      
      // 音声読み込み
      await this.loadSounds();
      
      console.log(`${this.config.name}: アセット読み込み完了`);
    } catch (error) {
      console.error(`${this.config.name}: アセット読み込みエラー`, error);
      // フォールバック処理
      await this.createFallbackAssets();
    }
  }

  /**
   * 画像アセット読み込み
   */
  private async loadImages(): Promise<void> {
    const imagePromises = Object.entries(this.assets.images).map(async ([key, path]) => {
      try {
        let texture: PIXI.Texture;
        
        if (path.startsWith('data:') || path.startsWith('blob:')) {
          // Data URL または Blob URL の場合
          texture = await PIXI.Texture.fromURL(path);
        } else if (path.startsWith('http')) {
          // 外部URL の場合
          texture = await PIXI.Texture.fromURL(path);
        } else {
          // 相対パス の場合（デフォルトアセット）
          texture = await PIXI.Texture.fromURL(`/assets/images/${path}`);
        }
        
        this.loadedTextures.set(key, texture);
        console.log(`✅ 画像読み込み成功: ${key}`);
      } catch (error) {
        console.error(`❌ 画像読み込み失敗: ${key} - ${path}`, error);
        // フォールバック用の単色テクスチャ生成
        this.loadedTextures.set(key, this.createFallbackTexture());
      }
    });
    
    await Promise.all(imagePromises);
  }

  /**
   * 音声アセット読み込み
   */
  private async loadSounds(): Promise<void> {
    const soundPromises = Object.entries(this.assets.sounds).map(async ([key, path]) => {
      try {
        const audio = new Audio();
        
        if (path.startsWith('data:') || path.startsWith('blob:')) {
          audio.src = path;
        } else if (path.startsWith('http')) {
          audio.src = path;
        } else {
          audio.src = `/assets/sounds/${path}`;
        }
        
        // 音声読み込み完了を待機
        await new Promise((resolve, reject) => {
          audio.addEventListener('canplaythrough', resolve);
          audio.addEventListener('error', reject);
          audio.load();
        });
        
        // BGMの場合はループ設定
        if (key === 'bgm') {
          audio.loop = true;
        }
        
        this.loadedSounds.set(key, audio);
        console.log(`🔊 音声読み込み成功: ${key}`);
      } catch (error) {
        console.error(`❌ 音声読み込み失敗: ${key} - ${path}`, error);
        // フォールバックは無音
      }
    });
    
    await Promise.all(soundPromises);
  }

  /**
   * フォールバックアセット生成
   */
  private async createFallbackAssets(): Promise<void> {
    console.warn(`${this.config.name}: フォールバックアセット使用`);
    
    // フォールバック画像（単色）
    Object.keys(this.assets.images).forEach(key => {
      if (!this.loadedTextures.has(key)) {
        this.loadedTextures.set(key, this.createFallbackTexture());
      }
    });
  }

  /**
   * フォールバック用単色テクスチャ生成
   */
  private createFallbackTexture(): PIXI.Texture {
    const graphics = new PIXI.Graphics();
    graphics.beginFill(0xcccccc);
    graphics.drawRect(0, 0, 100, 100);
    graphics.endFill();
    
    return this.app.renderer.generateTexture(graphics);
  }

  /**
   * テクスチャ取得
   */
  protected getTexture(key: string): PIXI.Texture {
    return this.loadedTextures.get(key) || this.createFallbackTexture();
  }

  /**
   * 音声再生
   */
  protected playSound(key: string, volume: number = 1.0): void {
    const audio = this.loadedSounds.get(key);
    if (audio) {
      audio.volume = volume;
      audio.currentTime = 0;
      audio.play().catch(error => {
        console.warn(`音声再生失敗: ${key}`, error);
      });
    }
  }

  /**
   * BGM開始
   */
  protected startBGM(volume: number = 0.5): void {
    this.playSound('bgm', volume);
  }

  /**
   * BGM停止
   */
  protected stopBGM(): void {
    const audio = this.loadedSounds.get('bgm');
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  /**
   * テキスト取得（配列の場合はランダム選択）
   */
  protected getText(key: string): string {
    const text = this.assets.texts[key];
    
    if (Array.isArray(text)) {
      return text[Math.floor(Math.random() * text.length)];
    }
    
    return text as string || `[${key}]`;
  }

  /**
   * パラメータ取得
   */
  protected getParameter(key: string, defaultValue?: any): any {
    return this.assets.parameters[key] ?? defaultValue;
  }

  /**
   * 成功時処理（共通） - endGameを呼び出し
   */
  protected handleSuccess(score: number = 0): void {
    this.playSound('success');
    const message = this.getText('successMessage');
    console.log(`🎉 ${this.config.name} 成功: ${message}`);
    this.endGame(true, score);
  }

  /**
   * 失敗時処理（共通） - endGameを呼び出し
   */
  protected handleFailure(score: number = 0): void {
    this.playSound('failure');
    const message = this.getText('failureMessage');
    console.log(`😅 ${this.config.name} 失敗: ${message}`);
    this.endGame(false, score);
  }

  /**
   * ゲーム終了処理 - 親クラスのメソッドを呼び出し
   */
  protected endGame(success: boolean, score: number = 0): void {
    // 親クラスのendメソッドがあればそれを呼び出し、なければonGameEndを直接呼び出し
    if (typeof (this as any).end === 'function') {
      (this as any).end(success, score);
    }
    
    // onGameEndコールバック実行
    if (this.onGameEnd) {
      this.onGameEnd(success, score);
    }
  }

  /**
   * アセット情報取得（デバッグ用）
   */
  public getAssetInfo(): {
    loadedImages: string[];
    loadedSounds: string[];
    totalTextures: number;
    config: EditableTemplateConfig;
  } {
    return {
      loadedImages: Array.from(this.loadedTextures.keys()),
      loadedSounds: Array.from(this.loadedSounds.keys()),
      totalTextures: this.loadedTextures.size,
      config: this.config
    };
  }

  /**
   * リソース解放
   */
  dispose(): void {
    // BGM停止
    this.stopBGM();
    
    // テクスチャ解放
    this.loadedTextures.forEach(texture => {
      if (texture && texture.destroy) {
        texture.destroy(true);
      }
    });
    this.loadedTextures.clear();
    
    // 音声解放
    this.loadedSounds.forEach(audio => {
      audio.pause();
      audio.src = '';
    });
    this.loadedSounds.clear();
    
    // 親クラスのdisposeメソッドがあれば呼び出し
    if (typeof (this as any).dispose === 'function') {
      (this as any).dispose.call(this);
    }
    
    console.log(`${this.config.name}: リソース解放完了`);
  }

  // 抽象メソッド（各テンプレートで実装）
  abstract createScene(): Promise<void>;
  abstract start(): void;
  abstract updateGame(deltaTime: number): void;  // ✅ updateをupdateGameに変更
  abstract handleInput(event: PIXI.FederatedPointerEvent): void;

  // ✅ 親クラスのupdateメソッドを実装（updateGameを呼び出し）
  update(deltaTime: number): void {
    this.updateGame(deltaTime);
  }
}

export default EditableTemplate;