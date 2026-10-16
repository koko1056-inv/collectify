import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUp, Copy, Download, ImageIcon, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTradePostSource, type TradePostGoods } from "@/hooks/trade/useTradePostSource";
import { buildAppUrl, buildShareUrl } from "@/utils/shareLinks";
import { fallbackToOriginal, getOptimizedImageUrl } from "@/utils/optimized-image";
import {
  buildTradePostText,
  paginateTradeCard,
  renderTradeCard,
  shortGoodsTitle,
  tradeHashtag,
  TRADE_CARD_FORMATS,
  xWeightedLength,
  X_MAX_IMAGES,
  X_TEXT_LIMIT,
  type TradeCardFormat,
} from "@/utils/tradeCard";
import { cn } from "@/lib/utils";

const FORMATS: TradeCardFormat[] = ["square", "story", "wide"];
/** 作品名が無いグッズの札 */
const NO_CONTENT = "__none__";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 交換に出しているグッズが無いとき、出すグッズを選ぶ画面を開く */
  onPickOffers?: () => void;
}

/**
 * X の交換投稿用の「譲・求」画像と投稿文を作る。
 *
 * 交換相手がアプリの中にまだ少ないので、推し活の交換の中心である X に乗る。
 *  - 作品で絞る（推しごとに作る人が多い）。初めは、グッズがいちばん多い作品
 *  - 載せるグッズを選び直す・並べ替える（上下のボタン）
 *  - 取引方法（郵送・手渡し）と条件の一言
 *  - 1:1 / 9:16 / 16:9。多いときは何枚かに分ける（X は1投稿4枚まで）
 *  - 画像は保存・共有（Web Share があれば画像と文をまとめて）。投稿文（【譲】…【求】… #〇〇交換）はコピーできる
 */
