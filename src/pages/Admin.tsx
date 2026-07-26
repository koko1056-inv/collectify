import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AdminItemForm } from "@/components/AdminItemForm";
import { AdminItemList } from "@/components/AdminItemList";
import { TagCandidatesManager } from "@/components/admin/TagCandidatesManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// 管理者判定とリダイレクトは ProtectedRoute（requiredRole="admin"）が担当する。
// ここで再度判定すると遷移が二重になり、ブラウザバックで往復してしまうため行わない。
const Admin = () => {
  return (
    <div className="min-h-screen bg-accent">
      <Navbar />
      <main className="container mx-auto px-4 py-8 pb-24 sm:pb-8">
        <h1 className="text-3xl font-bold mb-8">管理者ページ</h1>

        <Tabs defaultValue="items" className="space-y-6">
          <TabsList>
            <TabsTrigger value="items">アイテム管理</TabsTrigger>
            <TabsTrigger value="tags">タグ候補管理</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="space-y-8">
            <AdminItemForm />
            <AdminItemList />
          </TabsContent>

          <TabsContent value="tags">
            <TagCandidatesManager />
          </TabsContent>
        </Tabs>
      </main>
      {/* モバイルでは Navbar にナビリンクが無いため、Footer が唯一の脱出手段になる */}
      <Footer />
    </div>
  );
};

export default Admin;
