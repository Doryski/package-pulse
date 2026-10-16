import { act, screen, waitFor } from "@testing-library/react";
import { useFormContext } from "react-hook-form";
import { describe, expect, test, vi } from "vitest";
import { ProjectsSearchFormValues } from "@/app/(home)/components/projects-form/schema";
import { renderWithForm } from "@/test/render";
import { Combobox } from "./combobox";

type Option = { name: string };

const OPTIONS: Option[] = [
  { name: "react" },
  { name: "redux" },
  { name: "rxjs" },
];

type HarnessProps = {
  options?: Option[];
  isLoadingOptions?: boolean;
  disabled?: boolean;
  fullwidth?: boolean;
  onSelectItem?: (item: string) => void;
};

function Harness({
  options = OPTIONS,
  isLoadingOptions = false,
  disabled = false,
  fullwidth,
  onSelectItem = () => {},
}: HarnessProps) {
  const form = useFormContext<ProjectsSearchFormValues>();
  return (
    <Combobox
      form={form}
      disabled={disabled}
      options={options}
      isLoadingOptions={isLoadingOptions}
      fullwidth={fullwidth}
      onSelectItem={onSelectItem}
      optionValuePredicate={(option: Option) => option.name}
    />
  );
}

function setup(
  props: HarnessProps = {},
  defaults: Partial<ProjectsSearchFormValues> = {},
) {
  const onSelectItem = props.onSelectItem ?? vi.fn();
  const result = renderWithForm(
    <Harness {...props} onSelectItem={onSelectItem} />,
    defaults,
  );
  return { ...result, onSelectItem };
}

const getInput = () => screen.getByRole("combobox");

