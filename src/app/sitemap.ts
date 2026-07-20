import { projectsToSlug } from "@/lib/utils/slug";
import { QUICK_COMPARISONS } from "@/lib/config/comparison-presets";
import type { MetadataRoute } from "next";

function slugifyTitle(title: string): string {
  return title.toLowerCase().replace(/&/g, "").trim().replace(/\s+/g, "-");
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.package-pulse.com";
  const lastModified = new Date();

  const comparePages: MetadataRoute.Sitemap = QUICK_COMPARISONS.map(
    (preset) => ({
      url: `${baseUrl}/compare/${projectsToSlug([...preset.projects])}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    }),
  );

  const categoryPages: MetadataRoute.Sitemap = QUICK_COMPARISONS.map(
    (preset) => ({
      url: `${baseUrl}/categories/${slugifyTitle(preset.title)}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    }),
  );

  return [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    ...comparePages,
    ...categoryPages,
  ];
}
