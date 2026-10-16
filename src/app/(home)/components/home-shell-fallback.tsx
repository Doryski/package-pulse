import { Skeleton } from "@/components/ui/skeleton";
import HomeHero from "./home-hero";
import HomeSections from "./home-sections";
import { QuickComparisonLinks } from "./quick-comparisons";
import SearchTip from "./search-tip";

const SearchSkeleton = () => (
  <div className="flex flex-col gap-4">
    <div className="flex w-full flex-col items-start gap-2">
      <div aria-busy="true" className="w-full">
        <Skeleton aria-hidden="true" className="h-9 w-full" />
      </div>
      <SearchTip />
    </div>
  </div>
);

const HomeShellFallback = () => (
  <div className="mt-8 space-y-20">
    <HomeHero />
    <div className="flex h-full flex-col justify-center py-4">
      <SearchSkeleton />
      <QuickComparisonLinks />
    </div>
    <HomeSections />
  </div>
);

export default HomeShellFallback;
