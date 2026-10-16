import { fetchDepsDev } from "@/api/fetchPackageInfo";
import { formatDate } from "@/app/(home)/utils/date-utils";
import { useQueries } from "@tanstack/react-query";
import { toZonedTime } from "date-fns-tz";
import usePackagesInfo from "./usePackagesInfo";

export default function useDepsDev(selectedProjects: string[]) {
  const todaysUtcDateString = formatDate(toZonedTime(new Date(), "UTC"));
  const packagesInfo = usePackagesInfo(selectedProjects);

  return useQueries({
    queries: selectedProjects.map((project, index) => {
      const version = packagesInfo[index]?.data?.latestVersion?.version;

      return {
        queryKey: ["depsDev", project, todaysUtcDateString],
        queryFn: () =>
          version ? fetchDepsDev(project, version) : Promise.resolve(null),
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        enabled: !!project && !!version,
      };
    }),
  });
}
