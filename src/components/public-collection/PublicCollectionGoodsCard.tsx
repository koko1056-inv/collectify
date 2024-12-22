import { Card, CardContent as UICardContent, CardHeader as UICardHeader } from "@/components/ui/card";
import { CardHeader } from "../collection/CardHeader";
import { CardContent } from "../collection/CardContent";

interface PublicCollectionGoodsCardProps {
  title: string;
  image: string;
  id: string;
  isShared: boolean;
  userId?: string;
}

export function PublicCollectionGoodsCard({ 
  title, 
  image, 
  id,
  isShared,
  userId 
}: PublicCollectionGoodsCardProps) {
  return (
    <Card className="hover-scale card-shadow bg-white border border-gray-200">
      <UICardHeader className="p-0">
        <CardHeader title={title} image={image} />
      </UICardHeader>
      <UICardContent className="p-0">
        <CardContent
          itemId={id}
          itemTags={[]}
          memoriesCount={0}
          isOwner={false}
          isShared={isShared}
          onMemoriesClick={() => {}}
          onShareToggle={() => {}}
        />
      </UICardContent>
    </Card>
  );
}