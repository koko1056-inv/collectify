
/**
 * 音声を再生するユーティリティ関数
 */

// 音声ファイルのマッピング
const sounds = {
  success: new Audio('/sounds/success.mp3'),
  error: new Audio('/sounds/error.mp3'),
  notification: new Audio('/sounds/notification.mp3'),
  click: new Audio('/sounds/click.mp3'),
};

// すべての音声を事前に読み込む
const preloadSounds = () => {
  Object.values(sounds).forEach(sound => {
    try {
      sound.load();
      // 音量を少し下げる
      sound.volume = 0.7;
    } catch (error) {
      console.warn('Sound preloading failed:', error);
    }
  });
};

// ページ読み込み時に音声を読み込む
preloadSounds();

/**
 * 指定された音声を再生する
 * @param soundName 再生する音声の名前
 * @param volume 音量 (0.0 〜 1.0)
 */
export const playSound = (soundName: keyof typeof sounds, volume: number = 0.7) => {
  const sound = sounds[soundName];
  if (sound) {
    try {
      // ユーザーインタラクションが必要な場合があるため、一度ダミーの再生を試みる
      const playPromise = sound.play();
      
      // リセットして再生
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            sound.pause();
            sound.currentTime = 0;
            sound.volume = volume;
            sound.play().catch(err => {
              console.warn('Sound playback failed:', err);
            });
          })
          .catch(err => {
            // 自動再生ポリシーによるエラー
            console.warn('Auto-play prevented by browser policy:', err);
            
            // 次回のユーザーインタラクション時に再生できるように設定
            const enableAudio = () => {
              document.removeEventListener('click', enableAudio);
              document.removeEventListener('touchstart', enableAudio);
              sound.play().catch(e => console.warn('Still failed to play sound:', e));
            };
            
            document.addEventListener('click', enableAudio, { once: true });
            document.addEventListener('touchstart', enableAudio, { once: true });
          });
      }
    } catch (error) {
      console.warn('Sound playback error:', error);
    }
  }
};

/**
 * すべての音声を一時停止する
 */
export const stopAllSounds = () => {
  Object.values(sounds).forEach(sound => {
    try {
      sound.pause();
      sound.currentTime = 0;
    } catch (error) {
      console.warn('Failed to stop sound:', error);
    }
  });
};
