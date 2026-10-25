"use server";

import { redirect } from "next/navigation";
import { eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { requireActionUser } from "@/lib/auth/guard";
import { audit } from "@/lib/audit";
import { cleanFileName, deleteStoredImage, processImage, UploadError } from "@/lib/media";
import { mediaUrl } from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { mediaIdsInSections } from "@/lib/sections";
import { fail, handleError, int, ok, str, zodErrors } from "./helpers";
import type { FormState } from "./types";

/** Téléversement : validation du contenu réel du fichier, ré-encodage WebP, variantes. */
export async function uploadMedia(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await requireActionUser();
    const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length === 0) return fail("Choisissez au moins une image.");
    if (files.length > 10) return fail("10 fichiers maximum à la fois.");
    const db = getDb();
    const created: { id: number; thumb: string; title: string; alt: string }[] = [];
    const errors: string[] = [];
    for (const file of files) {
      try {
        const img = await processImage(Buffer.from(await file.arrayBuffer()));
        const name = cleanFileName(file.name);
        const [row] = await db
          .insert(schema.media)
          .values({ ...img, originalName: name, title: name.replace(/\.[a-z0-9]+$/i, ""), alt: "" })
          .returning();
        created.push({ id: row!.id, thumb: mediaUrl(row!, "thumb"), title: row!.title, alt: row!.alt });
        await audit(user, "media.upload", "media", row!.id, name);
      } catch (e) {
        if (e instanceof UploadError) errors.push(`${cleanFileName(file.name)} : ${e.message}`);
        else throw e;
      }
    }
    if (created.length === 0) return fail(errors.join(" "));
    const msg = `${created.length} image${created.length > 1 ? "s" : ""} importée${created.length > 1 ? "s" : ""}. Pensez à renseigner le texte alternatif.`;
    return { ...ok(errors.length ? `${msg} Refusé : ${errors.join(" ")}` : msg, { created }) };
  } catch (err) {
    return handleError(err, "uploadMedia");
  }
}

const metaSchema = z.object({
  alt: z.string().trim().max(300, "300 caractères maximum."),
  title: z.string().trim().max(200),
  description: z.string().trim().max(2000),
  credit: z.string().trim().max(200),
});

export async function updateMedia(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await requireActionUser();
    const id = int(fd, "id");
    const parsed = metaSchema.safeParse({ alt: str(fd, "alt"), title: str(fd, "title"), description: str(fd, "description"), credit: str(fd, "credit") });
    if (!parsed.success) return fail("Certains champs sont à corriger.", zodErrors(parsed.error));
    await getDb().update(schema.media).set({ ...parsed.data, updatedAt: new Date() }).where(eq(schema.media.id, id));
    await audit(user, "media.update", "media", id, parsed.data.title);
    return ok("Informations de l'image enregistrées.");
  } catch (err) {
    return handleError(err, "updateMedia");
  }
}

/** Remplace le fichier d'une image en conservant ses usages (même identifiant). */
export async function replaceMedia(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await requireActionUser();
    const id = int(fd, "id");
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) return fail("Choisissez une image.");
    const db = getDb();
    const [cur] = await db.select().from(schema.media).where(eq(schema.media.id, id));
    if (!cur) return fail("Cette image n'existe plus.");
    let img;
    try {
      img = await processImage(Buffer.from(await file.arrayBuffer()));
    } catch (e) {
      if (e instanceof UploadError) return fail(e.message);
      throw e;
    }
    await db.update(schema.media).set({ ...img, originalName: cleanFileName(file.name), updatedAt: new Date() }).where(eq(schema.media.id, id));
    await deleteStoredImage(cur.storageKey);
    await audit(user, "media.replace", "media", id, cleanFileName(file.name));
    return ok("Image remplacée partout où elle est utilisée.");
  } catch (err) {
    return handleError(err, "replaceMedia");
  }
}

/** Liste des endroits où une image est utilisée (pages, projets, domaines, partenaires, paramètres). */
export async function mediaUsages(id: number) {
  await requireActionUser();
  const db = getDb();
  const usages: string[] = [];
  const needle = `"imageId": ${id}`;
  const pages = await db
    .select({ id: schema.pages.id, draft: schema.pages.draft, published: schema.pages.published })
    .from(schema.pages)
    .where(or(sql`${schema.pages.draft}::text like ${"%" + needle + "%"}`, sql`${schema.pages.published}::text like ${"%" + needle + "%"}`, sql`(${schema.pages.draft}->>'ogImageId')::int = ${id}`));
  for (const p of pages) {
    // Confirmation exacte (le filtre SQL ci-dessus est volontairement large : 5 ≠ 50)
    const used = [p.draft, p.published].some((c) => c && (c.ogImageId === id || mediaIdsInSections(c.sections).includes(id)));
    if (used) usages.push(`Page « ${p.draft.title} »`);
  }
  for (const p of await db.select({ title: schema.projects.title }).from(schema.projects).where(eq(schema.projects.coverId, id))) usages.push(`Projet « ${p.title} »`);
  for (const d of await db.select({ title: schema.domains.title }).from(schema.domains).where(eq(schema.domains.imageId, id))) usages.push(`Domaine « ${d.title} »`);
  for (const p of await db.select({ name: schema.partners.name }).from(schema.partners).where(eq(schema.partners.logoId, id))) usages.push(`Partenaire « ${p.name} »`);
  const s = await getSettings();
  if (s.identity.logoId === id) usages.push("Paramètres › Logo du site");
  if (s.seo.ogImageId === id) usages.push("Paramètres › Image de partage par défaut");
  return usages;
}

/** Suppression contrôlée : refusée tant que l'image est utilisée. */
export async function deleteMedia(fd: FormData) {
  const user = await requireActionUser();
  const id = int(fd, "id");
  const usages = await mediaUsages(id);
  if (usages.length) redirect(`/admin/medias/${id}?erreur=utilisee`);
  const db = getDb();
  const [cur] = await db.select().from(schema.media).where(eq(schema.media.id, id));
  if (cur) {
    await db.delete(schema.media).where(eq(schema.media.id, id));
    await deleteStoredImage(cur.storageKey);
    await audit(user, "media.delete", "media", id, cur.originalName);
  }
  redirect("/admin/medias?supprime=1");
}
