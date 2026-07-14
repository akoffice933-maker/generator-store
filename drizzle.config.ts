import "dotenv/config";
import type { Config } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl && process.env.npm_lifecycle_event !== "db:generate") {
  throw new Error("DATABASE_URL is required for Drizzle commands that access the database");
}

export default {
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    // generate does not connect; this value is never used for a migration.
    url: databaseUrl ?? "postgresql://unused:unused@127.0.0.1:5432/unused",
  },
} satisfies Config;
