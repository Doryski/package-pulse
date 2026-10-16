import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { useTheme } from "next-themes";
import { beforeEach, describe, expect, it, vi } from "vitest";

const reactQueryState = vi.hoisted(() => ({ isServer: false }));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    get isServer() {
      return reactQueryState.isServer;
    },
  };
});

const loadProviders = async () => (await import("./providers")).default;

const captured: { clients: QueryClient[] } = { clients: [] };

function QueryClientProbe() {
  captured.clients.push(useQueryClient());
  const { theme } = useTheme();
  return <p>Theme: {String(theme)}</p>;
}

const renderProviders = async () => {
  const Providers = await loadProviders();
  return render(
    <Providers>
      <QueryClientProbe />
    </Providers>,
  );
};

const getQueryDefaults = () => {
  const [client] = captured.clients;
  if (!client) throw new Error("query client was not captured");
  const { queries } = client.getDefaultOptions();
  if (!queries) throw new Error("missing query defaults");
  return queries;
};

const getRetry = () => {
  const { retry } = getQueryDefaults();
  if (typeof retry !== "function") throw new Error("retry is not a function");
  return retry;
};

const getRetryDelay = () => {
  const { retryDelay } = getQueryDefaults();
  if (typeof retryDelay !== "function") {
    throw new Error("retryDelay is not a function");
  }
  return (attempt: number) => retryDelay(attempt, new Error("x"));
};

beforeEach(() => {
  vi.resetModules();
  reactQueryState.isServer = false;
  captured.clients = [];
});

describe("Providers", () => {
  it("renders children inside query, theme and tooltip providers", async () => {
    await renderProviders();

    expect(screen.getByText(/^Theme:/)).toBeInTheDocument();
    expect(captured.clients[0]).toBeInstanceOf(QueryClient);
  });

  it("configures query defaults", async () => {
    await renderProviders();

    expect(getQueryDefaults()).toMatchObject({
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: "always",
    });
  });

  it("does not retry 404 errors", async () => {
    await renderProviders();

    expect(getRetry()(0, new Error("Request failed with 404"))).toBe(false);
  });

  it.each([
    [0, true],
    [1, true],
    [2, false],
  ])(
    "retries other errors while failure count %i < 2",
    async (count, expected) => {
      await renderProviders();

      expect(getRetry()(count, new Error("500"))).toBe(expected);
    },
  );

  it("retries non-Error failures mentioning 404 by count", async () => {
    await renderProviders();

    expect(getRetry()(0, { name: "PlainObject", message: "404" })).toBe(true);
  });

  it("uses capped exponential retry delay", async () => {
    await renderProviders();
    const retryDelay = getRetryDelay();

    expect([0, 1, 2, 10].map(retryDelay)).toEqual([1000, 2000, 4000, 30000]);
  });

  it("reuses a single browser query client across renders", async () => {
    const { rerender } = await renderProviders();
    const Providers = await loadProviders();

    rerender(
      <Providers>
        <QueryClientProbe />
      </Providers>,
    );

    expect(new Set(captured.clients).size).toBe(1);
  });

  it("creates a new query client per render on the server", async () => {
    reactQueryState.isServer = true;
    const { rerender } = await renderProviders();
    const Providers = await loadProviders();

    rerender(
      <Providers>
        <QueryClientProbe />
      </Providers>,
    );

    expect(new Set(captured.clients).size).toBe(captured.clients.length);
    expect(captured.clients.length).toBeGreaterThan(1);
  });
});
