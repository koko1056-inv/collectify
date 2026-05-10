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

  return (
    <section className="px-4 mt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-bold">ショーケース</h2>
        </div>
        {isOwnProfile && (
          <span className="text-[10px] text-muted-foreground">
            お気に入りのルーム・アバターをピン留め
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* ルーム */}
        <ShowcaseCard
          icon={Home}
          label="マイルーム"
          imageUrl={featuredRoom?.image_url}
          title={featuredRoom?.title}
          isOwnProfile={isOwnProfile}
          onClick={featuredRoom ? openRoomDetail : isOwnProfile ? () => setPickerOpen("room") : undefined}
          onEdit={isOwnProfile ? () => setPickerOpen("room") : undefined}
          emptyHint="お気に入りルームを設定"
        />
        {/* アバター */}
        <ShowcaseCard
          icon={User}
          label="マイアバター"
          imageUrl={featuredAvatar?.image_url}
          title={featuredAvatar?.name}
          isOwnProfile={isOwnProfile}
          onClick={isOwnProfile && !featuredAvatar ? () => setPickerOpen("avatar") : undefined}
          onEdit={isOwnProfile ? () => setPickerOpen("avatar") : undefined}
          emptyHint="お気に入りアバターを設定"
        />
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
