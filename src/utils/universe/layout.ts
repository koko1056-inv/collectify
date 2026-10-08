/**
 * 「推し宇宙」の配置。持っているグッズを作品（コンテンツ）ごとの銀河にまとめ、
 * 1つ1つのグッズを星として置く。画面にも共有カードにも同じ配置を使うので、描画から切り離した純関数にしてある。
 *
 *  - 銀河: 作品ごと。持っている数が多いほど大きく、いちばん大きい銀河が中心に来る
 *  - 星: グッズ1つ。お迎えが古い順に中心から渦を巻いて外へ並ぶ（足すほど銀河が育つ）
 *  - 同じグッズを複数持っていれば、その星は少し大きくなる
 */

export interface UniverseItemInput {
  id: string;
  title: string;
  image: string;
  quantity: number;
  /** 作品名。無ければ「その他」にまとめる */
  contentName: string | null;
}

export interface Star {
  id: string;
  title: string;
  image: string;
  quantity: number;
  /** 世界座標（銀河の回転前） */
  x: number;
  y: number;
  r: number;
}

export interface Galaxy {
  key: string;
  label: string;
  /** グッズ（カード）の数 */
  count: number;
  /** 同じグッズの重複を含めた個数 */
  quantity: number;
  hue: number;
  x: number;
  y: number;
  radius: number;
  /** 回る向きと速さ（-1〜1） */
  spin: number;
  stars: Star[];
}

export interface Universe {
  galaxies: Galaxy[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  totalItems: number;
  totalQuantity: number;
}

/** 星の基準の大きさ（世界座標） */
export const STAR_R = 14;
const SPACING = STAR_R * 3.2;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
// 作品名の札を銀河の上に置くので、隣との間に札の分の余白を取る
const GALAXY_GAP = STAR_R * 7;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 作品名から色相を決める。同じ作品はいつも同じ色になる */
export function hueFor(label: string): number {
  return (hash(label) * 137.508) % 360;
}

export const OTHER_LABEL = "その他";

export function buildUniverse(items: UniverseItemInput[]): Universe {
  const groups = new Map<string, UniverseItemInput[]>();
  for (const it of items) {
    const key = (it.contentName ?? "").trim() || OTHER_LABEL;
    const list = groups.get(key);
    if (list) list.push(it);
    else groups.set(key, [it]);
  }

  const galaxies: Galaxy[] = [];
  for (const [label, list] of groups) {
    const stars: Star[] = list.map((it, i) => {
      const d = SPACING * Math.sqrt(i + 0.5);
      const a = i * GOLDEN;
      const q = Math.max(1, it.quantity);
      return {
        id: it.id,
        title: it.title,
        image: it.image,
        quantity: q,
        x: Math.cos(a) * d,
        y: Math.sin(a) * d,
        r: STAR_R * Math.min(1.6, 1 + 0.3 * Math.log2(q)),
      };
    });
    const radius = SPACING * Math.sqrt(list.length + 0.5) + STAR_R * 2;
    const quantity = list.reduce((s, it) => s + Math.max(1, it.quantity), 0);
    galaxies.push({
      key: label,
      label,
      count: list.length,
      quantity,
      hue: hueFor(label),
      x: 0,
      y: 0,
      radius,
      spin: ((hash(label + "spin") % 2000) / 1000 - 1) * 0.6 + (hash(label) % 2 ? 0.4 : -0.4),
      stars,
    });
  }

  // 大きい銀河から順に、重ならない場所へ置く（中心 → 外へ）
  galaxies.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ja"));
  const placed: Galaxy[] = [];
  // 外へ外へと置いていくので、探し始める距離は直前の銀河のあたりから（全部を中心から探し直すと数百の銀河で重くなる）
  let lastDist = 0;
  let lastRadius = 0;
  for (const g of galaxies) {
    if (placed.length === 0) {
      g.x = 0;
      g.y = 0;
    } else {
      const step = Math.max(60, g.radius * 0.5);
      let found = false;
      const base = placed[0].radius + g.radius * 0.6;
      let dist = Math.max(base, lastDist - (lastRadius + g.radius) * 2);
      for (; !found; dist += step) {
        const n = Math.max(8, Math.ceil((Math.PI * 2 * dist) / step));
        const offset = (hash(g.key) % 1000) / 1000 * Math.PI * 2;
        for (let k = 0; k < n; k++) {
          const a = offset + (k / n) * Math.PI * 2;
          const x = Math.cos(a) * dist;
          const y = Math.sin(a) * dist * 1.15;
          if (placed.every((p) => Math.hypot(p.x - x, p.y - y) >= p.radius + g.radius + GALAXY_GAP)) {
            g.x = x;
            g.y = y;
            found = true;
            lastDist = dist;
            lastRadius = g.radius;
            break;
          }
        }
      }
    }
    placed.push(g);
  }

  // 星の座標を銀河の中心に合わせる（描画側は「銀河の中心 + 回転した相対位置」で使う）
  for (const g of placed) {
    for (const s of g.stars) {
      s.x += g.x;
      s.y += g.y;
    }
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const g of placed) {
    minX = Math.min(minX, g.x - g.radius);
    maxX = Math.max(maxX, g.x + g.radius);
    minY = Math.min(minY, g.y - g.radius);
    maxY = Math.max(maxY, g.y + g.radius);
  }
  if (!isFinite(minX)) {
    minX = minY = -100;
    maxX = maxY = 100;
  }

  return {
    galaxies: placed,
    bounds: { minX, minY, maxX, maxY },
    totalItems: items.length,
    totalQuantity: placed.reduce((s, g) => s + g.quantity, 0),
  };
}

export interface View {
  /** 画面中央に置く世界座標 */
  cx: number;
  cy: number;
  scale: number;
}

export function fitView(
  b: { minX: number; minY: number; maxX: number; maxY: number },
  w: number,
  h: number,
  padding: number
): View {
  const bw = Math.max(1, b.maxX - b.minX);
  const bh = Math.max(1, b.maxY - b.minY);
  return {
    cx: (b.minX + b.maxX) / 2,
    cy: (b.minY + b.maxY) / 2,
    scale: Math.max(0.01, Math.min((w - padding * 2) / bw, (h - padding * 2) / bh)),
  };
}

/** 銀河の現在の回転角（ラジアン）。t=0 なら止まった状態 */
export function spinAngle(g: Galaxy, t: number): number {
  return g.spin * t * 0.05;
}

/** 銀河の回転を反映した星の世界座標 */
export function starWorldPos(g: Galaxy, s: Star, angle: number): { x: number; y: number } {
  if (angle === 0) return { x: s.x, y: s.y };
  const dx = s.x - g.x;
  const dy = s.y - g.y;
  const c = Math.cos(angle);
  const sn = Math.sin(angle);
  return { x: g.x + dx * c - dy * sn, y: g.y + dx * sn + dy * c };
}
