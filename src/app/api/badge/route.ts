import fetchNpmDownloadsAdaptive from "@/api/fetchNpmDownloadsAdaptive";
import { SELECTED_PROJECTS_LIMIT } from "@/lib/config/constants";
import { colors } from "@/lib/theme/colors";
import { formatLargeNumber } from "@/lib/utils/formatters";
import getClientIp from "@/lib/utils/getClientIp";
import { groupByWeeks } from "@/lib/utils/groupByPeriod";
import { isAppError } from "@/lib/utils/AppError";
import { subWeeks } from "date-fns";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;
const RATE_LIMIT_SWEEP_THRESHOLD = 10_000;

const DEFAULT_WEEKS = 52;
const MIN_WEEKS = 4;
const MAX_WEEKS = 104;

const CARD_PADDING = 16;
const HEADER_HEIGHT = 26;
const ROW_HEIGHT = 46;
const LABEL_WIDTH = 190;
const SPARK_WIDTH = 220;
const SPARK_HEIGHT = 30;
const FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const palette = colors.chart.light;

const requestCounts = new Map<string, { count: number; resetTime: number }>();

function sweepExpired(now: number): void {
  if (requestCounts.size < RATE_LIMIT_SWEEP_THRESHOLD) return;
  for (const [ip, data] of requestCounts) {
    if (now > data.resetTime) requestCounts.delete(ip);
  }
}

