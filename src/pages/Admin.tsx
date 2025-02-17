import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { AdminItemForm } from "@/components/AdminItemForm";
import { AdminItemList } from "@/components/AdminItemList";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!profile?.is_admin) {
      navigate("/");
    }
  }, [profile, navigate]);

  if (!profile?.is_admin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-accent">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">管理者ページ</h1>
        <div className="grid gap-8">
          <AdminItemForm />
          <AdminItemList />
        </div>
      </main>
    </div>
  );
};

export default Admin;