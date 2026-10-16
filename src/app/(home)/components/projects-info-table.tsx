import type { PackageInfo } from "@/api/packageData";
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
import { isAppError } from "@/lib/utils/AppError";
import { formatLargeNumber } from "@/lib/utils/formatters";
import { round } from "@/lib/utils/math";
import safeExternalUrl from "@/lib/utils/safeExternalUrl";
import { GithubIcon } from "@/components/icons/brand-icons";
import { House } from "lucide-react";
import { UseQueryResult } from "@tanstack/react-query";
import { differenceInDays, formatDistanceToNow } from "date-fns";
import Image from "next/image";
import { memo } from "react";
import { useWatch } from "react-hook-form";
import { formatDate } from "../utils/date-utils";
import { ProjectNameCell } from "./project-name-cell";
import { ProjectsSearchFormValues } from "./projects-form/schema";
import { STICKY_HEAD_CLASS_NAME } from "./stats-table-columns";

const getNpmLink = (projectName: string) =>
  `https://www.npmjs.com/package/${projectName}`;

const getPulsatingDotIndicatorColor = (lastReleaseDate: string | null) => {
  if (!lastReleaseDate) return "gray";
  const diff = differenceInDays(new Date(), new Date(lastReleaseDate));
  if (diff < 90) return "green";
  if (diff < 180) return "yellow";
  if (diff < 365) return "orange";
  return "red";
};

const getVulnSeverityColor = (count: number | null | undefined) => {
  if (count === null || count === undefined) return "gray";
  if (count === 0) return "green";
  if (count <= 2) return "yellow";
  if (count <= 5) return "orange";
  return "red";
};

const getHealthScoreColor = (score: number | null | undefined) => {
  if (score === null || score === undefined) return "gray";
  if (score >= 8) return "green";
  if (score >= 6) return "yellow";
  if (score >= 4) return "orange";
  return "red";
};

const getTreeShakeableColor = (treeShakeable: boolean) =>
  treeShakeable ? "green" : "gray";

const formatBundleBytes = (bytes: number | null) =>
  bytes === null ? " - " : `${formatLargeNumber(bytes)}B`;

const HTTP_STATUS = {
  notFound: 404,
  tooManyRequests: 429,
} as const;

const ROW_STATUS = {
  loading: "loading",
  ready: "ready",
  notFound: "notFound",
  unavailable: "unavailable",
  rateLimited: "rateLimited",
} as const;

type RowStatus = (typeof ROW_STATUS)[keyof typeof ROW_STATUS];

const ROW_STATUS_NOTES = {
  unavailable: "Unavailable",
  rateLimited: "Unavailable (rate limited)",
} as const satisfies Partial<Record<RowStatus, string>>;

const NOT_FOUND_TEXT = "Not found on npm";

const INFO_COLUMN_COUNT = 15;

const STATUS_BY_HTTP_STATUS = new Map<number | undefined, RowStatus>([
  [HTTP_STATUS.notFound, ROW_STATUS.notFound],
  [HTTP_STATUS.tooManyRequests, ROW_STATUS.rateLimited],
]);

type PackageInfoQuery = UseQueryResult<PackageInfo, Error>;

const getErrorStatus = (error: Error | null) =>
  isAppError(error) ? error.status : undefined;

const getRowStatus = (query: PackageInfoQuery | undefined): RowStatus => {
  if (query?.isLoading) return ROW_STATUS.loading;
  if (!query?.isError) return ROW_STATUS.ready;
  return (
    STATUS_BY_HTTP_STATUS.get(getErrorStatus(query.error)) ??
    ROW_STATUS.unavailable
  );
};

const getRowStatusNote = (status: RowStatus) => {
  if (status === ROW_STATUS.unavailable || status === ROW_STATUS.rateLimited) {
    return ROW_STATUS_NOTES[status];
  }
  return undefined;
};

const CellSkeleton = () => <Skeleton aria-hidden className="h-4 w-full" />;

