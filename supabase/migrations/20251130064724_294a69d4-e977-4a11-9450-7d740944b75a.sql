-- 絵文字、図形、装飾のプリセットデータを追加

-- 基本的な図形
INSERT INTO sticker_presets (name, category, svg_data, is_public) VALUES
-- 円・楕円
('円', '図形', '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="currentColor"/></svg>', true),
('楕円', '図形', '<svg viewBox="0 0 100 100"><ellipse cx="50" cy="50" rx="45" ry="30" fill="currentColor"/></svg>', true),
-- 四角形
('正方形', '図形', '<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" fill="currentColor"/></svg>', true),
('長方形', '図形', '<svg viewBox="0 0 100 100"><rect x="10" y="25" width="80" height="50" fill="currentColor"/></svg>', true),
('角丸四角形', '図形', '<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="15" fill="currentColor"/></svg>', true),
-- 三角形
('三角形', '図形', '<svg viewBox="0 0 100 100"><polygon points="50,10 90,90 10,90" fill="currentColor"/></svg>', true),
('下向き三角形', '図形', '<svg viewBox="0 0 100 100"><polygon points="50,90 90,10 10,10" fill="currentColor"/></svg>', true),
-- 星・ハート
('星', '図形', '<svg viewBox="0 0 100 100"><polygon points="50,10 61,35 89,35 67,53 78,82 50,65 22,82 33,53 11,35 39,35" fill="currentColor"/></svg>', true),
('ハート', '図形', '<svg viewBox="0 0 100 100"><path d="M50,85 C50,85 15,60 15,40 C15,25 25,15 35,15 C42,15 47,18 50,23 C53,18 58,15 65,15 C75,15 85,25 85,40 C85,60 50,85 50,85 Z" fill="currentColor"/></svg>', true),

-- 矢印
('右矢印', '矢印', '<svg viewBox="0 0 100 100"><path d="M10,45 L60,45 L60,25 L90,50 L60,75 L60,55 L10,55 Z" fill="currentColor"/></svg>', true),
('左矢印', '矢印', '<svg viewBox="0 0 100 100"><path d="M90,45 L40,45 L40,25 L10,50 L40,75 L40,55 L90,55 Z" fill="currentColor"/></svg>', true),
('上矢印', '矢印', '<svg viewBox="0 0 100 100"><path d="M45,90 L45,40 L25,40 L50,10 L75,40 L55,40 L55,90 Z" fill="currentColor"/></svg>', true),
('下矢印', '矢印', '<svg viewBox="0 0 100 100"><path d="M45,10 L45,60 L25,60 L50,90 L75,60 L55,60 L55,10 Z" fill="currentColor"/></svg>', true),
('円形矢印', '矢印', '<svg viewBox="0 0 100 100"><path d="M50,10 A40,40 0 1,1 50,90 L50,70 A20,20 0 1,0 50,30 L50,10 M60,25 L50,10 L40,25" fill="currentColor"/></svg>', true),

-- 絵文字風
('笑顔', '絵文字', '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="currentColor" opacity="0.2"/><circle cx="35" cy="40" r="5" fill="currentColor"/><circle cx="65" cy="40" r="5" fill="currentColor"/><path d="M30,55 Q50,70 70,55" stroke="currentColor" stroke-width="3" fill="none"/></svg>', true),
('悲しい顔', '絵文字', '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="currentColor" opacity="0.2"/><circle cx="35" cy="40" r="5" fill="currentColor"/><circle cx="65" cy="40" r="5" fill="currentColor"/><path d="M30,65 Q50,50 70,65" stroke="currentColor" stroke-width="3" fill="none"/></svg>', true),
('チェックマーク', '記号', '<svg viewBox="0 0 100 100"><polyline points="20,50 40,70 80,30" stroke="currentColor" stroke-width="8" fill="none"/></svg>', true),
('バツ印', '記号', '<svg viewBox="0 0 100 100"><line x1="20" y1="20" x2="80" y2="80" stroke="currentColor" stroke-width="8"/><line x1="80" y1="20" x2="20" y2="80" stroke="currentColor" stroke-width="8"/></svg>', true),
('クエスチョン', '記号', '<svg viewBox="0 0 100 100"><path d="M35,30 Q35,15 50,15 Q65,15 65,30 Q65,45 50,50 L50,60" stroke="currentColor" stroke-width="6" fill="none"/><circle cx="50" cy="75" r="5" fill="currentColor"/></svg>', true),
('ビックリマーク', '記号', '<svg viewBox="0 0 100 100"><line x1="50" y1="15" x2="50" y2="60" stroke="currentColor" stroke-width="8"/><circle cx="50" cy="75" r="5" fill="currentColor"/></svg>', true),

