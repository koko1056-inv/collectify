import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Boxes, ChevronRight, Home, ReceiptText, Star, Target, Trophy, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCollectionProgress, isComplete } from "@/hooks/useCollectionProgress";
import { useCollectionGoals } from "@/hooks/useCollectionGoals";
import { useCompanions } from "@/hooks/useOshi";
import { levelFromXp, todayJst } from "@/utils/companion";
import { toEntry, totalIn } from "@/utils/spending";
import { formatYen } from "@/utils/preorders";
import { IconTile } from "@/components/ui/icon-tile";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * マイページの上に出す「自分のコレクションの要約」。
 * 以前のマイページは、プロフィールの次に推しの作品・推しグッズ・AI のショーケース（マイステージ）が並び、
 * 自分のコレクションがどうなっているか（何件・どれをコンプしたか）はどこにも出ていなかった。
 * アプリの中心は「登録する → 眺める → コンプ → 交換」なので、マイページでもまずその現在地を見せる。
 *  - 登録: グッズの件数
 *  - コンプ: そろえた作品・シリーズの数（get_collection_progress。コレクション画面と同じ判定）
 *  - 集めるもの: 目標の数（collection_goals。useCollectionGoals）
 *  - 推しの部屋: 飾っている推しグッズの数となかよし Lv の合計。押すと /oshi
 *  - 推し活費: 今月の額（買った値段を入れたグッズ）。押すと /spending（自分だけに見える）
 */
