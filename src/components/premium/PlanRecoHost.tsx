import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Pocke, PockeBubble, type PockePose } from "@/components/pocke/Pocke";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { useUserPoints } from "@/hooks/usePoints";
import { useCollectionCount } from "@/hooks/useCollectionLimit";
import { useProfile } from "@/hooks/useProfile";
import { useProfilePrivate } from "@/hooks/useProfilePrivate";
import { usePlanRecoAudience } from "@/hooks/usePlanRecoAudience";
import { tourForLocation } from "@/components/onboarding/tours";
import { claimNudgeSlot, isOverlayOpen } from "@/lib/nudgeSlot";
import { PLAN_PRICES_JPY } from "@/lib/planLimits";
import {
  crossedLowBalance,
  crossedMilestone,
  decidePlanReco,
  isActiveEnough,
  isPlanRecoAudience,
  markOptedOut,
  markShown,
  markSnoozed,
  recordActiveDay,
  suggestedPlan,
  type PlanRecoTrigger,
} from "@/lib/planReco";
import { PaywallModal } from "./PaywallModal";
import { PlanPerkList } from "./PlanPerkList";
import { PLAN_PAYWALL_EVENT, PLAN_RECO_EVENT, loadPlanRecoState, savePlanRecoState, type PlanRecoRequest } from "./planRecoEvents";

/** きっかけのあと、これだけ待ってから出す（直前の操作の結果を先に見てもらう） */
const SETTLE_MS = 1500;
/** ほかのシート・ダイアログが開いていたら、閉じるまでこの間隔で待つ */
const RETRY_MS = 1500;
/** 待ちきれなかったきっかけは捨てる（だいぶ後になって唐突に出さない） */
const PENDING_TTL_MS = 2 * 60 * 1000;

const milestoneKey = (uid: string) => `plan_reco_milestone_${uid}`;
const activeDaysKey = (uid: string) => `plan_reco_days_${uid}`;

type SheetTrigger = Exclude<PlanRecoTrigger, "onboarding">;

const COPY: Record<SheetTrigger, { pose: PockePose; title: string; desc: string }> = {
  lowBalance: { pose: "think", title: "planReco.sheet.lowBalanceTitle", desc: "planReco.sheet.lowBalanceDesc" },
  insufficient: { pose: "think", title: "planReco.sheet.insufficientTitle", desc: "planReco.sheet.insufficientDesc" },
  milestone: { pose: "celebrate", title: "planReco.sheet.milestoneTitle", desc: "planReco.sheet.milestoneDesc" },
  activeDays: { pose: "love", title: "planReco.sheet.activeDaysTitle", desc: "planReco.sheet.activeDaysDesc" },
};

/**
 * サブスク（プレミアム / プレミアム+）のやさしいおすすめ（下から出る小さなシート。App に1つ）。
 *
 * きっかけ:
 *   - lowBalance: ポイントを使って、残高が LOW_BALANCE_THRESHOLD を下回った
 *   - insufficient: ポイントが足りなくて使えなかった（requestPlanReco で知らせてもらう）
 *   - milestone: コレクションが節目（COLLECTION_MILESTONES）に届いた
 *   - activeDays: はじめて使ってから7日以上・5日以上開いてくれた（1回きり）
 * 出すかどうか・間隔は src/lib/planReco.ts の decidePlanReco がすべて決める
 * （契約中・サンプル・アプリ内・ウェルカム中は出さない／3日に1回まで／「あとで」で7日休む／「もう表示しない」）。
 * 購入は既存の PaywallModal（Stripe Checkout）に任せる。ここでは決済をしない。
 */
