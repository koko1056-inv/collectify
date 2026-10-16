import { useSearchParams } from "react-router-dom";
import { PackageCheck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePreorders } from "@/hooks/usePreorders";
import { PreorderRow } from "./PreorderList";

/** 一覧に並べる数。多いときは「予約中をすべて見る」へ */
const MAX_ROWS = 3;

/**
 * コレクション画面の上の「発売日を過ぎた予約」。発売日を過ぎたものだけ、その場で「届いた」を押せる。
 * 発売日を過ぎた予約が無いときは何も出さない（いつも出すと、画面の上が埋まる）。
 */
export function PreorderArrivalBanner() {
  const { t } = useLanguage();
  const { due } = usePreorders();
  const [, setParams] = useSearchParams();
  if (due.length === 0) return null;

  const showAll = () =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("view", "preorders");
        return next;
      },
      { replace: true }
    );

  return (
    <section
      className="space-y-2 rounded-2xl border border-primary/30 bg-primary/5 p-3"
      aria-label={t("preorders.banner.title", { count: due.length })}
      data-testid="preorder-arrival-banner"
    >
      <div className="flex items-start gap-2 px-0.5">
        <PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="text-sm font-bold">{t("preorders.banner.title", { count: due.length })}</p>
          <p className="text-2xs text-muted-foreground">{t("preorders.banner.desc")}</p>
        </div>
      </div>
      <ul className="space-y-1.5">
        {due.slice(0, MAX_ROWS).map((p) => (
          <li key={p.id}>
            <PreorderRow preorder={p} due compact />
          </li>
        ))}
      </ul>
      {due.length > MAX_ROWS && (
        <button type="button" onClick={showAll} className="w-full py-1 text-center text-xs font-medium text-primary">
          {t("preorders.banner.all")}
        </button>
      )}
    </section>
  );
}
