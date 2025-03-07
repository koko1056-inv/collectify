
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImageIcon, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ImageSearchUploadProps {
  onImageSelect: (file: File) => void;
}

export function ImageSearchUpload({ onImageSelect }: ImageSearchUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      // 10MB以下に制限
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
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: 1
  });

  return (
    <div 
      {...getRootProps()} 
      className={`
        border-2 border-dashed rounded-lg p-8 text-center 
        transition-colors cursor-pointer
        ${isDragActive 
          ? 'border-primary bg-primary/5' 
          : 'border-gray-300 hover:border-primary/50 hover:bg-gray-50'
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
            <ImageIcon className="h-10 w-10 text-gray-400" />
            <p className="text-lg font-medium">画像をドラッグするか、クリックして選択</p>
            <p className="text-sm text-gray-500">
              JPG, PNG, GIF (最大10MB)
            </p>
          </>
        )}
      </div>
    </div>
  );
}
