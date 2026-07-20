import { fetchPackageInfo } from "@/api/fetchPackageInfo";
import Loader from "@/components/loader";
import { SimpleTooltip } from "@/components/simple-tooltip";
import PulsatingDotIndicator from "@/components/ui/PulsatingDotIndicator";
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
import useGithubContributorsCount from "@/lib/queries/useGithubContributorsCount";
import useGithubPullRequestsCount from "@/lib/queries/useGithubPullRequestsCount";
import useBundleSize from "@/lib/queries/useBundleSize";
import useDepsDev from "@/lib/queries/useDepsDev";
import useGithubRepoInfo from "@/lib/queries/useGithubRepoInfo";
import usePackagesInfo from "@/lib/queries/usePackagesInfo";
import { formatLargeNumber } from "@/lib/utils/formatters";
import { round } from "@/lib/utils/math";
import { GitHubLogoIcon, HomeIcon } from "@radix-ui/react-icons";
import { UseQueryResult } from "@tanstack/react-query";
import { differenceInDays, formatDistanceToNow } from "date-fns";
import Image from "next/image";
import { memo } from "react";
import { useFormContext } from "react-hook-form";
import { formatDate } from "../utils/date-utils";
import { ProjectsSearchFormValues } from "./projects-form/schema";
import { ProjectNameCell } from "./projects-stats-table";

const getNpmLink = (projectName: string) =>
  `https://www.npmjs.com/package/${projectName}`;

const getPulsatingDotIndicatorColor = (lastReleaseDate: string | undefined) => {
  if (!lastReleaseDate) return "gray";
  const diff = differenceInDays(new Date(), new Date(lastReleaseDate));
  if (diff < 90) return "green";
  if (diff < 180) return "yellow";
  if (diff < 365) return "orange";
  return "red";
};

const getVulnSeverityColor = (count: number | undefined) => {
  if (count === undefined) return "gray";
  if (count === 0) return "green";
  if (count <= 2) return "yellow";
  if (count <= 5) return "orange";
  return "red";
};

const getHealthScoreColor = (score: number | undefined) => {
  if (score === undefined) return "gray";
  if (score >= 8) return "green";
  if (score >= 6) return "yellow";
  if (score >= 4) return "orange";
  return "red";
};

const getTreeShakeableColor = (treeShakeable: boolean) =>
  treeShakeable ? "green" : "gray";

const formatBundleBytes = (bytes: number | undefined) =>
  bytes === undefined ? " - " : `${formatLargeNumber(bytes)}B`;

const ProjectsInfoTable = memo(() => {
  const form = useFormContext<ProjectsSearchFormValues>();
  const selectedProjects = form.watch("projects");
  const packagesInfo = usePackagesInfo(selectedProjects);
  const bundleSizeResults = useBundleSize(selectedProjects);
  const depsDevResults = useDepsDev(selectedProjects);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="sticky left-0 z-20 w-[100px] min-w-[100px] md:w-[200px] md:min-w-[150px]">
            Project name
          </TableHead>
          <TableHead className="text-center">Last Release</TableHead>
          <TableHead className="text-center">Created</TableHead>
          <TableHead className="text-center">Stars</TableHead>
          <TableHead className="text-center">Issues</TableHead>
          <TableHead className="text-center">Pull Requests</TableHead>
          <TableHead className="text-center">Contributors Github</TableHead>
          <TableHead className="text-center">Contributors</TableHead>
          <TableHead className="min-w-[60px] text-center">Deps (Dev)</TableHead>
          <TableHead className="text-center">Latest Version</TableHead>
          <TableHead className="text-center">License</TableHead>
          <TableHead className="min-w-[120px] text-center">
            <SimpleTooltip
              content={
                <span className="block max-w-xs">
                  Minified and gzipped bundle size (bundlephobia). The dot shows
                  whether the package is tree-shakeable.
                </span>
              }
            >
              <span className="cursor-help">Bundle size</span>
            </SimpleTooltip>
          </TableHead>
          <TableHead className="text-center">
            <SimpleTooltip
              content={
                <span className="block max-w-xs">
                  Known security vulnerabilities reported by deps.dev. Green
                  (0), yellow (1-2), orange (3-5), red (&gt;5).
                </span>
              }
            >
              <span className="cursor-help">Vulnerabilities</span>
            </SimpleTooltip>
          </TableHead>
          <TableHead className="text-center">
            <SimpleTooltip
              content={
                <span className="block max-w-xs">
                  OpenSSF Scorecard health score (0-10) from deps.dev. Higher is
                  better.
                </span>
              }
            >
              <span className="cursor-help">Health</span>
            </SimpleTooltip>
          </TableHead>
          <TableHead className="text-center">Links</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {packagesInfo.map((npmPackage, index) => (
          <ProjectInfoRow
            key={`${npmPackage.data?.projectName}-${index}`}
            npmPackage={npmPackage}
            index={index}
            bundleSize={bundleSizeResults[index]}
            depsDev={depsDevResults[index]}
          />
        ))}
      </TableBody>
    </Table>
  );
});

