import { z } from "zod";

export const NPMDownloadCountSchema = z
  .object({
    day: z.string().date(),
    downloads: z.number().nonnegative(),
  })
  .transform((obj) => ({ date: obj.day, count: obj.downloads }));

export const NPMDownloadPeriodSchema = z.object({
  downloads: z.array(NPMDownloadCountSchema),
  start: z.string().date(),
  end: z.string().date(),
  package: z.string(),
});

export type NPMDownloadPeriod = z.infer<typeof NPMDownloadPeriodSchema>;
export type NPMDownloadCount = z.infer<typeof NPMDownloadCountSchema>;
