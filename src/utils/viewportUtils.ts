// ショートゲームプラットフォーム - ビューポートユーティリティ
// Phase 4: 画面サイズ統一（9:16アスペクト比1080x1920基準）

import { GAME_CONFIG } from '../constants/gameConfig';

/**
 * ビューポート情報
 */
export interface ViewportInfo {
  width: number;
  height: number;
  scale: number;
  aspectRatio: number;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  orientation: 'portrait' | 'landscape';
  pixelRatio: number;
  safeArea: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

/**
 * PixiJS用アプリケーション設定
 */
export interface PixiAppConfig {
  width: number;
  height: number;
  backgroundColor: number;
  antialias: boolean;
  resolution: number;
  autoDensity: boolean;
}

/**
 * レスポンシブ座標系
 */
export interface ResponsivePosition {
  x: number;
  y: number;
  scale: number;
}

/**
 * 現在のビューポート情報を取得
 */
export function getCurrentViewport(): ViewportInfo {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspectRatio = width / height;
  const pixelRatio = window.devicePixelRatio || 1;
  
  // スケール計算（基準サイズに対する倍率）
  const scaleX = width / GAME_CONFIG.VIEWPORT.WIDTH;
  const scaleY = height / GAME_CONFIG.VIEWPORT.HEIGHT;
  const scale = Math.min(scaleX, scaleY);
  
  // デバイスタイプ判定
  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (width <= 768) {
    deviceType = 'mobile';
  } else if (width <= 1024) {
    deviceType = 'tablet';
  }
  
  // 向き判定
  const orientation = width > height ? 'landscape' : 'portrait';
  
  // セーフエリア取得（CSS環境変数から）
  const safeArea = {
    top: getCSSEnvValue('safe-area-inset-top') || 0,
    right: getCSSEnvValue('safe-area-inset-right') || 0,
    bottom: getCSSEnvValue('safe-area-inset-bottom') || 0,
    left: getCSSEnvValue('safe-area-inset-left') || 0,
  };
  
  return {
    width,
    height,
    scale,
    aspectRatio,
    deviceType,
    orientation,
    pixelRatio,
    safeArea
  };
}

/**
 * PixiJSアプリケーション用の最適化設定を生成
 */
export function createPixiAppConfig(containerElement?: HTMLElement): PixiAppConfig {
  const viewport = getCurrentViewport();
  
  // コンテナサイズ取得（指定されていればコンテナサイズ、なければビューポートサイズ）
  const containerWidth = containerElement?.clientWidth || viewport.width;
  const containerHeight = containerElement?.clientHeight || viewport.height;
  
  // スケール計算
  const scale = Math.min(
    containerWidth / GAME_CONFIG.VIEWPORT.WIDTH,
    containerHeight / GAME_CONFIG.VIEWPORT.HEIGHT
  );
  
  return {
    width: GAME_CONFIG.VIEWPORT.WIDTH * scale,
    height: GAME_CONFIG.VIEWPORT.HEIGHT * scale,
    backgroundColor: 0x1099bb,
    antialias: viewport.deviceType !== 'mobile', // モバイルでは軽量化のため無効
    resolution: Math.min(viewport.pixelRatio, 2), // 最大2倍まで
    autoDensity: true
  };
}

/**
 * 座標をレスポンシブ対応に変換
 */
export function toResponsivePosition(
  x: number, 
  y: number, 
  containerWidth?: number, 
  containerHeight?: number
): ResponsivePosition {
  const viewport = getCurrentViewport();
  const width = containerWidth || viewport.width;
  const height = containerHeight || viewport.height;
  
  const scale = Math.min(
    width / GAME_CONFIG.VIEWPORT.WIDTH,
    height / GAME_CONFIG.VIEWPORT.HEIGHT
  );
  
  return {
    x: x * scale,
    y: y * scale,
    scale
  };
}

/**
 * レスポンシブ座標から絶対座標に変換
 */
export function toAbsolutePosition(
  responsivePos: ResponsivePosition,
  containerWidth?: number,
  containerHeight?: number
): { x: number; y: number } {
  return {
    x: responsivePos.x / responsivePos.scale,
    y: responsivePos.y / responsivePos.scale
  };
}

/**
 * 画面領域の境界を取得
 */
export function getGameAreaBounds(containerWidth?: number, containerHeight?: number) {
  const viewport = getCurrentViewport();
  const width = containerWidth || viewport.width;
  const height = containerHeight || viewport.height;
  
  const scale = Math.min(
    width / GAME_CONFIG.VIEWPORT.WIDTH,
    height / GAME_CONFIG.VIEWPORT.HEIGHT
  );
  
  const scaledWidth = GAME_CONFIG.VIEWPORT.WIDTH * scale;
  const scaledHeight = GAME_CONFIG.VIEWPORT.HEIGHT * scale;
  
  // センタリングオフセット計算
  const offsetX = (width - scaledWidth) / 2;
  const offsetY = (height - scaledHeight) / 2;
  
  return {
    // ゲーム全体領域
    game: {
      x: offsetX,
      y: offsetY,
      width: scaledWidth,
      height: scaledHeight
    },
    
    // ヘッダー領域
    header: {
      x: offsetX,
      y: offsetY,
      width: scaledWidth,
      height: scaledHeight * GAME_CONFIG.GAME_AREA.HEADER.HEIGHT_RATIO
    },
    
    // メインゲーム領域
    main: {
      x: offsetX,
      y: offsetY + scaledHeight * GAME_CONFIG.GAME_AREA.MAIN.Y_START,
      width: scaledWidth,
      height: scaledHeight * GAME_CONFIG.GAME_AREA.MAIN.HEIGHT_RATIO
    },
    
    // フッター領域
    footer: {
      x: offsetX,
      y: offsetY + scaledHeight * GAME_CONFIG.GAME_AREA.FOOTER.Y_START,
      width: scaledWidth,
      height: scaledHeight * GAME_CONFIG.GAME_AREA.FOOTER.HEIGHT_RATIO
    }
  };
}

/**
 * CSS環境変数の値を取得
 */
function getCSSEnvValue(property: string): number {
  if (typeof window === 'undefined' || !window.CSS?.supports?.('top', `env(${property})`)) {
    return 0;
  }
  
  const testElement = document.createElement('div');
  testElement.style.position = 'absolute';
  testElement.style.top = `env(${property})`;
  document.body.appendChild(testElement);
  
  const computedValue = window.getComputedStyle(testElement).top;
  document.body.removeChild(testElement);
  
  return parseFloat(computedValue) || 0;
}

/**
 * ビューポート変更を監視
 */
export function createViewportObserver(
  callback: (viewport: ViewportInfo) => void,
  options: {
    throttleMs?: number;
    includeOrientation?: boolean;
  } = {}
): () => void {
  const { throttleMs = 100, includeOrientation = true } = options;
  
  // Node.js環境では number 型、ブラウザでは NodeJS.Timeout 型となる問題を解決
  let timeoutId: number | NodeJS.Timeout | null = null;
  let lastViewport = getCurrentViewport();
  
  const handleResize = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    // setTimeout の戻り値を適切に型指定
    timeoutId = setTimeout(() => {
      const currentViewport = getCurrentViewport();
      
      // 変更があった場合のみコールバック実行
      if (
        lastViewport.width !== currentViewport.width ||
        lastViewport.height !== currentViewport.height ||
        (includeOrientation && lastViewport.orientation !== currentViewport.orientation)
      ) {
        lastViewport = currentViewport;
        callback(currentViewport);
      }
      
      timeoutId = null;
    }, throttleMs);
  };
  
