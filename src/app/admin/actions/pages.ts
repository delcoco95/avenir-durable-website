"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import type { PageContent } from "@/db/schema";
import { requireActionUser } from "@/lib/auth/guard";
import { audit } from "@/lib/audit";
import { sectionsSchema, newSectionId } from "@/lib/sections";
import { RESERVED_SLUGS, SLUG_RE, slugify } from "@/lib/slug";
import { bool, fail, handleError, int, ok, str, zodErrors } from "./helpers";
import type { FormState } from "./types";

const contentSchema = z.object({
  title: z.string().trim().min(1, "Le titre est obligatoire.").max(160),
  seoTitle: z.string().trim().max(70, "70 caractères maximum (au-delà, Google tronque le titre).").default(""),
  seoDescription: z.string().trim().max(170, "170 caractères maximum.").default(""),
  ogImageId: z.number().int().positive().nullable().default(null),
  sections: sectionsSchema,
});

const metaSchema = z.object({
  slug: z.string().trim().regex(SLUG_RE, "Adresse : lettres minuscules, chiffres et tirets uniquement.").max(100),
  showInNav: z.boolean(),
  navLabel: z.string().trim().max(60),
  navOrder: z.number().int().min(0).max(999),
  showInFooter: z.boolean(),
  needsReview: z.boolean(),
});

function parseContent(fd: FormData) {
  let payload: unknown;
  try {
    payload = JSON.parse(String(fd.get("content") ?? "{}"));
  } catch {
    return { error: fail("Le contenu envoyé est illisible. Rechargez la page et réessayez.") };
  }
  const parsed = contentSchema.safeParse(payload);
  if (!parsed.success) {
    const errors = zodErrors(parsed.error);
    const first = parsed.error.issues[0];
    const where = first?.path[0] === "sections" && typeof first.path[1] === "number" ? ` (section ${first.path[1] + 1})` : "";
    return { error: fail(`Certains champs sont à corriger${where} : ${first?.message ?? ""}`, errors) };
  }
  return { content: parsed.data as PageContent };
}

/**
 * Enregistre le brouillon (contenu + réglages de navigation).
 * Avec intent=publish, le brouillon devient aussi la version publiée.
 */
export async function savePage(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await requireActionUser();
    const id = int(fd, "id");
    const intent = str(fd, "intent");
    const db = getDb();
    const [page] = await db.select().from(schema.pages).where(eq(schema.pages.id, id));
    if (!page) return fail("Cette page n'existe plus.");

    const { content, error } = parseContent(fd);
    if (error) return error;

    const meta = metaSchema.safeParse({
      slug: page.isSystem ? page.slug : str(fd, "slug"),
      showInNav: bool(fd, "showInNav"),
      navLabel: str(fd, "navLabel"),
      navOrder: int(fd, "navOrder", 100),
      showInFooter: bool(fd, "showInFooter"),
      needsReview: bool(fd, "needsReview"),
    });
    if (!meta.success) return fail("Réglages de la page invalides.", zodErrors(meta.error));
    if (!page.isSystem && RESERVED_SLUGS.has(meta.data.slug)) return fail("Cette adresse est réservée par le site.", { slug: "Adresse réservée" });

    const publish = intent === "publish";
    const now = new Date();
    await db
      .update(schema.pages)
      .set({
        ...meta.data,
        draft: content!,
        updatedAt: now,
        ...(publish ? { published: content!, publishedAt: now, hasUnpublishedChanges: false } : { hasUnpublishedChanges: true }),
      })
      .where(eq(schema.pages.id, id));
    await audit(user, publish ? "page.publish" : "page.save", "page", id, content!.title);
    return ok(publish ? "Page publiée : les modifications sont visibles sur le site." : "Brouillon enregistré. Le site public n'est pas modifié tant que vous ne publiez pas.");
  } catch (err) {
    return handleError(err, "savePage");
  }
}

export async function unpublishPage(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await requireActionUser();
    const id = int(fd, "id");
    const db = getDb();
    const [page] = await db.select().from(schema.pages).where(eq(schema.pages.id, id));
    if (!page) return fail("Cette page n'existe plus.");
    if (page.slug === "accueil") return fail("La page d'accueil ne peut pas être dépubliée.");
    await db.update(schema.pages).set({ published: null, hasUnpublishedChanges: true, updatedAt: new Date() }).where(eq(schema.pages.id, id));
    await audit(user, "page.unpublish", "page", id, page.draft.title);
    return ok("Page dépubliée : elle n'est plus visible sur le site (son contenu est conservé).");
  } catch (err) {
    return handleError(err, "unpublishPage");
  }
}

/** Abandonne les modifications non publiées (le brouillon redevient la version en ligne). */
export async function revertPage(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await requireActionUser();
    const id = int(fd, "id");
    const db = getDb();
    const [page] = await db.select().from(schema.pages).where(eq(schema.pages.id, id));
    if (!page?.published) return fail("Aucune version publiée à restaurer.");
    await db.update(schema.pages).set({ draft: page.published, hasUnpublishedChanges: false, updatedAt: new Date() }).where(eq(schema.pages.id, id));
    await audit(user, "page.revert", "page", id, page.published.title);
    return ok("Brouillon réinitialisé à partir de la version publiée.");
  } catch (err) {
    return handleError(err, "revertPage");
  }
}

export async function createPage(_prev: FormState, fd: FormData): Promise<FormState> {
  let id: number;
  try {
    const user = await requireActionUser();
    const title = str(fd, "title");
    if (!title) return fail("Indiquez un titre.", { title: "Titre obligatoire" });
    const slug = slugify(str(fd, "slug") || title);
    if (!SLUG_RE.test(slug)) return fail("Adresse invalide.", { slug: "Lettres minuscules, chiffres et tirets" });
    if (RESERVED_SLUGS.has(slug) || slug === "accueil") return fail("Cette adresse est réservée par le site.", { slug: "Adresse réservée" });
    const content: PageContent = {
      title,
      seoTitle: "",
      seoDescription: "",
      ogImageId: null,
      sections: [
        { id: newSectionId(), type: "hero", variant: "page", eyebrow: "", title, text: "", primaryCta: { label: "", href: "" }, secondaryCta: { label: "", href: "" }, imageId: null },
        { id: newSectionId(), type: "text", eyebrow: "", title: "", body: "" },
      ],
    };
    const [row] = await getDb().insert(schema.pages).values({ slug, draft: content, published: null }).returning({ id: schema.pages.id });
    id = row!.id;
    await audit(user, "page.create", "page", id, title);
  } catch (err) {
    return handleError(err, "createPage");
  }
  redirect(`/admin/pages/${id}?cree=1`);
}

export async function deletePage(fd: FormData) {
  const user = await requireActionUser();
  const id = int(fd, "id");
  const db = getDb();
  const [page] = await db.select().from(schema.pages).where(eq(schema.pages.id, id));
  if (!page) redirect("/admin/pages");
  if (page.isSystem) redirect(`/admin/pages/${id}?erreur=systeme`);
  await db.delete(schema.pages).where(eq(schema.pages.id, id));
  await audit(user, "page.delete", "page", id, page.draft.title);
  redirect("/admin/pages?supprime=1");
}
