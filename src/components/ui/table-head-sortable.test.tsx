import { screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import TableHeadSortable, { SortColumnSchema } from "./table-head-sortable";

const renderHead = (
  props: Partial<React.ComponentProps<typeof TableHeadSortable>> = {},
) => {
  const handleSort = vi.fn();
  const result = renderWithProviders(
    <table>
      <thead>
        <tr>
          <TableHeadSortable
            column="weekly"
            handleSort={handleSort}
            isSorted={false}
            sortDirection="asc"
            {...props}
          >
            Weekly
          </TableHeadSortable>
        </tr>
      </thead>
    </table>,
  );
  return { ...result, handleSort };
};

describe("TableHeadSortable", () => {
  test("unsorted has aria-sort none and no arrow", () => {
    renderHead();
    const head = screen.getByRole("columnheader");
    expect(head).toHaveAttribute("aria-sort", "none");
    expect(head).toHaveAttribute("data-column-name", "weekly");
    expect(head).not.toHaveTextContent(/[▲▼]/);
  });

  test("sorted ascending shows up arrow", () => {
    renderHead({ isSorted: true, sortDirection: "asc" });
    const head = screen.getByRole("columnheader");
    expect(head).toHaveAttribute("aria-sort", "ascending");
    expect(head).toHaveTextContent("▲");
  });

  test("sorted descending shows down arrow", () => {
    renderHead({ isSorted: true, sortDirection: "desc" });
    const head = screen.getByRole("columnheader");
    expect(head).toHaveAttribute("aria-sort", "descending");
    expect(head).toHaveTextContent("▼");
  });

  test("click triggers sort", async () => {
    const { user, handleSort } = renderHead();
    await user.click(screen.getByRole("columnheader"));
    expect(handleSort).toHaveBeenCalledWith("weekly");
  });

  test("Enter and Space trigger sort, other keys do not", async () => {
    const { user, handleSort } = renderHead();
    screen.getByRole("columnheader").focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(handleSort).toHaveBeenCalledTimes(2);
    await user.keyboard("a");
    expect(handleSort).toHaveBeenCalledTimes(2);
  });

  test("renders tooltip when provided", async () => {
    const { user } = renderHead({ tooltip: "Weekly info" });
    const icon = screen.getByRole("columnheader").querySelector("svg");
    expect(icon).toBeInTheDocument();
    await user.hover(icon as Element);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Weekly info");
  });

  test("schema validates columns", () => {
    expect(SortColumnSchema.safeParse("monthly").success).toBe(true);
    expect(SortColumnSchema.safeParse("nope").success).toBe(false);
  });
});
