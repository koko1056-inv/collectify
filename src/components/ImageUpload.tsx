import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  onImageChange: (file: File | null) => void;
  previewUrl: string | null;
}

export function ImageUpload({ onImageChange, previewUrl }: ImageUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onImageChange(acceptedFiles[0]);
      }
    },
    [onImageChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif"],
    },
    maxFiles: 1,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-primary bg-accent" : "border-border"
        }`}
      >
        <input {...getInputProps()} />
        {previewUrl ? (
          <div className="aspect-square relative overflow-hidden rounded-lg">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-contain bg-gray-100"
            />
          </div>
        ) : (
          <div className="py-8">
            <p className="text-sm text-gray-600">
              {isDragActive
                ? "ドロップしてアップロード"
                : "クリックまたはドラッグ&ドロップでアップロード"}
            </p>
          </div>
        )}
      </div>
      {previewUrl && (
        <Button
          type="button"
          variant="outline"
          onClick={() => onImageChange(null)}
          className="w-full"
        >
          画像を削除
        </Button>
      )}
    </div>
  );
}