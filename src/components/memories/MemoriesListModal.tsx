import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Link } from "react-router-dom";

interface Memory {
  id: string;
  comment?: string | null;
  image_url?: string | null;
  created_at: string;
  user_item_id: string;
  user_items?: {
    title: string;
    image: string;
  };
}

interface MemoriesListModalProps {
  isOpen: boolean;
  onClose: () => void;
  memories: Memory[];
}

export function MemoriesListModal({
  isOpen,
  onClose,
  memories,
}: MemoriesListModalProps) {
  // Group memories by year
  const yearGroups = memories.reduce((groups: { [key: string]: Memory[] }, memory) => {
    const year = format(new Date(memory.created_at), 'yyyy年', { locale: ja });
    if (!groups[year]) {
      groups[year] = [];
    }
    groups[year].push(memory);
    return groups;
  }, {});

  // Sort years in descending order
  const sortedYears = Object.keys(yearGroups).sort((a, b) => {
    return parseInt(b) - parseInt(a);
  });

  // Default to the most recent year
  const defaultYear = sortedYears[0] || '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>思い出一覧</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue={defaultYear} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mb-2">
            {sortedYears.map((year) => (
              <TabsTrigger key={year} value={year}>
                {year}
              </TabsTrigger>
            ))}
          </TabsList>
          {sortedYears.map((year) => {
            const yearMemories = yearGroups[year];
            
            // Group memories by month within the year
            const monthGroups = yearMemories.reduce((groups: { [key: string]: Memory[] }, memory) => {
              const monthKey = format(new Date(memory.created_at), 'M月', { locale: ja });
              if (!groups[monthKey]) {
                groups[monthKey] = [];
              }
              groups[monthKey].push(memory);
              return groups;
            }, {});

            // Sort months in descending order
            const sortedMonths = Object.keys(monthGroups).sort((a, b) => {
              return parseInt(b) - parseInt(a);
            });

            const defaultMonth = sortedMonths[0] || '';

            return (
              <TabsContent 
                key={year} 
                value={year} 
                className="flex-1 overflow-hidden"
              >
                <Tabs defaultValue={defaultMonth} className="h-full flex flex-col">
                  <div className="sticky top-0 bg-white z-10 mb-2">
                    <TabsList>
                      {sortedMonths.map((month) => (
                        <TabsTrigger key={month} value={month}>
                          {month}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                  {sortedMonths.map((month) => (
                    <TabsContent
                      key={month}
                      value={month}
                      className="flex-1 overflow-hidden"
                    >
                      <ScrollArea className="h-full pr-4">
                        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                          {monthGroups[month].map((memory) => (
                            <div
                              key={memory.id}
                              className="bg-white rounded-lg shadow-sm border p-3 space-y-3"
                            >
                              <Link
                                to={`/?itemId=${memory.user_item_id}`}
                                className="flex gap-3 items-center hover:opacity-80 transition-opacity"
                                onClick={onClose}
                              >
                                {memory.user_items?.image && (
                                  <img
                                    src={memory.user_items.image}
                                    alt={memory.user_items.title}
                                    className="w-12 h-12 object-cover rounded-md"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm line-clamp-1">
                                    {memory.user_items?.title}
                                  </p>
                                  <p className="text-gray-500 text-xs">
                                    {format(new Date(memory.created_at), 'M月d日', { locale: ja })}
                                  </p>
                                </div>
                              </Link>
                              {memory.comment && (
                                <p className="text-sm text-gray-600 break-words">
                                  {memory.comment}
                                </p>
                              )}
                              {memory.image_url && (
                                <img
                                  src={memory.image_url}
                                  alt="Memory"
                                  className="w-full h-32 object-cover rounded-md"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  ))}
                </Tabs>
              </TabsContent>
            );
          })}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}