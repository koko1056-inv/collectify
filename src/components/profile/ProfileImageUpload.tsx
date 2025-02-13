import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
interface ProfileImageUploadProps {
  onImageChange: (file: File | null) => void;
  previewUrl: string | null;
  setPreviewUrl: (url: string | null) => void;
  userId: string;
}
export function ProfileImageUpload({
  onImageChange,
  previewUrl,
  setPreviewUrl,
  userId
}: ProfileImageUploadProps) {
  const {
    toast
  } = useToast();
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      onImageChange(file);
    }
  }, [onImageChange, setPreviewUrl]);
  const {
    getRootProps,
    getInputProps,
    isDragActive
  } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif"]
    },
    maxFiles: 1
  });
  return <div className="relative group mx-[20px]">
      <div {...getRootProps()} className="w-16 h-16 rounded-full overflow-hidden cursor-pointer relative">
        <input {...getInputProps()} />
        {previewUrl ? <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <Camera className="w-6 h-6 text-gray-400" />
          </div>}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
          <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-all" />
        </div>
      </div>
    </div>;
}