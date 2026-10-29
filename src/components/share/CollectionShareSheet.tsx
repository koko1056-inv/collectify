import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BarChart3, Check, Download, Loader2, PenSquare, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pocke } from "@/components/pocke/Pocke";
import { CreateItemPostModal } from "@/components/item-posts/CreateItemPostModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { SITE_URL } from "@/config/site";
import { acquiredDate } from "@/utils/memories";
import { fallbackToOriginal, getOptimizedImageUrl } from "@/utils/optimized-image";
import {
  COLLECTION_SHARE_FORMATS,
  COLLECTION_SHARE_MAX_GOODS,
  COLLECTION_SHARE_TEMPLATES,
  SHARE_THEMES,
  SHARE_THEME_IDS,
  renderCollectionShareImage,
  type CollectionShareFormat,
  type CollectionShareTemplate,
  type ShareTheme,
  type ShareThemeId,
} from "@/utils/collectionShareImage";

/** シェア画像に使うグッズ（user_items の行。UserCollection の一覧の行をそのまま渡せる形） */
export interface ShareSourceItem {
  id: string;
  title: string;
  image: string | null;
  created_at: string;
  purchase_date?: string | null;
  content_name?: string | null;
  official_items?: { content_name?: string | null } | null;
}

interface CollectionShareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ShareSourceItem[];
  /** @username（無ければ表示名） */
  handle: string;
  /** X に添えるリンク（コレクションのページ） */
  profileUrl: string;
  /** 「数字のカードでシェア」（今までの共有カード）を開く */
  onOpenStatusCard?: () => void;
}

/** おまかせで並べる数 */
const AUTO_COUNT = 9;
const THEME_KEY = "collectify-share-image-theme";

const workOf = (i: ShareSourceItem) => (i.content_name || i.official_items?.content_name || "").trim();
const hasImage = (i: ShareSourceItem) => !!i.image && /^https?:\/\//.test(i.image);

