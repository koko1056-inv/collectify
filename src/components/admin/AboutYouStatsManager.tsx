import { useQuery } from "@tanstack/react-query";
import { BarChart3, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDateFormat } from "@/hooks/useDateFormat";
import { PREFECTURES } from "@/lib/profileExtras";
import {
  formatRate,
  toAggregateView,
  type AggregateField,
  type AggregateFieldView,
  type AggregateView,
} from "@/lib/profileExtrasAggregate";

// 選択肢の文言は「あなたのこと」の画面と同じ翻訳を使う
const OPTION_KEY: Record<Exclude<AggregateField, "prefecture">, string> = {
  gender: "aboutYou.gender",
  age_range: "aboutYou.age",
  oshi_years: "aboutYou.oshiYears",
  monthly_budget: "aboutYou.budget",
  goods_types: "aboutYou.goodsTypes",
  trade_frequency: "aboutYou.trade",
};

const PREFECTURE_BY_CODE = new Map(PREFECTURES.map((p) => [p.code, p]));

// 関数の中の管理者チェック（RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'）に当たった
function isForbidden(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const { code, message } = e as { code?: unknown; message?: unknown };
  return code === "42501" || message === "forbidden";
}

/**
 * 運営向け「あなたのこと」回答の集計。
 * public.profile_private_aggregate()（管理者だけ実行できる）を呼び、選択肢ごとの人数と回答率だけを出す。
 * 5人未満の数は DB 側でまとめる・伏せる。画面側でも toAggregateView がもう一度確かめる。
 */
export function AboutYouStatsManager() {
  const { t, language } = useLanguage();
  const { formatShortDateTime } = useDateFormat();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-about-you-stats"],
    queryFn: async (): Promise<AggregateView> => {
      const { data, error } = await supabase.rpc("profile_private_aggregate");
      if (error) throw error;
      const view = toAggregateView(data);
      if (!view) throw new Error("unexpected profile_private_aggregate response");
      return view;
    },
    staleTime: 5 * 60 * 1000,
  });

  const k = data?.k ?? 5;
  const optionLabel = (field: AggregateField, value: string) => {
    if (field === "prefecture") {
      const p = PREFECTURE_BY_CODE.get(value);
      return p ? (language === "en" ? p.en : p.ja) : value;
    }
    return t(`${OPTION_KEY[field]}.${value}`);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        {/* 狭い画面では題名を1行のまま、「更新」を次の行へ回す（題名を窮屈に折り返さない） */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 shrink-0 text-primary" />
            {t("aboutYou.admin.title")}
          </CardTitle>
          <Button size="sm" variant="outline" className="h-8 shrink-0 gap-1.5" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {t("aboutYou.admin.refresh")}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{t("aboutYou.admin.desc", { k })}</p>
        {data?.generatedAt && (
          <p className="text-xs text-muted-foreground">
            {t("aboutYou.admin.generatedAt", { at: formatShortDateTime(data.generatedAt) })}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : isError || !data ? (
          <QueryErrorState
            title={t(isForbidden(error) ? "aboutYou.admin.forbidden" : "aboutYou.admin.loadFailed")}
            onRetry={() => refetch()}
          />
        ) : data.suppressed ? (
          <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            {t("aboutYou.admin.allSuppressed", { k })}
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label={t("aboutYou.admin.targetUsers")} value={data.targetUsers} rate={null} k={k} />
              <Stat label={t("aboutYou.admin.respondents")} value={data.respondents} rate={data.respondentRate} k={k} />
              <Stat label={t("aboutYou.admin.anyAnswered")} value={data.anyAnswered} rate={data.anyAnsweredRate} k={k} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {data.fields.map((f) => (
                <FieldBlock key={f.field} f={f} k={k} optionLabel={optionLabel} />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, rate, k }: { label: string; value: number | null; rate: number | null; k: number }) {
  const { t } = useLanguage();
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tabular-nums">
        {value === null ? t("aboutYou.admin.lessThanK", { k }) : value.toLocaleString()}
      </p>
      {rate !== null && <p className="text-xs text-muted-foreground tabular-nums">{formatRate(rate)}</p>}
    </div>
  );
}

function FieldBlock({
  f,
  k,
  optionLabel,
}: {
  f: AggregateFieldView;
  k: number;
  optionLabel: (field: AggregateField, value: string) => string;
}) {
  const { t } = useLanguage();
  return (
    <section className="rounded-lg border bg-background p-3" aria-label={t(`aboutYou.admin.fields.${f.field}`)}>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-2">
        <h3 className="text-sm font-semibold">{t(`aboutYou.admin.fields.${f.field}`)}</h3>
        {!f.suppressed && f.answered !== null && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {t("aboutYou.admin.answered", { n: f.answered.toLocaleString(), rate: formatRate(f.answeredRate) })}
          </span>
        )}
      </div>
      {f.suppressed ? (
        <p className="text-xs text-muted-foreground">{t("aboutYou.admin.fieldSuppressed", { k })}</p>
      ) : (
        <ul className="space-y-1.5">
          {f.buckets.map((b) => (
            <Bar key={b.value} label={optionLabel(f.field, b.value)} count={b.count} share={b.share} />
          ))}
          {f.other && <Bar label={t("aboutYou.admin.other")} count={f.other.count} share={f.other.share} muted />}
          {f.otherHidden && <li className="text-xs text-muted-foreground">{t("aboutYou.admin.otherHidden", { k })}</li>}
          {/* 注記はカードの下にまとめる（ラベルは短く保つ） */}
          {f.other && <li className="text-2xs text-muted-foreground">{t("aboutYou.admin.otherNote", { k })}</li>}
          {f.field === "goods_types" && <li className="text-2xs text-muted-foreground">{t("aboutYou.admin.multiNote")}</li>}
        </ul>
      )}
    </section>
  );
}

function Bar({ label, count, share, muted }: { label: string; count: number; share: number | null; muted?: boolean }) {
  const { t } = useLanguage();
  const pct = share === null ? 0 : Math.min(100, Math.max(0, share * 100));
  return (
    <li className="text-xs">
      <div className="flex items-baseline justify-between gap-2">
        <span className={muted ? "text-muted-foreground" : undefined}>{label}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {t("aboutYou.admin.people", { n: count.toLocaleString() })} · {formatRate(share)}
        </span>
      </div>
      <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className={`h-full rounded-full ${muted ? "bg-muted-foreground/40" : "bg-primary"}`} style={{ width: `${pct}%` }} />
      </div>
    </li>
  );
}
