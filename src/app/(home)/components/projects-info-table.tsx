import { DATE_FORMAT } from "@/api/fetchNPMDownloads";
import {
  fetchContributorsCount,
  fetchGithubPullRequestsCount,
  fetchGithubRepoInfo,
  fetchPackageInfo,
} from "@/api/fetchPackageInfo";
import Loader from "@/components/loader";
import { SimpleTooltip } from "@/components/simple-tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import TextLink from "@/components/ui/text-link";
import usePackagesInfo from "@/lib/queries/usePackagesInfo";
import getChartColor from "@/lib/utils/getChartColor";
import { GitHubLogoIcon, HomeIcon } from "@radix-ui/react-icons";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { useTheme } from "next-themes";
import Image from "next/image";
import { useFormContext } from "react-hook-form";
import ReactMarkdown from "react-markdown";
import { ProjectsSearchFormValues } from "./projects-form/schema";
import { ProjectNameCell } from "./projects-stats-table";

const getNpmLink = (projectName: string) =>
  `https://www.npmjs.com/package/${projectName}`;

export default function ProjectsInfoTable() {
  const form = useFormContext<ProjectsSearchFormValues>();
  const selectedProjects = form.watch("projects");
  const packagesInfo = usePackagesInfo(selectedProjects);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Project</TableHead>
          <TableHead className="text-center">Last Release</TableHead>
          <TableHead className="text-center">Created</TableHead>
          <TableHead className="text-center">Stars</TableHead>
          <TableHead className="text-center">Issues</TableHead>
          <TableHead className="text-center">Pull Requests</TableHead>
          <TableHead className="text-center">Contributors Github</TableHead>
          <TableHead className="text-center">Contributors</TableHead>
          <TableHead className="text-center">Deps (Dev)</TableHead>
          <TableHead className="text-center">Latest Version</TableHead>
          <TableHead className="text-center">License</TableHead>
          <TableHead className="text-center">Library size</TableHead>
          <TableHead className="text-center">Links</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {packagesInfo.map((npmPackage, index) => (
          <ProjectInfoRow
            key={`${npmPackage.data?.projectName}-${index}`}
            npmPackage={npmPackage}
            index={index}
          />
        ))}
      </TableBody>
    </Table>
  );
}

type ProjectInfoRowProps = {
  npmPackage: UseQueryResult<
    Awaited<ReturnType<typeof fetchPackageInfo>>,
    Error
  >;
  index: number;
};

