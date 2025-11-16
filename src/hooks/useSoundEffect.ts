import { useCallback } from 'react';

// バイブレーション用のヘルパー関数
const vibrate = (pattern: number | number[]) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

export const useSoundEffect = () => {
  const playSuccessSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // 明るい「ポン」という音
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1000, audioContext.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);

      // 触覚フィードバック（短い振動）
      vibrate(50);
    } catch (error) {
      console.error('効果音の再生に失敗しました:', error);
    }
  }, []);

  const playWishlistSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // 柔らかい「ピン」という音（少し高めの音程）
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1400, audioContext.currentTime + 0.15);

      gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.4);

      // 触覚フィードバック（2回の短い振動）
      vibrate([30, 50, 30]);
    } catch (error) {
      console.error('効果音の再生に失敗しました:', error);
    }
  }, []);

  const playLikeSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // 軽快な「ピッ」という音
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);

      // 触覚フィードバック（軽い振動）
      vibrate(30);
    } catch (error) {
      console.error('効果音の再生に失敗しました:', error);
    }
  }, []);

  // 汎用的なタップフィードバック（音なし・振動のみ）
  const playTapFeedback = useCallback(() => {
    vibrate(20);
  }, []);

  return { playSuccessSound, playWishlistSound, playLikeSound, playTapFeedback };
};
