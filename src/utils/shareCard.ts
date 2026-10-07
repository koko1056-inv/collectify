/**
 * 「思わず見せたくなる」共有カード（1080×1350 のPNG）を Canvas で描く。
 *
 * DOM を撮影する方式（html2canvas）にしない理由:
 *  - 外部ホストのグッズ画像は CORS が無いことが多く、DOM撮影だとキャンバスが汚染されて書き出せない。
 *    ここでは画像を fetch で取得して Bitmap にしてから描くので、取れない画像だけが空きタイルになり、
 *    カード全体の書き出しは失敗しない。
 *  - レイアウトが固定サイズなので、端末の画面幅に左右されずに同じ見た目になる。
 */

export type ShareCardVariant = "series" | "status";

export interface ShareCardStat {
  label: string;
  value: string;
}

export interface ShareCardInput {
  variant: ShareCardVariant;
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
}

export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1350;

const INK = "#2A1F24";
const MUTED = "#8A7B80";
const PAPER = "#FBF7F2";
const ROSE = "#D94A64";
const ROSE_SOFT = "#F7DDE2";
const GOLD = "#E0A21B";
const FONT =
  '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", Meiryo, system-ui, sans-serif';

async function loadBitmap(url: string): Promise<ImageBitmap | null> {
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

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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
  const scale = Math.max(size / img.width, size / img.height);
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

export async function renderShareCard(input: ShareCardInput): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = SHARE_CARD_WIDTH;
  canvas.height = SHARE_CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unsupported");

  const isSeries = input.variant === "series";
  const slots = isSeries ? 6 : 9;
  const cols = 3;
  const margin = 72;
  const gap = 24;
  const tile = (SHARE_CARD_WIDTH - margin * 2 - gap * (cols - 1)) / cols;

  // 画像は並列で取りに行く。取れなかったものは空きタイルとして描く。
  const bitmaps = await Promise.all(input.images.slice(0, slots).map(loadBitmap));

  // 背景
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT);
  ctx.fillStyle = ROSE_SOFT;
  ctx.beginPath();
  ctx.arc(SHARE_CARD_WIDTH - 40, -20, 330, 0, Math.PI * 2);
  ctx.fill();

  // ヘッダー
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = ROSE;
  ctx.font = `800 40px ${FONT}`;
  ctx.fillText("Collectify", margin, 108);

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
  const availH = SHARE_CARD_HEIGHT - 150 - gridTop;
  const rowH = Math.min(tile, (availH - gap * (rows - 1)) / rows);
  const size = Math.min(tile, rowH);
  const gridW = size * cols + gap * (cols - 1);
  const gridLeft = margin + (SHARE_CARD_WIDTH - margin * 2 - gridW) / 2;
  const ownedCount = isSeries ? input.owned ?? 0 : slots;
  for (let i = 0; i < slots; i++) {
    const x = gridLeft + (i % cols) * (size + gap);
    const ty = gridTop + Math.floor(i / cols) * (size + gap);
    const bmp = bitmaps[i];
    if (bmp) {
      drawCover(ctx, bmp, x, ty, size, 28);
    } else if (isSeries && i >= Math.min(ownedCount, input.images.length)) {
      drawEmptyTile(ctx, x, ty, size, 28, i === Math.min(ownedCount, input.images.length) ? input.missingLabel : undefined);
    } else {
      drawEmptyTile(ctx, x, ty, size, 28);
    }
  }

  // フッター
  ctx.textAlign = "left";
  ctx.fillStyle = INK;
  ctx.font = `700 34px ${FONT}`;
  ctx.fillText(input.tagline, margin, SHARE_CARD_HEIGHT - 88);
  ctx.fillStyle = ROSE;
  ctx.font = `600 28px ${FONT}`;
  ctx.fillText(input.footerUrl.replace(/^https?:\/\//, ""), margin, SHARE_CARD_HEIGHT - 44);

  bitmaps.forEach((b) => b?.close());

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png")
  );
}
