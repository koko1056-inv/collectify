
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
    <CardContent className="p-2 sm:p-4 overflow-hidden flex-1">
      <CardTitle className="text-xs sm:text-sm line-clamp-2 text-gray-900 min-h-[2.5em] sm:min-h-[2.75em]">{title}</CardTitle>
    </CardContent>
  );
}
