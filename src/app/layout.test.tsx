import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RootLayout, { metadata, viewport } from "./layout";

vi.mock("next/font/google", () => ({
  Inter: () => ({ className: "inter-font" }),
}));

vi.mock("@vercel/analytics/next", () => ({
  Analytics: () => <div data-testid="vercel-analytics" />,
}));

vi.mock("@/components/ui/sonner", () => ({
  Toaster: () => <div data-testid="toaster" />,
}));

const renderLayout = () =>
  render(
    <RootLayout>
      <p>Page content</p>
    </RootLayout>,
    { container: document },
  );

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("layout metadata", () => {
  it("defines the site metadata base and canonical", () => {
    expect(metadata.metadataBase.href).toBe("https://www.package-pulse.com/");
    expect(metadata.alternates).toEqual({ canonical: "/" });
    expect(metadata.title).toBe(
      "Compare NPM Package Downloads & Trends - Package Pulse",
    );
    expect(metadata.keywords).toContain("compare npm packages");
  });

  it("defines open graph and twitter cards with the share image", () => {
    const shareImage = "https://www.package-pulse.com/images/share_image.png";

    expect(metadata.openGraph).toMatchObject({
      url: "https://www.package-pulse.com",
      type: "website",
      images: [{ url: shareImage, width: 800, height: 600 }],
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      images: [shareImage],
    });
  });

  it("defines icons and manifest", () => {
    expect(metadata.icons.icon.map(({ sizes }) => sizes)).toEqual([
      "32x32",
      "16x16",
    ]);
    expect(metadata.manifest).toBe("/site.webmanifest");
  });

  it("defines light and dark theme colors", () => {
    expect(viewport.themeColor).toEqual([
      { media: "(prefers-color-scheme: light)", color: "#ffffff" },
      { media: "(prefers-color-scheme: dark)", color: "#020817" },
    ]);
  });
});

describe("RootLayout", () => {
  it("renders the shell around the page content", async () => {
    renderLayout();

    expect(document.documentElement).toHaveAttribute("lang", "en");
    expect(document.body).toHaveClass("inter-font", "min-h-screen");
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("Page content");
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(await screen.findByTestId("toaster")).toBeInTheDocument();
  });

  it("adds website structured data to the head", () => {
    renderLayout();

    const script = document.head.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(JSON.parse(script?.innerHTML ?? "null")).toMatchObject({
      "@type": "WebSite",
    });
  });

  it("omits analytics outside production", () => {
    vi.stubEnv("NODE_ENV", "test");
    renderLayout();

    expect(screen.queryByTestId("vercel-analytics")).not.toBeInTheDocument();
  });

  it("renders analytics in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    renderLayout();

    expect(screen.getByTestId("vercel-analytics")).toBeInTheDocument();
  });
});
