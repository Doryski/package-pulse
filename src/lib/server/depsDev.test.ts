/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { DEPS_DEV_API_URL, getDepsDevInfo } from "./depsDev";

const { fakeCache } = vi.hoisted(() => ({
  fakeCache: { current: null as null | { clear: () => void } },
}));

vi.mock("@/lib/config/serverCache", async () => {
  const { createFakeServerCache } = await import("@/test/fakeServerCache");
  const cache = createFakeServerCache();
  fakeCache.current = cache;
  return { cacheDerived: cache.cacheDerived };
});

const fetchMock = vi.fn<typeof fetch>();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

type BatchBody = {
  requests: Array<{
    versionKey?: { name: string; version: string };
    projectKey?: { id: string };
  }>;
  pageToken?: string;
};

const readBody = (init?: RequestInit): BatchBody =>
  JSON.parse(typeof init?.body === "string" ? init.body : "{}");

const projectIdFor = (name: string) => `github.com/o/${name.replace("@", "")}`;

const versionFor = (name: string) => ({
  licenses: ["MIT"],
  advisoryKeys: [{ id: "GHSA-1" }, { id: "GHSA-2" }],
  relatedProjects: [
    { projectKey: { id: "gitlab.com/x/y" }, relationType: "ISSUE_TRACKER" },
    { projectKey: { id: projectIdFor(name) }, relationType: "SOURCE_REPO" },
  ],
});

const projectFor = (id: string) => ({
  starsCount: id.length * 10,
  forksCount: 3,
  openIssuesCount: 4,
  scorecard: { overallScore: 7.5 },
});

const callsTo = (path: string) =>
  fetchMock.mock.calls.filter(([url]) => String(url).endsWith(path));

type Overrides = {
  missingVersions?: string[];
  versionPages?: boolean;
  projectStatus?: number;
  versionStatus?: number;
};

const respond =
  (overrides: Overrides) =>
  async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith("https://registry.npmjs.org/")) {
      const name = decodeURIComponent(
        url.slice("https://registry.npmjs.org/".length, -"/latest".length),
      );
      if (name.startsWith("missing-")) return json({}, 404);
      if (name === "broken") return json({}, 500);
      return json({ name, version: "1.0.0" });
    }
    const body = readBody(init);
    if (url === `${DEPS_DEV_API_URL}/versionbatch`) {
      if (overrides.versionStatus) return json({}, overrides.versionStatus);
      const split = overrides.versionPages && !body.pageToken;
      const requests = split ? body.requests.slice(0, 1) : body.requests;
      const rest = overrides.versionPages
        ? requests.slice(body.pageToken ? 1 : 0)
        : requests;
      return json({
        responses: rest.map((request) => {
          const name = request.versionKey?.name ?? "";
          if (overrides.missingVersions?.includes(name)) return { request };
          return { request, version: versionFor(name) };
        }),
        nextPageToken: split ? "page-2" : "",
      });
    }
    if (url === `${DEPS_DEV_API_URL}/projectbatch`) {
      if (overrides.projectStatus) return json({}, overrides.projectStatus);
      return json({
        responses: body.requests.map((request) => ({
          request,
          project: projectFor(request.projectKey?.id ?? ""),
        })),
        nextPageToken: "",
      });
    }
    throw new Error(`unexpected ${url}`);
  };

const useUpstream = (overrides: Overrides = {}) =>
  fetchMock.mockImplementation(respond(overrides));

