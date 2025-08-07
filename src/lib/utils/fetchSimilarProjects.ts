"use server";
import { fetchPackageInfo, PackageInfo } from "@/api/fetchPackageInfo";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod.mjs";
import { ResponseInput } from "openai/resources/responses/responses.mjs";
import { z } from "zod";
import safeParse from "./safeParse";
import trim from "./trim";

const createPrompt = (
  packagesInfo: Pick<PackageInfo, "projectName" | "keywords" | "description">[],
): ResponseInput => [
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

  try {
    const openaiClient = new OpenAI();

    const response = await openaiClient.responses.create(
      {
        model: "gpt-5-nano",
        input: createPrompt(packagesInfo),
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
    return [];
  }
}

export async function validatePackageExistence(packageName: string) {
  try {
    await fetchPackageInfo(packageName);
    return true;
  } catch {
    return false;
  }
}
