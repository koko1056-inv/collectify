import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export function UserCollection() {
  const { user } = useAuth();

  const { data: items } = useQuery({
    queryKey: ["user-items", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_items")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>マイコレクション</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items?.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm"
            >
              <div className="aspect-square relative">
                <img
                  src={item.image}
                  alt={item.title}
                  className="object-cover w-full h-full"
                />
              </div>
              <div className="p-4">
                <h3 className="font-medium">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.prize}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}