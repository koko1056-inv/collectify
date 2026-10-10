import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, ChevronLeft, Heart, ListChecks, Loader2, Pencil, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { OfficialItem } from "@/types";
import { useSuggestNames } from "@/hooks/useSuggestNames";
import { DidYouMean } from "@/components/search/DidYouMean";
import { useCatalogContents, useCatalogFeed, useContentNamesEn, useOfficialItems } from "@/hooks/useOfficialItems";
import { addToCollection } from "@/utils/collection-actions";
import { ItemDetailsModal } from "@/components/item-details/ItemDetailsModal";
import { GoodsPickTile } from "./GoodsPickTile";
import { CatalogFilterPanel } from "./CatalogFilterPanel";
import { activeFilterCount, applyFilter, EMPTY_FILTER, type CatalogFilterState } from "@/utils/catalogFilter";
import { cn } from "@/lib/utils";

type View = "menu" | "pick";

interface AddGoodsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 開いたときに最初に見せる画面。「探して追加」からは選択肢を挟まず一覧へ直行する。 */
  initialView?: View;
}

/**
 * コレクション画面の「追加」から開く選択肢。
 *
 * 撮影(/quick-add)と手入力(/add-item)に加えて、
 * 「みんなのカタログに既にあるグッズを探して、そのまま自分のものとして追加する」
 * を画面を離れずにできるようにする。
 * 既にある物を撮り直すとカタログに同じグッズが重複して登録されてしまうため、
 * まずここで探してもらえるほうが望ましい。
 */
export function AddGoodsSheet({ open, onOpenChange, initialView = "menu" }: AddGoodsSheetProps) {
  const [view, setView] = useState<View>(initialView);

  // 開き直したときは、その時の入口に合わせた画面から始める
  useEffect(() => {
    if (open) setView(initialView);
  }, [open, initialView]);

  const close = () => {
    onOpenChange(false);
    // 閉じるアニメーションが終わってから戻す（切り替わりが見えないように）
    setTimeout(() => setView(initialView), 250);
  };

  return (
    <Drawer open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DrawerContent className={view === "pick" ? "h-[94dvh] max-h-[94dvh]" : "max-h-[88vh]"}>
        {view === "menu" ? (
          <MenuView onPick={() => setView("pick")} onNavigate={close} />
        ) : (
          <PickFromCatalogView onBack={() => setView("menu")} />
        )}
      </DrawerContent>
    </Drawer>
  );
}

function MenuView({ onPick, onNavigate }: { onPick: () => void; onNavigate: () => void }) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const go = (path: string) => {
    onNavigate();
    navigate(path);
  };

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="mx-auto w-full max-w-sm space-y-3">
        <DrawerTitle className="text-center text-base font-semibold">
          {t("collectionScreen.addSheet.title")}
        </DrawerTitle>
        <DrawerDescription className="sr-only">
          {t("collectionScreen.addSheet.description")}
        </DrawerDescription>

        <AddOption
          icon={Camera}
          title={t("chrome.collection.addByPhoto")}
          desc={t("chrome.collection.addByPhotoHint")}
          onClick={() => go("/quick-add")}
          primary
        />
        <AddOption
          icon={ListChecks}
          title={t("collectionScreen.addSheet.pickTitle")}
          desc={t("collectionScreen.addSheet.pickDesc")}
          onClick={onPick}
        />
        <AddOption
          icon={Pencil}
          title={t("chrome.collection.addManually")}
          desc={t("collectionScreen.addSheet.manualDesc")}
          onClick={() => go("/add-item")}
        />
      </div>
    </div>
  );
}

function AddOption({
  icon: Icon,
  title,
  desc,
  onClick,
  primary = false,
}: {
  icon: typeof Camera;
  title: string;
  desc: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        primary
          ? "w-full flex items-start gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3.5 text-left transition-colors hover:bg-primary/10"
          : "w-full flex items-start gap-3 rounded-xl border border-border bg-card p-3.5 text-left transition-colors hover:bg-muted/60"
      }
    >
      <span
        className={
          primary
            ? "shrink-0 rounded-lg bg-primary p-2 text-primary-foreground"
            : "shrink-0 rounded-lg bg-muted p-2 text-foreground"
        }
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
    </button>
  );
}

