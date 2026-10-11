import { useState } from "react";
import { ArrowLeft, ArrowUpDown, Camera, Flame, Star } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { IconTile } from "@/components/ui/icon-tile";
import { CompanionCard } from "@/components/oshi/CompanionCard";
import { PhotoCalendar } from "@/components/oshi/PhotoCalendar";
import { TodayPhotoDialog } from "@/components/oshi/TodayPhotoDialog";
import { OshiGoodsEditModal } from "@/components/profile/OshiGoodsEditModal";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompanions, useOshiPhotos, type Companion } from "@/hooks/useOshi";
import { MAX_OSHI_GOODS } from "@/utils/companion";

/**
 * 推しフォト（1日1枚の記録）と、推しグッズ（最大5つ・順位の順に育てる）。
 * 以前はここで「相棒」（最大3つ）を1つずつ迎えて・はずしていた。推しグッズにまとめたので、
 * 選ぶ・並べ替えるはプロフィールと同じ画面（OshiGoodsEditModal）に1つにした
 */
const Oshi = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const companions = useCompanions();
  const photos = useOshiPhotos();
  const [tab, setTab] = useState("companion");
  const [editorOpen, setEditorOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoItem, setPhotoItem] = useState<string | null>(null);

  const list = companions.data ?? [];

  const openPhoto = (c?: Companion) => {
    setPhotoItem(c?.user_item_id ?? null);
    setPhotoOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-lg px-4 py-5 pb-nav">
        {/* 戻るボタンは見出しの横に置く（見出しの上の小さな「戻る」では気づかれなかった） */}
        <header className="mb-4 flex items-start gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2 mt-0.5 h-10 w-10 shrink-0 rounded-full"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/collection"))}
            aria-label={t("chrome.common.back")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">{t("engage.oshi.pageTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("engage.oshi.pageSub")}</p>
          </div>
        </header>

        {/* 今日の1枚 */}
        <section className="mb-4 flex items-center gap-3 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-background p-4">
          {/* 炎の面は今日のチェックと同じ IconTile（以前は orange→rose のグラデーション） */}
          <IconTile tone={photos.streak > 0 ? "warning" : "muted"} size="md">
            <Flame />
          </IconTile>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{photos.streak > 0 ? t("engage.oshi.streak", { n: photos.streak }) : t("engage.oshi.streakNone")}</p>
            <p className="text-xs text-muted-foreground">
              {photos.todayDone ? t("engage.oshi.todayDone") : t("engage.oshi.todayNotYet")}
              <span className="ml-2 tabular-nums">{t("engage.oshi.total", { n: photos.total })}</span>
            </p>
          </div>
          <Button size="sm" className="gap-1.5 rounded-xl" onClick={() => openPhoto()}>
            <Camera className="h-4 w-4" />
            {t("engage.oshi.shoot")}
          </Button>
        </section>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="companion" className="flex-1">
              {t("engage.oshi.tabCompanion")}
            </TabsTrigger>
            <TabsTrigger value="photo" className="flex-1">
              {t("engage.oshi.tabPhoto")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="companion" className="space-y-3">
            {companions.isLoading ? (
              <Skeleton className="h-52 w-full rounded-2xl" />
            ) : list.length === 0 ? (
              <EmptyState
                icon={Star}
                title={t("engage.oshi.emptyCompanionTitle")}
                description={t("engage.oshi.emptyCompanionDesc", { max: MAX_OSHI_GOODS })}
                action={
                  <Button className="gap-1.5 rounded-xl" onClick={() => setEditorOpen(true)}>
                    <Star className="h-4 w-4" />
                    {t("engage.oshi.chooseOshiGoods")}
                  </Button>
                }
                className="py-8"
              />
            ) : (
              <>
                {list.map((c) => (
                  <CompanionCard key={c.user_item_id} companion={c} onPhoto={openPhoto} />
                ))}
                {/* 選ぶ・並べ替えるはプロフィールと同じ画面。外してもなかよし度は残る（また選べば戻る） */}
                <Button variant="outline" className="w-full gap-1.5 rounded-2xl" onClick={() => setEditorOpen(true)}>
                  <ArrowUpDown className="h-4 w-4" />
                  {t("engage.oshi.editOshiGoods")}
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {t("engage.oshi.companions", { n: list.length, max: MAX_OSHI_GOODS })}
                  </span>
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="photo">
            {photos.isLoading ? (
              <Skeleton className="h-72 w-full rounded-2xl" />
            ) : (
              <>
                <PhotoCalendar photos={photos.photos} />
                {photos.total === 0 && <p className="mt-4 text-center text-sm text-muted-foreground">{t("engage.oshi.calendarEmpty")}</p>}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {user && <OshiGoodsEditModal open={editorOpen} onOpenChange={setEditorOpen} userId={user.id} />}
      <TodayPhotoDialog open={photoOpen} onOpenChange={setPhotoOpen} initialItemId={photoItem} />
      <Footer />
    </div>
  );
};

export default Oshi;
