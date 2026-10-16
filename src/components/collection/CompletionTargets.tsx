import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Heart, Loader2, Plus, Share2, Star, Target, Trophy } from "lucide-react";
import { toast } from "sonner";

import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { fallbackToOriginal, getOptimizedImageUrl } from "@/utils/optimized-image";
import { useCollectionGoals } from "@/hooks/useCollectionGoals";
import { useCollectionTargets } from "@/hooks/useCollectionTargets";
import type { SeriesProgress } from "@/hooks/useCollectionProgress";
import {
  isTargetComplete,
  remaining,
  targetPercent,
  type CollectionTarget,
  type MissingGoods,
  type OwnedItemLike,
} from "@/utils/collectionTargets";
import { addOfficialItemToWishlist, fetchWishedOfficialIds, wishedOfficialIdsKey } from "@/utils/wishlist-actions";
import { addToCollection } from "@/utils/collection-actions";
import { invalidateCollectionChanged } from "@/utils/collection-cache";
import type { FacetKind } from "@/utils/itemFacets";

/** 横に並べる的の数。多すぎると「小さな的」ではなく一覧になってしまう */
const MAX_CARDS = 12;

interface CompletionTargetsProps {
  userId: string | null | undefined;
  items: OwnedItemLike[];
  progress: SeriesProgress[];
  isOwn: boolean;
  isSelected: (kind: FacetKind, value: string) => boolean;
  onToggleFacet: (kind: FacetKind, value: string) => void;
  onShareSeries?: (p: SeriesProgress) => void;
}

/**
 * コンプの見せ方。
 *
 * 以前は作品全体（ちいかわなら 10,418 件）が分母のカードだけが並び、登録しても 0% のまま動かなかった。
 * ここでは「小さな的」を主役にする:
 *  1. 集めるもの（目標）: 自分でピン留めしたシリーズ・キャラ。いちばん上に達成率を出す
 *  2. あと少し: 残り1〜2個の的は、足りないグッズを見せて「ほしいものに追加」へつなぐ
 *  3. 的の一覧: シリーズ・キャラ・キャラ×種類を「あと少し」の順に横に並べる
 *  4. 作品全体: 大きいので折りたたむ
 */
export function CompletionTargets({
  userId,
  items,
  progress,
  isOwn,
  isSelected,
  onToggleFacet,
  onShareSeries,
}: CompletionTargetsProps) {
  const { t } = useLanguage();
  const { goals: pinned, toggle, isPinned, max } = useCollectionGoals(isOwn ? userId : null);
  const { targets, works, goals, isCounting } = useCollectionTargets({ userId, items, progress, pinned, isOwn });

  const label = (x: CollectionTarget) => targetLabel(x, t);

  // 押したら、その的で棚を絞り込む（キャラ×種類などはキャラで絞る）
  const facetOf = (x: CollectionTarget): { kind: FacetKind; value: string } | null => {
    if (x.kind === "work") return x.work ? { kind: "series", value: x.work } : null;
    if (x.kind === "series") return x.series ? { kind: "series", value: x.series } : null;
    return x.character ? { kind: "character", value: x.character } : null;
  };

  const togglePin = (x: CollectionTarget) => {
    const ok = toggle(x);
    if (!ok) toast.info(t("collectGoals.targets.maxGoals", { max }));
  };

  // シェアは作品・シリーズの進捗カードの形（ShareCardDialog の series）をそのまま使う
  const shareOf = (x: CollectionTarget) => {
    if (!onShareSeries || (x.kind !== "series" && x.kind !== "work") || x.total == null) return undefined;
    const p = progress.find((r) => r.series_label === (x.series ?? x.work));
    return p ? () => onShareSeries(p) : undefined;
  };

  // 「あと少し」は、足りないグッズが分かっている的のうち先頭のもの
  const almost = isOwn ? targets.find((x) => !isTargetComplete(x) && (x.missing?.length ?? 0) > 0) : undefined;
  const cards = targets.filter((x) => x.key !== almost?.key).slice(0, MAX_CARDS);

  if (targets.length === 0 && works.length === 0 && goals.length === 0 && !isCounting) return null;

  return (
    // data-tour="collection-goals": はじめてガイドの「集めるもの」の項目が、ここを光らせて☆の場所を案内する
    <section aria-label={t("collectGoals.targets.title")} className="space-y-2.5" data-completion-targets data-tour="collection-goals">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold">{t("collectGoals.targets.title")}</h3>
        <span className="truncate text-2xs text-muted-foreground">
          {isOwn ? t("collectGoals.targets.hintOwn") : t("collectGoals.targets.hint")}
        </span>
      </div>

      {/* 1. 集めるもの（目標） */}
      {isOwn && goals.length > 0 && (
        <div data-collection-goals className="space-y-2 rounded-2xl border border-primary/30 bg-primary/5 p-3">
          <p className="flex items-center gap-1 text-xs font-bold text-primary">
            <Target className="h-3.5 w-3.5" aria-hidden="true" />
            {t("collectGoals.targets.goalsTitle")}
          </p>
          <ul className="space-y-2">
            {goals.map((g) => (
              <GoalRow key={g.key} target={g} label={label(g)} onUnpin={() => togglePin(g)} onOpen={() => {
                const f = facetOf(g);
                if (f) onToggleFacet(f.kind, f.value);
              }} />
            ))}
          </ul>
        </div>
      )}

      {/* 2. あと少し（足りないグッズを見せる） */}
      {almost && <AlmostCard target={almost} label={label(almost)} pinned={isPinned(almost.key)} onPin={() => togglePin(almost)} />}

      {/* 3. 小さな的を、あと少しの順に。コレクション画面の余白（スマホ px-3 / PC px-4）に合わせて端まで広げる。
          scroll-snap は付けない（追加のたびに並びが変わると、前に止まっていたカードへ勝手に戻ってしまうため） */}
      {(cards.length > 0 || isCounting) && (
        <div className="-mx-3 flex gap-2.5 overflow-x-auto px-3 pb-1 scrollbar-hide md:-mx-4 md:px-4">
          {cards.map((x) => {
            const f = facetOf(x);
            return (
              <TargetCard
                key={x.key}
                target={x}
                label={label(x)}
                selected={!!f && isSelected(f.kind, f.value)}
                onOpen={f ? () => onToggleFacet(f.kind, f.value) : undefined}
                pinned={isPinned(x.key)}
                onPin={isOwn && x.kind !== "work" ? () => togglePin(x) : undefined}
                onShare={shareOf(x)}
              />
            );
          })}
          {isCounting &&
            Array.from({ length: cards.length > 0 ? 1 : 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[164px] w-[148px] shrink-0 rounded-2xl" />
            ))}
        </div>
      )}

      {/* 4. 作品全体（分母が大きいので、折りたたむ） */}
      {works.length > 0 && <WorksList works={works} isSelected={isSelected} onToggleFacet={onToggleFacet} shareOf={shareOf} />}
    </section>
  );
}

