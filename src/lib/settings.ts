import { cache } from "react";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { DEFAULT_SETTINGS, sectionSchemas, type SettingsSection, type SiteSettings } from "./settings-schema";

const KEY = "site";

/**
 * Lecture des paramètres : chaque section est fusionnée avec les valeurs par
 * défaut puis validée ; une section invalide retombe sur sa valeur par défaut.
 */
export const getSettings = cache(async (): Promise<SiteSettings> => {
  const db = getDb();
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, KEY));
  const stored = (row?.value ?? {}) as Partial<Record<SettingsSection, unknown>>;
  const out = { ...DEFAULT_SETTINGS } as Record<SettingsSection, unknown>;
  for (const k of Object.keys(sectionSchemas) as SettingsSection[]) {
    const merged = { ...(DEFAULT_SETTINGS[k] as object), ...((stored[k] as object) ?? {}) };
    const parsed = sectionSchemas[k].safeParse(merged);
    out[k] = parsed.success ? parsed.data : DEFAULT_SETTINGS[k];
  }
  return out as SiteSettings;
});

export async function saveSettingsSection<K extends SettingsSection>(section: K, value: SiteSettings[K]) {
  const db = getDb();
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, KEY));
  const current = (row?.value ?? {}) as Record<string, unknown>;
  const next = { ...current, [section]: value };
  if (row) {
    await db.update(schema.settings).set({ value: next, updatedAt: new Date() }).where(eq(schema.settings.key, KEY));
  } else {
    await db.insert(schema.settings).values({ key: KEY, value: next });
  }
}