function isRateLimited(clientIP: string): boolean {
  const now = Date.now();
  const clientData = requestCounts.get(clientIP);

  if (!clientData || now > clientData.resetTime) {
    sweepExpired(now);
    requestCounts.set(clientIP, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return false;
  }

  if (clientData.count >= MAX_REQUESTS_PER_WINDOW) return true;

  clientData.count++;
  return false;
}

function isValidPackageName(name: string): boolean {
  const npmNameRegex =
    /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

  if (!name || typeof name !== "string") return false;
  if (name.length < 1 || name.length > 214) return false;
  if (name.startsWith(".") || name.startsWith("_")) return false;
  if (!npmNameRegex.test(name)) return false;

  return true;
}

function parseWeeks(raw: string | null): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_WEEKS;
  return Math.min(MAX_WEEKS, Math.max(MIN_WEEKS, Math.trunc(parsed)));
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function paletteColor(index: number): string {
  const key = ((index % 10) + 1) as keyof typeof palette;
  return palette[key];
}

function buildSparklinePath(
  values: number[],
  x0: number,
  y0: number,
  width: number,
  height: number,
): string {
  if (values.length === 0) return "";
  if (values.length === 1) {
    const y = y0 + height / 2;
    return `${x0.toFixed(1)},${y.toFixed(1)} ${(x0 + width).toFixed(1)},${y.toFixed(1)}`;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x = x0 + (index / (values.length - 1)) * width;
      const y = y0 + height - ((value - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

type BadgeSeries = {
  name: string;
  latest: number | null;
  values: number[];
  color: string;
};

function renderRow(series: BadgeSeries, top: number): string {
  const nameY = top + 16;
  const valueY = top + 34;
  const sparkX = CARD_PADDING + LABEL_WIDTH;
  const sparkTop = top + (ROW_HEIGHT - SPARK_HEIGHT) / 2;
  const safeName = escapeXml(series.name);

  const valueLabel =
    series.latest === null
      ? "no data"
      : `${formatLargeNumber(series.latest)} / week`;

  const spark =
    series.latest === null || series.values.length === 0
      ? `<text x="${sparkX}" y="${top + 28}" font-size="11" fill="#94a3b8" font-family="${FONT_FAMILY}">unavailable</text>`
      : `<polyline points="${buildSparklinePath(
          series.values,
          sparkX,
          sparkTop,
          SPARK_WIDTH,
          SPARK_HEIGHT,
        )}" fill="none" stroke="${series.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />`;

  return `
    <rect x="${CARD_PADDING - 6}" y="${top - 2}" width="8" height="${ROW_HEIGHT - 8}" rx="2" fill="${series.color}" />
    <text x="${CARD_PADDING + 6}" y="${nameY}" font-size="13" font-weight="600" fill="#0f172a" font-family="${FONT_FAMILY}">${safeName}</text>
    <text x="${CARD_PADDING + 6}" y="${valueY}" font-size="11" fill="#64748b" font-family="${FONT_FAMILY}">${valueLabel}</text>
    ${spark}
  `;
}

function renderBadgeSvg(series: BadgeSeries[]): string {
  const width = CARD_PADDING * 2 + LABEL_WIDTH + SPARK_WIDTH;
  const height = CARD_PADDING * 2 + HEADER_HEIGHT + series.length * ROW_HEIGHT;

  const rows = series
    .map((item, index) =>
      renderRow(item, CARD_PADDING + HEADER_HEIGHT + index * ROW_HEIGHT),
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="npm weekly downloads">
    <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="10" fill="#ffffff" stroke="#e2e8f0" />
    <text x="${CARD_PADDING}" y="${CARD_PADDING + 12}" font-size="13" font-weight="700" fill="#0f172a" font-family="${FONT_FAMILY}">npm weekly downloads</text>
    <text x="${width - CARD_PADDING}" y="${CARD_PADDING + 12}" text-anchor="end" font-size="10" fill="#94a3b8" font-family="${FONT_FAMILY}">Package Pulse</text>
    ${rows}
  </svg>`;
}

function renderMessageSvg(message: string): string {
  const width = CARD_PADDING * 2 + LABEL_WIDTH + SPARK_WIDTH;
  const height = 72;
  const safeMessage = escapeXml(message);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${safeMessage}">
    <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="10" fill="#ffffff" stroke="#e2e8f0" />
    <text x="${CARD_PADDING}" y="28" font-size="13" font-weight="700" fill="#0f172a" font-family="${FONT_FAMILY}">Package Pulse</text>
    <text x="${CARD_PADDING}" y="50" font-size="12" fill="#ef4444" font-family="${FONT_FAMILY}">${safeMessage}</text>
  </svg>`;
}

function svgResponse(svg: string, status: number): NextResponse {
  return new NextResponse(svg, {
    status,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control":
        status === 200
          ? "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400"
          : "no-store",
    },
  });
}

export async function GET(request: NextRequest) {
  const clientIP = getClientIp(request.headers);
  if (isRateLimited(clientIP)) {
    return svgResponse(renderMessageSvg("Rate limit exceeded"), 429);
  }

  const { searchParams } = new URL(request.url);
  const packages = (searchParams.get("packages") || "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  if (packages.length === 0) {
    return svgResponse(renderMessageSvg("No packages provided"), 400);
  }

  if (packages.length > SELECTED_PROJECTS_LIMIT) {
    return svgResponse(
      renderMessageSvg(`Max ${SELECTED_PROJECTS_LIMIT} packages allowed`),
      400,
    );
  }

  const invalidPackages = packages.filter((name) => !isValidPackageName(name));
  if (invalidPackages.length > 0) {
    return svgResponse(
      renderMessageSvg(`Invalid package names: ${invalidPackages.join(", ")}`),
      400,
    );
  }

  const weeks = parseWeeks(searchParams.get("period"));
  const startDate = subWeeks(new Date(), weeks);

  try {
    const { data } = await fetchNpmDownloadsAdaptive(packages, { startDate });

    const series: BadgeSeries[] = packages.map((name, index) => {
      const downloads = data[name];
      const color = paletteColor(index);

      if (!downloads || downloads.length === 0) {
        return { name, latest: null, values: [], color };
      }

      const weekly = groupByWeeks(downloads).slice(-weeks);
      const values = weekly.map((bucket) => bucket.count);

      return {
        name,
        latest: values.at(-1) ?? null,
        values,
        color,
      };
    });

    return svgResponse(renderBadgeSvg(series), 200);
  } catch (error) {
    const message = isAppError(error)
      ? error.message
      : "Failed to load download data";
    return svgResponse(renderMessageSvg(message), 200);
  }
}
