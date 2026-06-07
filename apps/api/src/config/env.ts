import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.coerce.number().default(900),
  JWT_REFRESH_TTL: z.coerce.number().default(604800),
  COOKIE_DOMAIN: z.string().default('localhost'),
  LATEX_DOCKER_IMAGE: z.string().default('texlive/texlive:latest-minimal'),
  LATEX_TIMEOUT_SECONDS: z.coerce.number().default(30),
  LATEX_MAX_MEMORY_MB: z.coerce.number().default(1024),
  PDF_STORAGE_PATH: z.string().default('/var/data/overleaf/pdfs'),
  PORT: z.coerce.number().default(3001),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
