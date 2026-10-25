import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * Tant que ALLOW_INDEXING n'est pas à « true » ou que le mode préproduction
 * est actif dans les paramètres, tout le site est exclu de l'indexation.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const s = await getSettings();
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  if (process.env.ALLOW_INDEXING !== "true" || s.seo.preproduction) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/apercu", "/api"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
