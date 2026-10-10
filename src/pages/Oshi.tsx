import { useState } from "react";
import { Camera, Flame, Plus, Sprout } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { CompanionCard } from "@/components/oshi/CompanionCard";
import { CompanionPicker } from "@/components/oshi/CompanionPicker";
import { PhotoCalendar } from "@/components/oshi/PhotoCalendar";
import { TodayPhotoDialog } from "@/components/oshi/TodayPhotoDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompanions, useOshiPhotos, useRemoveCompanion, type Companion } from "@/hooks/useOshi";
import { MAX_COMPANIONS } from "@/utils/companion";

/** 推しフォト（1日1枚の記録）と、相棒グッズ（育てる） */
const Oshi = () => {
  const { t } = useLanguage();
  const companions = useCompanions();
  const photos = useOshiPhotos();
  const remove = useRemoveCompanion();
  const [tab, setTab] = useState("companion");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoItem, setPhotoItem] = useState<string | null>(null);

  const list = companions.data ?? [];

  const openPhoto = (c?: Companion) => {
    setPhotoItem(c?.user_item_id ?? null);
    setPhotoOpen(true);
  };

  const handleRemove = async (c: Companion) => {
    if (!window.confirm(t("engage.oshi.removeConfirm", { name: c.title }))) return;
    try {
      await remove.mutateAsync(c.user_item_id);
    } catch (e) {
      console.error("remove companion failed:", e);
      toast.error(t("engage.oshi.careFailed"));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-lg px-4 py-5 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pb-10">
        <header className="mb-4">
          <h1 className="text-2xl font-bold">{t("engage.oshi.pageTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("engage.oshi.pageSub")}</p>
        </header>

        {/* 今日の1枚 */}
        <section className="mb-4 flex items-center gap-3 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-background p-4">
          <div
            className={
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl " +
              (photos.streak > 0 ? "bg-gradient-to-br from-orange-400 to-rose-500 text-white" : "bg-muted text-muted-foreground")
            }
            aria-hidden="true"
          >
            <Flame className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{photos.streak > 0 ? t("engage.oshi.streak", { n: photos.streak }) : t("engage.oshi.streakNone")}</p>
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
                icon={Sprout}
                title={t("engage.oshi.emptyCompanionTitle")}
                description={t("engage.oshi.emptyCompanionDesc")}
                className="py-8"
              />
            ) : (
              list.map((c) => <CompanionCard key={c.user_item_id} companion={c} onPhoto={openPhoto} onRemove={handleRemove} />)
            )}
            {list.length < MAX_COMPANIONS && (
              <Button variant="outline" className="w-full gap-1.5 rounded-2xl" onClick={() => setPickerOpen(true)}>
                <Plus className="h-4 w-4" />
                {t("engage.oshi.addCompanion")}
                <span className="text-xs tabular-nums text-muted-foreground">
                  {t("engage.oshi.companions", { n: list.length, max: MAX_COMPANIONS })}
                </span>
              </Button>
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

      <CompanionPicker open={pickerOpen} onOpenChange={setPickerOpen} excludeIds={list.map((c) => c.user_item_id)} />
      <TodayPhotoDialog open={photoOpen} onOpenChange={setPhotoOpen} initialItemId={photoItem} />
    </div>
  );
};

export default Oshi;
