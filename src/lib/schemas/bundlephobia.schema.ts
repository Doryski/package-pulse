import { z } from "zod";

export const BundlephobiaSchema = z
  .object({
    size: z.number().optional().catch(undefined),
    gzip: z.number().optional().catch(undefined),
    dependencyCount: z.number().optional().catch(undefined),
    hasJSModule: z.boolean().optional().catch(undefined),
    hasSideEffects: z.boolean().optional().catch(undefined),
  })
  .describe("BundlephobiaSchema");

export type BundleSize = z.infer<typeof BundlephobiaSchema>;
