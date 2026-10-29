/**
 * X（旧Twitter）の交換投稿でよく使われる「譲・求」の画像を Canvas で描く。
 *
 * 推し活の交換は X の「譲・求」投稿が中心。アプリの中に交換相手がまだ少ないうちも、
 * 自分の交換に出しているグッズ（譲）と、ほしいもの（求）を、そのまま X に貼れる形にして渡す。
 *  - 上に作品名、真ん中に「譲」「求」の欄（グッズの写真と名前・数量）、下に取引方法と条件の一言
 *  - いちばん下に小さく Collectify のロゴと QR（自分のコレクションのページ）
 *  - X は1投稿に画像4枚まで。グッズが多いときは何枚かに分ける（分け方は paginateTradeCard）
 *
 * 写真は外部サイトの画像が多い。そのまま canvas に描くと CORS で汚染され、書き出せなくなる。
 * 共有カード（shareCard.ts）と同じく fetch で Bitmap にしてから描き、取れない写真だけを空きにする。
 * 取りに行く順は「カタログのサムネ（Storage の CDN）→ proxy-image → 元の URL」。
 */
import { drawLogo, drawQr, preloadLogoMark, FONT, loadBitmap, roundRect, wrapText } from "./shareCard";
import { getCatalogThumbUrl, getOptimizedImageUrl, toProxyUrl } from "./optimized-image";
import { DEFAULT_SHARE_PALETTE } from "@/lib/cosmetics";

export type TradeCardFormat = "square" | "story" | "wide";

/** SNS の比率。正方形(1:1)・ストーリーズ(9:16)・横長(16:9) */
export const TRADE_CARD_FORMATS: Record<TradeCardFormat, { width: number; height: number }> = {
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
  wide: { width: 1200, height: 675 },
};

/** X は1投稿に画像4枚まで */
export const X_MAX_IMAGES = 4;

export interface TradeCardGoods {
  title: string;
  image: string | null;
  /** 譲: 出せる数（2以上のときだけ「×2」と出す） */
  quantity?: number;
}

export interface TradeCardPage {
  give: TradeCardGoods[];
  want: TradeCardGoods[];
}

export interface TradeCardInput extends TradeCardPage {
  format: TradeCardFormat;
  /** 見出し（作品名。作品で絞っていないときは「グッズ交換」など） */
  headline: string;
  /** 見出しの横の札（「交換」） */
  headlineTag: string;
  /** 取引方法・条件（空なら描かない） */
  methodLine: string;
  noteLine: string;
  labels: { give: string; want: string; footer: string };
  page: number;
  pages: number;
  /** QR に入れる URL（自分のコレクションのページ） */
  qrUrl: string;
  /** QR の横に出す短い文字（ドメインなど） */
  footerUrl: string;
}

const P = DEFAULT_SHARE_PALETTE;
// 「求」の色。「譲」はアプリの色（ローズ）なので、見分けやすい青にする（画像の中だけで使う色）
const WANT = "#3E6FB0";
const WANT_SOFT = "#DCE7F5";

interface Grid {
  cols: number;
  rows: number;
}

/**
 * 1枚に入る数。欄が1つ（譲だけ・求だけ）なら、その欄に2つ分の場所を使う。
 * 写真が小さくなりすぎない（X のタイムラインで縮んでも何のグッズか分かる）大きさを優先して決めた。
 */
function gridFor(format: TradeCardFormat, sections: number): Grid {
  if (format === "square") return sections === 2 ? { cols: 4, rows: 1 } : { cols: 4, rows: 2 };
  if (format === "story") return sections === 2 ? { cols: 3, rows: 2 } : { cols: 3, rows: 4 };
  return sections === 2 ? { cols: 3, rows: 1 } : { cols: 5, rows: 1 };
}

/** 選んだグッズを、1枚に入る数ずつの画像に分ける */
export function paginateTradeCard(give: TradeCardGoods[], want: TradeCardGoods[], format: TradeCardFormat): TradeCardPage[] {
  if (give.length === 0 && want.length === 0) return [];
  const sections = give.length > 0 && want.length > 0 ? 2 : 1;
  const g = gridFor(format, sections);
  const cap = g.cols * g.rows;
  const pages = Math.max(Math.ceil(give.length / cap), Math.ceil(want.length / cap), 1);
  return Array.from({ length: pages }, (_, i) => ({
    give: give.slice(i * cap, (i + 1) * cap),
    want: want.slice(i * cap, (i + 1) * cap),
  }));
}

