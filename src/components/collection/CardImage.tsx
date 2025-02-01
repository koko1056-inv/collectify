import { useState } from "react";
import { ImageUpload } from "../ImageUpload";
import { Button } from "../ui/button";
import { Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface CardImageProps {
  image: string;
  title: string;
  itemId?: string;
  isEditable?: boolean;
}

export function CardImage({ image, title, itemId, isEditable = false }: CardImageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleImageChange = async (file: File | null) => {
    if (!file || !itemId) return;

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${itemId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('kuji_images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('kuji_images')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('user_items')
        .update({ image: publicUrl })
        .eq('id', itemId);

      if (updateError) throw updateError;

      // 画像更新後にキャッシュを即時更新
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["user-items"] }),
        queryClient.invalidateQueries({ queryKey: ["item-details", itemId] }),
        // 特定のアイテムのキャッシュも更新
        queryClient.setQueryData(["item-details", itemId], (oldData: any) => ({
          ...oldData,
          image: publicUrl
        }))
      ]);

      toast({
        title: "画像を更新しました",
        description: "コレクションの画像が正常に更新されました。",
      });

      setIsEditing(false);
    } catch (error) {
      console.error('Error updating image:', error);
      toast({
        title: "エラーが発生しました",
        description: "画像の更新中にエラーが発生しました。もう一度お試しください。",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="aspect-square relative overflow-hidden rounded-t-lg group">
      <img
        key={image} // キーを追加して強制的に再レンダリング
        src={image}
        alt={title}
        className="w-full h-full transition-all duration-300 hover:scale-105 object-cover"
      />
      {isEditable && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => setIsEditing(true)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogTitle>画像を編集</DialogTitle>
          <ImageUpload
            onImageChange={handleImageChange}
            previewUrl={previewUrl}
            setPreviewUrl={setPreviewUrl}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}