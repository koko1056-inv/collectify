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
  return <div className="aspect-square relative overflow-hidden bg-muted/30 group">
      <LazyImage 
        key={`${image}-${Date.now()}`} 
        src={image} 
        alt={title} 
        className="w-full h-full transition-transform duration-500 group-hover:scale-105 object-cover"
        skeletonClassName="aspect-square"
      />
      {/* 数量バッジ（2個以上の時のみ表示） */}
      {quantity && quantity > 1 && (
        <div className="absolute top-2 right-2 min-w-[24px] h-6 px-1.5 rounded-full bg-foreground/85 backdrop-blur-sm shadow-sm flex items-center justify-center">
          <span className="text-[10px] font-semibold text-background leading-none tabular-nums">×{quantity}</span>
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