// 画像の名前を短くするのは一覧と同じ（utils/goodsTitle.ts）
export { shortGoodsTitle } from "./goodsTitle";

/** canvas に描ける形で写真を取りに行く。サムネ → proxy-image → 元の URL の順に試す */
export async function loadGoodsBitmap(src: string | null): Promise<ImageBitmap | null> {
  if (!src || !/^https?:\/\//.test(src)) return null;
  const candidates: string[] = [];
  if (src.includes("/storage/v1/")) {
    // 自前の Storage（ユーザーの写真）は画像変換で縮めたものを先に。CORS は付いている
    candidates.push(getOptimizedImageUrl(src, { width: 480 }), src);
  } else {
    const thumb = getCatalogThumbUrl(src);
    if (thumb) candidates.push(thumb);
    candidates.push(toProxyUrl(src), src);
  }
  for (const url of candidates) {
    const bmp = await loadBitmap(url);
    if (bmp) return bmp;
  }
  return null;
}

function drawContain(ctx: CanvasRenderingContext2D, img: ImageBitmap, x: number, y: number, size: number, r: number) {
  ctx.save();
  roundRect(ctx, x, y, size, size, r);
  ctx.clip();
  ctx.fillStyle = P.tile;
  ctx.fillRect(x, y, size, size);
  const pad = size * 0.04;
  const inner = size - pad * 2;
  const s = Math.min(inner / img.width, inner / img.height);
  const w = img.width * s;
  const h = img.height * s;
  ctx.drawImage(img, x + (size - w) / 2, y + (size - h) / 2, w, h);
  ctx.restore();
  ctx.save();
  roundRect(ctx, x, y, size, size, r);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(42,31,36,0.10)";
  ctx.stroke();
  ctx.restore();
}

/** 写真が取れなかったグッズ。名前の頭の文字を淡く置いておく */
function drawNoPhoto(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, r: number, title: string, soft: string) {
  ctx.save();
  roundRect(ctx, x, y, size, size, r);
  ctx.fillStyle = soft;
  ctx.fill();
  ctx.fillStyle = "rgba(42,31,36,0.35)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 ${Math.round(size * 0.3)}px ${FONT}`;
  ctx.fillText(Array.from(title)[0] ?? "?", x + size / 2, y + size / 2);
  ctx.restore();
}

function drawQuantity(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, qty: number, scale: number) {
  const label = `×${qty}`;
  ctx.save();
  ctx.font = `800 ${Math.round(30 * scale)}px ${FONT}`;
  const w = ctx.measureText(label).width + 26 * scale;
  const h = 44 * scale;
  roundRect(ctx, x + size - w - 8 * scale, y + 8 * scale, w, h, h / 2);
  ctx.fillStyle = "rgba(42,31,36,0.86)";
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + size - w / 2 - 8 * scale, y + 8 * scale + h / 2 + 1);
  ctx.restore();
}

