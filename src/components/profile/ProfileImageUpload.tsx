
import React, { useState } from "react";
import { UploadCloud, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      await onImageChange(file);
    }
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
      <div className="space-y-2">
        <div
          className={`relative rounded-full overflow-hidden ${className || ''}`}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <img
            src={previewUrl || "/placeholder.svg"}
            alt="Profile"
            className="w-24 h-24 object-cover rounded-full"
          />
          <label
            htmlFor="profile-image-upload"
            className={`absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 transition-opacity ${
              isHovering ? "opacity-100" : "opacity-0"
            } cursor-pointer`}
          >
            <UploadCloud className="text-white w-8 h-8" />
          </label>
          <input
            id="profile-image-upload"
            type="file"
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
          />
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsGenerateModalOpen(true)}
          className="w-full"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          AIで生成
        </Button>
      </div>

      <AvatarGenerationModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        onAvatarGenerated={handleAvatarGenerated}
      />
    </>
  );
}
