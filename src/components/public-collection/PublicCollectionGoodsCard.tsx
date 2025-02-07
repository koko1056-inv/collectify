
import { Card, CardContent as UICardContent, CardHeader as UICardHeader } from "@/components/ui/card";
import { CardHeader } from "../collection/CardHeader";
import { CardContent } from "../collection/CardContent";
import { CollectionGoodsCardContent } from "../collection/CollectionGoodsCardContent";

interface PublicCollectionGoodsCardProps {
  title: string;
  image: string;
  id: string;
  userId?: string;
}

export function PublicCollectionGoodsCard({ 
  title, 
  image, 
  id,
  userId 
}: PublicCollectionGoodsCardProps) {
  return (
    <Card className="hover-scale card-shadow bg-white border border-gray-200">
      <UICardHeader className="p-0">
        <CardHeader 
          title={title} 
          image={image} 
          onClick={() => {}} 
          itemId={id}
          className="aspect-square"
        />
      </UICardHeader>
      <UICardContent className="p-4 space-y-2">
        <h3 className="text-sm font-medium text-gray-900 truncate">{title}</h3>
        <CollectionGoodsCardContent
          id={id}
          isOwner={false}
          onMemoriesClick={() => {}}
        />
      </UICardContent>
    </Card>
  );
}
