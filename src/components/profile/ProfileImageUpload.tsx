import React, { useState, useCallback } from "react";
import { UploadCloud, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ProfileImageUploadProps {
  onImageChange: (file: File | null) => Promise<void>;
  previewUrl: string | null;
  setPreviewUrl: React.Dispatch<React.SetStateAction<string | null>>;
  userId: string;
  avatarUrl?: string | null;
  className?: string;
  isUploading?: boolean;
}

export function ProfileImageUpload({
  onImageChange,
  previewUrl,
  setPreviewUrl,
  userId,
  avatarUrl,
  className,
  isUploading = false,
}: ProfileImageUploadProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);

  const displayUrl = previewUrl || avatarUrl || "/placeholder.svg";
  const showLoading = isUploading || localLoading;

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 即座にローカルプレビューを表示
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setIsPopoverOpen(false);
    setLocalLoading(true);

    try {
      await onImageChange(file);
    } finally {
      setLocalLoading(false);
      // オブジェクトURLをクリーンアップ（アップロード後はサーバーURLに置き換わる）
      URL.revokeObjectURL(objectUrl);
    }

    // input要素をリセット（同じファイルを再選択可能にする）
    e.target.value = "";
  }, [onImageChange, setPreviewUrl]);

  const handleFileSelectClick = useCallback(() => {
    document.getElementById("profile-image-upload")?.click();
    setIsPopoverOpen(false);
  }, []);

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    if (!target.src.includes("placeholder.svg")) {
      target.src = "/placeholder.svg";
    }
  }, []);

  return (
    <>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <div
            className={`relative rounded-full overflow-hidden cursor-pointer ${className || ""}`}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <img
              src={displayUrl}
              alt="Profile"
              className="w-24 h-24 object-cover rounded-full"
              onError={handleImageError}
            />
            <div
              className={`absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 transition-opacity ${
                isHovering || showLoading ? "opacity-100" : "opacity-0"
              }`}
            >
              {showLoading ? (
                <Loader2 className="text-white w-8 h-8 animate-spin" />
              ) : (
                <ImageIcon className="text-white w-8 h-8" />
              )}
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2 bg-background border shadow-lg z-50">
          <Button
            variant="ghost"
            className="w-full justify-start h-auto py-3 px-3"
            onClick={handleFileSelectClick}
            disabled={showLoading}
          >
            <UploadCloud className="w-4 h-4 mr-3" />
            <span className="text-sm">ファイルを選択</span>
          </Button>
        </PopoverContent>
      </Popover>

      <input
        id="profile-image-upload"
        type="file"
        onChange={handleFileChange}
        className="hidden"
        accept="image/jpeg,image/png,image/webp,image/gif"
        disabled={showLoading}
      />
    </>
  );
}