/** 同じ写真のグッズを重ねて並べない（重複登録・同じカタログの写真） */
function uniqueByImage(list: ShareSourceItem[]) {
  const seen = new Set<string>();
  return list.filter((i) => {
    const k = i.image ?? i.id;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function readTheme(): ShareThemeId {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v && v in SHARE_THEMES ? (v as ShareThemeId) : "sakura";
  } catch {
    return "sakura";
  }
}

/**
 * コレクションの「シェア画像をつくる」。テンプレート（推しの棚 / 今月のお迎え / 作品別）・サイズ・色・並べるグッズを選び、
 * その場で描いた画像を見ながら、保存・X・Collectify への投稿ができる。
 * 描くのは端末の中（canvas）。選び直すたびに少し待ってから描き直し、描いている間は前の画像を薄く残す。
 */
export function CollectionShareSheet({ open, onOpenChange, items, handle, profileUrl, onOpenStatusCard }: CollectionShareSheetProps) {
  const { t, language } = useLanguage();
  const reduceMotion = !!useReducedMotion();
  const [template, setTemplate] = useState<CollectionShareTemplate>("shelf");
  const [format, setFormat] = useState<CollectionShareFormat>("portrait");
  const [theme, setThemeState] = useState<ShareThemeId>(readTheme);
  const setTheme = (v: ShareThemeId) => {
    setThemeState(v);
    try {
      localStorage.setItem(THEME_KEY, v);
    } catch {
      // 覚えられなくても、この画面では選んだ色で描ける
    }
  };
  const [headlineEdit, setHeadlineEdit] = useState<string | null>(null);
  const [work, setWork] = useState<string | null>(null);
  /** テンプレートごとの手で選んだグッズ（null = おまかせ） */
  const [picked, setPicked] = useState<Record<CollectionShareTemplate, string[] | null>>({ shelf: null, monthly: null, work: null });
  const [picking, setPicking] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [composer, setComposer] = useState<{ file: File; target: { id: string; title: string; image: string | null } | null; caption: string } | null>(null);
  const generation = useRef(0);

  // 作品（数の多い順）
  const works = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of items) {
      const w = workOf(i);
      if (w) m.set(w, (m.get(w) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  }, [items]);
  const activeWork = work && works.some((w) => w.name === work) ? work : works[0]?.name ?? null;

  // 今月のお迎え（購入日 → 登録日）
  const now = useMemo(() => new Date(), []);
  const thisMonth = useMemo(
    () =>
      items
        .filter((i) => {
          const d = acquiredDate(i);
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        })
        .sort((a, b) => acquiredDate(b).getTime() - acquiredDate(a).getTime()),
    [items, now]
  );
  const monthlyFallback = template === "monthly" && thisMonth.length === 0;

  // テンプレートで使えるグッズ（並べる候補）
  const candidates = useMemo(() => {
    if (template === "monthly") return uniqueByImage((monthlyFallback ? items : thisMonth).filter(hasImage));
    if (template === "work") return uniqueByImage(items.filter((i) => workOf(i) === activeWork && hasImage(i)));
    return uniqueByImage(items.filter(hasImage));
  }, [template, items, thisMonth, monthlyFallback, activeWork]);

  const manual = picked[template];
  const chosen = useMemo(() => {
    if (manual) {
      const byId = new Map(candidates.map((c) => [c.id, c]));
      return manual.map((id) => byId.get(id)).filter(Boolean) as ShareSourceItem[];
    }
    return candidates.slice(0, AUTO_COUNT);
  }, [manual, candidates]);

  // 見出し: 推しの棚は並べたグッズでいちばん多い作品、作品別はその作品
  const autoHeadline = useMemo(() => {
    if (template === "work") return activeWork ?? "";
    const m = new Map<string, number>();
    for (const i of chosen) {
      const w = workOf(i);
      if (w) m.set(w, (m.get(w) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? t("collectionShare.img.shelfFallback");
  }, [template, chosen, activeWork, t]);
  const headline = template === "shelf" && headlineEdit !== null ? headlineEdit : autoHeadline;

  const count =
    template === "monthly"
      ? monthlyFallback
        ? chosen.length
        : thisMonth.length
      : template === "work"
        ? works.find((w) => w.name === activeWork)?.count ?? 0
        : items.length;
  const more = Math.max(0, (template === "shelf" ? items.length : count) - chosen.length);

  // 描く（選び直しが続いても最後の1回だけ描くよう、少し待つ）
  useEffect(() => {
    if (!open || picking) return;
    if (chosen.length === 0) {
      setRendering(false);
      return;
    }
    const mine = ++generation.current;
    setRendering(true);
    setFailed(false);
    const timer = window.setTimeout(async () => {
      try {
        const monthLabel =
          language === "en"
            ? now.toLocaleString("en-US", { month: "short" }).toUpperCase()
            : t("collectionShare.img.month", { m: now.getMonth() + 1 });
        const out = await renderCollectionShareImage({
          template,
          format,
          theme,
          headline,
          count,
          goods: chosen.map((i) => ({
            title: i.title,
            image: i.image,
            caption: template === "monthly" ? `${acquiredDate(i).getMonth() + 1}/${acquiredDate(i).getDate()}` : undefined,
          })),
          handle,
          siteLabel: SITE_URL.replace(/^https?:\/\//, ""),
          labels: {
            kicker: t(`collectionShare.img.kicker.${template}`),
            unit: t("collectionShare.img.unit"),
            countCaption:
              template === "shelf"
                ? t("collectionShare.img.shelfCaption", { total: items.length })
                : template === "monthly"
                  ? t("collectionShare.img.monthlyCaption")
                  : t("collectionShare.img.workCaption"),
            tagline: t("collectionShare.img.tagline"),
            // 推しの棚は「◯点のコレクションから」で数が分かるので、「ほか◯点」は出さない
            more: more > 0 && template !== "shelf" ? t("collectionShare.img.more", { n: more }) : undefined,
            calendarYear: String(now.getFullYear()),
            calendarMonth: monthLabel,
          },
        });
        if (generation.current !== mine) return;
        setBlob(out);
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(out);
        });
      } catch {
        if (generation.current === mine) setFailed(true);
      } finally {
        if (generation.current === mine) setRendering(false);
      }
    }, 220);
    return () => window.clearTimeout(timer);
    // chosen は id の並びで比べる（同じ選び方なら描き直さない）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, picking, template, format, theme, headline, count, more, chosen.map((c) => c.id).join(","), retryKey, language]);

  useEffect(
    () => () => {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    },
    []
  );

  const fileName = `collectify-${template}-${format}.png`;
  const shareText =
    template === "monthly"
      ? t("collectionShare.shareText.monthly", { n: count })
      : template === "work"
        ? t("collectionShare.shareText.work", { work: activeWork ?? "", n: count })
        : t("collectionShare.shareText.shelf");
  const canShareFiles = (file: File) => typeof navigator !== "undefined" && !!navigator.canShare?.({ files: [file] });
  const coarse = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;

  const download = () => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast.success(t("collectionShare.saved"));
  };

  const save = async () => {
    if (!blob) return;
    const file = new File([blob], fileName, { type: "image/png" });
    // スマホは共有シートから「画像を保存」できる（ダウンロードだとファイルアプリに入ってしまう）
    if (coarse && canShareFiles(file)) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    download();
  };

  const shareX = async () => {
    if (!blob) return;
    const file = new File([blob], fileName, { type: "image/png" });
    // 画像つきで共有できる端末（スマホ）は、共有シートから X を選べば画像ごと貼れる
    if (coarse && canShareFiles(file)) {
      try {
        await navigator.share({ files: [file], text: `${shareText}\n${profileUrl}` });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(profileUrl)}`,
      "_blank",
      "noopener"
    );
    toast.info(t("collectionShare.xHint"));
  };

  const postToCollectify = () => {
    if (!blob) return;
    const first = chosen[0];
    const caption = t(`collectionShare.postCaption.${template}`, { work: (activeWork ?? "").replace(/\s/g, "") });
    setComposer({
      file: new File([blob], fileName, { type: "image/png" }),
      target: first ? { id: first.id, title: first.title, image: first.image } : null,
      caption,
    });
    onOpenChange(false);
  };

  const togglePick = (id: string) => {
    const base = manual ?? chosen.map((c) => c.id);
    if (base.includes(id)) {
      setPicked((p) => ({ ...p, [template]: base.filter((x) => x !== id) }));
      return;
    }
    if (base.length >= COLLECTION_SHARE_MAX_GOODS) {
      toast.info(t("collectionShare.goodsMax", { max: COLLECTION_SHARE_MAX_GOODS }));
      return;
    }
    setPicked((p) => ({ ...p, [template]: [...base, id] }));
  };

  const dims = COLLECTION_SHARE_FORMATS[format];
  const T = SHARE_THEMES[theme];
  const empty = chosen.length === 0 && !picking;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col gap-0 overflow-hidden rounded-none p-0",
            "sm:h-[92vh] sm:max-h-[92vh] sm:max-w-2xl sm:rounded-2xl lg:max-w-5xl"
          )}
          data-testid="collection-share-sheet"
        >
          <DialogHeader className="shrink-0 border-b px-4 pb-3 pt-4 text-left sm:px-6">
            <DialogTitle className="flex items-center gap-1.5 text-base">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              {t("collectionShare.title")}
            </DialogTitle>
            <DialogDescription className="text-xs">{t("collectionShare.desc")}</DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:overflow-hidden">
            {/* プレビュー */}
            <div className="flex items-center justify-center bg-muted/40 px-4 py-4 lg:h-full lg:py-6">
              <div
                className={cn(
                  "relative overflow-hidden rounded-xl bg-muted shadow-[0_12px_40px_-16px_rgba(0,0,0,0.35)] ring-1 ring-black/5",
                  format === "story" ? "h-[52dvh] lg:h-[74vh]" : "h-[46dvh] lg:h-[68vh]",
                  "max-w-full"
                )}
                style={{ aspectRatio: `${dims.width} / ${dims.height}` }}
              >
                <AnimatePresence initial={false}>
                  {previewUrl && !empty && (
                    <motion.img
                      key={previewUrl}
                      src={previewUrl}
                      alt={t("collectionShare.previewAlt")}
                      className="absolute inset-0 h-full w-full object-contain"
                      initial={reduceMotion ? false : { opacity: 0, scale: 0.985 }}
                      animate={{ opacity: rendering ? 0.55 : 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      data-testid="share-preview-img"
                    />
                  )}
                </AnimatePresence>
                {rendering && (
                  <div role="status" aria-live="polite" className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/30 backdrop-blur-[1px]">
                    {!previewUrl && <Pocke pose="think" height={64} motion="bob" />}
                    <span className="flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1 text-xs font-medium shadow-sm">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      {t("collectionShare.loading")}
                    </span>
                  </div>
                )}
                {empty && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
                    <Pocke pose="think" height={72} />
                    <p className="text-sm text-muted-foreground">{t("collectionShare.goodsNone")}</p>
                  </div>
                )}
                {failed && !rendering && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 p-6 text-center">
                    <p className="text-sm text-muted-foreground">{t("collectionShare.failed")}</p>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setRetryKey((k) => k + 1)}>
                      <RotateCcw className="h-3.5 w-3.5" />
                      {t("collectionShare.retry")}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* 設定 */}
            <div className="space-y-5 px-4 pb-6 pt-4 lg:h-full lg:overflow-y-auto lg:border-l lg:px-5">
              <section>
                <SectionLabel>{t("collectionShare.templateLabel")}</SectionLabel>
                <div role="radiogroup" aria-label={t("collectionShare.templateLabel")} className="grid grid-cols-3 gap-2">
                  {COLLECTION_SHARE_TEMPLATES.map((k) => (
                    <button
                      key={k}
                      type="button"
                      role="radio"
                      aria-checked={template === k}
                      onClick={() => {
                        setTemplate(k);
                        setPicking(false);
                      }}
                      data-testid={`share-template-${k}`}
                      className={cn(
                        "group rounded-xl border-2 p-1.5 text-left transition-all",
                        template === k ? "border-primary bg-primary/5" : "border-transparent bg-muted/50 hover:bg-muted"
                      )}
                    >
                      <TemplateThumb template={k} theme={T} />
                      <span className="mt-1.5 block truncate px-0.5 text-xs font-bold">{t(`collectionShare.template.${k}`)}</span>
                      <span className="block truncate px-0.5 text-3xs text-muted-foreground">{t(`collectionShare.templateHint.${k}`)}</span>
                    </button>
                  ))}
                </div>
              </section>

              {template === "shelf" && (
                <section>
                  <SectionLabel htmlFor="share-headline">{t("collectionShare.headlineLabel")}</SectionLabel>
                  <Input
                    id="share-headline"
                    value={headline}
                    maxLength={30}
                    placeholder={t("collectionShare.headlinePlaceholder")}
                    onChange={(e) => setHeadlineEdit(e.target.value)}
                    className="h-9"
                  />
                </section>
              )}

              {template === "work" && (
                <section>
                  <SectionLabel>{t("collectionShare.workLabel")}</SectionLabel>
                  {works.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t("collectionShare.workEmpty")}</p>
                  ) : (
                    <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0 [&::-webkit-scrollbar]:hidden">
                      {works.slice(0, 30).map((w) => (
                        <button
                          key={w.name}
                          type="button"
                          aria-pressed={activeWork === w.name}
                          onClick={() => {
                            setWork(w.name);
                            setPicked((p) => ({ ...p, work: null }));
                          }}
                          className={cn(
                            "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                            activeWork === w.name ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"
                          )}
                        >
                          {w.name}
                          <span className="ml-1 opacity-60">{w.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              )}

              <section>
                <div className="mb-1.5 flex items-center justify-between">
                  <SectionLabel className="mb-0">
                    {t("collectionShare.goodsLabel")}
                    <span className="ml-1.5 font-medium text-muted-foreground">
                      {t("collectionShare.goodsCount", { n: chosen.length, max: COLLECTION_SHARE_MAX_GOODS })}
                    </span>
                  </SectionLabel>
                  <div className="flex gap-1">
                    {manual && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          setPicked((p) => ({ ...p, [template]: null }));
                          setPicking(false);
                        }}
                      >
                        {t("collectionShare.goodsAuto")}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={picking ? "default" : "outline"}
                      className="h-7 rounded-full px-3 text-xs"
                      onClick={() => setPicking((v) => !v)}
                      disabled={candidates.length === 0}
                      data-testid="share-pick-goods"
                    >
                      {picking ? t("collectionShare.goodsDone") : t("collectionShare.goodsPick")}
                    </Button>
                  </div>
                </div>
                {monthlyFallback ? (
                  <p className="mb-2 text-2xs text-muted-foreground">{t("collectionShare.monthlyNoneHint")}</p>
                ) : (
                  !manual && candidates.length > 0 && <p className="mb-2 text-2xs text-muted-foreground">{t("collectionShare.goodsAutoHint")}</p>
                )}
                {picking ? (
                  <div className="grid max-h-72 grid-cols-4 gap-1.5 overflow-y-auto rounded-xl border p-1.5 sm:grid-cols-6 lg:grid-cols-4">
                    {candidates.map((c) => {
                      const idx = chosen.findIndex((x) => x.id === c.id);
                      const on = idx >= 0;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          aria-pressed={on}
                          aria-label={c.title}
                          onClick={() => togglePick(c.id)}
                          className={cn(
                            "relative aspect-square overflow-hidden rounded-lg border-2 bg-white transition-all",
                            on ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                          )}
                        >
                          <img
                            src={getOptimizedImageUrl(c.image!, { width: 160 })}
                            onError={fallbackToOriginal(c.image!)}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-contain"
                          />
                          {on && (
                            <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-3xs font-bold text-primary-foreground">
                              {idx + 1}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex gap-1 overflow-hidden">
                    {chosen.slice(0, 8).map((c) => (
                      <img
                        key={c.id}
                        src={getOptimizedImageUrl(c.image!, { width: 96 })}
                        onError={fallbackToOriginal(c.image!)}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-md border bg-white object-contain"
                      />
                    ))}
                    {chosen.length > 8 && (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-2xs font-bold text-muted-foreground">
                        +{chosen.length - 8}
                      </span>
                    )}
                  </div>
                )}
              </section>

              <section>
                <SectionLabel>{t("collectionShare.themeLabel")}</SectionLabel>
                <div role="radiogroup" aria-label={t("collectionShare.themeLabel")} className="flex flex-wrap gap-2.5">
                  {SHARE_THEME_IDS.map((id) => {
                    const th = SHARE_THEMES[id];
                    return (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={theme === id}
                        aria-label={t(`collectionShare.theme.${id}`)}
                        title={t(`collectionShare.theme.${id}`)}
                        onClick={() => setTheme(id)}
                        className={cn(
                          "relative h-9 w-9 rounded-full ring-offset-2 ring-offset-background transition-transform",
                          theme === id ? "scale-110 ring-2 ring-foreground" : "hover:scale-105"
                        )}
                        style={{ background: `linear-gradient(135deg, ${th.bgBottom} 0 50%, ${th.accent} 50% 100%)` }}
                      >
                        {theme === id && (
                          <Check className="absolute inset-0 m-auto h-4 w-4 drop-shadow" style={{ color: id === "night" ? "#fff" : th.ink }} aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <SectionLabel>{t("collectionShare.formatLabel")}</SectionLabel>
                <div role="radiogroup" aria-label={t("collectionShare.formatLabel")} className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                  {(Object.keys(COLLECTION_SHARE_FORMATS) as CollectionShareFormat[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      role="radio"
                      aria-checked={format === f}
                      onClick={() => setFormat(f)}
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors",
                        format === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span aria-hidden="true" className={cn("inline-block rounded-[3px] border-2 border-current", f === "portrait" ? "h-3.5 w-3" : "h-4 w-2.5")} />
                      {t(`collectionShare.format.${f}`)}
                    </button>
                  ))}
                </div>
              </section>

              {onOpenStatusCard && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenStatusCard();
                  }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("collectionShare.statusCard")}
                </button>
              )}
            </div>
          </div>

          {/* 操作（下に固定） */}
          <div className="shrink-0 border-t bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur sm:px-6">
            <div className="grid grid-cols-[1fr_auto_auto] gap-2 lg:ml-auto lg:max-w-xl">
              <Button onClick={save} disabled={!blob || rendering || empty} className="h-11 gap-1.5 rounded-full font-bold" data-testid="share-save">
                <Download className="h-4 w-4" />
                {t("collectionShare.save")}
              </Button>
              <Button variant="outline" onClick={shareX} disabled={!blob || rendering || empty} className="h-11 gap-1.5 rounded-full px-4">
                <XMark className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("collectionShare.shareX")}</span>
                <span className="sr-only sm:hidden">{t("collectionShare.shareX")}</span>
              </Button>
              <Button variant="outline" onClick={postToCollectify} disabled={!blob || rendering || empty} className="h-11 gap-1.5 rounded-full px-4">
                <PenSquare className="h-4 w-4" />
                <span className="hidden sm:inline">{t("collectionShare.postToCollectify")}</span>
                <span className="sr-only sm:hidden">{t("collectionShare.postToCollectify")}</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {composer && (
        <CreateItemPostModal
          open
          onOpenChange={(o) => !o && setComposer(null)}
          target={composer.target ? { type: "user_item", id: composer.target.id } : null}
          itemTitle={composer.target?.title ?? ""}
          itemImage={composer.target?.image ?? null}
          initialFiles={[composer.file]}
          initialText={composer.caption}
        />
      )}
    </>
  );
}

function SectionLabel({ children, className, htmlFor }: { children: React.ReactNode; className?: string; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-1.5 block text-xs font-bold text-foreground", className)}>
      {children}
    </label>
  );
}

/** テンプレートの見本（小さな絵）。選んでいる色で描く */
function TemplateThumb({ template, theme: T }: { template: CollectionShareTemplate; theme: ShareTheme }) {
  const bg = { background: `linear-gradient(160deg, ${T.bgTop}, ${T.bgBottom})` };
  const tile = "rounded-[3px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.12)]";
  return (
    <span aria-hidden="true" className="relative block aspect-[1/1] w-full overflow-hidden rounded-lg lg:aspect-[4/5]" style={bg}>
      {template === "shelf" && (
        <span className="absolute inset-x-[10%] bottom-[8%] top-[30%] flex flex-col justify-around rounded-md px-[6%]" style={{ background: T.card }}>
          {[0, 1, 2].map((r) => (
            <span key={r} className="relative flex items-end justify-around pb-[3px]">
              {[0, 1, 2].map((c) => (
                <span key={c} className={tile} style={{ width: "22%", height: 10 + ((r + c) % 2) * 3 }} />
              ))}
              <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-full" style={{ background: T.boardEdge }} />
            </span>
          ))}
        </span>
      )}
      {template === "monthly" && (
        <>
          <span className="absolute left-[10%] top-[14%] h-[20%] w-[26%] overflow-hidden rounded-[4px] bg-white">
            <span className="block h-[34%]" style={{ background: T.accent }} />
          </span>
          <span className="absolute left-[44%] top-[16%] h-[5%] w-[40%] rounded-full" style={{ background: T.accent, opacity: 0.85 }} />
          <span className="absolute left-[44%] top-[25%] h-[4%] w-[24%] rounded-full" style={{ background: T.muted, opacity: 0.4 }} />
          <span className="absolute inset-x-[10%] bottom-[10%] top-[44%] grid grid-cols-3 gap-[6%]">
            {[...Array(6)].map((_, i) => (
              <span key={i} className="rounded-[2px] bg-white p-[8%] pb-[22%] shadow-sm" style={{ transform: `rotate(${i % 2 ? 4 : -4}deg)` }}>
                <span className="block h-full w-full rounded-[1px]" style={{ background: T.accentSoft }} />
              </span>
            ))}
          </span>
        </>
      )}
      {template === "work" && (
        <>
          <span className="absolute inset-x-[7%] top-[13%] h-[20%] rounded-md" style={{ background: T.accent }}>
            <span className="absolute left-[10%] top-[52%] h-[18%] w-[56%] rounded-full bg-white/85" />
          </span>
          <span className="absolute left-[10%] top-[38%] h-[7%] w-[22%] rounded-full" style={{ background: T.accent }} />
          <span className="absolute inset-x-[10%] bottom-[10%] top-[50%] grid grid-cols-3 gap-[6%]">
            {[...Array(6)].map((_, i) => (
              <span key={i} className={tile} />
            ))}
          </span>
        </>
      )}
    </span>
  );
}

function XMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
