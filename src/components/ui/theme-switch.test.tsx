import { screen } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import ThemeSwitch from "./theme-switch";

const mockMatchMedia = (matches: boolean) =>
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    })),
  );

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ThemeSwitch", () => {
  test("renders three theme options on desktop", () => {
    mockMatchMedia(false);
    renderWithProviders(<ThemeSwitch />);
    expect(
      screen.getByRole("radiogroup", { name: "Theme" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "System" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Light" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Dark" })).toBeInTheDocument();
  });

  test("renders on mobile", () => {
    mockMatchMedia(true);
    renderWithProviders(<ThemeSwitch />);
    expect(screen.getByRole("radio", { name: "System" })).toBeInTheDocument();
  });

  test("changes theme on selection", async () => {
    mockMatchMedia(false);
    const { user } = renderWithProviders(<ThemeSwitch />);
    await user.click(screen.getByRole("radio", { name: "Dark" }));
    expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
    expect(localStorage.getItem("theme")).toBe("dark");
    await user.click(screen.getByRole("radio", { name: "Light" }));
    expect(localStorage.getItem("theme")).toBe("light");
  });

  test("ignores deselecting the active theme", async () => {
    mockMatchMedia(false);
    const { user } = renderWithProviders(<ThemeSwitch />);
    await user.click(screen.getByRole("radio", { name: "Dark" }));
    await user.click(screen.getByRole("radio", { name: "Dark" }));
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  test("server-renders a same-size placeholder box", () => {
    const html = renderToString(createElement(ThemeSwitch));
    const container = document.createElement("div");
    container.innerHTML = html;

    const placeholder = container.querySelector(
      "[data-testid='theme-switch-placeholder']",
    );
    expect(placeholder).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("[role='radiogroup']")).toBeNull();
    const items = [...(placeholder?.children ?? [])];
    expect(items).toHaveLength(3);
    items.forEach((item) =>
      expect(item).toHaveClass("h-9", "px-3", "border", "border-input"),
    );
    expect(items[0]).toHaveClass("rounded-l-md");
    expect(items[2]).toHaveClass("rounded-r-md");
    items.forEach((item) =>
      expect(item.firstElementChild).toHaveClass("size-4"),
    );
  });
});
