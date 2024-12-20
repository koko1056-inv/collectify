import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Share2, BookMarked } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { ItemMemoriesModal } from "./ItemMemoriesModal";

interface CollectionGoodsCardProps {
  title: string;
  image: string;
  id: string;
}

export function CollectionGoodsCard({ title, image, id }: CollectionGoodsCardProps) {
  const { toast } = useToast();
  const [isMemoriesModalOpen, setIsMemoriesModalOpen] = useState(false);

  const handleShare = () => {
    toast({
      title: "共有",
      description: "共有機能は準備中です。",
    });
  };

  return (
    <>
      <Card className="hover-scale card-shadow bg-white border border-gray-200">
        <CardHeader className="p-0">
          <div className="aspect-square relative overflow-hidden rounded-t-lg">
            <img
              src={image}
              alt={title}
              className="object-cover w-full h-full hover:scale-105 transition-transform duration-300"
            />
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <CardTitle className="text-lg mb-2 line-clamp-2 text-gray-900">{title}</CardTitle>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex justify-between gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setIsMemoriesModalOpen(true)}
            className="border-gray-200 hover:bg-gray-50"
          >
            <BookMarked className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleShare} className="border-gray-200 hover:bg-gray-50">
            <Share2 className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
      <ItemMemoriesModal
        isOpen={isMemoriesModalOpen}
        onClose={() => setIsMemoriesModalOpen(false)}
        itemId={id}
        itemTitle={title}
      />
    </>
  );
}