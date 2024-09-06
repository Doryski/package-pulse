"use client";
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
import useBooleanState from "@/lib/hooks/useBooleanState";
import useDebounce from "@/lib/hooks/useDebounce";
import { cn } from "@/lib/utils/cn";
import { CheckIcon, Cross1Icon } from "@radix-ui/react-icons";
import { useQuery } from "@tanstack/react-query";
import { useFormContext } from "react-hook-form";
import { ProjectsSearchFormValues } from "./projects-form/utils";
import { Input } from "./ui/input";
import { List, ListEmpty, ListGroup, ListItem, ListLoading } from "./ui/list";

export function ComboboxForm() {
  const form = useFormContext<ProjectsSearchFormValues>();
  const [isPopoverOpen, openPopover, closePopover] = useBooleanState(false);

  const search = form.watch("search");
  const debouncedSearch = useDebounce(search, 400);
  const projects = useQuery({
    queryKey: ["projects", debouncedSearch],
    queryFn: () => searchNPMRegistry(debouncedSearch),
    enabled: !!debouncedSearch,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const selectedProjects = form.watch("projects");

  function onSubmit(data: ProjectsSearchFormValues) {
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
        selectedProjects.filter((project) => project !== projectName),
      );
    } else {
      form.setValue("projects", [...selectedProjects, projectName]);
    }
    form.setFocus("search");
  }

  const hasExceededSelectedProjectsLimit = selectedProjects.length >= 10;

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
          <div className="flex gap-2 items-center">
            <FormField
              control={form.control}
              name="search"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <Popover
                    open={isPopoverOpen}
                    onOpenChange={(isOpen) =>
                      isOpen ? openPopover() : closePopover()
                    }
                  >
                    <PopoverTrigger asChild>
                      <FormControl>
                        <div className="relative">
                          <FormLabel
                            className={cn(
                              "absolute -top-3 left-2 z-10 text-xs bg-background py-1 px-2 text-muted-foreground transition-all",
                              field.value ? "opacity-100" : "opacity-0",
                            )}
                            htmlFor={field.name}
                          >
                            Search project...
                          </FormLabel>
                          <Input
                            {...field}
                            id={field.name}
                            role="combobox"
                            placeholder="Search project..."
                            autoComplete="off"
                            className={cn(
                              "w-[200px] justify-between",
                              !field.value && "text-muted-foreground",
                            )}
                            autoFocus
                            onChangeCapture={() => {
                              if (field.value) {
                                form.setFocus("search");
                                openPopover();
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Tab") {
                                closePopover();
                              }
                            }}
                            disabled={hasExceededSelectedProjectsLimit}
                          />
                        </div>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent
                      className={cn(
                        "w-[200px] p-0",
                        !debouncedSearch && "hidden",
                      )}
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
                                    : "opacity-0",
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
            {hasExceededSelectedProjectsLimit && (
              <FormMessage className="text-xs text-destructive">
                You cannot select more than 10 projects
              </FormMessage>
            )}
          </div>

          <FormField
            control={form.control}
            name="projects"
            render={({ field }) => {
              return (
                <FormItem>
                  <div className="flex flex-wrap gap-2">
                    {field.value?.map((project) => (
                      <div
                        key={project}
                        className="flex gap-2 items-center px-2 py-1 bg-accent text-sm text-accent-foreground rounded-md"
                      >
                        <Cross1Icon
                          className="h-3 w-3 cursor-pointer"
                          onClick={() =>
                            form.setValue(
                              "projects",
                              field.value.filter((p) => p !== project),
                            )
                          }
                        />
                        {project}
                      </div>
                    ))}
                  </div>
                </FormItem>
              );
            }}
          />
        </form>
      </Form>
    </>
  );
}
