import { useSearchParams } from "react-router-dom";
import { Inbox } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { EmptyState } from "@/components/ui/empty-state";
import { TradeMatchingSection } from "@/components/trade/TradeMatchingSection";
import { MyTurnSection } from "@/components/trade/MyTurnSection";
import { TradeInboxButton } from "@/components/trade/TradeInboxButton";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMyTrades } from "@/hooks/trade/useMyTrades";
import { cn } from "@/lib/utils";
import { PockeCorner } from "@/components/pocke/PockeCorner";
import { useTradePockeTips } from "@/components/pocke/usePockeTips";

type TradeView = "find" | "active";

/**
 * 交換（下タブ②）。「相手をさがす」と「進行中」の2つに分ける。
 * 以前は1枚の画面に「あなたの番の取引（1件で約340px）・受信箱・4つの手順・交換に出すボタン・出しているグッズの帯」が
 * 上から並び、交換相手の候補は上から約1060pxまで押し下げられていた。
 * 自分の番の取引があるときは「進行中」から開く（待たせている相手がいるので）。?view= で選べる。
 */
export default function Trade() {
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();
  const { myTurn, isLoading } = useMyTrades();
  const param = params.get("view");
  // ?post=1（X の「譲・求」画像を開く合図）は「相手をさがす」の中で開く
  const view: TradeView =
    param === "active" || param === "find"
      ? param
      : params.get("post") !== "1" && !isLoading && myTurn.length > 0
        ? "active"
        : "find";

  const select = (v: TradeView) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("view", v);
        return next;
      },
      { replace: true }
    );

  const tabs: { value: TradeView; label: string; badge?: number }[] = [
    { value: "find", label: t("trade.pageTabs.find") },
    { value: "active", label: t("trade.pageTabs.active"), badge: myTurn.length },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pt-6 sm:pb-10">
        <header className="space-y-3 pb-4" data-tour="trade-header">
          <div className="flex items-center gap-2">
            <TradePocke />
            <h1 className="text-xl font-bold">{t("chrome.nav.trade")}</h1>
          </div>
          <div role="tablist" aria-label={t("chrome.nav.trade")} className="grid grid-cols-2 rounded-xl bg-muted p-1">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={view === tab.value}
                onClick={() => select(tab.value)}
                className={cn(
                  "flex h-9 items-center justify-center gap-1.5 rounded-lg text-sm transition-colors",
                  view === tab.value ? "bg-background font-bold text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                {!!tab.badge && (
                  <span className="min-w-5 rounded-full bg-primary px-1.5 text-3xs font-bold leading-5 text-primary-foreground tabular-nums">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </header>

        {view === "find" ? (
          <TradeMatchingSection />
        ) : (
          <div className="space-y-4">
            {/* いま自分が動く番の取引（返事・発送・受け取り・完了後の反映）。その場で進められる */}
            <MyTurnSection limit={10} />
            {!isLoading && myTurn.length === 0 && (
              <EmptyState icon={Inbox} title={t("trade.active.empty")} description={t("trade.active.emptyDesc")} />
            )}
            {/* 進行中・完了も含めたすべての交換（受信箱） */}
            <TradeInboxButton variant="full" />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

/** 交換画面のポッケ（自分の番・交換に出すもの・ほしいもの） */
function TradePocke() {
  const tips = useTradePockeTips();
  return <PockeCorner screen="trade" tips={tips} />;
}