/** 「譲」「求」の見出し（丸い印＋字） */
function drawSectionLabel(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, char: string, label: string, color: string, scale: number) {
  ctx.save();
  const d = h;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${Math.round(d * 0.58)}px ${FONT}`;
  ctx.fillText(char, x + d / 2, y + d / 2 + 2);
  ctx.textAlign = "left";
  ctx.fillStyle = P.ink;
  ctx.font = `800 ${Math.round(30 * scale)}px ${FONT}`;
  ctx.fillText(label, x + d + 14 * scale, y + d / 2 + 1);
  ctx.restore();
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 欄の中の寸法（見出し・写真・名前）。rect の幅と高さの両方に収まる写真の大きさを決める */
function sectionMetrics(rect: Rect, grid: Grid, scale: number) {
  const pad = 22 * scale;
  const labelH = 52 * scale;
  const gap = 16 * scale;
  const nameLineH = Math.round(30 * scale);
  const nameH = nameLineH * 2 + 6 * scale;
  const innerW = rect.w - pad * 2;
  const innerH = rect.h - pad * 2 - labelH - 14 * scale;
  const size = Math.floor(
    Math.min((innerW - gap * (grid.cols - 1)) / grid.cols, (innerH - grid.rows * nameH - gap * (grid.rows - 1)) / grid.rows)
  );
  // 写真の大きさが幅で決まったときは、下に余りが出る。欄をその分だけ低くする（横長で間延びしないように）
  const height = pad * 2 + labelH + 14 * scale + grid.rows * (size + nameH) + (grid.rows - 1) * gap;
  return { pad, labelH, gap, nameLineH, nameH, size, height: Math.min(height, rect.h) };
}

/**
 * 名前を幅に収めて折り返す。日本語は1文字ずつ折り返してよいが、「Vol.1」のような英数字の並びは途中で切らない
 * （「V / ol.1」と割れて読みにくかった）。長すぎる英数字の並びだけは1文字ずつに戻す。
 */
function wrapName(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const fits = (t: string) => ctx.measureText(t).width <= maxWidth;
  const tokens = text.match(/[A-Za-z0-9.\-#&'+/:]+|\s+|./gu) ?? [];
  const lines: string[] = [];
  let line = "";
  let truncated = false;
  const push = () => {
    lines.push(line.trimEnd());
    line = "";
    if (lines.length === maxLines) truncated = true;
  };
  for (const raw of tokens) {
    if (fits(line + raw)) {
      line += raw;
      continue;
    }
    if (line.trim()) {
      push();
      if (truncated) break;
    }
    const tk = raw.trimStart();
    if (fits(tk)) {
      line = tk;
      continue;
    }
    // 1語で幅を超える: 1文字ずつ詰める
    for (const ch of Array.from(tk)) {
      if (!fits(line + ch) && line) {
        push();
        if (truncated) break;
      }
      line += ch;
    }
    if (truncated) break;
  }
  if (!truncated && line.trim()) {
    if (lines.length < maxLines) lines.push(line.trimEnd());
    else truncated = true;
  }
  // 入りきらなかった（途中で止めた、または残りがある）ときは、最後の行を「…」で終える
  const consumed = lines.join("").replace(/\s/g, "").length;
  if ((truncated && consumed < text.replace(/\s/g, "").length) && lines.length) {
    let last = lines[lines.length - 1];
    while (last.length > 1 && !fits(last + "…")) last = last.slice(0, -1);
    lines[lines.length - 1] = last + "…";
  }
  return lines;
}

/** 1つの欄（見出し＋写真の格子）を rect の中に描く */
function drawSection(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  goods: TradeCardGoods[],
  bitmaps: (ImageBitmap | null)[],
  grid: Grid,
  kind: "give" | "want",
  labelText: string,
  scale: number
) {
  const color = kind === "give" ? P.accent : WANT;
  const soft = kind === "give" ? P.accentSoft : WANT_SOFT;
  const m = sectionMetrics(rect, grid, scale);
  // 欄の地（薄い色の角丸）
  ctx.save();
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 28 * scale);
  ctx.fillStyle = kind === "give" ? "rgba(217,74,100,0.07)" : "rgba(62,111,176,0.10)";
  ctx.fill();
  ctx.restore();

  drawSectionLabel(ctx, rect.x + m.pad, rect.y + m.pad, m.labelH, kind === "give" ? "譲" : "求", labelText, color, scale);

  const nameFont = Math.round(24 * scale);
  // 数が少ないときは左に寄せる（写真の大きさは格子で決め、数が少なくても大きくしない: 枚ごとに大きさが揃う）
  const left = rect.x + m.pad;
  const top = rect.y + m.pad + m.labelH + 14 * scale;
  goods.forEach((g, i) => {
    const c = i % grid.cols;
    const r = Math.floor(i / grid.cols);
    const x = left + c * (m.size + m.gap);
    const y = top + r * (m.size + m.nameH + m.gap);
    const bmp = bitmaps[i];
    if (bmp) drawContain(ctx, bmp, x, y, m.size, 18 * scale);
    else drawNoPhoto(ctx, x, y, m.size, 18 * scale, g.title, soft);
    if (kind === "give" && (g.quantity ?? 1) >= 2) drawQuantity(ctx, x, y, m.size, g.quantity!, scale);
    ctx.save();
    ctx.fillStyle = P.ink;
    ctx.font = `600 ${nameFont}px ${FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    const lines = wrapName(ctx, g.title, m.size, 2);
    lines.forEach((l, li) => ctx.fillText(l, x, y + m.size + m.nameLineH * (li + 1)));
    ctx.restore();
  });
}

