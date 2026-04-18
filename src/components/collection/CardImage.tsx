import { useState, memo } from "react";
import { ItemImageUpload } from "../item/ItemImageUpload";
import { Button } from "../ui/button";
import { Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { LazyImage } from "../ui/lazy-image";

import { Badge } from "../ui/badge";

interface CardImageProps {
  image: string;
  title: string;
  itemId?: string;
  isEditable?: boolean;
  quantity?: number;
}

const CardImage = memo(function CardImage({
  image,
  title,
  itemId,
  isEditable = false,
  quantity
}: CardImageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();
  const handleImageChange = async (file: File | null) => {
    if (!file || !itemId) return;
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${itemId}-${Date.now()}.${fileExt}`;
      const {
        error: uploadError
      } = await supabase.storage.from('kuji_images').upload(filePath, file);
      if (uploadError) throw uploadError;
      const {
        data: {
          publicUrl
        }
      } = supabase.storage.from('kuji_images').getPublicUrl(filePath);
      const {
        error: updateError
      } = await supabase.from('user_items').update({
        image: publicUrl
      }).eq('id', itemId);
      if (updateError) throw updateError;
      await Promise.all([queryClient.invalidateQueries({
        queryKey: ["user-items"],
        refetchType: "all"
      }), queryClient.invalidateQueries({
        queryKey: ["item-details", itemId],
        refetchType: "all"
      }), queryClient.invalidateQueries({
        queryKey: ["collection"],
        refetchType: "all"
      })]);
      queryClient.setQueriesData({
        queryKey: ["user-items"]
      }, (oldData: any) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.map(item => item.id === itemId ? {
          ...item,
          image: publicUrl
        } : item);
      });
      queryClient.setQueriesData({
        queryKey: ["item-details", itemId]
      }, (oldData: any) => ({
        ...oldData,
        image: publicUrl
      }));
      toast({
        title: "画像を更新しました",
        description: "コレクションの画像が正常に更新されました。"
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating image:', error);
      toast({
        title: "エラーが発生しました",
        description: "画像の更新中にエラーが発生しました。もう一度お試しください。",
        variant: "destructive"
      });
    }
  };
  return <div className="aspect-square relative overflow-hidden rounded-t-xl group bg-muted/40">
      <LazyImage 
        key={`${image}-${Date.now()}`} 
        src={image} 
        alt={title} 
        className="w-full h-full transition-transform duration-500 group-hover:scale-110 object-cover"
        skeletonClassName="aspect-square"
      />
      {/* グラデーションオーバーレイ（タイトル可読性向上） */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      {/* 数量バッジ（2個以上の時のみ表示） */}
      {quantity && quantity > 1 && (
        <div className="absolute top-2 right-2 min-w-[26px] h-[26px] px-1.5 rounded-full bg-background/95 backdrop-blur-sm border border-border/50 shadow-md flex items-center justify-center">
          <span className="text-[11px] font-bold text-foreground leading-none">×{quantity}</span>
        </div>
      )}
      {isEditable}

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogTitle>画像を編集</DialogTitle>
          <ItemImageUpload onImageChange={handleImageChange} previewUrl={previewUrl} setPreviewUrl={setPreviewUrl} />
        </DialogContent>
      </Dialog>
    </div>;
});

export { CardImage };