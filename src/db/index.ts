import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  __generatorStorePostgresPool?: Pool;
};

function requireDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required when the database is accessed");
  }
  return databaseUrl;
}

/** Lazily creates the pool only when a handler/page actually accesses PostgreSQL. */
export function getPool() {
  if (globalForDb.__generatorStorePostgresPool) return globalForDb.__generatorStorePostgresPool;

  const pool = new Pool({ connectionString: requireDatabaseUrl() });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__generatorStorePostgresPool = pool;
  }
  return pool;
}

function createDatabase() {
  return drizzle(getPool());
}

type Database = ReturnType<typeof createDatabase>;
let database: Database | undefined;

/**
 * Returns the singleton Drizzle client. Kept as a function for scripts/workers
 * that want an explicit dependency, while application code can keep using `db`.
 */
export function getDb(): Database {
  database ??= createDatabase();
  return database;
}

/**
 * The Proxy keeps existing `db.select()/db.transaction()` call sites unchanged,
 * but defers DATABASE_URL validation and pool construction until the first
 * actual database operation. This makes Next.js route-module imports safe
 * during `next build` when runtime environment variables are not present.
 */
export const db: Database = new Proxy({} as Database, {
  get(_target, property) {
    const instance = getDb();
    const value = Reflect.get(instance, property, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
