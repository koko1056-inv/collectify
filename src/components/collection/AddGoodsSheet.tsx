import { useCallback, useDeferredValue, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, CheckCheck, ChevronLeft, ChevronRight, Heart, Lightbulb, ListChecks, Loader2, Pencil, Search, Star, X } from "lucide-react";
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
import { FeedbackSheet } from "@/components/feedback/FeedbackSheet";
import {
  useCatalogContentCovers,
  useCatalogContents,
  useCatalogFeed,
  useContentNamesEn,
  useOfficialItems,
  useOfficialItemsPreview,
} from "@/hooks/useOfficialItems";
import { addManyToCollection, addToCollection, BULK_ADD_MAX, type BulkAddItem } from "@/utils/collection-actions";
import { addOfficialItemToWishlist, fetchWishedOfficialIds, wishedOfficialIdsKey } from "@/utils/wishlist-actions";
import { requestOnboardingRewardCheck } from "@/lib/onboardingRewards";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ItemDetailsModal } from "@/components/item-details/ItemDetailsModal";
import { GoodsPickTile } from "./GoodsPickTile";
import { CatalogFilterPanel } from "./CatalogFilterPanel";
import { activeFilterCount, applyFilter, EMPTY_FILTER, type CatalogFilterState } from "@/utils/catalogFilter";
import { cn } from "@/lib/utils";
import { CatalogStackArt, CameraScanArt, ManualFormArt } from "./AddGoodsArt";
import { invalidateCollectionChanged } from "@/utils/collection-cache";
import { pockeCheer } from "@/components/pocke/pockeCheer";

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

/**
 * 推しの作品（プロフィールの「推しの作品」favorite_contents と、ウェルカムなどで選ぶ「興味のある作品」interests）。
 * 最初の3択（件数と写真）と一覧（推しの作品を先に開く）の両方で使うので、同じキーで1回だけ取る。
 * 以前は favorite_contents しか見ておらず、interests だけを設定している大半の人
 * （本番では interests を設定した17人中15人）には効いていなかった。両方を、設定した順に使う。
 */
function useFavoriteContents(userId: string | undefined) {
  return useQuery({
    queryKey: ["favorite-contents", userId],
    enabled: !!userId,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("favorite_contents, interests")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return [...new Set([...(data?.favorite_contents ?? []), ...(data?.interests ?? [])])].filter(Boolean) as string[];
    },
  });
}

/**
 * 日本語の見出しを「、」「。」「・」の後ろでだけ折り返す。
 * 狭い列だと「公式グッズなら、た／ぶんもうある」のように言葉の途中で切れて読みにくかった。
 * 区切りごとに inline-block にして、句読点の後ろを折り返し位置にする（英語は区切りが無いので普段どおり）。
 */
function phrases(text: string) {
  // 「、」「。」「・」の後ろと、文言に入れた \u200b（折り返してよい位置の印）の後ろでだけ折り返す
  const parts = text.split(/(?<=[、。・\u200b])/);
  if (parts.length < 2) return text;
  return parts.map((p, i) => (
    <span key={i} className="inline-block">
      {p}
    </span>
  ));
}

/**
 * 最初の3択。
 *
 * 以前は「写真で追加／一覧から選ぶ／手入力で追加」が同じ形の行で縦に並び、機能名と説明を読み比べないと
 * どれを選べばいいかわからなかった。しかも写真が一番上の primary で、カタログに既にあるグッズまで
 * 撮り直されやすく、カタログに重複が生まれていた。
 * ここでは「どんなときに使うか」を利用者の状況の言葉で先に書き、絵で違いが一目でわかるようにする。
 *  - 一覧から選ぶ: 大きいカード＋おすすめの印。推しの作品の実物の写真と件数で「選ぶだけ」を見せる
 *  - 写真で追加・手入力で追加: その下に2つ並べる。写真は primary の面で、手入力より目立たせる
 *  - 一番下に「見つからなければ写真か手入力で」と、迷ったときの道筋を書く
 */
