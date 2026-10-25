import { and, count, eq, gt, lt } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { hmac } from "@/lib/security/crypto";

export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const MAX_FAILURES_PER_ACCOUNT = 5;
export const MAX_FAILURES_PER_IP = 20;

/**
 * Protection contre la force brute : au-delà de 5 échecs sur un même compte
 * ou de 20 échecs depuis une même adresse en 15 minutes, la connexion est
 * bloquée jusqu'à la fin de la fenêtre. Les IP ne sont stockées que sous forme d'empreinte.
 */
export async function isLoginBlocked(identifier: string, ip: string) {
  const db = getDb();
  const since = new Date(Date.now() - LOGIN_WINDOW_MS);
  const ipHash = hmac(ip);
  const [byAccount] = await db
    .select({ n: count() })
    .from(schema.loginAttempts)
    .where(and(eq(schema.loginAttempts.identifier, identifier), eq(schema.loginAttempts.success, false), gt(schema.loginAttempts.createdAt, since)));
  const [byIp] = await db
    .select({ n: count() })
    .from(schema.loginAttempts)
    .where(and(eq(schema.loginAttempts.ipHash, ipHash), eq(schema.loginAttempts.success, false), gt(schema.loginAttempts.createdAt, since)));
  return (byAccount?.n ?? 0) >= MAX_FAILURES_PER_ACCOUNT || (byIp?.n ?? 0) >= MAX_FAILURES_PER_IP;
}

export async function recordLoginAttempt(identifier: string, ip: string, success: boolean) {
  const db = getDb();
  await db.insert(schema.loginAttempts).values({ identifier, ipHash: hmac(ip), success });
  if (success) {
    // Une connexion réussie remet le compteur du compte à zéro.
    await db.delete(schema.loginAttempts).where(and(eq(schema.loginAttempts.identifier, identifier), eq(schema.loginAttempts.success, false)));
  }
  // Purge des tentatives anciennes (> 30 jours)
  await db.delete(schema.loginAttempts).where(lt(schema.loginAttempts.createdAt, new Date(Date.now() - 30 * 24 * 3600 * 1000)));
}

/** Limitation de débit générique (ex. formulaire de contact). */
export async function hitRateLimit(bucket: string, key: string, max: number, windowMs: number) {
  const db = getDb();
  const keyHash = hmac(`${bucket}:${key}`);
  const since = new Date(Date.now() - windowMs);
  const [row] = await db
    .select({ n: count() })
    .from(schema.rateLimits)
    .where(and(eq(schema.rateLimits.bucket, bucket), eq(schema.rateLimits.keyHash, keyHash), gt(schema.rateLimits.createdAt, since)));
  if ((row?.n ?? 0) >= max) return false;
  await db.insert(schema.rateLimits).values({ bucket, keyHash });
  await db.delete(schema.rateLimits).where(lt(schema.rateLimits.createdAt, new Date(Date.now() - 24 * 3600 * 1000)));
  return true;
}
