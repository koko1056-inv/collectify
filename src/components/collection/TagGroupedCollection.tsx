
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag as TagIcon } from "lucide-react";
import { GroupShowcase } from "./GroupShowcase";

interface TagGroupedCollectionProps {
  userId: string;
}

export function TagGroupedCollection({ userId }: TagGroupedCollectionProps) {
  const [activeView, setActiveView] = useState<string>("groups");
  const { user } = useAuth();
  
  if (!user?.id) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">コレクションを表示するにはログインしてください。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="groups" onValueChange={setActiveView} className="w-full">
        <TabsList className="w-full max-w-[360px] mx-auto grid grid-cols-2 bg-white border border-gray-200 rounded-full mb-4">
          <TabsTrigger
            value="groups"
            className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full"
          >
            グループ
          </TabsTrigger>
          <TabsTrigger
            value="tags"
            className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full"
          >
            タグ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="mt-4">
          <GroupShowcase />
        </TabsContent>

        <TabsContent value="tags" className="mt-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 bg-white p-2 rounded-lg shadow-sm">
              <TagIcon className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">テーマで表示：</span>
            </div>
            
            <ScrollArea className="w-full">
              <div className="flex space-x-2 pb-2">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-16" />
                <Skeleton className="h-9 w-20" />
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>

            <div className="text-center py-8">
              <Skeleton className="h-6 w-3/4 mx-auto mb-4" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-[120px] w-full" />
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
