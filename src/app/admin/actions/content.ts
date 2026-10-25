"use server";

import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { requireActionUser } from "@/lib/auth/guard";
import { audit } from "@/lib/audit";
import { SLUG_RE, slugify } from "@/lib/slug";
import { DOMAIN_ICONS } from "@/components/site/Rings";
import { bool, fail, handleError, int, ok, optId, str, zodErrors } from "./helpers";
import type { FormState } from "./types";

/* ───────────── Projets ───────────── */

const status = z.enum(["draft", "published"]);
const slugField = z.string().regex(SLUG_RE, "Lettres minuscules, chiffres et tirets uniquement.").max(100);

const projectSchema = z.object({
  title: z.string().trim().min(1, "Le titre est obligatoire.").max(160),
  slug: slugField,
  summary: z.string().trim().max(400, "400 caractères maximum."),
  body: z.string().trim().max(30000),
  coverId: z.number().int().positive().nullable(),
  domainId: z.number().int().positive().nullable(),
  location: z.string().trim().max(160),
  period: z.string().trim().max(120),
  audience: z.string().trim().max(160),
  status,
  featured: z.boolean(),
  isPlaceholder: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
  seoDescription: z.string().trim().max(300),
});

export async function saveProject(_prev: FormState, fd: FormData): Promise<FormState> {
  let newId: number | null = null;
  try {
    const user = await requireActionUser();
    const id = int(fd, "id");
    const title = str(fd, "title");
    const parsed = projectSchema.safeParse({
      title,
      slug: slugify(str(fd, "slug") || title),
      summary: str(fd, "summary"),
      body: str(fd, "body"),
      coverId: optId(fd, "coverId"),
      domainId: optId(fd, "domainId"),
      location: str(fd, "location"),
      period: str(fd, "period"),
      audience: str(fd, "audience"),
      status: str(fd, "status") || "draft",
      featured: bool(fd, "featured"),
      isPlaceholder: bool(fd, "isPlaceholder"),
      sortOrder: int(fd, "sortOrder", 100),
      seoDescription: str(fd, "seoDescription"),
    });
    if (!parsed.success) return fail("Certains champs sont à corriger.", zodErrors(parsed.error));
    const data = parsed.data;
    const db = getDb();
    const now = new Date();
    if (id > 0) {
      const [cur] = await db.select().from(schema.projects).where(eq(schema.projects.id, id));
      if (!cur) return fail("Ce projet n'existe plus.");
      await db
        .update(schema.projects)
        .set({ ...data, updatedAt: now, publishedAt: data.status === "published" ? (cur.publishedAt ?? now) : cur.publishedAt })
        .where(eq(schema.projects.id, id));
      await audit(user, data.status === "published" ? "project.publish" : "project.save", "project", id, data.title);
      return ok(data.status === "published" ? "Projet enregistré et publié." : "Projet enregistré (brouillon, non visible sur le site).");
    }
    const [row] = await db
      .insert(schema.projects)
      .values({ ...data, publishedAt: data.status === "published" ? now : null })
      .returning({ id: schema.projects.id });
    newId = row!.id;
    await audit(user, "project.create", "project", newId, data.title);
  } catch (err) {
    return handleError(err, "saveProject");
  }
  redirect(`/admin/projets/${newId}?cree=1`);
}

export async function deleteProject(fd: FormData) {
  const user = await requireActionUser();
  const id = int(fd, "id");
  const db = getDb();
  const [p] = await db.select().from(schema.projects).where(eq(schema.projects.id, id));
  if (p) {
    await db.delete(schema.projects).where(eq(schema.projects.id, id));
    await audit(user, "project.delete", "project", id, p.title);
  }
  redirect("/admin/projets?supprime=1");
}

/* ───────────── Domaines d'intervention ───────────── */

const domainSchema = z.object({
  title: z.string().trim().min(1, "Le titre est obligatoire.").max(160),
  slug: slugField,
  summary: z.string().trim().max(400, "400 caractères maximum."),
  body: z.string().trim().max(30000),
  icon: z.enum(DOMAIN_ICONS),
  imageId: z.number().int().positive().nullable(),
  status,
  sortOrder: z.number().int().min(0).max(9999),
  needsReview: z.boolean(),
});

