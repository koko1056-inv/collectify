
import { FeaturedCollections } from "@/components/home/FeaturedCollections";
import { Profile } from "@/types";

interface HomeContentProps {
  profile: Profile | undefined;
}

export function HomeContent({ profile }: HomeContentProps) {
  return (
    <div className="space-y-6">
      <FeaturedCollections />
      {/* PopularCollectorsコンポーネントを削除 */}
    </div>
  );
}
