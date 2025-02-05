
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { ImageIcon } from "lucide-react";

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
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-4 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary"}
        `}
      >
        <input {...getInputProps()} />
        {previewUrl ? (
          <div className="relative aspect-video w-full">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-contain rounded-md"
            />
          </div>
        ) : (
          <div className="py-8 space-y-2">
            <ImageIcon className="w-8 h-8 mx-auto text-gray-400" />
            <div className="text-sm text-gray-600">
              <p className="font-medium">クリックまたはドラッグ＆ドロップで画像をアップロード</p>
              <p className="text-xs text-gray-500">PNG, JPG, GIF (最大 10MB)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
