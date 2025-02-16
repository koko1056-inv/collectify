
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ItemImageUpload } from "@/components/item/ItemImageUpload";
import { Pencil, ZoomIn } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ItemImageEditorProps {
  image: string;
  title: string;
  isEditing: boolean;
  onImageUpdate: (newImageUrl: string) => void;
}

export function ItemImageEditor({ image, title, isEditing, onImageUpdate }: ItemImageEditorProps) {
  const [isImageEditModalOpen, setIsImageEditModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleImageChange = async (file: File | null) => {
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('kuji_images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('kuji_images')
        .getPublicUrl(filePath);

      onImageUpdate(publicUrl);
      setIsImageEditModalOpen(false);
      
      toast({
        title: "画像を更新しました",
        description: "アイテムの画像が正常に更新されました。",
      });
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
    <div className="aspect-square relative overflow-hidden rounded-lg group">
      <img
        src={image}
        alt={title}
        className="w-full h-full object-contain bg-gray-100 cursor-pointer"
        onClick={() => setIsPreviewModalOpen(true)}
      />
      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setIsPreviewModalOpen(true)}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        {isEditing && (
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setIsImageEditModalOpen(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Dialog open={isImageEditModalOpen} onOpenChange={setIsImageEditModalOpen}>
        <DialogContent>
          <h3 className="text-lg font-semibold mb-4">画像を編集</h3>
          <ItemImageUpload
            onImageChange={handleImageChange}
            previewUrl={previewUrl}
            setPreviewUrl={setPreviewUrl}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="max-w-4xl">
          <div className="relative w-full max-h-[80vh] overflow-hidden rounded-lg">
            <img
              src={image}
              alt={title}
              className="w-full h-full object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
