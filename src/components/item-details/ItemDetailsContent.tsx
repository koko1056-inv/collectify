import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ItemDetailsContentProps {
  image: string;
  title: string;
  tags: any[];
  memories: any[];
  isUserItem: boolean;
  isEditing: boolean;
  editedData: any;
  setEditedData: (data: any) => void;
  content?: string | null;
}

export function ItemDetailsContent({
  image,
  tags,
  memories,
  isUserItem,
  content,
}: ItemDetailsContentProps) {
  return (
    <CardContent className="space-y-4">
      <div className="aspect-square relative overflow-hidden rounded-lg">
        <img
          src={image}
          alt="Item preview"
          className="w-full h-full object-contain bg-gray-100"
        />
      </div>

      {content && (
        <div>
          <h3 className="text-sm font-medium mb-2">コンテンツ</h3>
          <Badge variant="secondary">{content}</Badge>
        </div>
      )}

      {tags.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">タグ</h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag.tag_id} variant="outline">
                {tag.tags?.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {isUserItem && memories.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">メモリー</h3>
          <div className="space-y-2">
            {memories.map((memory) => (
              <div
                key={memory.id}
                className="p-2 bg-gray-50 rounded-lg text-sm"
              >
                {memory.comment}
              </div>
            ))}
          </div>
        </div>
      )}
    </CardContent>
  );
}