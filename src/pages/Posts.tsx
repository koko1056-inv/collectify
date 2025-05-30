
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PostsGrid } from "@/components/posts/PostsGrid";
import { Footer } from "@/components/Footer";
import { CreatePostFromCollectionModal } from "@/components/posts/CreatePostFromCollectionModal";

export default function Posts() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー部分 */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">みんなの投稿</h1>
            <Button 
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              投稿を作成
            </Button>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="container mx-auto px-4 py-6 pb-20">
        <div className="max-w-2xl mx-auto">
          <PostsGrid />
        </div>
      </div>

      {/* フッター */}
      <Footer />

      {/* 投稿作成モーダル */}
      <CreatePostFromCollectionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
