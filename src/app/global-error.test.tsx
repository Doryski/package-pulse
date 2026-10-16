import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GlobalError from "./global-error";

const { captureExceptionWithSearchParams } = vi.hoisted(() => ({
  captureExceptionWithSearchParams: vi.fn(),
}));

vi.mock("@/lib/utils/sentry-context", () => ({
  captureExceptionWithSearchParams,
}));

vi.mock("next/error", () => ({
  default: ({ statusCode }: { statusCode: number }) => (
    <p>Next error page {statusCode}</p>
  ),
}));

const error = Object.assign(new Error("fatal"), { digest: "xyz" });

const renderGlobalError = () =>
  render(<GlobalError error={error} />, { container: document });

beforeEach(() => {
  captureExceptionWithSearchParams.mockClear();
});

describe("GlobalError", () => {
  it("renders the default Next error page with a generic status", () => {
    renderGlobalError();

    expect(screen.getByText("Next error page 0")).toBeInTheDocument();
  });

  it("reports the error to Sentry", () => {
    renderGlobalError();

    expect(captureExceptionWithSearchParams).toHaveBeenCalledExactlyOnceWith(
      error,
    );
  });
});
