import { useState, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useIsMobile } from "@/hooks/use-mobile";
import { UserCollection } from "@/components/UserCollection";
import { useTags } from "@/hooks/useTags";
import { useAuth } from "@/contexts/AuthContext";
import { FilterSheet } from "@/components/FilterSheet";
import { SlotUsageMeter } from "@/components/shop/SlotUsageMeter";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { AddGoodsSheet } from "@/components/collection/AddGoodsSheet";
import { OshiRoomMiniCard } from "@/components/oshi/OshiRoomMiniCard";
import { useLanguage } from "@/contexts/LanguageContext";


export default function Collection() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContent, setSelectedContent] = useState("");
  const [selectedPersonalTag, setSelectedPersonalTag] = useState("");
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  // 「探して追加」からは選択肢を挟まずカタログ検索を直接開く
  const [addSheetView, setAddSheetView] = useState<"menu" | "pick">("menu");
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
    <div className="min-h-screen bg-background pb-nav">
      <Navbar />
      <main className={`container mx-auto transition-all duration-300 ${isMobile ? 'px-3 py-4' : 'px-4 py-4'}`}>
        <div className="max-w-5xl mx-auto space-y-4 animate-fade-in">
          {/* アプリの一言説明。初めての人が「何のアプリか」で迷わないよう、いちばん上に1行だけ置く。
              ログイン画面・ウェルカム・OGP の説明と同じ「推しグッズの図鑑」の軸で書く */}
          <p className="px-1 text-2xs text-muted-foreground" data-testid="app-tagline">{t("chrome.collection.tagline")}</p>

          {/* 「Collectifyはじめてガイド」。ログイン後に最初に開く画面がここなので、ここに置く。
              タブから辿り着けない画面に置いておくと誰も進められない。 */}
          {user && <OnboardingChecklist />}

          {/* 枠の使用状況は 80% を超えてから出す（常に出すと、最初の画面にグッズが1つも見えなかった）。
              普段の使用数はポイント画面と設定で見られる */}
          {user && <SlotUsageMeter type="collection" minPercent={80} />}

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
              searchQuery={searchQuery}
              onContentChange={handleContentChange}
              selectedPersonalTag={selectedPersonalTag}
              onPersonalTagChange={handlePersonalTagChange}
              onPickFromCatalog={() => { setAddSheetView("pick"); setIsAddSheetOpen(true); }}
              // 自分の推しの部屋の小さな窓（今日のお世話の残り・なかよしLv・いいね）。タップで /oshi へ。
              // 推しの部屋は「眺める・愛着」の場所なので、上の「推しの新着（登録のきっかけ）・コンプ」の下に置く。
              // 以前は画面のいちばん上（ガイドの直下）にあり、最初の画面が部屋とガイドで埋まっていた
              belowProgress={user ? <OshiRoomMiniCard /> : null}
            />
          </div>
        </div>
      </main>
      
      {/* グッズ追加の常設導線は下タブ中央のボタンに移した。
          以前はここにも「+追加」の浮きボタンを置いていたが、下タブ中央にも
          丸いボタンがあり（当時は検索）、丸いボタンが2つ並んで意味が
          取れなかった。中央ボタンを追加に変えたのでこちらは外す。
          このシートは空状態の「探して追加」から一覧表示で開くために残す。 */}
      <AddGoodsSheet
        open={isAddSheetOpen}
        onOpenChange={setIsAddSheetOpen}
        initialView={addSheetView}
      />

      <Footer />
    </div>
  );
}