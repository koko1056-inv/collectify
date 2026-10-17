import { useSearchParams } from "react-router-dom";
import { PackageCheck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePreorders } from "@/hooks/usePreorders";
import { NOTICE_PRIORITY, useNoticeTurn } from "@/components/collection/noticeSlot";

/**
 * コレクション画面のお知らせ枠に出す「発売日を過ぎた予約」の1行。
 * 「確認する」で予約中の一覧を開き、そこで「届いた」を押す。
 * 以前は枠の中に予約を3件まで並べていて（1件ごとに約50px）、最初の画面のグッズを押し下げていた。
 * 発売日を過ぎた予約が無いときは何も出さない。
 */
export function PreorderArrivalBanner() {
  const { t } = useLanguage();
  const { due } = usePreorders();
  const [, setParams] = useSearchParams();
  const myTurn = useNoticeTurn("preorders", NOTICE_PRIORITY.preorders, due.length > 0);
  if (!myTurn) return null;

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
      className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 py-1.5 pl-3 pr-1.5"
      aria-label={t("preorders.banner.title", { count: due.length })}
      data-testid="preorder-arrival-banner"
    >
      <PackageCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <p className="min-w-0 flex-1 truncate text-sm">{t("preorders.banner.title", { count: due.length })}</p>
      <button
        type="button"
        onClick={showAll}
        className="shrink-0 rounded-lg px-2.5 py-2 text-sm font-bold text-primary hover:bg-primary/10"
      >
        {t("preorders.banner.check")}
      </button>
    </section>
  );
}
