import { useEffect, useState } from "react";
import { ItemDetailsDeleteDialog } from "@/components/item-details/ItemDetailsDeleteDialog";
import { CreateItemPostModal } from "@/components/item-posts/CreateItemPostModal";

interface CollectionGoodsCardModalsProps {
  isDeleteConfirmOpen: boolean;
  setIsDeleteConfirmOpen: (open: boolean) => void;
  isCreatePostModalOpen: boolean;
  setIsCreatePostModalOpen: (open: boolean) => void;
  id: string;
  title: string;
  image: string;
}

export function CollectionGoodsCardModals({
  isDeleteConfirmOpen,
  setIsDeleteConfirmOpen,
  isCreatePostModalOpen,
  setIsCreatePostModalOpen,
  id,
  title,
  image,
}: CollectionGoodsCardModalsProps) {
  // 投稿の作成画面はポイント残高などを読むので、グリッドの全カードに置くと読み込みが枚数ぶん増える。
  // 一度開いたカードにだけ置く（閉じるアニメーションのため、開いた後は置いたままにする）
  const [postModalMounted, setPostModalMounted] = useState(false);
  useEffect(() => {
    if (isCreatePostModalOpen) setPostModalMounted(true);
  }, [isCreatePostModalOpen]);

  return (
    <>
      <ItemDetailsDeleteDialog
        open={isDeleteConfirmOpen}
        setOpen={setIsDeleteConfirmOpen}
        title={title}
        itemId={id}
        isUserItem
        onCloseModal={() => setIsDeleteConfirmOpen(false)}
      />

      {/* グッズ詳細の「このグッズの投稿」と同じ item_posts に書く。
          以前の CreatePostModal は旧テーブル goods_posts に書いており、みんなのフィードや自分のグッズ詳細には出なかった */}
      {(postModalMounted || isCreatePostModalOpen) && (
        <CreateItemPostModal
          open={isCreatePostModalOpen}
          onOpenChange={setIsCreatePostModalOpen}
          target={{ type: "user_item", id }}
          itemTitle={title}
          itemImage={image}
        />
      )}
    </>
  );
}
