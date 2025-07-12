import { z } from "zod";

export const GlobalComparisonSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  projects: z.array(z.string()),
  clientIP: z.string().optional(),
  userAgent: z.string().optional(),
});

export type GlobalComparison = z.infer<typeof GlobalComparisonSchema>;

export const CreateGlobalComparisonRequestSchema = z.object({
  projects: z.array(z.string()),
});

export type CreateGlobalComparisonRequest = z.infer<
  typeof CreateGlobalComparisonRequestSchema
>;

export const GlobalComparisonResponseSchema = z.object({
  comparisons: z.array(GlobalComparisonSchema),
  total: z.number(),
});

export type GlobalComparisonResponse = z.infer<
  typeof GlobalComparisonResponseSchema
>;

export const GlobalComparisonErrorSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
});

export type GlobalComparisonError = z.infer<typeof GlobalComparisonErrorSchema>;

export const PopularComparisonSchema = z.object({
  projects: z.array(z.string()),
  count: z.number(),
  lastUsed: z.number(),
  averageProjectsCount: z.number(),
});

export type PopularComparison = z.infer<typeof PopularComparisonSchema>;

export const PopularComparisonResponseSchema = z.object({
  comparisons: z.array(PopularComparisonSchema),
  total: z.number(),
});

export type PopularComparisonResponse = z.infer<
  typeof PopularComparisonResponseSchema
>;
