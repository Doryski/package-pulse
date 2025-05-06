"use server";
import { fetchPackageInfo } from "@/api/fetchPackageInfo";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod.mjs";
import { ResponseInput } from "openai/resources/responses/responses.mjs";
import { z } from "zod";

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
    content:
      "Return only the names of valid NPM packages, without any other text.",
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
  const openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await openaiClient.responses.create({
    model: "gpt-4.1-mini",
    input: createPrompt(selectedProjects),
    text: {
      format: zodTextFormat(SimilarProjectsSchema, "similar_projects"),
    },
  });

  return SimilarProjectsSchema.parse(
    JSON.parse(response.output_text),
  ).similarProjects.map((project) => project.trim().toLowerCase());
}

export async function validatePackageExistence(packageName: string) {
  try {
    await fetchPackageInfo(packageName);
    return true;
  } catch {
    return false;
  }
}
