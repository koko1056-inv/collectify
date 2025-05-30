
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CreatePostModal } from "./CreatePostModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";

interface CreatePostFromCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreatePostFromCollectionModal({
  isOpen,
  onClose,
}: CreatePostFromCollectionModalProps) {
  const { user } = useAuth();
  const [selectedItem, setSelectedItem] = useState<{
    id: string;
    title: string;
    image: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: userItems, isLoading } = useQuery({
    queryKey: ["user-items", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("user_items")
        .select("id, title, image, content_name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && isOpen,
  });

  // 検索クエリに基づいてアイテムをフィルタリング
  const filteredItems = userItems?.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.content_name && item.content_name.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  const handleItemSelect = (item: { id: string; title: string; image: string }) => {
    setSelectedItem(item);
  };

  const handleClosePostModal = () => {
    setSelectedItem(null);
    setSearchQuery("");
    onClose();
  };

  if (selectedItem) {
    return (
      <CreatePostModal
        isOpen={true}
        onClose={handleClosePostModal}
        userItemId={selectedItem.id}
        userItemTitle={selectedItem.title}
        userItemImage={selectedItem.image}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[70vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>投稿するグッズを選択</DialogTitle>
        </DialogHeader>
        
        {/* 検索バー */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="グッズ名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <Skeleton className="w-16 h-16 rounded" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {filteredItems.map((item) => (
                <Button
                  key={item.id}
                  variant="outline"
                  onClick={() => handleItemSelect(item)}
                  className="flex items-center justify-start p-3 h-auto"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-16 h-16 object-cover rounded mr-3"
                  />
                  <div className="text-left">
                    <div className="font-medium">{item.title}</div>
                    {item.content_name && (
                      <div className="text-sm text-gray-500">{item.content_name}</div>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          ) : searchQuery ? (
            <div className="text-center py-12">
              <p className="text-gray-500">「{searchQuery}」に一致するグッズが見つかりません</p>
              <p className="text-sm text-gray-400 mt-2">
                別のキーワードで検索してみてください
              </p>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">投稿できるグッズがありません</p>
              <p className="text-sm text-gray-400 mt-2">
                まずはコレクションにグッズを追加してください
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
