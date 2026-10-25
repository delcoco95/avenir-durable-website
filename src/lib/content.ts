import { cache } from "react";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Media } from "@/db/schema";
import type { Variant } from "./media";

/* Requêtes de lecture du site public : seuls les contenus publiés sont renvoyés. */

export type MediaRef = { id: number; src: string; srcMd: string; srcThumb: string; alt: string; width: number; height: number; credit: string };

export function mediaUrl(m: Pick<Media, "storageKey">, variant: Variant = "full") {
  return `/media/${m.storageKey}-${variant}.webp`;
}

export function toMediaRef(m: Media): MediaRef {
  return {
    id: m.id,
    src: mediaUrl(m, "full"),
    srcMd: mediaUrl(m, "md"),
    srcThumb: mediaUrl(m, "thumb"),
    alt: m.alt,
    width: m.width,
    height: m.height,
    credit: m.credit,
  };
}

export async function getMediaMap(ids: (number | null | undefined)[]) {
  const unique = [...new Set(ids.filter((x): x is number => typeof x === "number"))];
  const map = new Map<number, MediaRef>();
  if (unique.length === 0) return map;
  const rows = await getDb().select().from(schema.media).where(inArray(schema.media.id, unique));
  for (const r of rows) map.set(r.id, toMediaRef(r));
  return map;
}

export const getPublishedPage = cache(async (slug: string) => {
  const [row] = await getDb().select().from(schema.pages).where(eq(schema.pages.slug, slug)).limit(1);
  if (!row || !row.published) return null;
  return { ...row, content: row.published };
});

export const getNavPages = cache(async () => {
  const rows = await getDb()
    .select({ slug: schema.pages.slug, navLabel: schema.pages.navLabel, published: schema.pages.published, showInNav: schema.pages.showInNav, showInFooter: schema.pages.showInFooter, navOrder: schema.pages.navOrder })
    .from(schema.pages)
    .orderBy(asc(schema.pages.navOrder));
  const live = rows.filter((r) => r.published);
  const toLink = (r: (typeof live)[number]) => ({ href: r.slug === "accueil" ? "/" : `/${r.slug}`, label: r.navLabel || r.published!.title, slug: r.slug });
  return {
    main: live.filter((r) => r.showInNav).map(toLink),
    footer: live.filter((r) => r.showInFooter).map(toLink),
    publishedSlugs: new Set(live.map((r) => r.slug)),
  };
});

export const getPublishedDomains = cache(async () => {
  return getDb().select().from(schema.domains).where(eq(schema.domains.status, "published")).orderBy(asc(schema.domains.sortOrder), asc(schema.domains.id));
});

export async function getPublishedDomain(slug: string) {
  const [row] = await getDb()
    .select()
    .from(schema.domains)
    .where(and(eq(schema.domains.slug, slug), eq(schema.domains.status, "published")))
    .limit(1);
  return row ?? null;
}

export const getPublishedProjects = cache(async () => {
  return getDb()
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.status, "published"))
    .orderBy(desc(schema.projects.featured), asc(schema.projects.sortOrder), desc(schema.projects.publishedAt));
});

export async function getPublishedProject(slug: string) {
  const [row] = await getDb()
    .select()
    .from(schema.projects)
    .where(and(eq(schema.projects.slug, slug), eq(schema.projects.status, "published")))
    .limit(1);
  return row ?? null;
}

/** Seuls les partenariats confirmés ET publiés sont visibles. */
export const getVisiblePartners = cache(async () => {
  return getDb()
    .select()
    .from(schema.partners)
    .where(and(eq(schema.partners.status, "published"), eq(schema.partners.verified, true)))
    .orderBy(asc(schema.partners.sortOrder), asc(schema.partners.name));
});

export const getPublishedFaq = cache(async () => {
  return getDb().select().from(schema.faqItems).where(eq(schema.faqItems.status, "published")).orderBy(asc(schema.faqItems.sortOrder), asc(schema.faqItems.id));
});
