import { vi } from "vitest";

type SearchParamsInit = ConstructorParameters<typeof URLSearchParams>[0];

export type NavigationMockOptions = {
  pathname?: string;
  searchParams?: SearchParamsInit;
};

const NOT_FOUND_DIGEST = "NEXT_HTTP_ERROR_FALLBACK;404";

const REDIRECT_TYPES = { push: "push", replace: "replace" } as const;

type RedirectType = (typeof REDIRECT_TYPES)[keyof typeof REDIRECT_TYPES];

function createNavigationError(message: string, digest: string) {
  return Object.assign(new Error(message), { digest });
}

function createRouter() {
  return {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  };
}

function toUrl(pathname: string, searchParams: URLSearchParams) {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function createReplaceStateSpy() {
  const nativeReplaceState = window.history.replaceState.bind(window.history);
  const replaceState = vi.fn((...args: Parameters<History["replaceState"]>) =>
    nativeReplaceState(...args),
  );
  window.history.replaceState = replaceState;

  const setUrl = (url: string) => nativeReplaceState(null, "", url);

  return { replaceState, setUrl };
}

export function createNavigationMock({
  pathname = "/",
  searchParams = "",
}: NavigationMockOptions = {}) {
  const state = {
    pathname,
    searchParams: new URLSearchParams(searchParams),
  };
  const router = createRouter();
  const { replaceState, setUrl } = createReplaceStateSpy();

  const syncWindowUrl = () => setUrl(toUrl(state.pathname, state.searchParams));

  const setPathname = (nextPathname: string) => {
    state.pathname = nextPathname;
    syncWindowUrl();
  };

  const setSearchParams = (init: SearchParamsInit) => {
    state.searchParams = new URLSearchParams(init);
    syncWindowUrl();
  };

  const reset = () => {
    setPathname(pathname);
    setSearchParams(searchParams);
    Object.values(router).forEach((fn) => fn.mockReset());
    replaceState.mockClear();
  };

  syncWindowUrl();

  return {
    useRouter: vi.fn(() => router),
    usePathname: vi.fn(() => state.pathname),
    useSearchParams: vi.fn(() => state.searchParams),
    useParams: vi.fn(() => ({})),
    notFound: vi.fn((): never => {
      throw createNavigationError("NEXT_NOT_FOUND", NOT_FOUND_DIGEST);
    }),
    redirect: vi.fn(
      (url: string, type: RedirectType = REDIRECT_TYPES.replace): never => {
        throw createNavigationError(
          `NEXT_REDIRECT:${url}`,
          `NEXT_REDIRECT;${type};${url};307;`,
        );
      },
    ),
    permanentRedirect: vi.fn(
      (url: string, type: RedirectType = REDIRECT_TYPES.replace): never => {
        throw createNavigationError(
          `NEXT_REDIRECT:${url}`,
          `NEXT_REDIRECT;${type};${url};308;`,
        );
      },
    ),
    RedirectType: REDIRECT_TYPES,
    router,
    replaceState,
    setPathname,
    setSearchParams,
    reset,
  };
}

export type NavigationMock = ReturnType<typeof createNavigationMock>;
