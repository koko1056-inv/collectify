import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AdminItemForm } from "@/components/AdminItemForm";
import { AdminItemList } from "@/components/AdminItemList";
import { TagCandidatesManager } from "@/components/admin/TagCandidatesManager";
import { DuplicateItemsManager } from "@/components/admin/DuplicateItemsManager";
import { ReportsManager } from "@/components/admin/ReportsManager";
import { FeedbackManager } from "@/components/admin/FeedbackManager";
import { SeriesBackfillManager } from "@/components/admin/SeriesBackfillManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSearchParams } from "react-router-dom";
import { useOpenReportCount } from "@/hooks/useOpenReportCount";

// 管理者判定とリダイレクトは ProtectedRoute（requiredRole="admin"）が担当する。
// ここで再度判定すると遷移が二重になり、ブラウザバックで往復してしまうため行わない。
const Admin = () => {
  const { t } = useLanguage();
  // 通知から /admin?tab=reports で開けるようにする
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") ?? "items";
  const { data: openReports = 0 } = useOpenReportCount();
  return (
    <div className="min-h-screen bg-accent">
      <Navbar />
      <main className="container mx-auto px-4 py-8 pb-24 sm:pb-8">
        <h1 className="text-3xl font-bold mb-8">{t("screens.admin.title")}</h1>

        <Tabs value={tab} onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })} className="space-y-6">
          <TabsList>
            <TabsTrigger value="items">{t("screens.admin.itemsTab")}</TabsTrigger>
            <TabsTrigger value="tags">{t("screens.admin.tagsTab")}</TabsTrigger>
            <TabsTrigger value="duplicates">{t("screens.admin.duplicatesTab")}</TabsTrigger>
            <TabsTrigger value="series">{t("screens.admin.seriesTab")}</TabsTrigger>
            <TabsTrigger value="reports" className="gap-1.5">
              {t("screens.admin.reportsTab")}
              {openReports > 0 && (
                <span
                  className="min-w-5 rounded-full bg-destructive px-1.5 text-center text-2xs font-bold leading-5 text-destructive-foreground"
                  aria-label={t("admin.reports.pendingTitle")}
                >
                  {openReports}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="feedback">{t("screens.admin.feedbackTab")}</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="space-y-8">
            <AdminItemForm />
            <AdminItemList />
          </TabsContent>

          <TabsContent value="tags">
            <TagCandidatesManager />
          </TabsContent>

          <TabsContent value="duplicates">
            <DuplicateItemsManager />
          </TabsContent>

          <TabsContent value="series">
            <SeriesBackfillManager />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsManager />
          </TabsContent>

          <TabsContent value="feedback">
            <FeedbackManager />
          </TabsContent>
        </Tabs>
      </main>
      {/* モバイルでは Navbar にナビリンクが無いため、Footer が唯一の脱出手段になる */}
      <Footer />
    </div>
  );
};

export default Admin;
