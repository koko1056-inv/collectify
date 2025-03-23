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
  if (memories.length === 0) {
    return (
      <p className="text-center text-gray-500 py-4">
        まだ思い出が登録されていません
      </p>
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
                alt="思い出の画像"
                className="w-full rounded-md"
              />
            </div>
          )}
          {memory.comment && (
            <p className="text-gray-700">{memory.comment}</p>
          )}
          <p className="text-sm text-gray-500 mt-2">
            {new Date(memory.created_at).toLocaleDateString("ja-JP")}
          </p>
        </div>
      ))}
    </div>
  );
}