
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ImageIcon, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageSearchUploadProps {
  onImageSelect: (file: File) => void;
}

export function ImageSearchUpload({ onImageSelect }: ImageSearchUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
        onImageSelect(file);
      }
    },
    [onImageSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    },
    maxFiles: 1,
  });

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewUrl(null);
  };

  return (
    <div
      {...getRootProps()}
      className="border-2 border-dashed rounded-lg p-4 hover:border-gray-400 transition-colors cursor-pointer"
    >
      <input {...getInputProps()} />
      {previewUrl ? (
        <div className="relative">
          <img
            src={previewUrl}
            alt="アップロードされた画像"
            className="w-full h-auto max-h-64 object-contain rounded-lg"
          />
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-2 right-2"
            onClick={clearImage}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          {isDragActive ? (
            <>
              <Upload className="h-10 w-10 text-gray-400" />
              <p className="text-sm text-gray-600">ここにドロップ</p>
            </>
          ) : (
            <>
              <ImageIcon className="h-10 w-10 text-gray-400" />
              <p className="text-sm text-gray-600">
                クリックまたはドラッグ&ドロップで画像をアップロード
              </p>
              <p className="text-xs text-gray-400">
                アップロードした画像から類似のグッズを検索します
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
