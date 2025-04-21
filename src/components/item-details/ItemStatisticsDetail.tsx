
import { ItemStatistics } from "./ItemStatistics";
import { ItemDetailInfo } from "./ItemDetailInfo";
import { SimpleItemTag } from "@/utils/tag/types";

interface ItemStatisticsDetailProps {
  likesCount: number;
  ownersCount: number;
  tradesCount: number;
  tags: SimpleItemTag[];
  price?: string;
  description?: string;
  contentName?: string | null;
}

export function ItemStatisticsDetail({
  likesCount,
  ownersCount,
  tradesCount,
  tags,
  price,
  description,
  contentName,
}: ItemStatisticsDetailProps) {
  return (
    <div>
      <ItemStatistics
        likesCount={likesCount}
        ownersCount={ownersCount}
        tradesCount={tradesCount}
      />
      <ItemDetailInfo
        tags={tags}
        price={price}
        description={description}
        contentName={contentName}
      />
    </div>
  );
}
