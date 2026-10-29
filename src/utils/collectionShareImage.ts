/**
 * コレクションの「シェア画像」を Canvas で描く（投稿 4:5 = 1080×1350 / ストーリーズ 9:16 = 1080×1920）。
 *
 * テンプレートは3つ:
 *  - shelf   「推しの棚」: 棚板に並んだグッズ。見出しは作品・推しの名前
 *  - monthly 「今月のお迎え」: 日めくりの暦と数、ポラロイド風の写真
 *  - work    「作品別コレクション」: 作品名の帯と数、写真のマス
 *
 * 写真は共有カード（shareCard.ts）・譲求画像（tradeCard.ts）と同じく fetch して Bitmap にしてから描く。
 * CORS の無い外部の写真は「サムネ → proxy-image → 元の URL」の順に試し、どれも取れなければ名前の頭文字のマスにする。
 * キャンバスに <img> を直接描かないので、汚染（tainted canvas）で書き出せなくなることは無い。
 * 文字はアプリと同じ Zen Kaku Gothic New。読み込みを待ってから描く（待ちすぎないよう上限あり）。
 */
import { FONT, drawLogo, loadBitmap, preloadLogoMark, roundRect, wrapText } from "./shareCard";
import { loadGoodsBitmap } from "./tradeCard";

export type CollectionShareTemplate = "shelf" | "monthly" | "work";
export type CollectionShareFormat = "portrait" | "story";

export const COLLECTION_SHARE_TEMPLATES: CollectionShareTemplate[] = ["shelf", "monthly", "work"];

export const COLLECTION_SHARE_FORMATS: Record<CollectionShareFormat, { width: number; height: number }> = {
  portrait: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
};

/** 1枚に並べるグッズの上限（4列×3段） */
export const COLLECTION_SHARE_MAX_GOODS = 12;

export type ShareThemeId = "sakura" | "mint" | "lemon" | "lavender" | "night";

export interface ShareTheme {
  id: ShareThemeId;
  bgTop: string;
  bgBottom: string;
  accent: string;
  /** accent の上に乗せる文字 */
  onAccent: string;
  accentSoft: string;
  ink: string;
  muted: string;
  card: string;
  /** 棚板（上面・前面） */
  board: string;
  boardEdge: string;
  /** 写真のマスの地 */
  tile: string;
  /** 背景の水玉 */
  dot: string;
}

/** テーマの色。画面の見本（丸い色の札）もこの値で描く */
export const SHARE_THEMES: Record<ShareThemeId, ShareTheme> = {
  sakura: {
    id: "sakura",
    bgTop: "#FFF4F6",
    bgBottom: "#FFE0E9",
    accent: "#E4577C",
    onAccent: "#FFFFFF",
    accentSoft: "#FBD3DE",
    ink: "#3A2430",
    muted: "#8A6B78",
    card: "#FFFFFF",
    board: "#F3C3D1",
    boardEdge: "#D98BA3",
    tile: "#FFFFFF",
    dot: "rgba(228,87,124,0.10)",
  },
  mint: {
    id: "mint",
    bgTop: "#F1FBF7",
    bgBottom: "#D5F2E6",
    accent: "#1F9E77",
    onAccent: "#FFFFFF",
    accentSoft: "#C6EBDD",
    ink: "#173A2F",
    muted: "#5E8578",
    card: "#FFFFFF",
    board: "#BFE6D6",
    boardEdge: "#7CC4A8",
    tile: "#FFFFFF",
    dot: "rgba(31,158,119,0.10)",
  },
  lemon: {
    id: "lemon",
    bgTop: "#FFFBEA",
    bgBottom: "#FFEDB0",
    accent: "#D98E04",
    onAccent: "#FFFFFF",
    accentSoft: "#FBE3A6",
    ink: "#3B2E0E",
    muted: "#8C7646",
    card: "#FFFFFF",
    board: "#E9C88A",
    boardEdge: "#C29852",
    tile: "#FFFFFF",
    dot: "rgba(217,142,4,0.12)",
  },
  lavender: {
    id: "lavender",
    bgTop: "#F6F3FF",
    bgBottom: "#E2D9FF",
    accent: "#7058E8",
    onAccent: "#FFFFFF",
    accentSoft: "#DCD3FF",
    ink: "#28214D",
    muted: "#6F6699",
    card: "#FFFFFF",
    board: "#D3C8FA",
    boardEdge: "#9E8FE0",
    tile: "#FFFFFF",
    dot: "rgba(112,88,232,0.10)",
  },
  night: {
    id: "night",
    bgTop: "#1B1E3C",
    bgBottom: "#3B2D6E",
    accent: "#F2C96B",
    onAccent: "#2A1F05",
    accentSoft: "rgba(242,201,107,0.22)",
    ink: "#FFFFFF",
    muted: "#C7C3E6",
    card: "rgba(255,255,255,0.08)",
    board: "#5B4C9E",
    boardEdge: "#3E3277",
    tile: "#FFFFFF",
    dot: "rgba(255,255,255,0.16)",
  },
};

