
import { CardContent, CardTitle } from "@/components/ui/card";

interface OfficialGoodsCardContentProps {
  title: string;
  artist?: string | null;
  itemId: string;
}

export function OfficialGoodsCardContent({ 
  title, 
  artist, 
  itemId
}: OfficialGoodsCardContentProps) {
  return (
    <CardContent className="p-2 sm:p-4 overflow-hidden">
      <CardTitle className="text-xs sm:text-sm mb-2 line-clamp-2 text-gray-900">{title}</CardTitle>
    </CardContent>
  );
}
