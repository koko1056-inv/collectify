import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  Heart, 
  Eye, 
  Plus, 
  Layers,
  X,
  Share2,
  Trash2,
  Square,
  PanelLeft,
  PanelTop,
  Palette
} from "lucide-react";
import { useMyRoom, RoomItem, PlacementType } from "@/hooks/useMyRoom";
import { useAuth } from "@/contexts/AuthContext";
import { Profile } from "@/types";
import { cn } from "@/lib/utils";
import { Room3DScene } from "./Room3DScene";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// 背景プリセット
const BACKGROUND_PRESETS = [
  { id: 'cyber', name: 'サイバー', color: '#1a1a2e', gradient: 'from-[#1a1a2e] to-[#0f0f23]' },
  { id: 'sunset', name: 'サンセット', color: '#3d1a1a', gradient: 'from-[#3d1a1a] to-[#1a0a0f]' },
  { id: 'forest', name: 'フォレスト', color: '#1a3d1a', gradient: 'from-[#1a3d1a] to-[#0a1a0f]' },
  { id: 'ocean', name: 'オーシャン', color: '#1a2a3d', gradient: 'from-[#1a2a3d] to-[#0a0f1a]' },
  { id: 'pink', name: 'ピンク', color: '#3d1a3d', gradient: 'from-[#3d1a3d] to-[#1a0a1a]' },
  { id: 'midnight', name: 'ミッドナイト', color: '#101025', gradient: 'from-[#101025] to-[#050510]' },
  { id: 'warm', name: 'ウォーム', color: '#3d2a1a', gradient: 'from-[#3d2a1a] to-[#1a1408]' },
  { id: 'light', name: 'ライト', color: '#4a4a5a', gradient: 'from-[#4a4a5a] to-[#3a3a4a]' },
];

interface Room3DEditorProps {
  profile: Profile | undefined;
  isFullScreen?: boolean;
  onClose?: () => void;
}