export async function saveDomain(_prev: FormState, fd: FormData): Promise<FormState> {
  let newId: number | null = null;
  try {
    const user = await requireActionUser();
    const id = int(fd, "id");
    const title = str(fd, "title");
    const parsed = domainSchema.safeParse({
      title,
      slug: slugify(str(fd, "slug") || title),
      summary: str(fd, "summary"),
      body: str(fd, "body"),
      icon: str(fd, "icon") || "leaf",
      imageId: optId(fd, "imageId"),
      status: str(fd, "status") || "draft",
      sortOrder: int(fd, "sortOrder", 100),
      needsReview: bool(fd, "needsReview"),
    });
    if (!parsed.success) return fail("Certains champs sont à corriger.", zodErrors(parsed.error));
    const db = getDb();
    if (id > 0) {
      await db.update(schema.domains).set({ ...parsed.data, updatedAt: new Date() }).where(eq(schema.domains.id, id));
      await audit(user, "domain.save", "domain", id, parsed.data.title);
      return ok(parsed.data.status === "published" ? "Domaine enregistré et publié." : "Domaine enregistré (brouillon).");
    }
    const [row] = await db.insert(schema.domains).values(parsed.data).returning({ id: schema.domains.id });
    newId = row!.id;
    await audit(user, "domain.create", "domain", newId, parsed.data.title);
  } catch (err) {
    return handleError(err, "saveDomain");
  }
  redirect(`/admin/domaines/${newId}?cree=1`);
}

export async function deleteDomain(fd: FormData) {
  const user = await requireActionUser();
  const id = int(fd, "id");
  const db = getDb();
  const [d] = await db.select().from(schema.domains).where(eq(schema.domains.id, id));
  if (d) {
    await db.delete(schema.domains).where(eq(schema.domains.id, id)); // les projets liés sont conservés (lien remis à vide)
    await audit(user, "domain.delete", "domain", id, d.title);
  }
  redirect("/admin/domaines?supprime=1");
}

/* ───────────── FAQ ───────────── */

const faqSchema = z.object({
  category: z.string().trim().min(1, "Indiquez un thème.").max(80),
  question: z.string().trim().min(5, "La question est trop courte.").max(300),
  answer: z.string().trim().min(2, "La réponse est obligatoire.").max(10000),
  status,
  sortOrder: z.number().int().min(0).max(9999),
  needsReview: z.boolean(),
});

export async function saveFaq(_prev: FormState, fd: FormData): Promise<FormState> {
  let newId: number | null = null;
  try {
    const user = await requireActionUser();
    const id = int(fd, "id");
    const parsed = faqSchema.safeParse({
      category: str(fd, "category"),
      question: str(fd, "question"),
      answer: str(fd, "answer"),
      status: str(fd, "status") || "draft",
      sortOrder: int(fd, "sortOrder", 100),
      needsReview: bool(fd, "needsReview"),
    });
    if (!parsed.success) return fail("Certains champs sont à corriger.", zodErrors(parsed.error));
    const db = getDb();
    if (id > 0) {
      await db.update(schema.faqItems).set({ ...parsed.data, updatedAt: new Date() }).where(eq(schema.faqItems.id, id));
      await audit(user, "faq.save", "faq", id, parsed.data.question);
      return ok("Question enregistrée.");
    }
    const [row] = await db.insert(schema.faqItems).values(parsed.data).returning({ id: schema.faqItems.id });
    newId = row!.id;
    await audit(user, "faq.create", "faq", newId, parsed.data.question);
  } catch (err) {
    return handleError(err, "saveFaq");
  }
  redirect(`/admin/faq/${newId}?cree=1`);
}

export async function deleteFaq(fd: FormData) {
  const user = await requireActionUser();
  const id = int(fd, "id");
  const db = getDb();
  const [f] = await db.select().from(schema.faqItems).where(eq(schema.faqItems.id, id));
  if (f) {
    await db.delete(schema.faqItems).where(eq(schema.faqItems.id, id));
    await audit(user, "faq.delete", "faq", id, f.question);
  }
  redirect("/admin/faq?supprime=1");
}