export function TradePostDialog({ open, onOpenChange, onPickOffers }: Props) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const src = useTradePostSource(open);

  const [format, setFormat] = useState<TradeCardFormat>("square");
  const [content, setContent] = useState<string | null | undefined>(undefined);
  const [order, setOrder] = useState<{ give: string[]; want: string[] }>({ give: [], want: [] });
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [methods, setMethods] = useState<{ mail: boolean; hand: boolean }>({ mail: true, hand: false });
  const [note, setNote] = useState("");

  // 読み込んだ順（新しい順）を並びの初期値にする。あとから増えたものは後ろへ
  useEffect(() => {
    setOrder((prev) => {
      const give = mergeOrder(prev.give, src.give.map((g) => g.id));
      const want = mergeOrder(prev.want, src.want.map((g) => g.id));
      return sameList(give, prev.give) && sameList(want, prev.want) ? prev : { give, want };
    });
  }, [src.give, src.want]);

  // 作品ごとの数（多い順）。初めはいちばん多い作品で絞る（作品が1つだけなら絞らない）
  const contentCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of [...src.give, ...src.want]) {
      const k = g.content_name?.trim() || NO_CONTENT;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [src.give, src.want]);
  const realContents = contentCounts.filter(([k]) => k !== NO_CONTENT);
  useEffect(() => {
    // 読み終わってから1回だけ決める（閉じている間は読み込まないので、そのときは決めない）
    if (!open || content !== undefined || src.isLoading || contentCounts.length === 0) return;
    setContent(realContents.length > 1 ? realContents[0][0] : null);
  }, [open, content, src.isLoading, contentCounts.length, realContents]);
  const active = content ?? null;

  const byId = useMemo(() => new Map([...src.give, ...src.want].map((g) => [g.id, g])), [src.give, src.want]);
  const inContent = (g: TradePostGoods) => !active || (g.content_name?.trim() || NO_CONTENT) === active;
  const listOf = (kind: "give" | "want") =>
    order[kind].map((id) => byId.get(id)).filter((g): g is TradePostGoods => !!g && inContent(g));
  const giveList = listOf("give");
  const wantList = listOf("want");
  const giveSel = giveList.filter((g) => !excluded.has(g.id));
  const wantSel = wantList.filter((g) => !excluded.has(g.id));

  const selContents = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of [...giveSel, ...wantSel]) if (g.content_name) m.set(g.content_name, (m.get(g.content_name) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  }, [giveSel, wantSel]);
  const headline = active && active !== NO_CONTENT ? active : selContents.slice(0, 2).join("・") || t("discover.tradePost.headlineFallback");
  const hashtags = (active && active !== NO_CONTENT ? [active] : selContents.slice(0, 3)).map(tradeHashtag).filter(Boolean);
  const methodNames = [methods.mail && t("discover.tradePost.methodMail"), methods.hand && t("discover.tradePost.methodHand")].filter(Boolean) as string[];
  const methodLine = methodNames.length ? `${t("discover.tradePost.methodLabel")}：${methodNames.join("・")}` : "";
  const noteLine = note.trim() ? `${t("discover.tradePost.noteLabel")}：${note.trim()}` : "";

  const short = (g: TradePostGoods) => shortGoodsTitle(g.title, g.content_name);
  const pages = paginateTradeCard(
    giveSel.map((g) => ({ title: short(g), image: g.image, quantity: g.quantity })),
    wantSel.map((g) => ({ title: short(g), image: g.image })),
    format
  );

  // 投稿文。条件やグッズを変えたら作り直す（手で直した文は、そのあと何かを変えるまで残る）
  const shareUrl = user ? buildShareUrl({ type: "user", id: user.id }) : "";
  const generatedText = buildTradePostText({
    give: giveSel.map((g) => ({ title: short(g), quantity: g.quantity })),
    want: wantSel.map((g) => ({ title: short(g) })),
    hashtags,
    methodLine,
    noteLine,
    url: shareUrl,
    labels: {
      give: t("discover.tradePost.give"),
      want: t("discover.tradePost.want"),
      more: (n) => t("discover.tradePost.more", { n }),
      none: t("discover.tradePost.noneLine"),
    },
  });
  const [text, setText] = useState("");
  useEffect(() => setText(generatedText), [generatedText]);

  // 画像を描く。入力が続けて変わる間は待つ（1枚ずつ写真を取りに行くので重い）
  const renderKey = JSON.stringify({ format, pages, headline, methodLine, noteLine });
  const [images, setImages] = useState<{ url: string; blob: Blob }[]>([]);
  const [rendering, setRendering] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    if (!open || !user) return;
    const mine = ++generation.current;
    if (pages.length === 0) {
      setImages((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.url));
        return [];
      });
      return;
    }
    setRendering(true);
    const timer = window.setTimeout(async () => {
      try {
        const qrUrl = buildAppUrl({ type: "user", id: user.id });
        const blobs: Blob[] = [];
        for (let i = 0; i < pages.length; i++) {
          blobs.push(
            await renderTradeCard({
              ...pages[i],
              format,
              headline,
              headlineTag: t("discover.tradePost.headlineTag"),
              methodLine,
              noteLine,
              labels: { give: t("discover.tradePost.giveLabel"), want: t("discover.tradePost.wantLabel"), footer: t("discover.tradePost.footer") },
              page: i + 1,
              pages: pages.length,
              qrUrl,
              footerUrl: new URL(qrUrl).host,
            })
          );
          if (generation.current !== mine) return;
        }
        setImages((prev) => {
          prev.forEach((p) => URL.revokeObjectURL(p.url));
          return blobs.map((blob) => ({ blob, url: URL.createObjectURL(blob) }));
        });
      } catch (e) {
        console.error("trade card render failed", e);
        if (generation.current === mine) toast.error(t("discover.tradePost.renderFailed"));
      } finally {
        if (generation.current === mine) setRendering(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
    // 描く中身は renderKey にまとめてある
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, renderKey, user?.id]);

  // 閉じたら画像を手放す
  useEffect(() => {
    if (open) return;
    setImages((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
  }, [open]);

  const move = (kind: "give" | "want", id: string, dir: -1 | 1) => {
    // 見えている（作品で絞った）並びの中で、隣と入れ替える
    const visible = (kind === "give" ? giveList : wantList).map((g) => g.id);
    const i = visible.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= visible.length) return;
    const other = visible[j];
    setOrder((prev) => {
      const list = [...prev[kind]];
      const a = list.indexOf(id);
      const b = list.indexOf(other);
      [list[a], list[b]] = [list[b], list[a]];
      return { ...prev, [kind]: list };
    });
  };
  const toggle = (id: string) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const setAll = (list: TradePostGoods[], on: boolean) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      for (const g of list) {
        if (on) next.delete(g.id);
        else next.add(g.id);
      }
      return next;
    });

  const fileName = (i: number) => `collectify-trade-${format}-${i + 1}.png`;
  const download = () => {
    images.forEach((im, i) => {
      const a = document.createElement("a");
      a.href = im.url;
      a.download = fileName(i);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
    toast.success(t("discover.tradePost.saved", { n: images.length }));
  };
  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("discover.tradePost.copied"));
    } catch {
      toast.error(t("engage.share.copyFailed"));
    }
  };
  const share = async () => {
    // X は1投稿に4枚まで。共有シートには先頭の4枚を渡す
    const files = images.slice(0, X_MAX_IMAGES).map((im, i) => new File([im.blob], fileName(i), { type: "image/png" }));
    if (files.length && navigator.share && navigator.canShare?.({ files })) {
      try {
        await navigator.share({ files, text });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    // 共有シートが使えない環境（PCなど）: 画像を保存し、文を入れた X の投稿画面を開く。画像は保存したものを添えてもらう
    download();
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    toast.info(t("discover.tradePost.attachHint"));
  };

  const weighted = xWeightedLength(text);
  const nothing = !src.isLoading && src.give.length === 0 && src.want.length === 0;
  const dims = TRADE_CARD_FORMATS[format];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto lg:max-w-4xl" data-testid="trade-post-dialog">
        <DialogHeader>
          <DialogTitle>{t("discover.tradePost.title")}</DialogTitle>
          <DialogDescription>{t("discover.tradePost.desc")}</DialogDescription>
        </DialogHeader>

        {src.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : src.isError ? (
          <QueryErrorState title={t("discover.tradePost.loadFailed")} onRetry={src.refetch} />
        ) : nothing ? (
          <EmptyState
            icon={ImageIcon}
            className="py-6"
            title={t("discover.tradePost.emptyTitle")}
            description={t("discover.tradePost.emptyDesc")}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {onPickOffers && <Button onClick={onPickOffers}>{t("discover.tradePost.pickOffers")}</Button>}
                <Button variant="outline" onClick={() => navigate("/releases")}>{t("discover.tradePost.findWants")}</Button>
              </div>
            }
          />
        ) : (
          <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {/* 左: 載せるものと条件 */}
            <div className="min-w-0 space-y-4">
              {contentCounts.length > 1 && (
                <div className="min-w-0">
                  <p className="mb-1.5 text-2xs font-bold text-muted-foreground">{t("discover.tradePost.contentLabel")}</p>
                  <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-hide">
                    <Pill active={!active} onClick={() => setContent(null)}>
                      {t("discover.tradePost.allContents")}
                    </Pill>
                    {contentCounts.map(([k, n]) => (
                      <Pill key={k} active={active === k} onClick={() => setContent(k)}>
                        {k === NO_CONTENT ? t("discover.tradePost.noContent") : k}
                        <span className="ml-1 tabular-nums opacity-70">{n}</span>
                      </Pill>
                    ))}
                  </div>
                </div>
              )}

              <GoodsPicker
                kind="give"
                items={giveList}
                excluded={excluded}
                onToggle={toggle}
                onAll={(on) => setAll(giveList, on)}
                onMove={(id, d) => move("give", id, d)}
                empty={
                  <div className="rounded-lg bg-muted/50 p-3 text-xs">
                    <p>{t("discover.tradePost.noGive")}</p>
                    {onPickOffers && (
                      <Button size="sm" variant="outline" className="mt-2 h-8 bg-background" onClick={onPickOffers}>
                        {t("discover.tradePost.pickOffers")}
                      </Button>
                    )}
                  </div>
                }
              />
              <GoodsPicker
                kind="want"
                items={wantList}
                excluded={excluded}
                onToggle={toggle}
                onAll={(on) => setAll(wantList, on)}
                onMove={(id, d) => move("want", id, d)}
                empty={
                  <div className="rounded-lg bg-muted/50 p-3 text-xs">
                    <p>{t("discover.tradePost.noWant")}</p>
                    <Button size="sm" variant="outline" className="mt-2 h-8 bg-background" onClick={() => navigate("/releases")}>
                      {t("discover.tradePost.findWants")}
                    </Button>
                  </div>
                }
              />

              <div className="space-y-2">
                <p className="text-2xs font-bold text-muted-foreground">{t("discover.tradePost.methodLabel")}</p>
                <div className="flex gap-1.5">
                  <Pill active={methods.mail} onClick={() => setMethods((m) => ({ ...m, mail: !m.mail }))}>
                    {t("discover.tradePost.methodMail")}
                  </Pill>
                  <Pill active={methods.hand} onClick={() => setMethods((m) => ({ ...m, hand: !m.hand }))}>
                    {t("discover.tradePost.methodHand")}
                  </Pill>
                </div>
                <label className="block text-2xs font-bold text-muted-foreground" htmlFor="trade-post-note">
                  {t("discover.tradePost.noteLabel")}
                </label>
                <Input
                  id="trade-post-note"
                  value={note}
                  maxLength={40}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t("discover.tradePost.notePlaceholder")}
                />
              </div>
            </div>

            {/* 右: 出来上がり（画像と投稿文） */}
            <div className="min-w-0 space-y-3">
              <div role="tablist" aria-label={t("discover.tradePost.formatLabel")} className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
                {FORMATS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="tab"
                    aria-selected={format === f}
                    onClick={() => setFormat(f)}
                    className={cn(
                      "rounded-md px-1 py-1.5 text-2xs font-medium leading-tight transition-colors",
                      format === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t(`discover.tradePost.format.${f}`)}
                  </button>
                ))}
              </div>

              {pages.length === 0 ? (
                <p className="rounded-lg bg-muted/50 p-4 text-center text-xs text-muted-foreground">{t("discover.tradePost.nothingSelected")}</p>
              ) : (
                <>
                  <div className={cn("grid gap-2", pages.length > 1 && "grid-cols-2")} data-testid="trade-post-previews">
                    {pages.map((_, i) => (
                      <figure key={i} className="min-w-0">
                        <div
                          style={{ aspectRatio: `${dims.width} / ${dims.height}` }}
                          className={cn(
                            "relative mx-auto w-full overflow-hidden rounded-lg border border-border bg-muted",
                            format === "story" && pages.length === 1 && "max-w-[60%]"
                          )}
                        >
                          {images[i] && <img src={images[i].url} alt={t("discover.tradePost.previewAlt", { n: i + 1 })} className="h-full w-full object-contain" />}
                          {(rendering || !images[i]) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/40">
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        {pages.length > 1 && <figcaption className="mt-0.5 text-center text-3xs text-muted-foreground tabular-nums">{i + 1}/{pages.length}</figcaption>}
                      </figure>
                    ))}
                  </div>
                  {pages.length > X_MAX_IMAGES && (
                    <p className="rounded-lg bg-warning-soft px-3 py-2 text-2xs text-foreground" role="note">
                      {t("discover.tradePost.overLimit", { n: pages.length, max: X_MAX_IMAGES })}
                    </p>
                  )}
                </>
              )}

              <div>
                <div className="mb-1 flex items-baseline justify-between">
                  <label htmlFor="trade-post-text" className="text-2xs font-bold text-muted-foreground">
                    {t("discover.tradePost.textLabel")}
                  </label>
                  <span className={cn("text-3xs tabular-nums", weighted > X_TEXT_LIMIT ? "text-destructive" : "text-muted-foreground")}>
                    {t("discover.tradePost.textCount", { n: weighted, max: X_TEXT_LIMIT })}
                  </span>
                </div>
                <Textarea id="trade-post-text" value={text} onChange={(e) => setText(e.target.value)} rows={6} className="text-xs" />
              </div>

              <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                <Button onClick={share} disabled={!images.length || rendering} className="gap-1.5" data-testid="trade-post-share">
                  <Share2 className="h-4 w-4" />
                  {t("discover.tradePost.share")}
                </Button>
                <Button variant="outline" onClick={download} disabled={!images.length || rendering} className="gap-1.5" aria-label={t("discover.tradePost.save")}>
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("discover.tradePost.save")}</span>
                </Button>
                <Button variant="outline" onClick={copyText} className="gap-1.5" aria-label={t("discover.tradePost.copy")}>
                  <Copy className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("discover.tradePost.copy")}</span>
                </Button>
              </div>
              <p className="text-center text-2xs text-muted-foreground">{t("discover.tradePost.qrNote")}</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function sameList(a: string[], b: string[]) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function mergeOrder(prev: string[], ids: string[]): string[] {
  const set = new Set(ids);
  const kept = prev.filter((id) => set.has(id));
  const known = new Set(kept);
  return [...kept, ...ids.filter((id) => !known.has(id))];
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40"
      )}
    >
      {children}
    </button>
  );
}

