import { MULTI_SEARCH_DELIMITER } from "@/lib/config/constants";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  useInitialChartModeFromSearchParams,
  useInitialChartScaleFromSearchParams,
  useInitialProjectsFromSearchParams,
  useInitialTimePeriodFromSearchParams,
  useUpdateSearchParams,
  useUpdateSearchParamsChart,
  useUpdateSearchParamsProjects,
} from "./search-params";

const navigationMock = await vi.hoisted(async () => {
  const { createNavigationMock } = await import("@/test/next-navigation");
  return createNavigationMock();
});

vi.mock("next/navigation", () => navigationMock);

const DELIMITER = MULTI_SEARCH_DELIMITER;
const NO_SCROLL = { scroll: false };

beforeEach(() => {
  navigationMock.reset();
  localStorage.clear();
});

describe("initial value hooks", () => {
  test("useInitialProjectsFromSearchParams decodes projects param", () => {
    navigationMock.setSearchParams({ projects: `react${DELIMITER}vue` });

    const { result } = renderHook(() =>
      useInitialProjectsFromSearchParams(DELIMITER),
    );

    expect(result.current).toEqual(["react", "vue"]);
  });

  test("useInitialProjectsFromSearchParams returns empty list for empty param", () => {
    navigationMock.setSearchParams({ projects: "" });

    const { result } = renderHook(() =>
      useInitialProjectsFromSearchParams(DELIMITER),
    );

    expect(result.current).toEqual([]);
  });

  test("useInitialTimePeriodFromSearchParams reads period with fallback", () => {
    navigationMock.setSearchParams({ period: "months-3" });
    const valid = renderHook(() => useInitialTimePeriodFromSearchParams());
    navigationMock.setSearchParams({ period: "bogus" });
    const invalid = renderHook(() => useInitialTimePeriodFromSearchParams());

    expect(valid.result.current).toBe("months-3");
    expect(invalid.result.current).toBe("all-time");
  });

  test("useInitialChartScaleFromSearchParams reads scale with fallback", () => {
    navigationMock.setSearchParams({ scale: "logarithmic" });
    const valid = renderHook(() => useInitialChartScaleFromSearchParams());
    navigationMock.setSearchParams({});
    const missing = renderHook(() => useInitialChartScaleFromSearchParams());

    expect(valid.result.current).toBe("logarithmic");
    expect(missing.result.current).toBe("linear");
  });

  test("useInitialChartModeFromSearchParams reads mode with fallback", () => {
    navigationMock.setSearchParams({ mode: "normalized" });
    const valid = renderHook(() => useInitialChartModeFromSearchParams());
    navigationMock.setSearchParams({ mode: "bogus" });
    const invalid = renderHook(() => useInitialChartModeFromSearchParams());

    expect(valid.result.current).toBe("normalized");
    expect(invalid.result.current).toBe("absolute");
  });
});

describe("useUpdateSearchParamsProjects", () => {
  test("replaces the url when selection differs", () => {
    navigationMock.setPathname("/");

    renderHook(() => useUpdateSearchParamsProjects(["react"], DELIMITER));

    expect(navigationMock.router.replace).toHaveBeenCalledWith(
      "/?projects=react",
      NO_SCROLL,
    );
  });

  test("does nothing when the url already matches", () => {
    navigationMock.setPathname("/");
    navigationMock.setSearchParams({ projects: "react" });

    renderHook(() => useUpdateSearchParamsProjects(["react"], DELIMITER));

    expect(navigationMock.router.replace).not.toHaveBeenCalled();
  });

  test("targets the compare path on compare routes", () => {
    navigationMock.setPathname("/compare/react");

    renderHook(() =>
      useUpdateSearchParamsProjects(["react", "vue"], DELIMITER),
    );

    expect(navigationMock.router.replace).toHaveBeenCalledWith(
      expect.stringMatching(/^\/compare\/.*vue/),
      NO_SCROLL,
    );
  });
});

describe("useUpdateSearchParams", () => {
  test("always replaces with url built from args and preserved params", () => {
    navigationMock.setPathname("/");
    navigationMock.setSearchParams({ foo: "bar" });

    renderHook(() =>
      useUpdateSearchParams(
        ["react"],
        "months-1",
        "logarithmic",
        DELIMITER,
        "normalized",
      ),
    );

    expect(navigationMock.router.replace).toHaveBeenCalledWith(
      "/?projects=react&period=months-1&scale=logarithmic&mode=normalized&foo=bar",
      NO_SCROLL,
    );
  });

  test("defaults chart mode to absolute", () => {
    navigationMock.setPathname("/");

    renderHook(() =>
      useUpdateSearchParams(["react"], "all-time", "linear", DELIMITER),
    );

    expect(navigationMock.router.replace).toHaveBeenCalledWith(
      "/?projects=react",
      NO_SCROLL,
    );
  });
});

describe("useUpdateSearchParamsChart", () => {
  test("replaces when chart settings differ from the url", () => {
    navigationMock.setPathname("/");
    navigationMock.setSearchParams({ projects: "react" });

    renderHook(() => useUpdateSearchParamsChart("years-1", "logarithmic"));

    expect(navigationMock.router.replace).toHaveBeenCalledWith(
      "/?projects=react&period=years-1&scale=logarithmic",
      NO_SCROLL,
    );
  });

  test("does nothing when settings already match the url", () => {
    navigationMock.setPathname("/");
    navigationMock.setSearchParams({ projects: "react", mode: "normalized" });

    renderHook(() =>
      useUpdateSearchParamsChart("all-time", "linear", "normalized"),
    );

    expect(navigationMock.router.replace).not.toHaveBeenCalled();
  });
});