function MenuView({ onPick, onNavigate }: { onPick: () => void; onNavigate: () => void }) {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useAuth();

  const go = (path: string) => {
    onNavigate();
    navigate(path);
  };

  // 件数と写真は無くても3択として成り立つので、読み込み中・失敗のときは出さないだけにする
  const { data: favorites } = useFavoriteContents(user?.id);
  const { data: contents, isLoading: contentsLoading } = useCatalogContents();
  const { data: covers } = useCatalogContentCovers(3);
  const { data: namesEn } = useContentNamesEn();

  const catalog = useMemo(() => {
    if (!contents) return null;
    const counts = new Map(contents.map((c) => [c.name, c.count]));
    // 推しの作品のうちカタログにあるもの。一覧も、この先頭の作品を開いた状態で始まるので、件数もそれに合わせる
    const oshi = (favorites ?? []).filter((n) => counts.has(n));
    const focus = oshi[0] ?? null;
    const total = contents.reduce((sum, c) => sum + c.count, 0);
    // 写真は推しの作品から。足りなければ（推しが無い人は最初から）グッズの多い作品で埋める
    const images: string[] = [];
    const take = (name: string, max: number) => {
      let n = max;
      for (const src of covers?.get(name) ?? []) {
        if (images.length >= 3 || n <= 0) return;
        if (images.includes(src)) continue;
        images.push(src);
        n -= 1;
      }
    };
    if (focus) take(focus, 3);
    oshi.slice(1).forEach((name) => take(name, 1));
    contents.forEach((c) => take(c.name, 1));
    return { focus, count: focus ? counts.get(focus) ?? 0 : total, images };
  }, [contents, favorites, covers]);

  const fmt = (n: number) => n.toLocaleString(language === "en" ? "en-US" : "ja-JP");
  let countLabel: string | null = null;
  if (catalog?.focus) {
    countLabel = t("collectionScreen.addSheet.pickCountContent", {
      name: language === "en" ? namesEn?.get(catalog.focus) ?? catalog.focus : catalog.focus,
      count: fmt(catalog.count),
    });
  } else if (catalog && catalog.count > 0) {
    countLabel = t("collectionScreen.addSheet.pickCountAll", { count: fmt(catalog.count) });
  }

  return (
    // 背の低い画面（390x667 など）でも、入りきらない分はシートの中でスクロールできるようにする
    <div data-add-menu className="min-h-0 overflow-y-auto px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-md space-y-3 sm:max-w-lg">
        <DrawerTitle className="text-center text-base font-bold">
          {t("collectionScreen.addSheet.title")}
        </DrawerTitle>
        <DrawerDescription className="sr-only">
          {t("collectionScreen.addSheet.description")}
        </DrawerDescription>

        {/* 一覧から選ぶ（おすすめ）。既にあるグッズはここから追加してもらうと、カタログに重複が生まれない */}
        <button
          type="button"
          onClick={onPick}
          className="group block w-full rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-card p-4 text-left shadow-sm transition-[border-color,transform] hover:border-primary/70 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span className="flex items-center gap-3">
            <span className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-3xs font-bold text-primary-foreground">
                <Star className="h-2.5 w-2.5 fill-current" aria-hidden="true" />
                {t("collectionScreen.addSheet.recommended")}
              </span>
              <span className="mt-2 block text-base font-bold leading-snug">
                {phrases(t("collectionScreen.addSheet.pickSituation"))}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {phrases(t("collectionScreen.addSheet.pickLead"))}
              </span>
              {countLabel ? (
                <span className="mt-2 inline-flex max-w-full items-center gap-1 rounded-md bg-background/80 px-1.5 py-0.5 text-2xs font-semibold tabular-nums ring-1 ring-inset ring-primary/20">
                  <ListChecks className="h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
                  <span className="min-w-0">{countLabel}</span>
                </span>
              ) : (
                contentsLoading && <Skeleton className="mt-2 h-5 w-32 rounded-md" />
              )}
            </span>
            <CatalogStackArt images={catalog?.images ?? []} />
          </span>
          <span className="mt-3 flex items-center justify-center gap-1 rounded-xl bg-primary py-2 text-sm font-bold text-primary-foreground transition-colors group-hover:bg-primary/90">
            {t("collectionScreen.addSheet.pickTitle")}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </button>

        <div className="grid grid-cols-2 gap-3">
          <AddOption
            art={<CameraScanArt />}
            situation={t("collectionScreen.addSheet.photoSituation")}
            lead={t("collectionScreen.addSheet.photoLead")}
            icon={Camera}
            action={t("chrome.collection.addByPhoto")}
            onClick={() => go("/quick-add")}
            tone="primary"
          />
          <AddOption
            art={<ManualFormArt />}
            situation={t("collectionScreen.addSheet.manualSituation")}
            lead={t("collectionScreen.addSheet.manualLead")}
            icon={Pencil}
            action={t("chrome.collection.addManually")}
            onClick={() => go("/add-item")}
            tone="muted"
          />
        </div>

        {/* 迷ったときの道筋。一覧に無かったら、写真か手入力へ */}
        <p className="flex items-start justify-center gap-1.5 px-1 text-2xs text-muted-foreground">
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{t("collectionScreen.addSheet.fallbackHint")}</span>
        </p>
      </div>
    </div>
  );
}

