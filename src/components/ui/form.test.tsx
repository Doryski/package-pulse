import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, test, vi } from "vitest";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./form";

type Values = { name: string; other: string };

const REQUIRED_MESSAGE = "Name is required";

type NameFormProps = { onRender?: () => void };

function NameForm({ onRender }: NameFormProps) {
  onRender?.();
  const form = useForm<Values>({
    defaultValues: { name: "", other: "" },
    mode: "onChange",
  });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(() => {})}>
        <FormField
          control={form.control}
          name="name"
          rules={{ required: REQUIRED_MESSAGE }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <input {...field} />
              </FormControl>
              <FormDescription>Your package name</FormDescription>
              <FormMessage>Fallback hint</FormMessage>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="other"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Other</FormLabel>
              <FormControl>
                <input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <button type="submit">Submit</button>
      </form>
    </Form>
  );
}

const setup = () => {
  const onRender = vi.fn();
  const user = userEvent.setup();
  render(<NameForm onRender={onRender} />);
  return { user, onRender, input: screen.getByLabelText("Name") };
};

describe("Form", () => {
  test("links the label, control and description by id", () => {
    const { input } = setup();
    const description = screen.getByText("Your package name");

    expect(input).toHaveAttribute("aria-invalid", "false");
    expect(input.getAttribute("aria-describedby")).toBe(description.id);
    expect(screen.getByText("Fallback hint")).toBeInTheDocument();
  });

  test("shows the field error and marks the control invalid", async () => {
    const { user, input } = setup();

    await user.click(screen.getByRole("button", { name: "Submit" }));

    const message = await screen.findByText(REQUIRED_MESSAGE);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toContain(message.id);
    expect(screen.getByText("Name")).toHaveClass("text-destructive");
    expect(screen.queryByText("Fallback hint")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Other")).toHaveAttribute(
      "aria-invalid",
      "false",
    );
  });

  test("typing does not re-render the form host", async () => {
    const { user, input, onRender } = setup();
    const rendersBefore = onRender.mock.calls.length;

    await user.type(input, "react");

    expect(input).toHaveValue("react");
    expect(onRender).toHaveBeenCalledTimes(rendersBefore);
  });

  test("re-renders an array field when one of its items gets an error", async () => {
    function TagsForm() {
      const form = useForm({ defaultValues: { tags: ["react", "vue"] } });
      return (
        <Form {...form}>
          <button
            type="button"
            onClick={() => form.setError("tags.1", { message: "Not found" })}
          >
            Fail vue
          </button>
          <FormField
            control={form.control}
            name="tags"
            render={({ field, formState }) => (
              <FormItem>
                {field.value.map((tag, index) => (
                  <span key={tag}>
                    {formState.errors.tags?.[index]?.message ?? tag}
                  </span>
                ))}
              </FormItem>
            )}
          />
        </Form>
      );
    }
    const user = userEvent.setup();
    render(<TagsForm />);

    await user.click(screen.getByRole("button", { name: "Fail vue" }));

    expect(screen.getByText("react")).toBeInTheDocument();
    expect(screen.getByText("Not found")).toBeInTheDocument();
  });
});
