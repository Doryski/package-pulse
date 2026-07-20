"use client";

import { Button } from "@/components/ui/button";
import { captureExceptionWithSearchParams } from "@/lib/utils/sentry-context";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureExceptionWithSearchParams(error);
  }, [error]);

  return (
    <div className="flex grow flex-col items-center justify-center gap-6 py-24 text-center">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          Something went wrong
        </h1>
        <p className="mx-auto max-w-md text-base text-muted-foreground">
          An unexpected error occurred while loading this page. You can try
          again, and if the problem persists, please come back later.
        </p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
