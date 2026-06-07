import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env (symlinked from root by postinstall/setup)
config({ path: resolve(process.cwd(), '.env') });

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
export { schema };
