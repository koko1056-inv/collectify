import { CardImage } from "./CardImage";

interface CardHeaderProps {
  title: string;
  image: string;
  onClick: () => void;
  itemId?: string;
  isEditable?: boolean;
  className?: string;
}

export function CardHeader({ title, image, onClick, itemId, isEditable, className }: CardHeaderProps) {
  return (
    <div onClick={onClick} className={className}>
      <CardImage 
        title={title} 
        image={image} 
        itemId={itemId}
        isEditable={isEditable} 
      />
    </div>
  );
}