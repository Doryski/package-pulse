"use client";

import { MULTI_SEARCH_DELIMITER } from "@/lib/config/constants";
import useRestoredProjects from "@/lib/hooks/useRestoredProjects";
import { useSearchParams } from "next/navigation";
import { ReactNode, useState } from "react";
import { useInitialProjectsFromSearchParams } from "../utils/search-params";
import HomeShell from "./home-shell";

type HomeIslandProps = {
  hero?: ReactNode;
  sections?: ReactNode;
};

type SelectionSources = {
  hasProjectsParam: boolean;
  urlProjects: string[];
  restoredProjects: string[] | null;
};

const resolveSelection = ({
  hasProjectsParam,
  urlProjects,
  restoredProjects,
}: SelectionSources) => {
  if (hasProjectsParam)
    return { key: "url", projects: urlProjects, isResolved: true };
  if (restoredProjects === null)
    return { key: "url", projects: urlProjects, isResolved: false };
  if (restoredProjects.length === 0)
    return { key: "url", projects: urlProjects, isResolved: true };
  return { key: "restored", projects: restoredProjects, isResolved: true };
};

export default function HomeIsland({ hero, sections }: HomeIslandProps) {
  const searchParams = useSearchParams();
  const urlProjects = useInitialProjectsFromSearchParams(
    MULTI_SEARCH_DELIMITER,
  );
  const [urlSelection] = useState(() => ({
    hasProjectsParam: searchParams.has("projects"),
    urlProjects,
  }));
  const restoredProjects = useRestoredProjects();
  const selection = resolveSelection({ ...urlSelection, restoredProjects });

  return (
    <HomeShell
      key={selection.key}
      initialProjects={selection.projects}
      persistSelection={selection.isResolved}
      hero={hero}
      sections={sections}
    />
  );
}
