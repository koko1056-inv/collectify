import { Link, useLocation } from "react-router-dom";
import { ArrowLeftRight, Check, Heart, Package, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pocke } from "@/components/pocke/Pocke";
import { InlineFollowButton } from "@/components/trade/InlineFollowButton";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { fallbackToOriginal, getAvatarImageUrl } from "@/utils/optimized-image";
import { useGoodsPeople, type GoodsPeopleKind, type GoodsPeopleSummary, type GoodsPerson } from "./useGoodsSocial";

interface GoodsPeopleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemTitle: string;
  tab: GoodsPeopleKind;
  onTabChange: (tab: GoodsPeopleKind) => void;
  summary: GoodsPeopleSummary;
}

/**
 * 「持ってる人・ほしい人」の一覧。スマホは下から出るシート（Drawer）、PC は真ん中のダイアログ。
 * タブで 持ってる / ほしい を切り替え、20 人ずつ「もっと見る」で読む。
 */
export function GoodsPeopleSheet(props: GoodsPeopleSheetProps) {
  const isMobile = useIsMobile();
  const { t } = useLanguage();
  const { open, onOpenChange, itemTitle } = props;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[88vh]" data-testid="goods-people-sheet">
          <DrawerHeader className="pb-2 text-left">
            <DrawerTitle>{t("goodsSocial.people.sheetTitle")}</DrawerTitle>
            <DrawerDescription className="line-clamp-1">{itemTitle}</DrawerDescription>
          </DrawerHeader>
          <SheetBody {...props} />
        </DrawerContent>
      </Drawer>
    );
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col gap-0 p-0 sm:max-w-md" data-testid="goods-people-sheet">
        <DialogHeader className="px-5 pb-2 pt-5 text-left">
          <DialogTitle>{t("goodsSocial.people.sheetTitle")}</DialogTitle>
          <DialogDescription className="line-clamp-1">{itemTitle}</DialogDescription>
        </DialogHeader>
        <SheetBody {...props} />
      </DialogContent>
    </Dialog>
  );
}

function SheetBody({ itemId, tab, onTabChange, summary, onOpenChange }: GoodsPeopleSheetProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const total = tab === "owners" ? summary.owners_count : summary.wishers_count;
  const listed = tab === "owners" ? summary.owners_listed : summary.wishers_listed;
  const meIn = tab === "owners" ? summary.me_owns : summary.me_wishes;
  // 名前を出していない人（非公開・表示オフ・ブロック関係）の人数。自分は別に出すので引く
  const hidden = Math.max(0, total - listed - (meIn ? 1 : 0));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Tabs value={tab} onValueChange={(v) => onTabChange(v as GoodsPeopleKind)} className="px-4 sm:px-5">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="owners" className="gap-1.5">
            <Package className="h-3.5 w-3.5" aria-hidden="true" />
            {t("goodsSocial.people.tabOwners")}
            <span className="tabular-nums text-muted-foreground">{summary.owners_count}</span>
          </TabsTrigger>
          <TabsTrigger value="wishers" className="gap-1.5">
            <Heart className="h-3.5 w-3.5" aria-hidden="true" />
            {t("goodsSocial.people.tabWishers")}
            <span className="tabular-nums text-muted-foreground">{summary.wishers_count}</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="min-h-[18rem] flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:px-5">
        {!user ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center" data-testid="goods-people-guest">
            <Pocke pose="wave" height={72} motion="pop" />
            <p className="text-sm font-bold">{t("goodsSocial.people.guestTitle")}</p>
            <p className="max-w-xs text-xs text-muted-foreground">{t("goodsSocial.people.guestBody")}</p>
            <Button asChild className="mt-2 rounded-full">
              <Link to={`/login?redirect=${encodeURIComponent(pathname)}`}>{t("goodsSocial.people.guestCta")}</Link>
            </Button>
          </div>
        ) : (
          <>
            {meIn && (
              <p className="mb-2 flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                {tab === "owners"
                  ? summary.me_for_trade
                    ? t("goodsSocial.people.youOwnForTrade")
                    : t("goodsSocial.people.youOwn")
                  : t("goodsSocial.people.youWish")}
              </p>
            )}
            {/* タブごとに読み込みを分ける（切り替えた瞬間に前のタブの人が一瞬出ないように key で作り直す） */}
            <PeopleList key={tab} itemId={itemId} kind={tab} onNavigate={() => onOpenChange(false)} />
            {hidden > 0 && (
              <div className="mt-3 space-y-0.5 border-t border-border/70 pt-3 text-center">
                <p className="text-xs text-muted-foreground">{t("goodsSocial.people.hiddenNote", { count: hidden })}</p>
                <p className="text-2xs text-muted-foreground/80">{t("goodsSocial.people.privacyHint")}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PeopleList({ itemId, kind, onNavigate }: { itemId: string; kind: GoodsPeopleKind; onNavigate: () => void }) {
  const { t } = useLanguage();
  const query = useGoodsPeople(itemId, kind);
  const people = query.data?.pages.flatMap((p) => p.people) ?? [];

  if (query.isLoading) return <PeopleSkeleton count={4} />;
  if (query.isError) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Pocke pose="sad" height={56} />
        <p className="text-xs text-muted-foreground">{t("goodsSocial.people.loadFailed")}</p>
        <Button size="sm" variant="outline" className="rounded-full" onClick={() => void query.refetch()}>
          {t("goodsSocial.people.retry")}
        </Button>
      </div>
    );
  }
  if (people.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center" data-testid="goods-people-list-empty">
        <Pocke pose="think" height={64} motion="pop" loading="lazy" />
        <p className="text-sm text-muted-foreground">
          {kind === "owners" ? t("goodsSocial.people.listEmptyOwners") : t("goodsSocial.people.listEmptyWishers")}
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="divide-y divide-border/70" aria-busy={query.isFetchingNextPage}>
        {people.map((p) => (
          <PersonRow key={p.user_id} person={p} kind={kind} onNavigate={onNavigate} />
        ))}
      </ul>
      {query.isFetchingNextPage && <PeopleSkeleton count={2} />}
      {query.hasNextPage && !query.isFetchingNextPage && (
        <div className="flex justify-center pt-3">
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => void query.fetchNextPage()}>
            {t("goodsSocial.people.loadMore")}
          </Button>
        </div>
      )}
    </>
  );
}

