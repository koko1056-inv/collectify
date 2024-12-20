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
        className="object-cover w-full h-full hover:scale-105 transition-transform duration-300"
      />
    </div>
  );
}