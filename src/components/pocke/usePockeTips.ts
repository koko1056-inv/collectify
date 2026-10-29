import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOshiNewBadge } from "@/hooks/useOshiReleases";
import { useCompanions, useOshiPhotos } from "@/hooks/useOshi";
import { nextCare } from "@/hooks/useOshiRoomSocial";
import { useMyTrades } from "@/hooks/trade/useMyTrades";
import { useProfile } from "@/hooks/useProfile";
import { todayJst } from "@/utils/companion";
import { openDailyRing, ringDoneCount, useDailyRing } from "@/hooks/useDailyRing";
import { MISSION_SHOOT_HREF, useDailyMission } from "@/hooks/useDailyMission";
import { getWeeklyPrompt } from "@/utils/weeklyPrompt";
import type { PockePose } from "./pockeAssets";

/**
 * ポッケが画面ごとに言うこと（おすすめ）。PockeCorner が受け取って出す。
 * 並び順がそのまま大事な順。kind は「もう見た」の判定に使う（中身の数が変わっても同じ用件なら同じ kind）。
 */
export interface PockeTipItem {
  kind: string;
  pose: PockePose;
  text: string;
  /** 押したときの行き先。onSelect と片方だけ */
  href?: string;
  onSelect?: () => void;
}

/** セリフに入れる名前の長さ（これより長いと「…」で切る） */
const NAME_MAX = 16;
export const shortenName = (name: string) => (name.length > NAME_MAX ? `${name.slice(0, NAME_MAX)}…` : name);
const cap = (n: number) => (n > 99 ? "99+" : n);

/** コレクション: 推しの新着 → 今日のリング → 推しのお世話 → 今日の推しフォト */
export function useCollectionPockeTips(): PockeTipItem[] {
  const { t } = useLanguage();
  const { data: ring } = useDailyRing();
  const { data: mission } = useDailyMission();
  const releases = useOshiNewBadge();
  const companions = useCompanions();
  const photos = useOshiPhotos();
  const list = companions.data ?? [];
  const care = list.length > 0 ? nextCare(list, todayJst()) : null;

  const tips: PockeTipItem[] = [];
  if (releases.unseen > 0) {
    tips.push({ kind: "releases", pose: "surprised", text: t("pocke.tip.releases", { n: cap(releases.unseen) }), href: "/releases?tab=new" });
  }
  if (mission?.item && !mission.completed) {
    tips.push({
      kind: "mission",
      pose: "point",
      text: t("pocke.mission.tip", {
        name: shortenName(mission.item.title),
        action: t(`pocke.mission.prompts.${mission.prompt_id}.action`),
      }),
      href: MISSION_SHOOT_HREF,
    });
  }
  if (ring && ringDoneCount(ring) < 3) {
    tips.push({ kind: "ring", pose: "point", text: t("pocke.tip.ring", { n: 3 - ringDoneCount(ring), pt: ring.bonus }), onSelect: openDailyRing });
  }
  if (care) {
    tips.push({
      kind: "care",
      pose: "love",
      text: t("pocke.tip.care", { name: shortenName(care.target.title) }),
      href: `/oshi?item=${care.target.user_item_id}`,
    });
  }
  if (list.length > 0 && !photos.todayDone) {
    tips.push({ kind: "photo", pose: "point", text: t("pocke.tip.photo"), href: "/oshi?tab=photo" });
  }
  return tips;
}

/** 交換: 自分の番 → 交換に出すもの → ほしいもの */
export function useTradePockeTips(): PockeTipItem[] {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { myTurn } = useMyTrades();
  const counts = useQuery({
    queryKey: ["pocke-trade-counts", user?.id],
    enabled: !!user?.id,
    staleTime: 1000 * 60,
    queryFn: async () => {
      const [offers, wishes] = await Promise.all([
        supabase.from("user_items").select("id", { count: "exact", head: true }).eq("user_id", user!.id).eq("for_trade", true),
        supabase.from("wishlists").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
      ]);
      return { offers: offers.count ?? 0, wishes: wishes.count ?? 0 };
    },
  });

  const tips: PockeTipItem[] = [];
  if (myTurn.length > 0) {
    tips.push({ kind: "myTurn", pose: "surprised", text: t("pocke.corner.trade.myTurn", { n: myTurn.length }), href: "/trade?view=active" });
  }
  if (counts.data && counts.data.offers === 0) {
    tips.push({ kind: "offer", pose: "pouch", text: t("pocke.corner.trade.offer"), href: "/trade?view=find" });
  }
  if (counts.data && counts.data.wishes === 0) {
    tips.push({ kind: "wish", pose: "point", text: t("pocke.corner.trade.wish"), href: "/search?tab=goods" });
  }
  return tips;
}

/** みんな: 今週のお題 */
export function useExplorePockeTips(): PockeTipItem[] {
  const { t } = useLanguage();
  const prompt = getWeeklyPrompt();
  return [
    {
      kind: `prompt-${prompt.id}`,
      pose: "cheer",
      text: t("pocke.corner.explore.prompt", { tag: prompt.tag }),
      href: `/explore?tab=posts&compose=${encodeURIComponent(prompt.tag)}`,
    },
  ];
}

/** マイページ: アイコン → 推しの作品 → 推しグッズ */
export function useMePockeTips(onEditProfile: () => void): PockeTipItem[] {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const companions = useCompanions();

  const tips: PockeTipItem[] = [];
  if (profile && !profile.avatar_url) {
    tips.push({ kind: "avatar", pose: "wave", text: t("pocke.corner.me.avatar"), onSelect: onEditProfile });
  }
  if (profile && (profile.interests?.length ?? 0) === 0) {
    tips.push({
      kind: "interests",
      pose: "think",
      text: t("pocke.corner.me.interests"),
      onSelect: () => document.querySelector('[data-tour="me-interests"]')?.scrollIntoView({ behavior: "smooth", block: "center" }),
    });
  }
  const oshiCount = companions.data?.length ?? 0;
  if (companions.data && oshiCount < 5) {
    tips.push({ kind: "oshi", pose: "love", text: t("pocke.corner.me.oshi", { n: 5 - oshiCount }), href: "/oshi" });
  }
  return tips;
}

/** 呼びかけに使う名前（表示名 → ユーザー名）。読めていなければ空 */
export function usePockeName(): string {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  return (profile?.display_name || profile?.username || "").trim();
}
