import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useBinder } from "@/hooks/useBinder";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2 } from "lucide-react";

interface BackgroundToolProps {
  pageId: string;
}

export function BackgroundTool({ pageId }: BackgroundToolProps) {
  const { updatePage, binderPages } = useBinder();
  const { toast } = useToast();
  const [color, setColor] = useState("#ffffff");
  const [isUploading, setIsUploading] = useState(false);
  const page = binderPages.find((p) => p.id === pageId);

  const handleColorChange = async (newColor: string) => {
    setColor(newColor);
    if (page) {
      await updatePage.mutateAsync({
        id: pageId,
        updates: { background_color: newColor },
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !page) return;

    setIsUploading(true);
    try {
      // Supabaseにアップロード
      const fileExt = file.name.split(".").pop();
      const fileName = `${page.user_id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("profile_images")
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("profile_images")
        .getPublicUrl(fileName);

      // ページの背景を更新
      await updatePage.mutateAsync({
        id: pageId,
        updates: { background_image: publicUrl },
      });

      toast({
        title: "背景画像を更新しました",
      });
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

  const handleRemoveBackground = async () => {
    if (page) {
      await updatePage.mutateAsync({
        id: pageId,
        updates: { background_image: null },
      });
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold">背景設定</h3>

      <div className="space-y-2">
        <Label>背景色</Label>
        <div className="flex gap-2">
          <Input
            type="color"
            value={color}
            onChange={(e) => handleColorChange(e.target.value)}
            className="w-20 h-10"
          />
          <Input
            type="text"
            value={color}
            onChange={(e) => handleColorChange(e.target.value)}
            className="flex-1"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>背景画像</Label>
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full"
            disabled={isUploading}
            onClick={() => document.getElementById("bg-upload")?.click()}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                アップロード中...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                画像をアップロード
              </>
            )}
          </Button>
          <input
            id="bg-upload"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          {page?.background_image && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemoveBackground}
            >
              背景画像を削除
            </Button>
          )}
        </div>
      </div>

      {page?.background_image && (
        <div className="aspect-[3/4] w-full rounded-lg overflow-hidden border">
          <img
            src={page.background_image}
            alt="背景プレビュー"
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  );
}
