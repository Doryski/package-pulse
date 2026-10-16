import "server-only";

export const PACKAGE_ERROR = {
  notFound: "notFound",
  upstream: "upstream",
} as const;

export type PackageError = (typeof PACKAGE_ERROR)[keyof typeof PACKAGE_ERROR];

export type PackageOutcome<T> = {
  name: string;
  data: T | null;
  error?: PackageError;
};

export const found = <T>(name: string, data: T | null): PackageOutcome<T> => ({
  name,
  data,
});

export const missing = (name: string): PackageOutcome<never> => ({
  name,
  data: null,
  error: PACKAGE_ERROR.notFound,
});

export const failed = (name: string): PackageOutcome<never> => ({
  name,
  data: null,
  error: PACKAGE_ERROR.upstream,
});

const errorEntries = <T>(outcomes: readonly PackageOutcome<T>[]) =>
  outcomes.flatMap(({ name, error }) =>
    error ? [[name, error] as const] : [],
  );

export const toPackageResults = <T>(
  outcomes: readonly PackageOutcome<T>[],
) => ({
  data: Object.fromEntries(outcomes.map(({ name, data }) => [name, data])),
  errors: Object.fromEntries(errorEntries(outcomes)),
});

export type PackageResults<T> = ReturnType<typeof toPackageResults<T>>;

export const hasUpstreamErrors = (errors: Record<string, PackageError>) =>
  Object.values(errors).includes(PACKAGE_ERROR.upstream);