export function PlanRecoHost() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const uid = user?.id;
  const { pathname, search } = useLocation();
  const audience = usePlanRecoAudience();
  const isAudience = isPlanRecoAudience(audience);
  const { onboardingState, isInitialized, shouldShowTour } = useOnboarding();
  const welcomeDone = isInitialized && onboardingState.hasCompletedWelcome;
  const { data: points } = useUserPoints();
  const { data: count } = useCollectionCount();
  const { profile } = useProfile(uid);
  // 予算の答えで、はじめに選んでおくプランを決める（答えていなければプレミアム）
  const { data: priv } = useProfilePrivate({ enabled: isAudience && welcomeDone });

  const [pending, setPending] = useState<{ trigger: SheetTrigger; n?: number; at: number } | null>(null);
  const [shown, setShown] = useState<{ trigger: SheetTrigger; n?: number } | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);

  // きっかけの判断に使う最新の値（イベントの受け口を作り直さずに読む）
  const latest = useRef({ audience, welcomeDone, tourPending: false });
  const tour = tourForLocation(pathname, search);
  // この画面の操作ガイドがこれから出る・はじめてガイドの案内中（?guide=）なら、そちらを先にする
  const guiding = new URLSearchParams(search).has("guide");
  latest.current = { audience, welcomeDone, tourPending: guiding || (!!tour && shouldShowTour(tour.id)) };

  const offer = useCallback(
    (trigger: SheetTrigger, n?: number) => {
      if (!uid) return;
      const d = decidePlanReco({
        audience: latest.current.audience,
        welcomeDone: latest.current.welcomeDone,
        state: loadPlanRecoState(uid),
        trigger,
        now: Date.now(),
      });
      if (!d.show) return;
      // 先に来たきっかけを優先する（続けて来ても1つだけ）
      setPending((p) => p ?? { trigger, n, at: Date.now() });
    },
    [uid]
  );

  // ── ユーザーが変わったら、数え直しの基準を捨てる ──
  const prevBalance = useRef<number | null>(null);
  const activeOffered = useRef<string | null>(null);
  useEffect(() => {
    prevBalance.current = null;
    setPending(null);
    setShown(null);
  }, [uid]);

  // ── 残高が少なくなった（使って減り、しきい値をまたいだときだけ） ──
  const balance = points?.user_id === uid ? points?.total_points ?? null : null;
  useEffect(() => {
    if (balance === null) return;
    if (crossedLowBalance(prevBalance.current, balance)) offer("lowBalance", balance);
    prevBalance.current = balance;
  }, [balance, offer]);

  // ── コレクションの節目（この端末で初めて数えたときは、今の数までを「知っている」にするだけ） ──
  useEffect(() => {
    if (!uid || count === undefined) return;
    let seen: number | null;
    try {
      const raw = localStorage.getItem(milestoneKey(uid));
      seen = raw === null ? null : Number(raw) || 0;
    } catch {
      return;
    }
    const r = crossedMilestone(seen, count);
    if (r.seenMax !== seen) {
      try {
        localStorage.setItem(milestoneKey(uid), String(r.seenMax));
      } catch {
        /* 覚えられない端末では言わない（次の起動でまた「初めて」になるので、節目を言うことはない） */
      }
    }
    if (r.milestone !== null) offer("milestone", r.milestone);
  }, [uid, count, offer]);

  // ── 使った日を数える（開いた日を端末に残す）。そろったら1回だけ「ありがとう」 ──
  const createdAt = profile?.id === uid ? profile?.created_at : undefined;
  useEffect(() => {
    if (!uid || !createdAt || activeOffered.current === uid) return;
    let days: string[] = [];
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(activeDaysKey(uid)) || "[]");
      if (Array.isArray(parsed)) days = parsed.filter((d): d is string => typeof d === "string");
    } catch {
      /* 壊れていたら数え直す */
    }
    const now = Date.now();
    const next = recordActiveDay(days, now);
    try {
      localStorage.setItem(activeDaysKey(uid), JSON.stringify(next));
    } catch {
      /* 覚えられない端末では数えない */
    }
    // おすすめしてよい人か分かってから1回だけ判断する（読み込み中に判断して取りこぼさない）
    if (!isAudience || !welcomeDone) return;
    activeOffered.current = uid;
    if (isActiveEnough(Date.parse(createdAt), next, now)) offer("activeDays");
  }, [uid, createdAt, isAudience, welcomeDone, offer]);

  // ── ほかの画面からのきっかけ（ポイントが足りなかった など） ──
  useEffect(() => {
    const onRequest = (e: Event) => {
      const detail = (e as CustomEvent<PlanRecoRequest>).detail;
      if (!detail || detail.trigger === "onboarding") return;
      offer(detail.trigger, detail.n);
    };
    window.addEventListener(PLAN_RECO_EVENT, onRequest);
    return () => window.removeEventListener(PLAN_RECO_EVENT, onRequest);
  }, [offer]);

  // ── ウェルカムの最後の「プランをくわしく見る」 ──
  const [paywallPlan, setPaywallPlan] = useState<"premium" | "premium_plus" | null>(null);
  useEffect(() => {
    const onOpen = (e: Event) => {
      const plan = (e as CustomEvent<{ plan: "premium" | "premium_plus" }>).detail?.plan ?? "premium";
      setPaywallPlan(plan);
      setPaywallOpen(true);
    };
    window.addEventListener(PLAN_PAYWALL_EVENT, onOpen);
    return () => window.removeEventListener(PLAN_PAYWALL_EVENT, onOpen);
  }, []);

  // ── 待っているきっかけを、ほかのシート・画面ガイドが無いときに出す ──
  useEffect(() => {
    if (!pending || shown || !uid) return;
    let interval: number | undefined;
    const tryShow = (): boolean => {
      if (Date.now() - pending.at > PENDING_TTL_MS) {
        setPending(null);
        return true;
      }
      if (isOverlayOpen() || latest.current.tourPending) return false;
      // 待っているあいだに状況が変わっていないか（契約した・別のきっかけで出した など）をもう一度見る
      const state = loadPlanRecoState(uid);
      const d = decidePlanReco({
        audience: latest.current.audience,
        welcomeDone: latest.current.welcomeDone,
        state,
        trigger: pending.trigger,
        now: Date.now(),
      });
      if (!d.show || !claimNudgeSlot("planReco")) {
        setPending(null);
        return true;
      }
      savePlanRecoState(uid, markShown(state, pending.trigger, Date.now()));
      setShown({ trigger: pending.trigger, n: pending.n });
      setPending(null);
      return true;
    };
    const first = window.setTimeout(() => {
      if (tryShow()) return;
      interval = window.setInterval(() => {
        if (tryShow()) window.clearInterval(interval);
      }, RETRY_MS);
    }, SETTLE_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, [pending, shown, uid]);

  // ── 閉じ方 ──
  const snooze = () => {
    if (uid) savePlanRecoState(uid, markSnoozed(loadPlanRecoState(uid), Date.now()));
    setShown(null);
  };
  const seePlans = () => {
    // プランを見ただけで閉じた人にも、しばらくは出さない
    snooze();
    setPaywallPlan(null);
    setPaywallOpen(true);
  };
  const never = () => {
    if (uid) savePlanRecoState(uid, markOptedOut(loadPlanRecoState(uid)));
    setShown(null);
    toast(t("planReco.sheet.neverDone"));
  };

  const copy = shown ? COPY[shown.trigger] : null;

  return (
    <>
      <Sheet open={!!shown} onOpenChange={(o) => !o && snooze()}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 sm:mx-auto sm:max-w-md"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {copy && (
            <>
              <div className="flex items-end gap-2">
                <Pocke pose={copy.pose} height={120} motion="pop" className="-mb-1 shrink-0" />
                <PockeBubble tail="left" className="mb-5 flex-1">
                  <SheetTitle className="text-base font-bold">{t(copy.title, { n: shown?.n ?? 0 })}</SheetTitle>
                  <SheetDescription className="mt-0.5 text-sm text-foreground">{t(copy.desc)}</SheetDescription>
                </PockeBubble>
              </div>

              <div className="mt-4 rounded-2xl border bg-card p-4">
                <PlanPerkList />
                <p className="mt-3 text-2xs text-muted-foreground">
                  {t("planReco.prices", {
                    premium: PLAN_PRICES_JPY.premium.monthly.toLocaleString(),
                    plus: PLAN_PRICES_JPY.premium_plus.monthly.toLocaleString(),
                  })}
                  {" "}
                  {t("planReco.perks.keepNote")}
                </p>
              </div>

              {/* 「あとで」と「見てみる」は同じ大きさで並べる（押し売りにしない） */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-12 rounded-full text-base font-bold" onClick={snooze}>
                  {t("planReco.sheet.later")}
                </Button>
                <Button className="h-12 rounded-full text-base font-bold" onClick={seePlans}>
                  {t("planReco.sheet.seePlans")}
                </Button>
              </div>
              <button
                type="button"
                onClick={never}
                className="mt-3 w-full py-1 text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                {t("planReco.sheet.never")}
              </button>
            </>
          )}
        </SheetContent>
      </Sheet>
      {isAudience && (
        <PaywallModal
          open={paywallOpen}
          onOpenChange={setPaywallOpen}
          initialPlan={paywallPlan ?? suggestedPlan(priv?.extras.monthly_budget)}
        />
      )}
    </>
  );
}
