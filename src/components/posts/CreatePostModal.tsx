
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreatePost } from "@/hooks/posts";
import { useImageUpload } from "@/hooks/admin-item-form/useImageUpload";
import { useImageEdit } from "@/hooks/posts/useImageEdit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageEditDialog } from "./ImageEditDialog";
import { Wand2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: Array<{
    id: string;
    title: string;
    image: string;
  }>;
}

export function CreatePostModal({
  isOpen,
  onClose,
  selectedItems,
}: CreatePostModalProps) {
  const [caption, setCaption] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditingGoodsImage, setIsEditingGoodsImage] = useState(false);
  const createPost = useCreatePost();
  const { imageFile, setImageFile, previewUrl, setPreviewUrl, uploadImage } = useImageUpload();
  const { editImage, isEditing } = useImageEdit();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleImageEdit = async (prompt: string, avatarUrl?: string) => {
    if (!previewUrl && selectedItems.length === 0) return;
    
    try {
      const editedImageBase64 = await editImage(
        previewUrl || selectedItems[0].image, 
        prompt, 
        avatarUrl
      );
      
      const base64Response = await fetch(editedImageBase64);
      const blob = await base64Response.blob();
      const file = new File([blob], "edited-image.png", { type: "image/png" });
      
      setImageFile(file);
      setPreviewUrl(editedImageBase64);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("画像編集エラー:", error);
    }
  };

  const handleSubmit = async () => {
    try {
      let imageUrl = "";
      if (imageFile) {
        imageUrl = await uploadImage();
      }
      
      // 最初のアイテムのIDを使用(後で複数対応に変更)
      await createPost.mutateAsync({
        userItemId: selectedItems[0].id,
        caption: caption.trim() || undefined,
        imageUrl,
      });
      
      setCaption("");
      setImageFile(null);
      setPreviewUrl(null);
      onClose();
    } catch (error) {
      console.error("投稿の作成に失敗しました:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新しい投稿を作成</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* グッズ情報 - 複数表示 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">投稿するグッズ ({selectedItems.length}個)</Label>
            <ScrollArea className="h-32 w-full rounded-md border p-3">
              <div className="flex flex-wrap gap-2">
                {selectedItems.map((item) => (
                  <div key={item.id} className="flex items-center bg-muted rounded-lg p-2 min-w-0">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-10 h-10 object-cover rounded flex-shrink-0"
                    />
                    <div className="ml-2 min-w-0 flex-1">
                      <p className="font-medium text-xs line-clamp-1">{item.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditDialogOpen(true)}
              className="w-full"
            >
              <Wand2 className="mr-2 h-4 w-4" />
              AIで投稿画像を生成
            </Button>
          </div>

          {/* 画像アップロード */}
          <div className="space-y-2">
            <Label htmlFor="post-image">投稿画像（任意）</Label>
            <Input
              id="post-image"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
            {previewUrl && (
              <div className="mt-2 space-y-2">
                <img
                  src={previewUrl}
                  alt="プレビュー"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditDialogOpen(true)}
                  className="w-full"
                >
                  <Wand2 className="mr-2 h-4 w-4" />
                  AI で画像を編集
                </Button>
              </div>
            )}
          </div>

          {/* キャプション */}
          <div className="space-y-2">
            <Label htmlFor="caption">キャプション</Label>
            <Textarea
              id="caption"
              placeholder="この投稿について何か書いてください..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={(!imageFile && !caption.trim()) || createPost.isPending}
            >
              {createPost.isPending ? "投稿中..." : "投稿する"}
            </Button>
          </div>
        </div>
      </DialogContent>
      
      <ImageEditDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        imageUrl={previewUrl || selectedItems[0]?.image || ""}
        onEditComplete={handleImageEdit}
        isEditing={isEditing}
      />
    </Dialog>
  );
}
