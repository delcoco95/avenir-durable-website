import "server-only";
import { desc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { mediaUrl } from "./content";

/** Liste allégée des médias pour les sélecteurs d'images de l'administration. */
export async function pickerMedia() {
  const rows = await getDb().select().from(schema.media).orderBy(desc(schema.media.createdAt));
  return rows.map((m) => ({ id: m.id, thumb: mediaUrl(m, "thumb"), title: m.title || m.originalName, alt: m.alt }));
}
