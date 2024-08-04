"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckIcon, Cross1Icon } from "@radix-ui/react-icons";
import { useForm } from "react-hook-form";
import { z } from "zod";

import fetchNPMDownloads, { DATE_FORMAT } from "@/api/fetchNPMDownloads";
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
import LocalStorageKey from "@/lib/enums/LocalStorageKey";
import useBooleanState from "@/lib/hooks/useBooleanState";
import useDebounce from "@/lib/hooks/useDebounce";
import useLocalStorage from "@/lib/hooks/useLocalStorage";
import { cn } from "@/lib/utils/cn";
import formatCellValue from "@/lib/utils/formatCellValue";
import formatInteger from "@/lib/utils/formatNominal";
import formatPercentage from "@/lib/utils/formatPercentage";
import getChartConfig from "@/lib/utils/getChartConfig";
import getLocalStorageValue from "@/lib/utils/getLocalStorageValue";
import getStatsMatrix from "@/lib/utils/getStatsMatrix";
import { groupByWeeks } from "@/lib/utils/groupByPeriod";
import prepareChartData from "@/lib/utils/prepareChartData";
import sortByDate from "@/lib/utils/sortByDate";
import { useQueries, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useMemo } from "react";
import { Input } from "./ui/input";
import MultipleLineChart from "./ui/line-chart";
import { List, ListEmpty, ListGroup, ListItem, ListLoading } from "./ui/list";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

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
  const [isPopoverOpen, openPopover, closePopover] = useBooleanState(false);
  const form = useForm<ComboboxFormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: FormSchema.parse({
      search: "",
      projects: getLocalStorageValue(
        LocalStorageKey.SELECTED_PROJECTS,
        FormSchema.shape.projects,
      ),
    }),
  });
  const search = form.watch("search");
  const debouncedSearch = useDebounce(search, 400);
  const projects = useQuery({
    queryKey: ["projects", debouncedSearch],
    queryFn: () => searchNPMRegistry(debouncedSearch),
    enabled: !!debouncedSearch,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const selectedProjects = form.watch("projects");
  useLocalStorage(LocalStorageKey.SELECTED_PROJECTS, selectedProjects);

  const selectedProjectsStats = useQueries({
    queries: selectedProjects.map((projectName) => {
      return {
        queryKey: [
          "project-stats",
          projectName,
          format(new Date(), DATE_FORMAT),
        ],
        queryFn: async () => {
          const sortedDownloads = sortByDate(
            await fetchNPMDownloads(projectName),
          ).slice(0, -1);
          const groupedDownloads = groupByWeeks(sortedDownloads);

          return {
            projectName,
            groupedByWeekData: groupedDownloads,
            rawSortedData: sortedDownloads,
          };
        },
      };
    }),
  });

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
        selectedProjects.filter((project) => project !== projectName),
      );
    } else {
      form.setValue("projects", [...selectedProjects, projectName]);
    }
    form.setFocus("search");
  }

  const chartConfig = useMemo(
    () => getChartConfig(selectedProjectsStats),
    [selectedProjectsStats],
  );

  const processedProjectsStats = useMemo(
    () => prepareChartData(selectedProjectsStats),
    [selectedProjectsStats],
  );
  const hasExceededSelectedProjectsLimit = selectedProjects.length >= 10;

  const processedProjectsTableStats = useMemo(
    () => getStatsMatrix(selectedProjectsStats),
    [selectedProjectsStats],
  );

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
            {/* message "You cannot select more than 10 projects" */}
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

      <div className="w-full h-full mt-8">
        <MultipleLineChart data={processedProjectsStats} config={chartConfig} />
      </div>

      <div className="w-full h-full mt-8">
        <h3 className="text-center">NPM downloads change by project</h3>
        <div className="mt-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Project name</TableHead>
                <TableHead className="text-center">Weekly</TableHead>
                <TableHead className="text-center">Monthly</TableHead>
                <TableHead className="text-center">Yearly</TableHead>
                <TableHead className="text-center">
                  Today vs a year ago
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedProjectsTableStats.map((projectStats) => (
                <TableRow key={projectStats.projectName}>
                  <TableCell>{projectStats.projectName}</TableCell>
                  <TableCell className="text-center">
                    <span>
                      {formatCellValue(
                        projectStats.weeklyChange?.nominal,
                        formatInteger,
                      )}
                    </span>
                    <br />
                    <span>
                      {formatCellValue(
                        projectStats.weeklyChange?.percentage,
                        formatPercentage,
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span>
                      {formatCellValue(
                        projectStats.monthlyChange?.nominal,
                        formatInteger,
                      )}
                    </span>
                    <br />
                    <span>
                      {formatCellValue(
                        projectStats.monthlyChange?.percentage,
                        formatPercentage,
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span>
                      {formatCellValue(
                        projectStats.yearlyChange?.nominal,
                        formatInteger,
                      )}
                    </span>
                    <br />
                    <span>
                      {formatCellValue(
                        projectStats.yearlyChange?.percentage,
                        formatPercentage,
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span>
                      {formatCellValue(
                        projectStats.oneYearAgoChange?.nominal,
                        formatInteger,
                      )}
                    </span>
                    <br />
                    <span>
                      {formatCellValue(
                        projectStats.oneYearAgoChange?.percentage,
                        formatPercentage,
                      )}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
