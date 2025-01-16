import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  // 年ごとにグループ化
  const yearGroups = Object.entries(groupedMemories).reduce((acc: Record<string, Record<string, typeof memories>>, [yearMonth, memories]) => {
    const year = yearMonth.split('年')[0];
    if (!acc[year]) {
      acc[year] = {};
    }
    acc[year][yearMonth] = memories;
    return acc;
  }, {});

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>記録一覧</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue={Object.keys(yearGroups)[0]} className="w-full">
          <TabsList className="w-full justify-start mb-4 overflow-x-auto">
            {Object.keys(yearGroups).map((year) => (
              <TabsTrigger key={year} value={year} className="px-4">
                {year}年
              </TabsTrigger>
            ))}
          </TabsList>
          {Object.entries(yearGroups).map(([year, monthGroups]) => (
            <TabsContent key={year} value={year} className="mt-0">
              <ScrollArea className="h-[65vh]">
                <div className="space-y-6 pr-4">
                  {Object.entries(monthGroups).map(([yearMonth, monthMemories]) => (
                    <div key={yearMonth} className="space-y-4">
                      <h3 className="font-medium text-base sticky top-0 bg-white py-2 px-2 shadow-sm rounded-lg z-10">
                        {yearMonth.split('年')[1]}
                      </h3>
                      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                        {monthMemories.map((memory) => (
                          <div key={memory.id} className="border rounded-lg p-3 space-y-2 text-sm">
                            <div className="flex gap-3 items-center">
                              <img
                                src={memory.user_items.image}
                                alt={memory.user_items.title}
                                className="w-12 h-12 object-cover rounded-md"
                              />
                              <div>
                                <h4 className="font-medium line-clamp-1">{memory.user_items.title}</h4>
                                <p className="text-xs text-gray-500">
                                  {format(new Date(memory.created_at), 'M月d日', { locale: ja })}
                                </p>
                              </div>
                            </div>
                            {memory.image_url && (
                              <img
                                src={memory.image_url}
                                alt="思い出の画像"
                                className="w-full h-32 object-cover rounded-lg"
                              />
                            )}
                            {memory.comment && (
                              <p className="text-gray-700 text-sm line-clamp-3">{memory.comment}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}