/** Déplace un élément d'un cran (ordre d'affichage). */
export async function moveItem(fd: FormData) {
  await requireActionUser();
  const kind = str(fd, "kind");
  const id = int(fd, "id");
  const dir = str(fd, "dir") === "up" ? -1 : 1;
  const db = getDb();
  const table = kind === "faq" ? schema.faqItems : kind === "domain" ? schema.domains : kind === "partner" ? schema.partners : kind === "project" ? schema.projects : null;
  const back = kind === "faq" ? "/admin/faq" : kind === "domain" ? "/admin/domaines" : kind === "partner" ? "/admin/partenaires" : "/admin/projets";
  if (!table) redirect(back);
  const rows = await db.select({ id: table.id, sortOrder: table.sortOrder }).from(table).orderBy(table.sortOrder, table.id);
  const idx = rows.findIndex((r) => r.id === id);
  const swap = rows[idx + dir];
  if (idx > -1 && swap) {
    // Renumérotation propre (10, 20, 30…) puis échange
    const ordered = [...rows];
    [ordered[idx], ordered[idx + dir]] = [ordered[idx + dir]!, ordered[idx]!];
    for (const [i, r] of ordered.entries()) await db.update(table).set({ sortOrder: (i + 1) * 10 }).where(eq(table.id, r.id));
  }
  redirect(back);
}

/* ───────────── Partenaires ───────────── */

const partnerSchema = z.object({
  name: z.string().trim().min(1, "Le nom est obligatoire.").max(160),
  url: z.string().trim().max(300).refine((v) => v === "" || /^https:\/\/[^\s<>"]+$/i.test(v), "L'adresse doit commencer par https://"),
  description: z.string().trim().max(400),
  logoId: z.number().int().positive().nullable(),
  verified: z.boolean(),
  status,
  sortOrder: z.number().int().min(0).max(9999),
});

export async function savePartner(_prev: FormState, fd: FormData): Promise<FormState> {
  let newId: number | null = null;
  try {
    const user = await requireActionUser();
    const id = int(fd, "id");
    const parsed = partnerSchema.safeParse({
      name: str(fd, "name"),
      url: str(fd, "url"),
      description: str(fd, "description"),
      logoId: optId(fd, "logoId"),
      verified: bool(fd, "verified"),
      status: str(fd, "status") || "draft",
      sortOrder: int(fd, "sortOrder", 100),
    });
    if (!parsed.success) return fail("Certains champs sont à corriger.", zodErrors(parsed.error));
    const db = getDb();
    if (id > 0) {
      await db.update(schema.partners).set({ ...parsed.data, updatedAt: new Date() }).where(eq(schema.partners.id, id));
      await audit(user, "partner.save", "partner", id, parsed.data.name);
      const visible = parsed.data.status === "published" && parsed.data.verified;
      return ok(visible ? "Partenaire enregistré et visible sur le site." : "Partenaire enregistré. Il ne sera affiché que s'il est publié ET confirmé.");
    }
    const [row] = await db.insert(schema.partners).values(parsed.data).returning({ id: schema.partners.id });
    newId = row!.id;
    await audit(user, "partner.create", "partner", newId, parsed.data.name);
  } catch (err) {
    return handleError(err, "savePartner");
  }
  redirect(`/admin/partenaires/${newId}?cree=1`);
}

export async function deletePartner(fd: FormData) {
  const user = await requireActionUser();
  const id = int(fd, "id");
  const db = getDb();
  const [p] = await db.select().from(schema.partners).where(eq(schema.partners.id, id));
  if (p) {
    await db.delete(schema.partners).where(eq(schema.partners.id, id));
    await audit(user, "partner.delete", "partner", id, p.name);
  }
  redirect("/admin/partenaires?supprime=1");
}

/** Vérifie qu'un identifiant d'URL est libre (utilisé pour les messages d'aide). */
export async function isSlugFree(kind: "project" | "domain", slug: string, exceptId: number) {
  await requireActionUser();
  const table = kind === "project" ? schema.projects : schema.domains;
  const rows = await getDb().select({ id: table.id }).from(table).where(and(eq(table.slug, slug), ne(table.id, exceptId)));
  return rows.length === 0;
}
