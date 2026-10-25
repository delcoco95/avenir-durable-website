"use server";

import { redirect } from "next/navigation";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { requireActionUser } from "@/lib/auth/guard";
import { hashPassword } from "@/lib/auth/password";
import { destroyUserSessions } from "@/lib/auth/session";
import { generatePassword } from "@/lib/security/crypto";
import { audit } from "@/lib/audit";
import { fail, handleError, int, ok, str, zodErrors } from "./helpers";
import type { FormState } from "./types";

const userSchema = z.object({
  name: z.string().trim().min(2, "Indiquez le nom.").max(120),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email("Adresse e-mail invalide.")),
  role: z.enum(["admin", "editor"]),
});

/** Création d'un compte nominatif (pas de compte partagé) avec mot de passe temporaire. */
export async function createUser(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await requireActionUser({ role: "admin" });
    const parsed = userSchema.safeParse({ name: str(fd, "name"), email: str(fd, "email"), role: str(fd, "role") });
    if (!parsed.success) return fail("Certains champs sont à corriger.", zodErrors(parsed.error));
    const db = getDb();
    const [exists] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, parsed.data.email));
    if (exists) return fail("Un compte existe déjà avec cette adresse.", { email: "Déjà utilisée" });
    const temp = generatePassword(18);
    const [row] = await db
      .insert(schema.users)
      .values({ ...parsed.data, passwordHash: await hashPassword(temp), mustChangePassword: true })
      .returning({ id: schema.users.id });
    await audit(user, "user.create", "user", row!.id, `${parsed.data.email} (${parsed.data.role})`);
    return ok("Compte créé. Transmettez le mot de passe temporaire de façon sûre (il ne sera plus affiché).", { tempPassword: temp, email: parsed.data.email });
  } catch (err) {
    return handleError(err, "createUser");
  }
}

export async function resetUserPassword(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await requireActionUser({ role: "admin" });
    const id = int(fd, "id");
    if (id === user.id) return fail("Pour votre propre compte, utilisez « Mon mot de passe ».");
    const temp = generatePassword(18);
    const db = getDb();
    const [row] = await db.update(schema.users).set({ passwordHash: await hashPassword(temp), mustChangePassword: true }).where(eq(schema.users.id, id)).returning({ email: schema.users.email });
    if (!row) return fail("Ce compte n'existe plus.");
    await destroyUserSessions(id);
    await audit(user, "user.reset", "user", id, row.email);
    return ok("Nouveau mot de passe temporaire généré ; les sessions de ce compte ont été fermées.", { tempPassword: temp, email: row.email });
  } catch (err) {
    return handleError(err, "resetUserPassword");
  }
}

async function activeAdminCount() {
  const [r] = await getDb()
    .select({ n: count() })
    .from(schema.users)
    .where(and(eq(schema.users.role, "admin"), eq(schema.users.active, true)));
  return r?.n ?? 0;
}

export async function updateUser(fd: FormData) {
  const user = await requireActionUser({ role: "admin" });
  const id = int(fd, "id");
  const action = str(fd, "do");
  const db = getDb();
  const [target] = await db.select().from(schema.users).where(eq(schema.users.id, id));
  if (!target) redirect("/admin/utilisateurs");
  if (id === user.id) redirect("/admin/utilisateurs?erreur=soi");
  if (action === "deactivate") {
    if (target.role === "admin" && (await activeAdminCount()) <= 1) redirect("/admin/utilisateurs?erreur=dernier");
    await db.update(schema.users).set({ active: false }).where(eq(schema.users.id, id));
    await destroyUserSessions(id);
    await audit(user, "user.deactivate", "user", id, target.email);
  } else if (action === "activate") {
    await db.update(schema.users).set({ active: true }).where(eq(schema.users.id, id));
    await audit(user, "user.activate", "user", id, target.email);
  } else if (action === "role") {
    const role = target.role === "admin" ? "editor" : "admin";
    if (role === "editor" && (await activeAdminCount()) <= 1) redirect("/admin/utilisateurs?erreur=dernier");
    await db.update(schema.users).set({ role }).where(eq(schema.users.id, id));
    await audit(user, "user.role", "user", id, `${target.email} → ${role}`);
  }
  redirect("/admin/utilisateurs?maj=1");
}
