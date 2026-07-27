import { ImageOff } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDateFormat } from "@/hooks/useDateFormat";

interface Memory {
  id: string;
  image_url: string | null;
  comment: string | null;
  created_at: string;
}

interface MemoriesListProps {
  memories: Memory[];
}

export function MemoriesList({ memories }: MemoriesListProps) {
  const { t } = useLanguage();
  const { formatNumericDate } = useDateFormat();

  if (memories.length === 0) {
    return (
      <EmptyState
        icon={ImageOff}
        title={t("collectionScreen.memories.empty")}
        className="py-6"
      />
    );
  }

  return (
    <div className="space-y-4">
      {memories.map((memory) => (
        <div
          key={memory.id}
          className="border rounded-lg p-4"
        >
          {memory.image_url && (
            <div className="mb-3">
              <img
                src={memory.image_url}
                alt={t("collectionScreen.memories.imageAlt")}
                className="w-full rounded-md"
              />
            </div>
          )}
          {memory.comment && (
            <p className="text-foreground">{memory.comment}</p>
          )}
          <p className="text-sm text-muted-foreground mt-2">
            {formatNumericDate(memory.created_at)}
          </p>
        </div>
      ))}
    </div>
  );
}