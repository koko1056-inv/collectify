import { STAR_R, spinAngle, starWorldPos, type Galaxy, type Universe, type View } from "./layout";

export type ImageSource = CanvasImageSource & { width: number; height: number };

export interface DrawOptions {
  universe: Universe;
  view: View;
  width: number;
  height: number;
  /** 経過秒。0 なら止まった絵（共有カード・動きを減らす設定） */
  t: number;
  /** 画像があれば返す。無ければ null（光る点で描く） */
  getImage: (url: string) => ImageSource | null;
  /** 画面に出ているときに画像を読みたい星を知らせる */
  wantImage?: (url: string) => void;
  /** 作品名の札を出すか */
  labels: boolean;
  /** 背景の星と星雲を描くか（共有カードは外側で描くので false にできる） */
  background: boolean;
  focusKey?: string | null;
  fontFamily: string;
  /** 作品名の文字サイズの下限・上限（画像の大きさに合わせて共有カードでは大きくする） */
  labelMin?: number;
  labelMax?: number;
}

/** 疑似乱数。背景の星が毎回同じ位置になるように */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const BG_STARS = (() => {
  const r = rng(20261008);
  return Array.from({ length: 220 }, () => ({
    x: r(),
    y: r(),
    s: 0.4 + r() * 1.4,
    p: r() * Math.PI * 2,
    depth: 0.15 + r() * 0.85,
  }));
})();

