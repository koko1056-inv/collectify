import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Heart, Bookmark, Wand2, Sparkles, Package } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import {
  useAvatarDetail,
  useMyAvatarLikes,
  useToggleAvatarLike,
} from "@/hooks/ai-avatar/usePublicAvatars";
import { useMyAiBookmarks, useToggleAiBookmark } from "@/hooks/ai-room/useAiBookmarks";
import { setPendingAvatarPrompt } from "@/utils/ai-studio-handoff";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * 公開AIアバターの詳細。
 *
 * /ai-work/:id はAIルーム専用なので、アバターは別ルートにしている
 * （同じルートに相乗りさせると、どちらの id か判別できない）。
 */
export default function AiAvatarDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { formatDate } = useDateFormat();

  const { data: avatar, isLoading, isError, refetch } = useAvatarDetail(id);
  const { data: likes } = useMyAvatarLikes();
  const { data: bookmarks } = useMyAiBookmarks();
  const toggleLike = useToggleAvatarLike();
  const toggleBookmark = useToggleAiBookmark();

  const isLiked = !!(avatar && likes?.has(avatar.id));
  const isBookmarked = !!(avatar && bookmarks?.has(`avatar:${avatar.id}`));

  const handleUseThisStyle = () => {
    if (!avatar?.prompt) return;
    setPendingAvatarPrompt({
      prompt: avatar.prompt,
      parentAvatarId: avatar.id,
      parentImageUrl: avatar.image_url,
      parentName: avatar.name,
    });
    toast.success(t("chrome.exploreCard.avatarStyleToast"));
    navigate("/ai-rooms?studio=generate&from=explore");
  };

  return (
    <div className="min-h-screen bg-background pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-8">
      <Navbar />

      <div className="container max-w-3xl mx-auto px-4 py-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 gap-1">
          <ArrowLeft className="w-4 h-4" />
          {t("chrome.common.back")}
        </Button>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="w-full aspect-[4/5] rounded-2xl" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ) : isError ? (
          <QueryErrorState
            title={t("chrome.explore.avatarsLoadFailed")}
            onRetry={() => refetch()}
          />
        ) : !avatar ? (
          // 非公開に戻された、または削除された場合は RLS により取得できない
          <EmptyState icon={Wand2} title={t("chrome.avatarDetail.notFound")} />
        ) : (
          <div className="space-y-5">
            <div className="relative rounded-2xl overflow-hidden bg-muted border border-border">
              <img
                src={avatar.image_url}
                alt={avatar.name || t("chrome.exploreCard.avatarImageAlt")}
                className="w-full object-cover"
              />
              <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/80 backdrop-blur text-[11px] font-semibold text-primary">
                <Sparkles className="w-3 h-3" />
                AI
              </div>
            </div>

            <div className="space-y-2">
              {avatar.name && <h1 className="text-xl font-bold">{avatar.name}</h1>}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(`/user/${avatar.user_id}`)}
                  className="flex items-center gap-2 hover:opacity-80"
                >
                  <Avatar className="w-8 h-8 border border-border">
                    <AvatarImage src={avatar.profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {avatar.profile?.username?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {avatar.profile?.display_name ||
                      avatar.profile?.username ||
                      t("chrome.exploreCard.userFallback")}
                  </span>
                </button>
                <span className="text-xs text-muted-foreground ml-auto">
                  {formatDate(avatar.created_at)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={isLiked ? "default" : "outline"}
                size="sm"
                onClick={() => toggleLike.mutate(avatar.id)}
                disabled={toggleLike.isPending}
                className="gap-1.5"
                aria-pressed={isLiked}
              >
                <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
                {avatar.like_count}
              </Button>
              <Button
                variant={isBookmarked ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  toggleBookmark.mutate({
                    workId: avatar.id,
                    workType: "avatar",
                    isBookmarked,
                  })
                }
                className="gap-1.5"
                aria-pressed={isBookmarked}
              >
                <Bookmark className={cn("w-4 h-4", isBookmarked && "fill-current")} />
                {t("chrome.exploreCard.bookmark")}
              </Button>
              {avatar.prompt && (
                <Button size="sm" onClick={handleUseThisStyle} className="gap-1.5 ml-auto">
                  <Wand2 className="w-4 h-4" />
                  {t("chrome.exploreCard.useThisStyle")}
                </Button>
              )}
            </div>

            {avatar.prompt && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("chrome.avatarDetail.promptLabel")}
                </p>
                <p className="text-sm whitespace-pre-wrap">{avatar.prompt}</p>
              </div>
            )}

            {!!avatar.item_ids?.length && (
              <Badge variant="secondary" className="gap-1">
                <Package className="w-3 h-3" />
                {t("chrome.avatarDetail.itemCount", { n: avatar.item_ids.length })}
              </Badge>
            )}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
