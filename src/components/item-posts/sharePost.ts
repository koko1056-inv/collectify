import { toast } from "sonner";
import { SITE_URL } from "@/config/site";
import { shareContent } from "@/utils/share";
import { buildShareText } from "@/utils/shareLinks";
import type { ItemPost } from "@/hooks/item-posts/useItemPosts";

type T = (key: string, vars?: Record<string, string | number>) => string;

/** 投稿をシェアする（詳細とフィードのカードで同じ文面・同じ知らせにそろえる） */
export async function sharePost(post: ItemPost, t: T) {
  const shareUrl = `${SITE_URL}/post/${post.id}`;
  const owner = post.profile?.display_name || post.profile?.username || t("social.itemPosts.collector");
  // 本文の1行目は buildShareText と同じ文言にそろえる（URLは shareContent が末尾に付ける）
  const text = buildShareText({ type: "post", id: post.id, ownerName: owner }).split("\n").slice(0, 2).join("\n");
  const result = await shareContent({
    title: t("social.itemPosts.shareTitle"),
    text,
    url: shareUrl,
    imageUrl: post.images[0]?.image_url ?? null,
    fileName: "collectify-post.png",
  });
  if (result === "copied") toast.success(t("social.itemPosts.urlCopied"));
  else if (result === "failed") toast.error(t("engage.share.copyFailed"));
}
