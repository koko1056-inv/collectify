import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Camera } from "lucide-react";

interface ImageUploadProps {
  onImageChange: (file: File | null) => void;
  previewUrl: string | null;
  setPreviewUrl: (url: string | null) => void;
}

export function ImageUpload({ onImageChange, previewUrl, setPreviewUrl }: ImageUploadProps) {
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
        onImageChange(file);
      }
    },
    [onImageChange, setPreviewUrl]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif"],
    },
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      className="flex items-center gap-4 p-4 border border-dashed border-gray-300 rounded-md cursor-pointer hover:border-gray-400 transition-colors"
    >
      <input {...getInputProps()} />
      <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Camera className="w-6 h-6 text-gray-400" />
          </div>
        )}
      </div>
      <div className="flex-grow">
        <p className="text-sm font-medium text-gray-700">
          {isDragActive ? (
            "ここにドロップしてください"
          ) : (
            "クリックまたはドラッグ＆ドロップで画像をアップロード"
          )}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          PNG, JPG, GIF (最大 10MB)
        </p>
      </div>
    </div>
  );
}