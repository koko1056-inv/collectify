
import React from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FilterBar } from "@/components/FilterBar";
import { SlideFilterBar } from "@/components/SlideFilterBar";
import { OfficialItemsList } from "@/components/OfficialItemsList";
import { FriendSearch } from "@/components/search/FriendSearch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOfficialItems } from "@/hooks/useOfficialItems";
import { useTags } from "@/hooks/useTags";
import { useState, useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { Package, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const Search = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedContent, setSelectedContent] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const queryClient = useQueryClient();
  const {
    data: items = []
  } = useOfficialItems();
  const {
    data: allTags = []
  } = useTags(selectedContent);

  // Supabase Realtimeでofficial_itemsの変更を監視
  useEffect(() => {
    const channel = supabase
      .channel('official-items-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETEすべてを監視
          schema: 'public',
          table: 'official_items'
        },
        (payload) => {
          console.log('[Search] official_items changed:', payload);
          // official-itemsクエリを無効化して再フェッチ
          queryClient.invalidateQueries({ queryKey: ['official-items'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // URLからタブの状態を取得
  const currentTab = searchParams.get("tab") || "goods";

  // タブ切り替え時にURLを更新
  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  // ユーザーの興味のあるコンテンツをデフォルトで設定
  useEffect(() => {
    console.log("Search page profile:", profile);
    console.log("Search page profile.interests:", profile?.interests);
    
    if (profile?.interests && Array.isArray(profile.interests) && profile.interests.length > 0 && !selectedContent && currentTab === "goods") {
      // 最初の興味のあるコンテンツをデフォルトで選択
      const firstInterestItem = profile.interests[0];
      let firstInterest: string;
      
      if (typeof firstInterestItem === 'string') {
        firstInterest = firstInterestItem;
      } else if (firstInterestItem && typeof firstInterestItem === 'object' && 'name' in firstInterestItem) {
        firstInterest = (firstInterestItem as any).name;
      } else {
        firstInterest = String(firstInterestItem);
      }
      
      console.log("Setting selected content to:", firstInterest);
      setSelectedContent(firstInterest);
    }
  }, [profile, selectedContent, currentTab]);

  // URLクエリパラメータを処理
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const itemId = searchParams.get('item');
    
    if (itemId && items.length > 0) {
      // 指定されたアイテムを検索して、そのタイトルを検索クエリにセット
      const targetItem = items.find(item => item.id === itemId);
      if (targetItem) {
        setSearchQuery(targetItem.title);
        // アイテム検索の場合は自動的にグッズタブに切り替え
        setSearchParams({ tab: "goods" });
      }
    }
  }, [location.search, items, setSearchParams]);

  const filteredItems = items.filter(item => {
    const matchesSearch = searchQuery ? item.title.toLowerCase().includes(searchQuery.toLowerCase()) || (item.artist?.toLowerCase() || "").includes(searchQuery.toLowerCase()) || (item.anime?.toLowerCase() || "").includes(searchQuery.toLowerCase()) : true;
    const matchesTags = selectedTags.length === 0 || selectedTags.every(tag => item.item_tags?.some(itemTag => itemTag.tags?.name === tag));
    const matchesContent = !selectedContent || selectedContent === "all" || item.content_name === selectedContent;
    return matchesSearch && matchesTags && matchesContent;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-2 pt-16 pb-24 sm:px-4 sm:pt-24 sm:pb-8">
        <div className="space-y-4 sm:space-y-6">
          {/* タブ */}
          <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
              <TabsTrigger value="goods" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                グッズ
              </TabsTrigger>
              <TabsTrigger value="friends" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                フレンド
              </TabsTrigger>
            </TabsList>

            {/* グッズ検索タブ */}
            <TabsContent value="goods" className="space-y-4 sm:space-y-6">
              <SlideFilterBar
                selectedContent={selectedContent}
                onContentChange={setSelectedContent}
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
                tags={allTags}
              />
              <div className="z-10 bg-gray-50 pb-2">
                <FilterBar
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  selectedTags={selectedTags}
                  onTagsChange={setSelectedTags}
                  selectedContent={selectedContent}
                  onContentChange={setSelectedContent}
                  tags={allTags}
                />
              </div>

              <OfficialItemsList
                items={filteredItems}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
                selectedContent={selectedContent}
                onContentChange={setSelectedContent}
                tags={allTags}
              />
            </TabsContent>

            {/* フレンド検索タブ */}
            <TabsContent value="friends" className="space-y-4 sm:space-y-6">
              <FriendSearch 
                userInterests={
                  Array.isArray(profile?.interests) 
                    ? profile.interests.map(interest => 
                        typeof interest === 'string' ? interest : 
                        interest && typeof interest === 'object' && 'name' in interest ? 
                        (interest as any).name : String(interest)
                      )
                    : []
                } 
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      {/* フローティング追加ボタン */}
      {currentTab === "goods" && (
        <Button
          onClick={() => navigate("/add-item")}
          className="fixed bottom-20 right-4 sm:bottom-8 sm:right-8 z-50 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg"
          size="icon"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}
      
      <Footer />
    </div>
  );
};

export default Search;
