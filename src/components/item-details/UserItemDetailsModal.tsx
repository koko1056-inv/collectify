import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Calendar, Tag, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Item3DPreview } from "./Item3DPreview";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface UserItemDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  title: string;
  image: string;
}

export function UserItemDetailsModal({
  isOpen,
  onClose,
  itemId,
  title,
  image,
}: UserItemDetailsModalProps) {
  const queryClient = useQueryClient();
  const [isGenerating3D, setIsGenerating3D] = useState(false);
  const [generation3DProgress, setGeneration3DProgress] = useState<{
    status: string;
    progress: number;
    message: string;
  } | null>(null);

  // user_itemの詳細を取得
  const { data: itemDetails, isLoading } = useQuery({
    queryKey: ["user-item-details", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_items")
        .select(`
          *,
          user_item_tags (
            id,
            tag_id,
            tags (
              id,
              name
            )
          )
        `)
        .eq("id", itemId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!itemId,
  });

  // 3Dモデルを生成
  const handleGenerate3D = useCallback(async () => {
    const imageUrl = itemDetails?.image || image;
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
        .from("user_items")
        .update({ model_3d_task_id: taskId })
        .eq("id", itemId);

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
          
          // 成功：3DモデルURLをuser_itemsに保存
          await supabase
            .from("user_items")
            .update({ 
              model_3d_url: statusData.modelUrl,
              model_3d_task_id: null 
            })
            .eq("id", itemId);

          setTimeout(() => {
            setIsGenerating3D(false);
            setGeneration3DProgress(null);
          }, 1000);
          
          toast.success("3Dモデルが完成しました！");
          queryClient.invalidateQueries({ queryKey: ["user-item-details", itemId] });
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
  }, [itemDetails?.image, image, itemId, queryClient]);

  const has3DModel = !!itemDetails?.model_3d_url;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-6">
            <span className="truncate">{title}</span>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* メイン画像 */}
            <div className="aspect-square w-full rounded-lg overflow-hidden bg-muted">
              <img
                src={itemDetails?.image || image}
                alt={title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* 3Dプレビュー */}
            {itemDetails?.model_3d_url && (
              <Item3DPreview 
                modelUrl={itemDetails.model_3d_url} 
                title={title} 
              />
            )}

            {/* 3Dモデル生成ボタン */}
            {!has3DModel && (
              <div className="space-y-2">
                {isGenerating3D ? (
                  <div className="space-y-2 p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{generation3DProgress?.message || '生成中...'}</span>
                    </div>
                    <Progress value={generation3DProgress?.progress || 0} className="h-2" />
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={handleGenerate3D}
                  >
                    <Box className="w-4 h-4" />
                    3Dモデルを生成
                  </Button>
                )}
              </div>
            )}

            {/* 詳細情報 */}
            <div className="space-y-3">
              {itemDetails?.content_name && (
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">コンテンツ:</span>
                  <span className="font-medium">{itemDetails.content_name}</span>
                </div>
              )}

              {itemDetails?.release_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">発売日:</span>
                  <span className="font-medium">{itemDetails.release_date}</span>
                </div>
              )}

              {itemDetails?.prize && (
                <div className="text-sm">
                  <span className="text-muted-foreground">価格:</span>
                  <span className="font-medium ml-2">{itemDetails.prize}</span>
                </div>
              )}

              {itemDetails?.quantity && itemDetails.quantity > 1 && (
                <div className="text-sm">
                  <span className="text-muted-foreground">所持数:</span>
                  <Badge variant="secondary" className="ml-2">
                    ×{itemDetails.quantity}
                  </Badge>
                </div>
              )}

              {itemDetails?.note && (
                <div className="text-sm">
                  <span className="text-muted-foreground">メモ:</span>
                  <p className="mt-1 text-foreground bg-muted p-2 rounded">
                    {itemDetails.note}
                  </p>
                </div>
              )}

              {/* タグ */}
              {itemDetails?.user_item_tags && itemDetails.user_item_tags.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">タグ:</span>
                  <div className="flex flex-wrap gap-1">
                    {itemDetails.user_item_tags.map((tagItem: any) => (
                      <Badge key={tagItem.id} variant="outline" className="text-xs">
                        {tagItem.tags?.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
