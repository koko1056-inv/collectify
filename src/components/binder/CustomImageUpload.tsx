import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useBinder } from "@/hooks/useBinder";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface CustomImageUploadProps {
  pageId: string;
}

export function CustomImageUpload({ pageId }: CustomImageUploadProps) {
  const { addItem } = useBinder();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      // プレビュー表示
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Supabaseにアップロード
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/binder/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("profile_images")
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("profile_images")
        .getPublicUrl(fileName);

      // バインダーページの中央に画像を追加
      await addItem.mutateAsync({
        binder_page_id: pageId,
        custom_image_url: publicUrl,
        user_item_id: null,
        official_item_id: null,
        position_x: 300,
        position_y: 400,
        width: 150,
        height: 150,
        rotation: 0,
        z_index: 1,
      });

      toast({
        title: "カスタム画像を追加しました",
      });

      // リセット
      setPreviewUrl(null);
      e.target.value = "";
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "エラー",
        description: "画像のアップロードに失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-4 space-y-4 border-t">
      <div className="space-y-3">
        <Label className="text-base font-semibold flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          カスタム画像
        </Label>
        <p className="text-sm text-muted-foreground">
          自分の画像をアップロードしてバインダーに追加
        </p>
        
        <Button
          variant="outline"
          className="w-full"
          disabled={isUploading}
          onClick={() => document.getElementById("custom-image-upload")?.click()}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              アップロード中...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              画像を選択
            </>
          )}
        </Button>
        <input
          id="custom-image-upload"
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        {previewUrl && (
          <div className="mt-4 p-3 border rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground mb-2">プレビュー：</p>
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-32 object-contain rounded"
            />
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1 pt-2">
          <p>• JPG, PNG, GIF, WEBP形式に対応</p>
          <p>• 最大20MBまで</p>
          <p>• アップロード後は自由にサイズ変更・回転できます</p>
        </div>
      </div>
    </div>
  );
}
