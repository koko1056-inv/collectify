import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, Bookmark, Wand2, Sparkles, Package, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useToggleAiBookmark } from "@/hooks/ai-room/useAiBookmarks";
import { useToggleAvatarLike, type ExploreAvatar } from "@/hooks/ai-avatar/usePublicAvatars";
import { setPendingAvatarPrompt } from "@/utils/ai-studio-handoff";
import { getOptimizedImageUrl } from "@/utils/optimized-image";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  avatar: ExploreAvatar;
  isBookmarked: boolean;
  isLiked: boolean;
}

export function ExploreAvatarCard({ avatar, isBookmarked, isLiked }: Props) {
  const navigate = useNavigate();
  const toggleBookmark = useToggleAiBookmark();
  const toggleLike = useToggleAvatarLike();
  const { t } = useLanguage();
  const [imgLoaded, setImgLoaded] = useState(false);
  // フィードではリサイズ版を配信し、変換に失敗した場合だけ元URLへ戻す
  const [imgFallback, setImgFallback] = useState(false);
  const displaySrc = imgFallback
    ? avatar.image_url
    : getOptimizedImageUrl(avatar.image_url, { width: 600 });

  // 他人のアバターのプロンプトを引き継いで、自分のアバターを作る
  const handleUseThisStyle = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!avatar.prompt) return;
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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.25 }}
      className="group relative break-inside-avoid mb-3 rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/40 hover:shadow-xl transition-all"
    >
      <div
        className="relative w-full aspect-[4/5] overflow-hidden bg-muted cursor-pointer"
        onClick={() => navigate(`/ai-avatar/${avatar.id}`)}
      >
        <img
          src={displaySrc}
          alt={avatar.name || t("chrome.exploreCard.avatarImageAlt")}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          onError={() => {
            if (!imgFallback) setImgFallback(true);
          }}
          className={cn(
            "w-full h-full object-cover transition-opacity",
            imgLoaded ? "opacity-100" : "opacity-0"
          )}
        />
        {!imgLoaded && <Skeleton className="absolute inset-0 rounded-none" />}

        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/80 backdrop-blur text-[10px] font-semibold text-primary">
          <Sparkles className="w-3 h-3" />
          AI
        </div>

        {/* 着せ替え済み（グッズを使った）アバターの印 */}
        {!!avatar.item_ids?.length && (
          <div className="absolute top-2 left-12 flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/90 backdrop-blur text-[10px] font-semibold text-accent-foreground">
            <Package className="w-3 h-3" />
            {avatar.item_ids.length}
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleBookmark.mutate({
              workId: avatar.id,
              workType: "avatar",
              isBookmarked,
            });
          }}
          className={cn(
            "absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur transition-colors",
            isBookmarked
              ? "bg-primary text-primary-foreground"
              : "bg-background/80 text-foreground hover:bg-background"
          )}
          aria-label={t("chrome.exploreCard.bookmark")}
        >
          <Bookmark className={cn("w-4 h-4", isBookmarked && "fill-current")} />
        </button>

        {/* hover 時アクション。プロンプトが無いアバター（アップロード画像）では出さない */}
        {avatar.prompt && (
          <div className="absolute inset-x-0 bottom-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-background/95 via-background/70 to-transparent pt-12">
            <Button size="sm" onClick={handleUseThisStyle} className="w-full h-8 text-xs gap-1">
              <Wand2 className="w-3 h-3" />
              {t("chrome.exploreCard.useThisStyle")}
            </Button>
          </div>
        )}
      </div>

      <div className="p-2.5 space-y-1.5">
        {avatar.name && <h3 className="text-sm font-medium truncate">{avatar.name}</h3>}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => navigate(`/user/${avatar.user_id}`)}
            className="flex items-center gap-1.5 min-w-0 flex-1 hover:opacity-80"
          >
            <Avatar className="w-5 h-5 border border-border shrink-0">
              <AvatarImage src={avatar.profile?.avatar_url || undefined} />
              <AvatarFallback className="text-[8px]">
                {avatar.profile?.username?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">
              {avatar.profile?.display_name ||
                avatar.profile?.username ||
                t("chrome.exploreCard.userFallback")}
            </span>
          </button>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleLike.mutate(avatar.id);
              }}
              disabled={toggleLike.isPending}
              className={cn(
                "flex items-center gap-0.5 transition-colors",
                isLiked ? "text-rose-500" : "hover:text-foreground"
              )}
              aria-pressed={isLiked}
              aria-label={t("chrome.exploreCard.like")}
            >
              <Heart className={cn("w-3 h-3", isLiked && "fill-current")} />
              {avatar.like_count}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="hover:text-foreground p-0.5">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                <DropdownMenuItem onClick={() => navigate(`/user/${avatar.user_id}`)}>
                  <Package className="w-4 h-4 mr-2" />
                  {t("chrome.exploreCard.viewTheirGoods")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleUseThisStyle} disabled={!avatar.prompt}>
                  <Wand2 className="w-4 h-4 mr-2" />
                  {t("chrome.exploreCard.useThisStyle")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
