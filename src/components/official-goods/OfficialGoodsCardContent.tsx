
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
    <CardContent className="p-1 sm:p-2 overflow-hidden bg-white">
      <CardTitle className="text-[10px] sm:text-xs mb-0.5 line-clamp-2 text-gray-900 font-normal">{title}</CardTitle>
      {artist && (
        <p className="text-[8px] sm:text-[10px] text-gray-500 truncate">{artist}</p>
      )}
    </CardContent>
  );
}
