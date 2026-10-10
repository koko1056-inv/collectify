import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Share2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { UserItemDetailsModal } from "@/components/item-details/UserItemDetailsModal";
import { ShareCardDialog, type ShareCardSpec } from "@/components/share/ShareCardDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUniverseItems } from "@/hooks/useUniverseItems";
import { buildUniverse, fitView, type Galaxy, type View } from "@/utils/universe/layout";
import { drawUniverse, hitTest, maxScaleFor, type ImageSource } from "@/utils/universe/render";
import { getOptimizedImageUrl } from "@/utils/optimized-image";

const FONT =
  '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", Meiryo, system-ui, sans-serif';
const MAX_PARALLEL_IMAGES = 6;

interface UniverseViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerName: string;
}

type ImageState = HTMLImageElement | "loading" | "failed";

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/**
 * 持っているグッズを、作品ごとの銀河として宇宙に並べる。
 * ドラッグで移動、ピンチ・ホイールで拡大。銀河をタップすると近づき、近づいた星（グッズ）をタップすると詳細が開く。
 */
export function UniverseView({ open, onOpenChange, ownerName }: UniverseViewProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data: items, isLoading: isQueryLoading, isError } = useUniverseItems(user?.id, open);
  // 開いた直後は取得が始まる前の1フレームがあるので、データも失敗も無い間は読み込み中として扱う
  const isLoading = isQueryLoading || (!items && !isError);
  const universe = useMemo(() => buildUniverse(items ?? []), [items]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const viewRef = useRef<View>({ cx: 0, cy: 0, scale: 1 });
  const fitRef = useRef<View>({ cx: 0, cy: 0, scale: 1 });
  const animRef = useRef<{ from: View; to: View; start: number; dur: number } | null>(null);
  const imagesRef = useRef<Map<string, ImageState>>(new Map());
  const queueRef = useRef<string[]>([]);
  const activeLoadsRef = useRef(0);
  const dirtyRef = useRef(true);
  /** 最後に描いた時刻（秒）。タップの当たり判定を描画と揃えるため */
  const tRef = useRef(0);
  const focusKeyRef = useRef<string | null>(null);
  const universeRef = useRef(universe);
  universeRef.current = universe;

  const [focus, setFocus] = useState<Galaxy | null>(null);
  const [picked, setPicked] = useState<{ id: string; title: string; image: string } | null>(null);
  const [shareSpec, setShareSpec] = useState<ShareCardSpec | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const markDirty = () => {
    dirtyRef.current = true;
  };

  // ---- 画像の読み込み（同時数を絞る） ----
  const pump = useCallback(() => {
    while (activeLoadsRef.current < MAX_PARALLEL_IMAGES && queueRef.current.length > 0) {
      const url = queueRef.current.shift()!;
      activeLoadsRef.current++;
      const img = new Image();
      img.decoding = "async";
      let triedOriginal = false;
      const done = (state: ImageState) => {
        imagesRef.current.set(url, state);
        activeLoadsRef.current--;
        markDirty();
        pump();
      };
      img.onload = () => done(img);
      img.onerror = () => {
        // 縮小版が無いホストは元の画像で一度だけ取り直す
        if (!triedOriginal) {
          triedOriginal = true;
          img.src = url;
          return;
        }
        done("failed");
      };
      img.src = getOptimizedImageUrl(url, { width: 160 });
    }
  }, []);

  const wantImage = useCallback(
    (url: string) => {
      if (imagesRef.current.has(url)) return;
      imagesRef.current.set(url, "loading");
      queueRef.current.push(url);
      pump();
    },
    [pump]
  );

  const getImage = useCallback((url: string): ImageSource | null => {
    const s = imagesRef.current.get(url);
    return s && typeof s !== "string" ? (s as ImageSource) : null;
  }, []);

  // ---- 視点 ----
  const animateTo = useCallback((to: View) => {
    if (prefersReducedMotion()) {
      viewRef.current = to;
      animRef.current = null;
    } else {
      animRef.current = { from: { ...viewRef.current }, to, start: performance.now(), dur: 650 };
    }
    markDirty();
  }, []);

  const fitAll = useCallback(() => {
    const { w, h } = sizeRef.current;
    if (!w || !h) return;
    const v = fitView(universeRef.current.bounds, w, h, 40);
    fitRef.current = v;
    return v;
  }, []);

  const resetView = useCallback(() => {
    const v = fitAll();
    if (v) animateTo(v);
    focusKeyRef.current = null;
    setFocus(null);
  }, [fitAll, animateTo]);

  const focusGalaxy = useCallback(
    (g: Galaxy) => {
      const { w, h } = sizeRef.current;
      const v = fitView(
        { minX: g.x - g.radius, maxX: g.x + g.radius, minY: g.y - g.radius, maxY: g.y + g.radius },
        w,
        h,
        28
      );
      v.scale = Math.min(v.scale, maxScaleFor());
      focusKeyRef.current = g.key;
      setFocus(g);
      animateTo(v);
    },
    [animateTo]
  );

  // 宇宙が変わったら全体を映し直す
  useEffect(() => {
    const v = fitAll();
    if (v) {
      viewRef.current = v;
      animRef.current = null;
      focusKeyRef.current = null;
      setFocus(null);
      markDirty();
    }
  }, [universe, fitAll]);

  // ---- 描画ループ・大きさ ----
  useEffect(() => {
    if (!open) return;
    let raf = 0;
    let ro: ResizeObserver | null = null;
    let cancelled = false;
    const reduced = prefersReducedMotion();
    const t0 = performance.now();

    const setup = () => {
      const wrap = wrapRef.current;
      const canvas = canvasRef.current;
      if (!wrap || !canvas) {
        // ダイアログの中身はマウント直後に描かれるので、まだなら次のフレームで再挑戦
        raf = requestAnimationFrame(setup);
        return;
      }
      const resize = () => {
        const w = wrap.clientWidth;
        const h = wrap.clientHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (!w || !h) return;
        const first = sizeRef.current.w === 0;
        sizeRef.current = { w, h, dpr };
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        if (first) {
          const v = fitAll();
          if (v) viewRef.current = v;
        }
        markDirty();
      };
      resize();
      ro = new ResizeObserver(resize);
      ro.observe(wrap);

      const loop = (now: number) => {
        if (cancelled) return;
        const anim = animRef.current;
        if (anim) {
          const k = Math.min(1, (now - anim.start) / anim.dur);
          const e = 1 - Math.pow(1 - k, 3);
          viewRef.current = {
            cx: anim.from.cx + (anim.to.cx - anim.from.cx) * e,
            cy: anim.from.cy + (anim.to.cy - anim.from.cy) * e,
            scale: anim.from.scale * Math.pow(anim.to.scale / anim.from.scale, e),
          };
          if (k >= 1) animRef.current = null;
          dirtyRef.current = true;
        }
        if (!reduced || dirtyRef.current) {
          dirtyRef.current = false;
          const ctx = canvas.getContext("2d");
          const { w, h, dpr } = sizeRef.current;
          if (ctx && w) {
            tRef.current = reduced ? 0 : (now - t0) / 1000;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            drawUniverse(ctx, {
              universe: universeRef.current,
              view: viewRef.current,
              width: w,
              height: h,
              t: tRef.current,
              getImage,
              wantImage,
              labels: true,
              background: true,
              focusKey: focusKeyRef.current,
              fontFamily: FONT,
            });
          }
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(setup);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      sizeRef.current = { w: 0, h: 0, dpr: 1 };
    };
  }, [open, fitAll, getImage, wantImage]);

  // ---- 操作 ----
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ moved: 0, startedAt: 0, pinchDist: 0 });

  const clampView = (v: View) => {
    const fit = fitRef.current;
    v.scale = Math.min(maxScaleFor(), Math.max(fit.scale * 0.5, v.scale));
    // 宇宙の外へ飛んでいきすぎないよう、中心を範囲内に留める
    const b = universeRef.current.bounds;
    v.cx = Math.min(b.maxX, Math.max(b.minX, v.cx));
    v.cy = Math.min(b.maxY, Math.max(b.minY, v.cy));
    return v;
  };

  const zoomAt = (px: number, py: number, factor: number) => {
    const { w, h } = sizeRef.current;
    const v = viewRef.current;
    const wx = (px - w / 2) / v.scale + v.cx;
    const wy = (py - h / 2) / v.scale + v.cy;
    const scale = v.scale * factor;
    viewRef.current = clampView({ scale, cx: wx - (px - w / 2) / scale, cy: wy - (py - h / 2) / scale });
    animRef.current = null;
    markDirty();
  };

  const localPoint = (e: React.PointerEvent | React.WheelEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, localPoint(e));
    if (pointers.current.size === 1) {
      gesture.current = { moved: 0, startedAt: performance.now(), pinchDist: 0 };
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      gesture.current.moved = 99;
    }
    animRef.current = null;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = localPoint(e);
    pointers.current.set(e.pointerId, cur);
    if (pointers.current.size === 1) {
      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      gesture.current.moved += Math.abs(dx) + Math.abs(dy);
      const v = viewRef.current;
      viewRef.current = clampView({ scale: v.scale, cx: v.cx - dx / v.scale, cy: v.cy - dy / v.scale });
      markDirty();
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (gesture.current.pinchDist > 0 && dist > 0) {
        zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, dist / gesture.current.pinchDist);
      }
      gesture.current.pinchDist = dist;
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const wasSingle = pointers.current.size === 1;
    const p = pointers.current.get(e.pointerId);
    pointers.current.delete(e.pointerId);
    if (!wasSingle || !p) return;
    const g = gesture.current;
    const isTap = g.moved < 8 && performance.now() - g.startedAt < 600;
    if (!isTap) return;

    const { w, h } = sizeRef.current;
    // 銀河は回っているので、いま描いている時刻と同じ t で当たりを取る
    const { star, galaxy } = hitTest(universeRef.current, viewRef.current, w, h, tRef.current, p.x, p.y);

    const focusedKey = focusKeyRef.current;
    if (star && (focusedKey === star.galaxy.key || star.star.r * viewRef.current.scale >= 7)) {
      setPicked({ id: star.star.id, title: star.star.title, image: star.star.image });
    } else if (galaxy && focusedKey !== galaxy.key) {
      focusGalaxy(galaxy);
    } else if (!galaxy && focusedKey) {
      resetView();
    }
  };

  // wheel は passive だと preventDefault できないので、直接つける
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isLoading, universe]);

  const openShare = () => {
    setShareSpec({
      variant: "universe",
      headline: t("universe.headline", { name: ownerName }),
      ownerName,
      images: [],
      universe,
      universeLabels: { goods: t("universe.goods"), galaxies: t("universe.galaxies"), biggest: t("universe.biggest") },
      shareText: t("universe.shareText", { n: universe.totalItems, m: universe.galaxies.length }),
    });
    setShareOpen(true);
  };

  const hasItems = universe.totalItems > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="fixed inset-0 left-0 top-0 grid h-[100dvh] max-h-none w-screen max-w-none translate-x-0 translate-y-0 grid-rows-[auto_1fr] gap-0 overflow-hidden rounded-none border-0 bg-[#06051a] p-0 text-white sm:rounded-none [&>button:last-child]:hidden data-[state=open]:slide-in-from-left-0 data-[state=open]:slide-in-from-top-0 data-[state=closed]:slide-out-to-left-0 data-[state=closed]:slide-out-to-top-0 data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100"
          // 描画の邪魔にならないよう、開いたときに勝手にフォーカスを奪わない
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <header className="z-10 flex items-center gap-3 px-4 pb-2 pt-[calc(0.75rem+env(safe-area-inset-top))]">
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-base font-bold text-white">{t("universe.title")}</DialogTitle>
              <DialogDescription className="truncate text-xs text-white/65">
                {isLoading
                  ? "\u00a0"
                  : hasItems
                    ? `${universe.totalItems} ${t("universe.goods")} ・ ${universe.galaxies.length} ${t("universe.galaxies")}`
                    : t("universe.empty")}
              </DialogDescription>
            </div>
            {hasItems && (
              <Button
                size="sm"
                onClick={openShare}
                className="shrink-0 gap-1.5 rounded-full bg-white/15 text-white shadow-none backdrop-blur hover:bg-white/25"
              >
                <Share2 className="h-4 w-4" />
                {t("universe.share")}
              </Button>
            )}
            {/* 標準の×は画面の上端から16pxに固定で、ノッチ・ステータスバーの下に隠れて押せなくなる。
                安全領域の内側に置いた専用の閉じるボタンを使う */}
            <DialogClose
              aria-label={t("universe.close")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <X className="h-5 w-5" />
            </DialogClose>
          </header>

          <div ref={wrapRef} className="relative min-h-0 overflow-hidden">
            {isLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 text-sm text-white/70">
                <Loader2 className="h-5 w-5 animate-spin" />
                {t("universe.loading")}
              </div>
            )}
            {isError && (
              <p className="absolute inset-0 z-10 flex items-center justify-center p-8 text-center text-sm text-white/70">
                {t("universe.failed")}
              </p>
            )}
            {!isLoading && !isError && !hasItems && (
              <p className="absolute inset-0 z-10 flex items-center justify-center p-8 text-center text-sm text-white/70">
                {t("universe.empty")}
              </p>
            )}
            <canvas
              ref={canvasRef}
              role="img"
              aria-label={t("universe.canvasLabel", { galaxies: universe.galaxies.length, n: universe.totalItems })}
              className="absolute inset-0 h-full w-full touch-none select-none"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
            />

            {hasItems && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                {focus ? (
                  <div className="pointer-events-auto flex max-w-full items-center gap-3 rounded-full bg-black/55 py-2 pl-4 pr-2 backdrop-blur">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{focus.label}</p>
                      <p className="text-2xs text-white/65">{t("universe.focusCount", { n: focus.count })}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={resetView}
                      className="shrink-0 rounded-full bg-white/20 text-white shadow-none hover:bg-white/30"
                    >
                      {t("universe.back")}
                    </Button>
                  </div>
                ) : null}
                <p className="rounded-full bg-black/40 px-3 py-1 text-2xs text-white/70 backdrop-blur">
                  {focus ? t("universe.hintFocused") : t("universe.hint")}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {picked && (
        <UserItemDetailsModal
          isOpen
          onClose={() => setPicked(null)}
          itemId={picked.id}
          title={picked.title}
          image={picked.image}
        />
      )}
      <ShareCardDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        spec={shareSpec}
        fileName="collectify-universe.png"
      />
    </>
  );
}
