import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Home, User, Pencil, Sparkles, Plus, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  profileId: string;
  isOwnProfile: boolean;
  featuredRoomId: string | null;
  featuredAvatarId: string | null;
}

interface RoomRow {
  id: string;
  image_url: string;
  title: string | null;
}
interface AvatarRow {
  id: string;
  image_url: string;
  name: string | null;
}

export function ProfileShowcase({
  profileId,
  isOwnProfile,
  featuredRoomId,
  featuredAvatarId,
}: Props) {
  const navigate = useNavigate();
  const [pickerOpen, setPickerOpen] = useState<"room" | "avatar" | null>(null);

  // 表示中の featured room / avatar
  const { data: featuredRoom } = useQuery({
    queryKey: ["featured-room", featuredRoomId],
    queryFn: async (): Promise<RoomRow | null> => {
      if (!featuredRoomId) return null;
      const { data } = await supabase
        .from("ai_generated_rooms")
        .select("id, image_url, title")
        .eq("id", featuredRoomId)
        .maybeSingle();
      return data;
    },
    enabled: !!featuredRoomId,
    staleTime: 60_000,
  });

  const { data: featuredAvatar } = useQuery({
    queryKey: ["featured-avatar", featuredAvatarId],
    queryFn: async (): Promise<AvatarRow | null> => {
      if (!featuredAvatarId) return null;
      const { data } = await supabase
        .from("avatar_gallery")
        .select("id, image_url, name")
        .eq("id", featuredAvatarId)
        .maybeSingle();
      return data;
    },
    enabled: !!featuredAvatarId,
    staleTime: 60_000,
  });

  // 何も無ければ他人プロフィールでは表示しない
  if (!isOwnProfile && !featuredRoom && !featuredAvatar) return null;

  const openRoomDetail = () => {
    if (featuredRoom) navigate(`/ai-work/${featuredRoom.id}`);
  };

  const hasAny = !!featuredRoom || !!featuredAvatar;

  return (
    <section className="px-4 mt-6">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <h2 className="text-[13px] font-bold tracking-wide">マイステージ</h2>
        </div>
        {isOwnProfile && hasAny && (
          <button
            onClick={() => setPickerOpen(featuredRoom ? "room" : "avatar")}
            className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <Pencil className="w-3 h-3" /> 編集
          </button>
        )}
      </div>

      {/* ヒーロー型ショーケース */}
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-muted to-muted/40 shadow-sm">
        {/* 背景: ルーム */}
        {featuredRoom?.image_url ? (
          <button
            onClick={openRoomDetail}
            className="absolute inset-0 w-full h-full group"
            aria-label="ルームを開く"
          >
            <img
              src={featuredRoom.image_url}
              alt={featuredRoom.title || "マイルーム"}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />
          </button>
        ) : (
          <button
            onClick={isOwnProfile ? () => setPickerOpen("room") : undefined}
            disabled={!isOwnProfile}
            className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground"
          >
            <Home className="w-8 h-8 opacity-40" />
            <p className="text-xs font-medium">
              {isOwnProfile ? "お気に入りルームを設定" : "ルーム未設定"}
            </p>
            {isOwnProfile && (
              <span className="mt-1 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                <Plus className="w-3 h-3" /> 追加
              </span>
            )}
          </button>
        )}

        {/* 上部ラベル */}
        {featuredRoom && (
          <div className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-[10px] font-medium">
            <Home className="w-3 h-3" />
            {featuredRoom.title || "マイルーム"}
          </div>
        )}

        {/* オーナー編集ボタン */}
        {isOwnProfile && featuredRoom && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPickerOpen("room");
            }}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white flex items-center justify-center"
            aria-label="ルーム変更"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}

        {/* アバター: 左下に重ねる */}
        <div className="absolute bottom-3 left-3 flex items-end gap-2.5">
          <div className="relative">
            {featuredAvatar?.image_url ? (
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-primary/40 blur-lg" />
                <img
                  src={featuredAvatar.image_url}
                  alt={featuredAvatar.name || "マイアバター"}
                  className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-white shadow-xl"
                />
                {isOwnProfile && (
                  <button
                    onClick={() => setPickerOpen("avatar")}
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md border-2 border-background"
                    aria-label="アバター変更"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={isOwnProfile ? () => setPickerOpen("avatar") : undefined}
                disabled={!isOwnProfile}
                className={cn(
                  "w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1 backdrop-blur-md",
                  featuredRoom
                    ? "bg-white/15 border-white/50 text-white"
                    : "bg-background/60 border-border text-muted-foreground"
                )}
              >
                <User className="w-5 h-5 opacity-80" />
                <span className="text-[9px] font-medium leading-tight text-center px-1">
                  {isOwnProfile ? "アバター追加" : "未設定"}
                </span>
              </button>
            )}
          </div>

          {featuredAvatar?.name && (
            <div className="mb-1 max-w-[40%]">
              <p className={cn(
                "text-[11px] font-semibold truncate",
                featuredRoom ? "text-white drop-shadow" : "text-foreground"
              )}>
                {featuredAvatar.name}
              </p>
              <p className={cn(
                "text-[9px]",
                featuredRoom ? "text-white/80" : "text-muted-foreground"
              )}>
                マイアバター
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ピッカー */}
      {isOwnProfile && (
        <ShowcasePicker
          open={pickerOpen}
          profileId={profileId}
          currentRoomId={featuredRoomId}
          currentAvatarId={featuredAvatarId}
          onClose={() => setPickerOpen(null)}
        />
      )}
    </section>
  );
}

function ShowcaseCard({
  icon: Icon,
  label,
  imageUrl,
  title,
  isOwnProfile,
  onClick,
  onEdit,
  emptyHint,
}: {
  icon: typeof Home;
  label: string;
  imageUrl?: string;
  title?: string | null;
  isOwnProfile: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  emptyHint: string;
}) {
  const isEmpty = !imageUrl;
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        disabled={!onClick}
        className={cn(
          "relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-muted transition-all",
          onClick && "hover:shadow-md hover:border-primary/40",
          isEmpty && "flex flex-col items-center justify-center gap-2 text-muted-foreground"
        )}
      >
        {imageUrl ? (
          <>
            <img src={imageUrl} alt={title || label} className="w-full h-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
              <div className="flex items-center gap-1 text-white text-[10px] font-medium">
                <Icon className="w-3 h-3" />
                {label}
              </div>
              {title && (
                <p className="text-white text-xs font-semibold truncate mt-0.5">{title}</p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center">
              {isOwnProfile ? <Plus className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
            </div>
            <p className="text-[11px] font-medium px-2 text-center">
              {isOwnProfile ? emptyHint : `${label}は未設定`}
            </p>
          </>
        )}
      </button>
      {isOwnProfile && imageUrl && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.();
          }}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm flex items-center justify-center"
          aria-label="変更"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function ShowcasePicker({
  open,
  profileId,
  currentRoomId,
  currentAvatarId,
  onClose,
}: {
  open: "room" | "avatar" | null;
  profileId: string;
  currentRoomId: string | null;
  currentAvatarId: string | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isOpen = open !== null;
  const tab = open ?? "room";

  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ["my-ai-rooms-picker", profileId],
    queryFn: async (): Promise<RoomRow[]> => {
      const { data } = await supabase
        .from("ai_generated_rooms")
        .select("id, image_url, title")
        .eq("user_id", profileId)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: isOpen,
  });

  const { data: avatars = [], isLoading: avatarsLoading } = useQuery({
    queryKey: ["my-avatars-picker", profileId],
    queryFn: async (): Promise<AvatarRow[]> => {
      const { data } = await supabase
        .from("avatar_gallery")
        .select("id, image_url, name")
        .eq("user_id", profileId)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: isOpen,
  });

  const update = async (patch: { featured_room_id?: string | null; featured_avatar_id?: string | null }) => {
    const { error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", profileId);
    if (error) {
      toast.error("更新に失敗しました");
      return;
    }
    toast.success("ショーケースを更新しました");
    await queryClient.invalidateQueries({ queryKey: ["profile", profileId] });
    await queryClient.invalidateQueries({ queryKey: ["featured-room"] });
    await queryClient.invalidateQueries({ queryKey: ["featured-avatar"] });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>ショーケースを設定</DialogTitle>
          <DialogDescription>
            プロフィールに表示するルームとアバターを選びましょう
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="room" disabled>
              <Home className="w-4 h-4 mr-1.5" /> ルーム
            </TabsTrigger>
            <TabsTrigger value="avatar" disabled>
              <User className="w-4 h-4 mr-1.5" /> アバター
            </TabsTrigger>
          </TabsList>

          <TabsContent value="room" className="flex-1 overflow-y-auto mt-3">
            <PickerGrid
              items={rooms}
              loading={roomsLoading}
              currentId={currentRoomId}
              emptyMessage="まだルームがありません。AIスタジオで作成してください。"
              onSelect={(id) => update({ featured_room_id: id })}
              onClear={currentRoomId ? () => update({ featured_room_id: null }) : undefined}
            />
          </TabsContent>

          <TabsContent value="avatar" className="flex-1 overflow-y-auto mt-3">
            <PickerGrid
              items={avatars}
              loading={avatarsLoading}
              currentId={currentAvatarId}
              emptyMessage="まだアバターがありません。AIスタジオで作成してください。"
              onSelect={(id) => update({ featured_avatar_id: id })}
              onClear={currentAvatarId ? () => update({ featured_avatar_id: null }) : undefined}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function PickerGrid({
  items,
  loading,
  currentId,
  emptyMessage,
  onSelect,
  onClear,
}: {
  items: { id: string; image_url: string; title?: string | null; name?: string | null }[];
  loading: boolean;
  currentId: string | null;
  emptyMessage: string;
  onSelect: (id: string) => void;
  onClear?: () => void;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-1">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground px-4">{emptyMessage}</div>
    );
  }
  return (
    <div className="space-y-3 p-1">
      {onClear && (
        <Button variant="outline" size="sm" onClick={onClear} className="gap-1.5">
          <X className="w-3.5 h-3.5" />
          ピン留めを解除
        </Button>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((it) => {
          const selected = it.id === currentId;
          return (
            <button
              key={it.id}
              onClick={() => onSelect(it.id)}
              className={cn(
                "relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
                selected
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border hover:border-primary/50"
              )}
            >
              <img src={it.image_url} alt={it.title || it.name || ""} className="w-full h-full object-cover" />
              {(it.title || it.name) && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                  <p className="text-white text-[10px] font-medium truncate">{it.title || it.name}</p>
                </div>
              )}
              {selected && (
                <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                  <Check className="w-3.5 h-3.5" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
