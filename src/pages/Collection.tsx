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
import { PreorderArrivalBanner } from "@/components/preorders/PreorderArrivalBanner";
import { useLanguage } from "@/contexts/LanguageContext";
import { NoticeSlotProvider } from "@/components/collection/NoticeSlot";
import { useCollectionCount } from "@/hooks/useCollectionLimit";
import { PockeTip } from "@/components/pocke/PockeTip";
import { PockeWelcomeBack } from "@/components/pocke/PockeWelcomeBack";


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
  const { data: itemCount } = useCollectionCount();

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
        {/* 上から「タイトル（検索・絞り込み）→ お知らせ1つ → 小さな入口の1行 → 持ってる/ほしい/予約中/手放した → グッズ」。
            以前は、ガイド・予約・推しの新着・コンプ・作品の札（3〜4行）・推しの部屋が縦に並び、
            グッズの一覧が上から約930px（最初の画面の外）まで押し下げられていた。どれも無くさず、小さくした */}
        <NoticeSlotProvider>
          <div className="max-w-5xl mx-auto space-y-3 animate-fade-in">
            <FilterSheet
              header={
                <h1 className="flex items-baseline gap-2 px-1">
                  <span className="text-xl font-bold">{t("collectionScreen.header.title")}</span>
                  {user && itemCount !== undefined && itemCount > 0 && (
                    <span className="text-sm font-normal tabular-nums text-muted-foreground">
                      {t("collectionScreen.header.count", { n: itemCount })}
                    </span>
                  )}
                </h1>
              }
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

            {/* お知らせ枠。大事な順に1つだけ出る（予約の到着 → 枠の残り → 重複 → はじめてガイド → 思い出 → ポッケのおすすめ） */}
            {user && <PreorderArrivalBanner />}
            {user && <SlotUsageMeter type="collection" minPercent={80} />}
            {user && <OnboardingChecklist />}
            {user && <PockeTip />}
            {/* ひさしぶりに開いたときのポッケのあいさつ（下から出るシート） */}
            {user && <PockeWelcomeBack />}

            <UserCollection
              layout="shelf"
              selectedTags={selectedTags}
              userId={user?.id || null}
              selectedContent={selectedContent}
              searchQuery={searchQuery}
              onContentChange={handleContentChange}
              selectedPersonalTag={selectedPersonalTag}
              onPersonalTagChange={handlePersonalTagChange}
              onPickFromCatalog={() => { setAddSheetView("pick"); setIsAddSheetOpen(true); }}
            />
          </div>
        </NoticeSlotProvider>
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