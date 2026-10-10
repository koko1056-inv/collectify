import { ArrowLeftRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { TradeMatchingSection } from "@/components/trade/TradeMatchingSection";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * 交換（下タブ②）。
 * 以前は /search?tab=trade として検索画面の1タブを借りていたため、URL が検索のままで、
 * 検索画面の他のタブを開くと下タブのどれも点灯しなかった。
 */
export default function Trade() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pt-6 sm:pb-10">
        <header className="pb-3" data-tour="trade-header">
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <ArrowLeftRight className="h-5 w-5 text-primary" aria-hidden="true" />
            {t("chrome.nav.trade")}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("engage.trade.pageSubtitle")}</p>
        </header>
        <TradeMatchingSection />
      </main>
      <Footer />
    </div>
  );
}
