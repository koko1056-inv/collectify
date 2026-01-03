import React, { useState } from "react";
import { UploadCloud, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ProfileImageUploadProps {
  onImageChange: (file: File | null) => Promise<void>;
  previewUrl: string | null;
  setPreviewUrl: React.Dispatch<React.SetStateAction<string | null>>;
  userId: string;
  avatarUrl?: string | null;
  className?: string;
}

export function ProfileImageUpload({
  onImageChange,
  previewUrl,
  setPreviewUrl,
  userId,
  avatarUrl,
  className
}: ProfileImageUploadProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

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
              src={previewUrl || avatarUrl || "/placeholder.svg"}
              alt="Profile"
              className="w-24 h-24 object-cover rounded-full"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.includes("placeholder.svg")) {
                  target.src = "/placeholder.svg";
                }
              }}
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
        <PopoverContent className="w-48 p-2 bg-background border shadow-lg z-50">
          <Button
            variant="ghost"
            className="w-full justify-start h-auto py-3 px-3"
            onClick={handleFileSelectClick}
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
        accept="image/*"
      />
    </>
  );
}