  // イベントリスナー登録
  window.addEventListener('resize', handleResize);
  
  if (includeOrientation) {
    window.addEventListener('orientationchange', handleResize);
  }
  
  // 初回実行
  callback(lastViewport);
  
  // クリーンアップ関数を返す
  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    window.removeEventListener('resize', handleResize);
    
    if (includeOrientation) {
      window.removeEventListener('orientationchange', handleResize);
    }
  };
}

/**
 * CSS変数でビューポート情報を設定
 */
export function setCSSViewportVariables(viewport?: ViewportInfo) {
  const vp = viewport || getCurrentViewport();
  const bounds = getGameAreaBounds();
  
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    
    // 基本ビューポート情報
    root.style.setProperty('--viewport-width', `${vp.width}px`);
    root.style.setProperty('--viewport-height', `${vp.height}px`);
    root.style.setProperty('--viewport-scale', vp.scale.toString());
    root.style.setProperty('--pixel-ratio', vp.pixelRatio.toString());
    
    // ゲーム領域情報
    root.style.setProperty('--game-width', `${bounds.game.width}px`);
    root.style.setProperty('--game-height', `${bounds.game.height}px`);
    root.style.setProperty('--game-offset-x', `${bounds.game.x}px`);
    root.style.setProperty('--game-offset-y', `${bounds.game.y}px`);
    
    // セーフエリア情報
    root.style.setProperty('--safe-area-top', `${vp.safeArea.top}px`);
    root.style.setProperty('--safe-area-right', `${vp.safeArea.right}px`);
    root.style.setProperty('--safe-area-bottom', `${vp.safeArea.bottom}px`);
    root.style.setProperty('--safe-area-left', `${vp.safeArea.left}px`);
    
    // デバイス情報をクラスで設定
    root.className = root.className.replace(
      /device-(mobile|tablet|desktop)/g, 
      ''
    ).trim();
    root.classList.add(`device-${vp.deviceType}`);
    
    root.className = root.className.replace(
      /orientation-(portrait|landscape)/g, 
      ''
    ).trim();
    root.classList.add(`orientation-${vp.orientation}`);
  }
}

