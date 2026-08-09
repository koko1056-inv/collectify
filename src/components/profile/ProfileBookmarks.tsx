import { useNavigate } from "react-router-dom";
import { Bookmark, Sparkles, User } from "lucide-react";
import { useBookmarkedAiWorks } from "@/hooks/ai-room/useAiBookmarks";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { getOptimizedImageUrl, fallbackToOriginal } from "@/utils/optimized-image";

/**
 * マイページの「保存」タブ
 * AIルームとAIアバターのブックマーク一覧を統合表示する。
 */
export function ProfileBookmarks() {
  const navigate = useNavigate();
  const { data, isLoading } = useBookmarkedAiWorks();
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="px-4 mt-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="px-4 mt-2">
        <div className="bg-card rounded-2xl border border-border/40 p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
            <Bookmark className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="font-semibold text-sm mb-1">{t("profileScreen.bookmarks.empty")}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t("profileScreen.bookmarks.emptyHint1")}
            <br />
            {t("profileScreen.bookmarks.emptyHint2")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 mt-2">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {data.map((entry: any) => {
          const w = entry.work;
          const isRoom = entry.type === "room";
          return (
            <button
              key={`${entry.type}:${w.id}`}
              onClick={() =>
                // 以前はアバターの詳細ページが無く、オーナーのプロフィールへ逃していた
                isRoom ? navigate(`/ai-work/${w.id}`) : navigate(`/ai-avatar/${w.id}`)
              }
              className="group relative aspect-square rounded-2xl overflow-hidden bg-muted border border-border/40 hover:border-primary/40 hover:shadow-lg transition-all"
            >
              <img
                src={getOptimizedImageUrl(w.image_url, { width: 300 })} onError={fallbackToOriginal(w.image_url)} loading="lazy" decoding="async"
                alt={w.title || w.name || t("profileScreen.bookmarks.aiWorkAlt")}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-center gap-1 text-[10px] text-white/90 font-medium">
                  {isRoom ? (
                    <>
                      <Sparkles className="w-3 h-3" /> {t("profileScreen.bookmarks.aiRoom")}
                    </>
                  ) : (
                    <>
                      <User className="w-3 h-3" /> {t("profileScreen.bookmarks.avatar")}
                    </>
                  )}
                </div>
                {(w.title || w.name) && (
                  <p
                    className={cn(
                      "text-xs text-white font-semibold truncate mt-0.5",
                    )}
                  >
                    {w.title || w.name}
                  </p>
                )}
              </div>
              <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow">
                <Bookmark className="w-3.5 h-3.5 fill-current" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
