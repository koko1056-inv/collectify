import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  Heart, 
  Eye, 
  Plus, 
  Minus,
  Layers,
  X,
  Share2,
  Trash2,
  Square,
  PanelLeft,
  PanelTop,
  Palette,
  Maximize2,
  Box,
  Loader2,
  RotateCcw,
  RotateCw,
  Armchair,
  MoveHorizontal,
  MoveVertical,
  Move3d
} from "lucide-react";
import { useMyRoom, RoomItem, PlacementType } from "@/hooks/useMyRoom";
import { useAuth } from "@/contexts/AuthContext";
import { Profile } from "@/types";
import { cn } from "@/lib/utils";
import { Room3DScene } from "./Room3DScene";
import { RoomFurniture } from "./FurnitureItem3D";
import { FURNITURE_PRESETS, FURNITURE_CATEGORIES, FurniturePreset } from "./furniturePresets";
import { ROOM_THEMES, THEME_CATEGORIES } from "./roomThemes";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRoomFurniture } from "@/hooks/useRoomFurniture";
import { useRoomScreenshot } from "@/hooks/useRoomScreenshot";


// Theme ID is stored in background_color as "theme:<id>" format
const THEME_PREFIX = "theme:";

interface Room3DEditorProps {
  profile: Profile | undefined;
  isFullScreen?: boolean;
  onClose?: () => void;
}

