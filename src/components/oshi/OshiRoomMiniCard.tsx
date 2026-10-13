import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Check, ChevronRight, Crown, Heart, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { IconTile } from "@/components/ui/icon-tile";
import { RoomScene } from "@/components/oshi/room/RoomScene";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompanions } from "@/hooks/useOshi";
import { useProfileOshiRoom } from "@/hooks/useOshiRoom";
import { nextCare, roomStateFrom, sceneGoodsMap, useOshiRoomLikes } from "@/hooks/useOshiRoomSocial";
import { timeOfDayJst } from "@/lib/oshiRoom";
import { levelFromXp, todayJst } from "@/utils/companion";
import { cn } from "@/lib/utils";

/**
 * コレクション画面のいちばん上に置く、自分の推しの部屋の小さな窓。
 * 推しの部屋（/oshi）はマイページの奥にあって気づかれにくく、毎日のお世話も忘れられがちだった。
 * 毎日開くコレクション画面に「部屋の見本・今日のお世話の残り・なかよしLv・もらったいいね」を出し、タップで部屋へ行けるようにする。
 *  - お世話の残りは「いちばん手前（順位の高い）の、まだ済んでいない推し」の分を n/3 で出す
 *    （全員分を合計すると「7/15」のように分母が変わって分かりにくい）。その推しが「なでてほしそう」などと一言
 *  - 全員済んでいれば「今日のお世話完了」
 *  - 推しグッズが0のときは、部屋の見本の代わりに「推しを飾ろう」の誘い
 * 部屋の絵は動かない小さな見本（RoomScene の thumb）で、重くしない
 */
export function OshiRoomMiniCard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const reduceMotion = !!useReducedMotion();
  const companions = useCompanions();
  const room = useProfileOshiRoom(user?.id);
  const likes = useOshiRoomLikes(user?.id);

  const list = useMemo(() => companions.data ?? [], [companions.data]);
  const ids = useMemo(() => list.map((c) => c.user_item_id), [list]);
  const goods = useMemo(() => sceneGoodsMap(list.map((c) => ({ ...c, level: levelFromXp(c.xp) }))), [list]);
  const state = useMemo(
    () => roomStateFrom(room.data?.wallpaper, room.data?.floor, room.data?.layout ?? null, ids),
    [room.data, ids]
  );

  if (!user) return null;
  if (companions.isLoading || room.isLoading) return <Skeleton className="h-[7.5rem] w-full rounded-2xl" />;
  // 読めなかったときは何も出さない（コレクションの画面を止めない）
  if (companions.isError) return null;

  // 推しグッズがまだ無い: 誘いの1行
  if (list.length === 0) {
    return (
      <button
        type="button"
        onClick={() => navigate("/oshi")}
        className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-primary/30 bg-card p-3 text-left transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        data-testid="oshi-mini-empty"
      >
        <IconTile tone="primary" size="md">
          <Star />
        </IconTile>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">{t("oshiRoom.social.mini.emptyTitle")}</span>
          <span className="block text-2xs leading-relaxed text-muted-foreground">{t("oshiRoom.social.mini.emptyDesc")}</span>
        </span>
        <span className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">{t("oshiRoom.social.mini.emptyCta")}</span>
      </button>
    );
  }

  const today = todayJst();
  const next = nextCare(list, today);
  const bondTotal = list.reduce((sum, c) => sum + levelFromXp(c.xp), 0);
  const likeCount = likes.data?.likes ?? 0;
  const status = next ? t(`oshiRoom.social.mini.wants.${next.action}`, { name: next.target.title }) : t("oshiRoom.social.mini.careDone");

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background p-0 shadow-sm" data-testid="oshi-mini">
      <button
        type="button"
        onClick={() => navigate(next ? `/oshi?item=${encodeURIComponent(next.target.user_item_id)}` : "/oshi")}
        className="flex w-full items-stretch gap-3 p-2.5 text-left transition-colors hover:bg-accent/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        aria-label={t("oshiRoom.social.mini.aria", { status })}
      >
        <div className="w-[5.5rem] shrink-0">
          <RoomScene state={state} goods={goods} oshi={room.data?.oshiColor ?? "pink"} time={timeOfDayJst()} mode="readonly" reduceMotion thumb className="rounded-xl shadow-none" label={t("oshiRoom.roomAria")} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5 py-0.5">
          <div className="flex items-center gap-1">
            <span className="text-2xs font-bold text-muted-foreground">{t("oshiRoom.social.mini.title")}</span>
            <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </div>
          {/* お世話が残っているときは、その推しの一言を目立たせる（ハートが小さく弾む）。済んでいれば落ち着いた完了の印 */}
          {next ? (
            <p className="flex min-w-0 items-center gap-1.5 text-sm font-bold">
              <motion.span
                className="inline-flex shrink-0"
                animate={reduceMotion ? undefined : { scale: [1, 1.18, 1] }}
                transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 1.2 }}
                aria-hidden="true"
              >
                <Heart className="h-4 w-4 fill-primary text-primary" />
              </motion.span>
              {/* 名前が長いと「〜がなでてほしそう」が切れてしまうので、名前だけを省略する */}
              <span className="flex min-w-0" aria-hidden="true">
                <span className="truncate">{next.target.title}</span>
                <span className="shrink-0 whitespace-pre">{t(`oshiRoom.social.mini.wantsTail.${next.action}`)}</span>
              </span>
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-sm font-bold">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground" aria-hidden="true">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              <span className="line-clamp-1">{status}</span>
            </p>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            {next ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-2xs font-bold text-primary">
                <span className="flex gap-0.5" aria-hidden="true">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className={cn("h-1.5 w-1.5 rounded-full", i < next.done ? "bg-primary" : "bg-primary/25")} />
                  ))}
                </span>
                <span className="tabular-nums">{t("oshiRoom.social.mini.care", { done: next.done })}</span>
              </span>
            ) : (
              <span className="text-2xs text-muted-foreground">{t("oshiRoom.social.mini.careDoneLine")}</span>
            )}
            <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-2xs font-bold">
              <Crown className="h-3 w-3 text-points" />
              <span className="tabular-nums">{t("oshiRoom.social.mini.bond", { n: bondTotal })}</span>
            </span>
            <span className={cn("inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-2xs font-bold", likeCount > 0 && "text-primary")}>
              <Heart className={cn("h-3 w-3", likeCount > 0 && "fill-primary")} />
              <span className="tabular-nums">{t("oshiRoom.social.mini.likes", { n: likeCount })}</span>
            </span>
          </div>
        </div>
      </button>
    </Card>
  );
}
