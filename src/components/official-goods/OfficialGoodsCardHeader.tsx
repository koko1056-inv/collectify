import { CardHeader } from "@/components/ui/card";
import { LazyImage } from "@/components/ui/lazy-image";

interface OfficialGoodsCardHeaderProps {
  image: string;
  title: string;
}

export function OfficialGoodsCardHeader({ image, title }: OfficialGoodsCardHeaderProps) {
  return (
    <CardHeader className="p-0">
      <div className="aspect-square relative overflow-hidden rounded-t-lg">
        <LazyImage
          src={image}
          alt={title}
          className="object-cover w-full h-full hover:scale-105 transition-transform duration-300"
          skeletonClassName="aspect-square"
        />
      </div>
    </CardHeader>
  );
}