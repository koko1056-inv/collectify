import { CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface OfficialGoodsCardContentProps {
  title: string;
  artist?: string | null;
  content?: string | null;
  itemId: string;
}

export function OfficialGoodsCardContent({ 
  title, 
  artist, 
  content,
  itemId
}: OfficialGoodsCardContentProps) {
  return (
    <CardContent className="p-1 sm:p-3 overflow-hidden space-y-1">
      <CardTitle className="text-xs sm:text-base line-clamp-2 text-gray-900">{title}</CardTitle>
      {content && (
        <Badge variant="outline" className="text-[10px] sm:text-xs">
          {content}
        </Badge>
      )}
    </CardContent>
  );
}