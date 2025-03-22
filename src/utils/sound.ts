
/**
 * 音声を再生するユーティリティ関数
 */

// 音声ファイルのマッピング
const sounds = {
  success: new Audio('/sounds/success.mp3'),
  // 必要に応じて他の音声も追加可能
};

// 音声を読み込んでおく
Object.values(sounds).forEach(sound => {
  sound.load();
});

/**
 * 指定された音声を再生する
 * @param soundName 再生する音声の名前
 */
export const playSound = (soundName: keyof typeof sounds) => {
  const sound = sounds[soundName];
  if (sound) {
    // 音声を最初から再生
    sound.currentTime = 0;
    sound.play().catch(err => {
      // ブラウザによっては自動再生ポリシーにより再生が失敗する場合がある
      console.warn('Sound playback failed:', err);
    });
  }
};