ProjectsInfoTable.displayName = "ProjectsInfoTable";

export default ProjectsInfoTable;

type BundleSizeResult = ReturnType<typeof useBundleSize>[number];
type DepsDevResult = ReturnType<typeof useDepsDev>[number];

type ProjectInfoRowProps = {
  npmPackage: UseQueryResult<
    Awaited<ReturnType<typeof fetchPackageInfo>>,
    Error
  >;
  index: number;
  bundleSize?: BundleSizeResult;
  depsDev?: DepsDevResult;
};

const ProjectInfoRow = memo(
  ({ npmPackage, index, bundleSize, depsDev }: ProjectInfoRowProps) => {
    const githubRepo = useGithubRepoInfo(
      npmPackage.data?.repoName!,
      npmPackage.data?.projectName!,
    );

    const githubPullRequestsCount = useGithubPullRequestsCount(
      npmPackage.data?.repoName!,
      npmPackage.data?.projectName!,
      !!npmPackage.data?.repoName && !!githubRepo.data,
    );

    const githubContributorsCount = useGithubContributorsCount(
      npmPackage.data?.repoName!,
      npmPackage.data?.projectName!,
      !!npmPackage.data?.repoName && !!githubRepo.data,
    );

    return (
      <TableRow key={`${npmPackage.data?.projectName}-${index}`}>
        <ProjectNameCell
          isLoading={npmPackage.isLoading}
          projectName={npmPackage.data?.projectName ?? ""}
          index={index}
        />
        <TableCell className="flex items-center justify-between gap-1 text-center">
          <Loader
            isLoading={npmPackage.isLoading}
            fallback={<Skeleton className="h-4 w-full" />}
          >
            <div className="text-right">
              {npmPackage.data?.lastReleaseDate ? (
                <>
                  <div className="flex items-center gap-1">
                    <PulsatingDotIndicator
                      active={!!npmPackage.data?.lastReleaseDate}
                      color={getPulsatingDotIndicatorColor(
                        npmPackage.data?.lastReleaseDate,
                      )}
                    />
                    <span className="text-nowrap">
                      {formatDate(npmPackage.data.lastReleaseDate)}
                    </span>
                  </div>
                  <span className="text-nowrap">{`(${formatDistanceToNow(npmPackage.data.lastReleaseDate)} ago)`}</span>
                </>
              ) : (
                "-"
              )}
            </div>
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
                  {formatDate(npmPackage.data.createdAt)}
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
            isLoading={bundleSize?.isLoading ?? false}
            fallback={<Skeleton className="h-4 w-full" />}
          >
            {bundleSize?.data ? (
              <div className="flex flex-col items-center gap-1">
                <span className="text-nowrap">
                  {formatBundleBytes(bundleSize.data.size)} min
                </span>
                <span className="text-nowrap">
                  {formatBundleBytes(bundleSize.data.gzip)} gz
                </span>
                <SimpleTooltip
                  content={
                    <span>
                      {bundleSize.data.treeShakeable
                        ? "Tree-shakeable"
                        : "Not tree-shakeable"}
                    </span>
                  }
                >
                  <div className="flex items-center gap-1">
                    <PulsatingDotIndicator
                      active={false}
                      color={getTreeShakeableColor(
                        bundleSize.data.treeShakeable,
                      )}
                    />
                    <span className="text-nowrap">Tree-shake</span>
                  </div>
                </SimpleTooltip>
              </div>
            ) : (
              " - "
            )}
          </Loader>
        </TableCell>
        <TableCell className="text-center">
          <Loader
            isLoading={depsDev?.isLoading ?? false}
            fallback={<Skeleton className="h-4 w-full" />}
          >
            <div className="flex items-center justify-center gap-1">
              <PulsatingDotIndicator
                active={false}
                color={getVulnSeverityColor(depsDev?.data?.vulnerabilityCount)}
              />
              <span>{depsDev?.data?.vulnerabilityCount ?? " - "}</span>
            </div>
          </Loader>
        </TableCell>
        <TableCell className="text-center">
          <Loader
            isLoading={depsDev?.isLoading ?? false}
            fallback={<Skeleton className="h-4 w-full" />}
          >
            <div className="flex items-center justify-center gap-1">
              <PulsatingDotIndicator
                active={false}
                color={getHealthScoreColor(depsDev?.data?.healthScore)}
              />
              <span className="text-nowrap">
                {depsDev?.data?.healthScore !== undefined
                  ? `${round(depsDev.data.healthScore, 1)} / 10`
                  : " - "}
              </span>
            </div>
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
  },
);

ProjectInfoRow.displayName = "ProjectInfoRow";
