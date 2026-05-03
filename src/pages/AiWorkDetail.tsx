import { useNavigate, useParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Sparkles,
  Wand2,
  Repeat,
  Bookmark,
  Heart,
  Share2,
  Package,
} from "lucide-react";
import { useAiRoomDetail, useRemixLineage } from "@/hooks/ai-room/useAiRoomDetail";
import {
  useMyAiBookmarks,
  useToggleAiBookmark,
} from "@/hooks/ai-room/useAiBookmarks";
import { setPendingRemix } from "@/utils/ai-studio-handoff";
import { getStylePresetById } from "@/components/ai-room/roomStylePresets";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ShareModal } from "@/components/ShareModal";

export default function AiWorkDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useAiRoomDetail(id);
  const { data: bookmarks } = useMyAiBookmarks();
  const toggleBookmark = useToggleAiBookmark();
  const room = data?.room;
  const profile = data?.profile;
  const { data: lineage } = useRemixLineage(room);
  const [shareOpen, setShareOpen] = useState(false);

  const isBookmarked = !!bookmarks?.has(`room:${room?.id}`);
  const preset = room?.style_preset ? getStylePresetById(room.style_preset) : null;

  const handleStyleClone = () => {
    if (!room) return;
    setPendingRemix({
      mode: "style",
      parentRoomId: room.id,
      stylePrompt: room.style_prompt,
      stylePreset: room.style_preset,
      visualStyle: (room as any).visual_style,
      customPrompt: room.custom_prompt,
      parentImageUrl: room.image_url,
      parentTitle: room.title,
    });
    toast.success("このスタイルでルームを作成します ✨");
    navigate("/my-room?tab=studio&from=explore");
  };

  const handleRemix = () => {
    if (!room) return;
    setPendingRemix({
      mode: "remix",
      parentRoomId: room.id,
      stylePrompt: room.style_prompt,
      stylePreset: room.style_preset,
      customPrompt: room.custom_prompt,
      items: (room.source_item_ids || []).map((sid, i) => ({
        id: sid,
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="w-full pb-24 pt-4">
        <div className="max-w-4xl mx-auto px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/explore"))}
            className="gap-1 text-muted-foreground hover:text-foreground -ml-2 mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            戻る
          </Button>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="aspect-video rounded-3xl" />
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : !room ? (
            <div className="bg-card rounded-2xl border p-10 text-center">
              <p className="font-semibold mb-2">作品が見つかりません</p>
              <Button onClick={() => navigate("/explore")}>探索ページへ</Button>
            </div>
          ) : (
            <>
              {/* Hero */}
              <div className="relative rounded-3xl overflow-hidden bg-muted border border-border/40 shadow-xl">
                <img
                  src={room.image_url}
                  alt={room.title || "AI作品"}
                  className="w-full h-auto max-h-[70vh] object-contain bg-black/5"
                />
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-background/80 backdrop-blur text-xs font-semibold text-primary">
                    <Sparkles className="w-3.5 h-3.5" /> AI
                  </div>
                  {room.parent_room_id && (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/90 backdrop-blur text-xs font-semibold text-accent-foreground">
                      <Repeat className="w-3.5 h-3.5" /> Remix
                    </div>
                  )}
                </div>
                <button
                  onClick={() =>
                    toggleBookmark.mutate({
                      workId: room.id,
                      workType: "room",
                      isBookmarked,
                    })
                  }
                  className={cn(
                    "absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur transition-colors shadow",
                    isBookmarked
                      ? "bg-primary text-primary-foreground"
                      : "bg-background/80 hover:bg-background"
                  )}
                >
                  <Bookmark className={cn("w-5 h-5", isBookmarked && "fill-current")} />
                </button>
              </div>

              {/* Meta */}
              <div className="mt-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold truncate">
                      {room.title || "無題のAIルーム"}
                    </h1>
                    {preset && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <span>{preset.emoji}</span>
                        <span>{preset.name}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5" /> {room.like_count}
                    </span>
                  </div>
                </div>

                {profile && (
                  <button
                    onClick={() => navigate(`/user/${profile.id}`)}
                    className="flex items-center gap-2 hover:opacity-80"
                  >
                    <Avatar className="w-8 h-8 border border-border">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback>{profile.username?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="text-sm font-medium">
                        {profile.display_name || profile.username}
                      </p>
                      <p className="text-[11px] text-muted-foreground">@{profile.username}</p>
                    </div>
                  </button>
                )}

                {room.custom_prompt && (
                  <p className="text-sm text-foreground/90 leading-relaxed bg-muted/40 rounded-xl p-3">
                    {room.custom_prompt}
                  </p>
                )}

                {/* アクション */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button onClick={handleStyleClone} className="gap-1.5">
                    <Wand2 className="w-4 h-4" />
                    このスタイルで作る
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleRemix}
                    disabled={!room.source_item_ids?.length}
                    className="gap-1.5"
                  >
                    <Repeat className="w-4 h-4" />
                    リミックス
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShareOpen(true)}
                    className="gap-1.5"
                  >
                    <Share2 className="w-4 h-4" />
                    シェア
                  </Button>
                </div>
              </div>

              {/* 使われた素材 */}
              {room.source_item_images && room.source_item_images.length > 0 && (
                <section className="mt-8">
                  <h2 className="text-sm font-bold mb-3 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-primary" />
                    使われた素材 ({room.source_item_images.length})
                  </h2>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {room.source_item_images.map((src, i) => (
                      <div
                        key={i}
                        className="aspect-square rounded-xl overflow-hidden bg-muted border border-border/40"
                      >
                        <img src={src} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 親作品 */}
              {lineage?.parent && (
                <section className="mt-8">
                  <h2 className="text-sm font-bold mb-3 flex items-center gap-1.5">
                    <Repeat className="w-4 h-4 text-accent-foreground" />
                    リミックス元
                  </h2>
                  <button
                    onClick={() => navigate(`/ai-work/${lineage.parent!.id}`)}
                    className="block w-full max-w-xs rounded-2xl overflow-hidden bg-muted border border-border hover:border-primary/40 transition-all"
                  >
                    <img
                      src={lineage.parent.image_url}
                      alt=""
                      className="w-full aspect-video object-cover"
                    />
                    <div className="p-2 text-left">
                      <p className="text-sm font-medium truncate">
                        {lineage.parent.title || "無題のAIルーム"}
                      </p>
                    </div>
                  </button>
                </section>
              )}

              {/* 派生作品 */}
              {lineage?.children && lineage.children.length > 0 && (
                <section className="mt-8">
                  <h2 className="text-sm font-bold mb-3 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-primary" />
                    この作品から派生 ({lineage.children.length})
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {lineage.children.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => navigate(`/ai-work/${c.id}`)}
                        className="rounded-2xl overflow-hidden bg-muted border border-border hover:border-primary/40 transition-all"
                      >
                        <img
                          src={c.image_url}
                          alt=""
                          className="w-full aspect-video object-cover"
                        />
                        <div className="p-2 text-left">
                          <p className="text-xs font-medium truncate">
                            {c.title || "無題"}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
      {room && (
        <ShareModal
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          title={`${room.title || "AIで作った推しルーム"} 🏠✨ #Collectify`}
          url={typeof window !== "undefined" ? window.location.href : ""}
          image={room.image_url}
        />
      )}
    </div>
  );
}