export function Room3DEditor({ profile, isFullScreen = false, onClose }: Room3DEditorProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showItemPalette, setShowItemPalette] = useState(false);
  const [showFurniturePalette, setShowFurniturePalette] = useState(false);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RoomItem | null>(null);
  const [selectedFurniture, setSelectedFurniture] = useState<RoomFurniture | null>(null);
  const [selectedPlacement, setSelectedPlacement] = useState<PlacementType>('floor');
  const [selectedFurnitureCategory, setSelectedFurnitureCategory] = useState<string>('chair');
  const [isGenerating3D, setIsGenerating3D] = useState(false);
  const [generation3DProgress, setGeneration3DProgress] = useState<{
    status: string;
    progress: number;
    message: string;
  } | null>(null);
  const [itemRotations, setItemRotations] = useState<Record<string, number>>({});
  
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

  const {
    furniture: roomFurniture,
    addFurniture: addFurnitureMutation,
    updateFurniture: updateFurnitureMutation,
    deleteFurniture: deleteFurnitureMutation,
    seedDefaults,
  } = useRoomFurniture(mainRoom?.id);

  const { shareScreenshot, downloadScreenshot } = useRoomScreenshot();

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
    setSelectedFurniture(null);
    toast.info(`${item.item_data?.title || "アイテム"}を選択しました`);
  }, []);

  const handleFurnitureClick = useCallback((furniture: RoomFurniture) => {
    setSelectedFurniture(furniture);
    setSelectedItem(null);
    const preset = FURNITURE_PRESETS.find(p => p.id === furniture.furniture_id);
    toast.info(`${preset?.name || "家具"}を選択しました`);
  }, []);

  const handleAddFurniture = useCallback((preset: FurniturePreset, placement: PlacementType) => {
    addFurnitureMutation.mutate({
      furniture_id: preset.id,
      position_x: Math.random() * 60 + 20,
      position_y: Math.random() * 60 + 20,
      placement,
      scale: preset.defaultScale,
      rotation_y: 0,
    });
    toast.success(`${preset.name}を追加しました！`);
    setShowFurniturePalette(false);
  }, [addFurnitureMutation]);

  const handleDeleteFurniture = useCallback((furnitureId: string) => {
    deleteFurnitureMutation.mutate(furnitureId);
    setSelectedFurniture(null);
  }, [deleteFurnitureMutation]);

  const handleMoveFurniture = useCallback((furnitureId: string, posX: number, posY: number) => {
    updateFurnitureMutation.mutate({ id: furnitureId, position_x: posX, position_y: posY });
  }, [updateFurnitureMutation]);

  const handleScaleFurniture = useCallback((furnitureId: string, delta: number) => {
    const f = roomFurniture.find(f => f.id === furnitureId);
    if (!f) return;
    const newScale = Math.max(0.3, Math.min(3, f.scale + delta));
    updateFurnitureMutation.mutate({ id: furnitureId, scale: newScale });
    setSelectedFurniture(prev => {
      if (!prev || prev.id !== furnitureId) return prev;
      return { ...prev, scale: newScale };
    });
  }, [roomFurniture, updateFurnitureMutation]);

  // 家具の位置をX/Y軸で調整
  const handleAdjustFurniturePosition = useCallback((
    furnitureId: string,
    axis: 'x' | 'y',
    delta: number
  ) => {
    const f = roomFurniture.find(f => f.id === furnitureId);
    if (!f) return;
    const updates = axis === 'x'
      ? { position_x: Math.max(0, Math.min(100, f.position_x + delta)) }
      : { position_y: Math.max(0, Math.min(100, f.position_y + delta)) };
    updateFurnitureMutation.mutate({ id: furnitureId, ...updates });
    setSelectedFurniture(prev => {
      if (!prev || prev.id !== furnitureId) return prev;
      return { ...prev, ...updates };
    });
  }, [roomFurniture, updateFurnitureMutation]);

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

  // アイテムを移動
  const handleMoveItem = useCallback(async (itemId: string, posX: number, posY: number) => {
    try {
      const { error } = await supabase
        .from("binder_items")
        .update({ position_x: posX, position_y: posY })
        .eq("id", itemId);
      
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["room-items"] });
    } catch (error) {
      console.error("Error moving item:", error);
      toast.error("アイテムの移動に失敗しました");
    }
  }, [queryClient]);

  // アイテムの配置場所を変更
  const handleChangePlacement = useCallback(async (itemId: string, placement: PlacementType) => {
    try {
      const placementRotation = placement === 'floor' ? 0 : placement === 'back_wall' ? 90 : 180;
      const { error } = await supabase
        .from("binder_items")
        .update({ rotation: placementRotation, position_x: 50, position_y: 50 })
        .eq("id", itemId);
      
      if (error) throw error;
      
      const placementNames = { floor: '床', back_wall: '後ろの壁', left_wall: '左の壁' };
      toast.success(`${placementNames[placement]}に移動しました`);
      
      // 選択中のアイテムの配置場所も更新
      if (selectedItem && selectedItem.id === itemId) {
        setSelectedItem({ ...selectedItem, placement, position_x: 50, position_y: 50 });
      }
      
      queryClient.invalidateQueries({ queryKey: ["room-items"] });
    } catch (error) {
      console.error("Error changing placement:", error);
      toast.error("配置場所の変更に失敗しました");
    }
  }, [queryClient, selectedItem]);

  // アイテムのサイズを変更
  const handleResizeItem = useCallback(async (itemId: string, newSize: number) => {
    try {
      const clampedSize = Math.max(50, Math.min(200, newSize));
      const { error } = await supabase
        .from("binder_items")
        .update({ width: clampedSize, height: clampedSize })
        .eq("id", itemId);
      
      if (error) throw error;
      
      // 選択中のアイテムのサイズも更新
      if (selectedItem && selectedItem.id === itemId) {
        setSelectedItem({ ...selectedItem, width: clampedSize, height: clampedSize });
      }
      
      queryClient.invalidateQueries({ queryKey: ["room-items"] });
    } catch (error) {
      console.error("Error resizing item:", error);
      toast.error("サイズ変更に失敗しました");
    }
  }, [queryClient, selectedItem]);

  // アイテムの位置をX/Y/Z軸で調整
  const handleAdjustItemPosition = useCallback(async (
    itemId: string, 
    axis: 'x' | 'y' | 'z', 
    delta: number
  ) => {
    const item = roomItems.find(i => i.id === itemId) || selectedItem;
    if (!item) return;

    try {
      let updates: Record<string, number> = {};
      
      if (axis === 'x') {
        const newX = Math.max(0, Math.min(100, item.position_x + delta));
        updates.position_x = newX;
      } else if (axis === 'y') {
        const newY = Math.max(0, Math.min(100, item.position_y + delta));
        updates.position_y = newY;
      } else if (axis === 'z') {
        const newZ = Math.max(0, Math.min(20, item.z_index + delta));
        updates.z_index = newZ;
      }

      const { error } = await supabase
        .from("binder_items")
        .update(updates)
        .eq("id", itemId);
      
      if (error) throw error;
      
      // 選択中のアイテムも更新
      if (selectedItem && selectedItem.id === itemId) {
        setSelectedItem({ ...selectedItem, ...updates });
      }
      
      queryClient.invalidateQueries({ queryKey: ["room-items"] });
    } catch (error) {
      console.error("Error adjusting item position:", error);
      toast.error("位置調整に失敗しました");
    }
  }, [queryClient, selectedItem, roomItems]);

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

  // 3Dモデルを生成
  const handleGenerate3D = useCallback(async (item: RoomItem) => {
    const imageUrl = item.custom_image_url || item.item_data?.image;
    if (!imageUrl) {
      toast.error("画像がありません");
      return;
    }

    setIsGenerating3D(true);
    setGeneration3DProgress({ status: 'STARTING', progress: 0, message: '3D生成を開始しています...' });
    
    try {
      // 3D生成タスクを作成
      const { data: createData, error: createError } = await supabase.functions.invoke('generate-3d-model', {
        body: { action: 'create', imageUrl }
      });

      if (createError) throw createError;
      
      const taskId = createData.taskId;
      setGeneration3DProgress({ status: 'PENDING', progress: 10, message: 'タスクを作成しました...' });

      // タスクIDを保存
      await supabase
        .from("binder_items")
        .update({ model_3d_task_id: taskId })
        .eq("id", item.id);

      // ステータスをポーリング
      let attempts = 0;
      const maxAttempts = 60; // 最大5分
      
      const pollStatus = async () => {
        attempts++;
        
        const { data: statusData, error: statusError } = await supabase.functions.invoke('generate-3d-model', {
          body: { action: 'check_status', taskId }
        });

        if (statusError) throw statusError;

        // 進捗状態を更新
        const progressMap: Record<string, { progress: number; message: string }> = {
          'PENDING': { progress: 20, message: 'キューで待機中...' },
          'IN_PROGRESS': { progress: 50, message: '3Dモデルを生成中...' },
          'PROCESSING': { progress: 70, message: 'モデルを処理中...' },
        };
        
        const progressInfo = progressMap[statusData.status] || { progress: Math.min(30 + attempts * 2, 90), message: '処理中...' };
        setGeneration3DProgress({ 
          status: statusData.status, 
          progress: progressInfo.progress,
          message: progressInfo.message
        });

        if (statusData.status === 'SUCCEEDED' && statusData.modelUrl) {
          setGeneration3DProgress({ status: 'SUCCEEDED', progress: 100, message: '完了！' });
          
          // 成功：3DモデルURLをbinder_itemsに保存
          await supabase
            .from("binder_items")
            .update({ 
              model_3d_url: statusData.modelUrl,
              model_3d_task_id: null 
            })
            .eq("id", item.id);

          // user_itemsにも3DモデルURLを保存（グッズに紐付け）
          if (item.user_item_id) {
            await supabase
              .from("user_items")
              .update({ 
                model_3d_url: statusData.modelUrl,
                model_3d_task_id: null 
              })
              .eq("id", item.user_item_id);
          }

          setTimeout(() => {
            setIsGenerating3D(false);
            setGeneration3DProgress(null);
          }, 1000);
          
          toast.success("3Dモデルが完成しました！");
          queryClient.invalidateQueries({ queryKey: ["room-items"] });
          queryClient.invalidateQueries({ queryKey: ["user-collection"] });
          return;
        } else if (statusData.status === 'FAILED') {
          throw new Error("3D生成に失敗しました");
        } else if (attempts < maxAttempts) {
          // 進行中：5秒後に再チェック
          setTimeout(pollStatus, 5000);
        } else {
          throw new Error("タイムアウト");
        }
      };

      pollStatus();
    } catch (error) {
      console.error("Error generating 3D:", error);
      setIsGenerating3D(false);
      setGeneration3DProgress(null);
      toast.error("3D生成に失敗しました");
    }
  }, [queryClient]);

  // 3Dモデルの回転を変更
  const handleRotate3D = useCallback((itemId: string, delta: number) => {
    setItemRotations(prev => {
      const current = prev[itemId] || 0;
      const newRotation = (current + delta + 360) % 360;
      return { ...prev, [itemId]: newRotation };
    });
  }, []);

  // 回転をリセット
  const handleResetRotation = useCallback((itemId: string) => {
    setItemRotations(prev => {
      const newRotations = { ...prev };
      delete newRotations[itemId];
      return newRotations;
    });
  }, []);
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
                title="グッズを追加"
              >
                <Plus className="w-5 h-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/10"
                onClick={() => setShowFurniturePalette(true)}
                title="家具を追加"
              >
                <Armchair className="w-5 h-5" />
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
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={() => shareScreenshot(mainRoom?.title)}
          >
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* 3Dシーン */}
      <div className="flex-1 relative">
        <Room3DScene
          roomItems={roomItems}
          roomFurniture={roomFurniture}
          backgroundImage={mainRoom?.background_image}
          backgroundColor={mainRoom?.background_color}
          roomTitle={mainRoom?.title}
          isEditing={isOwnRoom}
          onItemClick={handleItemClick}
          onItemMove={handleMoveItem}
          onFurnitureClick={handleFurnitureClick}
          onFurnitureMove={handleMoveFurniture}
          avatarUrl={profile?.avatar_url}
          selectedItemId={selectedItem?.id}
          selectedFurnitureId={selectedFurniture?.id}
          itemRotations={itemRotations}
        />
      </div>

      {/* 家具編集ツールバー */}
      {isOwnRoom && selectedFurniture && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center justify-center gap-2 bg-black/80 backdrop-blur-md rounded-2xl px-4 py-3 shadow-xl max-w-[95vw]">
          <span className="text-white text-sm mr-2">
            {FURNITURE_PRESETS.find(p => p.id === selectedFurniture.furniture_id)?.name}
          </span>
          <div className="w-px h-8 bg-white/20" />
          
          {/* X軸調整 */}
          <div className="flex items-center gap-1">
            <span className="text-white/60 text-xs">X:</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10 rounded-lg"
              onClick={() => handleAdjustFurniturePosition(selectedFurniture.id, 'x', -5)}
            >
              <Minus className="w-3 h-3" />
            </Button>
            <span className="text-white text-xs w-8 text-center">{Math.round(selectedFurniture.position_x)}</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10 rounded-lg"
              onClick={() => handleAdjustFurniturePosition(selectedFurniture.id, 'x', 5)}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>

          {/* Y軸調整 */}
          <div className="flex items-center gap-1">
            <span className="text-white/60 text-xs">Y:</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10 rounded-lg"
              onClick={() => handleAdjustFurniturePosition(selectedFurniture.id, 'y', -5)}
            >
              <Minus className="w-3 h-3" />
            </Button>
            <span className="text-white text-xs w-8 text-center">{Math.round(selectedFurniture.position_y)}</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10 rounded-lg"
              onClick={() => handleAdjustFurniturePosition(selectedFurniture.id, 'y', 5)}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          
          <div className="w-px h-8 bg-white/20" />
          
          {/* サイズ変更 */}
          <div className="flex items-center gap-1">
            <span className="text-white/60 text-xs">サイズ:</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10 rounded-lg"
              onClick={() => handleScaleFurniture(selectedFurniture.id, -0.2)}
            >
              <Minus className="w-3 h-3" />
            </Button>
            <span className="text-white text-xs w-10 text-center">
              {Math.round(selectedFurniture.scale * 100)}%
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10 rounded-lg"
              onClick={() => handleScaleFurniture(selectedFurniture.id, 0.2)}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          
          <div className="w-px h-8 bg-white/20" />
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-3 text-xs gap-1.5 rounded-lg text-red-400 hover:bg-red-500/20 hover:text-red-300"
            onClick={() => handleDeleteFurniture(selectedFurniture.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
            削除
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10 rounded-lg"
            onClick={() => setSelectedFurniture(null)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* 編集ツールバー（選択アイテムがある場合のみ） */}
      {isOwnRoom && selectedItem && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center justify-center gap-2 bg-black/80 backdrop-blur-md rounded-2xl px-4 py-3 shadow-xl max-w-[95vw]">
          {/* X軸調整 */}
          <div className="flex items-center gap-1">
            <span className="text-white/60 text-xs">X:</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10 rounded-lg"
              onClick={() => handleAdjustItemPosition(selectedItem.id, 'x', -5)}
            >
              <Minus className="w-3 h-3" />
            </Button>
            <span className="text-white text-xs w-8 text-center">{Math.round(selectedItem.position_x)}</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10 rounded-lg"
              onClick={() => handleAdjustItemPosition(selectedItem.id, 'x', 5)}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>

          {/* Y軸調整 */}
          <div className="flex items-center gap-1">
            <span className="text-white/60 text-xs">Y:</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10 rounded-lg"
              onClick={() => handleAdjustItemPosition(selectedItem.id, 'y', -5)}
            >
              <Minus className="w-3 h-3" />
            </Button>
            <span className="text-white text-xs w-8 text-center">{Math.round(selectedItem.position_y)}</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10 rounded-lg"
              onClick={() => handleAdjustItemPosition(selectedItem.id, 'y', 5)}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>

          {/* Z軸（高さ）調整 */}
          <div className="flex items-center gap-1">
            <span className="text-white/60 text-xs">Z:</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10 rounded-lg"
              onClick={() => handleAdjustItemPosition(selectedItem.id, 'z', -1)}
            >
              <Minus className="w-3 h-3" />
            </Button>
            <span className="text-white text-xs w-8 text-center">{selectedItem.z_index}</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10 rounded-lg"
              onClick={() => handleAdjustItemPosition(selectedItem.id, 'z', 1)}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          
          <div className="w-px h-8 bg-white/20" />

          {/* サイズ調整 */}
          <div className="flex items-center gap-1">
            <span className="text-white/60 text-xs">サイズ:</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10 rounded-lg"
              onClick={() => handleResizeItem(selectedItem.id, selectedItem.width - 10)}
            >
              <Minus className="w-3 h-3" />
            </Button>
            <span className="text-white text-xs w-8 text-center">{Math.round(selectedItem.width)}%</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10 rounded-lg"
              onClick={() => handleResizeItem(selectedItem.id, selectedItem.width + 10)}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          
          <div className="w-px h-8 bg-white/20" />
          
          {/* 削除ボタン */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-3 text-xs gap-1.5 rounded-lg text-red-400 hover:bg-red-500/20 hover:text-red-300"
            onClick={() => handleDeleteItem(selectedItem.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
            削除
          </Button>
          
          {/* 選択解除ボタン */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10 rounded-lg"
            onClick={() => setSelectedItem(null)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* 操作ヒント */}
      <div className="absolute bottom-4 right-4 z-10 text-white/50 text-xs space-y-1">
        <p>ドラッグ: 移動</p>
        <p>回転/ズーム: タッチ操作</p>
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
          
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 overflow-y-auto max-h-[calc(70vh-180px)] p-1">
            {userItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleAddItem(item, selectedPlacement)}
                className="flex flex-col rounded-lg overflow-hidden border border-border hover:border-primary transition-all hover:scale-[1.02] bg-card shadow-sm"
              >
                <div className="aspect-square w-full overflow-hidden bg-muted">
                  <img 
                    src={item.image} 
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-2 text-left">
                  <p className="text-xs font-medium truncate text-foreground">
                    {item.title}
                  </p>
                </div>
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

      {/* 背景テーマ選択シート */}
      <Sheet open={showBackgroundPicker} onOpenChange={setShowBackgroundPicker}>
        <SheetContent side="bottom" className="h-[65vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              ルームテーマを選択
            </SheetTitle>
          </SheetHeader>

          <Tabs defaultValue="dark" className="mt-4">
            <TabsList className="grid w-full grid-cols-4">
              {THEME_CATEGORIES.map((cat) => (
                <TabsTrigger key={cat.id} value={cat.id} className="text-xs gap-1">
                  <span>{cat.icon}</span>
                  {cat.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {THEME_CATEGORIES.map((cat) => (
              <TabsContent key={cat.id} value={cat.id} className="mt-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[calc(65vh-180px)] overflow-y-auto p-1">
                  {ROOM_THEMES.filter(t => t.category === cat.id).map((theme) => {
                    const isSelected = mainRoom?.background_color === `${THEME_PREFIX}${theme.id}`;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => updateBackground.mutate(`${THEME_PREFIX}${theme.id}`)}
                        disabled={updateBackground.isPending}
                        className={cn(
                          "rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.03] text-left",
                          isSelected
                            ? "border-primary ring-2 ring-primary/50"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div
                          className="aspect-[4/3] w-full flex flex-col items-center justify-center relative"
                          style={{
                            background: `linear-gradient(135deg, ${theme.floorColor}, ${theme.wallColor})`,
                          }}
                        >
                          <span className="text-3xl mb-1">{theme.icon}</span>
                          <div
                            className="absolute inset-0 opacity-30"
                            style={{
                              background: `radial-gradient(circle at 30% 40%, ${theme.accentColor}40, transparent 60%)`,
                            }}
                          />
                        </div>
                        <div className="p-2.5 bg-card">
                          <p className="text-sm font-medium text-foreground">{theme.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{theme.description}</p>
                        </div>
                      </button>
                    );
                  })}
                  {ROOM_THEMES.filter(t => t.category === cat.id).length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      <p>Coming soon...</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* 家具パレットシート */}
      <Sheet open={showFurniturePalette} onOpenChange={setShowFurniturePalette}>
        <SheetContent side="bottom" className="h-[70vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Armchair className="w-5 h-5" />
              家具を追加
            </SheetTitle>
          </SheetHeader>
          
          <Tabs value={selectedFurnitureCategory} onValueChange={setSelectedFurnitureCategory} className="mt-4">
            <TabsList className="flex flex-wrap h-auto gap-1">
              {FURNITURE_CATEGORIES.map((cat) => (
                <TabsTrigger key={cat.id} value={cat.id} className="text-xs gap-1">
                  <span>{cat.icon}</span>
                  {cat.name}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {FURNITURE_CATEGORIES.map((cat) => (
              <TabsContent key={cat.id} value={cat.id} className="mt-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[calc(70vh-180px)] overflow-y-auto p-1">
                  {FURNITURE_PRESETS.filter(f => f.category === cat.id).map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleAddFurniture(preset, preset.allowedPlacements[0])}
                      className="flex flex-col rounded-lg overflow-hidden border border-border hover:border-primary transition-all hover:scale-[1.02] bg-card shadow-sm p-4"
                    >
                      <div className="text-4xl text-center mb-2">{preset.icon}</div>
                      <p className="text-sm font-medium text-center text-foreground">{preset.name}</p>
                      <p className="text-xs text-muted-foreground text-center mt-1">
                        {preset.allowedPlacements.includes('floor') ? '床' : '壁'}に設置
                      </p>
                    </button>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </SheetContent>
      </Sheet>
    </div>
  );
}
