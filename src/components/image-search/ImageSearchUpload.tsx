
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Image, FileWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageSearchUploadProps {
  onImageSelect: (file: File) => void;
}

export function ImageSearchUpload({ onImageSelect }: ImageSearchUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    
    if (acceptedFiles.length === 0) {
      return;
    }
    
    const file = acceptedFiles[0];
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('画像ファイルのみ対応しています');
      return;
    }
    
    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('ファイルサイズは5MB以下にしてください');
      return;
    }
    
    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    
    // Notify parent
    onImageSelect(file);
    
    // Clean up the preview URL when component unmounts
    return () => URL.revokeObjectURL(objectUrl);
  }, [onImageSelect]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    },
    maxFiles: 1
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'}
          ${error ? 'border-red-300 bg-red-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {preview ? (
          <div className="space-y-4">
            <div className="aspect-video max-h-64 mx-auto overflow-hidden">
              <img
                src={preview}
                alt="プレビュー"
                className="object-contain w-full h-full"
              />
            </div>
            <p className="text-sm text-gray-500">
              別の画像を選択するには、ここをクリックするか画像をドラッグしてください
            </p>
          </div>
        ) : error ? (
          <div className="py-8 flex flex-col items-center text-red-500">
            <FileWarning className="h-12 w-12 mb-2" />
            <p>{error}</p>
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center text-gray-500">
            {isDragActive ? (
              <>
                <Image className="h-12 w-12 mb-2 text-primary" />
                <p>ここにドロップしてください</p>
              </>
            ) : (
              <>
                <UploadCloud className="h-12 w-12 mb-2" />
                <p>クリックまたはドラッグして画像をアップロード</p>
                <p className="text-xs mt-2">JPG, PNG, GIF (最大5MB)</p>
              </>
            )}
          </div>
        )}
      </div>
      
      {preview && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setPreview(null);
              setError(null);
            }}
            className="mr-2"
          >
            画像をクリア
          </Button>
          <Button
            type="button"
            onClick={() => {
              // Trigger re-analysis
              const input = document.querySelector('input[type="file"]') as HTMLInputElement;
              const file = input.files?.[0];
              if (file) {
                onImageSelect(file);
              }
            }}
          >
            この画像で検索
          </Button>
        </div>
      )}
    </div>
  );
}