/**
 * 一覧の下に2つ並べる選択肢（写真・手入力）。
 * 上に絵、その下に「どんなときか」（太字）と一言、最後に何をするボタンかを置く。
 * 写真は以前の主な選択肢で、手元にある物ならいちばん早いので primary の面で目立たせ、手入力は muted に控える。
 */
function AddOption({
  art,
  situation,
  lead,
  icon: Icon,
  action,
  onClick,
  tone,
}: {
  art: ReactNode;
  situation: string;
  lead: string;
  icon: typeof Camera;
  action: string;
  onClick: () => void;
  tone: "primary" | "muted";
}) {
  const primary = tone === "primary";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full flex-col rounded-2xl border bg-card p-3 text-left transition-[border-color,background-color,transform] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        primary ? "border-primary/30 hover:border-primary/60" : "border-border hover:bg-muted/40"
      )}
    >
      <span
        className={cn(
          "flex h-[4.25rem] items-center justify-center rounded-xl ring-1 ring-inset",
          primary ? "bg-primary/5 ring-primary/10" : "bg-muted/60 ring-foreground/5"
        )}
      >
        {art}
      </span>
      <span className="mt-2.5 block text-sm font-bold leading-snug">{phrases(situation)}</span>
      <span className="mb-2.5 mt-0.5 block text-2xs text-muted-foreground">{phrases(lead)}</span>
      <span
        className={cn(
          "mt-auto flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-bold transition-colors",
          primary ? "bg-primary/10 text-primary group-hover:bg-primary/15" : "bg-muted text-foreground group-hover:bg-muted/80"
        )}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {action}
      </span>
    </button>
  );
}

