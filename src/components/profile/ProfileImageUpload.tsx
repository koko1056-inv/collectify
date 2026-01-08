import React, { useState, useCallback } from "react";
import { UploadCloud, Image as ImageIcon, Loader2, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProfileImageUploadProps {
  onImageChange: (file: File | null) => Promise<void>;
  previewUrl: string | null;
  setPreviewUrl: React.Dispatch<React.SetStateAction<string | null>>;
  userId: string;
  avatarUrl?: string | null;
  className?: string;
  isUploading?: boolean;
  onAvatarSelect?: (avatarUrl: string) => Promise<void>;
}

export function ProfileImageUpload({
  onImageChange,
  previewUrl,
  setPreviewUrl,
  userId,
  avatarUrl,
  className,
  isUploading = false,
  onAvatarSelect,
}: ProfileImageUploadProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  const displayUrl = previewUrl || avatarUrl || "/placeholder.svg";
  const showLoading = isUploading || localLoading;

  // アバターギャラリーを取得
  const { data: avatarGallery = [] } = useQuery({
    queryKey: ["avatar-gallery", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avatar_gallery")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setIsPopoverOpen(false);
    setLocalLoading(true);

    try {
      await onImageChange(file);
    } finally {
      setLocalLoading(false);
      URL.revokeObjectURL(objectUrl);
    }

    e.target.value = "";
  }, [onImageChange, setPreviewUrl]);

  const handleFileSelectClick = useCallback(() => {
    document.getElementById("profile-image-upload")?.click();
    setIsPopoverOpen(false);
  }, []);

  const handleGalleryClick = useCallback(() => {
    setIsPopoverOpen(false);
    setIsGalleryOpen(true);
  }, []);

  const handleAvatarSelect = useCallback(async (selectedUrl: string) => {
    // 即座にプレビューを更新してダイアログを閉じる
    setPreviewUrl(selectedUrl);
    setIsGalleryOpen(false);
    
    // バックグラウンドでDB更新（ローディング表示なし）
    if (onAvatarSelect) {
      // ローディングを表示せずにバックグラウンドで実行
      onAvatarSelect(selectedUrl).catch(console.error);
    }
  }, [onAvatarSelect, setPreviewUrl]);

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
          {avatarGallery.length > 0 && (
            <Button
              variant="ghost"
              className="w-full justify-start h-auto py-3 px-3"
              onClick={handleGalleryClick}
              disabled={showLoading}
            >
              <Images className="w-4 h-4 mr-3" />
              <span className="text-sm">アバターから選択</span>
            </Button>
          )}
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

      {/* アバターギャラリー選択ダイアログ */}
      <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>アバターを選択</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-80">
            <div className="grid grid-cols-3 gap-3 p-1">
              {avatarGallery.map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => handleAvatarSelect(avatar.image_url)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:border-primary ${
                    avatar.is_current ? "border-primary ring-2 ring-primary/30" : "border-transparent"
                  }`}
                >
                  <img
                    src={avatar.image_url}
                    alt={avatar.name || "アバター"}
                    className="w-full h-full object-cover"
                    onError={handleImageError}
                  />
                  {avatar.is_current && (
                    <div className="absolute bottom-1 right-1 bg-primary text-primary-foreground text-xs px-1 rounded">
                      現在
                    </div>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
