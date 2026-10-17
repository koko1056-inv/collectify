import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { DAILY_RING_KEY, DAILY_RING_OPEN_EVENT, useDailyRing } from "@/hooks/useDailyRing";
import { Pocke } from "@/components/pocke/Pocke";
import { POCKE_CHEER_EVENT, pockeCheer } from "@/components/pocke/pockeCheer";
import { DailyRingSheet } from "./DailyRingSheet";
import { PockeRing } from "./PockeRing";

const CONFETTI = ["bg-primary", "bg-points", "bg-info", "bg-success"];

/**
 * 今日のポッケリングの係（App に1つ）。
 * - 何かしたあと（画面の移動・ポッケの「やったね」）にリングを読み直す（サーバーがそのときに今日の分を数える）
 * - 3つそろった瞬間に、リングが閉じるお祝いを出す（+10pt）。お休みの日を使ったら、ポッケが知らせる
 * - どこからでも openDailyRing() でリングの画面を開ける
 */
export function DailyRingHost() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { pathname } = useLocation();
  const { data: ring } = useDailyRing();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const handled = useRef<string>("");

  // 画面を移ったら読み直す（投稿・お世話・交換の申し込みなど、ポッケの「やったね」が出ない操作も拾う）
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!user) return;
    const id = window.setTimeout(() => queryClient.invalidateQueries({ queryKey: [DAILY_RING_KEY] }), 800);
    return () => window.clearTimeout(id);
  }, [pathname, user, queryClient]);

  useEffect(() => {
    let timer: number | undefined;
    const refresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => queryClient.invalidateQueries({ queryKey: [DAILY_RING_KEY] }), 1200);
    };
    const open = () => setSheetOpen(true);
    window.addEventListener(POCKE_CHEER_EVENT, refresh);
    window.addEventListener(DAILY_RING_OPEN_EVENT, open);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(POCKE_CHEER_EVENT, refresh);
      window.removeEventListener(DAILY_RING_OPEN_EVENT, open);
    };
  }, [queryClient]);

  // 完成・お休みの日は、返ってきた1回だけ知らせる（同じ答えを読み直しても二度出さない）
  useEffect(() => {
    if (!ring) return;
    const sig = `${ring.today}:${ring.just_completed}:${ring.freezes_used}`;
    if (handled.current === sig) return;
    handled.current = sig;
    if (ring.just_completed) {
      setCelebrate(true);
      queryClient.invalidateQueries({ queryKey: ["userPoints"] });
    } else if (ring.freezes_used > 0) {
      pockeCheer("freezeUsed", ring.freezes_used);
    }
  }, [ring, queryClient]);

  const pieces = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        left: (i * 37) % 100,
        delay: (i % 7) * 0.12,
        rotate: (i * 53) % 360,
        color: CONFETTI[i % CONFETTI.length],
      })),
    []
  );

  if (!user || !ring) return null;

  return (
    <>
      <DailyRingSheet ring={ring} open={sheetOpen} onOpenChange={setSheetOpen} />

      <Dialog open={celebrate} onOpenChange={setCelebrate}>
        <DialogContent className="max-w-sm overflow-hidden rounded-3xl p-0 [&>button]:hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-56 overflow-hidden" aria-hidden="true">
            {pieces.map((p, i) => (
              <span
                key={i}
                className={`absolute top-0 h-2.5 w-1.5 rounded-sm ${p.color} motion-safe:animate-[pocke-confetti_1.8s_ease-in_forwards]`}
                style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, transform: `rotate(${p.rotate}deg)` }}
              />
            ))}
          </div>
          <div className="flex flex-col items-center bg-gradient-to-b from-primary/10 to-background px-6 pb-6 pt-8 text-center">
            <PockeRing done={[true, true, true]} size={200} stroke={16} className="motion-safe:animate-pocke-pop">
              <Pocke pose="celebrate" height={120} motion="pop" alt={t("pocke.name")} />
            </PockeRing>
            <DialogTitle className="mt-4 text-2xl font-black">{t("pocke.ring.celebrateTitle")}</DialogTitle>
            <DialogDescription className="mt-1 text-sm">{t("pocke.ring.celebrateBody")}</DialogDescription>
            <div className="mt-3 flex items-center gap-3">
              <span className="rounded-full bg-points-soft px-3 py-1 text-sm font-black text-points">
                {t("pocke.ring.celebratePoints", { n: ring.bonus })}
              </span>
              <span className="flex items-center gap-1 text-sm font-bold">
                <Flame className="h-4 w-4 text-warning" aria-hidden />
                {t("pocke.ring.streak", { n: ring.streak })}
              </span>
            </div>
            <Button className="mt-5 w-full rounded-full" size="lg" onClick={() => setCelebrate(false)}>
              {t("pocke.ring.celebrateClose")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
