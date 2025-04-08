
import React, { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useIsMobile } from "@/hooks/use-mobile";
import { UserCollection } from "@/components/UserCollection";
import { useTags } from "@/hooks/useTags";
import { GroupShowcase } from "@/components/collection/GroupShowcase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";

export default function Collection() {
  const isMobile = useIsMobile();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContent, setSelectedContent] = useState("");
  const { user } = useAuth();

  const { data: allTags = [] } = useTags();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />
      <main className={`container mx-auto pt-28 ${isMobile ? 'px-4 py-8' : 'px-4 py-8'}`}>
        <div className="max-w-4xl mx-auto space-y-6">
          <Tabs defaultValue="collection" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="collection">マイコレクション</TabsTrigger>
              <TabsTrigger value="showcase">マイショーケース</TabsTrigger>
            </TabsList>
            
            <TabsContent value="collection" className="space-y-6">
              <UserCollection
                selectedTags={selectedTags}
                userId={null}
              />
            </TabsContent>
            
            <TabsContent value="showcase" className="space-y-6">
              <GroupShowcase userId={user?.id} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
