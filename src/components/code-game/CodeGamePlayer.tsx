import React, { useEffect, useRef, useCallback } from 'react';
import { CodeGameProject } from '../../types/code-game/SwizzleGameAPI';
import { CodeGameRunner, GameResult } from '../../services/code-game/CodeGameRunner';

interface Props {
  project: CodeGameProject;
  onEnd: (result: GameResult) => void;
  onError?: (message: string) => void;
}

export const CodeGamePlayer: React.FC<Props> = ({ project, onEnd, onError }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const runnerRef = useRef<CodeGameRunner | null>(null);

  const handleEnd = useCallback((result: GameResult) => {
    onEnd(result);
  }, [onEnd]);

  const handleError = useCallback((message: string) => {
    console.error('[CodeGamePlayer] error:', message);
    onError?.(message);
  }, [onError]);

  useEffect(() => {
    if (!containerRef.current) return;

    const runner = new CodeGameRunner();
    runnerRef.current = runner;
    runner.launch(project, containerRef.current, handleEnd, handleError);

    return () => {
      runner.stop();
      runnerRef.current = null;
    };
  }, [project, handleEnd, handleError]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: '#000',
        overflow: 'hidden',
      }}
    />
  );
};

export default CodeGamePlayer;
