
import React, { useState } from "react";
import { UploadCloud } from "lucide-react";

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      await onImageChange(file);
    }
  };

  return (
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
  );
}
