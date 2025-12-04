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
  RotateCw
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
          onItemMove={handleMoveItem}
          avatarUrl={profile?.avatar_url}
          selectedItemId={selectedItem?.id}
          itemRotations={itemRotations}
        />
      </div>

      {/* 編集ツールバー（選択アイテムがある場合のみ） */}
      {isOwnRoom && selectedItem && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-black/70 backdrop-blur-md rounded-full px-4 py-2">
          {/* サイズ変更 */}
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon"
              className="text-white hover:bg-white/10 h-8 w-8"
              onClick={() => handleResizeItem(selectedItem.id, (selectedItem.width || 100) - 20)}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-1 text-white text-xs px-2">
              <Maximize2 className="w-3 h-3" />
              <span>{selectedItem.width || 100}%</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              className="text-white hover:bg-white/10 h-8 w-8"
              onClick={() => handleResizeItem(selectedItem.id, (selectedItem.width || 100) + 20)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="w-px h-6 bg-white/20" />
          
          {/* 3D生成ボタン / 進捗表示 */}
          {!selectedItem.model_3d_url && !isGenerating3D && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-purple-400 hover:bg-purple-500/20 gap-2"
              onClick={() => handleGenerate3D(selectedItem)}
            >
              <Box className="w-4 h-4" />
              3Dに変換
            </Button>
          )}
          
          {isGenerating3D && generation3DProgress && (
            <div className="flex items-center gap-3 px-2">
              <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
              <div className="flex flex-col gap-1 min-w-[120px]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/80">{generation3DProgress.message}</span>
                  <span className="text-purple-400">{generation3DProgress.progress}%</span>
                </div>
                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                    style={{ width: `${generation3DProgress.progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}
          
          {selectedItem.model_3d_url && (
            <>
              <div className="flex items-center gap-1 text-green-400 text-xs px-2">
                <Box className="w-3 h-3" />
                <span>3D済み</span>
              </div>
              
              <div className="w-px h-6 bg-white/20" />
              
              {/* 3Dモデル回転操作 */}
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-white hover:bg-white/10 h-8 w-8"
                  onClick={() => handleRotate3D(selectedItem.id, -45)}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-1 text-white text-xs px-2 min-w-[50px] justify-center">
                  <span>{itemRotations[selectedItem.id] || 0}°</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-white hover:bg-white/10 h-8 w-8"
                  onClick={() => handleRotate3D(selectedItem.id, 45)}
                >
                  <RotateCw className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
          
          <div className="w-px h-6 bg-white/20" />
          
          {/* 削除 */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-red-400 hover:bg-red-500/20 gap-2"
            onClick={() => handleDeleteItem(selectedItem.id)}
          >
            <Trash2 className="w-4 h-4" />
            削除
          </Button>
        </div>
      )}

      {/* 操作ヒント */}
      <div className="absolute bottom-4 right-4 z-10 text-white/50 text-xs space-y-1">
        <p>アイテムをドラッグ: 移動</p>
        <p>背景ドラッグ: 回転</p>
        <p>スクロール: ズーム</p>
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
