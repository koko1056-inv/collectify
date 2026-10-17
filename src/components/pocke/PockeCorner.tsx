import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { todayJst } from "@/utils/companion";
import { cn } from "@/lib/utils";
import { Pocke, PockeBubble } from "./Pocke";
import { usePockeName, type PockeTipItem } from "./usePockeTips";

export type PockeScreen = "collection" | "trade" | "explore" | "me";

/** 用件が無いときのひとこと（日替わり）。画面ごとに3つ */
const IDLE_LINES = 3;

/** 日本時間の時間帯 */
function partOfDay(now = new Date()): "morning" | "day" | "evening" | "night" {
  const h = (now.getUTCHours() + 9) % 24;
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 17) return "day";
  if (h >= 17 && h < 23) return "evening";
  return "night";
}

const seenKey = (uid: string, screen: PockeScreen) => `pocke_corner_seen_${uid}_${screen}`;

function readSeen(uid: string | undefined, screen: PockeScreen): string {
  if (!uid) return "";
  try {
    return localStorage.getItem(seenKey(uid, screen)) ?? "";
  } catch {
    return "";
  }
}

/**
 * 画面の見出しの横にいるポッケ（コレクション・交換・みんな・マイページ）。
 *
 * Duolingo のフクロウのように「いつもそこにいる」案内役。ふだんは小さく顔を出しているだけで、
 *  - 伝えたいこと（その画面のおすすめ）があると、弾んで印が付く
 *  - その日はじめてのときは、1つ目の用件だけを吹き出しで自分から言う（数秒で引っ込む）
 *  - タップすると、時間帯のあいさつと、その画面のおすすめ（最大3つ）を出す。用件が無ければ日替わりのひとこと
 * 「見た」の印は画面ごとに、その日の用件の組み合わせで覚える（同じ用件は同じ日に何度も言わない）。
 */
export function PockeCorner({ screen, tips, className }: { screen: PockeScreen; tips: PockeTipItem[]; className?: string }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const uid = user?.id;
  const name = usePockeName();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(() => readSeen(uid, screen));
  const [peekLine, setPeekLine] = useState<string | null>(null);
  useEffect(() => setSeen(readSeen(uid, screen)), [uid, screen]);

  const shown = tips.slice(0, 3);
  // その日の用件の組み合わせ。これが変わったら（新しい用件が出たら）また知らせる
  const signature = useMemo(() => (shown.length > 0 ? `${todayJst()}:${shown.map((s) => s.kind).join(",")}` : ""), [shown]);
  const hasNews = !!signature && signature !== seen;

  const markSeen = () => {
    if (!uid || !signature) return;
    try {
      localStorage.setItem(seenKey(uid, screen), signature);
    } catch {
      // 保存できなくても、この画面を開いている間は「見た」にする
    }
    setSeen(signature);
  };

  // その日はじめての用件は、ポッケから1つだけ言う。ほかの案内（ガイド・ダイアログ）が出ているときは黙っている
  useEffect(() => {
    if (!hasNews || !shown[0]) return;
    const show = window.setTimeout(() => {
      // 開いているダイアログ・シート・画面ガイドがあるときは黙っている（閉じているダイアログは数えない）
      if (document.querySelector('[aria-modal="true"], [role="dialog"][data-state="open"]')) return;
      setPeekLine(shown[0].text);
    }, 1200);
    const hide = window.setTimeout(() => setPeekLine(null), 9200);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
    // 用件の組み合わせが変わったときだけ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, hasNews]);

  const part = partOfDay();
  const greeting = name
    ? t(`pocke.corner.greet.${part}`, { name: t("pocke.corner.honorific", { name }) })
    : t(`pocke.corner.greetNoName.${part}`);
  const idle = t(`pocke.corner.idle.${screen}.${Number(todayJst().replace(/-/g, "")) % IDLE_LINES}`);
  const headPose = shown[0]?.pose ?? (part === "night" ? "sleepy" : "wave");

  const select = (tip: PockeTipItem) => {
    setOpen(false);
    if (tip.onSelect) tip.onSelect();
    else if (tip.href) navigate(tip.href);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        setPeekLine(null);
        if (o) markSeen();
      }}
    >
      <div className={cn("relative shrink-0", className)}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="relative -my-1 flex h-11 w-11 items-end justify-center overflow-hidden rounded-full bg-primary/10 transition-colors hover:bg-primary/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            aria-label={hasNews ? t("pocke.corner.ariaNews", { n: shown.length }) : t("pocke.corner.aria")}
            data-testid={`pocke-corner-${screen}`}
          >
            <Pocke pose="peek" height={36} motion={hasNews ? "bob" : undefined} className="-mb-0.5" />
          </button>
        </PopoverTrigger>
        {hasNews && (
          <span className="pointer-events-none absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-background bg-primary" aria-hidden="true" />
        )}
        {/* その日はじめての用件の、ひとことだけの吹き出し（押すと全部を開く） */}
        {peekLine && !open && (
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setPeekLine(null);
              markSeen();
            }}
            className="absolute left-0 top-full z-50 mt-2 w-60 text-left motion-safe:animate-fade-in"
          >
            <PockeBubble tail="top" className="py-2 text-xs font-bold shadow-md [&>span]:left-5">
              {peekLine}
            </PockeBubble>
          </button>
        )}
      </div>
      <PopoverContent align="start" sideOffset={8} className="w-[min(20rem,calc(100vw-2rem))] rounded-2xl p-3">
        <div className="flex items-end gap-2">
          <Pocke key={headPose} pose={headPose} height={76} motion="pop" className="-mb-1" />
          <PockeBubble tail="left" className="mb-2 min-w-0 flex-1 py-2">
            <p className="text-sm font-bold leading-snug">{greeting}</p>
            {shown.length === 0 && <p className="mt-0.5 text-xs text-muted-foreground">{idle}</p>}
          </PockeBubble>
        </div>
        {shown.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {shown.map((tip) => (
              <li key={tip.kind}>
                <button
                  type="button"
                  onClick={() => select(tip)}
                  className="flex w-full items-center gap-2 rounded-xl bg-muted/50 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted"
                >
                  <span className="min-w-0 flex-1 leading-snug">{tip.text}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
