import { TooltipProvider } from "@/components/ui/tooltip";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SimpleTooltip, SimpleTooltipProps } from "./simple-tooltip";

const renderTooltip = (props: Partial<SimpleTooltipProps> = {}) =>
  render(
    <TooltipProvider>
      <SimpleTooltip content="Tooltip text" open {...props}>
        <button type="button">Trigger</button>
      </SimpleTooltip>
    </TooltipProvider>,
  );

describe("SimpleTooltip", () => {
  it("renders the trigger and the default variant content", () => {
    renderTooltip();

    expect(screen.getByRole("button", { name: "Trigger" })).toBeInTheDocument();
    expect(screen.getByRole("tooltip")).toHaveTextContent("Tooltip text");
    expect(screen.getByRole("tooltip")).not.toHaveClass("bg-destructive");
  });

  it("applies the error variant classes", () => {
    renderTooltip({ variant: "error" });

    expect(screen.getByRole("tooltip")).toHaveClass(
      "bg-destructive",
      "text-destructive-foreground",
    );
  });

  it("does not render content when closed", () => {
    renderTooltip({ open: false });

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
