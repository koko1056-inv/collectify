
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

// 音声が再生できる状態かどうか
let audioEnabled = false;

// すべての音声を事前に読み込む
const preloadSounds = () => {
  Object.values(sounds).forEach(sound => {
    try {
      sound.load();
      // 音量を少し下げる
      sound.volume = 0.7;
      
      // 自動再生ポリシーをテスト
      sound.play()
        .then(() => {
          // 再生できた場合、すぐに停止して再生可能フラグをセット
          sound.pause();
          sound.currentTime = 0;
          audioEnabled = true;
          console.log('Audio playback is enabled');
        })
        .catch(err => {
          // 自動再生ができない場合
          console.warn('Autoplay prevented, will enable on user interaction', err);
          audioEnabled = false;
          
          // ユーザーインタラクション時に有効化
          const enableAudio = () => {
            document.removeEventListener('click', enableAudio);
            document.removeEventListener('touchstart', enableAudio);
            audioEnabled = true;
            console.log('Audio playback now enabled via user interaction');
          };
          
          document.addEventListener('click', enableAudio, { once: true });
          document.addEventListener('touchstart', enableAudio, { once: true });
        });
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
  if (!sound) {
    console.warn(`Sound "${soundName}" not found`);
    return;
  }

  try {
    // 音声が有効でない場合は何もしない
    if (!audioEnabled) {
      console.log('Audio not enabled yet, skipping playback');
      return;
    }
    
    // クローンを作成して再生（複数の同時再生のため）
    const soundClone = sound.cloneNode() as HTMLAudioElement;
    soundClone.volume = volume;
    
    // 再生を試みる
    const playPromise = soundClone.play();
    
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.warn('Sound playback failed:', err);
        
        // エラーが出た場合、ユーザーインタラクションで有効にする
        const enableAudio = () => {
          document.removeEventListener('click', enableAudio);
          document.removeEventListener('touchstart', enableAudio);
          audioEnabled = true;
          soundClone.play().catch(e => console.warn('Still failed to play sound:', e));
        };
        
        document.addEventListener('click', enableAudio, { once: true });
        document.addEventListener('touchstart', enableAudio, { once: true });
      });
    }
  } catch (error) {
    console.warn('Sound playback error:', error);
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
