import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Pocke, PockeBubble } from "./Pocke";
import type { PockePose } from "./pockeAssets";
import { POCKE_CHEER_EVENT, type PockeCheerDetail, type PockeCheerKind } from "./pockeCheer";

/** 出している時間 */
const SHOW_MS = 2400;

/** 毎回同じ言葉だと飽きるので、いくつかから選ぶ（直前と同じものは避ける） */
const LINES: Record<Exclude<PockeCheerKind, "addedMany">, { pose: PockePose; key: string }[]> = {
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
};

/**
 * うれしいことがあったときに画面のすみで跳ねるポッケ（グッズを入れた・交換が進んだ・毎日来てくれた など）。pockeCheer() のイベントを受けて出す。
 * 文字の知らせ（トースト）は今までどおり出るので、ここは飾り（読み上げない）。押しても何もしない（操作の邪魔をしない）。
 */
export function PockeCheerHost() {
  const { t } = useLanguage();
  const [shown, setShown] = useState<{ id: number; pose: PockePose; text: string } | null>(null);
  const last = useRef(-1);
  const timer = useRef<number>();

  useEffect(() => {
    const onCheer = (e: Event) => {
      const { kind, n } = (e as CustomEvent<PockeCheerDetail>).detail ?? { kind: "added" };
      let next: { pose: PockePose; text: string };
      if (kind === "addedMany") {
        next = { pose: "celebrate", text: t("pocke.cheer.addedMany", { n: n ?? 0 }) };
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
  return (
    // スマホ: 下タブとトースト（画面の下）の上・左寄せ。PC: 左下（トーストは右下）
    <div
      key={shown.id}
      aria-hidden="true"
      className="pointer-events-none fixed bottom-[calc(4rem+env(safe-area-inset-bottom)+2.75rem)] left-3 z-[90] flex items-end gap-1.5 sm:bottom-6 sm:left-6"
      data-testid="pocke-cheer"
    >
      <Pocke pose={shown.pose} height={88} motion="pop" />
      <PockeBubble tail="left" className="mb-5 max-w-[12rem] py-2 text-sm font-bold motion-safe:animate-fade-in">
        {shown.text}
      </PockeBubble>
    </div>
  );
}