/** 一度に並べる件数。全件を一度に描くと重いので、「もっと見る」で足す */
const PAGE = 60;
/** 作品を選ばない一覧で、勝手に読み足す上限（これを超えたら「もっと見る」で） */
const AUTO_FETCH_MAX = 1200;
/** 「全部選ぶ」でこれより多く選ぶときは、いったん確かめる（作品まるごとだと数千件になることがある） */
const SELECT_ALL_CONFIRM = 100;

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
  // ほしいグッズが見つからないとき、運営に追加をリクエストする
  const [requestOpen, setRequestOpen] = useState(false);

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
  // 作品の全件が届くまでの間は、先頭の数十件を先に出す（全件は 1 万件・10MB になる作品もあり、十数秒なにも出なかった）。
  // 手元の絞り込み（キーワード・タグ・持っていないものだけ）をしているときは、先頭だけでは結果が欠けるので使わない
  const workLoading = !!filter.content && (!workQuery.data || workQuery.isPlaceholderData);
  const previewable = workLoading && !filter.query.trim() && !filter.hideOwned && activeFilterCount(filter) === 1;
  const workPreview = useOfficialItemsPreview(filter.content, previewable);
  const usePreview = previewable && !!workPreview.data && !workQuery.isError;
  const feed = useCatalogFeed(deferredQuery, !filter.content);
  const active = filter.content ? workQuery : feed;
  const items = useMemo(
    () => (filter.content ? (usePreview ? workPreview.data ?? [] : workQuery.data ?? []) : feed.items),
    [filter.content, usePreview, workPreview.data, workQuery.data, feed.items]
  );
  const { isError, refetch } = active;
  // 作品を切り替えた直後は、前の一覧を残したまま新しい一覧を取りに行っている。
  // その一覧を新しい作品で絞り込むと空になり、「見つかりません」が一瞬出てしまうので、読み込み中として扱う。
  const isLoading =
    !usePreview &&
    (active.isLoading ||
      active.isPlaceholderData ||
      (active.isFetching && items.length === 0) ||
      // 言葉を入れた直後（検索結果がまだ追いついていない一瞬）
      (!filter.content && filter.query !== deferredQuery));

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
    queryKey: wishedOfficialIdsKey(user?.id),
    enabled: !!user?.id,
    queryFn: () => fetchWishedOfficialIds(user!.id),
  });

  // 推しの作品を先に出す。カタログが大きいと、新しい順だけでは特定の作品が何百件も先に埋もれてしまう。
  const { data: favoriteContents } = useFavoriteContents(user?.id);
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
      // 引き直すキーは、コンプの「あと1個」からの追加と共通にしてある
      await addOfficialItemToWishlist(queryClient, user.id, item.id);
      toast.success(t("collectionScreen.addSheet.wishedToast", { title: item.title }));
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
  // 先頭だけを出している間は、続き（全件）を読んでいる印を末尾に出す
  const hasMore = filtered.length > visible || moreOnServer || usePreview;
  const loadingMore = (feed.isFetchingNextPage && !filter.content) || usePreview;

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
  const previewTotal = usePreview ? contents.find((c) => c.name === filter.content)?.count : undefined;
  const totalCount = !filter.content && !hasClientFilter && feed.total !== null ? feed.total : previewTotal ?? filtered.length;

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
    // 推しの作品は設定した順に先頭へ。残りはグッズの多い順
    const rank = new Map((favoriteContents ?? []).map((n, i) => [n, i]));
    const order = (name: string) => rank.get(name) ?? Number.POSITIVE_INFINITY;
    return [...contents]
      .filter((c) => c.name !== "なし")
      .sort((x, y) => order(x.name) - order(y.name) || y.count - x.count)
      .slice(0, 80);
  }, [contents, favoriteContents]);
  const results = filtered.slice(0, visible);

  // ---- まとめて選ぶ ----
  // 推し活の人はグッズを数十〜数百個持っている。1個ずつ「+追加」を押すのが最初の登録の大きな手間だったので、
  // タップで選んで、最後に1回で追加できるようにする。いつもの1タップ追加はそのまま残し、切り替えで選ぶモードに入る。
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Map<string, OfficialItem>>(() => new Map());
  const [bulkAdding, setBulkAdding] = useState(false);
  // 多すぎる「全部選ぶ」の確認（作品全体だと1万件を超えることもある）
  const [confirmAll, setConfirmAll] = useState<OfficialItem[] | null>(null);

  const stopSelecting = () => {
    setSelecting(false);
    setPicked(new Map());
  };
  const togglePick = (item: OfficialItem) => {
    if (!picked.has(item.id) && picked.size >= BULK_ADD_MAX) {
      toast.info(t("collectGoals.bulk.capped", { max: BULK_ADD_MAX }));
      return;
    }
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.set(item.id, item);
      return next;
    });
  };

  // 「このシリーズを全部選ぶ」を出すのは、作品かシリーズ（series タグ1つ）で絞り込んでいるときだけ。
  // 何も絞っていない一覧で全部を選べても、数万件になって意味がない。
  const seriesPick = filter.selection.series?.length === 1 ? filter.selection.series[0] : null;
  const scopeLabel = seriesPick ?? (filter.content ? contentLabel(filter.content) : null);
  const selectable = useMemo(() => filtered.filter((i) => !ownedIds?.has(i.id)), [filtered, ownedIds]);
  const allPicked = selectable.length > 0 && selectable.every((i) => picked.has(i.id));
  // 作品の全件が届く前（先頭だけ出している間）に押すと、一部しか選ばれないので待ってもらう
  const scopeReady = !isLoading && !usePreview && !workLoading;

  // 別のシリーズで選んでおいたものは残したまま、このシリーズの分を足す（シリーズをまたいで選んでいけるように）
  const pickAll = (list: OfficialItem[]) => {
    setSelecting(true);
    const fresh = list.filter((i) => !picked.has(i.id));
    const room = Math.max(0, BULK_ADD_MAX - picked.size);
    const next = new Map(picked);
    for (const i of fresh.slice(0, room)) next.set(i.id, i);
    setPicked(next);
    if (fresh.length > room) toast.info(t("collectGoals.bulk.capped", { max: BULK_ADD_MAX }));
  };
  const handlePickAll = () => {
    if (allPicked) {
      // はずすのも、いま絞り込んでいるシリーズの分だけ
      const ids = new Set(selectable.map((i) => i.id));
      setPicked((prev) => new Map([...prev].filter(([id]) => !ids.has(id))));
      return;
    }
    if (selectable.length > SELECT_ALL_CONFIRM) setConfirmAll(selectable);
    else pickAll(selectable);
  };

  const handleBulkAdd = async () => {
    if (!user || picked.size === 0) return;
    setBulkAdding(true);
    try {
      const list: BulkAddItem[] = [...picked.values()].map((item) => ({
        officialItemId: item.id,
        title: item.title,
        image: item.image,
        contentName: item.content_name,
        releaseDate: item.release_date,
        prize: item.price,
      }));
      const result = await addManyToCollection(user.id, list);
      if (result.success) {
        pockeCheer(result.added > 1 ? "addedMany" : "added", result.added);
        toast.success(t("collectGoals.bulk.addedToast", { n: result.added }), {
          description: result.skippedOwned > 0 ? t("collectGoals.bulk.skippedOwned", { n: result.skippedOwned }) : undefined,
        });
        stopSelecting();
        await invalidateCollectionChanged(queryClient, { userId: user.id });
        // 「最初のグッズを登録」などのはじめてガイドの報酬を、その場で確かめてもらう
        requestOnboardingRewardCheck();
      } else if (result.isAtLimit) {
        toast.error(t("collectionScreen.addFlow.limitTitle"), {
          description: t("collectGoals.bulk.limitDesc", { n: result.remainingSlots ?? 0, max: result.maxSlots ?? 0 }),
        });
      } else {
        console.error("addManyToCollection failed:", result.error);
        toast.error(t("collectionScreen.common.error"), {
          description: t("notices.adminItem.collectionFailedDesc"),
        });
      }
    } finally {
      setBulkAdding(false);
    }
  };

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
        pockeCheer("added");
        toast.success(t("collectionScreen.official.added"), {
          description: result.pointsAwarded
            ? t("notices.adminItem.pointsEarnedDesc", { n: result.pointsAwarded })
            : item.title,
        });
        // コンプ進捗・登録数など、コレクションから計算している数字をまとめて引き直す（以前は進捗が漏れていた）
        await Promise.all([
          invalidateCollectionChanged(queryClient, { userId: user.id, officialItemId: item.id }),
          queryClient.invalidateQueries({ queryKey: ["userPoints"], refetchType: "all" }),
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
          <DrawerTitle className="min-w-0 flex-1 truncate text-base font-bold">
            {t("collectionScreen.addSheet.pickTitle")}
          </DrawerTitle>
          {/* まとめて選ぶ。いつもの1タップ追加とぶつからないよう、明示的に切り替える */}
          <Button
            type="button"
            variant={selecting ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={selecting}
            onClick={() => (selecting ? stopSelecting() : setSelecting(true))}
            data-bulk-toggle
            className="h-8 shrink-0 gap-1 rounded-full px-3 text-xs font-bold"
          >
            {selecting ? <X className="h-3.5 w-3.5" aria-hidden="true" /> : <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />}
            {selecting ? t("collectGoals.bulk.stop") : t("collectGoals.bulk.start")}
          </Button>
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
                  <span className="tabular-nums text-3xs opacity-70">{c.count}</span>
                </button>
              );
            })}
          </div>
        )}

        {!isLoading && !isError && (
          <div className="mt-2 flex min-h-7 items-center gap-2">
            <p className="min-w-0 flex-1 text-2xs text-muted-foreground tabular-nums">
              {selecting
                ? t("collectGoals.bulk.hint")
                : t("engage.catalog.count", { shown: Math.min(visible, filtered.length), total: totalCount })}
            </p>
            {/* シリーズまるごと: 全部選んでから、持っていないものを外してもらう */}
            {scopeLabel && selectable.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!scopeReady}
                onClick={handlePickAll}
                data-bulk-pick-all
                className="h-7 max-w-[62%] shrink-0 gap-1 rounded-full border-primary/40 px-2.5 text-2xs font-bold text-primary"
              >
                {scopeReady ? (
                  <CheckCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
                )}
                <span className="truncate">
                  {allPicked
                    ? t("collectGoals.bulk.unpickAll")
                    : t("collectGoals.bulk.pickAll", { name: scopeLabel, n: selectable.length.toLocaleString() })}
                </span>
              </Button>
            )}
          </div>
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
            <div className="space-y-3">
              <EmptyState
                icon={Search}
                title={t("collectionScreen.addSheet.noHitTitle")}
                description={t("collectionScreen.addSheet.noHitDesc")}
              />
              <div className="flex flex-col items-center gap-1.5 pb-4">
                <p className="text-xs text-muted-foreground">{t("engage.feedback.cantFind")}</p>
                <Button size="sm" variant="outline" onClick={() => setRequestOpen(true)}>
                  {t("engage.feedback.requestIt")}
                </Button>
              </div>
            </div>
          ) : (
            // マイコレクションと同じ、写真つきのカードを並べて選ぶ
            <div className="grid grid-cols-3 gap-2.5 pb-2">
              {results.map((item, index) => {
                const owned = ownedIds?.has(item.id) ?? false;
                const wished = wishedIds?.has(item.id) ?? false;
                const isPicked = selecting && picked.has(item.id);
                let footerLabel = `+ ${t("chrome.fab.addShort")}`;
                let footerTone = "bg-primary text-primary-foreground";
                if (owned) {
                  footerLabel = t("collectionScreen.addSheet.owned");
                  footerTone = "bg-muted text-muted-foreground";
                } else if (selecting) {
                  footerLabel = isPicked ? `✓ ${t("collectGoals.bulk.picked")}` : t("collectGoals.bulk.pick");
                  footerTone = isPicked
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary/10 text-primary ring-1 ring-inset ring-primary/30";
                }
                return (
                  <div key={item.id} className="relative min-w-0">
                    <GoodsPickTile
                      image={item.image}
                      // 3列なので、最初の 3 行（開いたときに見える分）
                      priority={index < 9}
                      title={item.title}
                      subtitle={contentLabel(item.content_name)}
                      // 選ぶモードでは、追加済みと「選択中」を見分けられるよう、印は選んだものだけに付ける
                      selected={selecting ? isPicked : owned}
                      busy={addingId === item.id}
                      disabled={owned}
                      // 選ぶモードでは、写真を押しても選ぶ（詳細を開くより、選ぶ操作を続けやすく）
                      onClick={() => (selecting ? togglePick(item) : handleAdd(item))}
                      onImageClick={selecting ? undefined : () => setDetailItem(item)}
                      imageAriaLabel={t("engage.catalog.detail", { title: item.title })}
                      ariaLabel={`${item.title} ${owned ? t("collectionScreen.addSheet.owned") : footerLabel.replace(/^[+✓] /, "")}`}
                      footer={
                        <span className={cn("mt-auto rounded-md py-1 text-center text-3xs font-bold", footerTone)}>
                          {footerLabel}
                        </span>
                      }
                    />
                    {/* 持っていないものは「ほしい」に入れられる。
                        交換は欲しいもの側が無いと相手が見つからない。
                        タイルの外に置く（ボタンの中にボタンは置けない）。
                        選ぶモードの間は、選ぶ操作と混ざらないよう隠す。 */}
                    {!owned && !selecting && (
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

        {/* 選んだ数と「n個を追加」。一覧の下に置いて、どこまでスクロールしても押せるようにする */}
        {selecting && (
          <div
            data-bulk-bar
            className="mt-2 flex items-center gap-2 rounded-2xl border border-border bg-background/95 p-2 shadow-lg backdrop-blur"
          >
            <span className="pl-2 text-sm font-bold tabular-nums">
              {t("collectGoals.bulk.selectedCount", { n: picked.size })}
            </span>
            {picked.size > 0 && (
              <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setPicked(new Map())}>
                {t("collectGoals.bulk.clear")}
              </Button>
            )}
            <div className="flex-1" />
            <Button
              type="button"
              size="sm"
              disabled={picked.size === 0 || bulkAdding}
              onClick={handleBulkAdd}
              className="h-9 gap-1.5 rounded-full px-4 font-bold"
            >
              {bulkAdding ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="h-4 w-4" aria-hidden="true" />
              )}
              {t("collectGoals.bulk.addN", { n: picked.size })}
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={!!confirmAll} onOpenChange={(o) => !o && setConfirmAll(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("collectGoals.bulk.confirmTitle", { n: (confirmAll?.length ?? 0).toLocaleString() })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {(confirmAll?.length ?? 0) > BULK_ADD_MAX
                ? t("collectGoals.bulk.confirmDescCapped", { max: BULK_ADD_MAX })
                : t("collectGoals.bulk.confirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("collectionScreen.common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmAll) pickAll(confirmAll);
                setConfirmAll(null);
              }}
            >
              {t("collectGoals.bulk.confirmOk")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
      <FeedbackSheet open={requestOpen} onOpenChange={setRequestOpen} initialKind="content" initialTitle={filter.query.trim()} />
    </div>
  );
}