describe("Combobox", () => {
  test("renders an enabled, auto-focused search input", () => {
    setup();
    expect(getInput()).toBeEnabled();
    expect(getInput()).toHaveFocus();
    expect(getInput()).toHaveAttribute("placeholder", "Search projects...");
  });

  test("renders a disabled input when disabled", () => {
    setup({ disabled: true });
    expect(getInput()).toBeDisabled();
  });

  test("supports fullwidth layout", () => {
    setup({ fullwidth: true });
    expect(getInput()).toBeInTheDocument();
  });

  test("typing updates the form value and opens the popover with options", async () => {
    const { user, form } = setup();
    await user.type(getInput(), "re");
    expect(form.getValues("search")).toBe("re");
    expect(await screen.findAllByRole("option")).toHaveLength(3);
    expect(screen.getByRole("option", { name: "react" })).toBeInTheDocument();
  });

  test("shows the minimum characters hint for one character with no options", async () => {
    const { user } = setup({ options: [] });
    await user.type(getInput(), "r");
    expect(
      await screen.findByText("Type at least 2 characters to search"),
    ).toBeInTheDocument();
  });

  test("shows the empty message for longer searches with no options", async () => {
    const { user } = setup({ options: [] });
    await user.type(getInput(), "zzzz");
    expect(await screen.findByText("No project found.")).toBeInTheDocument();
  });

  test("loading state toggles the loading placeholder visibility", async () => {
    const { user } = setup({ isLoadingOptions: true });
    await user.type(getInput(), "re");
    await screen.findAllByRole("option");
    const loading = document.body.querySelector(".space-y-1");
    expect(loading).toHaveClass("block");
  });

  test("non-loading state hides the loading placeholder", async () => {
    const { user } = setup({ isLoadingOptions: false });
    await user.type(getInput(), "re");
    await screen.findAllByRole("option");
    expect(document.body.querySelector(".space-y-1")).toHaveClass("hidden");
  });

  test("clicking an option calls onSelectItem with its value", async () => {
    const { user, onSelectItem } = setup();
    await user.type(getInput(), "re");
    await user.click(await screen.findByRole("option", { name: "redux" }));
    expect(onSelectItem).toHaveBeenCalledWith("redux");
  });

  test("ArrowDown moves focus into the options and wraps to the first from the input", async () => {
    const { user } = setup();
    await user.type(getInput(), "re");
    await screen.findAllByRole("option");
    await user.keyboard("{ArrowDown}");
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveFocus();
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowDown}");
    expect(options[1]).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(options[2]).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(options[2]).toHaveFocus();
  });

  test("ArrowUp moves back through options and returns focus to the input", async () => {
    const { user } = setup();
    await user.type(getInput(), "re");
    await screen.findAllByRole("option");
    await user.keyboard("{ArrowDown}{ArrowDown}");
    const options = screen.getAllByRole("option");
    expect(options[1]).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(options[0]).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(getInput()).toHaveFocus();
    expect(options[0]).toHaveAttribute("aria-selected", "false");
  });

  test("ArrowDown from the input wraps to the first option after reaching the end", async () => {
    const { user } = setup();
    await user.type(getInput(), "re");
    await screen.findAllByRole("option");
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
    const options = screen.getAllByRole("option");
    act(() => getInput().focus());
    await user.keyboard("{ArrowDown}");
    expect(options[0]).toHaveFocus();
  });

  test("ArrowDown is ignored when the caret is not at the end of the input", async () => {
    const { user } = setup();
    await user.type(getInput(), "re");
    await screen.findAllByRole("option");
    await user.keyboard("{ArrowLeft}{ArrowDown}");
    expect(getInput()).toHaveFocus();
  });

  test("ArrowDown does nothing while the popover is closed", async () => {
    const { user } = setup();
    await user.keyboard("{ArrowDown}");
    expect(getInput()).toHaveFocus();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  test("Enter on a focused option selects it and closes the popover", async () => {
    const { user, onSelectItem } = setup();
    await user.type(getInput(), "re");
    await screen.findAllByRole("option");
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(onSelectItem).toHaveBeenCalledWith("redux");
    await waitFor(() =>
      expect(screen.queryAllByRole("option")).toHaveLength(0),
    );
  });

  test("other keys on an option are ignored", async () => {
    const { user, onSelectItem } = setup();
    await user.type(getInput(), "re");
    await screen.findAllByRole("option");
    await user.keyboard("{ArrowDown}a");
    expect(onSelectItem).not.toHaveBeenCalled();
  });

  test("Tab closes the popover", async () => {
    const { user } = setup();
    await user.type(getInput(), "re");
    await screen.findAllByRole("option");
    await user.keyboard("{Tab}");
    await waitFor(() =>
      expect(screen.queryAllByRole("option")).toHaveLength(0),
    );
  });

  test("Escape closes the popover", async () => {
    const { user } = setup();
    await user.type(getInput(), "re");
    await screen.findAllByRole("option");
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryAllByRole("option")).toHaveLength(0),
    );
  });

  test("typing the multi-search delimiter closes the popover", async () => {
    const { user } = setup();
    await user.type(getInput(), "re");
    await screen.findAllByRole("option");
    await user.type(getInput(), ",");
    await waitFor(() =>
      expect(screen.queryAllByRole("option")).toHaveLength(0),
    );
  });

  test("selected projects show a visible check icon", async () => {
    const { user } = setup({}, { projects: ["react"] });
    await user.type(getInput(), "re");
    const reactOption = await screen.findByRole("option", { name: "react" });
    const reduxOption = screen.getByRole("option", { name: "redux" });
    expect(reactOption.querySelector("svg")).toHaveClass("opacity-100");
    expect(reduxOption.querySelector("svg")).toHaveClass("opacity-0");
  });

  test("controlled default search value shows the floating label", () => {
    setup({}, { search: "vue" });
    expect(getInput()).toHaveValue("vue");
    expect(
      screen.getByText("Search projects...", { selector: "label" }),
    ).toHaveClass("opacity-100");
  });

  test("clearing the input hides the floating label", async () => {
    const { user } = setup();
    await user.type(getInput(), "r");
    await user.clear(getInput());
    expect(
      screen.getByText("Search projects...", { selector: "label" }),
    ).toHaveClass("opacity-0");
  });
});
