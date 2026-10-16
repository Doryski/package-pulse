"use client";

import dynamic from "next/dynamic";

const LazyToaster = dynamic(
  () => import("@/components/ui/sonner").then((mod) => mod.Toaster),
  { ssr: false },
);

export default LazyToaster;
