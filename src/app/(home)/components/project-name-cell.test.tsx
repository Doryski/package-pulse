import { renderWithProviders } from "@/test/render";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ProjectNameCell,
  STICKY_NAME_CELL_CLASS_NAME,
} from "./project-name-cell";

type CellProps = Omit<
  Parameters<typeof ProjectNameCell>[0],
  "projectName" | "index" | "color"
>;

const renderCell = (props: CellProps = {}) =>
  renderWithProviders(
    <table>
      <tbody>
        <tr>
          <ProjectNameCell projectName="react" index={0} {...props} />
        </tr>
      </tbody>
    </table>,
  );

describe("ProjectNameCell", () => {
  it("shows the project name in a sticky cell", () => {
    renderCell();

    const cell = screen.getByRole("cell");
    expect(cell).toHaveTextContent("react");
    expect(cell).toHaveClass(...STICKY_NAME_CELL_CLASS_NAME.split(" "));
    expect(cell).not.toHaveAttribute("title");
  });

  it("shows a hidden skeleton while loading", () => {
    renderCell({ isLoading: true });

    const cell = screen.getByRole("cell");
    expect(cell).not.toHaveTextContent("react");
    expect(cell.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it("merges a custom className", () => {
    renderCell({ className: "cursor-pointer" });

    expect(screen.getByRole("cell")).toHaveClass("cursor-pointer", "sticky");
  });

  it("renders children next to the name and forwards title", () => {
    renderCell({
      title: "Unavailable",
      children: <span className="sr-only">Unavailable</span>,
    });

    const cell = screen.getByRole("cell");
    expect(cell).toHaveAttribute("title", "Unavailable");
    expect(screen.getByText("Unavailable")).toHaveClass("sr-only");
  });
});
