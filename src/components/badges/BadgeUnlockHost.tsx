import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { BADGE_STATS_KEY, useBadgeStats } from "@/hooks/useBadgeStats";
import { Pocke } from "@/components/pocke/Pocke";
import { POCKE_CHEER_EVENT } from "@/components/pocke/pockeCheer";
import { BADGES, badgeTier, type BadgeDef } from "./badgeDefs";
import { BadgeMedal } from "./BadgeMedal";

const seenKey = (uid: string) => `badge_tiers_${uid}`;

function readSeen(uid: string): Record<string, number> | null {
  try {
    const raw = localStorage.getItem(seenKey(uid));
    return raw ? (JSON.parse(raw) as Record<string, number>) : null;
  } catch {
    return null;
  }
}

function writeSeen(uid: string, seen: Record<string, number>) {
  try {
    localStorage.setItem(seenKey(uid), JSON.stringify(seen));
  } catch {
    /* 保存できなくても、この画面では出し直さない */
  }
}

/**
 * 新しいバッジ（段が上がった）を知らせる係（App に1つ）。
 * 見た段はこの端末に覚えておき、上がったときだけメダルとポッケを出す。はじめて開いたときは、いまの段を覚えるだけ（いっぺんに出さない）。
 * ほかのお祝い（コンプ・リング完成）が開いているあいだは待つ
 */
export function BadgeUnlockHost() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { pathname } = useLocation();
  const { data: stats } = useBadgeStats(user?.id);
  const [queue, setQueue] = useState<{ def: BadgeDef; tier: number }[]>([]);
  const [shown, setShown] = useState<{ def: BadgeDef; tier: number } | null>(null);

  // 何かしたあと（ポッケの「やったね」・画面の移動）に数え直す
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!user) return;
    const id = window.setTimeout(() => queryClient.invalidateQueries({ queryKey: [BADGE_STATS_KEY, user.id] }), 1500);
    return () => window.clearTimeout(id);
  }, [pathname, user, queryClient]);
  useEffect(() => {
    if (!user) return;
    let timer: number | undefined;
    const refresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => queryClient.invalidateQueries({ queryKey: [BADGE_STATS_KEY, user.id] }), 2000);
    };
    window.addEventListener(POCKE_CHEER_EVENT, refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(POCKE_CHEER_EVENT, refresh);
    };
  }, [user, queryClient]);

  // 上がった段を並べる
  useEffect(() => {
    if (!user || !stats) return;
    const seen = readSeen(user.id);
    const now: Record<string, number> = {};
    for (const def of BADGES) now[def.key] = badgeTier(def, stats);
    if (!seen) {
      writeSeen(user.id, now);
      return;
    }
    const ups = BADGES.filter((def) => now[def.key] > (seen[def.key] ?? 0)).map((def) => ({ def, tier: now[def.key] }));
    // 下がったもの（グッズを消したなど）は下げずに覚えておく（もう一度上がっても二度は祝わない）
    const merged: Record<string, number> = { ...seen };
    for (const def of BADGES) merged[def.key] = Math.max(seen[def.key] ?? 0, now[def.key]);
    writeSeen(user.id, merged);
    if (ups.length > 0) setQueue((q) => [...q, ...ups.filter((u) => !q.some((x) => x.def.key === u.def.key))]);
  }, [user, stats]);

  // ほかのダイアログが開いていないときに、1つずつ出す
  useEffect(() => {
    if (shown || queue.length === 0) return;
    const tryShow = () => {
      if (document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]')) return false;
      setShown(queue[0]);
      setQueue((q) => q.slice(1));
      return true;
    };
    if (tryShow()) return;
    const id = window.setInterval(() => {
      if (tryShow()) window.clearInterval(id);
    }, 1500);
    return () => window.clearInterval(id);
  }, [queue, shown]);

  if (!user || !shown) return null;
  const name = t(`badges.names.${shown.def.key}`);
  const tierName = t(`badges.tier.${shown.tier}`);

  return (
    <Dialog open onOpenChange={(o) => !o && setShown(null)}>
      <DialogContent className="max-w-sm overflow-hidden rounded-3xl p-0 [&>button]:hidden">
        <div className="flex flex-col items-center bg-gradient-to-b from-points/15 to-background px-6 pb-6 pt-8 text-center">
          <div className="flex items-end gap-1">
            <Pocke pose="cheer" height={110} motion="pop" alt={t("pocke.name")} />
            <BadgeMedal def={shown.def} tier={shown.tier} size={104} isNew className="-ml-2 mb-2" />
          </div>
          <DialogTitle className="mt-4 text-2xl font-black">{t("badges.newTitle")}</DialogTitle>
          <DialogDescription className="mt-1 text-sm">{t("badges.newBody", { name, tier: tierName })}</DialogDescription>
          <p className="mt-1 text-xs text-muted-foreground">{t(`badges.desc.${shown.def.key}`, { n: shown.def.tiers[shown.tier - 1] })}</p>
          <Button className="mt-5 w-full rounded-full" size="lg" onClick={() => setShown(null)}>
            {t("badges.newClose")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
