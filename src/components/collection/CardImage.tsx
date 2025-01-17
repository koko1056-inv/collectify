interface CardImageProps {
  image: string;
  title: string;
}

export function CardImage({ image, title }: CardImageProps) {
  return (
    <div className="aspect-square relative overflow-hidden rounded-t-lg">
      <img
        src={image}
        alt={title}
        className="w-full h-full transition-all duration-300 hover:scale-105 object-cover"
      />
    </div>
  );
}