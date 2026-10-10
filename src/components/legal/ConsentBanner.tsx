import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { getAnalyticsConsent, setAnalyticsConsent } from "@/utils/analyticsConsent";

/**
 * 利用状況の分析への同意を、初回に1度だけたずねる。
 * 「同意しない」でも、すべての機能が使える。あとから設定（アカウント）で変えられる。
 */
export function ConsentBanner() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(getAnalyticsConsent() === null);
  }, []);

  if (!open) return null;

  const choose = (value: "granted" | "denied") => {
    setAnalyticsConsent(value);
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-label={t("chrome.consent.title")}
      className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[60] mx-auto max-w-md rounded-2xl border bg-card p-4 shadow-xl sm:bottom-4 sm:left-4 sm:right-auto sm:mx-0"
    >
      <p className="text-sm font-bold">{t("chrome.consent.title")}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {t("chrome.consent.body")}{" "}
        <Link to="/privacy" className="underline">
          {t("chrome.legal.privacy")}
        </Link>
      </p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="outline" className="flex-1" onClick={() => choose("denied")}>
          {t("chrome.consent.decline")}
        </Button>
        <Button size="sm" className="flex-1" onClick={() => choose("granted")}>
          {t("chrome.consent.accept")}
        </Button>
      </div>
    </div>
  );
}
