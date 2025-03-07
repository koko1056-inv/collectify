
import { useState } from "react";
import { ImageSearchUpload } from "./ImageSearchUpload";
import { Button } from "@/components/ui/button";
import { SearchIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function ImageSearch() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="画像で検索">
          <SearchIcon className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogTitle>画像で検索</DialogTitle>
        <div className="space-y-4">
          <ImageSearchUpload onImageSelect={handleImageSelect} />
          <Button 
            className="w-full" 
            disabled={!selectedImage}
            onClick={() => {
              console.log("Image search requested with:", selectedImage);
              // この後、画像検索機能を実装します
            }}
          >
            検索
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
