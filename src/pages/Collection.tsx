import { useState, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useIsMobile } from "@/hooks/use-mobile";
import { UserCollection } from "@/components/UserCollection";
import { useTags } from "@/hooks/useTags";
import { useAuth } from "@/contexts/AuthContext";
import { FilterSheet } from "@/components/FilterSheet";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { SlotUsageMeter } from "@/components/shop/SlotUsageMeter";


export default function Collection() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContent, setSelectedContent] = useState("");
  const [selectedPersonalTag, setSelectedPersonalTag] = useState("");
  const { data: allTags = [] } = useTags();

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleTagsChange = useCallback((tags: string[]) => {
    setSelectedTags(tags);
  }, []);

  const handleContentChange = useCallback((content: string) => {
    setSelectedContent(content);
  }, []);

  const handlePersonalTagChange = useCallback((tag: string) => {
    setSelectedPersonalTag(tag);
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />
      <main className={`container mx-auto transition-all duration-300 ${isMobile ? 'px-3 py-4' : 'px-4 py-4'}`}>
        <div className="max-w-5xl mx-auto space-y-4 animate-fade-in">
          {/* 枠の使用状況は常に表示する（以前は95%を超えるまで何も出なかった） */}
          {user && <SlotUsageMeter type="collection" />}

          <FilterSheet
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            selectedTags={selectedTags}
            onTagsChange={handleTagsChange}
            selectedContent={selectedContent}
            onContentChange={handleContentChange}
            tags={allTags}
            selectedPersonalTag={selectedPersonalTag}
            onPersonalTagChange={handlePersonalTagChange}
          />
          
          <div className="transition-all duration-200">
            <UserCollection 
              selectedTags={selectedTags} 
              userId={user?.id || null} 
              selectedContent={selectedContent} 
              onContentChange={handleContentChange}
              selectedPersonalTag={selectedPersonalTag}
              onPersonalTagChange={handlePersonalTagChange}
            />
          </div>
        </div>
      </main>
      
      {/* モバイル用のフローティングルームボタン */}
      {/* グッズ追加の常設導線。
          コレクションが1件でもあると空状態のCTAが消えてしまい、
          「2個目を追加する」入口が画面から無くなっていたため常時出す。
          下タブ中央の丸い「みつける」ボタンと見分けがつくよう、
          円形アイコンではなく文字付きの横長ボタンにしている。 */}
      {isMobile && (
        <Button
          onClick={() => navigate("/quick-add")}
          aria-label={t("chrome.collection.addByPhoto")}
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-50 shadow-lg rounded-full h-12 pl-4 pr-5 gap-2"
        >
          <Camera className="w-5 h-5" />
          <span className="text-sm font-semibold">{t("chrome.fab.addShort")}</span>
        </Button>
      )}
      
      <Footer />
    </div>
  );
}