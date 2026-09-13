import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { serverEnv } from "@/lib/env";
import * as schema from "./schema";

/**
 * The connection is created on first use, not at import time, so `next build`, unit tests, and the
 * public pages never need a database.
 */
let cached: PostgresJsDatabase<typeof schema> | undefined;

export function db(): PostgresJsDatabase<typeof schema> {
  if (!cached) {
    const client = postgres(serverEnv().DATABASE_URL, {
      // Neon's pooled endpoint does not support prepared statements.
      prepare: false,
      max: 3,
      idle_timeout: 20,
    });
    cached = drizzle(client, { schema });
  }
  return cached;
}

export { schema };