-- 吹き出し
('四角吹き出し', '吹き出し', '<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="60" rx="10" fill="currentColor" opacity="0.9"/><polygon points="30,70 25,85 40,70" fill="currentColor" opacity="0.9"/></svg>', true),
('丸吹き出し', '吹き出し', '<svg viewBox="0 0 100 100"><circle cx="50" cy="40" r="35" fill="currentColor" opacity="0.9"/><polygon points="40,70 35,85 50,75" fill="currentColor" opacity="0.9"/></svg>', true),
('雲吹き出し', '吹き出し', '<svg viewBox="0 0 100 100"><ellipse cx="50" cy="35" rx="40" ry="30" fill="currentColor" opacity="0.9"/><circle cx="30" cy="40" r="15" fill="currentColor" opacity="0.9"/><circle cx="70" cy="40" r="15" fill="currentColor" opacity="0.9"/><polygon points="45,60 40,75 55,65" fill="currentColor" opacity="0.9"/></svg>', true),

-- 装飾
('キラキラ', '装飾', '<svg viewBox="0 0 100 100"><polygon points="50,10 55,45 90,50 55,55 50,90 45,55 10,50 45,45" fill="currentColor"/></svg>', true),
('花', '装飾', '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="15" fill="currentColor"/><circle cx="50" cy="25" r="12" fill="currentColor" opacity="0.8"/><circle cx="75" cy="50" r="12" fill="currentColor" opacity="0.8"/><circle cx="50" cy="75" r="12" fill="currentColor" opacity="0.8"/><circle cx="25" cy="50" r="12" fill="currentColor" opacity="0.8"/></svg>', true),
('リボン', '装飾', '<svg viewBox="0 0 100 100"><path d="M20,30 L50,50 L80,30 L70,70 L50,60 L30,70 Z" fill="currentColor"/><circle cx="50" cy="50" r="8" fill="currentColor"/></svg>', true),
('王冠', '装飾', '<svg viewBox="0 0 100 100"><polygon points="15,70 15,40 30,55 50,30 70,55 85,40 85,70" fill="currentColor"/><circle cx="30" cy="35" r="5" fill="currentColor"/><circle cx="50" cy="20" r="5" fill="currentColor"/><circle cx="70" cy="35" r="5" fill="currentColor"/></svg>', true),

-- 音符
('音符1', '音楽', '<svg viewBox="0 0 100 100"><ellipse cx="30" cy="70" rx="15" ry="10" fill="currentColor"/><rect x="43" y="30" width="5" height="40" fill="currentColor"/><path d="M48,30 L75,20 L75,60 L48,70" fill="currentColor"/></svg>', true),
('音符2', '音楽', '<svg viewBox="0 0 100 100"><ellipse cx="25" cy="75" rx="12" ry="8" fill="currentColor"/><rect x="35" y="35" width="4" height="40" fill="currentColor"/><ellipse cx="50" cy="70" rx="12" ry="8" fill="currentColor"/><rect x="60" y="30" width="4" height="40" fill="currentColor"/><path d="M39,35 L64,25 L64,30 L39,40" fill="currentColor"/></svg>', true);
