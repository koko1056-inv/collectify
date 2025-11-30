import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

interface CardPocketSlotProps {
  id: string;
  index: number;
  item?: {
    id: string;
    item_data: {
      id: string;
      title: string;
      image: string;
    };
  };
  onDragStart?: (itemId: string) => void;
}

export function CardPocketSlot({ id, index, item, onDragStart }: CardPocketSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${index}`,
    data: { type: "pocket-slot", index },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 transition-all overflow-hidden",
        isOver ? "border-primary bg-primary/10 scale-105" : "border-gray-300",
        item ? "cursor-grab active:cursor-grabbing" : ""
      )}
      draggable={!!item}
      onDragStart={() => item && onDragStart?.(item.id)}
    >
      {/* ポケットの反射効果 */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/30 pointer-events-none" />
      
      {/* アイテム */}
      {item?.item_data ? (
        <div className="w-full h-full p-2">
          <img
            src={item.item_data.image}
            alt={item.item_data.title}
            className="w-full h-full object-cover rounded pointer-events-none"
            draggable={false}
          />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
          {isOver ? "ドロップ" : "空"}
        </div>
      )}
    </div>
  );
}