function targetLabel(x: CollectionTarget, t: (key: string, vars?: Record<string, string | number>) => string): string {
  switch (x.kind) {
    case "work":
      return x.work ?? "";
    case "series":
      return x.series ?? "";
    case "character":
      return x.character ?? "";
    case "character_type":
      return t("collectGoals.targets.charType", { character: x.character ?? "", type: x.type ?? "" });
    case "series_character":
      return t("collectGoals.targets.seriesChar", { series: x.series ?? "", character: x.character ?? "" });
  }
}

function Cover({ src, className }: { src: string | null; className?: string }) {
  return (
    <span className={cn("relative block overflow-hidden bg-muted", className)}>
      {src && (
        <img
          src={getOptimizedImageUrl(src, { width: 320 })}
          onError={fallbackToOriginal(src)}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
      )}
    </span>
  );
}

function CountLine({ target }: { target: CollectionTarget }) {
  const { t } = useLanguage();
  const done = isTargetComplete(target);
  const r = remaining(target);
  return (
    <p className="flex flex-wrap items-baseline gap-x-1.5 text-2xs tabular-nums text-muted-foreground">
      <span className="whitespace-nowrap">
        {t("engage.collection.ownedOf", { owned: target.owned.toLocaleString(), total: target.total?.toLocaleString() ?? "—" })}
      </span>
      {done ? (
        <span className="whitespace-nowrap font-bold text-foreground">{t("engage.collection.complete")}</span>
      ) : r != null && r <= 99 ? (
        // 残りが少ないときだけ「あと◯個」。何千個も残っている的で数を強調すると、かえって遠く見える
        <span className="whitespace-nowrap font-bold text-primary">{t("collectGoals.targets.left", { n: r })}</span>
      ) : r != null ? (
        // 大きな的で 1% 未満を「0%」と出すと、持っているのに何も無いように見えるので「1%未満」と書く
        <span className="whitespace-nowrap font-bold text-foreground">
          {target.owned > 0 && targetPercent(target) === 0 ? "<1%" : `${targetPercent(target)}%`}
        </span>
      ) : null}
    </p>
  );
}

