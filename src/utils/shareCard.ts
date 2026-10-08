/**
 * 「思わず見せたくなる」共有カードを Canvas で描く（投稿 4:5 / 正方形 / ストーリーズ 9:16 / X 16:9）。
 *
 * DOM を撮影する方式（html2canvas）にしない理由:
 *  - 外部ホストのグッズ画像は CORS が無いことが多く、DOM撮影だとキャンバスが汚染されて書き出せない。
 *    ここでは画像を fetch で取得して Bitmap にしてから描くので、取れない画像だけが空きタイルになり、
 *    カード全体の書き出しは失敗しない。
 *  - レイアウトが固定サイズなので、端末の画面幅に左右されずに同じ見た目になる。
 */

import type { Universe } from "./universe/layout";

export type ShareCardVariant = "series" | "status" | "universe";

/** 共有先ごとの比率。投稿(4:5)・正方形(1:1)・ストーリーズ(9:16)・X/横長(16:9) */
export type ShareCardFormat = "portrait" | "square" | "story" | "wide";

export const SHARE_CARD_FORMATS: Record<ShareCardFormat, { width: number; height: number }> = {
  portrait: { width: 1080, height: 1350 },
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
  wide: { width: 1200, height: 675 },
};

export interface ShareCardStat {
  label: string;
  value: string;
}

export interface ShareCardInput {
  variant: ShareCardVariant;
  /** 省略時は portrait */
  format?: ShareCardFormat;
  /** 作品名 / カードの見出し */
  headline: string;
  ownerName: string;
  /** series: 所持数 / 総数 */
  owned?: number;
  total?: number;
  complete?: boolean;
  /** status: 数字の並び（最大4つ） */
  stats?: ShareCardStat[];
  /** 画像URL。series は最大6、status は最大9 */
  images: string[];
  /** series: まだ持っていない枠に出す文言 */
  missingLabel?: string;
  tagline: string;
  /** カード下部に出すURL（表示用。「https://」は外してよい） */
  footerUrl: string;
  completeLabel?: string;
  collectedLabel?: string;
  /** universe: 作品ごとの銀河の配置 */
  universe?: Universe;
  /** universe: 数字の見出しなど（画面の言語に合わせた文言） */
  universeLabels?: { goods: string; galaxies: string; biggest: string };
}

export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1350;
// ストーリーズは上下をアプリのUIが覆うので、中身は縦長キャンバスの中央に 4:5 の領域として置く

const INK = "#2A1F24";
const MUTED = "#8A7B80";
const PAPER = "#FBF7F2";
const ROSE = "#D94A64";
const ROSE_SOFT = "#F7DDE2";
const GOLD = "#E0A21B";
export const FONT =
  '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", Meiryo, system-ui, sans-serif';

export async function loadBitmap(url: string): Promise<ImageBitmap | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return null;
    return await createImageBitmap(blob);
  } catch {
    return null;
  }
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 幅に収まるよう1文字ずつ折り返す（日本語は単語境界が無いため）。最大 maxLines 行、超えたら … */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const ch of Array.from(text)) {
    const next = line + ch;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = ch;
      if (lines.length === maxLines) break;
    } else {
      line = next;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  const consumed = lines.join("").length;
  if (consumed < Array.from(text).length && lines.length) {
    let last = lines[lines.length - 1];
    while (last.length > 1 && ctx.measureText(last + "…").width > maxWidth) last = last.slice(0, -1);
    lines[lines.length - 1] = last + "…";
  }
  return lines;
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: ImageBitmap,
  x: number,
  y: number,
  size: number,
  radius: number
) {
  ctx.save();
  roundRect(ctx, x, y, size, size, radius);
  ctx.clip();
  // グッズは縦長・横長が混ざる。切り取らず全体が見えるよう、枠に収めて余白は白で埋める
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(x, y, size, size);
  const scale = Math.min(size / img.width, size / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, x + (size - w) / 2, y + (size - h) / 2, w, h);
  ctx.restore();
}

function drawEmptyTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  radius: number,
  label?: string
) {
  ctx.save();
  roundRect(ctx, x, y, size, size, radius);
  ctx.fillStyle = "#F4ECE7";
  ctx.fill();
  ctx.setLineDash([14, 12]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#D9C9C2";
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#C9B6AE";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.round(size * 0.34)}px ${FONT}`;
  ctx.fillText("?", x + size / 2, y + size / 2 - (label ? 14 : 0));
  if (label) {
    ctx.font = `600 26px ${FONT}`;
    ctx.fillText(label, x + size / 2, y + size / 2 + size * 0.24);
  }
  ctx.restore();
}

function drawPlainTile(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, radius: number) {
  ctx.save();
  roundRect(ctx, x, y, size, size, radius);
  ctx.fillStyle = ROSE_SOFT;
  ctx.fill();
  ctx.restore();
}

/** 招待リンクのQR。読み取れれば十分なので、白地・濃色の単色で素直に描く */
export async function drawQr(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number) {
  try {
    const QRCode = (await import("qrcode")).default;
    const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
    const n = qr.modules.size;
    const pad = 12;
    // モジュールを整数ピクセルにそろえる。端数があるとにじんで、小さいQRほど読み取れなくなる
    const cell = Math.max(2, Math.floor((size - pad * 2) / n));
    const qrPx = cell * n;
    const plate = qrPx + pad * 2;
    const px = x + (size - plate) / 2;
    const py = y + (size - plate) / 2;
    roundRect(ctx, px, py, plate, plate, 18);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.fillStyle = INK;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.modules.get(r, c)) ctx.fillRect(px + pad + c * cell, py + pad + r * cell, cell, cell);
      }
    }
    return true;
  } catch {
    // QRが作れなくてもカード自体は出す
    return false;
  }
}

