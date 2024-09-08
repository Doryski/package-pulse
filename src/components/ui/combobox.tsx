"use client";
import searchNPMRegistry from "@/api/searchNpmRegistry";
import { ProjectsSearchFormValues } from "@/app/(home)/components/projects-form/schema";
import { encodeProjectName } from "@/app/(home)/utils/search-params";
import {
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
import useBooleanState from "@/lib/hooks/useBooleanState";
import useDebounce from "@/lib/hooks/useDebounce";
import { cn } from "@/lib/utils/cn";
import { CheckIcon } from "@radix-ui/react-icons";
import { useQuery } from "@tanstack/react-query";
import { UseFormReturn } from "react-hook-form";
import { Input } from "./input";
import { List, ListEmpty, ListGroup, ListItem, ListLoading } from "./list";

type ComboboxProps = {
  form: UseFormReturn<ProjectsSearchFormValues>;
  disabled: boolean;
};

export function Combobox({ form, disabled }: ComboboxProps) {
  const [isPopoverOpen, openPopover, closePopover] = useBooleanState(false);

  const search = form.watch("search");
  const debouncedSearch = useDebounce(search, 400);
  const projects = useQuery({
    queryKey: ["projects", debouncedSearch],
    queryFn: () => searchNPMRegistry(debouncedSearch),
    enabled: !!debouncedSearch,
    staleTime: 5 * 60 * 1000,
  });

  const selectedProjects = form.watch("projects");

  function handleComboboxItemClick(projectName: string) {
    const encodedProjectName = encodeProjectName(projectName);
    console.log({ selectedProjects, encodedProjectName });

    if (selectedProjects.includes(encodedProjectName)) {
      form.setValue(
        "projects",
        selectedProjects.filter((project) => project !== encodedProjectName),
      );
    } else {
      form.setValue("projects", [...selectedProjects, encodedProjectName]);
    }
    form.setFocus("search");
  }

  return (
    <FormField
      control={form.control}
      name="search"
      disabled={disabled}
      render={({ field }) => (
        <FormItem className="w-full grow sm:w-auto sm:flex-initial">
          <Popover
            open={isPopoverOpen}
            onOpenChange={(isOpen) => (isOpen ? openPopover() : closePopover())}
          >
            <PopoverTrigger asChild>
              <FormControl>
                <div className="relative w-full sm:w-[600px]">
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
                      "w-[600px] justify-between",
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
                  />
                </div>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent
              className={cn(
                "w-full sm:w-[600px] p-0",
                !debouncedSearch && "hidden",
              )}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <ListGroup>
                <ListEmpty
                  className={projects.data?.length === 0 ? "block" : "hidden"}
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
                          form.watch("projects").includes(project.package.name)
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
  );
}
