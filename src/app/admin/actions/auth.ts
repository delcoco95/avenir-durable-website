"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { burnVerifyTime, checkPasswordPolicy, hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroyCurrentSession, destroyUserSessions, getSessionUser } from "@/lib/auth/session";
import { isLoginBlocked, recordLoginAttempt } from "@/lib/auth/throttle";
import { clientIp, userAgent } from "@/lib/request";
import { audit } from "@/lib/audit";
import { fail, ok } from "./helpers";
import type { FormState } from "./types";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(254),
  password: z.string().min(1).max(200),
});

const GENERIC = "Adresse e-mail ou mot de passe incorrect.";

export async function login(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return fail(GENERIC);
  const { email, password } = parsed.data;
  const ip = await clientIp();

  if (await isLoginBlocked(email, ip)) {
    await audit(null, "login.blocked", "user", null, email);
    return fail("Trop de tentatives infructueuses. Par sécurité, la connexion est bloquée pendant 15 minutes.");
  }

  const db = getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (!user || !user.active) {
    await burnVerifyTime(password); // même durée de réponse, que le compte existe ou non
    await recordLoginAttempt(email, ip, false);
    return fail(GENERIC);
  }
  const valid = await verifyPassword(user.passwordHash, password);
  await recordLoginAttempt(email, ip, valid);
  if (!valid) {
    await audit(null, "login.failed", "user", user.id, email);
    return fail(GENERIC);
  }

  await createSession(user.id, await userAgent());
  await db.update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, user.id));
  await audit({ id: user.id, email: user.email }, "login.success", "user", user.id);

  const next = String(fd.get("next") ?? "");
  redirect(user.mustChangePassword ? "/admin/mot-de-passe?obligatoire=1" : next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin");
}

export async function logout() {
  const user = await getSessionUser();
  await destroyCurrentSession();
  if (user) await audit(user, "logout", "user", user.id);
  redirect("/admin/connexion?deconnecte=1");
}

export async function changePassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) redirect("/admin/connexion");
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  const confirm = String(fd.get("confirm") ?? "");

  const db = getDb();
  const [row] = await db.select().from(schema.users).where(eq(schema.users.id, user.id));
  if (!row || !(await verifyPassword(row.passwordHash, current))) {
    return fail("Le mot de passe actuel est incorrect.", { current: "Mot de passe incorrect" });
  }
  if (next !== confirm) return fail("Les deux nouveaux mots de passe ne correspondent pas.", { confirm: "Ne correspond pas" });
  if (next === current) return fail("Le nouveau mot de passe doit être différent de l'actuel.", { next: "Identique à l'actuel" });
  const policy = checkPasswordPolicy(next, { email: row.email, name: row.name });
  if (!policy.ok) return fail(policy.reason, { next: policy.reason });

  await db
    .update(schema.users)
    .set({ passwordHash: await hashPassword(next), mustChangePassword: false, passwordChangedAt: new Date() })
    .where(eq(schema.users.id, user.id));
  // Les autres sessions ouvertes avec l'ancien mot de passe sont fermées.
  await destroyUserSessions(user.id, user.sessionId);
  await audit(user, "password.change", "user", user.id);
  if (row.mustChangePassword) redirect("/admin?bienvenue=1");
  return ok("Mot de passe modifié. Vos autres sessions ont été déconnectées.");
}