function ProjectInfoRow({ npmPackage, index }: ProjectInfoRowProps) {
  const { resolvedTheme } = useTheme();

  const githubRepo = useQuery({
    enabled: !!npmPackage.data?.repoName,
    queryKey: ["githubReposInfo", npmPackage.data?.repoName!],
    queryFn: async () => ({
      info: await fetchGithubRepoInfo(npmPackage.data?.repoName!),
      name: npmPackage.data?.projectName,
    }),
    retry: false,
  });

  const githubPullRequestsCount = useQuery({
    enabled: !!npmPackage.data?.repoName,
    queryKey: ["githubPullRequestsCount", npmPackage.data?.repoName!],
    queryFn: async () => ({
      count: await fetchGithubPullRequestsCount(npmPackage.data?.repoName!),
      name: npmPackage.data?.projectName,
    }),
    retry: false,
  });

  const githubContributorsCount = useQuery({
    enabled: !!npmPackage.data?.repoName,
    queryKey: ["githubContributorsCount", npmPackage.data?.repoName!],
    queryFn: async () => ({
      count: await fetchContributorsCount(npmPackage.data?.repoName!),
      name: npmPackage.data?.projectName,
    }),
    retry: false,
  });

  return (
    <TableRow key={`${npmPackage.data?.projectName}-${index}`}>
      <ProjectNameCell
        isLoading={npmPackage.isLoading}
        projectName={npmPackage.data?.projectName ?? ""}
        color={getChartColor(resolvedTheme, index)}
      />
      <TableCell className="text-center">
        <Loader
          isLoading={npmPackage.isLoading}
          fallback={<Skeleton className="h-4 w-full" />}
        >
          {npmPackage.data?.lastReleaseDate ? (
            <>
              <span className="text-nowrap">
                {format(npmPackage.data.lastReleaseDate, DATE_FORMAT)}
              </span>
              <br />
              <span className="text-nowrap">{`(${formatDistanceToNow(npmPackage.data.lastReleaseDate)} ago)`}</span>
            </>
          ) : (
            "-"
          )}
        </Loader>
      </TableCell>
      <TableCell className="text-center">
        <Loader
          isLoading={npmPackage.isLoading}
          fallback={<Skeleton className="h-4 w-full" />}
        >
          {npmPackage.data?.createdAt ? (
            <>
              <span className="text-nowrap">
                {format(npmPackage.data.createdAt, DATE_FORMAT)}
              </span>
              <br />
              <span className="text-nowrap">{`(${formatDistanceToNow(npmPackage.data.createdAt)} ago)`}</span>
            </>
          ) : (
            "-"
          )}
        </Loader>
      </TableCell>
      <TableCell className="text-center">
        <Loader isLoading={githubRepo.isLoading} fallback={<Skeleton />}>
          {githubRepo?.data?.info?.stargazers_count ?? " - "}
        </Loader>
      </TableCell>
      <TableCell className="text-center">
        <Loader
          isLoading={githubRepo.isLoading}
          fallback={<Skeleton className="h-4 w-full" />}
        >
          {githubRepo?.data?.info?.open_issues_count ?? " - "}
        </Loader>
      </TableCell>
      <TableCell className="text-center">
        <Loader
          isLoading={githubPullRequestsCount.isLoading}
          fallback={<Skeleton className="h-4 w-full" />}
        >
          {githubPullRequestsCount?.data?.count ?? " - "}
        </Loader>
      </TableCell>
      <TableCell className="text-center">
        <Loader
          isLoading={githubContributorsCount.isLoading}
          fallback={<Skeleton className="h-4 w-full" />}
        >
          {githubContributorsCount?.data?.count ?? " - "}
        </Loader>
      </TableCell>
      <TableCell className="text-center">
        <Loader
          isLoading={npmPackage.isLoading}
          fallback={<Skeleton className="h-4 w-full" />}
        >
          {npmPackage.data?.contributorsCount}
        </Loader>
      </TableCell>
      <TableCell className="text-center">
        <Loader
          isLoading={npmPackage.isLoading}
          fallback={<Skeleton className="h-4 w-full" />}
        >
          {npmPackage.data?.dependenciesCount ?? " - "} (
          {npmPackage.data?.devDependenciesCount ?? " - "})
        </Loader>
      </TableCell>
      <TableCell className="text-center">
        <Loader
          isLoading={npmPackage.isLoading}
          fallback={<Skeleton className="h-4 w-full" />}
        >
          {npmPackage.data?.latestVersion?.version}
        </Loader>
      </TableCell>
      <TableCell className="text-center">
        <Loader
          isLoading={npmPackage.isLoading}
          fallback={<Skeleton className="h-4 w-full" />}
        >
          {npmPackage.data?.license}
        </Loader>
      </TableCell>
      <TableCell className="text-center">
        <Loader
          isLoading={npmPackage.isLoading}
          fallback={<Skeleton className="h-4 w-full" />}
        >
          <ReactMarkdown>{`[![install size](https://packagephobia.com/badge?p=${npmPackage.data?.projectName})](https://packagephobia.com/result?p=${npmPackage.data?.projectName})`}</ReactMarkdown>
        </Loader>
      </TableCell>
      <TableCell>
        <Loader
          isLoading={npmPackage.isLoading}
          fallback={<Skeleton className="h-4 w-full" />}
        >
          <div className="flex items-center gap-2">
            {npmPackage.data?.homepage && (
              <SimpleTooltip content={<span>Homepage</span>}>
                <TextLink href={npmPackage.data?.homepage} outside>
                  <HomeIcon className="size-5" />
                </TextLink>
              </SimpleTooltip>
            )}
            {npmPackage.data?.projectName && (
              <SimpleTooltip content={<span>NPM package site</span>}>
                <TextLink
                  href={getNpmLink(npmPackage.data?.projectName)}
                  outside
                >
                  <Image
                    src="/images/npm-logo.svg"
                    alt="NPM Logo"
                    width={20}
                    height={20}
                    className="size-5 min-w-5"
                  />
                </TextLink>
              </SimpleTooltip>
            )}
            {npmPackage.data?.repositoryUrl && (
              <SimpleTooltip content={<span>GitHub repository</span>}>
                <TextLink
                  href={npmPackage.data?.repositoryUrl}
                  outside
                  className="text-white"
                >
                  <GitHubLogoIcon className="size-5" />
                </TextLink>
              </SimpleTooltip>
            )}
          </div>
        </Loader>
      </TableCell>
    </TableRow>
  );
}
