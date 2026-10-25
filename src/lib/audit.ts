import { getDb, schema } from "@/db";
import type { SessionUser } from "@/lib/auth/session";

/** Journalisation des opérations sensibles (consultable dans Administration › Journal). */
export async function audit(
  user: Pick<SessionUser, "id" | "email"> | null,
  action: string,
  entity: string,
  entityId?: string | number | null,
  summary?: string,
) {
  try {
    await getDb()
      .insert(schema.auditLog)
      .values({
        userId: user?.id ?? null,
        userLabel: user?.email ?? "système",
        action,
        entity,
        entityId: entityId == null ? null : String(entityId),
        summary: summary?.slice(0, 300) ?? null,
      });
  } catch (err) {
    // La journalisation ne doit jamais bloquer l'action, mais l'échec est signalé.
    console.error("[audit] échec d'écriture", err instanceof Error ? err.message : err);
  }
}