export const SHARE_THEME_IDS = Object.keys(SHARE_THEMES) as ShareThemeId[];

export interface CollectionShareGoods {
  title: string;
  image: string | null;
  /** monthly: ポラロイドの下に書く日付（例「10/12」） */
  caption?: string;
}

export interface CollectionShareInput {
  template: CollectionShareTemplate;
  format: CollectionShareFormat;
  theme: ShareThemeId;
  /** shelf: 作品・推しの名前 / monthly: 使わない / work: 作品名 */
  headline: string;
  /** 数（shelf: コレクション全体 / monthly: 今月のお迎え / work: その作品のグッズ） */
  count: number;
  goods: CollectionShareGoods[];
  /** 「@username」 */
  handle: string;
  /** フッターのURL（表示用。例「collectify.jp」） */
  siteLabel: string;
  labels: {
    /** テンプレートの名前（帯・札に出す） */
    kicker: string;
    /** 数の単位（「点」/ "items"） */
    unit: string;
    /** 数の下の一言 */
    countCaption: string;
    /** フッターの一言 */
    tagline: string;
    /** 並べきれなかった数（「ほか{n}点」を埋めたもの）。無ければ出さない */
    more?: string;
    /** monthly: 暦の年・月 */
    calendarYear?: string;
    calendarMonth?: string;
  };
}

const JP = `"Zen Kaku Gothic New", ${FONT}`;

/** アプリの文字（Web フォント）を読み込んでから描く。遅い回線で止まらないよう 2.5 秒まで */
async function ensureFonts() {
  if (typeof document === "undefined" || !document.fonts) return;
  const wait = Promise.all([
    document.fonts.load(`700 48px "Zen Kaku Gothic New"`, "推しの棚今月のお迎え0123456789"),
    document.fonts.load(`500 32px "Zen Kaku Gothic New"`, "コレクション"),
  ]).then(() => document.fonts.ready);
  await Promise.race([wait, new Promise((r) => setTimeout(r, 2500))]).catch(() => undefined);
}

let pockeBitmap: ImageBitmap | null | undefined;
async function loadPocke() {
  if (pockeBitmap === undefined) pockeBitmap = await loadBitmap("/pocke/wave.webp");
  return pockeBitmap;
}

/** 並べる数から、列と段を決める（写真が小さくなりすぎないように） */
export function gridShape(n: number): { cols: number; rows: number } {
  if (n <= 1) return { cols: 1, rows: 1 };
  if (n <= 2) return { cols: 2, rows: 1 };
  if (n <= 4) return { cols: 2, rows: 2 };
  if (n <= 6) return { cols: 3, rows: 2 };
  if (n <= 9) return { cols: 3, rows: 3 };
  return { cols: 4, rows: 3 };
}

/** 枠に収まるよう縮めて置く（切り取らない）。align=bottom は棚に立たせるとき */
function fitRect(img: ImageBitmap, x: number, y: number, w: number, h: number, align: "center" | "bottom" = "center") {
  const s = Math.min(w / img.width, h / img.height);
  const dw = img.width * s;
  const dh = img.height * s;
  return { x: x + (w - dw) / 2, y: align === "bottom" ? y + h - dh : y + (h - dh) / 2, w: dw, h: dh };
}

function drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number, T: ShareTheme) {
  const g = ctx.createLinearGradient(0, 0, W * 0.3, H);
  g.addColorStop(0, T.bgTop);
  g.addColorStop(1, T.bgBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // 水玉
  ctx.fillStyle = T.dot;
  const step = 54;
  for (let y = 18; y < H; y += step) {
    for (let x = ((y / step) % 2) * (step / 2) + 18; x < W; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // やわらかい光
  const glow = ctx.createRadialGradient(W * 0.88, H * 0.06, 0, W * 0.88, H * 0.06, W * 0.6);
  glow.addColorStop(0, "rgba(255,255,255,0.55)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
}

function drawHeader(ctx: CanvasRenderingContext2D, W: number, top: number, T: ShareTheme, handle: string) {
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  drawLogo(ctx, 64, top + 76, 0.9, { badge: T.accent, letter: T.onAccent });
  ctx.textAlign = "right";
  ctx.fillStyle = T.muted;
  ctx.font = `700 32px ${JP}`;
  const h = wrapText(ctx, handle, 420, 1)[0] ?? handle;
  ctx.fillText(h, W - 64, top + 72);
  ctx.textAlign = "left";
}

function drawFooter(ctx: CanvasRenderingContext2D, W: number, bottom: number, T: ShareTheme, input: CollectionShareInput, pocke: ImageBitmap | null) {
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = T.ink;
  ctx.font = `700 34px ${JP}`;
  ctx.fillText(input.siteLabel, 64, bottom - 64);
  ctx.fillStyle = T.muted;
  ctx.font = `500 26px ${JP}`;
  ctx.fillText(wrapText(ctx, input.labels.tagline, W - 64 - 260, 1)[0] ?? "", 64, bottom - 24);
  if (pocke) {
    const h = 150;
    const w = (pocke.width / pocke.height) * h;
    ctx.drawImage(pocke, W - 56 - w, bottom - h - 6, w, h);
  }
}

/** 写真が取れなかったグッズ: 名前の頭文字と名前 */
function drawMissing(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, title: string, T: ShareTheme) {
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = T.accentSoft;
  ctx.fill();
  ctx.fillStyle = T.accent;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const s = Math.min(w, h);
  ctx.font = `700 ${Math.round(s * 0.36)}px ${JP}`;
  ctx.fillText(Array.from(title.trim())[0] ?? "?", x + w / 2, y + h / 2 - s * 0.08);
  ctx.font = `500 ${Math.max(16, Math.round(s * 0.09))}px ${JP}`;
  const lines = wrapText(ctx, title, w - 24, 1);
  if (lines[0]) ctx.fillText(lines[0], x + w / 2, y + h / 2 + s * 0.26);
  ctx.restore();
}

function drawPhoto(
  ctx: CanvasRenderingContext2D,
  bmp: ImageBitmap | null,
  title: string,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  T: ShareTheme,
  opts: { shadow?: boolean } = {}
) {
  if (!bmp) {
    drawMissing(ctx, x, y, w, h, r, title, T);
    return;
  }
  ctx.save();
  if (opts.shadow) {
    ctx.shadowColor = "rgba(30,20,40,0.16)";
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 8;
  }
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = T.tile;
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  const pad = Math.min(w, h) * 0.04;
  const f = fitRect(bmp, x + pad, y + pad, w - pad * 2, h - pad * 2);
  ctx.drawImage(bmp, f.x, f.y, f.w, f.h);
  ctx.restore();
}

/** 長い見出しは、2行・幅に収まる大きさまで文字を小さくする */
function fitHeadline(ctx: CanvasRenderingContext2D, text: string, maxW: number, start: number, min: number, lines = 2) {
  let size = start;
  for (; size > min; size -= 4) {
    ctx.font = `700 ${size}px ${JP}`;
    const l = wrapText(ctx, text, maxW, lines);
    if (l.join("").length >= Array.from(text).length) return { size, lines: l };
  }
  ctx.font = `700 ${min}px ${JP}`;
  return { size: min, lines: wrapText(ctx, text, maxW, lines) };
}

function drawPill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, T: ShareTheme, size = 28) {
  ctx.font = `700 ${size}px ${JP}`;
  const w = ctx.measureText(text).width + size * 1.4;
  const h = size * 1.9;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = T.accent;
  ctx.fill();
  ctx.fillStyle = T.onAccent;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + size * 0.7, y + h / 2 + 1);
  ctx.textBaseline = "alphabetic";
  return { w, h };
}

function drawCount(ctx: CanvasRenderingContext2D, x: number, baseline: number, count: number, unit: string, T: ShareTheme, size: number) {
  ctx.textAlign = "left";
  ctx.fillStyle = T.accent;
  ctx.font = `700 ${size}px ${JP}`;
  const n = count.toLocaleString();
  ctx.fillText(n, x, baseline);
  const w = ctx.measureText(n).width;
  ctx.fillStyle = T.ink;
  ctx.font = `700 ${Math.round(size * 0.36)}px ${JP}`;
  ctx.fillText(unit, x + w + 12, baseline);
  return w + 12 + ctx.measureText(unit).width;
}

// ---------------------------------------------------------------------------
// 推しの棚
// ---------------------------------------------------------------------------
function drawShelf(
  ctx: CanvasRenderingContext2D,
  W: number,
  top: number,
  bottom: number,
  input: CollectionShareInput,
  bmps: (ImageBitmap | null)[],
  T: ShareTheme
) {
  const m = 64;
  let y = top + 150;
  drawPill(ctx, input.labels.kicker, m, y, T);
  y += 60 + 92;
  const head = fitHeadline(ctx, input.headline, W - m * 2, 84, 52);
  ctx.fillStyle = T.ink;
  ctx.textAlign = "left";
  head.lines.forEach((l, i) => {
    ctx.font = `700 ${head.size}px ${JP}`;
    ctx.fillText(l, m, y + i * head.size * 1.18);
  });
  y += (head.lines.length - 1) * head.size * 1.18 + 58;
  ctx.fillStyle = T.muted;
  ctx.font = `500 30px ${JP}`;
  ctx.fillText(input.labels.countCaption, m, y);
  y += 40;

  // 棚（角丸の箱 + 段ごとの棚板）
  const n = Math.max(1, input.goods.length);
  const { cols, rows } = gridShape(n);
  const boxX = 48;
  const boxW = W - 96;
  const boxY = y;
  const boxH = bottom - 200 - boxY;
  ctx.save();
  ctx.shadowColor = "rgba(30,20,40,0.14)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 14;
  roundRect(ctx, boxX, boxY, boxW, boxH, 44);
  ctx.fillStyle = T.card;
  ctx.fill();
  ctx.restore();

  const padX = 40;
  const padTop = 30;
  const rowH = (boxH - padTop - 28) / rows;
  const cellW = (boxW - padX * 2) / cols;
  const boardH = 20;
  const edgeH = 12;
  for (let r = 0; r < rows; r++) {
    const rowTop = boxY + padTop + r * rowH;
    const boardY = rowTop + rowH - boardH - edgeH - 8;
    // 奥の壁に、ほんのり影
    const wall = ctx.createLinearGradient(0, rowTop, 0, boardY);
    wall.addColorStop(0, "rgba(0,0,0,0)");
    wall.addColorStop(1, "rgba(0,0,0,0.05)");
    ctx.fillStyle = wall;
    ctx.fillRect(boxX + 20, rowTop, boxW - 40, boardY - rowTop);
    // グッズ（棚板に立たせる）
    const inRow = Math.min(cols, input.goods.length - r * cols);
    const rowOffset = ((cols - inRow) * cellW) / 2;
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (i >= input.goods.length) break;
      const g = input.goods[i];
      const bmp = bmps[i];
      const gap = 16;
      const cx = boxX + padX + rowOffset + c * cellW + gap / 2;
      const cw = cellW - gap;
      const ch = boardY - rowTop - 14;
      if (!bmp) {
        const s = Math.min(cw, ch);
        drawMissing(ctx, cx + (cw - s) / 2, boardY - s, s, s, 22, g.title, T);
        continue;
      }
      const f = fitRect(bmp, cx, rowTop + 14, cw, ch, "bottom");
      ctx.save();
      ctx.shadowColor = "rgba(30,20,40,0.22)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetX = 6;
      ctx.shadowOffsetY = 6;
      roundRect(ctx, f.x, f.y, f.w, f.h, 14);
      ctx.fillStyle = T.tile;
      ctx.fill();
      ctx.restore();
      ctx.save();
      roundRect(ctx, f.x, f.y, f.w, f.h, 14);
      ctx.clip();
      ctx.drawImage(bmp, f.x, f.y, f.w, f.h);
      ctx.restore();
    }
    // 棚板（上面 + 前面 + 下の影）
    roundRect(ctx, boxX + 18, boardY, boxW - 36, boardH, 8);
    ctx.fillStyle = T.board;
    ctx.fill();
    roundRect(ctx, boxX + 18, boardY + boardH - 6, boxW - 36, edgeH + 6, 8);
    ctx.fillStyle = T.boardEdge;
    ctx.fill();
    const sh = ctx.createLinearGradient(0, boardY + boardH + edgeH, 0, boardY + boardH + edgeH + 18);
    sh.addColorStop(0, "rgba(0,0,0,0.10)");
    sh.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sh;
    ctx.fillRect(boxX + 30, boardY + boardH + edgeH, boxW - 60, 18);
  }
  if (input.labels.more) {
    ctx.textAlign = "right";
    ctx.fillStyle = T.muted;
    ctx.font = `700 26px ${JP}`;
    ctx.fillText(input.labels.more, boxX + boxW - 8, boxY + boxH + 44);
    ctx.textAlign = "left";
  }
}

// ---------------------------------------------------------------------------
// 今月のお迎え
// ---------------------------------------------------------------------------
function drawMonthly(
  ctx: CanvasRenderingContext2D,
  W: number,
  top: number,
  bottom: number,
  input: CollectionShareInput,
  bmps: (ImageBitmap | null)[],
  T: ShareTheme
) {
  const m = 64;
  // 日めくりの暦
  const calX = m;
  const calY = top + 160;
  const calW = 228;
  const calH = 250;
  ctx.save();
  ctx.shadowColor = "rgba(30,20,40,0.16)";
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 10;
  roundRect(ctx, calX, calY, calW, calH, 30);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRect(ctx, calX, calY, calW, calH, 30);
  ctx.clip();
  ctx.fillStyle = T.accent;
  ctx.fillRect(calX, calY, calW, 74);
  ctx.restore();
  // 綴じ穴
  for (const dx of [0.3, 0.7]) {
    ctx.beginPath();
    ctx.arc(calX + calW * dx, calY + 16, 9, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fill();
  }
  ctx.textAlign = "center";
  ctx.fillStyle = T.onAccent;
  ctx.font = `700 34px ${JP}`;
  ctx.fillText(input.labels.calendarYear ?? "", calX + calW / 2, calY + 58);
  const isNight = T.id === "night";
  ctx.fillStyle = isNight ? "#2A2350" : T.ink;
  const month = input.labels.calendarMonth ?? "";
  const monthSize = Array.from(month).length > 3 ? 64 : 104;
  ctx.font = `700 ${monthSize}px ${JP}`;
  ctx.fillText(month, calX + calW / 2, calY + 74 + (calH - 74) / 2 + monthSize * 0.36);
  ctx.textAlign = "left";

  // 見出しと数
  const tx = calX + calW + 48;
  const tw = W - m - tx;
  ctx.fillStyle = T.ink;
  const head = fitHeadline(ctx, input.labels.kicker, tw, 60, 40, 1);
  ctx.font = `700 ${head.size}px ${JP}`;
  ctx.fillText(head.lines[0] ?? "", tx, calY + 64);
  drawCount(ctx, tx, calY + 200, input.count, input.labels.unit, T, 150);
  ctx.fillStyle = T.muted;
  ctx.font = `500 28px ${JP}`;
  ctx.fillText(wrapText(ctx, input.labels.countCaption, tw, 1)[0] ?? "", tx, calY + 246);

  // ポラロイド
  const gridTop = calY + calH + 64;
  const gridBottom = bottom - 210;
  const n = Math.max(1, input.goods.length);
  // ポラロイドは縦に長いので、段を少なく・列を多くする（7〜8点なら4列×2段）
  const { cols, rows } = n <= 3 ? { cols: n, rows: 1 } : n <= 6 ? { cols: 3, rows: 2 } : n <= 8 ? { cols: 4, rows: 2 } : gridShape(n);
  const gap = 28;
  const areaW = W - m * 2;
  const colW = (areaW - gap * (cols - 1)) / cols;
  const capH = Math.max(40, colW * 0.17);
  const cardH = Math.min(colW + capH, (gridBottom - gridTop - gap * (rows - 1)) / rows);
  // 写真は正方形。カードは写真に合わせた縦長（ポラロイドの形）
  const photo = Math.min(colW, cardH - capH) - 24;
  const cardW = photo + 24;
  const usedH = rows * cardH + (rows - 1) * gap;
  const startY = gridTop + Math.max(0, (gridBottom - gridTop - usedH) / 2);
  const tilts = [-2.4, 1.8, -1.2, 2.2, -1.8, 1.2, -2.0, 1.5, -1.0, 2.4, -1.6, 1.0];
  input.goods.forEach((g, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const inRow = Math.min(cols, input.goods.length - r * cols);
    const x = m + ((cols - inRow) * (colW + gap)) / 2 + c * (colW + gap) + (colW - cardW) / 2;
    const y = startY + r * (cardH + gap);
    ctx.save();
    ctx.translate(x + cardW / 2, y + cardH / 2);
    ctx.rotate((tilts[i % tilts.length] * Math.PI) / 180);
    ctx.translate(-cardW / 2, -cardH / 2);
    ctx.shadowColor = "rgba(30,20,40,0.18)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;
    roundRect(ctx, 0, 0, cardW, cardH, 10);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.shadowColor = "transparent";
    const px = (cardW - photo) / 2;
    const bmp = bmps[i];
    if (bmp) {
      ctx.save();
      roundRect(ctx, px, 12, photo, photo, 6);
      ctx.clip();
      ctx.fillStyle = "#F7F5F6";
      ctx.fillRect(px, 12, photo, photo);
      const f = fitRect(bmp, px + 6, 18, photo - 12, photo - 12);
      ctx.drawImage(bmp, f.x, f.y, f.w, f.h);
      ctx.restore();
    } else {
      drawMissing(ctx, px, 12, photo, photo, 6, g.title, T);
    }
    if (g.caption) {
      ctx.fillStyle = "#6B5A62";
      ctx.textAlign = "center";
      ctx.font = `700 ${Math.round(Math.min(30, capH * 0.6))}px ${JP}`;
      ctx.fillText(g.caption, cardW / 2, 12 + photo + (cardH - 12 - photo) / 2 + 10);
      ctx.textAlign = "left";
    }
    ctx.restore();
  });
  if (input.labels.more) {
    ctx.textAlign = "right";
    ctx.fillStyle = T.muted;
    ctx.font = `700 26px ${JP}`;
    ctx.fillText(input.labels.more, W - m, Math.min(gridBottom + 46, startY + usedH + 50));
    ctx.textAlign = "left";
  }
}

// ---------------------------------------------------------------------------
// 作品別コレクション
// ---------------------------------------------------------------------------
function drawWork(
  ctx: CanvasRenderingContext2D,
  W: number,
  top: number,
  bottom: number,
  input: CollectionShareInput,
  bmps: (ImageBitmap | null)[],
  T: ShareTheme
) {
  const m = 64;
  // 作品名の帯（斜めの縞）
  const bandY = top + 150;
  const head = fitHeadline(ctx, input.headline, W - (m + 16) * 2, 80, 48);
  const bandH = 104 + head.lines.length * head.size * 1.14 + 26;
  ctx.save();
  roundRect(ctx, 40, bandY, W - 80, bandH, 40);
  ctx.clip();
  ctx.fillStyle = T.accent;
  ctx.fillRect(40, bandY, W - 80, bandH);
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 18;
  for (let x = -bandH; x < W; x += 52) {
    ctx.beginPath();
    ctx.moveTo(x, bandY + bandH);
    ctx.lineTo(x + bandH, bandY);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = T.onAccent;
  ctx.globalAlpha = 0.8;
  ctx.font = `700 26px ${JP}`;
  ctx.fillText(input.labels.kicker, m + 16, bandY + 58);
  ctx.globalAlpha = 1;
  let hy = bandY + 104 + head.size * 0.92;
  for (const l of head.lines) {
    ctx.font = `700 ${head.size}px ${JP}`;
    ctx.fillText(l, m + 16, hy);
    hy += head.size * 1.12;
  }

  // 数
  const cy = bandY + bandH + 140;
  const w = drawCount(ctx, m, cy, input.count, input.labels.unit, T, 140);
  ctx.fillStyle = T.muted;
  ctx.font = `500 30px ${JP}`;
  ctx.fillText(wrapText(ctx, input.labels.countCaption, W - m * 2 - w - 24, 1)[0] ?? "", m + w + 24, cy);

  // 写真のマス
  const gridTop = cy + 48;
  const gridBottom = bottom - 210;
  const n = Math.max(1, input.goods.length);
  const { cols, rows } = gridShape(n);
  const gap = 22;
  const areaW = W - m * 2;
  const size = Math.min((areaW - gap * (cols - 1)) / cols, (gridBottom - gridTop - gap * (rows - 1)) / rows);
  const gridW = cols * size + (cols - 1) * gap;
  const gx = (W - gridW) / 2;
  const usedH = rows * size + (rows - 1) * gap;
  const gy = gridTop + Math.max(0, (gridBottom - gridTop - usedH) / 2);
  input.goods.forEach((g, i) => {
    const r = Math.floor(i / cols);
    const inRow = Math.min(cols, input.goods.length - r * cols);
    const x = gx + ((cols - inRow) * (size + gap)) / 2 + (i % cols) * (size + gap);
    const y = gy + r * (size + gap);
    drawPhoto(ctx, bmps[i], g.title, x, y, size, size, 26, T, { shadow: true });
  });
  if (input.labels.more) {
    ctx.textAlign = "right";
    ctx.fillStyle = T.muted;
    ctx.font = `700 26px ${JP}`;
    ctx.fillText(input.labels.more, gx + gridW, gy + usedH + 48);
    ctx.textAlign = "left";
  }
}

/**
 * シェア画像を描いて PNG にする。写真が1枚も取れなくても、頭文字のマスで最後まで描く。
 */
export async function renderCollectionShareImage(input: CollectionShareInput): Promise<Blob> {
  const { width: W, height: H } = COLLECTION_SHARE_FORMATS[input.format];
  const T = SHARE_THEMES[input.theme] ?? SHARE_THEMES.sakura;
  const goods = input.goods.slice(0, COLLECTION_SHARE_MAX_GOODS);
  const [bmps, pocke] = await Promise.all([
    Promise.all(goods.map((g) => loadGoodsBitmap(g.image))),
    loadPocke(),
    preloadLogoMark(),
    ensureFonts(),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unsupported");

  drawBackground(ctx, W, H, T);
  // ストーリーズは上下をアプリのUIが覆うので、その分だけ内側に寄せる
  const top = input.format === "story" ? 150 : 0;
  const bottom = input.format === "story" ? H - 170 : H;
  drawHeader(ctx, W, top, T, input.handle);
  const body = { ...input, goods };
  if (input.template === "shelf") drawShelf(ctx, W, top, bottom, body, bmps, T);
  else if (input.template === "monthly") drawMonthly(ctx, W, top, bottom, body, bmps, T);
  else drawWork(ctx, W, top, bottom, body, bmps, T);
  drawFooter(ctx, W, bottom, T, input, pocke);

  bmps.forEach((b) => b?.close());
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png")
  );
}
