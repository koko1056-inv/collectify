import { CardTitle } from "@/components/ui/card";
import { CardImage } from "./CardImage";

interface CardHeaderProps {
  title: string;
  image: string;
}

export function CardHeader({ title, image }: CardHeaderProps) {
  return (
    <>
      <CardImage image={image} title={title} />
      <div className="p-4">
        <CardTitle className="text-base mb-2 line-clamp-2 text-gray-900">{title}</CardTitle>
      </div>
    </>
  );
}