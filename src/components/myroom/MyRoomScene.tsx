import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Palette, Shuffle, Heart, Eye, Loader2, Trash2, Play, Pause, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Profile } from "@/types";
import { useMyRoom, RoomItem } from "@/hooks/useMyRoom";
import { useRoomBgm } from "@/hooks/useRoomBgm";
import { IsometricRoomScene } from "./IsometricRoomScene";
import { PlaceItemSheet } from "./PlaceItemSheet";
import { SceneEditorSheet } from "./SceneEditorSheet";
import { getRoomTheme, getTimeOfDay, getTimeFilter } from "./roomThemes";
import { TOTAL_SLOTS } from "./roomSlots";
import { shuffleRoom, removeFromRoom } from "./autoPlace";

interface MyRoomSceneProps {
  profile: Profile;
}

export function MyRoomScene({ profile }: MyRoomSceneProps) {
  const qc = useQueryClient();
  const {
    mainRoom,
    roomItems,
    likeCount,
    isLoading,
    createMainRoom,
    isOwnRoom,
  } = useMyRoom();

  const [showPlace, setShowPlace] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const [selected, setSelected] = useState<RoomItem | null>(null);

  const tod = getTimeOfDay();
  const timeMeta = getTimeFilter(tod);
  const theme = getRoomTheme(mainRoom?.background_color);

  // 部屋がない場合
  if (!isLoading && !mainRoom) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-5 border border-primary/20">
          <span className="text-4xl">🏠</span>
        </div>
        <h3 className="text-xl font-bold mb-2">推しと過ごすお部屋</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          グッズが自動で並ぶ、あなただけの小さな世界を作りましょう
        </p>
        <Button
          size="lg"
          onClick={() => createMainRoom.mutate(undefined)}
          disabled={createMainRoom.isPending}
          className="rounded-full px-8"
        >
          {createMainRoom.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>お部屋を作る</>
          )}
        </Button>
      </div>
    );
  }

  if (isLoading || !mainRoom) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const handleShuffle = async () => {
    if (roomItems.length === 0) {
      toast.info("先にグッズを飾ってね");
      return;
    }
    setShuffling(true);
    try {
      await shuffleRoom(mainRoom.id, roomItems);
      qc.invalidateQueries({ queryKey: ["room-items"] });
      toast.success("お部屋をシャッフルしました");
    } catch {
      toast.error("失敗しました");
    } finally {
      setShuffling(false);
    }
  };

  const handleRemove = async (item: RoomItem) => {
    await removeFromRoom(item.id);
    qc.invalidateQueries({ queryKey: ["room-items"] });
    toast.success("外しました");
    setSelected(null);
  };

  const occupied = roomItems.length;
  const themeId = (mainRoom.background_color ?? "").startsWith("theme:")
    ? mainRoom.background_color!.slice(6)
    : "natural";

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-4">
      {/* 上部ステータス: 1行 */}
      <div className="flex items-center gap-2 px-2 mb-3 text-xs sm:text-sm">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 border border-border/40">
          <span>{timeMeta.emoji}</span>
          <span className="font-medium">{timeMeta.greeting}</span>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted/60 border border-border/40">
          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-medium tabular-nums">{mainRoom.visit_count ?? 0}</span>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted/60 border border-border/40">
          <Heart className="w-3.5 h-3.5 text-rose-500" />
          <span className="font-medium tabular-nums">{likeCount}</span>
        </div>
        <div className="ml-auto text-[10px] text-muted-foreground tabular-nums">
          {occupied}/{TOTAL_SLOTS}
        </div>
      </div>

      {/* 部屋シーン */}
      <div className="relative w-full rounded-3xl overflow-hidden border border-border/40 shadow-xl bg-muted/20">
        <div className="relative w-full" style={{ aspectRatio: "4 / 3" }}>
          <IsometricRoomScene
            items={roomItems}
            theme={theme}
            timeOfDay={tod}
            avatarUrl={profile.avatar_url}
            onItemClick={isOwnRoom ? setSelected : undefined}
            className="absolute inset-0"
          />

          {/* 空の部屋ガイド */}
          {roomItems.length === 0 && (
            <div className="absolute inset-x-0 bottom-6 flex justify-center pointer-events-none">
              <div className="px-4 py-2 rounded-full bg-background/85 backdrop-blur-md text-xs font-medium border border-border/50 shadow-lg">
                ↓ 「グッズを飾る」から推しを並べよう
              </div>
            </div>
          )}

          {/* シャッフルFAB */}
          {isOwnRoom && roomItems.length > 0 && (
            <button
              onClick={handleShuffle}
              disabled={shuffling}
              className="absolute top-3 right-3 h-10 w-10 rounded-full bg-background/85 backdrop-blur-md border border-border/40 shadow-lg flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50"
              title="シャッフル"
            >
              {shuffling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Shuffle className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* 下部 2ボタン */}
      {isOwnRoom && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button
            size="lg"
            onClick={() => setShowPlace(true)}
            className="h-14 rounded-2xl text-base font-semibold gap-2 shadow-md"
          >
            <Plus className="w-5 h-5" />
            グッズを飾る
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => setShowTheme(true)}
            className="h-14 rounded-2xl text-base font-semibold gap-2 shadow-md"
          >
            <Palette className="w-5 h-5" />
            模様替え
          </Button>
        </div>
      )}

      {/* シート群 */}
      <PlaceItemSheet
        open={showPlace}
        onOpenChange={setShowPlace}
        roomId={mainRoom.id}
        roomItems={roomItems}
      />
      <ThemePickerSheet
        open={showTheme}
        onOpenChange={setShowTheme}
        roomId={mainRoom.id}
        currentThemeId={themeId}
      />

      {/* アイテム選択シート */}
      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="text-base">
                  {selected.item_data?.title ?? "このグッズ"}
                </SheetTitle>
              </SheetHeader>
              <div className="flex items-center gap-3 my-4">
                <img
                  src={selected.item_data?.image || selected.custom_image_url || ""}
                  alt=""
                  className="w-20 h-20 rounded-xl object-contain bg-muted/40 p-1"
                />
                <p className="text-sm text-muted-foreground">
                  お部屋から外しますか？
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => setSelected(null)} className="rounded-full">
                  キャンセル
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleRemove(selected)}
                  className="rounded-full gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  外す
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
