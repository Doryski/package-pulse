"use client";

import ProjectsForm from "@/app/(home)/components/projects-form";
import { useSentrySearchParams } from "@/lib/hooks/useSentrySearchParams";

export default function Home() {
  useSentrySearchParams();

  return <ProjectsForm />;
}
