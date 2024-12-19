import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart } from "lucide-react";

interface GoodsCardProps {
  title: string;
  image: string;
  price: string;
}

export function GoodsCard({ title, image, price }: GoodsCardProps) {
  return (
    <Card className="hover-scale card-shadow">
      <CardHeader className="p-0">
        <div className="aspect-square relative overflow-hidden rounded-t-lg">
          <img
            src={image}
            alt={title}
            className="object-cover w-full h-full"
          />
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <CardTitle className="text-lg mb-2 line-clamp-2">{title}</CardTitle>
        <p className="text-sm text-gray-600">{price}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between">
        <Button variant="default" className="w-full mr-2">
          コレクションに追加
        </Button>
        <Button variant="outline" size="icon">
          <Heart className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}