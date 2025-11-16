
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

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  userItemId: string;
  userItemTitle: string;
  userItemImage: string;
}

export function CreatePostModal({
  isOpen,
  onClose,
  userItemId,
  userItemTitle,
  userItemImage,
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

  const handleImageEdit = async (prompt: string) => {
    const targetUrl = isEditingGoodsImage ? userItemImage : previewUrl;
    if (!targetUrl) return;
    
    try {
      const editedImageBase64 = await editImage(targetUrl, prompt);
      
      // Base64をBlobに変換
      const base64Response = await fetch(editedImageBase64);
      const blob = await base64Response.blob();
      const file = new File([blob], "edited-image.png", { type: "image/png" });
      
      setImageFile(file);
      setPreviewUrl(editedImageBase64);
      setIsEditDialogOpen(false);
      setIsEditingGoodsImage(false);
    } catch (error) {
      console.error("画像編集エラー:", error);
    }
  };

  const handleEditGoodsImage = () => {
    setIsEditingGoodsImage(true);
    setIsEditDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      let imageUrl = "";
      if (imageFile) {
        imageUrl = await uploadImage();
      }
      
      await createPost.mutateAsync({
        userItemId,
        caption: caption.trim() || undefined,
        imageUrl,
      });
      
      // リセット
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
          {/* グッズ情報 */}
          <div className="space-y-2">
            <div className="flex items-center bg-gray-50 rounded-lg p-3">
              <img
                src={userItemImage}
                alt={userItemTitle}
                className="w-12 h-12 object-cover rounded"
              />
              <div className="ml-3 flex-1">
                <p className="font-medium text-sm">{userItemTitle}</p>
                <p className="text-xs text-gray-500">このグッズの投稿</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleEditGoodsImage}
              className="w-full"
            >
              <Wand2 className="mr-2 h-4 w-4" />
              グッズをAIで加工
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
        onClose={() => {
          setIsEditDialogOpen(false);
          setIsEditingGoodsImage(false);
        }}
        imageUrl={isEditingGoodsImage ? userItemImage : (previewUrl || "")}
        onEditComplete={handleImageEdit}
        isEditing={isEditing}
      />
    </Dialog>
  );
}
