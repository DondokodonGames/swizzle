import { buildIframeHtml, IframeAsset } from './iframeTemplate';
import { BestScoreStore } from './BestScoreStore';
import { CodeGameProject, CodeGameAsset, CodeGameAudioAsset, GameEndStats } from '../../types/code-game/SwizzleGameAPI';
import { captureError } from '../monitoring/Sentry';

export type GameResult = {
  result: 'success' | 'failure';
  score: number;
  /** 保存後のベストスコア(今回の記録を含む) */
  best: number;
  /** 既存ベストを更新した場合 true(初回記録は false) */
  isNewRecord: boolean;
  stats?: GameEndStats;
};
export type GameErrorCallback = (message: string) => void;
export type GameEndCallback = (result: GameResult) => void;

export interface LaunchOptions {
  /** ベストスコア保存のキー。省略時は project.id */
  gameId?: string;
}

function resolveUrl(asset: CodeGameAsset | CodeGameAudioAsset): string | null {
  if ('storageUrl' in asset && asset.storageUrl) return asset.storageUrl;
  if (asset.dataUrl) return asset.dataUrl;
  return null;
}

function buildAssetList(project: CodeGameProject): IframeAsset[] {
  const assets: IframeAsset[] = [];

  if (project.assets.background) {
    const url = resolveUrl(project.assets.background);
    if (url) assets.push({ id: project.assets.background.id, dataUrl: url, type: 'image' });
  }

  for (const obj of project.assets.objects) {
    const url = resolveUrl(obj);
    if (url) assets.push({ id: obj.id, dataUrl: url, type: 'image' });
  }

  if (project.assets.audio.bgm) {
    const url = resolveUrl(project.assets.audio.bgm);
    if (url) assets.push({ id: project.assets.audio.bgm.id, dataUrl: url, type: 'audio' });
  }

  for (const se of project.assets.audio.se) {
    const url = resolveUrl(se);
    if (url) assets.push({ id: se.id, dataUrl: url, type: 'audio' });
  }

  return assets;
}

function maxDurationMs(project: CodeGameProject): number {
  const { duration } = project.settings;
  if (duration.type === 'fixed' && duration.seconds) return (duration.seconds + 3) * 1000;
  if (duration.maxSeconds) return (duration.maxSeconds + 3) * 1000;
  return 33_000; // 30s + 3s grace
}

export class CodeGameRunner {
  private iframe: HTMLIFrameElement | null = null;
  private onEnd: GameEndCallback | null = null;
  private onError: GameErrorCallback | null = null;
  private messageHandler: ((e: MessageEvent) => void) | null = null;

  launch(
    project: CodeGameProject,
    container: HTMLElement,
    onEnd: GameEndCallback,
    onError?: GameErrorCallback,
    options?: LaunchOptions,
  ): void {
    this.stop();

    this.onEnd = onEnd;
    this.onError = onError ?? null;

    const gameId = options?.gameId || project.id;
    const bestScore = BestScoreStore.get(gameId);
    const assets = buildAssetList(project);
    const maxMs = maxDurationMs(project);
    const html = buildIframeHtml(project.code, maxMs);

    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;position:absolute;top:0;left:0;';
    iframe.srcdoc = html;
    this.iframe = iframe;

    // Clear any leftover canvas/elements from a previous rules game
    while (container.firstChild) container.removeChild(container.firstChild);

    this.messageHandler = (e: MessageEvent) => {
      const msg = e.data;
      if (!msg?.type) return;

      if (msg.type === 'READY') {
        iframe.contentWindow?.postMessage(
          { type: 'INIT', assets, context: { gameId, bestScore } },
          '*'
        );
        // Small delay to let assets finish loading inside iframe, then START
        setTimeout(() => {
          iframe.contentWindow?.postMessage({ type: 'START' }, '*');
        }, 100);
      }

      if (msg.type === 'GAME_END') {
        const score = msg.score ?? 0;
        const { best, isNewRecord } = BestScoreStore.record(gameId, score);
        this.onEnd?.({ result: msg.result, score, best, isNewRecord, stats: msg.stats });
        this.cleanup();
      }

      if (msg.type === 'ERROR') {
        console.error('[CodeGame]', msg.message);
        captureError(new Error(`[CodeGame] ${msg.message}`), { gameId });
        this.onError?.(msg.message);
      }
    };

    window.addEventListener('message', this.messageHandler);
    container.appendChild(iframe);
  }

  stop(): void {
    this.cleanup();
  }

  private cleanup(): void {
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
    if (this.iframe) {
      this.iframe.remove();
      this.iframe = null;
    }
    this.onEnd = null;
    this.onError = null;
  }
}
