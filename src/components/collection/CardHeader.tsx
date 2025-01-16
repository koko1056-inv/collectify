import { CardTitle } from "@/components/ui/card";
import { CardImage } from "./CardImage";

interface CardHeaderProps {
  title: string;
  image: string;
  onClick?: () => void;
  memoriesCount?: number;
}

export function CardHeader({ title, image, onClick, memoriesCount }: CardHeaderProps) {
  return (
    <div onClick={onClick}>
      <CardImage image={image} title={title} memoriesCount={memoriesCount} />
      <div className="px-3 py-2">
        <CardTitle className="text-base line-clamp-1 text-gray-900">{title}</CardTitle>
      </div>
    </div>
  );
}