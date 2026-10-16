import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Loader from "./loader";

describe("Loader", () => {
  it("renders the fallback while loading", () => {
    render(
      <Loader isLoading fallback={<span>Loading…</span>}>
        <span>Content</span>
      </Loader>,
    );

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("Content")).not.toBeInTheDocument();
  });

  it("renders children once loading is done", () => {
    render(
      <Loader isLoading={false} fallback={<span>Loading…</span>}>
        <span>Content</span>
      </Loader>,
    );

    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
  });
});
