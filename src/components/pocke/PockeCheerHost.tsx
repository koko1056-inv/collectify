import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Pocke, PockeBubble } from "./Pocke";
import type { PockePose } from "./pockeAssets";
import { POCKE_CHEER_EVENT, type PockeCheerDetail, type PockeCheerKind } from "./pockeCheer";

/** 出している時間 */
const SHOW_MS = 2400;

/** 毎回同じ言葉だと飽きるので、いくつかから選ぶ（直前と同じものは避ける） */
const LINES: Record<
  Exclude<PockeCheerKind, "addedMany" | "guideDone" | "levelUp">,
  { pose: PockePose; key: string }[]
> = {
  added: [
    { pose: "wink", key: "pocke.cheer.added1" },
    { pose: "pouch", key: "pocke.cheer.added2" },
    { pose: "love", key: "pocke.cheer.added3" },
  ],
  arrived: [{ pose: "celebrate", key: "pocke.cheer.arrived" }],
  streak: [
    { pose: "cheer", key: "pocke.cheer.streak1" },
    { pose: "wave", key: "pocke.cheer.streak2" },
  ],
  purchased: [{ pose: "love", key: "pocke.cheer.purchased" }],
  tradeSent: [{ pose: "cheer", key: "pocke.cheer.tradeSent" }],
  tradeAccepted: [{ pose: "wink", key: "pocke.cheer.tradeAccepted" }],
  tradeDone: [{ pose: "celebrate", key: "pocke.cheer.tradeDone" }],
  freezeUsed: [{ pose: "sleepy", key: "pocke.cheer.freezeUsed" }],
  missionDone: [{ pose: "celebrate", key: "pocke.mission.cheer" }],
  wishlisted: [{ pose: "think", key: "pocke.cheer.wishlisted" }],
  preordered: [{ pose: "point", key: "pocke.cheer.preordered" }],
  liked: [{ pose: "love", key: "pocke.cheer.liked" }],
  listedForTrade: [{ pose: "cheer", key: "pocke.cheer.listedForTrade" }],
  unlistedForTrade: [{ pose: "think", key: "pocke.cheer.unlistedForTrade" }],
  decorated: [{ pose: "wink", key: "pocke.cheer.decorated" }],
  followed: [{ pose: "wave", key: "pocke.cheer.followed" }],
  unfollowed: [{ pose: "think", key: "pocke.cheer.unfollowed" }],
  catalogRequestSent: [
    { pose: "wink", key: "pocke.cheer.catalogRequestSent1" },
    { pose: "love", key: "pocke.cheer.catalogRequestSent2" },
  ],
  catalogRequestWithdrawn: [{ pose: "think", key: "pocke.cheer.catalogRequestWithdrawn" }],
};

/**
 * うれしいことがあったときに画面右下で跳ねるポッケ（グッズを入れた・ほしいものに入れた・予約した・いいね・交換が進んだ・毎日来てくれた など）。
 * pockeCheer() のイベントを受けて出す。トーストは画面上部に出るため、ここは下部固定ボタン・ボトムシートのフッター・ボトムナビにかぶらない
 * 右下（safe-area 込み）に出す。タップで早めに引っ込められる。見た目は飾り（読み上げない）だが、同じ内容を見えないライブリージョンで読み上げる。
 */
export function PockeCheerHost() {
  const { t } = useLanguage();
  const [shown, setShown] = useState<{ id: number; pose: PockePose; text: string } | null>(null);
  const last = useRef(-1);
  const timer = useRef<number>();

  useEffect(() => {
    const onCheer = (e: Event) => {
      const { kind, n, title } = (e as CustomEvent<PockeCheerDetail>).detail ?? { kind: "added" };
      let next: { pose: PockePose; text: string };
      if (kind === "addedMany") {
        next = { pose: "celebrate", text: t("pocke.cheer.addedMany", { n: n ?? 0 }) };
      } else if (kind === "added" && n) {
        // ポイントももらったときは、ランダムな一言のかわりに獲得ポイントを伝える
        next = { pose: "wink", text: t("pocke.cheer.addedPoints", { n }) };
      } else if (kind === "guideDone") {
        next = { pose: "celebrate", text: t("pocke.cheer.guideDone", { label: title ?? "", n: n ?? 0 }) };
      } else if (kind === "levelUp") {
        next = { pose: "celebrate", text: t("pocke.cheer.levelUp", { label: title ?? "", n: n ?? 0 }) };
      } else {
        const list = LINES[kind] ?? LINES.added;
        let i = Math.floor(Math.random() * list.length);
        if (list.length > 1 && i === last.current) i = (i + 1) % list.length;
        last.current = i;
        next = { pose: list[i].pose, text: t(list[i].key, { n: n ?? 0 }) };
      }
      setShown({ id: Date.now(), ...next });
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setShown(null), SHOW_MS);
    };
    window.addEventListener(POCKE_CHEER_EVENT, onCheer);
    return () => {
      window.removeEventListener(POCKE_CHEER_EVENT, onCheer);
      window.clearTimeout(timer.current);
    };
  }, [t]);

  if (!shown) return null;
  const hide = () => {
    window.clearTimeout(timer.current);
    setShown(null);
  };
  return (
    <>
      {/* 画面読み上げ用。見た目のポッケ＋吹き出しは飾りなので、知らせの文章はここだけで読み上げる */}
      <span className="sr-only" role="status" aria-live="polite">
        {shown.text}
      </span>
      {/* スマホ・PCとも右下。下タブ（スマホのみ）の上にのせる。下タブ中央の「追加」ボタンは行の上にはみ出しているので、
          それより高い位置に置いて、下部の固定ボタン・ボトムシートのフッター・ボトムナビのどれにもかぶらないようにする */}
      <div
        key={shown.id}
        className="pointer-events-none fixed bottom-[calc(4rem+env(safe-area-inset-bottom)+2rem)] right-3 z-[90] flex items-end gap-1.5 sm:bottom-6 sm:right-6"
        data-testid="pocke-cheer"
      >
        <button
          type="button"
          onClick={hide}
          aria-label={t("pocke.cheer.close")}
          className="pointer-events-auto flex items-end gap-1.5 rounded-2xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Pocke pose={shown.pose} height={88} motion="pop" />
          <PockeBubble tail="left" className="mb-5 max-w-[12rem] py-2 text-sm font-bold motion-safe:animate-fade-in">
            <span aria-hidden="true">{shown.text}</span>
          </PockeBubble>
        </button>
      </div>
    </>
  );
}
