"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { setSentrySearchParamsContext } from "../utils/sentry-context";

/**
 * Hook that automatically updates Sentry context with current search params
 * Should be used in components that might have changing search params
 */
export function useSentrySearchParams() {
  const searchParams = useSearchParams();

  useEffect(() => {
    setSentrySearchParamsContext();
  }, [searchParams]);
}

export default useSentrySearchParams;