export async function renderTradeCard(input: TradeCardInput): Promise<Blob> {
  await preloadLogoMark();
  const { width: W, height: H } = TRADE_CARD_FORMATS[input.format];
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unsupported");

  const wide = input.format === "wide";
  const story = input.format === "story";
  const scale = wide ? 0.78 : 1;
  const margin = wide ? 40 : 52;

  const [giveBmp, wantBmp] = await Promise.all([
    Promise.all(input.give.map((g) => loadGoodsBitmap(g.image))),
    Promise.all(input.want.map((g) => loadGoodsBitmap(g.image))),
  ]);

  ctx.fillStyle = P.paper;
  ctx.fillRect(0, 0, W, H);

  // 見出し: 作品名＋「交換」の札。右上に何枚目か
  const headTop = story ? 120 : wide ? 34 : 48;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  const headSize = Math.round((story ? 76 : 60) * scale);
  ctx.font = `900 ${headSize}px ${FONT}`;
  ctx.fillStyle = P.ink;
  const tagFont = Math.round(30 * scale);
  ctx.font = `800 ${tagFont}px ${FONT}`;
  const tagW = ctx.measureText(input.headlineTag).width + 36 * scale;
  const pageW = input.pages > 1 ? 120 * scale : 0;
  ctx.font = `900 ${headSize}px ${FONT}`;
  const headMax = W - margin * 2 - tagW - 20 * scale - pageW;
  const head = wrapText(ctx, input.headline, headMax, 1)[0] ?? input.headline;
  const headBase = headTop + headSize;
  ctx.fillText(head, margin, headBase);
  const headW = ctx.measureText(head).width;
  const tagH = 48 * scale;
  const tagX = margin + headW + 20 * scale;
  roundRect(ctx, tagX, headBase - headSize * 0.5 - tagH / 2 - 4 * scale, tagW, tagH, tagH / 2);
  ctx.fillStyle = P.accent;
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 ${tagFont}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(input.headlineTag, tagX + tagW / 2, headBase - headSize * 0.5 - 2 * scale);
  if (input.pages > 1) {
    ctx.textAlign = "right";
    ctx.fillStyle = P.muted;
    ctx.font = `800 ${Math.round(34 * scale)}px ${FONT}`;
    ctx.fillText(`${input.page}/${input.pages}`, W - margin, headBase - headSize * 0.5);
  }
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // 下: 取引方法・条件の一言と、ロゴ・QR
  const qrSize = story ? 170 : wide ? 104 : 128;
  const footerH = qrSize + (story ? 110 : wide ? 20 : 36);
  const noteText = [input.methodLine, input.noteLine].filter(Boolean);
  const noteFont = Math.round(28 * scale);
  const noteH = noteText.length ? noteText.length * (noteFont + 14 * scale) + 18 * scale : 0;

  const bodyTop = headBase + (story ? 56 : 30 * scale);
  const bodyBottom = H - footerH - noteH - (story ? 30 : 16 * scale);
  const sections = (input.give.length > 0 ? 1 : 0) + (input.want.length > 0 ? 1 : 0);
  const grid = gridFor(input.format, Math.max(sections, 1));
  const gap = 22 * scale;
  const body: Rect = { x: margin, y: bodyTop, w: W - margin * 2, h: bodyBottom - bodyTop };
  const rects: Rect[] = [];
  if (sections === 2) {
    if (wide) {
      const w = (body.w - gap) / 2;
      rects.push({ ...body, w }, { ...body, x: body.x + w + gap, w });
    } else {
      const h = (body.h - gap) / 2;
      rects.push({ ...body, h }, { ...body, y: body.y + h + gap, h });
    }
  } else {
    rects.push(body);
  }
  // 欄を中身の高さまで低くし、余った分は上下に分けて真ん中に寄せる
  rects.forEach((r) => (r.h = sectionMetrics(r, grid, scale).height));
  const used = wide || sections === 1 ? rects[0].h : rects[0].h + gap + rects[1].h;
  const shiftY = Math.max(0, (body.h - used) / 2);
  rects.forEach((r, i) => {
    r.y = body.y + shiftY + (!wide && i === 1 ? rects[0].h + gap : 0);
  });
  let ri = 0;
  if (input.give.length > 0) drawSection(ctx, rects[ri++], input.give, giveBmp, grid, "give", input.labels.give, scale);
  if (input.want.length > 0) drawSection(ctx, rects[ri++], input.want, wantBmp, grid, "want", input.labels.want, scale);

  if (noteText.length) {
    ctx.fillStyle = P.ink;
    ctx.font = `700 ${noteFont}px ${FONT}`;
    let y = bodyBottom + 18 * scale + noteFont;
    for (const line of noteText) {
      ctx.fillText(wrapText(ctx, line, W - margin * 2, 1)[0] ?? line, margin, y);
      y += noteFont + 14 * scale;
    }
  }

  // フッター: 左に小さなロゴと一言・URL、右に QR
  const footTop = H - footerH;
  ctx.save();
  ctx.strokeStyle = P.track;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin, footTop + 4);
  ctx.lineTo(W - margin, footTop + 4);
  ctx.stroke();
  ctx.restore();
  const qrX = W - margin - qrSize;
  const qrY = H - qrSize - (story ? 70 : wide ? 12 : 22);
  const logoScale = story ? 0.8 : wide ? 0.55 : 0.62;
  const textMax = qrX - margin - 20;
  const logoBase = qrY + qrSize * 0.42;
  drawLogo(ctx, margin, logoBase, logoScale, { badge: P.accent, letter: P.logoText });
  ctx.fillStyle = P.muted;
  ctx.font = `600 ${Math.round((story ? 28 : 22) * (wide ? 0.95 : 1))}px ${FONT}`;
  ctx.fillText(wrapText(ctx, input.labels.footer, textMax, 1)[0] ?? "", margin, logoBase + (story ? 54 : 38));
  ctx.fillStyle = P.accent;
  ctx.font = `600 ${story ? 24 : 20}px ${FONT}`;
  ctx.fillText(wrapText(ctx, input.footerUrl, textMax, 1)[0] ?? "", margin, logoBase + (story ? 90 : 66));
  await drawQr(ctx, input.qrUrl, qrX, qrY, qrSize);

  [...giveBmp, ...wantBmp].forEach((b) => b?.close());
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png")
  );
}

