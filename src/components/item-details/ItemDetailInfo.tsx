
import { ItemLabelValue } from "./ItemLabelValue";
import { SimpleItemTag } from "@/utils/tag/types";
import { useLanguage } from "@/contexts/LanguageContext";

interface ItemDetailInfoProps {
  tags: SimpleItemTag[];
  price?: string;
  description?: string;
  contentName?: string | null;
}

export function ItemDetailInfo({
  tags,
  price,
  description,
  contentName
}: ItemDetailInfoProps) {
  const { t } = useLanguage();
  // グッズタイプとグッズシリーズのタグを取得
  const typeTag = tags.find(tag => tag.tags?.category === 'type')?.tags?.name || '';
  const seriesTag = tags.find(tag => tag.tags?.category === 'series')?.tags?.name || '';

  return (
    <div className="space-y-3">
      {contentName && <ItemLabelValue icon="bookmark" label={t("itemDetails.common.content")} value={contentName} />}

      {typeTag && <ItemLabelValue icon="tag" label={t("itemDetails.common.goodsType")} value={typeTag} />}

      {seriesTag && <ItemLabelValue icon="layers" label={t("itemDetails.common.goodsSeries")} value={seriesTag} />}

      {price && <ItemLabelValue icon="price" label={t("itemDetails.common.price")} value={`¥${price}`} />}

      {description && <div className="space-y-1">
          <span className="text-xs text-muted-foreground">{t("itemDetails.common.description")}</span>
          <p className="text-sm whitespace-pre-wrap">{description}</p>
        </div>}
    </div>
  );
}
