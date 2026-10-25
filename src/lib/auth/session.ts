import { cookies } from "next/headers";
import { and, eq, lt, or } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { randomToken, sha256 } from "@/lib/security/crypto";

const ABSOLUTE_LIFETIME_MS = 8 * 60 * 60 * 1000; // 8 h
const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 h d'inactivité
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export function isSecureContext() {
  return (process.env.SITE_URL ?? "").startsWith("https://");
}

/** Préfixe __Host- : cookie limité au domaine exact, Secure et Path=/ obligatoires. */
export function sessionCookieName() {
  return isSecureContext() ? "__Host-ad_session" : "ad_session";
}

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  role: "admin" | "editor";
  mustChangePassword: boolean;
  sessionId: string;
};

export async function createSession(userId: number, userAgent: string) {
  const db = getDb();
  const token = randomToken(32);
  const id = sha256(token);
  const expiresAt = new Date(Date.now() + ABSOLUTE_LIFETIME_MS);
  await db.insert(schema.sessions).values({ id, userId, expiresAt, userAgent });
  const jar = await cookies();
  jar.set(sessionCookieName(), token, {
    httpOnly: true,
    secure: isSecureContext(),
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
  // Nettoyage opportuniste des sessions expirées
  await db
    .delete(schema.sessions)
    .where(or(lt(schema.sessions.expiresAt, new Date()), lt(schema.sessions.lastSeenAt, new Date(Date.now() - IDLE_TIMEOUT_MS))));
  return id;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(sessionCookieName())?.value;
  if (!token || token.length > 100) return null;
  const id = sha256(token);
  const db = getDb();
  const rows = await db
    .select({ session: schema.sessions, user: schema.users })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(eq(schema.sessions.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const now = Date.now();
  if (row.session.expiresAt.getTime() < now || row.session.lastSeenAt.getTime() < now - IDLE_TIMEOUT_MS || !row.user.active) {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, id));
    return null;
  }
  if (row.session.lastSeenAt.getTime() < now - TOUCH_INTERVAL_MS) {
    await db.update(schema.sessions).set({ lastSeenAt: new Date() }).where(eq(schema.sessions.id, id));
  }
  return {
    id: row.user.id,
    email: row.user.email,
    name: row.user.name,
    role: row.user.role === "admin" ? "admin" : "editor",
    mustChangePassword: row.user.mustChangePassword,
    sessionId: id,
  };
}

export async function destroyCurrentSession() {
  const jar = await cookies();
  const token = jar.get(sessionCookieName())?.value;
  if (token) await getDb().delete(schema.sessions).where(eq(schema.sessions.id, sha256(token)));
  jar.delete(sessionCookieName());
}

/** Invalide toutes les sessions d'un utilisateur (sauf éventuellement la session courante). */
export async function destroyUserSessions(userId: number, exceptSessionId?: string) {
  const db = getDb();
  const all = await db.select({ id: schema.sessions.id }).from(schema.sessions).where(eq(schema.sessions.userId, userId));
  for (const s of all) {
    if (s.id !== exceptSessionId) await db.delete(schema.sessions).where(and(eq(schema.sessions.id, s.id)));
  }
}
