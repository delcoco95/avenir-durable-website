import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";

const enabled = Boolean(process.env.DATABASE_URL);

/**
 * Tests d'intégration sur une base PostgreSQL dédiée (TEST_DATABASE_URL) :
 * migrations, limitation des tentatives de connexion et des envois, paramètres.
 * La base de test est entièrement vidée à chaque exécution.
 */
describe.runIf(enabled)("base de données (intégration)", () => {
  beforeAll(async () => {
    const { getDb } = await import("@/db");
    const db = getDb();
    await db.execute(sql`drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;`);
    await migrate(db, { migrationsFolder: "./database/migrations" });
  });
  afterAll(async () => {
    const { closeDb } = await import("@/db");
    await closeDb();
  });

  it("les migrations créent toutes les tables", async () => {
    const { getDb } = await import("@/db");
    const res = await getDb().execute(sql`select table_name from information_schema.tables where table_schema='public' order by 1`);
    const names = (res.rows as { table_name: string }[]).map((r) => r.table_name);
    for (const t of ["users", "sessions", "pages", "projects", "domains", "faq_items", "partners", "media", "contact_messages", "settings", "audit_log", "login_attempts"]) {
      expect(names).toContain(t);
    }
  });

  it("bloque un compte après 5 échecs de connexion, sans bloquer les autres", async () => {
    const { isLoginBlocked, recordLoginAttempt } = await import("@/lib/auth/throttle");
    for (let i = 0; i < 5; i++) {
      expect(await isLoginBlocked("cible@exemple.test", "203.0.113.5")).toBe(false);
      await recordLoginAttempt("cible@exemple.test", "203.0.113.5", false);
    }
    expect(await isLoginBlocked("cible@exemple.test", "198.51.100.9")).toBe(true); // même compte, autre IP
    expect(await isLoginBlocked("autre@exemple.test", "198.51.100.9")).toBe(false);
  });

  it("bloque une adresse IP après 20 échecs sur des comptes différents", async () => {
    const { isLoginBlocked, recordLoginAttempt } = await import("@/lib/auth/throttle");
    for (let i = 0; i < 20; i++) await recordLoginAttempt(`compte${i}@exemple.test`, "192.0.2.77", false);
    expect(await isLoginBlocked("nouveau@exemple.test", "192.0.2.77")).toBe(true);
  });

  it("une connexion réussie remet à zéro le compteur du compte", async () => {
    const { isLoginBlocked, recordLoginAttempt } = await import("@/lib/auth/throttle");
    for (let i = 0; i < 4; i++) await recordLoginAttempt("reset@exemple.test", "203.0.113.8", false);
    await recordLoginAttempt("reset@exemple.test", "203.0.113.8", true);
    for (let i = 0; i < 4; i++) await recordLoginAttempt("reset@exemple.test", "203.0.113.8", false);
    expect(await isLoginBlocked("reset@exemple.test", "203.0.113.8")).toBe(false);
  });

  it("n'enregistre jamais l'adresse IP en clair", async () => {
    const { getDb } = await import("@/db");
    const res = await getDb().execute(sql`select ip_hash from login_attempts limit 50`);
    for (const r of res.rows as { ip_hash: string }[]) {
      expect(r.ip_hash).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("limite le débit du formulaire de contact (5 par heure)", async () => {
    const { hitRateLimit } = await import("@/lib/auth/throttle");
    const results = [];
    for (let i = 0; i < 7; i++) results.push(await hitRateLimit("contact", "203.0.113.50", 5, 3600_000));
    expect(results).toEqual([true, true, true, true, true, false, false]);
  });

  it("les paramètres invalides en base retombent sur les valeurs par défaut", async () => {
    const { getDb, schema } = await import("@/db");
    await getDb()
      .insert(schema.settings)
      .values({ key: "site", value: { contact: { email: "pas-un-email" }, seo: { preproduction: false } } });
    const { getSettings } = await import("@/lib/settings");
    const s = await getSettings();
    expect(s.contact.email).toBe("avenirdurable@ecomail.fr");
    expect(s.seo.preproduction).toBe(false);
  });
});
