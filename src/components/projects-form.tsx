"use client";
import fetchNPMDownloads, { DATE_FORMAT } from "@/api/fetchNPMDownloads";
import LocalStorageKey from "@/lib/enums/LocalStorageKey";
import useLocalStorage from "@/lib/hooks/useLocalStorage";
import getChartConfig from "@/lib/utils/getChartConfig";
import getLocalStorageValue from "@/lib/utils/getLocalStorageValue";
import { groupByWeeks } from "@/lib/utils/groupByPeriod";
import prepareChartData from "@/lib/utils/prepareChartData";
import sortByDate from "@/lib/utils/sortByDate";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueries } from "@tanstack/react-query";
import { format } from "date-fns";
import { useMemo } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { ComboboxForm } from "./combobox-form";
import {
  ProjectsSearchFormSchema,
  ProjectsSearchFormValues,
} from "./projects-form/utils";
import ProjectsStatsTable from "./stats-table";
import MultipleLineChart from "./ui/line-chart";

const ProjectsForm = () => {
  const projectsSearchForm = useForm<ProjectsSearchFormValues>({
    resolver: zodResolver(ProjectsSearchFormSchema),
    defaultValues: ProjectsSearchFormSchema.parse({
      search: "",
      projects: getLocalStorageValue(
        LocalStorageKey.SELECTED_PROJECTS,
        ProjectsSearchFormSchema.shape.projects,
      ),
    }),
  });
  const selectedProjects = projectsSearchForm.watch("projects");
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

  const chartConfig = useMemo(
    () => getChartConfig(selectedProjectsStats),
    [selectedProjectsStats],
  );

  const processedProjectsStats = useMemo(
    () => prepareChartData(selectedProjectsStats),
    [selectedProjectsStats],
  );

  return (
    <FormProvider {...projectsSearchForm}>
      <ComboboxForm />

      <div className="w-full h-full mt-8">
        <MultipleLineChart data={processedProjectsStats} config={chartConfig} />
      </div>

      <div className="w-full h-full mt-8">
        <h3 className="text-center">NPM downloads change by project</h3>
        <div className="mt-2">
          <ProjectsStatsTable projectsStats={selectedProjectsStats} />
        </div>
      </div>
    </FormProvider>
  );
};

export default ProjectsForm;
