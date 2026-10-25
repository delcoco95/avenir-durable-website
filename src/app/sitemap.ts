import type { MetadataRoute } from "next";
import { getDb, schema } from "@/db";
import { isNotNull } from "drizzle-orm";
import { getPublishedDomains, getPublishedProjects } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const pages = await getDb().select({ slug: schema.pages.slug, updatedAt: schema.pages.publishedAt }).from(schema.pages).where(isNotNull(schema.pages.published));
  const [projects, domains] = await Promise.all([getPublishedProjects(), getPublishedDomains()]);
  return [
    ...pages.map((p) => ({ url: p.slug === "accueil" ? `${base}/` : `${base}/${p.slug}`, lastModified: p.updatedAt ?? undefined, priority: p.slug === "accueil" ? 1 : 0.7 })),
    ...domains.map((d) => ({ url: `${base}/nos-actions/${d.slug}`, lastModified: d.updatedAt, priority: 0.6 })),
    ...projects.map((p) => ({ url: `${base}/projets/${p.slug}`, lastModified: p.updatedAt, priority: 0.6 })),
  ];
}
