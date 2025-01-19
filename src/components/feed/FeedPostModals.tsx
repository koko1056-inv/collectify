import { ShareModal } from "@/components/ShareModal";
import { ItemMemoriesModal } from "@/components/ItemMemoriesModal";

interface FeedPostModalsProps {
  post: any;
  isShareModalOpen: boolean;
  isMemoriesModalOpen: boolean;
  onShareClose: () => void;
  onMemoriesClose: () => void;
}

export function FeedPostModals({
  post,
  isShareModalOpen,
  isMemoriesModalOpen,
  onShareClose,
  onMemoriesClose,
}: FeedPostModalsProps) {
  return (
    <>
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={onShareClose}
        title={post.title}
        url={window.location.href}
        image={post.image}
      />

      <ItemMemoriesModal
        isOpen={isMemoriesModalOpen}
        onClose={onMemoriesClose}
        itemIds={[post.id]}
        itemTitles={[post.title]}
        userId={post.user_id}
      />
    </>
  );
}