/** 一度に並べる件数。全件を一度に描くと重いので、「もっと見る」で足す */
const PAGE = 60;
/** 作品を選ばない一覧で、勝手に読み足す上限（これを超えたら「もっと見る」で） */
const AUTO_FETCH_MAX = 1200;

function PickFromCatalogView({ onBack }: { onBack: () => void }) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<CatalogFilterState>(EMPTY_FILTER);
  const [visible, setVisible] = useState(PAGE);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [wishingId, setWishingId] = useState<string | null>(null);
  // 写真をタップしたグッズの詳細
  const [detailItem, setDetailItem] = useState<OfficialItem | null>(null);

  // カタログは数万件あるので、全件は一度に読み込まない。
  //  - 作品を選んでいる: その作品を全件
  //  - 作品は未選択（言葉を入れた場合も）: サーバーから新しい順に少しずつ読み足す。最後まで辿れる
  const { data: contents = [] } = useCatalogContents();
  const deferredQuery = useDeferredValue(filter.query);
  // 英語表示のときは作品名も英語で見せる（検索はサーバーが英語名・別名でも当てる）
  const { data: namesEn } = useContentNamesEn();
  const contentLabel = useCallback(
    (name: string | null | undefined) => (name && language === "en" ? namesEn?.get(name) ?? name : name ?? ""),
    [namesEn, language]
  );
  const workQuery = useOfficialItems({ content: filter.content, enabled: !!filter.content });
  const feed = useCatalogFeed(deferredQuery, !filter.content);
  const active = filter.content ? workQuery : feed;
  const items = useMemo(() => (filter.content ? workQuery.data ?? [] : feed.items), [filter.content, workQuery.data, feed.items]);
  const { isError, refetch } = active;
  // 作品を切り替えた直後は、前の一覧を残したまま新しい一覧を取りに行っている。
  // その一覧を新しい作品で絞り込むと空になり、「見つかりません」が一瞬出てしまうので、読み込み中として扱う。
  const isLoading =
    active.isLoading ||
    active.isPlaceholderData ||
    (active.isFetching && items.length === 0) ||
    // 言葉を入れた直後（検索結果がまだ追いついていない一瞬）
    (!filter.content && filter.query !== deferredQuery);

  // 既に持っているグッズを一度に取得する。
  // 行ごとに問い合わせると、表示件数ぶんクエリが飛んでしまう。
  const { data: ownedIds } = useQuery({
    queryKey: ["owned-official-item-ids", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_items")
        .select("official_item_id")
        .eq("user_id", user!.id)
        .not("official_item_id", "is", null);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.official_item_id as string));
    },
  });

  // 「ほしい」に入れてあるものも先に取る。行ごとに聞くとクエリが増える。
  const { data: wishedIds } = useQuery({
    queryKey: ["wished-official-item-ids", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("official_item_id")
        .eq("user_id", user!.id)
        .not("official_item_id", "is", null);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.official_item_id as string));
    },
  });

  // 推しの作品を先に出す。カタログが大きいと、新しい順だけでは特定の作品が何百件も先に埋もれてしまう。
  const { data: favoriteContents } = useQuery({
    queryKey: ["favorite-contents", user?.id],
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("favorite_contents").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return (data?.favorite_contents ?? []) as string[];
    },
  });
  // 初回だけ、好きな作品が登録されていればその作品を開く（なければ「すべて」）
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (initialized || favoriteContents === undefined || contents.length === 0) return;
    setInitialized(true);
    const known = new Set(contents.map((c) => c.name));
    const first = favoriteContents.find((n) => known.has(n));
    if (first) setFilter((f) => (f.content ? f : { ...f, content: first }));
  }, [initialized, favoriteContents, contents]);

  const orderedItems = useMemo(() => {
    const fav = new Set(favoriteContents ?? []);
    if (fav.size === 0) return items;
    // 並び順は保ったまま、推しの作品だけ先頭へ（安定ソート）
    return [...items.filter((i) => fav.has(i.content_name ?? "")), ...items.filter((i) => !fav.has(i.content_name ?? ""))];
  }, [items, favoriteContents]);

  /**
   * ほしいものに入れる。
   *
   * ここに置いた理由: 下タブから「グッズ検索」を外したので、ウィッシュを
   * 作れる場所が画面上からほぼ無くなる。交換の成立には「欲しいもの」と
   * 「出せるもの」の両方が要るため、demand 側の入口が消えると
   * 交換がまた動かなくなる。カタログを見ている今ここが一番自然な場所。
   */
  const handleWish = async (item: (typeof items)[number]) => {
    if (!user) return;
    setWishingId(item.id);
    try {
      const { error } = await supabase.from("wishlists").insert({
        user_id: user.id,
        official_item_id: item.id,
      });
      if (error) throw error;
      toast.success(t("collectionScreen.addSheet.wishedToast", { title: item.title }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["wished-official-item-ids", user.id] }),
        // キーは既存のウィッシュ追加（MemoizedOfficialGoodsCard）と揃える。
        // 違うキーを投げても何も再取得されず、他画面が古い表示のまま残る。
        queryClient.invalidateQueries({ queryKey: ["wishlist"], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["wishlist-counts"] }),
        queryClient.invalidateQueries({ queryKey: ["is-in-wishlist", item.id, user.id] }),
        queryClient.invalidateQueries({ queryKey: ["trade-matches", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["trade-series-partners", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["trade-readiness", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["onboarding-checklist", user.id] }),
      ]);
    } catch (e) {
      console.error("Failed to add to wishlist:", e);
      toast.error(t("collectionScreen.addSheet.wishFailed"));
    } finally {
      setWishingId(null);
    }
  };

  // 絞り込みが変わったら、先頭から見直す
  useEffect(() => {
    setVisible(PAGE);
  }, [filter]);

  const filtered = useMemo(() => applyFilter(orderedItems, filter, ownedIds), [orderedItems, filter, ownedIds]);

  // 作品を選ばない一覧は、見せる分が足りなければ裏でサーバーから読み足す（絞り込みで減っても探し続けられる）。
  // 読み込みすぎないよう、勝手に読むのは AUTO_FETCH_MAX 件まで。それ以降は「もっと見る」で。
  const moreOnServer = !filter.content && !!feed.hasNextPage;
  useEffect(() => {
    if (moreOnServer && !feed.isFetchingNextPage && filtered.length < visible + PAGE && feed.items.length < AUTO_FETCH_MAX) {
      void feed.fetchNextPage();
    }
  }, [moreOnServer, feed, filtered.length, visible]);
  const hasMore = filtered.length > visible || moreOnServer;
  const loadingMore = feed.isFetchingNextPage && !filter.content;

  // 一覧の末尾が見えたら、続きを足す（スクロールするだけで増えていく）。
  // 足した直後にまだ末尾が見えていれば、依存の変化で監視し直されて、もう一度足される。
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);
  const setSentinelRef = useCallback((el: HTMLDivElement | null) => setSentinel(el), []);
  useEffect(() => {
    if (!sentinel || !hasMore) return;
    const root = sentinel.closest<HTMLElement>("[data-radix-scroll-area-viewport]");
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        // サーバーの読み込み待ちのあいだは、足さずに待つ（待たずに足すと、空の表示だけが増える）
        if (loadingMore && filtered.length <= visible) return;
        setVisible((v) => v + PAGE);
        if (moreOnServer && !feed.isFetchingNextPage && filtered.length < visible + PAGE * 2) void feed.fetchNextPage();
      },
      { root, rootMargin: "600px 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinel, hasMore, loadingMore, moreOnServer, feed, filtered.length, visible]);
  // 件数は、絞り込み（タグ・持っていないものだけ）をしていなければサーバーが数えた全体の数
  const hasClientFilter = activeFilterCount(filter) > 0;
  const totalCount = !filter.content && !hasClientFilter && feed.total !== null ? feed.total : filtered.length;

  // 作品をワンタップで切り替えられるチップ（推しの作品を先頭、あとは件数の多い順）。件数はサーバーで数えた全体の数。
  // 横にスクロールできるので全作品を並べる（件数の少ないアーティストなどが隠れないように）。
  // 結果が少ないときの「もしかして」（作品・タグ）
  const { suggestions } = useSuggestNames(filter.query, "any", 4);
  const showSuggestions = !filter.content && !isLoading && !isError && totalCount <= 30 && suggestions.length > 0;
  const pickSuggestion = (key: string) => {
    const hit = suggestions.find((x) => `${x.kind}:${x.id}` === key);
    if (!hit) return;
    // 作品なら、その作品の一覧へ。タグなら、その言葉で探し直す
    setFilter((f) => (hit.kind === "content" ? { ...f, content: hit.name, query: "" } : { ...f, query: hit.name }));
  };

  const contentChips = useMemo(() => {
    const fav = new Set(favoriteContents ?? []);
    return [...contents]
      .filter((c) => c.name !== "なし")
      .sort((x, y) => Number(fav.has(y.name)) - Number(fav.has(x.name)) || y.count - x.count)
      .slice(0, 80);
  }, [contents, favoriteContents]);
  const results = filtered.slice(0, visible);

  const handleAdd = async (item: (typeof items)[number]) => {
    if (!user) return;
    setAddingId(item.id);
    try {
      const result = await addToCollection({
        userId: user.id,
        title: item.title,
        image: item.image,
        officialItemId: item.id,
        contentName: item.content_name || undefined,
        releaseDate: item.release_date,
        prize: item.price,
      });

      if (result.success) {
        toast.success(t("collectionScreen.official.added"), {
          description: result.pointsAwarded
            ? t("notices.adminItem.pointsEarnedDesc", { n: result.pointsAwarded })
            : item.title,
        });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["user-items"], refetchType: "all" }),
          queryClient.invalidateQueries({ queryKey: ["owned-official-item-ids", user.id] }),
          queryClient.invalidateQueries({ queryKey: ["collectionCount"], refetchType: "all" }),
          queryClient.invalidateQueries({ queryKey: ["userPoints"], refetchType: "all" }),
          queryClient.invalidateQueries({ queryKey: ["hero-stats", user.id], refetchType: "all" }),
        ]);
      } else if (result.isAtLimit) {
        toast.error(t("collectionScreen.addFlow.limitTitle"), {
          description: t("notices.adminItem.limitDesc", { max: result.maxSlots ?? 0 }),
        });
      } else {
        // result.error は Supabase の技術的メッセージなので表示しない
        console.error("addToCollection failed:", result.error);
        toast.error(t("collectionScreen.common.error"), {
          description: t("notices.adminItem.collectionFailedDesc"),
        });
      }
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 pt-4 pb-6">
      <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label={t("chrome.common.back")}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <DrawerTitle className="text-base font-semibold">
            {t("collectionScreen.addSheet.pickTitle")}
          </DrawerTitle>
        </div>
        <DrawerDescription className="sr-only">
          {t("collectionScreen.addSheet.pickDesc")}
        </DrawerDescription>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={filter.query}
            onChange={(e) => setFilter((f) => ({ ...f, query: e.target.value }))}
            placeholder={t("collectionScreen.addSheet.searchPlaceholder")}
            className="pl-9"
          />
        </div>

        {showSuggestions && (
          <DidYouMean
            className="mt-2"
            options={suggestions.map((x) => ({
              key: `${x.kind}:${x.id}`,
              label: x.kind === "content" ? contentLabel(x.name) : x.name,
              hint: x.matched !== x.name && x.matched !== contentLabel(x.name) ? x.matched : undefined,
            }))}
            onPick={pickSuggestion}
          />
        )}

        <div className="mt-2">
          <CatalogFilterPanel items={items} owned={ownedIds} value={filter} onChange={setFilter} hideContent />
        </div>

        {!isError && contentChips.length > 1 && (
          <div
            role="group"
            aria-label={t("engage.catalog.content")}
            className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]"
          >
            <button
              type="button"
              aria-pressed={!filter.content}
              onClick={() => setFilter((f) => ({ ...f, content: null }))}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs font-medium",
                !filter.content ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
              )}
            >
              {t("engage.catalog.all")}
            </button>
            {contentChips.map((c) => {
              const on = filter.content === c.name;
              return (
                <button
                  key={c.name}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFilter((f) => ({ ...f, content: on ? null : c.name }))}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs",
                    on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
                  )}
                >
                  <span className="max-w-[9rem] truncate">{contentLabel(c.name)}</span>
                  <span className="tabular-nums text-[10px] opacity-70">{c.count}</span>
                </button>
              );
            })}
          </div>
        )}

        {!isLoading && !isError && (
          <p className="mt-2 text-[11px] text-muted-foreground tabular-nums">
            {t("engage.catalog.count", { shown: Math.min(visible, filtered.length), total: totalCount })}
          </p>
        )}

        <ScrollArea className="mt-2 min-h-0 flex-1 pr-2 [&>[data-radix-scroll-area-viewport]>div]:!block">
          {isLoading ? (
            <div className="grid grid-cols-3 gap-2.5">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] w-full rounded-xl" />
              ))}
            </div>
          ) : isError ? (
            <QueryErrorState
              title={t("chrome.officialItems.loadFailed")}
              onRetry={() => refetch()}
            />
          ) : results.length === 0 ? (
            <EmptyState
              icon={Search}
              title={t("collectionScreen.addSheet.noHitTitle")}
              description={t("collectionScreen.addSheet.noHitDesc")}
            />
          ) : (
            // マイコレクションと同じ、写真つきのカードを並べて選ぶ
            <div className="grid grid-cols-3 gap-2.5 pb-2">
              {results.map((item) => {
                const owned = ownedIds?.has(item.id) ?? false;
                const wished = wishedIds?.has(item.id) ?? false;
                return (
                  <div key={item.id} className="relative min-w-0">
                    <GoodsPickTile
                      image={item.image}
                      title={item.title}
                      subtitle={contentLabel(item.content_name)}
                      selected={owned}
                      busy={addingId === item.id}
                      disabled={owned}
                      onClick={() => handleAdd(item)}
                      onImageClick={() => setDetailItem(item)}
                      imageAriaLabel={t("engage.catalog.detail", { title: item.title })}
                      ariaLabel={
                        owned
                          ? `${item.title} ${t("collectionScreen.addSheet.owned")}`
                          : `${item.title} ${t("chrome.fab.addShort")}`
                      }
                      footer={
                        <span
                          className={cn(
                            "mt-auto rounded-md py-1 text-center text-[10px] font-semibold",
                            owned ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
                          )}
                        >
                          {owned ? t("collectionScreen.addSheet.owned") : `+ ${t("chrome.fab.addShort")}`}
                        </span>
                      }
                    />
                    {/* 持っていないものは「ほしい」に入れられる。
                        交換は欲しいもの側が無いと相手が見つからない。
                        タイルの外に置く（ボタンの中にボタンは置けない）。 */}
                    {!owned && (
                      <button
                        type="button"
                        disabled={wished || wishingId === item.id}
                        onClick={() => handleWish(item)}
                        aria-label={`${item.title} ${wished ? t("collectionScreen.addSheet.wished") : t("collectionScreen.addSheet.wantIt")}`}
                        aria-pressed={wished}
                        className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 shadow backdrop-blur disabled:opacity-100"
                      >
                        {wishingId === item.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Heart className={cn("h-4 w-4", wished ? "fill-primary text-primary" : "text-muted-foreground")} />
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
              {hasMore && (
                <div ref={setSentinelRef} className="col-span-3 flex h-10 items-center justify-center" aria-hidden>
                  {loadingMore && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      {detailItem && (
        <ItemDetailsModal
          isOpen
          onClose={() => setDetailItem(null)}
          itemId={detailItem.id}
          title={detailItem.title}
          image={detailItem.image || ""}
          price={detailItem.price ?? undefined}
          description={detailItem.description ?? undefined}
          releaseDate={detailItem.release_date ?? undefined}
          contentName={detailItem.content_name}
          isUserItem={false}
        />
      )}
    </div>
  );
}
