
import { FeaturedCollections } from "@/components/home/FeaturedCollections";
import { PopularCollectors } from "@/components/profile/PopularCollectors";
import { Profile } from "@/types";

interface HomeContentProps {
  profile: Profile | undefined;
}

export function HomeContent({ profile }: HomeContentProps) {
  return (
    <div className="space-y-6">
      <FeaturedCollections />
      
      <div className="mt-8">
        <PopularCollectors />
      </div>
    </div>
  );
}
