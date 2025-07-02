// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { getSearchParamsContextFromUrl } from "./src/lib/utils/sentry-context";

Sentry.init({
  dsn: "https://1e370265741031c93d8e072603c36fe3@o4509277242458112.ingest.de.sentry.io/4509277245145168",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  beforeSend(event) {
    const url =
      event.request?.url || event.contexts?.trace?.data?.url || event.tags?.url;

    if (url && typeof url === "string") {
      event.contexts = {
        ...event.contexts,
        searchParams: getSearchParamsContextFromUrl(url),
      };
    }
    return event;
  },
});
