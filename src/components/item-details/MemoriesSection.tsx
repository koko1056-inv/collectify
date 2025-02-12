
interface MemoriesSectionProps {
  memories: any[];
}

export function MemoriesSection({ memories }: MemoriesSectionProps) {
  if (memories.length === 0) return null;

  return (
    <div className="space-y-4">
      <h4 className="font-medium">メモリー</h4>
      {memories.map((memory) => (
        <div key={memory.id} className="space-y-2">
          {memory.image_url && (
            <img
              src={memory.image_url}
              alt="Memory"
              className="w-full rounded-lg"
            />
          )}
          {memory.comment && (
            <p className="text-sm text-gray-600">{memory.comment}</p>
          )}
        </div>
      ))}
    </div>
  );
}