export function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, view: View, t: number) {
  ctx.fillStyle = "#06051a";
  ctx.fillRect(0, 0, w, h);

  // 星雲: 画面に固定せず、動かすと少しずれて奥行きが出る
  const nebula: [number, number, number, number, string][] = [
    [0.2, 0.25, 0.7, 0, "rgba(94,56,190,0.30)"],
    [0.85, 0.7, 0.8, 0, "rgba(34,120,200,0.22)"],
    [0.5, 1.0, 0.7, 0, "rgba(200,60,140,0.18)"],
  ];
  for (const [nx, ny, nr, , color] of nebula) {
    const x = nx * w - view.cx * view.scale * 0.02;
    const y = ny * h - view.cy * view.scale * 0.02;
    const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(w, h) * nr);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(6,5,26,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  for (const s of BG_STARS) {
    const ox = view.cx * view.scale * 0.04 * s.depth;
    const oy = view.cy * view.scale * 0.04 * s.depth;
    const x = (((s.x * w - ox) % w) + w) % w;
    const y = (((s.y * h - oy) % h) + h) % h;
    const tw = t === 0 ? 0.8 : 0.55 + 0.45 * Math.sin(t * (0.8 + s.depth) + s.p);
    ctx.globalAlpha = tw * (0.35 + 0.5 * s.depth);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y, s.s * (0.6 + s.depth * 0.6), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function toScreen(view: View, w: number, h: number, x: number, y: number) {
  return { x: (x - view.cx) * view.scale + w / 2, y: (y - view.cy) * view.scale + h / 2 };
}

export interface HitStar {
  galaxy: Galaxy;
  star: Galaxy["stars"][number];
}

/** 画面上の点にある星（なければ銀河）を探す。描画と同じ座標計算を使う */
export function hitTest(
  universe: Universe,
  view: View,
  w: number,
  h: number,
  t: number,
  px: number,
  py: number
): { star: HitStar | null; galaxy: Galaxy | null } {
  let nearest: HitStar | null = null;
  let nearestD = Infinity;
  let inGalaxy: Galaxy | null = null;
  for (const g of universe.galaxies) {
    const gc = toScreen(view, w, h, g.x, g.y);
    const gr = g.radius * view.scale;
    if (Math.hypot(px - gc.x, py - gc.y) > gr) continue;
    if (!inGalaxy || g.radius < inGalaxy.radius) inGalaxy = g;
    const ang = spinAngle(g, t);
    for (const s of g.stars) {
      const wp = starWorldPos(g, s, ang);
      const sp = toScreen(view, w, h, wp.x, wp.y);
      const d = Math.hypot(px - sp.x, py - sp.y);
      // 指で触れる大きさを最低限確保する
      const reach = Math.max(s.r * view.scale, 14);
      if (d <= reach && d < nearestD) {
        nearest = { galaxy: g, star: s };
        nearestD = d;
      }
    }
  }
  return { star: nearest, galaxy: inGalaxy };
}

export function drawUniverse(ctx: CanvasRenderingContext2D, o: DrawOptions) {
  const { universe, view, width: w, height: h, t } = o;
  if (o.background) drawBackground(ctx, w, h, view, t);

  for (const g of universe.galaxies) {
    const gc = toScreen(view, w, h, g.x, g.y);
    const gr = g.radius * view.scale;
    if (gc.x + gr < 0 || gc.x - gr > w || gc.y + gr < 0 || gc.y - gr > h) continue;

    const dim = o.focusKey && o.focusKey !== g.key ? 0.35 : 1;
    ctx.globalAlpha = dim;

    // 銀河のもや
    const halo = ctx.createRadialGradient(gc.x, gc.y, 0, gc.x, gc.y, gr * 1.25);
    halo.addColorStop(0, `hsla(${g.hue},85%,60%,0.34)`);
    halo.addColorStop(0.45, `hsla(${g.hue},80%,50%,0.14)`);
    halo.addColorStop(1, `hsla(${g.hue},80%,45%,0)`);
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(gc.x, gc.y, gr * 1.25, 0, Math.PI * 2);
    ctx.fill();

    const ang = spinAngle(g, t);
    for (const s of g.stars) {
      const wp = starWorldPos(g, s, ang);
      const sp = toScreen(view, w, h, wp.x, wp.y);
      const sr = s.r * view.scale;
      if (sp.x + sr < 0 || sp.x - sr > w || sp.y + sr < 0 || sp.y - sr > h) continue;

      if (sr < 7) {
        // 遠いうちは光る点。足したぶんだけ明るく見えるよう加算で重ねる
        ctx.globalCompositeOperation = "lighter";
        const dr = Math.max(1.4, sr * 0.9);
        const glow = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, dr * 3);
        glow.addColorStop(0, `hsla(${g.hue},90%,85%,0.95)`);
        glow.addColorStop(0.35, `hsla(${g.hue},90%,65%,0.35)`);
        glow.addColorStop(1, `hsla(${g.hue},90%,60%,0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, dr * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        continue;
      }

      // 近づくとグッズの写真が見える
      const halo2 = ctx.createRadialGradient(sp.x, sp.y, sr * 0.8, sp.x, sp.y, sr * 1.9);
      halo2.addColorStop(0, `hsla(${g.hue},95%,70%,0.55)`);
      halo2.addColorStop(1, `hsla(${g.hue},95%,60%,0)`);
      ctx.fillStyle = halo2;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sr * 1.9, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sr, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = `hsl(${g.hue},45%,22%)`;
      ctx.fillRect(sp.x - sr, sp.y - sr, sr * 2, sr * 2);
      const img = s.image ? o.getImage(s.image) : null;
      if (img) {
        const iw = img.width || 1;
        const ih = img.height || 1;
        // 円からはみ出さないよう、短い辺に合わせて中央を切り出す
        const k = (sr * 2) / Math.min(iw, ih);
        ctx.drawImage(img, sp.x - (iw * k) / 2, sp.y - (ih * k) / 2, iw * k, ih * k);
      } else if (s.image) {
        o.wantImage?.(s.image);
      }
      ctx.restore();

      ctx.strokeStyle = `hsla(${g.hue},95%,78%,0.95)`;
      ctx.lineWidth = Math.max(1.5, sr * 0.07);
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sr, 0, Math.PI * 2);
      ctx.stroke();

      if (s.quantity > 1 && sr > 16) {
        const bw = Math.max(22, sr * 0.7);
        ctx.fillStyle = "rgba(10,8,30,0.85)";
        ctx.beginPath();
        ctx.arc(sp.x + sr * 0.72, sp.y + sr * 0.72, bw * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = `700 ${Math.round(bw * 0.5)}px ${o.fontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`×${s.quantity}`, sp.x + sr * 0.72, sp.y + sr * 0.72 + 1);
      }
    }
    ctx.globalAlpha = 1;

    if (o.labels && gr > 20) {
      // 銀河が画面いっぱいに近づいたら札は消える（グッズを見る邪魔になるため）
      const fade = Math.min(1, Math.max(0, (Math.min(w, h) * 1.1 - gr) / (Math.min(w, h) * 0.5)));
      if (fade > 0.02) {
        const size = Math.max(o.labelMin ?? 13, Math.min(o.labelMax ?? 30, gr * 0.14));
        ctx.globalAlpha = fade * (o.focusKey && o.focusKey !== g.key ? 0.5 : 1);
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.font = `800 ${Math.round(size)}px ${o.fontFamily}`;
        const ly = gc.y - gr * 1.02 - 6;
        ctx.lineWidth = 4;
        ctx.strokeStyle = "rgba(6,5,26,0.85)";
        ctx.strokeText(g.label, gc.x, ly);
        ctx.fillStyle = `hsl(${g.hue},90%,86%)`;
        ctx.fillText(g.label, gc.x, ly);
        ctx.font = `600 ${Math.round(size * 0.62)}px ${o.fontFamily}`;
        ctx.fillStyle = "rgba(255,255,255,0.72)";
        ctx.fillText(`${g.count}`, gc.x, ly + size * 0.95);
        ctx.globalAlpha = 1;
      }
    }
  }
}

/** 最大の星の表示サイズ。これ以上は拡大しない */
export const MAX_STAR_SCREEN = 110;
export const maxScaleFor = () => MAX_STAR_SCREEN / STAR_R;
