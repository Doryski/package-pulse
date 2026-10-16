import { Skeleton } from "@/components/ui/skeleton";

const ChartSkeleton = () => (
  <div
    aria-busy="true"
    data-testid="main-chart-skeleton"
    className="mt-4 size-full md:mt-8 lg:mt-16"
  >
    <Skeleton
      aria-hidden="true"
      className="aspect-square max-h-[450px] w-full sm:aspect-video"
    />
  </div>
);

export default ChartSkeleton;
