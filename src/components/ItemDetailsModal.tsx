import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CardImage } from "./collection/CardImage";

interface ItemDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  image: string;
  artist?: string | null;
  anime?: string | null;
  price?: string;
  releaseDate?: string;
}

export function ItemDetailsModal({
  isOpen,
  onClose,
  title,
  image,
  artist,
  anime,
  price,
  releaseDate,
}: ItemDetailsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="w-full aspect-square relative">
            <CardImage image={image} title={title} />
          </div>
          <div className="space-y-2">
            {artist && (
              <div>
                <span className="font-semibold">アーティスト：</span>
                <span>{artist}</span>
              </div>
            )}
            {anime && (
              <div>
                <span className="font-semibold">アニメ：</span>
                <span>{anime}</span>
              </div>
            )}
            {price && (
              <div>
                <span className="font-semibold">価格：</span>
                <span>{price}</span>
              </div>
            )}
            {releaseDate && (
              <div>
                <span className="font-semibold">発売日：</span>
                <span>{releaseDate}</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}