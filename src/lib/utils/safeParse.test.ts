import * as Sentry from "@sentry/nextjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import * as zm from "zod/mini";
import safeParse from "./safeParse";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const schema = z
  .object({ clientIP: z.string(), count: z.number() })
  .describe("TestSchema");

describe("safeParse", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("returns transformed output on success", () => {
    const transforming = z.object({ n: z.coerce.number() });
    expect(safeParse({ n: "5" }, transforming)).toEqual({ n: 5 });
  });

  it("returns raw data and reports without forwarding the payload", () => {
    const raw = { clientIP: "203.0.113.7", count: "oops" };

    expect(safeParse(raw, schema)).toBe(raw);
    vi.runAllTimers();

    const [, context] = vi.mocked(Sentry.captureException).mock.calls[0] ?? [];
    expect(context).toMatchObject({
      extra: { schemaName: "TestSchema" },
    });
    expect(JSON.stringify(context)).not.toContain("203.0.113.7");
  });

  it("parses zod/mini schemas", () => {
    const mini = zm.object({ n: zm.pipe(zm.string(), zm.transform(Number)) });
    expect(safeParse({ n: "5" }, mini)).toEqual({ n: 5 });
  });

  it("reports mini schemas without a description as unknown", () => {
    const raw = { n: 1 };

    expect(safeParse(raw, zm.object({ n: zm.string() }))).toBe(raw);
    vi.runAllTimers();

    const [, context] = vi.mocked(Sentry.captureException).mock.calls[0] ?? [];
    expect(context).toMatchObject({
      extra: { schemaName: "Unknown schema" },
    });
  });
});
