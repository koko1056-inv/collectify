import { useState } from "react";
import { motion } from "framer-motion";
import {
  Heart,
  Bookmark,
  Wand2,
  Repeat,
  Package,
  MoreHorizontal,
  Sparkles,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useToggleAiBookmark } from "@/hooks/ai-room/useAiBookmarks";
import { setPendingRemix } from "@/utils/ai-studio-handoff";
import { toast } from "sonner";

export interface ExploreRoom {
  id: string;
  user_id: string;
  image_url: string;
  title: string | null;
  style_prompt: string | null;
  style_preset: string | null;
  custom_prompt: string | null;
  source_item_ids: string[] | null;
  source_item_images: string[] | null;
  like_count: number;
  created_at: string;
  parent_room_id?: string | null;
  profile?: {
    username: string | null;
    avatar_url: string | null;
    display_name: string | null;
  } | null;
}

interface Props {
  room: ExploreRoom;
  isBookmarked: boolean;
}

export function ExploreRoomCard({ room, isBookmarked }: Props) {
  const navigate = useNavigate();
  const toggleBookmark = useToggleAiBookmark();
  const [imgLoaded, setImgLoaded] = useState(false);

  const handleStyleClone = () => {
    setPendingRemix({
      mode: "style",
      parentRoomId: room.id,
      stylePrompt: room.style_prompt,
      stylePreset: room.style_preset,
      customPrompt: room.custom_prompt,
      parentImageUrl: room.image_url,
      parentTitle: room.title,
    });
    toast.success("このスタイルでルームを作成します ✨");
    navigate("/my-room?tab=studio&from=explore");
  };

  const handleRemix = () => {
    setPendingRemix({
      mode: "remix",
      parentRoomId: room.id,
      stylePrompt: room.style_prompt,
      stylePreset: room.style_preset,
      customPrompt: room.custom_prompt,
      items: (room.source_item_ids || []).map((id, i) => ({
        id,
        title: "",
        image: room.source_item_images?.[i] || "",
      })),
      parentImageUrl: room.image_url,
      parentTitle: room.title,
    });
    toast.success("同じ素材でリミックスします 🎨");
    navigate("/my-room?tab=studio&from=explore");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.25 }}
      className="group relative break-inside-avoid mb-3 rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/40 hover:shadow-xl transition-all"
    >
      {/* メイン画像 */}
      <div
        className="relative w-full overflow-hidden bg-muted cursor-pointer"
        onClick={() => navigate(`/ai-work/${room.id}`)}
      >
        <img
          src={room.image_url}
          alt={room.title || "AI生成ルーム"}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          className={cn(
            "w-full h-auto object-cover transition-opacity",
            imgLoaded ? "opacity-100" : "opacity-0"
          )}
        />
        {!imgLoaded && (
          <div className="absolute inset-0 bg-muted animate-pulse aspect-square" />
        )}

        {/* AI バッジ */}
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/80 backdrop-blur text-[10px] font-semibold text-primary">
          <Sparkles className="w-3 h-3" />
          AI
        </div>

        {/* リミックスバッジ */}
        {room.parent_room_id && (
          <div className="absolute top-2 left-12 flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/90 backdrop-blur text-[10px] font-semibold text-accent-foreground">
            <Repeat className="w-3 h-3" />
            Remix
          </div>
        )}

        {/* ブックマーク */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleBookmark.mutate({
              workId: room.id,
              workType: "room",
              isBookmarked,
            });
          }}
          className={cn(
            "absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur transition-colors",
            isBookmarked
              ? "bg-primary text-primary-foreground"
              : "bg-background/80 text-foreground hover:bg-background"
          )}
        >
          <Bookmark className={cn("w-4 h-4", isBookmarked && "fill-current")} />
        </button>

        {/* hover 時アクションオーバーレイ */}
        <div className="absolute inset-x-0 bottom-0 p-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-background/95 via-background/70 to-transparent pt-12">
          <div className="flex gap-1.5">
            <Button
              size="sm"
              onClick={handleStyleClone}
              className="flex-1 h-8 text-xs gap-1"
            >
              <Wand2 className="w-3 h-3" />
              このスタイルで作る
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleRemix}
              className="flex-1 h-8 text-xs gap-1"
              disabled={!room.source_item_ids?.length}
            >
              <Repeat className="w-3 h-3" />
              リミックス
            </Button>
          </div>
        </div>
      </div>

      {/* メタ情報 */}
      <div className="p-2.5 space-y-1.5">
        {room.title && (
          <h3 className="text-sm font-medium truncate">{room.title}</h3>
        )}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => navigate(`/user/${room.user_id}`)}
            className="flex items-center gap-1.5 min-w-0 flex-1 hover:opacity-80"
          >
            <Avatar className="w-5 h-5 border border-border shrink-0">
              <AvatarImage src={room.profile?.avatar_url || undefined} />
              <AvatarFallback className="text-[8px]">
                {room.profile?.username?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">
              {room.profile?.display_name || room.profile?.username || "ユーザー"}
            </span>
          </button>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground shrink-0">
            <span className="flex items-center gap-0.5">
              <Heart className="w-3 h-3" />
              {room.like_count}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="hover:text-foreground p-0.5">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                <DropdownMenuItem onClick={() => navigate(`/user/${room.user_id}`)}>
                  <Package className="w-4 h-4 mr-2" />
                  この人の素材を見る
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleStyleClone}>
                  <Wand2 className="w-4 h-4 mr-2" />
                  このスタイルで作る
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleRemix}
                  disabled={!room.source_item_ids?.length}
                >
                  <Repeat className="w-4 h-4 mr-2" />
                  リミックス
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