export function Room3DEditor({ profile, isFullScreen = false, onClose }: Room3DEditorProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showItemPalette, setShowItemPalette] = useState(false);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RoomItem | null>(null);
  const [selectedPlacement, setSelectedPlacement] = useState<PlacementType>('floor');
  
  const { 
    mainRoom, 
    roomItems, 
    likeCount, 
    isLiked, 
    isLoading, 
    createMainRoom,
    toggleLike,
    isOwnRoom
  } = useMyRoom();

  // ユーザーのコレクションアイテムを取得
  const { data: userItems = [] } = useQuery({
    queryKey: ["user-collection-for-room", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("user_items")
        .select("id, title, image")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const handleItemClick = useCallback((item: RoomItem) => {
    setSelectedItem(item);
    toast.info(`${item.item_data?.title || "アイテム"}を選択しました`);
  }, []);

  const queryClient = useQueryClient();

  const handleAddItem = useCallback(async (userItem: typeof userItems[0], placement: PlacementType) => {
    if (!mainRoom?.id) return;
    
    // 配置場所に応じた初期位置を設定
    const getInitialPosition = () => {
      switch (placement) {
        case 'back_wall':
          return { x: Math.random() * 60 + 20, y: Math.random() * 60 + 20 };
        case 'left_wall':
          return { x: Math.random() * 60 + 20, y: Math.random() * 60 + 20 };
        default:
          return { x: Math.random() * 60 + 20, y: Math.random() * 60 + 20 };
      }
    };
    
    const pos = getInitialPosition();
    
    try {
      // Note: placement will be stored in a JSON field or we use z_index as a workaround
      // For now, encoding placement in the rotation field (0=floor, 90=back_wall, 180=left_wall)
      const placementRotation = placement === 'floor' ? 0 : placement === 'back_wall' ? 90 : 180;
      
      const { error } = await supabase
        .from("binder_items")
        .insert({
          binder_page_id: mainRoom.id,
          user_item_id: userItem.id,
          position_x: pos.x,
          position_y: pos.y,
          width: 100,
          height: 100,
          rotation: placementRotation,
          z_index: roomItems.length,
        });
      
      if (error) throw error;
      
      const placementNames = { floor: '床', back_wall: '後ろの壁', left_wall: '左の壁' };
      toast.success(`${placementNames[placement]}にアイテムを追加しました！`);
      setShowItemPalette(false);
      queryClient.invalidateQueries({ queryKey: ["room-items"] });
    } catch (error) {
      console.error("Error adding item:", error);
      toast.error("アイテムの追加に失敗しました");
    }
  }, [mainRoom?.id, roomItems.length, queryClient]);

  const handleDeleteItem = useCallback(async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("binder_items")
        .delete()
        .eq("id", itemId);
      
      if (error) throw error;
      toast.success("アイテムを削除しました");
      setSelectedItem(null);
      queryClient.invalidateQueries({ queryKey: ["room-items"] });
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("削除に失敗しました");
    }
  }, [queryClient]);

  // 背景を変更
  const updateBackground = useMutation({
    mutationFn: async (backgroundColor: string) => {
      if (!mainRoom?.id) throw new Error("Room not found");
      
      const { error } = await supabase
        .from("binder_pages")
        .update({ background_color: backgroundColor })
        .eq("id", mainRoom.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("背景を変更しました");
      setShowBackgroundPicker(false);
      queryClient.invalidateQueries({ queryKey: ["main-room"] });
    },
    onError: () => {
      toast.error("背景の変更に失敗しました");
    }
  });

  // ルームがない場合の作成画面
  if (!isLoading && !mainRoom && user) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center relative",
        isFullScreen ? "fixed inset-0 z-50 bg-background" : "min-h-[60vh] px-4"
      )}>
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-pink-900/20" />
        
        <div className="relative z-10 text-center space-y-6 max-w-md">
          <div className="w-40 h-40 mx-auto bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-full flex items-center justify-center animate-pulse">
            <Home className="w-20 h-20 text-purple-400" />
          </div>
          
          <div className="space-y-3">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              3Dマイルームを作ろう！
            </h2>
            <p className="text-muted-foreground">
              自分だけの推し部屋を3D空間に作って、グッズを自由に飾りましょう
            </p>
          </div>

          <Button 
            size="lg" 
            onClick={() => createMainRoom.mutate("マイルーム")}
            disabled={createMainRoom.isPending}
            className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/25"
          >
            <Plus className="w-5 h-5" />
            3Dルームを作成
          </Button>
        </div>
      </div>
    );
  }

  // ローディング
  if (isLoading) {
    return (
      <div className={cn(
        "flex items-center justify-center",
        isFullScreen ? "fixed inset-0 z-50 bg-background" : "min-h-[60vh]"
      )}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">3Dルームを準備中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col relative",
      isFullScreen ? "fixed inset-0 z-50" : "min-h-[60vh]"
    )}>
      {/* ヘッダー */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center gap-3">
          {isFullScreen && onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10">
              <X className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h2 className="text-white font-bold text-lg">{mainRoom?.title || "マイルーム"}</h2>
            <div className="flex items-center gap-4 text-white/70 text-sm">
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {mainRoom?.visit_count || 0}
              </span>
              <span className="flex items-center gap-1">
                <Heart className={cn("w-3 h-3", isLiked && "fill-current text-red-400")} />
                {likeCount}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isOwnRoom && (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/10"
                onClick={() => setShowItemPalette(true)}
              >
                <Plus className="w-5 h-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/10"
                onClick={() => setShowBackgroundPicker(true)}
              >
                <Palette className="w-5 h-5" />
              </Button>
            </>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/10"
            onClick={() => toggleLike.mutate()}
            disabled={!user || isOwnRoom}
          >
            <Heart className={cn("w-5 h-5", isLiked && "fill-current text-red-400")} />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* 3Dシーン */}
      <div className="flex-1 relative">
        <Room3DScene
          roomItems={roomItems}
          backgroundImage={mainRoom?.background_image}
          backgroundColor={mainRoom?.background_color}
          roomTitle={mainRoom?.title}
          isEditing={isOwnRoom}
          onItemClick={handleItemClick}
          avatarUrl={profile?.avatar_url}
        />
      </div>

      {/* 編集ツールバー（選択アイテムがある場合のみ） */}
      {isOwnRoom && selectedItem && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-black/70 backdrop-blur-md rounded-full px-4 py-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white hover:bg-white/10 gap-2"
            onClick={() => handleDeleteItem(selectedItem.id)}
          >
            <Trash2 className="w-4 h-4" />
            削除
          </Button>
        </div>
      )}

      {/* 操作ヒント */}
      <div className="absolute bottom-4 right-4 z-10 text-white/50 text-xs space-y-1">
        <p>ドラッグ: 回転</p>
        <p>スクロール: ズーム</p>
        <p>右クリック+ドラッグ: 移動</p>
      </div>

      {/* アイテムパレットシート */}
      <Sheet open={showItemPalette} onOpenChange={setShowItemPalette}>
        <SheetContent side="bottom" className="h-[70vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              コレクションからアイテムを追加
            </SheetTitle>
          </SheetHeader>
          
          {/* 配置場所選択 */}
          <div className="mt-4 mb-4">
            <p className="text-sm text-muted-foreground mb-2">配置場所を選択:</p>
            <ToggleGroup 
              type="single" 
              value={selectedPlacement} 
              onValueChange={(v) => v && setSelectedPlacement(v as PlacementType)}
              className="justify-start"
            >
              <ToggleGroupItem value="floor" aria-label="床" className="gap-2">
                <Square className="w-4 h-4" />
                床
              </ToggleGroupItem>
              <ToggleGroupItem value="back_wall" aria-label="後ろの壁" className="gap-2">
                <PanelTop className="w-4 h-4" />
                後ろの壁
              </ToggleGroupItem>
              <ToggleGroupItem value="left_wall" aria-label="左の壁" className="gap-2">
                <PanelLeft className="w-4 h-4" />
                左の壁
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 overflow-y-auto max-h-[calc(70vh-180px)]">
            {userItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleAddItem(item, selectedPlacement)}
                className="aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-primary transition-all hover:scale-105 bg-muted"
              >
                <img 
                  src={item.image} 
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
            
            {userItems.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                <p>コレクションにアイテムがありません</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => navigate("/collection")}
                >
                  コレクションを見る
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* 背景選択シート */}
      <Sheet open={showBackgroundPicker} onOpenChange={setShowBackgroundPicker}>
        <SheetContent side="bottom" className="h-[50vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              背景テーマを選択
            </SheetTitle>
          </SheetHeader>
          
          <div className="grid grid-cols-4 sm:grid-cols-4 gap-4 mt-6">
            {BACKGROUND_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => updateBackground.mutate(preset.color)}
                disabled={updateBackground.isPending}
                className={cn(
                  "aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105 flex flex-col items-center justify-center",
                  mainRoom?.background_color === preset.color 
                    ? "border-primary ring-2 ring-primary/50" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className={cn(
                  "w-full h-full bg-gradient-to-br flex items-center justify-center",
                  preset.gradient
                )}>
                  <span className="text-white/80 text-xs font-medium drop-shadow-lg">
                    {preset.name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
