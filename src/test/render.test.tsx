import { buildDownloadStats, buildProjectStats } from "@/test/factories";
import { renderWithForm, renderWithProviders } from "@/test/render";
import { useQueryClient } from "@tanstack/react-query";
import { screen } from "@testing-library/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFormContext } from "react-hook-form";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { describe, expect, it, vi } from "vitest";

const navigationMock = await vi.hoisted(async () => {
  const { createNavigationMock } = await import("@/test/next-navigation");
  return createNavigationMock({ pathname: "/compare", searchParams: "a=1" });
});

vi.mock("next/navigation", () => navigationMock);

vi.mock("recharts", async (importOriginal) => {
  const { mockRecharts } = await import("@/test/recharts");
  return mockRecharts(importOriginal);
});

function QueryClientProbe() {
  const queryClient = useQueryClient();
  return (
    <button
      type="button"
      onClick={() => queryClient.setQueryData(["probe"], "clicked")}
    >
      probe
    </button>
  );
}

function SearchProbe() {
  const { register, watch } = useFormContext();
  return (
    <>
      <input aria-label="search" {...register("search")} />
      <output>{watch("projects").join(",")}</output>
    </>
  );
}

function NavigationProbe() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (
    <button type="button" onClick={() => router.push("/next")}>
      {pathname}?{searchParams.toString()}
    </button>
  );
}

describe("renderWithProviders", () => {
  it("exposes the query client and a user-event instance", async () => {
    const { queryClient, user } = renderWithProviders(<QueryClientProbe />);

    await user.click(screen.getByRole("button", { name: "probe" }));

    expect(queryClient.getQueryData(["probe"])).toBe("clicked");
  });

  it("renders recharts through the fixed-size ResponsiveContainer stub", () => {
    renderWithProviders(
      <ResponsiveContainer>
        <LineChart data={buildDownloadStats(3)}>
          <Line dataKey="count" />
        </LineChart>
      </ResponsiveContainer>,
    );

    expect(screen.getByTestId("responsive-container")).toHaveStyle({
      width: "800px",
      height: "400px",
    });
  });
});

describe("renderWithForm", () => {
  it("wires the projects form and returns its methods", async () => {
    const { form, user } = renderWithForm(<SearchProbe />, {
      projects: ["react", "vue"],
    });

    await user.type(screen.getByLabelText("search"), "zod");

    expect(form.getValues("search")).toBe("zod");
    expect(screen.getByText("react,vue")).toBeInTheDocument();
  });
});

describe("createNavigationMock", () => {
  it("drives next/navigation hooks and records router calls", async () => {
    navigationMock.setSearchParams({ b: "2" });
    const { user } = renderWithProviders(<NavigationProbe />);

    await user.click(screen.getByRole("button", { name: "/compare?b=2" }));

    expect(navigationMock.router.push).toHaveBeenCalledWith("/next");
    navigationMock.reset();
    expect(navigationMock.router.push).not.toHaveBeenCalled();
    expect(navigationMock.useSearchParams().toString()).toBe("a=1");
  });
});

describe("factories", () => {
  it("builds deterministic download stats and project stats", () => {
    const stats = buildDownloadStats(14, "2024-01-01");

    expect(stats[0]).toEqual({ date: "2024-01-01", count: 1000 });
    expect(stats.at(-1)?.date).toBe("2024-01-14");
    expect(buildProjectStats("react", { rawSortedData: stats })).toEqual(
      buildProjectStats("react", { days: 14 }),
    );
  });
});