const expectedInfo = (name: string) => {
  const projectId = projectIdFor(name);
  return {
    version: "1.0.0",
    vulnerabilityCount: 2,
    licenses: ["MIT"],
    healthScore: 7.5,
    starsCount: projectId.length * 10,
    forksCount: 3,
    openIssuesCount: 4,
    projectId,
  };
};

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  fetchMock.mockReset();
  fakeCache.current?.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("getDepsDevInfo", () => {
  test("resolves latest versions and batches deps.dev lookups", async () => {
    useUpstream();

    const result = await getDepsDevInfo(["@scope/pkg", "react"]);

    expect(result).toEqual({
      data: {
        "@scope/pkg": expectedInfo("@scope/pkg"),
        react: expectedInfo("react"),
      },
      errors: {},
    });
    const [versionCall] = callsTo("/versionbatch");
    expect(versionCall?.[1]?.method).toBe("POST");
    expect(readBody(versionCall?.[1]).requests).toEqual([
      { versionKey: { system: "NPM", name: "@scope/pkg", version: "1.0.0" } },
      { versionKey: { system: "NPM", name: "react", version: "1.0.0" } },
    ]);
    const [projectCall] = callsTo("/projectbatch");
    expect(readBody(projectCall?.[1]).requests).toEqual([
      { projectKey: { id: projectIdFor("@scope/pkg") } },
      { projectKey: { id: projectIdFor("react") } },
    ]);
    expect(callsTo("/versionbatch")).toHaveLength(1);
  });

  test("follows nextPageToken with the same requests", async () => {
    useUpstream({ versionPages: true });

    const result = await getDepsDevInfo(["a", "b"]);

    expect(result.data).toEqual({ a: expectedInfo("a"), b: expectedInfo("b") });
    const calls = callsTo("/versionbatch").map(([, init]) => readBody(init));
    expect(calls).toHaveLength(2);
    expect(calls[1]?.pageToken).toBe("page-2");
    expect(calls[1]?.requests).toEqual(calls[0]?.requests);
  });

  test("returns null data without an error when deps.dev lacks the version", async () => {
    useUpstream({ missingVersions: ["fresh"] });

    const result = await getDepsDevInfo(["fresh", "react"]);

    expect(result.data.fresh).toBeNull();
    expect(result.errors).toEqual({});
    expect(readBody(callsTo("/projectbatch")[0]?.[1]).requests).toEqual([
      { projectKey: { id: projectIdFor("react") } },
    ]);
  });

  test("returns null project fields when there is no GitHub project", async () => {
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/versionbatch")) {
        const { requests } = readBody(init);
        return json({
          responses: requests.map((request) => ({
            request,
            version: { licenses: ["ISC"] },
          })),
        });
      }
      return respond({})(input, init);
    });

    const result = await getDepsDevInfo(["solo"]);

    expect(result.data.solo).toEqual({
      version: "1.0.0",
      vulnerabilityCount: null,
      licenses: ["ISC"],
      healthScore: null,
      starsCount: null,
      forksCount: null,
      openIssuesCount: null,
      projectId: null,
    });
    expect(callsTo("/projectbatch")).toHaveLength(0);
  });

  test("marks unknown packages as notFound and registry failures as upstream", async () => {
    useUpstream();

    const result = await getDepsDevInfo(["broken", "missing-x", "react"]);

    expect(result.data).toEqual({
      broken: null,
      "missing-x": null,
      react: expectedInfo("react"),
    });
    expect(result.errors).toEqual({
      broken: "upstream",
      "missing-x": "notFound",
    });
  });

  test.each([
    ["versionbatch", { versionStatus: 500 }],
    ["projectbatch", { projectStatus: 503 }],
  ])("marks every package upstream when %s fails", async (_path, overrides) => {
    useUpstream(overrides);

    const result = await getDepsDevInfo(["a", "b"]);

    expect(result).toEqual({
      data: { a: null, b: null },
      errors: { a: "upstream", b: "upstream" },
    });
  });

  test("marks packages upstream when deps.dev returns an invalid body", async () => {
    fetchMock.mockImplementation(async (input, init) => {
      if (String(input).endsWith("/versionbatch")) {
        return json({ responses: [{ request: {} }] });
      }
      return respond({})(input, init);
    });

    const result = await getDepsDevInfo(["a"]);

    expect(result.errors).toEqual({ a: "upstream" });
  });

  test("only batches the versions missing from the cache", async () => {
    useUpstream();
    await getDepsDevInfo(["a"]);
    fetchMock.mockClear();

    const result = await getDepsDevInfo(["a", "b"]);

    expect(result.data).toEqual({ a: expectedInfo("a"), b: expectedInfo("b") });
    expect(readBody(callsTo("/versionbatch")[0]?.[1]).requests).toEqual([
      { versionKey: { system: "NPM", name: "b", version: "1.0.0" } },
    ]);
  });

  test("skips deps.dev entirely when every version is cached", async () => {
    useUpstream();
    await getDepsDevInfo(["a"]);
    fetchMock.mockClear();

    await expect(getDepsDevInfo(["a"])).resolves.toEqual({
      data: { a: expectedInfo("a") },
      errors: {},
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