/** 「譲」「求」それぞれの、載せるものの選び直しと並べ替え */
function GoodsPicker({
  kind,
  items,
  excluded,
  onToggle,
  onAll,
  onMove,
  empty,
}: {
  kind: "give" | "want";
  items: TradePostGoods[];
  excluded: Set<string>;
  onToggle: (id: string) => void;
  onAll: (on: boolean) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  empty: React.ReactNode;
}) {
  const { t } = useLanguage();
  const selected = items.filter((g) => !excluded.has(g.id)).length;
  return (
    <section className="space-y-1.5" aria-label={t(`discover.tradePost.${kind}Label`)} data-testid={`trade-post-${kind}`}>
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-black",
            kind === "give" ? "bg-primary text-primary-foreground" : "bg-info text-info-foreground"
          )}
        >
          {kind === "give" ? "譲" : "求"}
        </span>
        <h3 className="text-sm font-bold">{t(`discover.tradePost.${kind}Label`)}</h3>
        <span className="text-2xs text-muted-foreground tabular-nums">{t("discover.tradePost.selectedCount", { n: selected, total: items.length })}</span>
        {items.length > 1 && (
          <button type="button" onClick={() => onAll(selected < items.length)} className="ml-auto text-2xs font-medium text-primary hover:underline">
            {selected < items.length ? t("discover.tradePost.selectAll") : t("discover.tradePost.selectNone")}
          </button>
        )}
      </div>
      {items.length === 0 ? (
        empty
      ) : (
        <ul className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
          {items.map((g, i) => {
            const on = !excluded.has(g.id);
            return (
              <li key={g.id} className={cn("flex items-center gap-2 rounded-md px-1.5 py-1", !on && "opacity-50")}>
                <Checkbox checked={on} onCheckedChange={() => onToggle(g.id)} aria-label={g.title} />
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-border bg-muted/30">
                  {g.image && (
                    <img src={getOptimizedImageUrl(g.image, { width: 96 })} onError={fallbackToOriginal(g.image)} alt="" loading="lazy" className="h-full w-full object-contain" />
                  )}
                </div>
                <span className="min-w-0 flex-1 truncate text-xs">{shortGoodsTitle(g.title, g.content_name)}</span>
                {kind === "give" && g.quantity >= 2 && <span className="shrink-0 text-2xs font-bold tabular-nums text-muted-foreground">×{g.quantity}</span>}
                <div className="flex shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={i === 0}
                    onClick={() => onMove(g.id, -1)}
                    aria-label={t("discover.tradePost.moveUp", { title: g.title })}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={i === items.length - 1}
                    onClick={() => onMove(g.id, 1)}
                    aria-label={t("discover.tradePost.moveDown", { title: g.title })}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
