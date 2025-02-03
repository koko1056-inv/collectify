import { useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  onImageChange: (file: File | null) => void;
  previewUrl: string | null;
  setPreviewUrl: (url: string | null) => void;
}

export function ImageUpload({ onImageChange, previewUrl, setPreviewUrl }: ImageUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const loadProfileImage = async () => {
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();
      
      if (profile?.avatar_url) {
        setPreviewUrl(profile.avatar_url);
      }
    };

    loadProfileImage();
  }, [user, setPreviewUrl]);

  const uploadImage = async (file: File) => {
    if (!user) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('kuji_images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('kuji_images')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: "画像のアップロードに失敗しました",
      });
      return null;
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
        onImageChange(file);

        const publicUrl = await uploadImage(file);
        if (publicUrl) {
          URL.revokeObjectURL(objectUrl);
          setPreviewUrl(publicUrl);
        }
      }
    },
    [onImageChange, setPreviewUrl]
  );

  const handleDelete = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (error) throw error;

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      onImageChange(null);

      toast({
        title: "削除完了",
        description: "プロフィール画像を削除しました",
      });
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: "画像の削除に失敗しました",
      });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif"],
    },
    maxFiles: 1,
  });

  return (
    <div className="relative group">
      <div
        {...getRootProps()}
        className="w-16 h-16 rounded-full overflow-hidden cursor-pointer relative"
      >
        <input {...getInputProps()} />
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <Camera className="w-6 h-6 text-gray-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
          <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-all" />
        </div>
      </div>
      {previewUrl && (
        <button
          onClick={handleDelete}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all"
          type="button"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );
}