import { useNavigate } from "react-router-dom";
import { CalendarDays, ChevronRight, Flame, Sparkles, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOshiContents } from "@/hooks/useOshiContents";
import { todayJst, useOshiNewArrivals, usePopularGoods, useUpcomingReleases, type ReleaseItem } from "@/hooks/useOshiReleases";
import { ReleaseGoodsTile } from "./ReleaseGoodsTile";
import { shortDate, useReleaseActions, type ReleaseActions } from "@/hooks/useReleaseActions";
import { cn } from "@/lib/utils";

/**
 * 人の動きがまだ少ない欄の代わりに出す「推しの新着・発売予定・この作品で人気のグッズ」。
 *
 * 利用者がまだ少ないので、「みんな」の投稿・お部屋は数件しかなく、開いても寂しく見える。
 * そこで、毎日増えるカタログの新商品（推しの作品で絞る）と、持っている人の多いグッズを前に出す。
 * 推しの作品を選んでいない人（ログイン前も）は、カタログ全体の新着・発売予定になる。
 * 中身が1つも無い欄は出さない。全部無ければ何も出さない。
 */
export function OshiDiscoveryPanel({ title, description, className }: { title?: string; description?: string; className?: string }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { names, ready } = useOshiContents();
  const actions = useReleaseActions();
  const fresh = useOshiNewArrivals(names, 14, 12, ready);
  const upcoming = useUpcomingReleases(names, todayJst(), 12, ready);
  const top = names[0] ?? null;
  const popular = usePopularGoods(top, 10);

  const loading = !ready || fresh.isLoading || upcoming.isLoading;
  const newItems = fresh.data?.items ?? [];
  const upItems = upcoming.data ?? [];
  const popItems: ReleaseItem[] = (popular.data ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    image: p.image ?? "",
    price: null,
    release_date: null,
    content_name: p.content_name,
    created_at: "",
  }));
  const ownersOf = new Map((popular.data ?? []).map((p) => [p.id, p.owner_count]));

  if (!loading && newItems.length === 0 && upItems.length === 0 && popItems.length === 0) return null;

  return (
    <section className={cn("space-y-4", className)} data-testid="oshi-discovery">
      {title && (
        <div>
          <h2 className="text-base font-bold">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
      )}
      {loading ? (
        <div className="flex gap-2.5 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-28 shrink-0 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <Strip
            icon={Sparkles}
            title={names.length ? t("discover.panel.newOshi") : t("discover.panel.newAll")}
            more={user ? "/releases?tab=new" : undefined}
            items={newItems}
            actions={actions}
            meta={(i) => i.content_name ?? ""}
            testId="discovery-new"
          />
          <Strip
            icon={CalendarDays}
            title={names.length ? t("discover.panel.upcomingOshi") : t("discover.panel.upcomingAll")}
            more={user ? "/releases?tab=week" : undefined}
            items={upItems}
            actions={actions}
            meta={(i) => `${t("discover.releases.releaseOn", { date: shortDate(i.release_date) })} · ${i.content_name ?? ""}`}
            testId="discovery-upcoming"
          />
          {top && (
            <Strip
              icon={Flame}
              title={t("discover.panel.popular", { content: top })}
              items={popItems}
              actions={actions}
              meta={(i) => t("discover.panel.owners", { n: ownersOf.get(i.id) ?? 0 })}
              testId="discovery-popular"
            />
          )}
        </>
      )}
      {actions.detail}
    </section>
  );
}

function Strip({
  icon: Icon,
  title,
  items,
  actions,
  meta,
  more,
  testId,
}: {
  icon: LucideIcon;
  title: string;
  items: ReleaseItem[];
  actions: ReleaseActions;
  meta: (i: ReleaseItem) => string;
  more?: string;
  testId: string;
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  if (items.length === 0) return null;
  return (
    <div className="space-y-2" data-testid={testId}>
      <div className="flex items-center gap-1.5">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        <h3 className="min-w-0 flex-1 truncate text-sm font-bold">{title}</h3>
        {more && (
          <button type="button" onClick={() => navigate(more)} className="inline-flex shrink-0 items-center text-xs font-medium text-primary hover:underline">
            {t("discover.panel.more")}
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-hide snap-x">
        {items.map((item) => (
          <ReleaseGoodsTile key={item.id} item={item} actions={actions} meta={meta(item)} className="w-28 shrink-0 snap-start" />
        ))}
      </div>
    </div>
  );
}
