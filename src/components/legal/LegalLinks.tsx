import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface LegalLinksProps {
  className?: string;
}

/** 利用規約・プライバシーポリシー・特定商取引法の表記へのリンク */
export function LegalLinks({ className }: LegalLinksProps) {
  const { t } = useLanguage();
  const items = [
    { to: "/terms", label: t("chrome.legal.terms") },
    { to: "/privacy", label: t("chrome.legal.privacy") },
    { to: "/tokushoho", label: t("chrome.legal.tokushoho") },
  ];
  return (
    <nav aria-label={t("chrome.legal.label")} className={cn("flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground", className)}>
      {items.map((i) => (
        <Link key={i.to} to={i.to} className="underline-offset-2 hover:text-foreground hover:underline">
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