export function MyCollectionSummary({ userId, compact = false }: { userId: string; compact?: boolean }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: progress, isLoading: progressQueryLoading, isError: progressError } = useCollectionProgress(userId);
  // 進捗が読めなかったときは「0」と見せず、「…」のままにする（他の札はそのまま使える）
  const progressLoading = progressQueryLoading || (progressError && !progress);
  const { goals } = useCollectionGoals(userId);
  const companions = useCompanions();

  // コレクション画面と同じキー（["user-items", ...]）で持つので、登録・削除のたびに一緒に読み直される
  const { data: itemCount, isLoading: countLoading } = useQuery({
    queryKey: ["user-items", "summary-count", userId],
    queryFn: async () => {
      const { count, error } = await supabase.from("user_items").select("id", { count: "exact", head: true }).eq("user_id", userId);
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 60_000,
    refetchOnMount: true,
  });

  // 今月の推し活費（["spending", ...] の下に置き、値段を直したら一緒に読み直す）
  const thisMonth = todayJst().slice(0, 7);
  const { data: monthSpend } = useQuery({
    queryKey: ["spending", "summary", userId, thisMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_items")
        .select("purchase_price, purchase_date, created_at, quantity, content_name")
        .eq("user_id", userId)
        .not("purchase_price", "is", null)
        .limit(3000);
      if (error) throw error;
      const entries = (data ?? []).map(toEntry).filter((e): e is NonNullable<typeof e> => !!e);
      return { total: totalIn(entries, thisMonth), any: entries.length > 0 };
    },
    staleTime: 60_000,
  });

  const completeCount = useMemo(() => (progress ?? []).filter(isComplete).length, [progress]);
  const oshiList = companions.data ?? [];
  const bond = oshiList.reduce((sum, c) => sum + levelFromXp(c.xp), 0);

  const stats = [
    { key: "items", icon: Package, label: t("profileScreen.summary.items"), value: itemCount ?? 0, loading: countLoading },
    { key: "complete", icon: Trophy, label: t("profileScreen.summary.complete"), value: completeCount, loading: progressLoading },
    { key: "goals", icon: Target, label: t("profileScreen.summary.goals"), value: goals.length, loading: false },
  ];

  if (compact) {
    // 小さな札3つ（マイページ）。登録の件数は上のプロフィールに出ているので、コンプ・推しの部屋・推し活費だけ。
    // 以前は見出しつきの枠に札3つと2行の入口が並び、約265pxを使っていた
    const tiles = [
      {
        key: "complete",
        testId: "summary-complete",
        title: t("profileScreen.summary.complete"),
        sub: progressLoading ? "…" : `${completeCount.toLocaleString()} · ${t("profileScreen.summary.goals")} ${goals.length}`,
        to: "/collection",
      },
      {
        key: "room",
        testId: "summary-oshi-room",
        title: t("profileScreen.summary.oshiRoom"),
        sub: oshiList.length > 0 ? `Lv ${bond}` : t("oshiRoom.social.mini.emptyCta"),
        to: "/oshi",
      },
      {
        key: "spending",
        testId: "summary-spending",
        title: t("records.spending.entryTitle"),
        sub: monthSpend?.any ? formatYen(monthSpend.total) : "—",
        to: "/spending",
      },
    ];
    return (
      <section className="grid grid-cols-3 gap-2" data-testid="my-collection-summary" aria-label={t("profileScreen.summary.title")}>
        {tiles.map((tile) => (
          <button
            key={tile.key}
            type="button"
            onClick={() => navigate(tile.to)}
            data-testid={tile.testId}
            className="min-w-0 rounded-xl border border-border bg-card px-2.5 py-2 text-left transition-colors hover:bg-muted/50"
          >
            <span className="block truncate text-xs font-bold">{tile.title}</span>
            <span className="block truncate text-2xs text-muted-foreground tabular-nums">{tile.sub}</span>
          </button>
        ))}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4" data-testid="my-collection-summary" aria-label={t("profileScreen.summary.title")}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-bold">
          <Boxes className="h-4 w-4 text-primary" aria-hidden="true" />
          {t("profileScreen.summary.title")}
        </h2>
        <button
          type="button"
          onClick={() => navigate("/collection")}
          className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
        >
          {t("profileScreen.summary.openCollection")}
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => navigate("/collection")}
            className="rounded-xl bg-muted/40 px-2 py-2.5 text-center transition-colors hover:bg-muted/70"
          >
            <s.icon className="mx-auto h-4 w-4 text-muted-foreground" aria-hidden="true" />
            {s.loading ? (
              <Skeleton className="mx-auto mt-1 h-6 w-8" />
            ) : (
              <p className="mt-0.5 text-xl font-bold tabular-nums">{s.value.toLocaleString()}</p>
            )}
            <p className="text-2xs text-muted-foreground">{s.label}</p>
          </button>
        ))}
      </div>

      {/* 推しの部屋（眺める・愛着）。運営が力を入れている場所なので、要約の中に入口を置く */}
      <button
        type="button"
        onClick={() => navigate("/oshi")}
        className="mt-2 flex w-full items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-2.5 text-left transition-colors hover:bg-primary/10"
        data-testid="summary-oshi-room"
      >
        <IconTile tone="primary" size="sm">
          <Home />
        </IconTile>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">{t("profileScreen.summary.oshiRoom")}</span>
          <span className="flex items-center gap-1 text-2xs text-muted-foreground">
            {oshiList.length > 0 ? (
              <>
                <Star className="h-3 w-3" aria-hidden="true" />
                {t("profileScreen.summary.oshiCount", { n: oshiList.length })}
                <span aria-hidden="true">·</span>
                Lv {bond}
              </>
            ) : (
              t("oshiRoom.social.mini.emptyDesc")
            )}
          </span>
        </span>
        <span className="shrink-0 text-xs font-medium text-primary">{t("profileScreen.summary.openRoom")}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>

      {/* 推し活費（自分だけ）。値段を入れたグッズを月ごとに数える */}
      <button
        type="button"
        onClick={() => navigate("/spending")}
        className="mt-2 flex w-full items-center gap-3 rounded-xl border border-border p-2.5 text-left transition-colors hover:bg-muted/50"
        data-testid="summary-spending"
      >
        <IconTile tone="muted" size="sm">
          <ReceiptText />
        </IconTile>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">{t("records.spending.entryTitle")}</span>
          <span className="block text-2xs text-muted-foreground tabular-nums">
            {monthSpend?.any
              ? t("records.spending.entryMonth", { amount: formatYen(monthSpend.total) })
              : t("records.spending.entryEmpty")}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
    </section>
  );
}
