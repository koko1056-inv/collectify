
import { FeaturedCollections } from "@/components/home/FeaturedCollections";
import { PopularCollectors } from "@/components/profile/PopularCollectors";
import { Profile } from "@/types";

interface HomeContentProps {
  profile: Profile | undefined;
}

export function HomeContent({ profile }: HomeContentProps) {
  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      <FeaturedCollections />
      
      <div className="mt-6 sm:mt-8">
        <PopularCollectors />
      </div>
    </div>
  );
}
