/**
 * @vitest-environment node
 */
import { SELECTED_PROJECTS_LIMIT } from "@/lib/config/constants";
import OpenAI from "openai";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  findSimilarProjects,
  parseSimilarProjectsInput,
} from "./similarProjects";

const MAX_DESCRIPTION_LENGTH = 300;
const MAX_KEYWORDS = 10;
const MAX_KEYWORD_LENGTH = 40;

const {
  openaiCreate,
  fetchLatestManifestMock,
  fetchPackageExistsMock,
  envState,
} = vi.hoisted(() => ({
  openaiCreate: vi.fn(),
  fetchLatestManifestMock: vi.fn(),
  fetchPackageExistsMock: vi.fn(),
  envState: { NODE_ENV: "test", OPENAI_API_KEY: "test-key" } as Record<
    string,
    string | undefined
  >,
}));

vi.mock("@/lib/config/env", () => ({ env: envState }));

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(function () {
    return { responses: { create: openaiCreate } };
  }),
}));

vi.mock("openai/helpers/zod.mjs", () => ({
  zodTextFormat: () => ({}),
}));

vi.mock("@/lib/server/npmRegistry", () => ({
  fetchLatestManifest: fetchLatestManifestMock,
  fetchPackageExists: fetchPackageExistsMock,
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

beforeEach(() => {
  vi.clearAllMocks();
  envState.OPENAI_API_KEY = "test-key";
  fetchLatestManifestMock.mockImplementation(async (name: string) => ({
    name,
    version: "1.0.0",
    keywords: ["frontend", "framework"],
    description: "A JavaScript library for building user interfaces.",
  }));
  fetchPackageExistsMock.mockResolvedValue(true);
  openaiCreate.mockResolvedValue(respondWith(["vue"]));
});

describe("parseSimilarProjectsInput", () => {
  test("lowercases, trims, dedupes and sorts names", () => {
    expect(
      parseSimilarProjectsInput(" Vue ,react,REACT,@Angular/Core"),
    ).toEqual(["@angular/core", "react", "vue"]);
  });

  test("rejects input exceeding SELECTED_PROJECTS_LIMIT", () => {
    const oversized = Array.from(
      { length: SELECTED_PROJECTS_LIMIT + 1 },
      (_, index) => `package-${index}`,
    ).join(",");

    expect(parseSimilarProjectsInput(oversized)).toBeNull();
  });

  test.each([
    ["missing input", null],
    ["empty input", ""],
    ["only delimiters", " , ,"],
    ["invalid characters", "react<script>"],
    ["over-long name", "a".repeat(215)],
  ])("rejects %s", (_, input) => {
    expect(parseSimilarProjectsInput(input)).toBeNull();
  });
});

describe("findSimilarProjects", () => {
  test("fetches metadata server-side and returns the model's validated suggestions", async () => {
    openaiCreate.mockResolvedValue(respondWith(["Vue", "solid-js"]));

    const result = await findSimilarProjects(["react"]);

    expect(result).toEqual(["vue", "solid-js"]);
    expect(openaiCreate).toHaveBeenCalledTimes(1);
    expect(fetchLatestManifestMock).toHaveBeenCalledWith("react", undefined);
    expect(getUserPromptInput(0)).toEqual([
      {
        projectName: "react",
        keywords: ["frontend", "framework"],
        description: "A JavaScript library for building user interfaces.",
      },
    ]);
  });

  test("forwards the abort signal to registry and OpenAI calls", async () => {
    const { signal } = new AbortController();

    await findSimilarProjects(["react"], signal);

    expect(fetchLatestManifestMock).toHaveBeenCalledWith("react", signal);
    expect(fetchPackageExistsMock).toHaveBeenCalledWith("vue", signal);
    expect(openaiCreate.mock.calls[0]![1]).toMatchObject({ signal });
  });

  test("delimits package metadata as untrusted data and caps output tokens", async () => {
    await findSimilarProjects(["react"]);

    expect(getUserContent(0)).toMatch(
      /^<package_metadata>\n[\s\S]*\n<\/package_metadata>$/,
    );
    expect(getRequest(0).max_output_tokens).toBeGreaterThan(0);
  });

  test("truncates over-long description and keywords from fetched metadata", async () => {
    fetchLatestManifestMock.mockResolvedValue({
      name: "react",
      keywords: Array.from(
        { length: MAX_KEYWORDS + 25 },
        (_, index) => `${"k".repeat(MAX_KEYWORD_LENGTH)}-${index}`,
      ),
      description: "d".repeat(MAX_DESCRIPTION_LENGTH + 500),
    });

    const result = await findSimilarProjects(["react"]);

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

  test.each([
    ["the metadata fetch fails", () => Promise.reject(new Error("boom"))],
    ["the package has no manifest", () => Promise.resolve(null)],
    [
      "metadata is malformed",
      () => Promise.resolve({ keywords: "oops", description: 42 }),
    ],
    [
      "metadata fields are null",
      () => Promise.resolve({ keywords: null, description: null }),
    ],
  ])("prompts with empty metadata when %s", async (_, manifest) => {
    fetchLatestManifestMock.mockImplementation(manifest);

    await findSimilarProjects(["react"]);

    expect(getUserPromptInput(0)).toEqual([
      { projectName: "react", keywords: [], description: "" },
    ]);
  });

  test("returns [] when the model returns more than 5 suggestions", async () => {
    openaiCreate.mockResolvedValue(respondWith(["a", "b", "c", "d", "e", "f"]));

    expect(await findSimilarProjects(["react"])).toEqual([]);
  });

  test("drops invalid suggestions and the ones missing from the registry", async () => {
    openaiCreate.mockResolvedValue(
      respondWith(["Vue", "React", "nonexistent", "not a package!"]),
    );
    fetchPackageExistsMock.mockImplementation(
      async (name: string) => name !== "nonexistent",
    );

    expect(await findSimilarProjects(["react"])).toEqual(["vue"]);
  });

  test("fails instead of returning a trimmed list when an existence check errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    openaiCreate.mockResolvedValue(respondWith(["vue", "broken"]));
    fetchPackageExistsMock.mockImplementation(async (name: string) => {
      if (name === "broken") throw new Error("timeout");
      return true;
    });

    await expect(findSimilarProjects(["react"])).rejects.toThrow("timeout");
  });

  test("filters every input package from suggestions, deduplicating results", async () => {
    openaiCreate.mockResolvedValue(
      respondWith(["react", "VUE", "vue", "@Angular/Core", "svelte"]),
    );

    const result = await findSimilarProjects(["react", "svelte"]);

    expect(result).toEqual(["vue", "@angular/core"]);
    expect(fetchLatestManifestMock).toHaveBeenCalledTimes(2);
    expect(fetchPackageExistsMock).toHaveBeenCalledTimes(2);
  });

  test("passes the API key, retry budget, model settings and timeout to OpenAI", async () => {
    await findSimilarProjects(["react"]);

    expect(OpenAI).toHaveBeenCalledWith({ apiKey: "test-key", maxRetries: 1 });
    expect(getRequest(0)).toMatchObject({
      model: expect.any(String),
      max_output_tokens: 200,
    });
    expect(openaiCreate.mock.calls[0]![1]).toEqual({
      timeout: 10000,
      signal: undefined,
    });
  });

  test("rethrows and logs when the OpenAI client cannot be created without an API key", async () => {
    envState.OPENAI_API_KEY = undefined;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(OpenAI).mockImplementationOnce(function () {
      throw new Error("Missing credentials");
    });

    await expect(findSimilarProjects(["react"])).rejects.toThrow(
      "Missing credentials",
    );
    expect(OpenAI).toHaveBeenCalledWith({ apiKey: undefined, maxRetries: 1 });
    expect(errorSpy).toHaveBeenCalledWith(
      "Error fetching similar projects:",
      expect.any(Error),
    );
    expect(openaiCreate).not.toHaveBeenCalled();
  });

  test("rethrows when the OpenAI request fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    openaiCreate.mockRejectedValue(new Error("timeout"));

    await expect(findSimilarProjects(["react"])).rejects.toThrow("timeout");
  });

  test("rethrows when the model output is not valid JSON", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    openaiCreate.mockResolvedValue({ output_text: "not json" });

    await expect(findSimilarProjects(["react"])).rejects.toThrow();
  });

  test.each([
    ["wrong shape", { projects: ["vue"] }],
    ["non-string entries", { similarProjects: [1, 2] }],
    ["non-array value", { similarProjects: "vue" }],
  ])("returns [] when the model output has %s", async (_, payload) => {
    openaiCreate.mockResolvedValue({ output_text: JSON.stringify(payload) });

    expect(await findSimilarProjects(["react"])).toEqual([]);
  });
});
