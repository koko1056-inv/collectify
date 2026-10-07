import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRecentRegistrations } from "@/hooks/useRecentRegistrations";
import { useDateFormat } from "@/hooks/useDateFormat";

/** 「いま登録されたグッズ」。タップするとその人の棚へ飛べる。 */
export function RecentRegistrationsStrip() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { formatRelative } = useDateFormat();
  const { data: rows = [] } = useRecentRegistrations(12);

  if (rows.length < 3) return null;

  return (
    <section className="space-y-2" aria-label={t("engage.posts.recentTitle")}>
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold">{t("engage.posts.recentTitle")}</h2>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide snap-x">
        {rows.map((r) => (
          <button
            key={r.user_item_id}
            type="button"
            onClick={() => navigate(`/user/${r.user_id}`)}
            className="snap-start shrink-0 w-28 text-left"
          >
            <div className="aspect-square overflow-hidden rounded-xl bg-muted">
              {r.image && <img src={r.image} alt="" loading="lazy" className="h-full w-full object-contain" />}
            </div>
            <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-tight">{r.title}</p>
            <p className="truncate text-[10px] text-muted-foreground">
              {r.display_name || r.username} · {formatRelative(r.created_at)}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
