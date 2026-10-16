"use client";

import HomeShell from "@/app/(home)/components/home-shell";
import { useInitialProjectsFromSearchParams } from "@/app/(home)/utils/search-params";

const PROJECTS_URL_DELIMITER = ",";

export default function Home() {
  const initialProjects = useInitialProjectsFromSearchParams(
    PROJECTS_URL_DELIMITER,
  );

  return <HomeShell initialProjects={initialProjects} />;
}
