
import React, { useState } from "react";
import { UploadCloud, Sparkles, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AvatarGenerationModal } from "./AvatarGenerationModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProfileImageUploadProps {
  onImageChange: (file: File | null) => Promise<void>;
  previewUrl: string | null;
  setPreviewUrl: React.Dispatch<React.SetStateAction<string | null>>;
  userId: string;
  className?: string;
}

export function ProfileImageUpload({
  onImageChange,
  previewUrl,
  setPreviewUrl,
  userId,
  className
}: ProfileImageUploadProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      await onImageChange(file);
      setIsPopoverOpen(false);
    }
  };

  const handleFileSelectClick = () => {
    document.getElementById('profile-image-upload')?.click();
    setIsPopoverOpen(false);
  };

  const handleAIGenerateClick = () => {
    setIsGenerateModalOpen(true);
    setIsPopoverOpen(false);
  };

  const handleAvatarGenerated = async (imageUrl: string) => {
    try {
      // base64画像をBlobに変換
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // BlobをFileに変換
      const file = new File([blob], "ai-avatar.png", { type: "image/png" });
      
      // プレビューを更新
      setPreviewUrl(imageUrl);
      
      // 画像をアップロード
      await onImageChange(file);
      
      toast({
        title: "アバター設定完了",
        description: "AIで生成したアバターをプロフィールに設定しました",
      });
    } catch (error) {
      console.error("Error setting avatar:", error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: "アバターの設定に失敗しました",
      });
    }
  };

  return (
    <>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <div
            className={`relative rounded-full overflow-hidden cursor-pointer ${className || ''}`}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <img
              src={previewUrl || "/placeholder.svg"}
              alt="Profile"
              className="w-24 h-24 object-cover rounded-full"
            />
            <div
              className={`absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 transition-opacity ${
                isHovering ? "opacity-100" : "opacity-0"
              }`}
            >
              <ImageIcon className="text-white w-8 h-8" />
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2 bg-background border shadow-lg z-50">
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              className="justify-start h-auto py-3 px-3"
              onClick={handleFileSelectClick}
            >
              <UploadCloud className="w-4 h-4 mr-3" />
              <span className="text-sm">ファイルを選択</span>
            </Button>
            <Button
              variant="ghost"
              className="justify-start h-auto py-3 px-3"
              onClick={handleAIGenerateClick}
            >
              <Sparkles className="w-4 h-4 mr-3" />
              <span className="text-sm">AIでアバター生成</span>
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <input
        id="profile-image-upload"
        type="file"
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />

      <AvatarGenerationModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        onAvatarGenerated={handleAvatarGenerated}
      />
    </>
  );
}