const ProjectsInfoTable = memo(() => {
  const selectedProjects = useWatch<ProjectsSearchFormValues, "projects">({
    name: "projects",
  });
  const packagesInfo = usePackagesInfo(selectedProjects);
  const bundleSizeResults = useBundleSize(selectedProjects);
  const depsDevResults = useDepsDev(selectedProjects);

  return (
    <Table
      aria-busy={packagesInfo.some((query) => query.isLoading) || undefined}
    >
      <TableHeader>
        <TableRow>
          <TableHead className={STICKY_HEAD_CLASS_NAME}>Project name</TableHead>
          <TableHead className="text-center">Last Release</TableHead>
          <TableHead className="text-center">Created</TableHead>
          <TableHead className="text-center">Stars</TableHead>
          <TableHead className="text-center">Issues</TableHead>
          <TableHead className="text-center">Pull Requests</TableHead>
          <TableHead className="text-center">Contributors Github</TableHead>
          <TableHead className="text-center">Contributors</TableHead>
          <TableHead className="min-w-15 text-center">Deps (Dev)</TableHead>
          <TableHead className="text-center">Latest Version</TableHead>
          <TableHead className="text-center">License</TableHead>
          <TableHead className="min-w-30 text-center">
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
        {selectedProjects.map((projectName, index) => (
          <ProjectInfoRow
            key={projectName}
            projectName={projectName}
            npmPackage={packagesInfo[index]}
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
  projectName: string;
  npmPackage?: PackageInfoQuery;
  index: number;
  bundleSize?: BundleSizeResult;
  depsDev?: DepsDevResult;
};

const ProjectInfoRow = memo(
  ({
    projectName,
    npmPackage,
    index,
    bundleSize,
    depsDev,
  }: ProjectInfoRowProps) => {
    const status = getRowStatus(npmPackage);
    if (status === ROW_STATUS.notFound) {
      return (
        <TableRow>
          <ProjectNameCell projectName={projectName} index={index} />
          <TableCell colSpan={INFO_COLUMN_COUNT - 1}>
            {NOT_FOUND_TEXT}
          </TableCell>
        </TableRow>
      );
    }
    return (
      <ProjectInfoDataRow
        projectName={projectName}
        npmPackage={npmPackage}
        index={index}
        bundleSize={bundleSize}
        depsDev={depsDev}
        note={getRowStatusNote(status)}
      />
    );
  },
);

ProjectInfoRow.displayName = "ProjectInfoRow";

type ProjectInfoDataRowProps = ProjectInfoRowProps & { note?: string };

const ProjectInfoDataRow = memo(
  ({
    projectName,
    npmPackage,
    index,
    bundleSize,
    depsDev,
    note,
  }: ProjectInfoDataRowProps) => {
    const isInfoLoading = !!npmPackage?.isLoading;
    const packageInfo = npmPackage?.data;
    const repoName = packageInfo?.repoName;
    const githubRepo = useGithubRepoInfo(repoName, depsDev);
    const githubPullRequestsCount = useGithubPullRequestsCount(repoName);
    const githubContributorsCount = useGithubContributorsCount(repoName);
    const isRepoStatsLoading = !!depsDev?.isLoading || githubRepo.isLoading;
    const starsCount = depsDev?.data?.starsCount ?? githubRepo.data?.starsCount;
    const openIssuesCount =
      depsDev?.data?.openIssuesCount ?? githubRepo.data?.openIssuesCount;

    const homepageUrl = safeExternalUrl(packageInfo?.homepage);
    const repositoryUrl = safeExternalUrl(packageInfo?.repositoryUrl);

    return (
      <TableRow>
        <ProjectNameCell
          projectName={projectName}
          index={index}
          isLoading={isInfoLoading}
          title={note}
        >
          {note && <span className="sr-only">{note}</span>}
        </ProjectNameCell>
        <TableCell className="flex items-center justify-between gap-1 text-center">
          <Loader isLoading={isInfoLoading} fallback={<CellSkeleton />}>
            <div className="text-right">
              {packageInfo?.lastReleaseDate ? (
                <>
                  <div className="flex items-center gap-1">
                    <PulsatingDotIndicator
                      active={!!packageInfo?.lastReleaseDate}
                      color={getPulsatingDotIndicatorColor(
                        packageInfo?.lastReleaseDate,
                      )}
                    />
                    <span className="text-nowrap">
                      {formatDate(packageInfo.lastReleaseDate)}
                    </span>
                  </div>
                  <span className="text-nowrap">{`(${formatDistanceToNow(packageInfo.lastReleaseDate)} ago)`}</span>
                </>
              ) : (
                "-"
              )}
            </div>
          </Loader>
        </TableCell>
        <TableCell className="text-center">
          <Loader isLoading={isInfoLoading} fallback={<CellSkeleton />}>
            {packageInfo?.createdAt ? (
              <>
                <span className="text-nowrap">
                  {formatDate(packageInfo.createdAt)}
                </span>
                <br />
                <span className="text-nowrap">{`(${formatDistanceToNow(packageInfo.createdAt)} ago)`}</span>
              </>
            ) : (
              "-"
            )}
          </Loader>
        </TableCell>
        <TableCell className="text-center">
          <Loader isLoading={isRepoStatsLoading} fallback={<CellSkeleton />}>
            {starsCount ?? " - "}
          </Loader>
        </TableCell>
        <TableCell className="text-center">
          <Loader isLoading={isRepoStatsLoading} fallback={<CellSkeleton />}>
            {openIssuesCount ?? " - "}
          </Loader>
        </TableCell>
        <TableCell className="text-center">
          <Loader
            isLoading={githubPullRequestsCount.isLoading}
            fallback={<CellSkeleton />}
          >
            {githubPullRequestsCount.data ?? " - "}
          </Loader>
        </TableCell>
        <TableCell className="text-center">
          <Loader
            isLoading={githubContributorsCount.isLoading}
            fallback={<CellSkeleton />}
          >
            {githubContributorsCount.data ?? " - "}
          </Loader>
        </TableCell>
        <TableCell className="text-center">
          <Loader isLoading={isInfoLoading} fallback={<CellSkeleton />}>
            {packageInfo?.contributorsCount ?? " - "}
          </Loader>
        </TableCell>
        <TableCell className="text-center">
          <Loader isLoading={isInfoLoading} fallback={<CellSkeleton />}>
            {packageInfo?.dependenciesCount ?? " - "} (
            {packageInfo?.devDependenciesCount ?? " - "})
          </Loader>
        </TableCell>
        <TableCell className="text-center">
          <Loader isLoading={isInfoLoading} fallback={<CellSkeleton />}>
            {packageInfo?.latestVersion ?? " - "}
          </Loader>
        </TableCell>
        <TableCell className="text-center">
          <Loader isLoading={isInfoLoading} fallback={<CellSkeleton />}>
            {packageInfo?.license ?? " - "}
          </Loader>
        </TableCell>
        <TableCell className="text-center">
          <Loader
            isLoading={bundleSize?.isLoading ?? false}
            fallback={<CellSkeleton />}
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
            fallback={<CellSkeleton />}
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
            fallback={<CellSkeleton />}
          >
            <div className="flex items-center justify-center gap-1">
              <PulsatingDotIndicator
                active={false}
                color={getHealthScoreColor(depsDev?.data?.healthScore)}
              />
              <span className="text-nowrap">
                {typeof depsDev?.data?.healthScore === "number"
                  ? `${round(depsDev.data.healthScore, 1)} / 10`
                  : " - "}
              </span>
            </div>
          </Loader>
        </TableCell>
        <TableCell>
          <Loader isLoading={isInfoLoading} fallback={<CellSkeleton />}>
            <div className="flex items-center gap-2">
              {homepageUrl && (
                <SimpleTooltip content={<span>Homepage</span>}>
                  <TextLink
                    href={homepageUrl}
                    outside
                    aria-label={`${projectName} homepage`}
                  >
                    <House className="size-5" />
                  </TextLink>
                </SimpleTooltip>
              )}
              {packageInfo?.projectName && (
                <SimpleTooltip content={<span>NPM package site</span>}>
                  <TextLink
                    href={getNpmLink(packageInfo.projectName)}
                    outside
                    aria-label={`${projectName} on npm`}
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
              {repositoryUrl && (
                <SimpleTooltip content={<span>GitHub repository</span>}>
                  <TextLink
                    href={repositoryUrl}
                    outside
                    className="text-white"
                    aria-label={`${projectName} GitHub repository`}
                  >
                    <GithubIcon className="size-5" />
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

ProjectInfoDataRow.displayName = "ProjectInfoDataRow";
