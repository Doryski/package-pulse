import { z } from "zod";

export const COMPARISONS_READ_RATE_LIMIT = {
  windowMs: 60 * 1000,
  maxRequests: 60,
} as const;

export const ComparisonsLimitSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(50)
  .catch(20);
