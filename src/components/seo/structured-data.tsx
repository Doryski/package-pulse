type StructuredDataProps = {
  type: "website" | "softwareApplication";
  name?: string;
  description?: string;
  url?: string;
  applicationCategory?: string;
  operatingSystem?: string;
  offers?: {
    price: string;
    priceCurrency: string;
  };
};

const StructuredData = ({
  type,
  name,
  description,
  url,
  applicationCategory,
  operatingSystem,
  offers,
}: StructuredDataProps) => {
  const getStructuredData = () => {
    const baseData = {
      "@context": "https://schema.org",
      "@type": type === "website" ? "WebSite" : "SoftwareApplication",
      name: name || "Package Pulse",
      description:
        description ||
        "Compare npm package download trends and statistics. Interactive charts for React, Vue, Angular, and thousands of JavaScript packages.",
      url: url || "https://www.package-pulse.com",
    };

    if (type === "website") {
      return {
        ...baseData,
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate:
              "https://www.package-pulse.com/?projects={search_term_string}",
          },
          "query-input": "required name=search_term_string",
        },
        publisher: {
          "@type": "Organization",
          name: "Package Pulse",
        },
        audience: {
          "@type": "Audience",
          audienceType: "Software Developers",
        },
      };
    }

    return {
      ...baseData,
      applicationCategory: applicationCategory || "DeveloperApplication",
      operatingSystem: operatingSystem || "Web Browser",
      offers: offers || {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      featureList: [
        "NPM package comparison",
        "Download statistics analysis",
        "Interactive charts and graphs",
        "Real-time data updates",
        "Export functionality",
        "GitHub integration",
      ],
      screenshot: "https://www.package-pulse.com/images/share_image.png",
    };
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(getStructuredData()),
      }}
    />
  );
};

export default StructuredData;
