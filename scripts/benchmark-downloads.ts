import fetchNpmDownloadsAdaptive from "@/api/fetchNpmDownloadsAdaptive";
import fetchNPMDownloads from "./lib/fetchNPMDownloads";
import { formatDate, parseDate } from "@/app/(home)/utils/date-utils";
import type { NPMDownloadCount } from "@/lib/schemas/npmDownloadsPeriod.schema";
import { eachDayOfInterval } from "date-fns";

type PackageSet = { label: string; packages: string[] };

type ParityResult = { parity: "PASS" | "FAIL"; parityDetail: string };

type OfflineResult = ParityResult & {
  label: string;
  oldTasks: number;
  newTasks: number;
};

type RealResult =
  | ({ status: "ok"; oldMs: number; newMs: number } & ParityResult)
  | { status: "skipped"; message: string };

type Mock429Result = {
  approach: string;
  outcome: string;
  requests: number;
  retries: number;
  recovered: string;
};

const originalFetch = globalThis.fetch.bind(globalThis);

const CANNED_DAILY_DOWNLOADS = 100;

const PACKAGE_SETS = [
  { label: "react,vue", packages: ["react", "vue"] },
  {
    label: "react,vue,svelte,preact,solid-js",
    packages: ["react", "vue", "svelte", "preact", "solid-js"],
  },
  {
    label: "react,@angular/core (scoped)",
    packages: ["react", "@angular/core"],
  },
] as const satisfies readonly PackageSet[];

const REAL_SET: PackageSet = { label: "react,vue", packages: ["react", "vue"] };
const MOCK_429_SET: PackageSet = {
  label: "react,vue",
  packages: ["react", "vue"],
};

const toMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const toUrl = (input: RequestInfo | URL) => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
};

const dedupeByDate = (downloads: NPMDownloadCount[]) => {
  const byDate = new Map<string, NPMDownloadCount>();
  for (const entry of downloads) {
    byDate.set(entry.date, entry);
  }
  return [...byDate.values()];
};

const sumCounts = (downloads: NPMDownloadCount[]) =>
  dedupeByDate(downloads).reduce((total, entry) => total + entry.count, 0);

const makeCountingFetch = (base: typeof fetch) => {
  const state = { count: 0 };
  const countingFetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    state.count += 1;
    return base(input, init);
  }) as typeof fetch;
  return { fetch: countingFetch, getCount: () => state.count };
};

const printTable = (headers: string[], rows: string[][]) => {
  const widths = headers.map((header, columnIndex) => {
    const cellWidths = rows.map((row) => (row[columnIndex] ?? "").length);
    return Math.max(header.length, ...cellWidths, 0);
  });
  const renderRow = (cells: string[]) =>
    cells
      .map((cell, columnIndex) => (cell ?? "").padEnd(widths[columnIndex] ?? 0))
      .join("  |  ");
  const separator = widths.map((width) => "-".repeat(width)).join("--+--");
  console.log(renderRow(headers));
  console.log(separator);
  for (const row of rows) {
    console.log(renderRow(row));
  }
};

const parseRangeUrl = (url: string) => {
  const marker = "/range/";
  const rest = url.slice(url.indexOf(marker) + marker.length);
  const firstSlash = rest.indexOf("/");
  const dateRange = rest.slice(0, firstSlash);
  const packagesPart = decodeURIComponent(rest.slice(firstSlash + 1));
  const [start, end] = dateRange.split(":");
  const packages = packagesPart.split(",");
  return { start: start ?? "", end: end ?? "", packages };
};

const enumerateDays = (start: string, end: string) =>
  eachDayOfInterval({ start: parseDate(start), end: parseDate(end) }).map(
    (day) => ({ day: formatDate(day), downloads: CANNED_DAILY_DOWNLOADS }),
  );

const makePeriodPayload = (pkg: string, start: string, end: string) => ({
  start,
  end,
  package: pkg,
  downloads: enumerateDays(start, end),
});

const buildCannedPayload = (url: string) => {
  const { start, end, packages } = parseRangeUrl(url);
  const [only] = packages;
  if (packages.length === 1 && only) {
    return makePeriodPayload(only, start, end);
  }
  return Object.fromEntries(
    packages.map((pkg) => [pkg, makePeriodPayload(pkg, start, end)]),
  );
};

const cannedFetch = (async (input: RequestInfo | URL) =>
  new Response(JSON.stringify(buildCannedPayload(toUrl(input))), {
    status: 200,
    headers: { "content-type": "application/json" },
  })) as typeof fetch;

