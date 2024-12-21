import { CardHeader } from "@/components/ui/card";

interface OfficialGoodsCardHeaderProps {
  image: string;
  title: string;
}

export function OfficialGoodsCardHeader({ image, title }: OfficialGoodsCardHeaderProps) {
  return (
    <CardHeader className="p-0">
      <div className="aspect-square relative overflow-hidden rounded-t-lg">
        <img
          src={image}
          alt={title}
          className="object-cover w-full h-full hover:scale-105 transition-transform duration-300"
        />
      </div>
    </CardHeader>
  );
}