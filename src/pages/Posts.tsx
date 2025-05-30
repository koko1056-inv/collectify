
import { PostsGrid } from "@/components/posts/PostsGrid";

export default function Posts() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">みんなの投稿</h1>
        <PostsGrid />
      </div>
    </div>
  );
}
