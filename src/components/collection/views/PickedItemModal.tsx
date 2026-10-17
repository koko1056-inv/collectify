import { UserItemDetailsModal } from "@/components/item-details/UserItemDetailsModal";
import { PublicUserItemModal } from "@/components/item-details/PublicUserItemModal";
import { ItemDetailsModal } from "@/components/ItemDetailsModal";

/** 図鑑・バインダー・棚でタップしたもの。持っているグッズ（user_items）か、まだのグッズ（official_items） */
export type PickedItem =
  | { kind: "user"; id: string; title: string; image: string; ownerId?: string; isOwn: boolean }
  | { kind: "official"; id: string; title: string; image: string; releaseDate?: string };

/** 一覧のカードと同じ詳細を開く（自分のグッズ = 編集、人のグッズ = 公開ビュー、まだのグッズ = 公式の詳細） */
export function PickedItemModal({ picked, onClose }: { picked: PickedItem | null; onClose: () => void }) {
  if (!picked) return null;
  if (picked.kind === "official") {
    return (
      <ItemDetailsModal
        isOpen
        onClose={onClose}
        itemId={picked.id}
        title={picked.title}
        image={picked.image}
        releaseDate={picked.releaseDate}
      />
    );
  }
  return picked.isOwn ? (
    <UserItemDetailsModal isOpen onClose={onClose} itemId={picked.id} title={picked.title} image={picked.image} />
  ) : (
    <PublicUserItemModal
      isOpen
      onClose={onClose}
      itemId={picked.id}
      title={picked.title}
      image={picked.image}
      ownerId={picked.ownerId}
    />
  );
}
