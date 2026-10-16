// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import {
  getSearchParamsContext,
  SENTRY_SHARED_OPTIONS,
  scrubRequestUrl,
} from "./lib/utils/sentry-context";

Sentry.init({
  ...SENTRY_SHARED_OPTIONS,

  beforeSend(event) {
    if (typeof window !== "undefined") {
      event.contexts = {
        ...event.contexts,
        searchParams: getSearchParamsContext(),
      };
    }
    return scrubRequestUrl(event);
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
