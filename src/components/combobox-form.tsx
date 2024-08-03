"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckIcon, Cross1Icon } from "@radix-ui/react-icons";
import { useForm } from "react-hook-form";
import { z } from "zod";

import searchNPMRegistry from "@/api/searchNpmRegistry";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/components/ui/use-toast";
import useBooleanState from "@/hooks/useBooleanState";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Input } from "./ui/input";
import { List, ListEmpty, ListGroup, ListItem, ListLoading } from "./ui/list";

const FormSchema = z.object({
  search: z
    .string({
      required_error: "Please enter a project.",
    })
    .default(""),
  projects: z.array(z.string()).default([]),
});

type ComboboxFormValues = z.infer<typeof FormSchema>;
export function ComboboxForm() {
  const [isInputFocused, focusInput, blurInput] = useBooleanState(false);
  const form = useForm<ComboboxFormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: FormSchema.parse({
      search: "",
      projects: [],
    }),
  });
  const search = form.watch("search");
  const projects = useQuery({
    queryKey: ["projects", search],
    queryFn: async () => {
      return searchNPMRegistry(search);
    },
  });
  const selectedProjects = form.watch("projects");

  function onSubmit(data: ComboboxFormValues) {
    toast({
      title: "You submitted the following values:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
    });
  }

  function handleComboboxItemClick(projectName: string) {
    if (selectedProjects.includes(projectName)) {
      form.setValue(
        "projects",
        selectedProjects.filter((project) => project !== projectName)
      );
    } else {
      form.setValue("projects", [...selectedProjects, projectName]);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="search"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <Popover
                open={isInputFocused}
                onOpenChange={(isOpen) => (isOpen ? focusInput() : blurInput())}
              >
                <PopoverTrigger asChild>
                  <FormControl>
                    <div className="relative">
                      <FormLabel
                        className={cn(
                          "absolute -top-3 left-2 text-xs bg-background py-1 px-2 text-muted-foreground transition-all",
                          field.value ? "opacity-100" : "opacity-0"
                        )}
                      >
                        Search project...
                      </FormLabel>
                      <Input
                        role="combobox"
                        placeholder="Search project..."
                        autoComplete="off"
                        className={cn(
                          "w-[200px] justify-between",
                          !field.value && "text-muted-foreground"
                        )}
                        onChangeCapture={() => field.value && focusInput()}
                        {...field}
                      />
                    </div>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[200px] p-0"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <ListGroup>
                    <ListEmpty
                      className={
                        projects.data?.length === 0 ? "block" : "hidden"
                      }
                    >
                      No project found.
                    </ListEmpty>
                    <ListLoading
                      className={projects.isLoading ? "block" : "hidden"}
                    />
                    <List>
                      {projects.data?.map((project) => (
                        <ListItem
                          key={project.package.name}
                          onClick={() =>
                            handleComboboxItemClick(project.package.name)
                          }
                        >
                          {project.package.name}
                          <CheckIcon
                            className={cn(
                              "ml-auto h-4 w-4",
                              form
                                .watch("projects")
                                .includes(project.package.name)
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </ListGroup>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="projects"
          render={({ field }) => {
            console.log(field.value);
            return (
              <FormItem>
                <div className="flex flex-wrap gap-2">
                  {field.value?.map((project) => (
                    <div
                      key={project}
                      className="flex items-center px-2 py-1 bg-accent text-sm text-accent-foreground rounded-md"
                    >
                      {project}
                      <Cross1Icon
                        className="h-3 w-3 ml-2 cursor-pointer"
                        onClick={() =>
                          form.setValue(
                            "projects",
                            field.value.filter((p) => p !== project)
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              </FormItem>
            );
          }}
        />
      </form>
    </Form>
  );
}
