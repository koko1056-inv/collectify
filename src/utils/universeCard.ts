/**
 * 「推し宇宙」の共有カード。画面で見ている宇宙と同じ配置・同じ描画を、固定サイズの画像に書き出す。
 * 写真が小さすぎて見えない大きさのときは取りに行かず、光る星だけで描く。
 */
import {
  drawLogo,
  drawQr,
  FONT,
  loadBitmap,
  roundRect,
  SHARE_CARD_FORMATS,
  wrapText,
  type ShareCardInput,
} from "./shareCard";
import { drawBackground, drawUniverse, type ImageSource } from "./universe/render";
import { fitView, STAR_R } from "./universe/layout";

const MAX_THUMBS = 120;
const MAX_SCALE = 5;

export async function renderUniverseCard(input: ShareCardInput): Promise<Blob> {
  const uni = input.universe;
  if (!uni) throw new Error("universe missing");
  const format = input.format ?? "portrait";
  const { width: W, height: H } = SHARE_CARD_FORMATS[format];
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unsupported");

  const wide = format === "wide";
  const margin = wide ? 56 : 72;
  const story = format === "story";
  const safeTop = story ? 150 : 0;
  const safeBottom = story ? 190 : 0;
  const labels = input.universeLabels ?? { goods: "goods", galaxies: "galaxies", biggest: "biggest" };

  // 地図の領域
  let mx: number, my: number, mw: number, mh: number;
  const qrSize = wide ? 130 : 150;
  const footerH = wide ? 0 : 200;
  const headerH = wide ? 0 : story ? 470 : format === "square" ? 390 : 460;
  if (wide) {
    const leftW = 470;
    mx = margin + leftW + 24;
    my = 36;
    mw = W - margin - mx;
    mh = H - 72;
  } else {
    mx = margin;
    my = safeTop + headerH;
    mw = W - margin * 2;
    mh = H - safeBottom - footerH - my;
  }

  const view = fitView(uni.bounds, mw, mh, 36);
  view.scale = Math.min(view.scale, MAX_SCALE);

  // 写真が見える大きさのときだけ画像を取る。大きく育てた星（数が多い）から優先
  const bitmaps = new Map<string, ImageBitmap>();
  if (view.scale * STAR_R >= 7) {
    const urls: string[] = [];
    const seen = new Set<string>();
    for (const g of uni.galaxies) {
      for (const s of g.stars) {
        if (s.image && !seen.has(s.image)) {
          seen.add(s.image);
          urls.push(s.image);
        }
      }
    }
    const loaded = await Promise.all(urls.slice(0, MAX_THUMBS).map(async (u) => [u, await loadBitmap(u)] as const));
    for (const [u, b] of loaded) if (b) bitmaps.set(u, b);
  }

  drawBackground(ctx, W, H, { cx: 0, cy: 0, scale: 1 }, 0);

  // ヘッダー
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  if (wide) {
    drawLogo(ctx, margin, 96, 0.8);
  } else {
    drawLogo(ctx, margin, safeTop + 108);
  }
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = `600 ${wide ? 24 : 30}px ${FONT}`;
  const maxOwner = wide ? 300 : 420;
  const owner = ctx.measureText(input.ownerName).width > maxOwner ? input.ownerName.slice(0, wide ? 10 : 12) + "…" : input.ownerName;
  if (wide) {
    ctx.fillText(owner, margin + 2, 140);
  } else {
    ctx.textAlign = "right";
    ctx.fillText(owner, W - margin, safeTop + 106);
    ctx.textAlign = "left";
  }

  // 見出し
  ctx.fillStyle = "#FFFFFF";
  const headSize = wide ? 44 : 68;
  ctx.font = `800 ${headSize}px ${FONT}`;
  const headLines = wrapText(ctx, input.headline, wide ? 470 : W - margin * 2, 2);
  let y = wide ? 206 : safeTop + 206;
  for (const l of headLines) {
    ctx.fillText(l, margin, y);
    y += headSize * 1.2;
  }

  // 数字
  const biggest = uni.galaxies[0]?.label ?? "";
  const stats = [
    { value: String(uni.totalItems), label: labels.goods },
    { value: String(uni.galaxies.length), label: labels.galaxies },
  ];
  if (wide) {
    let sy = y + 18;
    stats.forEach((s, i) => {
      const sx = margin + i * 190;
      ctx.fillStyle = "#FFD98A";
      ctx.font = `900 64px ${FONT}`;
      ctx.fillText(s.value, sx, sy + 50);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = `600 22px ${FONT}`;
      ctx.fillText(s.label, sx, sy + 84);
    });
    sy += 120;
    if (biggest) {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = `600 22px ${FONT}`;
      ctx.fillText(labels.biggest, margin, sy + 12);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `800 32px ${FONT}`;
      ctx.fillText(wrapText(ctx, biggest, 470, 1)[0] ?? biggest, margin, sy + 52);
    }
  } else {
    const sy = y + 6;
    let sx = margin;
    stats.forEach((s) => {
      ctx.fillStyle = "#FFD98A";
      ctx.font = `900 ${format === "square" ? 60 : 76}px ${FONT}`;
      ctx.fillText(s.value, sx, sy + 70);
      const vw = ctx.measureText(s.value).width;
      ctx.fillStyle = "rgba(255,255,255,0.72)";
      ctx.font = `600 28px ${FONT}`;
      ctx.fillText(s.label, sx + vw + 12, sy + 70);
      sx += vw + 12 + ctx.measureText(s.label).width + 44;
    });
    if (biggest && format !== "square") {
      ctx.fillStyle = "rgba(255,255,255,0.72)";
      ctx.font = `600 28px ${FONT}`;
      ctx.fillText(`${labels.biggest}：`, margin, sy + 128);
      const lw = ctx.measureText(`${labels.biggest}：`).width;
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `800 36px ${FONT}`;
      ctx.fillText(wrapText(ctx, biggest, W - margin * 2 - lw, 1)[0] ?? biggest, margin + lw, sy + 128);
    }
  }

  // 宇宙
  ctx.save();
  roundRect(ctx, mx, my, mw, mh, 36);
  ctx.clip();
  ctx.fillStyle = "rgba(4,3,18,0.55)";
  ctx.fillRect(mx, my, mw, mh);
  ctx.translate(mx, my);
  drawUniverse(ctx, {
    universe: uni,
    view,
    width: mw,
    height: mh,
    t: 0,
    getImage: (u) => (bitmaps.get(u) as ImageSource | undefined) ?? null,
    labels: true,
    background: false,
    fontFamily: FONT,
    labelMin: wide ? 20 : 26,
    labelMax: wide ? 34 : 44,
  });
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 2;
  roundRect(ctx, mx, my, mw, mh, 36);
  ctx.stroke();

  // フッター: 文言とURLは左、QRは右
  ctx.textAlign = "left";
  if (wide) {
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 26px ${FONT}`;
    ctx.fillText(input.tagline, margin, H - 66);
    ctx.fillStyle = "#FFB3C1";
    ctx.font = `600 22px ${FONT}`;
    const shortUrl = input.footerUrl.replace(/^https?:\/\//, "");
    ctx.fillText(wrapText(ctx, shortUrl, 470 - qrSize - 20, 1)[0] ?? shortUrl, margin, H - 30);
    await drawQr(ctx, input.footerUrl, margin + 470 - qrSize, H - qrSize - 100, qrSize);
  } else {
    const footerBottom = H - safeBottom - 44;
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 34px ${FONT}`;
    ctx.fillText(input.tagline, margin, footerBottom - 44);
    ctx.fillStyle = "#FFB3C1";
    ctx.font = `600 26px ${FONT}`;
    const shortUrl = input.footerUrl.replace(/^https?:\/\//, "");
    ctx.fillText(wrapText(ctx, shortUrl, W - margin * 2 - qrSize - 24, 1)[0] ?? shortUrl, margin, footerBottom);
    await drawQr(ctx, input.footerUrl, W - margin - qrSize, footerBottom - qrSize + 4, qrSize);
  }

  bitmaps.forEach((b) => b.close());
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png")
  );
}
