import { Loader2, Frame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  userId?: string;
  enabled: boolean;
}

export function GalleryListView({ userId, enabled }: Props) {
  const queryClient = useQueryClient();

  const { data: displayGallery = [], isLoading } = useQuery({
    queryKey: ["display-gallery-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("display_gallery")
        .select(
          `*, profiles:user_id (username, display_name, avatar_url)`
        )
        .eq("is_public", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4 pr-2">
      <h3 className="text-lg font-semibold">みんなの展示場ギャラリー</h3>
      {displayGallery.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          <Frame className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>保存された展示はまだありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayGallery.map((gallery: any) => (
            <div
              key={gallery.id}
              className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              <img
                src={gallery.image_url}
                alt={gallery.title || "Gallery"}
                className="w-full h-64 object-cover cursor-pointer"
                onClick={() => window.open(gallery.image_url, "_blank")}
              />
              <div className="p-4 space-y-2">
                <h4 className="font-semibold text-base line-clamp-1">
                  {gallery.title}
                </h4>
                {gallery.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {gallery.description}
                  </p>
                )}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {gallery.profiles && (
                      <>
                        {gallery.profiles.avatar_url && (
                          <img
                            src={gallery.profiles.avatar_url}
                            alt={
                              gallery.profiles.display_name ||
                              gallery.profiles.username
                            }
                            className="w-5 h-5 rounded-full"
                          />
                        )}
                        <span>
                          {gallery.profiles.display_name ||
                            gallery.profiles.username}
                        </span>
                      </>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(gallery.created_at).toLocaleDateString("ja-JP")}
                  </span>
                </div>
                {gallery.user_id === userId && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="w-full mt-2"
                    onClick={async () => {
                      const { error } = await supabase
                        .from("display_gallery")
                        .delete()
                        .eq("id", gallery.id);
                      if (!error) {
                        queryClient.invalidateQueries({
                          queryKey: ["display-gallery-all"],
                        });
                        toast.success("削除しました");
                      }
                    }}
                  >
                    削除
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
