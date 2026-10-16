import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import TableCellWithStats from "./table-cell-with-stats";

const renderCell = (
  change: React.ComponentProps<typeof TableCellWithStats>["change"],
) =>
  render(
    <table>
      <tbody>
        <tr>
          <TableCellWithStats change={change} />
        </tr>
      </tbody>
    </table>,
  );

describe("TableCellWithStats", () => {
  test("renders dashes and no arrow for null change", () => {
    renderCell(null);
    expect(screen.getAllByText("-")).toHaveLength(2);
    expect(screen.queryByText(/[↑↓]/)).toBeNull();
  });

  test("renders values and up arrow for positive change", () => {
    renderCell({ nominal: 1500, percentage: 12.5 });
    expect(screen.getByRole("cell")).toHaveTextContent("↑");
    expect(
      screen.getByRole("cell").querySelector('[data-value-type="nominal"]'),
    ).not.toHaveTextContent("-");
  });

  test("renders down arrow for negative change", () => {
    renderCell({ nominal: -10, percentage: -5 });
    expect(screen.getByRole("cell")).toHaveTextContent("↓");
  });
});
