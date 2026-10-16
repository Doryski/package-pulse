import HomeHero from "@/app/(home)/components/home-hero";
import HomeIsland from "@/app/(home)/components/home-island";
import HomeSections from "@/app/(home)/components/home-sections";
import HomeShellFallback from "@/app/(home)/components/home-shell-fallback";
import { Suspense } from "react";

export default function Home() {
  return (
    <Suspense fallback={<HomeShellFallback />}>
      <HomeIsland hero={<HomeHero />} sections={<HomeSections />} />
    </Suspense>
  );
}
