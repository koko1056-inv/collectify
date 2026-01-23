import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { AdminItemForm } from "@/components/AdminItemForm";
import { AdminItemList } from "@/components/AdminItemList";
import { TagCandidatesManager } from "@/components/admin/TagCandidatesManager";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // user_rolesテーブルでadminロールを確認（has_role関数を使用）
  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ["admin-role", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('has_role', { _user_id: user!.id, _role: 'admin' });

      if (error) throw error;
      return data === true;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-accent flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-accent">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
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
    </div>
  );
};

export default Admin;