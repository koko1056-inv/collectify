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
    <CardContent className="p-1 sm:p-3 overflow-hidden">
      <CardTitle className="text-xs sm:text-base mb-1 line-clamp-2 text-gray-900">{title}</CardTitle>
    </CardContent>
  );
}