"use client";

import ProjectsForm from "@/app/(home)/components/projects-form";
import { useSentrySearchParams } from "@/lib/hooks/useSentrySearchParams";

export default function Home() {
  useSentrySearchParams();

  return (
    <div className="mt-8 space-y-20">
      <div className="mb-12 text-center">
        <h1 className="mb-6 text-4xl font-bold md:text-4xl">
          Compare NPM Package Downloads & Trends
        </h1>
        <p className="mx-auto max-w-2xl text-base text-muted-foreground">
          Analyze and compare download statistics for thousands of JavaScript
          packages. Get insights on React, Vue, Angular, and more with
          interactive charts and real-time data.
        </p>
      </div>

      <ProjectsForm />

      <div className="space-y-12">
        <section className="text-center">
          <h2 className="mb-4 text-2xl font-semibold">
            How Package Pulse Works
          </h2>
          <div className="mx-auto max-w-4xl space-y-8 text-muted-foreground">
            <p>
              Package Pulse provides comprehensive analytics for NPM packages by
              collecting and analyzing download statistics from the official NPM
              registry. The platform processes millions of data points to help
              developers make informed decisions about JavaScript libraries and
              frameworks.
            </p>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">
                  Real-time Data
                </h3>
                <p className="text-sm">
                  Updated daily with the latest download statistics from NPM
                  registry, ensuring you have access to current trends and
                  patterns.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">
                  Interactive Charts
                </h3>
                <p className="text-sm">
                  Visualize download trends with customizable charts, compare
                  multiple packages side-by-side, and export data for your
                  reports.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">
                  Comprehensive Analysis
                </h3>
                <p className="text-sm">
                  Get insights into package popularity, growth rates, version
                  adoption, and community engagement metrics from GitHub.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="text-center">
          <h2 className="mb-4 text-2xl font-semibold">
            Perfect for Developers & Teams
          </h2>
          <div className="mx-auto max-w-4xl text-muted-foreground">
            <p className="mb-6">
              Whether you&apos;re choosing between React and Vue, evaluating
              testing frameworks, or researching the latest JavaScript tools,
              Package Pulse provides the data-driven insights you need to make
              confident technology decisions.
            </p>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-lg border p-4">
                <h3 className="mb-2 font-semibold text-foreground">
                  Technology Selection
                </h3>
                <p className="text-sm">
                  Compare competing libraries and frameworks to choose the most
                  suitable option for your project based on popularity and
                  community adoption.
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <h3 className="mb-2 font-semibold text-foreground">
                  Trend Analysis
                </h3>
                <p className="text-sm">
                  Identify emerging technologies, track the decline of legacy
                  packages, and stay ahead of industry trends with comprehensive
                  download data.
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <h3 className="mb-2 font-semibold text-foreground">
                  Corporate Usage Insights
                </h3>
                <p className="text-sm">
                  Identify corporate usage patterns with the Break Drop
                  indicator, analyzing download trends during weekends and
                  holidays.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
