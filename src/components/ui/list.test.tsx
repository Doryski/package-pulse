import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import {
  List,
  ListEmpty,
  ListGroup,
  ListItem,
  ListLoading,
  ListSeparator,
} from "./list";

describe("List", () => {
  test("renders list with items and merges classes", () => {
    render(
      <List className="extra">
        <ListItem>First</ListItem>
        <ListItem>Second</ListItem>
      </List>,
    );
    expect(screen.getByRole("list")).toHaveClass("extra");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  test("renders empty, group and separator", () => {
    render(
      <>
        <ListEmpty>Nothing</ListEmpty>
        <ListGroup data-testid="group">Group</ListGroup>
        <ListSeparator data-testid="sep" />
      </>,
    );
    expect(screen.getByText("Nothing")).toBeInTheDocument();
    expect(screen.getByTestId("group")).toHaveTextContent("Group");
    expect(screen.getByTestId("sep")).toHaveClass("h-px");
  });

  test("ListLoading renders 3 skeletons by default", () => {
    render(<ListLoading data-testid="loading" />);
    expect(screen.getByTestId("loading").children).toHaveLength(3);
  });

  test("ListLoading respects length and itemClassName", () => {
    render(
      <ListLoading data-testid="loading" length={5} itemClassName="h-2" />,
    );
    expect(screen.getByTestId("loading").children).toHaveLength(5);
  });
});
