import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Footer } from "@/components/Footer";

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

export default function Memories() {
  const { data: memories = [] } = useQuery({
    queryKey: ["memories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_memories")
        .select(`
          *,
          user_items:user_items (
            title,
            image
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Memory[];
    },
  });

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
    <>
      <div className="container mx-auto px-4 py-6 pb-20">
        <h1 className="text-2xl font-bold mb-6">思い出一覧</h1>
        
        <Tabs defaultValue={defaultYear} className="w-full">
          <ScrollArea className="w-full">
            <TabsList className="mb-4 w-full justify-start">
              {sortedYears.map((year) => (
                <TabsTrigger key={year} value={year}>
                  {year}
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollArea>

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
              <TabsContent key={year} value={year}>
                <Tabs defaultValue={defaultMonth} className="w-full">
                  <ScrollArea className="w-full">
                    <TabsList className="mb-4 w-full justify-start">
                      {sortedMonths.map((month) => (
                        <TabsTrigger key={month} value={month}>
                          {month}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </ScrollArea>

                  {sortedMonths.map((month) => (
                    <TabsContent key={month} value={month}>
                      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {monthGroups[month].map((memory) => (
                          <div
                            key={memory.id}
                            className="bg-white rounded-lg shadow-sm border p-4 space-y-3"
                          >
                            <Link
                              to={`/?itemId=${memory.user_item_id}`}
                              className="flex gap-3 items-center hover:opacity-80 transition-opacity"
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
                                className="w-full h-48 object-cover rounded-md"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
      <Footer />
    </>
  );
}