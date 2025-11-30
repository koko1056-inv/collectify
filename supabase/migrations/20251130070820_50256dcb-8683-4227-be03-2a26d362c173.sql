-- 図形カテゴリーの追加
INSERT INTO sticker_presets (name, category, svg_data, is_public) VALUES
('円', '図形', '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>', true),
('四角', '図形', '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>', true),
('三角形', '図形', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L22 21H2L12 3z"/></svg>', true),
('菱形', '図形', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L22 12L12 22L2 12L12 2z"/></svg>', true),
('六角形', '図形', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 16V8l-9-5l-9 5v8l9 5l9-5z"/></svg>', true),
('雲', '図形', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 18H6a4 4 0 0 1 0-8 5 5 0 0 1 9.5-2 4 4 0 0 1 3.5 6z"/></svg>', true),
('月', '図形', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>', true),
('花', '図形', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 7a5 5 0 1 0 5 5 1 1 0 0 1 0-2 3 3 0 1 1-3-3 1 1 0 0 1 0-2 5 5 0 0 0-2 9.6V16h-2v-1.4A5 5 0 0 0 7 10a5 5 0 1 0 5-3z"/></svg>', true);

-- 矢印カテゴリーの追加
INSERT INTO sticker_presets (name, category, svg_data, is_public) VALUES
('上矢印', '矢印', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-8 8h5v8h6v-8h5l-8-8z"/></svg>', true),
('下矢印', '矢印', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 20l8-8h-5V4H9v8H4l8 8z"/></svg>', true),
('左矢印', '矢印', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 12l8-8v5h8v6h-8v5l-8-8z"/></svg>', true),
('曲がり矢印', '矢印', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H6M12 5l-7 7 7 7"/></svg>', true),
('二重矢印', '矢印', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 5l7 7-7 7v-4H5v-6h8V5z"/></svg>', true),
('円形矢印', '矢印', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>', true);

-- 記号カテゴリーの追加
INSERT INTO sticker_presets (name, category, svg_data, is_public) VALUES
('チェック', '記号', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>', true),
('×', '記号', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>', true),
('！', '記号', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>', true),
('？', '記号', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>', true),
('プラス', '記号', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>', true),
('マイナス', '記号', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="5" y1="12" x2="19" y2="12"/></svg>', true),
('無限', '記号', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.178 8c1.618 0 2.927 1.335 2.927 2.982 0 1.647-1.309 2.982-2.927 2.982-1.618 0-2.927-1.335-2.927-2.982A2.955 2.955 0 0 1 18.178 8zM5.822 8c1.618 0 2.927 1.335 2.927 2.982 0 1.647-1.31 2.982-2.927 2.982C4.204 13.964 2.895 12.63 2.895 10.982A2.955 2.955 0 0 1 5.822 8z"/><path d="M12 8c-2.209 0-4 1.79-4 4s1.791 4 4 4 4-1.79 4-4-1.791-4-4-4z"/></svg>', true);

-- 吹き出しカテゴリーの追加
INSERT INTO sticker_presets (name, category, svg_data, is_public) VALUES
('丸吹き出し', '吹き出し', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3 .97 4.29L2 22l5.71-.97C9 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/></svg>', true),
('角吹き出し', '吹き出し', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 2h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H6l-4 4V4c0-1.1.9-2 2-2z"/></svg>', true),
('思考吹き出し', '吹き出し', '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="6"/><circle cx="8" cy="18" r="2"/><circle cx="5" cy="21" r="1"/></svg>', true),
('ハート吹き出し', '吹き出し', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>', true);

-- 装飾カテゴリーの追加
INSERT INTO sticker_presets (name, category, svg_data, is_public) VALUES
('キラキラ1', '装飾', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.5 7.5H22l-6 4.5 2.5 7.5L12 17l-6.5 4.5L8 14 2 9.5h7.5z"/></svg>', true),
('キラキラ2', '装飾', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0l1.5 6.5L20 8l-6.5 1.5L12 16l-1.5-6.5L4 8l6.5-1.5z"/><path d="M19 12l1 4 4 1-4 1-1 4-1-4-4-1 4-1z"/></svg>', true),
('リボン', '装飾', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15 12L22 15L15 18L12 28L9 18L2 15L9 12L12 2Z"/></svg>', true),
('王冠', '装飾', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l4 4 5-5 5 5 4-4-2 11H5z"/><path d="M3 19h18v2H3z"/></svg>', true),
('葉っぱ', '装飾', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.66-1.89C8 14 12 10 17 8zm3.71-3.71a1 1 0 0 0-1.42 0l-14 14a1 1 0 0 0 1.42 1.42l14-14a1 1 0 0 0 0-1.42z"/></svg>', true),
('雪の結晶', '装飾', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M18 6l-6 6-6-6M18 18l-6-6-6 6M6 12h12"/></svg>', true);

-- 音楽カテゴリーの追加
INSERT INTO sticker_presets (name, category, svg_data, is_public) VALUES
('音符1', '音楽', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>', true),
('音符2', '音楽', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3H9zm12 0v8h-4V3h4z"/></svg>', true),
('マイク', '音楽', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>', true),
('ヘッドホン', '音楽', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>', true);

-- 絵文字カテゴリーの追加（テキスト絵文字）
INSERT INTO sticker_presets (name, category, image_url, is_public) VALUES
('ハート', '絵文字', '❤️', true),
('笑顔', '絵文字', '😊', true),
('笑い', '絵文字', '😂', true),
('ウインク', '絵文字', '😉', true),
('キス', '絵文字', '😘', true),
('泣き', '絵文字', '😢', true),
('怒り', '絵文字', '😠', true),
('驚き', '絵文字', '😲', true),
('考え中', '絵文字', '🤔', true),
('サングラス', '絵文字', '😎', true),
('パーティ', '絵文字', '🥳', true),
('キラキラ目', '絵文字', '🤩', true),
('ロケット', '絵文字', '🚀', true),
('プレゼント', '絵文字', '🎁', true),
('風船', '絵文字', '🎈', true),
('花束', '絵文字', '💐', true),
('バラ', '絵文字', '🌹', true),
('桜', '絵文字', '🌸', true),
('ひまわり', '絵文字', '🌻', true),
('チューリップ', '絵文字', '🌷', true),
('虹', '絵文字', '🌈', true),
('太陽', '絵文字', '☀️', true),
('月', '絵文字', '🌙', true),
('コーヒー', '絵文字', '☕', true),
('アイス', '絵文字', '🍦', true),
('ドーナツ', '絵文字', '🍩', true),
('クッキー', '絵文字', '🍪', true),
('キャンディ', '絵文字', '🍬', true),
('誕生日ケーキ', '絵文字', '🎂', true),
('カップケーキ', '絵文字', '🧁', true);