const makeMock429Fetch = () => {
  const seenUrls = new Set<string>();
  const state = { count: 0 };
  const fetchImpl = (async (input: RequestInfo | URL) => {
    state.count += 1;
    const url = toUrl(input);
    if (!seenUrls.has(url)) {
      seenUrls.add(url);
      return new Response(JSON.stringify({ error: "rate limited" }), {
        status: 429,
        headers: { "retry-after": "1", "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify(buildCannedPayload(url)), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  return { fetchImpl, getCount: () => state.count };
};

const buildTotals = (
  packages: string[],
  getDownloads: (pkg: string) => NPMDownloadCount[],
) => new Map(packages.map((pkg) => [pkg, sumCounts(getDownloads(pkg))]));

const compareParity = (
  packages: string[],
  oldTotals: Map<string, number>,
  newTotals: Map<string, number>,
): ParityResult => {
  const mismatches: string[] = [];
  for (const pkg of packages) {
    const oldTotal = oldTotals.get(pkg) ?? 0;
    const newTotal = newTotals.get(pkg) ?? 0;
    if (oldTotal !== newTotal) {
      mismatches.push(`${pkg}: old=${oldTotal} new=${newTotal}`);
    }
  }
  if (mismatches.length === 0) {
    const detail = packages
      .map((pkg) => `${pkg}=${(oldTotals.get(pkg) ?? 0).toLocaleString()}`)
      .join(", ");
    return { parity: "PASS", parityDetail: detail };
  }
  return { parity: "FAIL", parityDetail: mismatches.join(" | ") };
};

const formatReduction = (oldTasks: number, newTasks: number) => {
  if (oldTasks <= 0) return "n/a";
  return `${(((oldTasks - newTasks) / oldTasks) * 100).toFixed(0)}%`;
};

async function runOfflineComparison(set: PackageSet): Promise<OfflineResult> {
  const oldCounter = makeCountingFetch(cannedFetch);
  const oldTotals = new Map<string, number>();

  globalThis.fetch = oldCounter.fetch;
  try {
    const settled = await Promise.allSettled(
      set.packages.map(
        async (pkg) => [pkg, sumCounts(await fetchNPMDownloads(pkg))] as const,
      ),
    );
    for (const result of settled) {
      if (result.status === "fulfilled") {
        oldTotals.set(result.value[0], result.value[1]);
      }
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
  const oldTasks = oldCounter.getCount();

  const newCounter = makeCountingFetch(cannedFetch);
  const { data, stats } = await fetchNpmDownloadsAdaptive(set.packages, {
    fetchImpl: newCounter.fetch,
  });
  const newTotals = buildTotals(set.packages, (pkg) => data[pkg] ?? []);

  return {
    label: set.label,
    oldTasks,
    newTasks: stats.requestCount,
    ...compareParity(set.packages, oldTotals, newTotals),
  };
}

async function runRealLatency(set: PackageSet): Promise<RealResult> {
  try {
    const oldCounter = makeCountingFetch(originalFetch);
    globalThis.fetch = oldCounter.fetch;
    const oldStart = performance.now();
    let oldTotals: Map<string, number>;
    try {
      const totals = await Promise.all(
        set.packages.map(
          async (pkg) =>
            [pkg, sumCounts(await fetchNPMDownloads(pkg))] as const,
        ),
      );
      oldTotals = new Map(totals);
    } finally {
      globalThis.fetch = originalFetch;
    }
    const oldMs = performance.now() - oldStart;

    const newCounter = makeCountingFetch(originalFetch);
    const newStart = performance.now();
    const { data } = await fetchNpmDownloadsAdaptive(set.packages, {
      fetchImpl: newCounter.fetch,
    });
    const newMs = performance.now() - newStart;
    const newTotals = buildTotals(set.packages, (pkg) => data[pkg] ?? []);

    return {
      status: "ok",
      oldMs,
      newMs,
      ...compareParity(set.packages, oldTotals, newTotals),
    };
  } catch (error) {
    return { status: "skipped", message: toMessage(error) };
  }
}

async function runOld429(set: PackageSet): Promise<Mock429Result> {
  const mock = makeMock429Fetch();
  let outcome = "SUCCESS (no data loss)";
  let recovered = "YES";
  const originalConsoleError = console.error;
  globalThis.fetch = mock.fetchImpl;
  console.error = () => {};
  try {
    await Promise.all(set.packages.map((pkg) => fetchNPMDownloads(pkg)));
  } catch (error) {
    outcome = `FAILED: ${toMessage(error)}`;
    recovered = "NO";
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
  }
  return {
    approach: "OLD (fetchNPMDownloads, no retry)",
    outcome,
    requests: mock.getCount(),
    retries: 0,
    recovered,
  };
}

async function runNew429(set: PackageSet): Promise<Mock429Result> {
  const mock = makeMock429Fetch();
  let outcome = "";
  let recovered = "NO";
  let retries = 0;
  try {
    const { data, stats } = await fetchNpmDownloadsAdaptive(set.packages, {
      fetchImpl: mock.fetchImpl,
    });
    const recoveredAll = set.packages.every(
      (pkg) => (data[pkg]?.length ?? 0) > 0,
    );
    outcome = recoveredAll
      ? `SUCCESS (rateLimitEvents=${stats.rateLimitEvents})`
      : "PARTIAL (some packages empty)";
    recovered = recoveredAll ? "YES" : "PARTIAL";
    retries = stats.totalRetries;
  } catch (error) {
    outcome = `FAILED: ${toMessage(error)}`;
  }
  return {
    approach: "NEW (adaptive pool, retry + Retry-After)",
    outcome,
    requests: mock.getCount(),
    retries,
    recovered,
  };
}

const printOfflineTable = (results: OfflineResult[]) =>
  printTable(
    ["package set", "OLD tasks", "NEW tasks", "reduction", "parity"],
    results.map((result) => [
      result.label,
      String(result.oldTasks),
      String(result.newTasks),
      formatReduction(result.oldTasks, result.newTasks),
      result.parity,
    ]),
  );

const realLatencyLine = (result: RealResult) => {
  if (result.status === "skipped") {
    return `[real react,vue: SKIPPED (npm edge-block: ${result.message})]`;
  }
  return `[real react,vue: OLD ${result.oldMs.toFixed(0)}ms vs NEW ${result.newMs.toFixed(0)}ms | parity ${result.parity}]`;
};

async function main() {
  console.log("=".repeat(72));
  console.log("  NPM DOWNLOADS REFACTOR — BEFORE vs AFTER BENCHMARK");
  console.log("=".repeat(72));

  console.log("\n[1] REQUEST-COUNT REDUCTION (OFFLINE, deterministic)");
  console.log(
    "    Both paths run against a canned fetch (no network). Identical every run.",
  );
  console.log(
    "    'tasks' = HTTP requests issued; parity = same total downloads per package.\n",
  );

  const offlineResults: OfflineResult[] = [];
  for (const set of PACKAGE_SETS) {
    try {
      offlineResults.push(await runOfflineComparison(set));
    } catch (error) {
      console.log(`  ! Set "${set.label}" crashed: ${toMessage(error)}`);
    }
  }
  if (offlineResults.length > 0) {
    printOfflineTable(offlineResults);
    console.log("\n  Parity detail:");
    for (const result of offlineResults) {
      console.log(
        `    - ${result.label}: [${result.parity}] ${result.parityDetail}`,
      );
    }
  }

  console.log("\n[2] REAL-NPM LATENCY + DATA PARITY (one gentle run)");
  console.log(
    "    NOTE: this section hits the REAL api.npmjs.org endpoint once.\n",
  );
  const realResult = await runRealLatency(REAL_SET);
  if (realResult.status === "skipped") {
    console.log(
      `  [2] real-npm react,vue: SKIPPED (npm edge-block: ${realResult.message})`,
    );
  } else {
    printTable(
      ["package set", "OLD ms", "NEW ms", "parity"],
      [
        [
          REAL_SET.label,
          realResult.oldMs.toFixed(0),
          realResult.newMs.toFixed(0),
          realResult.parity,
        ],
      ],
    );
    console.log(
      `\n  Parity detail: [${realResult.parity}] ${realResult.parityDetail}`,
    );
  }

  console.log("\n[3] INJECTED-429 RESILIENCE (mock fetch, no real npm)");
  console.log(
    "    Each unique URL returns HTTP 429 + Retry-After: 1 on first hit, then valid data.",
  );
  console.log(`    Package set: ${MOCK_429_SET.label}\n`);

  const resilienceRows: Mock429Result[] = [];
  try {
    resilienceRows.push(await runOld429(MOCK_429_SET));
  } catch (error) {
    console.log(`  ! OLD 429 run crashed: ${toMessage(error)}`);
  }
  try {
    resilienceRows.push(await runNew429(MOCK_429_SET));
  } catch (error) {
    console.log(`  ! NEW 429 run crashed: ${toMessage(error)}`);
  }
  if (resilienceRows.length > 0) {
    printTable(
      ["approach", "outcome", "requests", "retries", "recovered?"],
      resilienceRows.map((row) => [
        row.approach,
        row.outcome,
        String(row.requests),
        String(row.retries),
        row.recovered,
      ]),
    );
  }

  console.log("\n[4] SUMMARY");
  console.log("    Offline request-count reduction (deterministic):\n");
  if (offlineResults.length > 0) {
    printOfflineTable(offlineResults);
  }
  console.log(`\n  Real latency: ${realLatencyLine(realResult)}`);
  const oldOutcome = resilienceRows.find((row) =>
    row.approach.startsWith("OLD"),
  );
  const newOutcome = resilienceRows.find((row) =>
    row.approach.startsWith("NEW"),
  );
  console.log(
    `  429 outcome: OLD -> ${oldOutcome?.recovered ?? "n/a"} recovered | NEW -> ${newOutcome?.recovered ?? "n/a"} recovered`,
  );
  console.log("\n" + "=".repeat(72));
}

main().catch((error) => {
  console.error("Benchmark crashed:", toMessage(error));
  process.exitCode = 1;
});
