import React, { useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Camera, ImageIcon, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface ImageSearchUploadProps {
  onImageSelect: (file: File) => void;
}

export function ImageSearchUpload({ onImageSelect }: ImageSearchUploadProps) {
  const { t } = useLanguage();
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // t は毎レンダーで新しい関数になるため memo 化しない（言語切替で文言が古くなるのを防ぐ）
  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(t("misc.imageSearch.fileTooLarge"), {
          description: t("misc.imageSearch.fileTooLargeDesc"),
        });
        return;
      }
      onImageSelect(file);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] },
    maxFiles: 1,
    noClick: false,
  });

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(t("misc.imageSearch.fileTooLarge"), {
          description: t("misc.imageSearch.fileTooLargeDesc"),
        });
        return;
      }
      onImageSelect(file);
    }
  };

  return (
    <div className="space-y-3">
      <div 
        {...getRootProps()} 
        className={`
          border-2 border-dashed rounded-xl p-6 text-center 
          transition-all cursor-pointer
          ${isDragActive 
            ? 'border-primary bg-primary/5 scale-[1.01]' 
            : 'border-border hover:border-primary/50 hover:bg-muted/50'
          }
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-2">
          {isDragActive ? (
            <>
              <Upload className="h-10 w-10 text-primary animate-bounce" />
              <p className="text-lg font-medium text-primary">{t("misc.imageSearch.dropToUpload")}</p>
            </>
          ) : (
            <>
              <ImageIcon className="h-10 w-10 text-muted-foreground" />
              <p className="text-base font-medium text-foreground">{t("misc.imageSearch.dragOrClick")}</p>
              <p className="text-sm text-muted-foreground">
                {t("misc.imageSearch.formats")}
              </p>
            </>
          )}
        </div>
      </div>

      {/* カメラ撮影ボタン */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCameraChange}
      />
      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={handleCameraCapture}
      >
        <Camera className="h-5 w-5" />
        {t("misc.imageSearch.cameraSearch")}
      </Button>
    </div>
  );
}