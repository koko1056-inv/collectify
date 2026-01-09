import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCreateChallengeEntry } from "@/hooks/challenges";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ImagePlus, Loader2 } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { useToast } from "@/hooks/use-toast";

interface ChallengeEntryModalProps {
  challengeId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ChallengeEntryModal({ challengeId, isOpen, onClose }: ChallengeEntryModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [caption, setCaption] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const createEntry = useCreateChallengeEntry();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleSubmit = async () => {
    if (!imageFile || !user) return;

    setUploading(true);
    try {
      // Upload image
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${user.id}/${challengeId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('profile_images')
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile_images')
        .getPublicUrl(fileName);

      // Create entry
      await createEntry.mutateAsync({
        challenge_id: challengeId,
        image_url: publicUrl,
        caption: caption.trim() || undefined,
      });

      // Reset and close
      setCaption("");
      setImageFile(null);
      setImagePreview(null);
      onClose();
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message || "画像のアップロードに失敗しました",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setCaption("");
      setImageFile(null);
      setImagePreview(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>チャレンジに参加</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>画像</Label>
            <div
              {...getRootProps()}
              className={`mt-1 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
            >
              <input {...getInputProps()} />
              {imagePreview ? (
                <div className="relative aspect-square max-w-[200px] mx-auto">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
              ) : (
                <div className="py-8">
                  <ImagePlus className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {isDragActive ? "ドロップして画像を追加" : "クリックまたはドラッグして画像を追加"}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="caption">コメント（任意）</Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="あなたの作品について一言..."
              className="mt-1"
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} disabled={uploading} className="flex-1">
              キャンセル
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!imageFile || uploading || createEntry.isPending}
              className="flex-1"
            >
              {uploading || createEntry.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  送信中...
                </>
              ) : (
                "参加する"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
