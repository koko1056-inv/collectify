import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useUploadBackgroundPreset } from "./useGoodsDisplayActions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
  initialCategory: string;
}

export function UploadPresetDialog({
  open,
  onOpenChange,
  userId,
  initialCategory,
}: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const uploadMutation = useUploadBackgroundPreset();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("画像ファイルを選択してください");
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleSubmit = async () => {
    if (!userId || !file || !name) return;
    await uploadMutation.mutateAsync({ userId, file, name, category });
    setName("");
    setFile(null);
    setPreview(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>背景プリセットを追加</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="preset-name">プリセット名</Label>
            <Input
              id="preset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: マイ棚"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="preset-category">カテゴリ</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="preset-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shelf">棚</SelectItem>
                <SelectItem value="room">部屋</SelectItem>
                <SelectItem value="showcase">ショーケース</SelectItem>
                <SelectItem value="display">展示台</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>背景画像</Label>
            {preview ? (
              <div className="relative border rounded-lg overflow-hidden">
                <img src={preview} alt="Preview" className="w-full h-48 object-cover" />
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-8">
                <label className="flex flex-col items-center gap-2 cursor-pointer">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    クリックして画像をアップロード
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!name || !file || uploadMutation.isPending}
            className="w-full"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                アップロード中...
              </>
            ) : (
              "背景プリセットを追加"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
