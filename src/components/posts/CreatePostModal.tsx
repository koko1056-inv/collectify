
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreatePost } from "@/hooks/posts";
import { useImageUpload } from "@/hooks/admin-item-form/useImageUpload";
import { useImageEdit } from "@/hooks/posts/useImageEdit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageEditDialog } from "./ImageEditDialog";
import { Wand2, Upload, X, ArrowLeft, Send, Sparkles, Image as ImageIcon, MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

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

  const handleRemoveImage = () => {
    setImageFile(null);
    setPreviewUrl(null);
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

  const displayImage = previewUrl || selectedItems[0]?.image;
  const canSubmit = (imageFile || caption.trim()) && !createPost.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="font-bold text-base">投稿を作成</h2>
              <p className="text-xs text-muted-foreground">写真とキャプションを追加</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
              2
            </div>
            <span>/ 2</span>
          </div>
        </div>

        <ScrollArea className="max-h-[70vh]">
          <div className="p-4 space-y-5">
            {/* 選択したグッズのプレビュー */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                選択したグッズ
                <span className="text-muted-foreground font-normal">({selectedItems.length}個)</span>
              </Label>
              
              <div className="flex gap-2 overflow-x-auto pb-2">
                {selectedItems.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex-shrink-0 w-20 group"
                  >
                    <div className="relative rounded-lg overflow-hidden border-2 border-primary/20 bg-muted aspect-square">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-[10px] text-center mt-1 line-clamp-1 text-muted-foreground">
                      {item.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 投稿画像セクション */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                投稿画像
                <span className="text-muted-foreground font-normal text-xs">(任意)</span>
              </Label>
              
              {displayImage ? (
                <div className="relative rounded-xl overflow-hidden border bg-muted">
                  <img
                    src={displayImage}
                    alt="投稿プレビュー"
                    className="w-full aspect-[4/3] object-cover"
                  />
                  
                  {/* 画像操作ボタン */}
                  <div className="absolute bottom-3 left-3 right-3 flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsEditDialogOpen(true)}
                      className="flex-1 bg-background/90 backdrop-blur-sm hover:bg-background shadow-lg"
                    >
                      <Wand2 className="mr-1.5 h-4 w-4" />
                      AIで編集
                    </Button>
                    {previewUrl && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleRemoveImage}
                        className="bg-background/90 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground shadow-lg"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {/* カスタム画像バッジ */}
                  {previewUrl && (
                    <div className="absolute top-3 left-3">
                      <div className="px-2 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-medium flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        カスタム画像
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block">
                    <div className={cn(
                      "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                      "hover:border-primary hover:bg-primary/5"
                    )}>
                      <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-sm font-medium mb-1">画像をアップロード</p>
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG, GIF (最大10MB)
                      </p>
                    </div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(true)}
                    className="w-full"
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    AIで投稿画像を生成
                  </Button>
                </div>
              )}
            </div>

            {/* キャプション */}
            <div className="space-y-3">
              <Label htmlFor="caption" className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                キャプション
              </Label>
              <div className="relative">
                <Textarea
                  id="caption"
                  placeholder="グッズへの想いやエピソードを書いてみましょう..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={4}
                  className="resize-none pr-12"
                  maxLength={500}
                />
                <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground">
                  {caption.length}/500
                </span>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* フッター */}
        <div className="p-4 border-t bg-muted/30">
          <Button 
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full h-12 text-base font-medium"
            size="lg"
          >
            {createPost.isPending ? (
              <>
                <div className="h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                投稿中...
              </>
            ) : (
              <>
                <Send className="mr-2 h-5 w-5" />
                投稿する
              </>
            )}
          </Button>
          <p className="text-center text-[10px] text-muted-foreground mt-2">
            投稿は他のユーザーに公開されます
          </p>
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
