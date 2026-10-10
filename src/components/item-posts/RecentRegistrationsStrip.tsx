import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRecentRegistrations, type RecentRegistration } from "@/hooks/useRecentRegistrations";
import { useDateFormat } from "@/hooks/useDateFormat";
import { PublicUserItemModal } from "@/components/item-details/PublicUserItemModal";

/**
 * 「いま登録されたグッズ」。
 * グッズの写真・名前を押すとそのグッズの詳細（他の人のグッズ用の公開モーダル）を開き、
 * 登録した人の名前を押すとその人の棚へ飛べる。
 * 以前はどこを押してもその人のページへ飛ぶだけで、グッズの詳細が見られなかった。
 */
export function RecentRegistrationsStrip() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { formatRelative } = useDateFormat();
  const { data: rows = [] } = useRecentRegistrations(12);
  const [opened, setOpened] = useState<RecentRegistration | null>(null);

  if (rows.length < 3) return null;

  return (
    <section className="space-y-2" aria-label={t("engage.posts.recentTitle")}>
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold">{t("engage.posts.recentTitle")}</h2>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide snap-x">
        {rows.map((r) => (
          <div key={r.user_item_id} className="snap-start shrink-0 w-28">
            <button type="button" onClick={() => setOpened(r)} className="block w-full text-left">
              <div className="aspect-square overflow-hidden rounded-xl bg-muted">
                {r.image && <img src={r.image} alt="" loading="lazy" className="h-full w-full object-contain" />}
              </div>
              <p className="mt-1 line-clamp-2 text-2xs font-medium leading-tight">{r.title}</p>
            </button>
            <button
              type="button"
              onClick={() => navigate(`/user/${r.user_id}`)}
              className="block w-full truncate text-left text-3xs text-muted-foreground hover:text-foreground"
            >
              {r.display_name || r.username} · {formatRelative(r.created_at)}
            </button>
          </div>
        ))}
      </div>

      {opened && (
        <PublicUserItemModal
          isOpen
          onClose={() => setOpened(null)}
          itemId={opened.user_item_id}
          title={opened.title ?? ""}
          image={opened.image ?? ""}
          ownerId={opened.user_id}
        />
      )}
    </section>
  );
}
