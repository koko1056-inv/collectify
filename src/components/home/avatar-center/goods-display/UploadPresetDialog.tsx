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
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const uploadMutation = useUploadBackgroundPreset();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error(t("homeScreen.uploadPreset.selectImageFile"));
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
          <DialogTitle>{t("homeScreen.uploadPreset.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="preset-name">{t("homeScreen.uploadPreset.nameLabel")}</Label>
            <Input
              id="preset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("homeScreen.uploadPreset.namePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="preset-category">{t("homeScreen.uploadPreset.categoryLabel")}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="preset-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shelf">{t("homeScreen.presets.shelf")}</SelectItem>
                <SelectItem value="room">{t("homeScreen.presets.room")}</SelectItem>
                <SelectItem value="showcase">{t("homeScreen.presets.showcase")}</SelectItem>
                <SelectItem value="display">{t("homeScreen.presets.display")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("homeScreen.uploadPreset.imageLabel")}</Label>
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
                    {t("homeScreen.uploadPreset.uploadHint")}
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
                {t("homeScreen.uploadPreset.uploading")}
              </>
            ) : (
              t("homeScreen.uploadPreset.title")
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
