import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __adPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __adDb: NodePgDatabase<typeof schema> | undefined;
}

function createPool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL n'est pas défini (voir .env.example).");
  return new Pool({ connectionString: url, max: 10, idleTimeoutMillis: 30_000 });
}

/** Connexion partagée (réutilisée entre rechargements à chaud en développement). */
export function getDb() {
  if (!globalThis.__adDb) {
    globalThis.__adPool = createPool();
    globalThis.__adDb = drizzle(globalThis.__adPool, { schema });
  }
  return globalThis.__adDb;
}

export async function closeDb() {
  await globalThis.__adPool?.end();
  globalThis.__adPool = undefined;
  globalThis.__adDb = undefined;
}

export { schema };
