import React, { useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Camera, ImageIcon, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface ImageSearchUploadProps {
  onImageSelect: (file: File) => void;
}

export function ImageSearchUpload({ onImageSelect }: ImageSearchUploadProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "ファイルサイズが大きすぎます",
          description: "10MB以下の画像をアップロードしてください",
          variant: "destructive",
        });
        return;
      }
      onImageSelect(file);
    }
  }, [onImageSelect]);

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
        toast({
          title: "ファイルサイズが大きすぎます",
          description: "10MB以下の画像をアップロードしてください",
          variant: "destructive",
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
              <p className="text-lg font-medium text-primary">ドロップしてアップロード</p>
            </>
          ) : (
            <>
              <ImageIcon className="h-10 w-10 text-muted-foreground" />
              <p className="text-base font-medium text-foreground">画像をドラッグするか、クリックして選択</p>
              <p className="text-sm text-muted-foreground">
                JPG, PNG, GIF, WebP (最大10MB)
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
        カメラで撮影して検索
      </Button>
    </div>
  );
}