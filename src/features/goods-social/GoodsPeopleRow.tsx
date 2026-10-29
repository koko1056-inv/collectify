import { useState } from "react";
import { Check, ChevronRight, Heart, Package, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Pocke } from "@/components/pocke/Pocke";
import { useLanguage } from "@/contexts/LanguageContext";
import { fallbackToOriginal, getAvatarImageUrl } from "@/utils/optimized-image";
import { useGoodsPeopleSummary, type GoodsFace, type GoodsPeopleKind } from "./useGoodsSocial";
import { GoodsPeopleSheet } from "./GoodsPeopleSheet";

interface GoodsPeopleRowProps {
  itemId: string;
  itemTitle: string;
  className?: string;
}

/**
 * グッズのページの「持ってる人 12人」「ほしい人 5人」。重なったアイコン + 人数の 2 つのボタン。
 * 押すと一覧（スマホは下から出るシート、PC はダイアログ）をひらく。
 * 人数は全員（名前を出していない人も名前なしで入る）、アイコンは名前を出している人だけ。
 */
export function GoodsPeopleRow({ itemId, itemTitle, className }: GoodsPeopleRowProps) {
  const { t } = useLanguage();
  const { data: summary, isLoading } = useGoodsPeopleSummary(itemId);
  const [openTab, setOpenTab] = useState<GoodsPeopleKind | null>(null);

  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-2 gap-2", className)} aria-hidden="true">
        <Skeleton className="h-[5.5rem] rounded-2xl" />
        <Skeleton className="h-[5.5rem] rounded-2xl" />
      </div>
    );
  }
  // 関数がまだ無い環境・読めなかったときは、行ごと出さない（ほかの情報の邪魔をしない）
  if (!summary) return null;

  const nobody = summary.owners_count === 0 && summary.wishers_count === 0;

  return (
    <>
      {nobody ? (
        <div
          className={cn(
            "flex min-h-[5.5rem] items-center gap-3 rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-3 py-2",
            className,
          )}
          data-testid="goods-people-empty"
        >
          <Pocke pose="point" height={40} loading="lazy" />
          <p className="text-sm text-foreground/80">{t("goodsSocial.people.ownersEmpty")}</p>
        </div>
      ) : (
        <div className={cn("grid grid-cols-2 gap-2", className)} data-testid="goods-people-row">
          <PeoplePill
            kind="owners"
            count={summary.owners_count}
            faces={summary.owner_faces}
            mine={
              summary.me_owns
                ? summary.me_for_trade
                  ? t("goodsSocial.people.youOwnForTrade")
                  : t("goodsSocial.people.youOwn")
                : null
            }
            onOpen={() => setOpenTab("owners")}
          />
          <PeoplePill
            kind="wishers"
            count={summary.wishers_count}
            faces={summary.wisher_faces}
            mine={summary.me_wishes ? t("goodsSocial.people.youWish") : null}
            onOpen={() => setOpenTab("wishers")}
          />
        </div>
      )}

      <GoodsPeopleSheet
        open={openTab !== null}
        onOpenChange={(o) => !o && setOpenTab(null)}
        itemId={itemId}
        itemTitle={itemTitle}
        tab={openTab ?? "owners"}
        onTabChange={setOpenTab}
        summary={summary}
      />
    </>
  );
}

function PeoplePill({
  kind,
  count,
  faces,
  mine,
  onOpen,
}: {
  kind: GoodsPeopleKind;
  count: number;
  faces: GoodsFace[];
  /** 自分も持ってる・ほしいときの一言（ほかの人とは別に、色を変えて出す） */
  mine: string | null;
  onOpen: () => void;
}) {
  const { t } = useLanguage();
  const owners = kind === "owners";
  const Icon = owners ? Package : Heart;
  const label = owners ? t("goodsSocial.people.owners") : t("goodsSocial.people.wishers");
  const empty = count === 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t(owners ? "goodsSocial.people.ownersAria" : "goodsSocial.people.wishersAria", { count })}
      className={cn(
        // 上: アイコンと「>」、下: 「持ってる人 12人」と「あなたも」。狭い画面でも折り返さない縦の並び
        "group flex min-h-[5.5rem] min-w-0 flex-col justify-between gap-1.5 rounded-2xl border bg-card px-3 py-2.5 text-left transition-colors",
        "hover:border-primary/40 hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        mine ? "border-primary/40" : "border-border",
      )}
    >
      <span className="flex w-full items-center justify-between gap-2">
        {faces.length > 0 ? (
          <AvatarStack faces={faces} max={4} size="h-7 w-7" />
        ) : (
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
              owners ? "bg-primary/10 text-primary" : "bg-info/10 text-info",
            )}
            aria-hidden="true"
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
        <ChevronRight
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-safe:group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </span>
      <span className="block min-w-0 w-full">
        <span className="flex min-w-0 items-baseline gap-1.5 whitespace-nowrap">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className={cn("text-base font-bold tabular-nums leading-tight", empty && "text-muted-foreground")}>
            {t("goodsSocial.people.count", { count })}
          </span>
        </span>
        {mine ? (
          <span className="mt-0.5 flex min-w-0 items-center gap-0.5 text-2xs font-medium text-primary">
            <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{mine}</span>
          </span>
        ) : (
          empty && (
            <span className="mt-0.5 block truncate text-2xs text-muted-foreground">
              {owners ? t("goodsSocial.people.firstOwner") : t("goodsSocial.people.firstWisher")}
            </span>
          )
        )}
      </span>
    </button>
  );
}

/** 重なったアイコン（先頭の数人）。名前は読み上げない（ボタンのラベルに人数がある） */
export function AvatarStack({ faces, max = 4, size = "h-8 w-8" }: { faces: GoodsFace[]; max?: number; size?: string }) {
  const shown = faces.slice(0, max);
  return (
    <span className="flex shrink-0 -space-x-2" aria-hidden="true">
      {shown.map((f, i) => {
        const name = f.display_name || f.username || "";
        return (
          <Avatar key={f.id} className={cn(size, "ring-2 ring-card")} style={{ zIndex: shown.length - i }}>
            <AvatarImage src={getAvatarImageUrl(f.avatar_url, 64)} onError={fallbackToOriginal(f.avatar_url)} alt="" />
            <AvatarFallback className="text-2xs">
              {name ? name[0] : <UserRound className="h-3.5 w-3.5" />}
            </AvatarFallback>
          </Avatar>
        );
      })}
    </span>
  );
}
