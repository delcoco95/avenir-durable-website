import { migrate } from "drizzle-orm/node-postgres/migrator";
import { loadEnv } from "./load-env";

loadEnv();

async function main() {
  const { getDb, closeDb } = await import("../src/db");
  const db = getDb();
  await migrate(db, { migrationsFolder: "./database/migrations" });
  console.log("✔ Migrations appliquées.");
  await closeDb();
}

main().catch((err) => {
  console.error("✖ Échec des migrations :", err instanceof Error ? err.message : err);
  process.exit(1);
});
