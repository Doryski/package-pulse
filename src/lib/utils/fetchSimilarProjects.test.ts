/**
 * @vitest-environment node
 */
import { SELECTED_PROJECTS_LIMIT } from "@/lib/config/constants";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { fetchSimilarProjects } from "./fetchSimilarProjects";

const MAX_DESCRIPTION_LENGTH = 300;
const MAX_KEYWORDS = 10;
const MAX_KEYWORD_LENGTH = 40;
const RATE_LIMIT_MAX_REQUESTS = 10;

const { openaiCreate, fetchPackageInfoMock, headersState } = vi.hoisted(() => ({
  openaiCreate: vi.fn(),
  fetchPackageInfoMock: vi.fn(),
  headersState: { ip: "127.0.0.1" },
}));

vi.mock("@/lib/config/env", () => ({
  env: { NODE_ENV: "test", OPENAI_API_KEY: "test-key" },
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

const getRequest = (callIndex: number) =>
  openaiCreate.mock.calls[callIndex]![0];

const getUserContent = (callIndex: number): string =>
  getRequest(callIndex).input.find(
    (message: { role: string }) => message.role === "user",
  ).content;

const getUserPromptInput = (callIndex: number) =>
  JSON.parse(
    getUserContent(callIndex)
      .replace("<package_metadata>", "")
      .replace("</package_metadata>", ""),
  ) as {
    projectName: string;
    keywords: string[];
    description: string;
  }[];

let ipCounter = 0;

beforeEach(() => {
  vi.clearAllMocks();
  headersState.ip = `10.0.0.${(ipCounter += 1)}`;
  fetchPackageInfoMock.mockImplementation(async (projectName: string) => ({
    projectName,
    keywords: ["frontend", "framework"],
    description: "A JavaScript library for building user interfaces.",
  }));
  openaiCreate.mockResolvedValue(respondWith(["vue"]));
});

describe("fetchSimilarProjects", () => {
  test("fetches metadata server-side and returns the model's validated suggestions", async () => {
    openaiCreate.mockResolvedValue(respondWith(["Vue", "solid-js"]));

    const result = await fetchSimilarProjects(["react"]);

    expect(result).toEqual(["vue", "solid-js"]);
    expect(openaiCreate).toHaveBeenCalledTimes(1);
    expect(fetchPackageInfoMock).toHaveBeenCalledWith("react");
    expect(getUserPromptInput(0)).toEqual([
      {
        projectName: "react",
        keywords: ["frontend", "framework"],
        description: "A JavaScript library for building user interfaces.",
      },
    ]);
  });

  test("delimits package metadata as untrusted data and caps output tokens", async () => {
    await fetchSimilarProjects(["react"]);

    expect(getUserContent(0)).toMatch(
      /^<package_metadata>\n[\s\S]*\n<\/package_metadata>$/,
    );
    expect(getRequest(0).max_output_tokens).toBeGreaterThan(0);
  });

  test("rejects input exceeding SELECTED_PROJECTS_LIMIT without calling OpenAI", async () => {
    const oversizedInput = Array.from(
      { length: SELECTED_PROJECTS_LIMIT + 1 },
      (_, index) => `package-${index}`,
    );

    const result = await fetchSimilarProjects(oversizedInput);

    expect(result).toEqual([]);
    expect(openaiCreate).not.toHaveBeenCalled();
    expect(fetchPackageInfoMock).not.toHaveBeenCalled();
  });

  test("returns [] for empty input without calling OpenAI", async () => {
    const result = await fetchSimilarProjects([]);

    expect(result).toEqual([]);
    expect(openaiCreate).not.toHaveBeenCalled();
  });

  test.each([
    ["invalid characters", ["react<script>"]],
    ["over-long name", ["a".repeat(215)]],
    ["non-string entries", [{ projectName: "react" }]],
    ["non-array input", "react"],
  ])("rejects %s without calling OpenAI", async (_, input) => {
    const result = await fetchSimilarProjects(input as never);

    expect(result).toEqual([]);
    expect(openaiCreate).not.toHaveBeenCalled();
  });

  test("accepts scoped and mixed-case names", async () => {
    await fetchSimilarProjects(["@Angular/Core"]);

    expect(fetchPackageInfoMock).toHaveBeenCalledWith("@angular/core");
  });

  test("truncates over-long description and keywords from fetched metadata", async () => {
    fetchPackageInfoMock.mockResolvedValue({
      projectName: "react",
      keywords: Array.from(
        { length: MAX_KEYWORDS + 25 },
        (_, index) => `${"k".repeat(MAX_KEYWORD_LENGTH)}-${index}`,
      ),
      description: "d".repeat(MAX_DESCRIPTION_LENGTH + 500),
    });

    const result = await fetchSimilarProjects(["react"]);

    expect(openaiCreate).toHaveBeenCalledTimes(1);
    expect(result).toEqual(["vue"]);

    const sanitized = getUserPromptInput(0)[0]!;
    expect(sanitized.description).toHaveLength(MAX_DESCRIPTION_LENGTH);
    expect(sanitized.keywords).toHaveLength(MAX_KEYWORDS);
    expect(
      sanitized.keywords.every(
        (keyword) => keyword.length <= MAX_KEYWORD_LENGTH,
      ),
    ).toBe(true);
  });

  test("still prompts with empty metadata when metadata fetch fails", async () => {
    fetchPackageInfoMock.mockImplementation(async (name: string) => {
      if (name === "react") throw new Error("not found");
      return { projectName: name };
    });

    await fetchSimilarProjects(["react"]);

    expect(getUserPromptInput(0)).toEqual([
      { projectName: "react", keywords: [], description: "" },
    ]);
  });

  test("returns [] when the model returns more than 5 suggestions", async () => {
    openaiCreate.mockResolvedValue(respondWith(["a", "b", "c", "d", "e", "f"]));

    expect(await fetchSimilarProjects(["react"])).toEqual([]);
  });

  test("returns [] when rate limited without calling OpenAI again", async () => {
    const results: string[][] = [];
    for (let attempt = 0; attempt <= RATE_LIMIT_MAX_REQUESTS; attempt += 1) {
      results.push(await fetchSimilarProjects(["react"]));
    }

    expect(results[0]).toEqual(["vue"]);
    expect(results[RATE_LIMIT_MAX_REQUESTS]).toEqual([]);
    expect(openaiCreate).toHaveBeenCalledTimes(RATE_LIMIT_MAX_REQUESTS);
  });

  test("dedupes the input package and drops suggestions that fail existence check", async () => {
    openaiCreate.mockResolvedValue(
      respondWith(["Vue", "React", "nonexistent", "not a package!"]),
    );
    fetchPackageInfoMock.mockImplementation(async (name: string) => {
      if (name === "nonexistent") throw new Error("not found");
      return { projectName: name };
    });

    const result = await fetchSimilarProjects(["react"]);

    expect(result).toEqual(["vue"]);
  });
});
