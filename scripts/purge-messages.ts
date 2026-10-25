/**
 * Supprime les demandes de contact plus anciennes que la durée de conservation
 * définie dans Paramètres › Données personnelles (12 mois par défaut).
 * À planifier quotidiennement (cron) : npm run messages:purge
 */
import { loadEnv } from "./load-env";

loadEnv();

async function main() {
  const { lt } = await import("drizzle-orm");
  const { getDb, closeDb, schema } = await import("../src/db");
  const { getSettings } = await import("../src/lib/settings");
  const s = await getSettings();
  const limit = new Date();
  limit.setMonth(limit.getMonth() - s.privacy.messageRetentionMonths);
  const db = getDb();
  const deleted = await db.delete(schema.contactMessages).where(lt(schema.contactMessages.createdAt, limit)).returning({ id: schema.contactMessages.id });
  await db.insert(schema.auditLog).values({ userId: null, userLabel: "tâche planifiée", action: "message.purge", entity: "message", summary: `${deleted.length} demande(s) de plus de ${s.privacy.messageRetentionMonths} mois` });
  console.log(`✔ ${deleted.length} demande(s) supprimée(s).`);
  await closeDb();
}

main().catch((err) => {
  console.error("✖", err instanceof Error ? err.message : err);
  process.exit(1);
});
