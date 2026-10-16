import HomeShell from "@/app/(home)/components/home-shell";
import prefetchCompareStats from "@/lib/server/prefetchCompareStats";
import { formatProjectsList } from "@/lib/utils/projectsLabel";
import {
  projectsToComparePath,
  projectsToSlug,
  slugToProjects,
} from "@/lib/utils/slug";
import StructuredData from "@/components/seo/structured-data";
import { QUICK_COMPARISONS } from "@/lib/config/comparison-presets";
import type { Metadata } from "next";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { notFound } from "next/navigation";

const baseUrl = "https://www.package-pulse.com";

export const dynamicParams = true;

export const revalidate = 3600;

type ComparePageProps = {
  params: Promise<{ slug: string[] }>;
};

async function getProjectsFromParams(params: ComparePageProps["params"]) {
  const { slug } = await params;
  return slugToProjects(slug.join("/"));
}

export function generateStaticParams() {
  return QUICK_COMPARISONS.map((preset) => ({
    slug: projectsToSlug([...preset.projects]).split("/"),
  }));
}

export async function generateMetadata({
  params,
}: ComparePageProps): Promise<Metadata> {
  const projects = await getProjectsFromParams(params);

  if (projects.length === 0) {
    return {
      title: "Compare NPM Packages — npm download trends | Package Pulse",
      description:
        "Compare npm package download trends and statistics with interactive charts on Package Pulse.",
      alternates: { canonical: "/compare" },
    };
  }

  const projectsLabel = formatProjectsList(projects);
  const title = `${projectsLabel} — npm download trends | Package Pulse`;
  const description = `Compare npm download trends and statistics for ${projectsLabel}. Analyze download patterns, growth rates, and popularity with interactive charts on Package Pulse.`;
  const canonical = projectsToComparePath(projects);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: `${baseUrl}${canonical}`,
      type: "website",
      images: [
        {
          url: `${baseUrl}/images/share_image.png`,
          width: 800,
          height: 600,
          alt: `Package Pulse — ${projectsLabel}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${baseUrl}/images/share_image.png`],
    },
  };
}

export default async function ComparePage({ params }: ComparePageProps) {
  const projects = await getProjectsFromParams(params);

  if (projects.length === 0) notFound();

  const projectsLabel = formatProjectsList(projects);
  const queryClient = new QueryClient();
  await prefetchCompareStats(queryClient, projects);

  return (
    <>
      <StructuredData
        type="softwareApplication"
        name={`${projectsLabel} — npm download comparison`}
        description={`Compare npm download trends and statistics for ${projectsLabel} with interactive charts on Package Pulse.`}
        url={`${baseUrl}${projectsToComparePath(projects)}`}
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <HomeShell
          initialProjects={projects}
          persistSelection={false}
          selectionHeading
        />
      </HydrationBoundary>
    </>
  );
}
