import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development")
    .catch("development"),
  PP_KV_REST_API_URL: z.string().url().optional().catch(undefined),
  PP_KV_REST_API_TOKEN: z.string().min(1).optional().catch(undefined),
  OPENAI_API_KEY: z.string().min(1).optional().catch(undefined),
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = EnvSchema.parse(process.env);
