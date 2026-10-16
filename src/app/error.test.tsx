import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ErrorPage from "./error";

const { captureExceptionWithSearchParams } = vi.hoisted(() => ({
  captureExceptionWithSearchParams: vi.fn(),
}));

vi.mock("@/lib/utils/sentry-context", () => ({
  captureExceptionWithSearchParams,
}));

const error = Object.assign(new Error("boom"), { digest: "abc" });

beforeEach(() => {
  captureExceptionWithSearchParams.mockClear();
});

describe("Route error page", () => {
  it("renders the error message", () => {
    render(<ErrorPage error={error} reset={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: "Something went wrong" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/An unexpected error occurred/),
    ).toBeInTheDocument();
  });

  it("reports the error to Sentry", () => {
    render(<ErrorPage error={error} reset={vi.fn()} />);

    expect(captureExceptionWithSearchParams).toHaveBeenCalledExactlyOnceWith(
      error,
    );
  });

  it("calls reset when Try again is clicked", async () => {
    const reset = vi.fn();
    const user = userEvent.setup();
    render(<ErrorPage error={error} reset={reset} />);

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(reset).toHaveBeenCalledTimes(1);
  });
});
