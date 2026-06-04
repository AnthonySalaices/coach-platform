// Programmatic migration runner used at deploy time (the container entrypoint
// runs this before starting the server). Uses relative imports so it can be
// bundled to a standalone script with esbuild — see the Dockerfile.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { env } from "../../env";

async function main() {
  const sql = postgres(env.DATABASE_URL, { max: 1 });
  try {
    await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
    console.log("✅ Database migrations applied.");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
