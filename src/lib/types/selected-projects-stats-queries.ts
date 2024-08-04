import { UseQueryResult } from "@tanstack/react-query";

export type SelectedProjectsStatsQueries = UseQueryResult<
  {
    projectName: string;
    groupedByWeekData: {
      date: string;
      count: number;
    }[];
    rawSortedData: {
      date: string;
      count: number;
    }[];
  },
  Error
>[];