/** ロゴ: 角丸のバッジ + ワードマーク */
export function drawLogo(ctx: CanvasRenderingContext2D, x: number, baseline: number, scale = 1) {
  const s = 56 * scale;
  roundRect(ctx, x, baseline - s + 8 * scale, s, s, 16 * scale);
  ctx.fillStyle = ROSE;
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${Math.round(38 * scale)}px ${FONT}`;
  ctx.fillText("C", x + s / 2, baseline - s / 2 + 8 * scale + 2);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = ROSE;
  ctx.font = `800 ${Math.round(40 * scale)}px ${FONT}`;
  ctx.fillText("Collectify", x + s + 16 * scale, baseline);
}

export async function renderShareCard(input: ShareCardInput): Promise<Blob> {
  if (input.variant === "universe") {
    // 宇宙の絵は専用の描画。循環参照を避けるため、使うときに読み込む
    const { renderUniverseCard } = await import("./universeCard");
    return renderUniverseCard(input);
  }
  const format = input.format ?? "portrait";
  const dims = SHARE_CARD_FORMATS[format];
  const canvas = document.createElement("canvas");
  canvas.width = dims.width;
  canvas.height = dims.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unsupported");

  if (format === "wide") return renderWide(ctx, canvas, input);

  const isSeries = input.variant === "series";
  // 正方形は縦が足りないので1行だけ。ほかは従来どおり
  const slots = format === "square" ? 3 : isSeries ? 6 : 9;
  // ストーリーズは 4:5 の領域を縦中央に置く（上下はアプリのUIで隠れるため）
  const SHARE_CARD_HEIGHT_LOCAL = format === "story" ? SHARE_CARD_HEIGHT : dims.height;
  const cols = 3;
  const margin = 72;
  const gap = 24;
  const tile = (SHARE_CARD_WIDTH - margin * 2 - gap * (cols - 1)) / cols;

  // 画像は並列で取りに行く。取れなかったものは空きタイルとして描く。
  const bitmaps = await Promise.all(input.images.slice(0, slots).map(loadBitmap));

  // 背景
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, dims.width, dims.height);
  if (format === "story") ctx.translate(0, (dims.height - SHARE_CARD_HEIGHT_LOCAL) / 2);
  ctx.fillStyle = ROSE_SOFT;
  ctx.beginPath();
  ctx.arc(SHARE_CARD_WIDTH - 40, -20, 330, 0, Math.PI * 2);
  ctx.fill();

  // ヘッダー
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  drawLogo(ctx, margin, 108);

  ctx.textAlign = "right";
  ctx.fillStyle = MUTED;
  ctx.font = `600 30px ${FONT}`;
  const owner = ctx.measureText(input.ownerName).width > 420 ? input.ownerName.slice(0, 12) + "…" : input.ownerName;
  ctx.fillText(owner, SHARE_CARD_WIDTH - margin, 106);

  // 見出し
  ctx.textAlign = "left";
  ctx.fillStyle = INK;
  ctx.font = `800 68px ${FONT}`;
  const headLines = wrapText(ctx, input.headline, SHARE_CARD_WIDTH - margin * 2, 2);
  let y = 210;
  for (const l of headLines) {
    ctx.fillText(l, margin, y);
    y += 82;
  }

  let gridTop: number;

  if (isSeries) {
    const owned = input.owned ?? 0;
    const total = Math.max(input.total ?? 0, owned, 1);
    const pct = Math.min(100, Math.round((owned / total) * 100));

    // 大きな達成率
    y += 40;
    ctx.fillStyle = input.complete ? GOLD : ROSE;
    ctx.font = `900 200px ${FONT}`;
    ctx.fillText(`${pct}`, margin, y + 120);
    const numW = ctx.measureText(`${pct}`).width;
    ctx.font = `800 80px ${FONT}`;
    ctx.fillText("%", margin + numW + 8, y + 120);

    ctx.fillStyle = INK;
    ctx.font = `700 44px ${FONT}`;
    ctx.textAlign = "right";
    ctx.fillText(`${owned} / ${total}`, SHARE_CARD_WIDTH - margin, y + 70);
    ctx.fillStyle = MUTED;
    ctx.font = `600 30px ${FONT}`;
    ctx.fillText(input.collectedLabel ?? "collected", SHARE_CARD_WIDTH - margin, y + 118);
    ctx.textAlign = "left";

    // バー
    const barY = y + 160;
    const barW = SHARE_CARD_WIDTH - margin * 2;
    roundRect(ctx, margin, barY, barW, 26, 13);
    ctx.fillStyle = "#EADCD6";
    ctx.fill();
    if (pct > 0) {
      roundRect(ctx, margin, barY, Math.max(26, (barW * pct) / 100), 26, 13);
      ctx.fillStyle = input.complete ? GOLD : ROSE;
      ctx.fill();
    }

    if (input.complete) {
      const label = input.completeLabel ?? "COMPLETE";
      ctx.font = `800 34px ${FONT}`;
      const w = ctx.measureText(label).width + 56;
      roundRect(ctx, SHARE_CARD_WIDTH - margin - w, 150, w, 60, 30);
      ctx.fillStyle = GOLD;
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, SHARE_CARD_WIDTH - margin - w / 2, 181);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    }
    gridTop = barY + 70;
  } else {
    // 数字を2×2で並べる
    const stats = (input.stats ?? []).slice(0, 4);
    const cellW = (SHARE_CARD_WIDTH - margin * 2 - gap) / 2;
    const top = y + 10;
    stats.forEach((s, i) => {
      const cx = margin + (i % 2) * (cellW + gap);
      const cy = top + Math.floor(i / 2) * 150;
      roundRect(ctx, cx, cy, cellW, 126, 28);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.fillStyle = ROSE;
      ctx.font = `900 62px ${FONT}`;
      ctx.textAlign = "left";
      ctx.fillText(s.value, cx + 32, cy + 70);
      ctx.fillStyle = MUTED;
      ctx.font = `600 28px ${FONT}`;
      ctx.fillText(s.label, cx + 32, cy + 108);
    });
    gridTop = top + Math.ceil(stats.length / 2) * 150 + 24;
  }

  // 画像グリッド
  const rows = Math.ceil(slots / cols);
  // 下にはフッター(文言・URL・QR)の分を空ける
  const availH = SHARE_CARD_HEIGHT_LOCAL - 190 - gridTop;
  const rowH = Math.min(tile, (availH - gap * (rows - 1)) / rows);
  const size = Math.min(tile, rowH);
  const gridW = size * cols + gap * (cols - 1);
  const gridLeft = margin + (SHARE_CARD_WIDTH - margin * 2 - gridW) / 2;
  const owned = isSeries ? input.owned ?? 0 : slots;
  const total = isSeries ? Math.max(input.total ?? 0, owned) : slots;
  // 「まだ未所持」の最初の1枠にだけ文言を出す
  const firstMissing = Math.max(owned, 0);
  for (let i = 0; i < slots; i++) {
    const x = gridLeft + (i % cols) * (size + gap);
    const ty = gridTop + Math.floor(i / cols) * (size + gap);
    const bmp = bitmaps[i];
    if (bmp) {
      drawCover(ctx, bmp, x, ty, size, 28);
    } else if (!isSeries) {
      drawEmptyTile(ctx, x, ty, size, 28);
    } else if (i < owned) {
      // 持っているが画像が取れなかった枠。「未所持」に見せないよう、無地で置く
      drawPlainTile(ctx, x, ty, size, 28);
    } else if (i < total) {
      drawEmptyTile(ctx, x, ty, size, 28, i === firstMissing ? input.missingLabel : undefined);
    }
    // 総数を超える枠は描かない（コンプ済みで枠が余っても「?」を出さない）
  }

  // フッター: 文言とURLは左、QRは右
  const qrSize = 150;
  const footerBottom = SHARE_CARD_HEIGHT_LOCAL - 44;
  ctx.textAlign = "left";
  ctx.fillStyle = INK;
  ctx.font = `700 34px ${FONT}`;
  ctx.fillText(input.tagline, margin, footerBottom - 44);
  ctx.fillStyle = ROSE;
  ctx.font = `600 26px ${FONT}`;
  const shortUrl = input.footerUrl.replace(/^https?:\/\//, "");
  ctx.fillText(wrapText(ctx, shortUrl, SHARE_CARD_WIDTH - margin * 2 - qrSize - 24, 1)[0] ?? shortUrl, margin, footerBottom);
  await drawQr(ctx, input.footerUrl, SHARE_CARD_WIDTH - margin - qrSize, footerBottom - qrSize + 4, qrSize);

  bitmaps.forEach((b) => b?.close());

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png")
  );
}

/**
 * 横長(16:9)。X のタイムラインなど、横長で表示される場所向け。
 * 左に見出しと数字、右に写真を 3×2 で並べる。
 */
async function renderWide(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  input: ShareCardInput
): Promise<Blob> {
  const W = canvas.width;
  const H = canvas.height;
  const isSeries = input.variant === "series";
  const margin = 56;
  const leftW = 540;
  const bitmaps = await Promise.all(input.images.slice(0, 6).map(loadBitmap));

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = ROSE_SOFT;
  ctx.beginPath();
  ctx.arc(W - 20, -30, 260, 0, Math.PI * 2);
  ctx.fill();

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  drawLogo(ctx, margin, 96, 0.8);

  ctx.fillStyle = MUTED;
  ctx.font = `600 24px ${FONT}`;
  const owner = ctx.measureText(input.ownerName).width > 300 ? input.ownerName.slice(0, 10) + "…" : input.ownerName;
  ctx.fillText(owner, margin + 2, 140);

  ctx.fillStyle = INK;
  ctx.font = `800 42px ${FONT}`;
  const headLines = wrapText(ctx, input.headline, leftW, 2);
  let y = 204;
  for (const l of headLines) {
    ctx.fillText(l, margin, y);
    y += 54;
  }

  if (isSeries) {
    const owned = input.owned ?? 0;
    const total = Math.max(input.total ?? 0, owned, 1);
    const pct = Math.min(100, Math.round((owned / total) * 100));
    const color = input.complete ? GOLD : ROSE;
    ctx.fillStyle = color;
    ctx.font = `900 130px ${FONT}`;
    ctx.fillText(`${pct}`, margin, y + 96);
    const numW = ctx.measureText(`${pct}`).width;
    ctx.font = `800 52px ${FONT}`;
    ctx.fillText("%", margin + numW + 6, y + 96);
    ctx.fillStyle = INK;
    ctx.font = `700 34px ${FONT}`;
    ctx.textAlign = "right";
    ctx.fillText(`${owned} / ${total}`, margin + leftW, y + 52);
    ctx.fillStyle = MUTED;
    ctx.font = `600 22px ${FONT}`;
    ctx.fillText(input.collectedLabel ?? "collected", margin + leftW, y + 86);
    ctx.textAlign = "left";
    const barY = y + 118;
    roundRect(ctx, margin, barY, leftW, 20, 10);
    ctx.fillStyle = "#EADCD6";
    ctx.fill();
    if (pct > 0) {
      roundRect(ctx, margin, barY, Math.max(20, (leftW * pct) / 100), 20, 10);
      ctx.fillStyle = color;
      ctx.fill();
    }
    if (input.complete) {
      const label = input.completeLabel ?? "COMPLETE";
      ctx.font = `800 24px ${FONT}`;
      const w = ctx.measureText(label).width + 40;
      roundRect(ctx, margin + leftW - w, 72, w, 44, 22);
      ctx.fillStyle = GOLD;
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, margin + leftW - w / 2, 95);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    }
  } else {
    const stats = (input.stats ?? []).slice(0, 4);
    const gap = 16;
    const cellW = (leftW - gap) / 2;
    stats.forEach((s, i) => {
      const cx = margin + (i % 2) * (cellW + gap);
      const cy = y - 6 + Math.floor(i / 2) * 118;
      roundRect(ctx, cx, cy, cellW, 100, 22);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.fillStyle = ROSE;
      ctx.font = `900 46px ${FONT}`;
      ctx.fillText(s.value, cx + 24, cy + 54);
      ctx.fillStyle = MUTED;
      ctx.font = `600 22px ${FONT}`;
      ctx.fillText(s.label, cx + 24, cy + 86);
    });
  }

  // 右: 写真 3×2
  const gap = 16;
  const gridLeft = margin + leftW + 48;
  const gridW = W - margin - gridLeft;
  const size = (gridW - gap * 2) / 3;
  const gridTop = (H - (size * 2 + gap)) / 2 - 14;
  const owned = isSeries ? input.owned ?? 0 : 6;
  const total = isSeries ? Math.max(input.total ?? 0, owned) : 6;
  for (let i = 0; i < 6; i++) {
    const x = gridLeft + (i % 3) * (size + gap);
    const ty = gridTop + Math.floor(i / 3) * (size + gap);
    const bmp = bitmaps[i];
    if (bmp) drawCover(ctx, bmp, x, ty, size, 22);
    else if (!isSeries) drawEmptyTile(ctx, x, ty, size, 22);
    else if (i < owned) drawPlainTile(ctx, x, ty, size, 22);
    else if (i < total) drawEmptyTile(ctx, x, ty, size, 22);
  }

  // フッター
  const qrSize = 150;
  ctx.fillStyle = INK;
  ctx.font = `700 26px ${FONT}`;
  ctx.fillText(input.tagline, margin, H - 66);
  ctx.fillStyle = ROSE;
  ctx.font = `600 22px ${FONT}`;
  const shortUrl = input.footerUrl.replace(/^https?:\/\//, "");
  ctx.fillText(wrapText(ctx, shortUrl, W - margin * 2 - qrSize - 24, 1)[0] ?? shortUrl, margin, H - 30);
  await drawQr(ctx, input.footerUrl, W - margin - qrSize, H - qrSize - 22, qrSize);

  bitmaps.forEach((b) => b?.close());
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png")
  );
}
