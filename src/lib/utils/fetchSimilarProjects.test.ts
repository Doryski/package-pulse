/**
 * @vitest-environment node
 */
import { SELECTED_PROJECTS_LIMIT } from "@/lib/config/constants";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { fetchSimilarProjects } from "./fetchSimilarProjects";

const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_KEYWORDS = 100;
const RATE_LIMIT_MAX_REQUESTS = 10;

const { openaiCreate, fetchPackageInfoMock, headersState } = vi.hoisted(() => ({
  openaiCreate: vi.fn(),
  fetchPackageInfoMock: vi.fn(),
  headersState: { ip: "127.0.0.1" },
}));

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    responses: { create: openaiCreate },
  })),
}));

vi.mock("openai/helpers/zod.mjs", () => ({
  zodTextFormat: () => ({}),
}));

vi.mock("next/headers", () => ({
  headers: () => ({
    get: (name: string) => (name === "x-real-ip" ? headersState.ip : null),
  }),
}));

vi.mock("@/api/fetchPackageInfo", () => ({
  fetchPackageInfo: fetchPackageInfoMock,
}));

const respondWith = (similarProjects: string[]) => ({
  output_text: JSON.stringify({ similarProjects }),
});

const getUserPromptInput = (callIndex: number) => {
  const request = openaiCreate.mock.calls[callIndex]![0];
  const userMessage = request.input.find(
    (message: { role: string }) => message.role === "user",
  );
  return JSON.parse(userMessage.content) as {
    projectName: string;
    keywords?: string[] | null;
    description?: string | null;
  }[];
};

let ipCounter = 0;

beforeEach(() => {
  vi.clearAllMocks();
  headersState.ip = `10.0.0.${(ipCounter += 1)}`;
  fetchPackageInfoMock.mockResolvedValue({ projectName: "exists" });
  openaiCreate.mockResolvedValue(respondWith(["vue"]));
});

describe("fetchSimilarProjects", () => {
  test("parses valid input and returns the model's validated suggestions", async () => {
    openaiCreate.mockResolvedValue(respondWith(["Vue", "solid-js"]));

    const result = await fetchSimilarProjects([
      {
        projectName: "react",
        keywords: ["frontend", "framework"],
        description: "A JavaScript library for building user interfaces.",
      },
    ]);

    expect(result).toEqual(["vue", "solid-js"]);
    expect(openaiCreate).toHaveBeenCalledTimes(1);
  });

  test("rejects input exceeding SELECTED_PROJECTS_LIMIT without calling OpenAI", async () => {
    const oversizedInput = Array.from(
      { length: SELECTED_PROJECTS_LIMIT + 1 },
      (_, index) => ({
        projectName: `package-${index}`,
        keywords: ["misc"],
        description: "some package",
      }),
    );

    const result = await fetchSimilarProjects(oversizedInput);

    expect(result).toEqual([]);
    expect(openaiCreate).not.toHaveBeenCalled();
  });

  test("returns [] for empty input without calling OpenAI", async () => {
    const result = await fetchSimilarProjects([]);

    expect(result).toEqual([]);
    expect(openaiCreate).not.toHaveBeenCalled();
  });

  test("truncates over-long description and keywords instead of rejecting", async () => {
    const longDescription = "d".repeat(MAX_DESCRIPTION_LENGTH + 500);
    const tooManyKeywords = Array.from(
      { length: MAX_KEYWORDS + 25 },
      (_, index) => `keyword-${index}`,
    );

    const result = await fetchSimilarProjects([
      {
        projectName: "react",
        keywords: tooManyKeywords,
        description: longDescription,
      },
    ]);

    expect(openaiCreate).toHaveBeenCalledTimes(1);
    expect(result).toEqual(["vue"]);

    const sanitized = getUserPromptInput(0)[0]!;
    expect(sanitized.description).toHaveLength(MAX_DESCRIPTION_LENGTH);
    expect(sanitized.keywords).toHaveLength(MAX_KEYWORDS);
  });

  test("returns [] when rate limited without calling OpenAI again", async () => {
    const input = [
      {
        projectName: "react",
        keywords: ["frontend"],
        description: "ui library",
      },
    ];

    const results: string[][] = [];
    for (let attempt = 0; attempt <= RATE_LIMIT_MAX_REQUESTS; attempt += 1) {
      results.push(await fetchSimilarProjects(input));
    }

    expect(results[0]).toEqual(["vue"]);
    expect(results[RATE_LIMIT_MAX_REQUESTS]).toEqual([]);
    expect(openaiCreate).toHaveBeenCalledTimes(RATE_LIMIT_MAX_REQUESTS);
  });

  test("dedupes the input package and drops suggestions that fail existence check", async () => {
    openaiCreate.mockResolvedValue(
      respondWith(["Vue", "React", "nonexistent"]),
    );
    fetchPackageInfoMock.mockImplementation(async (name: string) => {
      if (name === "nonexistent") throw new Error("not found");
      return { projectName: name };
    });

    const result = await fetchSimilarProjects([
      {
        projectName: "react",
        keywords: ["frontend"],
        description: "ui library",
      },
    ]);

    expect(result).toEqual(["vue"]);
  });
});
