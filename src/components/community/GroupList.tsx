import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

export function GroupList() {
  const { data: groups, isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select(`
          *,
          group_members: group_members(count),
          created_by_profile: profiles!groups_created_by_fkey(username)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-4 space-y-4 animate-pulse">
            <div className="w-full h-40 bg-gray-200 rounded" />
            <div className="h-6 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {groups?.map((group) => (
        <Card key={group.id} className="overflow-hidden">
          <div className="aspect-video relative">
            {group.image_url ? (
              <img
                src={group.image_url}
                alt={group.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <span className="text-gray-400">No image</span>
              </div>
            )}
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-lg">{group.name}</h3>
            {group.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {group.description}
              </p>
            )}
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {group.group_members?.[0]?.count || 0} メンバー
              </span>
              <Button size="sm" variant="outline" className="gap-2">
                <UserPlus className="h-4 w-4" />
                参加する
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}