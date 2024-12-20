import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Share2, Tag, Heart } from "lucide-react";
import { useState } from "react";
import { TagManageModal } from "./TagManageModal";
import { ShareModal } from "./ShareModal";
import { WishlistModal } from "./WishlistModal";

interface OfficialGoodsCardProps {
  id: string;
  title: string;
  image: string;
}

export function OfficialGoodsCard({ id, title, image }: OfficialGoodsCardProps) {
  const [isTagManageModalOpen, setIsTagManageModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);

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
          <CardTitle className="text-lg mb-2 line-clamp-2 text-gray-900">
            {title}
          </CardTitle>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex justify-between gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsTagManageModalOpen(true)}
            className="border-gray-200 hover:bg-gray-50"
          >
            <Tag className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsShareModalOpen(true)}
            className="border-gray-200 hover:bg-gray-50"
          >
            <Share2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsWishlistModalOpen(true)}
            className="border-gray-200 hover:bg-gray-50"
          >
            <Heart className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>

      <TagManageModal
        isOpen={isTagManageModalOpen}
        onClose={() => setIsTagManageModalOpen(false)}
        itemId={id}
        itemTitle={title}
        isOfficialItem={true}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={title}
        url={window.location.href}
        image={image}
      />

      <WishlistModal
        isOpen={isWishlistModalOpen}
        onClose={() => setIsWishlistModalOpen(false)}
        itemId={id}
        itemTitle={title}
      />
    </>
  );
}