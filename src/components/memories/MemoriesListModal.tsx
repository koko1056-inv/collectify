import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MemoriesListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MemoriesListModal({ isOpen, onClose }: MemoriesListModalProps) {
  const { user } = useAuth();

  const { data: memories = [] } = useQuery({
    queryKey: ["user-memories", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("item_memories")
        .select(`
          id,
          comment,
          image_url,
          created_at,
          user_items (
            title,
            image
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && isOpen,
  });

  // メモリーを年月ごとにグループ化
  const groupedMemories = memories.reduce((acc: Record<string, typeof memories>, memory) => {
    const date = new Date(memory.created_at);
    const yearMonth = format(date, 'yyyy年M月', { locale: ja });
    
    if (!acc[yearMonth]) {
      acc[yearMonth] = [];
    }
    acc[yearMonth].push(memory);
    return acc;
  }, {});

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>記録一覧</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[70vh] pr-4">
          <div className="space-y-6">
            {Object.entries(groupedMemories).map(([yearMonth, monthMemories]) => (
              <div key={yearMonth} className="space-y-4">
                <h3 className="font-medium text-lg sticky top-0 bg-white py-2">{yearMonth}</h3>
                <div className="grid gap-4">
                  {monthMemories.map((memory) => (
                    <div key={memory.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex gap-4 items-center">
                        <img
                          src={memory.user_items.image}
                          alt={memory.user_items.title}
                          className="w-16 h-16 object-cover rounded-md"
                        />
                        <div>
                          <h4 className="font-medium">{memory.user_items.title}</h4>
                          <p className="text-sm text-gray-500">
                            {format(new Date(memory.created_at), 'yyyy年M月d日', { locale: ja })}
                          </p>
                        </div>
                      </div>
                      {memory.image_url && (
                        <img
                          src={memory.image_url}
                          alt="思い出の画像"
                          className="w-full rounded-lg"
                        />
                      )}
                      {memory.comment && (
                        <p className="text-gray-700">{memory.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}