/**
 * フルスクリーン対応
 */
export async function requestFullscreen(element?: HTMLElement): Promise<boolean> {
  const targetElement = element || document.documentElement;
  
  try {
    if (targetElement.requestFullscreen) {
      await targetElement.requestFullscreen();
    } else if ((targetElement as any).webkitRequestFullscreen) {
      await (targetElement as any).webkitRequestFullscreen();
    } else if ((targetElement as any).msRequestFullscreen) {
      await (targetElement as any).msRequestFullscreen();
    } else {
      return false;
    }
    return true;
  } catch (error) {
    console.error('フルスクリーン要求失敗:', error);
    return false;
  }
}

/**
 * フルスクリーン終了
 */
export async function exitFullscreen(): Promise<boolean> {
  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      await (document as any).webkitExitFullscreen();
    } else if ((document as any).msExitFullscreen) {
      await (document as any).msExitFullscreen();
    } else {
      return false;
    }
    return true;
  } catch (error) {
    console.error('フルスクリーン終了失敗:', error);
    return false;
  }
}

/**
 * ビューポート情報をデバッグ用に出力
 */
export function debugViewport(viewport?: ViewportInfo) {
  const vp = viewport || getCurrentViewport();
  const bounds = getGameAreaBounds();
  
  console.group('🖥️ Viewport Debug Info');
  console.log('基本情報:', {
    size: `${vp.width}x${vp.height}`,
    scale: vp.scale.toFixed(3),
    aspectRatio: vp.aspectRatio.toFixed(3),
    deviceType: vp.deviceType,
    orientation: vp.orientation,
    pixelRatio: vp.pixelRatio
  });
  
  console.log('ゲーム領域:', bounds);
  console.log('セーフエリア:', vp.safeArea);
  console.groupEnd();
}

/**
 * パフォーマンス監視用の軽量ビューポート情報
 */
export function getMinimalViewportInfo() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    scale: Math.min(
      window.innerWidth / GAME_CONFIG.VIEWPORT.WIDTH,
      window.innerHeight / GAME_CONFIG.VIEWPORT.HEIGHT
    )
  };
}