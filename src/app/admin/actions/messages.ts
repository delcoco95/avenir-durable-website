"use server";

import { redirect } from "next/navigation";
import { eq, lt } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireActionUser } from "@/lib/auth/guard";
import { audit } from "@/lib/audit";
import { getSettings } from "@/lib/settings";
import { int, str } from "./helpers";

const STATUSES = ["new", "handled", "archived"] as const;

export async function setMessageStatus(fd: FormData) {
  const user = await requireActionUser();
  const id = int(fd, "id");
  const status = str(fd, "status");
  if (!(STATUSES as readonly string[]).includes(status)) redirect(`/admin/messages/${id}`);
  await getDb()
    .update(schema.contactMessages)
    .set({ status, handledAt: status === "new" ? null : new Date() })
    .where(eq(schema.contactMessages.id, id));
  await audit(user, `message.${status}`, "message", id);
  redirect(str(fd, "back") === "list" ? "/admin/messages" : `/admin/messages/${id}?maj=1`);
}

/** Suppression définitive d'une demande (réservée aux administrateurs). */
export async function deleteMessage(fd: FormData) {
  const user = await requireActionUser({ role: "admin" });
  const id = int(fd, "id");
  await getDb().delete(schema.contactMessages).where(eq(schema.contactMessages.id, id));
  await audit(user, "message.delete", "message", id);
  redirect("/admin/messages?supprime=1");
}

/** Purge des demandes plus anciennes que la durée de conservation annoncée. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function purgeMessages(_fd?: FormData) {
  const user = await requireActionUser({ role: "admin" });
  const s = await getSettings();
  const limit = new Date();
  limit.setMonth(limit.getMonth() - s.privacy.messageRetentionMonths);
  const deleted = await getDb().delete(schema.contactMessages).where(lt(schema.contactMessages.createdAt, limit)).returning({ id: schema.contactMessages.id });
  await audit(user, "message.purge", "message", null, `${deleted.length} demande(s) de plus de ${s.privacy.messageRetentionMonths} mois`);
  redirect(`/admin/messages?purge=${deleted.length}`);
}
