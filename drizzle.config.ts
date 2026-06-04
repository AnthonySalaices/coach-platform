import { defineConfig } from "drizzle-kit";

// `drizzle-kit generate` diffs the schema and writes SQL into ./drizzle (no DB
// connection needed). `drizzle-kit migrate` applies them and needs DATABASE_URL.
export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/placeholder",
  },
  strict: true,
  verbose: true,
});
