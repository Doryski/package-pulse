"use server";
import { fetchPackageInfo } from "@/api/fetchPackageInfo";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod.mjs";
import { ResponseInput } from "openai/resources/responses/responses.mjs";
import { z } from "zod";
import safeParse from "./safeParse";
import trim from "./trim";

export type SimilarProject = {
  name: string;
  similarityScore: number;
  matchedKeywords?: string[];
};

const createPrompt = (selectedProjects: string[]): ResponseInput => [
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
      <example>
        <input>react</input>
        <output>
        {
          similarProjects: [vue, @angular/core, solid-js]
        }
        </output>
      </example>
    </examples>
    `,
  },
  {
    role: "user",
    content: selectedProjects.join(", "),
  },
];

const SimilarProjectsSchema = z.object({
  similarProjects: z
    .array(z.string())
    .describe("The similar NPM packages to the ones provided by the user"),
});

export async function fetchSimilarProjects(
  selectedProjects: string[],
): Promise<string[]> {
  const openaiClient = new OpenAI();

  const response = await openaiClient.responses.create(
    {
      model: "gpt-4.1-mini",
      input: createPrompt(selectedProjects),
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
    .filter((project) => !!project && !selectedProjects.includes(project));

  return similarProjects;
}

export async function validatePackageExistence(packageName: string) {
  try {
    await fetchPackageInfo(packageName);
    return true;
  } catch {
    return false;
  }
}
