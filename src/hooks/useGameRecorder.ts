import { useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

type RecordState = 'idle' | 'recording' | 'uploading' | 'done' | 'error';

export function useGameRecorder(gameId: string) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [state, setState] = useState<RecordState>('idle');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback((canvas: HTMLCanvasElement) => {
    if (state === 'recording') return;
    chunksRef.current = [];

    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mediaRecorderRef.current = recorder;
    recorder.start(1000); // 1秒ごとにチャンクを取得
    setState('recording');
  }, [state]);

  const stop = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || state !== 'recording') return;

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });

    setState('uploading');
    setError(null);

    try {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const fileName = `${gameId}/${Date.now()}.webm`;
      const storagePath = `tiktok-videos/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from('game-assets')
        .upload(storagePath, blob, { contentType: 'video/webm', upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from('game-assets')
        .getPublicUrl(storagePath);

      const { error: updateErr } = await supabase
        .from('user_games')
        .update({ tiktok_video_url: publicUrl })
        .eq('id', gameId);

      if (updateErr) throw updateErr;

      setVideoUrl(publicUrl);
      setState('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setState('error');
    }
  }, [gameId, state]);

  const reset = useCallback(() => {
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setState('idle');
    setVideoUrl(null);
    setError(null);
  }, []);

  return { state, videoUrl, error, start, stop, reset };
}
