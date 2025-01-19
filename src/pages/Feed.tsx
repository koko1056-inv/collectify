import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navbar } from "@/components/Navbar";
import { FeedHeader } from "@/components/feed/FeedHeader";
import { FeedContent } from "@/components/feed/FeedContent";
import { GroupList } from "@/components/community/GroupList";
import { EventList } from "@/components/community/EventList";

const Feed = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 pt-20 pb-8">
        <FeedHeader />
        <Tabs defaultValue="feed" className="mt-6">
          <TabsList className="w-full justify-start border-b pb-px">
            <TabsTrigger value="feed" className="data-[state=active]:border-b-2">
              フィード
            </TabsTrigger>
            <TabsTrigger value="groups" className="data-[state=active]:border-b-2">
              グループ
            </TabsTrigger>
            <TabsTrigger value="events" className="data-[state=active]:border-b-2">
              イベント
            </TabsTrigger>
          </TabsList>
          <TabsContent value="feed" className="mt-6">
            <FeedContent />
          </TabsContent>
          <TabsContent value="groups" className="mt-6">
            <GroupList />
          </TabsContent>
          <TabsContent value="events" className="mt-6">
            <EventList />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Feed;