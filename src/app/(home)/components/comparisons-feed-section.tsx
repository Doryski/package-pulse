import { PropsWithChildren } from "react";
import { ComparisonCardSkeleton } from "./comparison-card";

const FEED_SKELETON_COUNT = 6;
const FEED_GRID_CLASS_NAME = "grid gap-4 md:grid-cols-2 lg:grid-cols-3";

type ComparisonsFeedSectionProps = PropsWithChildren<{
  title: string;
}>;

const ComparisonsFeedSection = ({
  title,
  children,
}: ComparisonsFeedSectionProps) => (
  <section className="mt-6">
    <h2 className="mb-4 text-lg font-semibold">{title}</h2>
    <div className={FEED_GRID_CLASS_NAME}>{children}</div>
  </section>
);

type ComparisonsFeedSkeletonProps = {
  title: string;
  projectCount: number;
};

export const ComparisonsFeedSkeleton = ({
  title,
  projectCount,
}: ComparisonsFeedSkeletonProps) => (
  <section aria-busy="true" className="mt-6">
    <h2 className="mb-4 text-lg font-semibold">{title}</h2>
    <div aria-hidden="true" className={FEED_GRID_CLASS_NAME}>
      {Array.from({ length: FEED_SKELETON_COUNT }, (_, index) => (
        <ComparisonCardSkeleton key={index} projectCount={projectCount} />
      ))}
    </div>
  </section>
);

export default ComparisonsFeedSection;
