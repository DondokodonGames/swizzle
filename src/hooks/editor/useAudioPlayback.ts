// src/hooks/editor/useAudioPlayback.ts
// 🔧 Phase E-1: 音声再生システム共通ロジック抽出
import { useState, useCallback, useRef, useEffect } from 'react';
import { AudioAsset } from '../../types/editor/ProjectAssets';
import { dataUrlToObjectUrl } from '../../utils/assetUrl';

// 再生状態型定義
export interface PlaybackState {
  playingId: string | null;
  currentTime: number;
  isLoading: boolean;
  error: string | null;
}

export const useAudioPlayback = () => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // 音声再生用Ref
  const audioRef = useRef<HTMLAudioElement>(null);

  // 音声再生
  const playAudio = useCallback((audio: AudioAsset): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!audioRef.current) {
        reject(new Error('Audio element not available'));
        return;
      }

      setError(null);
      setIsLoading(true);

      // 既に再生中の場合は停止
      if (playingId === audio.id) {
        audioRef.current.pause();
        setPlayingId(null);
        setIsLoading(false);
        resolve();
        return;
      }

      // 新しい音声を設定（data: URL → blob: URL に変換してCSPをパス）
      audioRef.current.src = dataUrlToObjectUrl(audio.dataUrl);
      audioRef.current.volume = Math.max(0, Math.min(1, audio.volume ?? 0.8));
      audioRef.current.loop = audio.loop ?? false;
      
      audioRef.current.play()
        .then(() => {
          setPlayingId(audio.id);
          setIsLoading(false);
          resolve();
        })
        .catch(error => {
          console.error('音声再生エラー:', error);
          setError('音声の再生に失敗しました');
          setIsLoading(false);
          reject(error);
        });
    });
  }, [playingId]);

  // 音声停止
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingId(null);
    setCurrentTime(0);
    setError(null);
  }, []);

  // 音声一時停止
  const pauseAudio = useCallback(() => {
    if (audioRef.current && playingId) {
      audioRef.current.pause();
      setPlayingId(null);
    }
  }, [playingId]);

  // 音声再開
  const resumeAudio = useCallback((audioId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!audioRef.current) {
        reject(new Error('Audio element not available'));
        return;
      }

      setError(null);
      setIsLoading(true);

      audioRef.current.play()
        .then(() => {
          setPlayingId(audioId);
          setIsLoading(false);
          resolve();
        })
        .catch(error => {
          console.error('音声再開エラー:', error);
          setError('音声の再開に失敗しました');
          setIsLoading(false);
          reject(error);
        });
    });
  }, []);

  // 再生位置設定
  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  // 音量設定
  const setVolume = useCallback((volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, volume));
    }
  }, []);

  // 再生状態チェック
  const isPlaying = useCallback((audioId: string) => {
    return playingId === audioId;
  }, [playingId]);

  // 音声再生時間更新
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const onEnded = () => {
      setPlayingId(null);
      setCurrentTime(0);
      setError(null);
    };
    const onError = () => {
      setError('音声の再生中にエラーが発生しました');
      setPlayingId(null);
      setIsLoading(false);
    };
    const onLoadStart = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('loadstart', onLoadStart);
    audio.addEventListener('canplay', onCanPlay);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('loadstart', onLoadStart);
      audio.removeEventListener('canplay', onCanPlay);
    };
  }, []);

  // プレイヤーコンポーネント用の状態
  const playbackState: PlaybackState = {
    playingId,
    currentTime,
    isLoading,
    error
  };

  return {
    // 状態
    playbackState,
    audioRef,
    
    // アクション
    playAudio,
    stopAudio,
    pauseAudio,
    resumeAudio,
    seekTo,
    setVolume,
    isPlaying,
    
    // 便利関数
    formatTime: (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  };
};