function TargetCard({
  target,
  label,
  selected,
  onOpen,
  pinned,
  onPin,
  onShare,
}: {
  target: CollectionTarget;
  label: string;
  selected: boolean;
  onOpen?: () => void;
  pinned: boolean;
  onPin?: () => void;
  onShare?: () => void;
}) {
  const { t } = useLanguage();
  const done = isTargetComplete(target);
  return (
    <div
      data-target-card={target.kind}
      className={cn(
        "relative w-[148px] shrink-0 overflow-hidden rounded-2xl border bg-card text-left transition-colors",
        selected ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40"
      )}
    >
      <button type="button" onClick={onOpen} disabled={!onOpen} aria-pressed={selected} className="block w-full text-left">
        <span className="relative block">
          <Cover src={target.cover} className="h-16" />
          <span className="absolute left-1.5 top-1.5 rounded-full bg-background/90 px-1.5 py-0.5 text-3xs font-bold text-foreground shadow-sm">
            {t(`collectGoals.kind.${target.kind}`)}
          </span>
          {done && (
            <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-warning px-2 py-0.5 text-3xs font-bold text-warning-foreground shadow">
              <Trophy className="h-3 w-3" aria-hidden="true" />
              {t("engage.collection.complete")}
            </span>
          )}
        </span>
        <span className="block space-y-1.5 p-2.5">
          <span className="line-clamp-2 block min-h-[2rem] text-xs font-bold leading-tight">{label}</span>
          <Progress value={targetPercent(target)} className="h-1.5" />
          <CountLine target={target} />
        </span>
      </button>
      {onPin && (
        <button
          type="button"
          onClick={onPin}
          aria-pressed={pinned}
          aria-label={pinned ? t("collectGoals.targets.unpin", { name: label }) : t("collectGoals.targets.pin", { name: label })}
          className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background/90 shadow-sm">
            <Star className={cn("h-3.5 w-3.5", pinned ? "fill-primary text-primary" : "text-muted-foreground")} />
          </span>
        </button>
      )}
      {onShare && (
        <button
          type="button"
          onClick={onShare}
          aria-label={t("engage.collection.shareSeries")}
          className="absolute right-1 top-[2.25rem] flex h-8 w-8 items-center justify-center rounded-full"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background/90 shadow-sm">
            <Share2 className="h-3.5 w-3.5 text-primary" />
          </span>
        </button>
      )}
    </div>
  );
}

