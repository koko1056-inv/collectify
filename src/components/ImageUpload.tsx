import { useState } from "react";
import { Input } from "@/components/ui/input";

interface ImageUploadProps {
  onImageChange: (file: File | null) => void;
  previewUrl: string | null;
}

export function ImageUpload({ onImageChange, previewUrl }: ImageUploadProps) {
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageChange(file);
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor="image" className="text-sm font-medium">
        画像
      </label>
      <Input
        id="image"
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        required
      />
      {previewUrl && (
        <div className="mt-2">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full max-w-xs rounded-lg"
          />
        </div>
      )}
    </div>
  );
}