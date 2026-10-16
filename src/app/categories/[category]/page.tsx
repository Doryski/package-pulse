import {
  projectsToComparePath,
  projectsToSlug,
  slugifyTitle,
  slugToProjects,
} from "@/lib/utils/slug";
import { QUICK_COMPARISONS } from "@/lib/config/comparison-presets";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamicParams = false;

const baseUrl = "https://www.package-pulse.com";

type CategoryPageProps = {
  params: Promise<{ category: string }>;
};

function findPresetByCategory(category: string) {
  return QUICK_COMPARISONS.find(
    (preset) => slugifyTitle(preset.title) === category,
  );
}

export function generateStaticParams() {
  return QUICK_COMPARISONS.map((preset) => ({
    category: slugifyTitle(preset.title),
  }));
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const preset = findPresetByCategory(category);

  if (!preset) {
    return {
      title: "Compare npm packages | Package Pulse",
      description:
        "Browse npm package categories and compare download trends on Package Pulse.",
    };
  }

  const title = `${preset.title} — compare npm packages | Package Pulse`;
  const description = `Compare npm download trends for ${preset.projects.join(", ")}. Explore ${preset.title.toLowerCase()} package popularity with interactive charts on Package Pulse.`;
  const canonical = `/categories/${category}`;

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
          alt: `Package Pulse — ${preset.title}`,
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

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const preset = findPresetByCategory(category);

  if (!preset) notFound();

  const projects = [...preset.projects];
  const compareSlug = projectsToSlug(projects);
  const roundTripped = slugToProjects(compareSlug);

  return (
    <section className="mx-auto mt-8 max-w-4xl space-y-8">
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-bold">
          {preset.title} — npm package comparison
        </h1>
        <p className="mx-auto max-w-2xl text-base text-muted-foreground">
          Compare download trends and statistics for popular{" "}
          {preset.title.toLowerCase()} packages on npm.
        </p>
      </div>

      <div className="rounded-lg border p-6">
        <h2 className="mb-4 text-2xl font-semibold">
          Packages in this category
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {roundTripped.map((project) => (
            <li key={project} className="text-muted-foreground">
              {project}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-4">
        <Link
          href={projectsToComparePath(projects)}
          className="inline-flex items-center rounded-md bg-primary px-6 py-3 font-semibold text-primary-foreground"
        >
          Compare {preset.title} downloads
        </Link>
        <Link
          href="/"
          className="inline-flex items-center rounded-md border px-6 py-3 font-semibold"
        >
          Back to home
        </Link>
      </div>
    </section>
  );
}