function GoalRow({ target, label, onUnpin, onOpen }: { target: CollectionTarget; label: string; onUnpin: () => void; onOpen: () => void }) {
  const { t } = useLanguage();
  const done = isTargetComplete(target);
  return (
    <li className="flex items-center gap-2.5">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
        <Cover src={target.cover} className="h-10 w-10 shrink-0 rounded-lg" />
        <span className="min-w-0 flex-1 space-y-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-xs font-bold">{label}</span>
            <span className="shrink-0 rounded-full bg-background px-1.5 text-3xs text-muted-foreground ring-1 ring-inset ring-border">
              {t(`collectGoals.kind.${target.kind}`)}
            </span>
            {done && <Trophy className="h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />}
          </span>
          <Progress value={targetPercent(target)} className="h-2" />
          <CountLine target={target} />
        </span>
        <span className="shrink-0 text-lg font-black tabular-nums">
          {target.total == null ? "—" : `${targetPercent(target)}%`}
        </span>
      </button>
      <button
        type="button"
        onClick={onUnpin}
        aria-label={t("collectGoals.targets.unpin", { name: label })}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-background"
      >
        <Star className="h-4 w-4 fill-primary text-primary" />
      </button>
    </li>
  );
}

/**
 * 「あと1個でコンプ」。足りないグッズを見せて、ほしいものに入れられるようにする。
 * 交換画面には飛ばさない（ほしいものに入れておけば、交換のマッチングはそこから自然に動く）。
 * 実は持っていて登録していないだけ、もよくあるので「持ってる」でその場で追加もできる。
 */
function AlmostCard({ target, label, pinned, onPin }: { target: CollectionTarget; label: string; pinned: boolean; onPin: () => void }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const r = remaining(target) ?? 0;
  const missing = (target.missing ?? []).slice(0, 2);
  const { data: wished } = useQuery({
    queryKey: wishedOfficialIdsKey(user?.id),
    enabled: !!user?.id,
    queryFn: () => fetchWishedOfficialIds(user!.id),
  });
  const [busy, setBusy] = useState<string | null>(null);

  const wish = async (m: MissingGoods) => {
    if (!user) return;
    setBusy(`wish:${m.id}`);
    try {
      await addOfficialItemToWishlist(queryClient, user.id, m.id);
      toast.success(t("collectionScreen.addSheet.wishedToast", { title: m.title }));
    } catch (e) {
      console.error("Failed to add to wishlist:", e);
      toast.error(t("collectionScreen.addSheet.wishFailed"));
    } finally {
      setBusy(null);
    }
  };

  const own = async (m: MissingGoods) => {
    if (!user) return;
    setBusy(`own:${m.id}`);
    try {
      const result = await addToCollection({ userId: user.id, title: m.title, image: m.image ?? "", officialItemId: m.id });
      if (result.success) {
        toast.success(t("collectionScreen.official.added"), { description: m.title });
        await invalidateCollectionChanged(queryClient, { userId: user.id, officialItemId: m.id });
      } else if (result.isAtLimit) {
        toast.error(t("collectionScreen.addFlow.limitTitle"), {
          description: t("notices.adminItem.limitDesc", { max: result.maxSlots ?? 0 }),
        });
      } else {
        console.error("addToCollection failed:", result.error);
        toast.error(t("collectionScreen.common.error"), { description: t("notices.adminItem.collectionFailedDesc") });
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div data-almost-card className="space-y-2.5 rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-card p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-2xs font-bold text-primary">
            {t("collectGoals.targets.almostTitle", { n: r })}
          </p>
          <p className="mt-0.5 truncate text-sm font-bold">{label}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <Progress value={targetPercent(target)} className="h-2 flex-1" />
            <span className="shrink-0 text-2xs tabular-nums text-muted-foreground">
              {t("engage.collection.ownedOf", { owned: target.owned, total: target.total ?? "—" })}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onPin}
          aria-pressed={pinned}
          aria-label={pinned ? t("collectGoals.targets.unpin", { name: label }) : t("collectGoals.targets.pin", { name: label })}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background/80"
        >
          <Star className={cn("h-4 w-4", pinned ? "fill-primary text-primary" : "text-muted-foreground")} />
        </button>
      </div>
      <p className="text-2xs text-muted-foreground">{t("collectGoals.targets.missingLead")}</p>
      <ul className="space-y-2">
        {missing.map((m) => {
          const isWished = wished?.has(m.id) ?? false;
          return (
            <li key={m.id} className="flex items-center gap-2.5 rounded-xl bg-background/80 p-2">
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                {m.image && (
                  <img
                    src={getOptimizedImageUrl(m.image, { width: 160 })}
                    onError={fallbackToOriginal(m.image)}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-contain"
                  />
                )}
              </span>
              <span className="line-clamp-2 min-w-0 flex-1 text-xs font-medium leading-tight">{m.title}</span>
              <span className="flex shrink-0 flex-col gap-1">
                <Button
                  type="button"
                  size="sm"
                  disabled={isWished || busy !== null}
                  onClick={() => wish(m)}
                  className="h-7 gap-1 rounded-full px-2.5 text-2xs font-bold"
                >
                  {busy === `wish:${m.id}` ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : isWished ? (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Heart className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {isWished ? t("collectGoals.targets.wished") : t("collectGoals.targets.wish")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy !== null}
                  onClick={() => own(m)}
                  className="h-7 gap-1 rounded-full px-2.5 text-2xs"
                >
                  {busy === `own:${m.id}` ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {t("collectGoals.targets.haveIt")}
                </Button>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function WorksList({
  works,
  isSelected,
  onToggleFacet,
  shareOf,
}: {
  works: CollectionTarget[];
  isSelected: (kind: FacetKind, value: string) => boolean;
  onToggleFacet: (kind: FacetKind, value: string) => void;
  shareOf: (x: CollectionTarget) => (() => void) | undefined;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          data-works-toggle
          className="flex w-full items-center justify-between rounded-xl px-1 py-1 text-2xs text-muted-foreground hover:text-foreground"
        >
          <span>{t("collectGoals.targets.worksTitle", { n: works.length })}</span>
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="space-y-1.5 pt-1">
          {works.map((w) => {
            const share = shareOf(w);
            const selected = !!w.work && isSelected("series", w.work);
            return (
              <li key={w.key} className="flex items-center gap-2">
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => w.work && onToggleFacet("series", w.work)}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left",
                    selected ? "bg-primary/10" : "hover:bg-muted/60"
                  )}
                >
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">{w.work}</span>
                  <Progress value={targetPercent(w)} className="h-1 w-16 shrink-0" />
                  <span className="w-24 shrink-0 text-right text-3xs tabular-nums text-muted-foreground">
                    {t("engage.collection.ownedOf", { owned: w.owned.toLocaleString(), total: (w.total ?? 0).toLocaleString() })}
                  </span>
                </button>
                {share && (
                  <button
                    type="button"
                    onClick={share}
                    aria-label={t("engage.collection.shareSeries")}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary/5"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
