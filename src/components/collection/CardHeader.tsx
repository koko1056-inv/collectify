interface CardHeaderProps {
  title: string;
  image: string;
  onClick: () => void;
  itemId?: string;
  isEditable?: boolean;
}

export function CardHeader({ title, image, onClick, itemId, isEditable }: CardHeaderProps) {
  return (
    <div onClick={onClick}>
      <CardImage 
        title={title} 
        image={image} 
        itemId={itemId}
        isEditable={isEditable} 
      />
    </div>
  );
}