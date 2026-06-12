// src/components/editor/review/useGamePlayback.ts
// レビューUIの「ブリッジ操作」を共有するフック（WP33 §4）。
// EditorGameBridge を介したゲーム起動/停止のライフサイクル（stopGame → rAF →
// launchFullGame → 終了コールバック、アンマウント/再生キー変更時の確実な停止）を
// ReviewQueue / GameReviewQueue で共通化する。ゲームの出所（File 由来 or Supabase 由来）は
// 呼び出し側が project として渡すだけ。
import { useEffect, useRef, useCallback } from 'react';
import { EditorGameBridge } from '../../../services/editor/EditorGameBridge';
import type { GameProject } from '../../../types/editor/GameProject';

export interface UseGamePlaybackOptions {
  /** ゲームを描画する DOM 要素への ref */
  canvasRef: React.RefObject<HTMLDivElement | null>;
  /** 現在再生すべきプロジェクト（未確定なら undefined/null） */
  project: GameProject | undefined | null;
  /** true の間だけ起動する（= phase が 'playing'） */
  active: boolean;
  /** 再生対象が切り替わるキー（通常は index）。変化で再起動する */
  playKey: number;
  /** 「やり直し」回数。変化で同じゲームを再起動する */
  replayCount: number;
  /** ゲームが正常終了したときに呼ばれる */
  onEnd: () => void;
  /** 起動エラー時のログ等（任意）。指定が無ければ握りつぶす（呼び出し側の従来挙動を保持） */
  onLaunchError?: (err: unknown) => void;
}

export interface GamePlaybackControls {
  /** 進行中のゲームを停止する（やり直し/途中判定/スキップ/離脱で使用） */
  stopGame: () => void;
}

/**
 * project / onEnd / onLaunchError はレンダーごとに同一性が変わりうるため ref 経由で参照し、
 * 再起動のトリガーは [active, playKey, replayCount] に限定する（従来の useEffect 依存配列と等価）。
 */
export function useGamePlayback(opts: UseGamePlaybackOptions): GamePlaybackControls {
  const { canvasRef, project, active, playKey, replayCount, onEnd, onLaunchError } = opts;
  const bridgeRef = useRef(EditorGameBridge.getInstance());

  const projectRef = useRef(project);
  projectRef.current = project;
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  const onErrorRef = useRef(onLaunchError);
  onErrorRef.current = onLaunchError;

  useEffect(() => {
    if (!active) return;
    const proj = projectRef.current;
    if (!proj) return;

    let cancelled = false;
    const bridge = bridgeRef.current;
    bridge.stopGame();

    requestAnimationFrame(async () => {
      if (cancelled || !canvasRef.current) return;
      try {
        await bridge.launchFullGame(proj, canvasRef.current, () => {
          if (!cancelled) onEndRef.current();
        });
      } catch (err) {
        onErrorRef.current?.(err);
        if (!cancelled) onEndRef.current();
      }
    });

    return () => {
      cancelled = true;
      bridge.stopGame();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, playKey, replayCount]);

  const stopGame = useCallback(() => {
    bridgeRef.current.stopGame();
  }, []);

  return { stopGame };
}
