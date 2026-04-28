# Package Pulse

[![CI](https://github.com/doryski/package-pulse/actions/workflows/ci.yml/badge.svg)](https://github.com/doryski/package-pulse/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Made with Next.js](https://img.shields.io/badge/Made%20with-Next.js-black?logo=next.js)](https://nextjs.org/)

Web application providing analytics-driven statistics and visualizations for npm packages. Compare packages, explore download trends, and surface insights about usage patterns and ecosystem health.

## Problem

Choosing between npm packages is harder than it should be. Download counts on npmjs.com only tell part of the story, and comparing several packages side-by-side usually means juggling multiple browser tabs and copy-pasting numbers into a spreadsheet. Package Pulse pulls the relevant signals together in a single view so engineers and teams can make informed decisions quickly.

## Features

- Side-by-side comparison of multiple npm packages
- Download trend charts (daily / weekly / monthly windows)
- Package metadata at a glance (versions, maintainers, repository links)
- AI-assisted similar-project suggestions
- Shareable comparison links backed by Upstash Redis
- Export charts as images and tabular data as CSV / XLSX
- Light, dark, and system theme support

## Tech Stack

- TypeScript
- Next.js 14 (App Router)
- React 18, React Hook Form, Zustand, TanStack Query
- Tailwind CSS, Radix UI, shadcn-style components, Recharts
- Vitest (unit) and Playwright (end-to-end)
- Sentry for error monitoring, Vercel Analytics
- Upstash Redis for shared comparison storage
- OpenAI API for similar-project suggestions

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (recommended) or npm

### Installation

```bash
git clone https://github.com/doryski/package-pulse.git
cd package-pulse
pnpm install
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in the values for the integrations you intend to use. Most variables are optional in development; AI suggestions and shared comparison links require their respective providers.

```bash
cp .env.example .env.local
```

| Variable | Purpose | Required |
| --- | --- | --- |
| `OPENAI_API_KEY` | Powers similar-project suggestions | Optional (feature disabled if absent) |
| `PP_KV_REST_API_URL` | Upstash Redis REST URL for shared comparisons | Optional |
| `PP_KV_REST_API_TOKEN` | Upstash Redis REST token | Optional |
| `SENTRY_AUTH_TOKEN` | Sentry build-time source map upload | Optional |

### Running

```bash
pnpm dev          # start the Next.js dev server
pnpm build        # production build
pnpm start        # serve the production build
pnpm lint         # ESLint
pnpm test         # Vitest unit tests
pnpm test:e2e     # Playwright end-to-end tests
```

The dev server listens on http://localhost:3000.

## Project Structure

```
src/
  app/         Next.js App Router routes and layouts
  components/  Reusable UI components
  lib/         Utilities, storage adapters, API helpers
scripts/       Maintenance and verification scripts
tests/         Playwright end-to-end specs
```

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request, and review the [Code of Conduct](./CODE_OF_CONDUCT.md). For security issues, follow the process described in [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE) (c) Dominik Rycharski
