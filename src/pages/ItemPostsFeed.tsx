import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ItemPostsFeedPanel } from "@/components/item-posts/ItemPostsFeedPanel";

/** 投稿フィードの単独ページ（/item-posts, /post/:postId）。中身は探索の「投稿」タブと共通。 */
export default function ItemPostsFeed() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />
      <main className="container mx-auto px-4 pt-4">
        <div className="max-w-4xl mx-auto">
          <ItemPostsFeedPanel />
        </div>
      </main>
      <Footer />
    </div>
  );
}
