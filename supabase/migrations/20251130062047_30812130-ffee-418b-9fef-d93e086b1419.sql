-- 豊富な絵文字・ステッカーを追加
INSERT INTO sticker_presets (category, name, svg_data, image_url, is_public) VALUES
-- 絵文字カテゴリ: 顔・感情
('emoji', 'smile', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>', null, true),
('emoji', 'heart', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>', null, true),
('emoji', 'star', '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>', null, true),
('emoji', 'thumb-up', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>', null, true),
('emoji', 'fire', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 23a7.5 7.5 0 0 1-5.138-12.963C8.204 8.774 11.5 6.5 11 1.5c6 4 9 8 3 14 1 0 2.5 0 5-2.47.27.773.5 1.604.5 2.47A7.5 7.5 0 0 1 12 23z"/></svg>', null, true),
('emoji', 'sparkles', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L14.5 7.5L22 10L14.5 12.5L12 20L9.5 12.5L2 10L9.5 7.5L12 0Z"/><path d="M19 12L20.5 16.5L25 18L20.5 19.5L19 24L17.5 19.5L13 18L17.5 16.5L19 12Z"/></svg>', null, true),
('emoji', 'music', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>', null, true),
-- 絵文字カテゴリ: 動物（絵文字として）
('emoji', 'cat', null, '😺', true),
('emoji', 'dog', null, '🐶', true),
('emoji', 'panda', null, '🐼', true),
('emoji', 'rabbit', null, '🐰', true),
('emoji', 'bear', null, '🧸', true),
('emoji', 'bird', null, '🐦', true),
('emoji', 'butterfly', null, '🦋', true),
('emoji', 'fish', null, '🐠', true),
-- 絵文字カテゴリ: 食べ物
('emoji', 'pizza', null, '🍕', true),
('emoji', 'cake', null, '🎂', true),
('emoji', 'coffee', null, '☕', true),
('emoji', 'ice-cream', null, '🍦', true),
('emoji', 'donut', null, '🍩', true),
('emoji', 'burger', null, '🍔', true),
('emoji', 'sushi', null, '🍣', true),
('emoji', 'strawberry', null, '🍓', true),
-- 絵文字カテゴリ: 天気・自然
('emoji', 'sun', null, '☀️', true),
('emoji', 'moon', null, '🌙', true),
('emoji', 'cloud', null, '☁️', true),
('emoji', 'rainbow', null, '🌈', true),
('emoji', 'flower', null, '🌸', true),
('emoji', 'tree', null, '🌳', true),
('emoji', 'leaf', null, '🍃', true),
('emoji', 'snowflake', null, '❄️', true),
-- 装飾: 矢印
('decoration', 'arrow-right', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>', null, true),
('decoration', 'arrow-left', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>', null, true),
('decoration', 'arrow-up', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>', null, true),
('decoration', 'arrow-down', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>', null, true),
-- 装飾: フレーム要素
('decoration', 'corner-1', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3 L3 9 M3 3 L9 3"/></svg>', null, true),
('decoration', 'corner-2', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 3 L21 9 M21 3 L15 3"/></svg>', null, true),
('decoration', 'corner-3', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21 L3 15 M3 21 L9 21"/></svg>', null, true),
('decoration', 'corner-4', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 21 L21 15 M21 21 L15 21"/></svg>', null, true),
-- 図形: 基本
('shape', 'circle', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>', null, true),
('shape', 'square', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>', null, true),
('shape', 'triangle', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 L22 20 L2 20 Z"/></svg>', null, true),
('shape', 'hexagon', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>', null, true),
('shape', 'cloud-shape', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>', null, true),
('shape', 'bookmark', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>', null, true);