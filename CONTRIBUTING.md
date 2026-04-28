# Contributing to Package Pulse

Thanks for your interest in improving Package Pulse. This document describes how to set up the project locally, the conventions we follow, and what to expect during the pull-request process.

By participating in this project you agree to abide by the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Ways to contribute

- Report bugs by opening an [issue](https://github.com/doryski/package-pulse/issues/new/choose)
- Propose enhancements or new features
- Improve documentation
- Submit pull requests for open issues

For non-trivial changes, please open an issue first to discuss the approach. This avoids duplicated work and keeps reviews focused.

## Development setup

### Prerequisites

- Node.js 20+ (the repository ships an `.nvmrc`; run `nvm use` if you have nvm)
- pnpm (recommended) or npm

### Install and run

```bash
git clone https://github.com/doryski/package-pulse.git
cd package-pulse
pnpm install
cp .env.example .env.local   # fill in any keys you need
pnpm dev
```

### Useful scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the Next.js dev server |
| `pnpm build` | Production build |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Auto-fix lint errors |
| `pnpm test` | Run Vitest unit tests |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm test:e2e` | Run Playwright end-to-end tests |
| `pnpm coverage` | Vitest with coverage report |

## Coding standards

- TypeScript with strict mode
- Functional, composable patterns; small reusable utilities
- Prefer type inference; use `type` aliases over `interface`
- ESLint + Prettier enforce formatting; please run `pnpm lint:fix` before pushing
- Use early returns over nested conditionals
- Avoid `useEffect` unless strictly necessary

## Testing expectations

- Add or update unit tests for any logic change
- For UI flows, prefer a Playwright scenario when feasible
- For targeted runs use:

  ```bash
  pnpm exec vitest run --maxWorkers=1 --bail=5 path/to/file.test.ts
  ```

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/) where possible:

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation only
- `refactor:` code change that neither fixes a bug nor adds a feature
- `test:` adding or refining tests
- `chore:` tooling, dependencies, repo maintenance

Keep the subject line under 72 characters; explain the why in the body.

## Pull requests

1. Fork the repository and create a feature branch from `main`.
2. Make your changes with tests and documentation as needed.
3. Run `pnpm lint` and `pnpm test` locally before pushing.
4. Open a pull request using the supplied template; link any related issues.
5. Be ready to iterate on review feedback. CI must pass before a merge.

## Reporting security issues

Please do not open public issues for security vulnerabilities. Follow the process in [SECURITY.md](./SECURITY.md).

## License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](./LICENSE).