// ---------------------------------------------------------------------------
// X の投稿文
// ---------------------------------------------------------------------------

/**
 * X の文字数の数え方に近い数え方（半角1・全角2、URL は23）。上限は 280。
 * 正確な規則（twitter-text）までは要らない。少し余裕を見て切る。
 */
export function xWeightedLength(text: string): number {
  let n = 0;
  const urls = text.match(/https?:\/\/\S+/g) ?? [];
  let rest = text;
  for (const u of urls) {
    n += 23;
    rest = rest.replace(u, "");
  }
  for (const ch of Array.from(rest)) n += (ch.codePointAt(0) ?? 0) <= 0x10ff ? 1 : 2;
  return n;
}

export const X_TEXT_LIMIT = 280;

/** 作品名をハッシュタグにする（#ちいかわ交換）。空白・記号はハッシュタグに使えないので外す */
export function tradeHashtag(content: string): string {
  const base = content.replace(/[\s\u3000・･!-/:-@[-`{-~、。「」『』（）［］【】〈〉《》！？＃＆＊＋，－．／：；＜＝＞＠＼＾｀｛｜｝～♪☆★]/g, "");
  return base ? `#${base}交換` : "";
}

export interface TradePostTextInput {
  give: { title: string; quantity?: number }[];
  want: { title: string }[];
  hashtags: string[];
  /** 「郵送・手渡し」など（空なら行ごと出さない） */
  methodLine: string;
  noteLine: string;
  url?: string;
  labels: { give: string; want: string; more: (n: number) => string; none: string };
}

/**
 * 「【譲】… 【求】… #〇〇交換」の投稿文。長すぎるときは、多い方の欄から後ろを「ほか◯点」にまとめて 280 に収める。
 */
export function buildTradePostText(input: TradePostTextInput): string {
  const fmtGive = (g: { title: string; quantity?: number }) => ((g.quantity ?? 1) >= 2 ? `${g.title}×${g.quantity}` : g.title);
  let giveN = input.give.length;
  let wantN = input.want.length;
  const make = () => {
    const line = (items: string[], total: number) =>
      total === 0 ? input.labels.none : items.join("、") + (total > items.length ? ` ${input.labels.more(total - items.length)}` : "");
    const parts = [
      `【${input.labels.give}】${line(input.give.slice(0, giveN).map(fmtGive), input.give.length)}`,
      `【${input.labels.want}】${line(input.want.slice(0, wantN).map((w) => w.title), input.want.length)}`,
    ];
    if (input.methodLine) parts.push(input.methodLine);
    if (input.noteLine) parts.push(input.noteLine);
    const tags = input.hashtags.filter(Boolean).join(" ");
    if (tags) parts.push("", tags);
    if (input.url) parts.push(input.url);
    return parts.join("\n");
  };
  let text = make();
  // 1つも載せられない欄が出ないよう、各欄の最初の1点は残す
  while (xWeightedLength(text) > X_TEXT_LIMIT && (giveN > 1 || wantN > 1)) {
    if (giveN >= wantN && giveN > 1) giveN -= 1;
    else if (wantN > 1) wantN -= 1;
    else giveN -= 1;
    text = make();
  }
  return text;
}
