
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { ImagePlus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ItemImageUploadProps {
  onImageChange: (file: File | null) => void;
  previewUrl: string | null;
  setPreviewUrl: (url: string | null) => void;
}

export function ItemImageUpload({ 
  onImageChange, 
  previewUrl, 
  setPreviewUrl 
}: ItemImageUploadProps) {
  const { t } = useLanguage();
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
      className="border-2 border-dashed rounded-lg p-4 hover:border-muted-foreground transition-colors cursor-pointer"
    >
      <input {...getInputProps()} />
      {previewUrl ? (
        <div className="relative aspect-square">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-full object-cover rounded-lg"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all flex items-center justify-center rounded-lg">
            <ImagePlus className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-all" />
          </div>
        </div>
      ) : (
        <div className="aspect-square flex flex-col items-center justify-center gap-2 bg-muted rounded-lg">
          <ImagePlus className="w-8 h-8 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">
            {t("misc.imageUpload.prompt")}
          </div>
          <div className="text-xs text-muted-foreground">
            {t("misc.imageUpload.formats")}
          </div>
        </div>
      )}
    </div>
  );
}