function PersonRow({
  person,
  kind,
  onNavigate,
}: {
  person: GoodsPerson;
  kind: GoodsPeopleKind;
  onNavigate: () => void;
}) {
  const { t } = useLanguage();
  const name = person.display_name || person.username || t("social.itemPosts.collector");
  const handle = person.username && person.username !== name ? person.username : null;

  return (
    <li className="flex items-center gap-3 py-2.5 motion-safe:animate-fade-in">
      <Link
        to={`/user/${person.user_id}`}
        onClick={onNavigate}
        aria-label={t("goodsSocial.people.openProfile", { name })}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Avatar className="h-11 w-11 shrink-0">
          <AvatarImage
            src={getAvatarImageUrl(person.avatar_url, 96)}
            onError={fallbackToOriginal(person.avatar_url)}
            alt=""
          />
          <AvatarFallback>{name ? name[0] : <UserRound className="h-4 w-4" />}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1 text-sm">
            <span className="truncate font-bold">{name}</span>
            {person.is_sample && (
              <span className="shrink-0 rounded bg-muted px-1 text-3xs font-medium text-muted-foreground">
                {t("goodsSocial.people.sample")}
              </span>
            )}
            {handle && <span className="min-w-0 truncate text-xs text-muted-foreground">@{handle}</span>}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-1">
            {kind === "owners" && person.for_trade && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-success/10 px-1.5 py-px text-3xs font-bold text-success">
                <ArrowLeftRight className="h-2.5 w-2.5" aria-hidden="true" />
                {t("goodsSocial.people.forTrade")}
              </span>
            )}
            {kind === "owners" && (person.quantity ?? 0) > 1 && (
              <span className="rounded-full bg-muted px-1.5 py-px text-3xs font-medium text-muted-foreground">
                {t("goodsSocial.people.quantity", {
                  count: person.quantity ?? 0,
                })}
              </span>
            )}
            {(person.series_count ?? 0) > 1 && (
              <span className="rounded-full bg-muted px-1.5 py-px text-3xs font-medium text-muted-foreground">
                {t("goodsSocial.people.seriesCount", {
                  count: person.series_count ?? 0,
                })}
              </span>
            )}
          </span>
        </span>
      </Link>
      <InlineFollowButton userId={person.user_id} />
    </li>
  );
}

function PeopleSkeleton({ count }: { count: number }) {
  return (
    <div className={cn("space-y-1")} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2.5">
          <Skeleton className="h-11 w-11 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      ))}
    </div>
  );
}
