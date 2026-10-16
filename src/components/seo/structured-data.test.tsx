import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import StructuredData, { serializeJsonLd } from "./structured-data";

type StructuredDataProps = Parameters<typeof StructuredData>[0];

const renderJsonLd = (props: StructuredDataProps) => {
  const { container } = render(<StructuredData {...props} />);
  const script = container.querySelector('script[type="application/ld+json"]');
  return JSON.parse(script?.innerHTML ?? "null");
};

describe("serializeJsonLd", () => {
  it("escapes characters that could break out of a script tag", () => {
    const serialized = serializeJsonLd({
      value: "</script><b>&\u2028\u2029",
    });

    expect(serialized).not.toMatch(/[<>&\u2028\u2029]/);
    expect(serialized).toContain("\\u003c/script\\u003e");
    expect(serialized).toContain("\\u0026");
    expect(serialized).toContain("\\u2028");
    expect(serialized).toContain("\\u2029");
    expect(JSON.parse(serialized)).toEqual({
      value: "</script><b>&\u2028\u2029",
    });
  });
});

describe("StructuredData", () => {
  it("renders WebSite data with defaults and search action", () => {
    const data = renderJsonLd({ type: "website" });

    expect(data).toMatchObject({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Package Pulse",
      url: "https://www.package-pulse.com",
      potentialAction: {
        "@type": "SearchAction",
        "query-input": "required name=search_term_string",
      },
      publisher: { "@type": "Organization", name: "Package Pulse" },
      audience: { audienceType: "Software Developers" },
    });
    expect(data.description).toContain("Compare npm package download trends");
    expect(data).not.toHaveProperty("featureList");
  });

  it("renders SoftwareApplication data with defaults", () => {
    const data = renderJsonLd({ type: "softwareApplication" });

    expect(data).toMatchObject({
      "@type": "SoftwareApplication",
      name: "Package Pulse",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web Browser",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      screenshot: "https://www.package-pulse.com/images/share_image.png",
    });
    expect(data.featureList).toHaveLength(6);
    expect(data).not.toHaveProperty("potentialAction");
  });

  it("uses provided overrides", () => {
    const data = renderJsonLd({
      type: "softwareApplication",
      name: "react vs vue",
      description: "Custom description",
      url: "https://www.package-pulse.com/compare/react-vs-vue",
      applicationCategory: "Analytics",
      operatingSystem: "Any",
      offers: { price: "5", priceCurrency: "EUR" },
    });

    expect(data).toMatchObject({
      name: "react vs vue",
      description: "Custom description",
      url: "https://www.package-pulse.com/compare/react-vs-vue",
      applicationCategory: "Analytics",
      operatingSystem: "Any",
      offers: { price: "5", priceCurrency: "EUR" },
    });
  });

  it("escapes unsafe characters in the rendered script", () => {
    const { container } = render(
      <StructuredData type="website" name="</script>" />,
    );

    expect(container.innerHTML).not.toContain("</script></script>");
    expect(container.querySelector("script")?.innerHTML).toContain(
      "\\u003c/script\\u003e",
    );
  });
});
