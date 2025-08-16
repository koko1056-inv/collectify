import { useCallback, useRef, useEffect } from 'react';

interface UseSoundOptions {
  volume?: number;
  playbackRate?: number;
  interrupt?: boolean;
  soundEnabled?: boolean;
  preload?: boolean;
}

export function useSound(
  url: string,
  options: UseSoundOptions = {}
) {
  const {
    volume = 1,
    playbackRate = 1,
    interrupt = false,
    soundEnabled = true,
    preload = true,
  } = options;

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // プリロード処理
  useEffect(() => {
    if (preload && soundEnabled) {
      audioRef.current = new Audio(url);
      audioRef.current.volume = volume;
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.preload = 'auto';
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [url, volume, playbackRate, preload, soundEnabled]);

  const play = useCallback(() => {
    if (!soundEnabled) return;

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(url);
        audioRef.current.volume = volume;
        audioRef.current.playbackRate = playbackRate;
      }

      if (interrupt) {
        audioRef.current.currentTime = 0;
      }

      // 音声の再生を試みる
      const playPromise = audioRef.current.play();

      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn('Sound play was prevented:', error);
        });
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }, [url, volume, playbackRate, interrupt, soundEnabled]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  return [play, { stop }] as const;
}