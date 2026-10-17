import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ShareCardDialog, type ShareCardSpec } from "@/components/share/ShareCardDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProfile } from "@/hooks/useProfile";
import { Pocke } from "./Pocke";
import { POCKE_CHEER_EVENT, type PockeCheerDetail } from "./pockeCheer";

interface Completion {
  key: string;
  label: string;
  total: number;
  points: number;
}

/** 紙吹雪の色（テーマの色と、ポイント・成功の色） */
const CONFETTI = ["bg-primary", "bg-points", "bg-success", "bg-info", "bg-warning"];

/**
 * コンプのお祝い。作品・シリーズを全部そろえた瞬間に、ポッケがジャンプして祝う（Duolingo のレッスン完了の画面にあたる）。
 *
 * そろったかどうかはサーバーが登録のたびに確かめて user_completions に1行残す（20261017060000）。
 * ここは「まだ見ていない行」を読んで1つずつお祝いを出し、閉じたら見たことにする。
 * グッズを入れた直後（pockeCheer の added / addedMany / arrived / tradeDone）に読み直すので、その場で出る。
 */
export function PockeCompletionHost() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();
  const { profile } = useProfile(uid);
  const [shareSpec, setShareSpec] = useState<ShareCardSpec | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const unseen = useQuery({
    queryKey: ["pocke-completions", uid],
    enabled: !!uid,
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<Completion[]> => {
      const { data, error } = await supabase
        .from("user_completions")
        .select("key, label, total, points")
        .is("seen_at", null)
        .order("completed_at", { ascending: true })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  // グッズを入れた・届いた・交換で受け取った直後に読み直す（サーバーの確かめが終わるのを少し待つ）
  useEffect(() => {
    if (!uid) return;
    let timer: number | undefined;
    const onCheer = (e: Event) => {
      const kind = (e as CustomEvent<PockeCheerDetail>).detail?.kind;
      if (kind !== "added" && kind !== "addedMany" && kind !== "arrived" && kind !== "tradeDone") return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void qc.invalidateQueries({ queryKey: ["pocke-completions", uid] }), 1500);
    };
    window.addEventListener(POCKE_CHEER_EVENT, onCheer);
    return () => {
      window.removeEventListener(POCKE_CHEER_EVENT, onCheer);
      window.clearTimeout(timer);
    };
  }, [uid, qc]);

  const current = unseen.data?.[0] ?? null;
  // 紙吹雪の位置は開くたびに決める（描き直しのたびに動かないように）
  const pieces = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        left: Math.round(Math.random() * 100),
        delay: Math.random() * 0.6,
        rotate: Math.round(Math.random() * 360),
        color: CONFETTI[i % CONFETTI.length],
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current?.key]
  );

  const markSeen = async (c: Completion) => {
    // 先に画面から消す（次のお祝いがあればすぐ出る）
    qc.setQueryData<Completion[]>(["pocke-completions", uid], (prev) => (prev ?? []).filter((x) => x.key !== c.key));
    const { error } = await supabase.rpc("mark_completions_seen", { _keys: [c.key] });
    if (error) console.error("[PockeCompletionHost] mark seen failed:", error);
  };

  const share = async (c: Completion) => {
    // カードに並べる写真: その作品・シリーズの、自分のグッズ（作品名で合うものから最大6つ）
    let images: string[] = [];
    if (uid) {
      const { data } = await supabase
        .from("user_items")
        .select("image, official_items!user_items_official_item_id_fkey!inner(content_name)")
        .eq("user_id", uid)
        .ilike("official_items.content_name", c.label)
        .not("image", "is", null)
        .order("created_at", { ascending: false })
        .limit(6);
      images = (data ?? []).map((r) => r.image).filter((v): v is string => !!v);
    }
    setShareSpec({
      variant: "series",
      headline: c.label,
      ownerName: profile?.display_name || profile?.username || "Collector",
      owned: c.total,
      total: c.total,
      complete: true,
      images,
      missingLabel: t("engage.share.missing"),
      completeLabel: t("engage.collection.complete"),
      collectedLabel: t("engage.share.collected"),
      shareText: t("engage.share.textComplete", { series: c.label }),
    });
    setShareOpen(true);
    void markSeen(c);
  };

  return (
    <>
      <Dialog open={!!current && !shareOpen} onOpenChange={(o) => !o && current && void markSeen(current)}>
        {current && (
          <DialogContent className="max-w-sm overflow-hidden rounded-3xl p-0 [&>button]:hidden">
            {/* 紙吹雪（動きを減らす設定の人には落とさない） */}
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
              <Pocke key={current.key} pose="celebrate" height={170} motion="pop" alt={t("pocke.name")} />
              <DialogTitle className="mt-2 text-2xl font-extrabold text-primary">{t("pocke.complete.title")}</DialogTitle>
              <DialogDescription className="mt-1 text-sm text-foreground">
                {t("pocke.complete.desc", { label: current.label, n: current.total })}
              </DialogDescription>
              {current.points > 0 && (
                <span className="mt-3 rounded-full bg-points-soft px-3 py-1 text-sm font-bold tabular-nums text-points">+{current.points}pt</span>
              )}
              <Button className="mt-5 h-12 w-full gap-1.5 rounded-full text-base font-bold" onClick={() => void share(current)}>
                <Share2 className="h-4 w-4" />
                {t("pocke.complete.share")}
              </Button>
              <Button variant="ghost" className="mt-1 w-full text-muted-foreground" onClick={() => void markSeen(current)}>
                {t("pocke.complete.close")}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
      <ShareCardDialog
        open={shareOpen}
        onOpenChange={(o) => {
          setShareOpen(o);
          if (!o) setShareSpec(null);
        }}
        spec={shareSpec}
        fileName="collectify-complete.png"
      />
    </>
  );
}
