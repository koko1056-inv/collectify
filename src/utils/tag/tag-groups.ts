import { SimpleItemTag, TagGroupedItems } from "./types";
import { getTagsForItem } from "./tag-queries";

// ユーザーアイテムをタグごとにグループ化する関数
export const getItemsGroupedByTag = async (
  userItems: any[],
  userId: string
): Promise<TagGroupedItems> => {
  const groupedItems: TagGroupedItems = {};

  for (const item of userItems) {
    const tags: SimpleItemTag[] = await getTagsForItem(item.id, true);

    if (tags && tags.length > 0) {
      for (const tag of tags) {
        if (tag.tags) {
          const tagName = tag.tags.name;
          if (groupedItems[tagName]) {
            groupedItems[tagName].push(item);
          } else {
            groupedItems[tagName] = [item];
          }
        }
      }
    }
  }

  return groupedItems;
};
