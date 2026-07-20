"use server";
import { fetchPackageInfo, PackageInfo } from "@/api/fetchPackageInfo";
import { SELECTED_PROJECTS_LIMIT } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { headers } from "next/headers";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod.mjs";
import { ResponseInput } from "openai/resources/responses/responses.mjs";
import { z } from "zod";
import getClientIp from "./getClientIp";
import isRateLimited from "./rateLimit";
import safeParse from "./safeParse";
import trim from "./trim";

const MAX_PROJECT_NAME_LENGTH = 214;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_KEYWORDS = 100;
const MAX_KEYWORD_LENGTH = 100;

const PackagesInfoInputSchema = z
  .array(
    z.object({
      projectName: z.string().max(MAX_PROJECT_NAME_LENGTH),
      keywords: z
        .array(z.string().transform((s) => s.slice(0, MAX_KEYWORD_LENGTH)))
        .transform((arr) => arr.slice(0, MAX_KEYWORDS))
        .optional()
        .nullable(),
      description: z
        .string()
        .transform((s) => s.slice(0, MAX_DESCRIPTION_LENGTH))
        .optional()
        .nullable(),
    }),
  )
  .max(SELECTED_PROJECTS_LIMIT);

type SanitizedPackageInfo = z.infer<typeof PackagesInfoInputSchema>[number];

const getClientKey = (): string => `similar-projects:${getClientIp(headers())}`;

const createPrompt = (packagesInfo: SanitizedPackageInfo[]): ResponseInput => [
  {
    role: "system",
    content:
      "You are a helpful assistant that finds similar NPM packages to the ones provided by the user.",
  },
  {
    role: "developer",
    content: trim`
    Return the names of maximum 5 valid NPM packages, without any other text. \\
    Focus on the packages that have the most similar purpose e.g. frontend framework, state management, validation, etc. \\
    <example>
      <input>
      [
        {
          projectName: "react",
          keywords: ["frontend", "framework"],
          description: "React is a JavaScript library for building user interfaces.",
        },
      ]
      </input>
      <output>
      {
        similarProjects: [vue, @angular/core, solid-js]
      }
      </output>
    </example>
    `,
  },
  {
    role: "user",
    content: JSON.stringify(
      packagesInfo.map((info) => ({
        projectName: info.projectName,
        keywords: info.keywords,
        description: info.description,
      })),
    ),
  },
];

const SimilarProjectsSchema = z.object({
  similarProjects: z
    .array(z.string())
    .describe("The similar NPM packages to the ones provided by the user"),
});

export async function fetchSimilarProjects(
  packagesInfo: Pick<PackageInfo, "projectName" | "keywords" | "description">[],
): Promise<string[]> {
  if (!packagesInfo.length) {
    return [];
  }

  const parsedInput = PackagesInfoInputSchema.safeParse(packagesInfo);
  if (!parsedInput.success) {
    return [];
  }

  const sanitizedInput = parsedInput.data;

  if (isRateLimited(getClientKey())) {
    return [];
  }

  try {
    const openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    const response = await openaiClient.responses.create(
      {
        model: "gpt-4.1-nano",
        input: createPrompt(sanitizedInput),
        text: {
          format: zodTextFormat(SimilarProjectsSchema, "similar_projects"),
        },
      },
      { timeout: 10000 },
    );

    const parsedResponse = safeParse(
      JSON.parse(response.output_text),
      SimilarProjectsSchema,
    );

    const similarProjects = parsedResponse.similarProjects
      .map((project) => project.trim().toLowerCase())
      .filter(
        (project) =>
          !!project &&
          project.length > 0 &&
          !packagesInfo.find((info) => info.projectName === project),
      );

    const validatedProjects = await Promise.all(
      similarProjects.map(async (project) => {
        const exists = await validatePackageExistence(project);
        return exists ? project : null;
      }),
    );
    return validatedProjects.filter((v) => v != null);
  } catch (error) {
    console.error("Error fetching similar projects:", error);
    throw error;
  }
}

async function validatePackageExistence(packageName: string) {
  try {
    await fetchPackageInfo(packageName);
    return true;
  } catch {
    return false;
  }
}
