import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOshiNewBadge } from "@/hooks/useOshiReleases";
import { useCompanions, useOshiPhotos } from "@/hooks/useOshi";
import { nextCare } from "@/hooks/useOshiRoomSocial";
import { todayJst } from "@/utils/companion";
import { NOTICE_PRIORITY, useNoticeTurn } from "@/components/collection/noticeSlot";
import { Pocke } from "./Pocke";
import type { PockePose } from "./pockeAssets";

type TipKind = "releases" | "care" | "photo";

interface Tip {
  kind: TipKind;
  pose: PockePose;
  text: string;
  cta: string;
  href: string;
}

/** セリフに入れる名前の長さ（これより長いと「…」で切る） */
const NAME_MAX = 16;
const shorten = (name: string) => (name.length > NAME_MAX ? `${name.slice(0, NAME_MAX)}…` : name);

const hiddenKey = (uid: string, kind: TipKind) => `pocke_tip_hidden_${uid}_${kind}`;

/** 「あとで」を押したおすすめは、その日のうちは出さない */
function hiddenToday(uid: string | undefined, kind: TipKind): boolean {
  if (!uid) return false;
  try {
    return localStorage.getItem(hiddenKey(uid, kind)) === todayJst();
  } catch {
    return false;
  }
}

/**
 * コレクション画面の「ポッケのおすすめ」。はじめてガイドを終えたあと、同じ場所でポッケが次の一手を1つだけすすめる。
 * すすめる順: 推しの新着（まだ見ていないもの）→ 推しのお世話 → 今日の推しフォト。
 * どれも下の小さな入口（CollectionShortcuts）からも行けるが、そこは数字やアイコンだけで気づかれにくいので、言葉で1つだけ言う。
 * お知らせ枠（NoticeSlot）のいちばん後ろ。予約の到着やはじめてガイドなど、ほかのお知らせがあるときは出さない。
 */
export function PockeTip() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const uid = user?.id;
  const releases = useOshiNewBadge();
  const companions = useCompanions();
  const photos = useOshiPhotos();
  // 「あとで」を押したら、描き直しで消えるように覚えておく
  const [hidden, setHidden] = useState<TipKind[]>([]);

  const today = todayJst();
  const care = companions.data && companions.data.length > 0 ? nextCare(companions.data, today) : null;
  const isHidden = (kind: TipKind) => hidden.includes(kind) || hiddenToday(uid, kind);

  const candidates: Tip[] = [];
  if (releases.unseen > 0) {
    candidates.push({
      kind: "releases",
      pose: "surprised",
      text: t("pocke.tip.releases", { n: releases.unseen > 99 ? "99+" : releases.unseen }),
      cta: t("pocke.tip.releasesCta"),
      href: "/releases?tab=new",
    });
  }
  if (care) {
    candidates.push({
      kind: "care",
      pose: "love",
      // グッズ名は長いもの（雑誌の号数入りなど）が多いので、セリフの中では短く切る
      text: t("pocke.tip.care", { name: shorten(care.target.title) }),
      cta: t("pocke.tip.careCta"),
      href: `/oshi?item=${care.target.user_item_id}`,
    });
  }
  if (companions.data && companions.data.length > 0 && !photos.todayDone) {
    candidates.push({
      kind: "photo",
      pose: "point",
      text: t("pocke.tip.photo"),
      cta: t("pocke.tip.photoCta"),
      href: "/oshi?tab=photo",
    });
  }
  const tip = candidates.find((c) => !isHidden(c.kind));

  const myTurn = useNoticeTurn("pocke", NOTICE_PRIORITY.pocke, !!tip);
  if (!tip || !myTurn) return null;

  const later = () => {
    if (uid) {
      try {
        localStorage.setItem(hiddenKey(uid, tip.kind), today);
      } catch {
        // 保存できなくても、この画面を開いている間は隠す
      }
    }
    setHidden((h) => [...h, tip.kind]);
  };

  return (
    <section
      className="relative flex items-end gap-1 overflow-hidden rounded-2xl border border-primary/20 bg-card pr-3 shadow-sm"
      aria-label={t("pocke.tip.label")}
      data-testid="pocke-tip"
    >
      {/* ポッケは枠の下からのぞく。セリフは隣に書いてあるので絵は飾り */}
      <Pocke key={tip.kind} pose={tip.pose} height={104} motion="pop" className="-mb-2 ml-0.5" />
      <div className="min-w-0 flex-1 space-y-1.5 py-3">
        <p className="text-2xs font-bold text-primary">{t("pocke.tip.label")}</p>
        <p className="text-sm font-bold leading-snug">{tip.text}</p>
        <div className="flex items-center gap-2">
          <Button size="sm" className="h-8 rounded-full px-3.5 text-xs" onClick={() => navigate(tip.href)}>
            {tip.cta}
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground" onClick={later}>
            {t("pocke.tip.later")}
          </Button>
        </div>
      </div>
    </section>
  );
}
