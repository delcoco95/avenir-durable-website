/** Adresse lisible : « Atelier jardin & potager » → « atelier-jardin-potager » */
export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Adresses réservées par l'application (ne peuvent pas être utilisées par une page). */
export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "media",
  "apercu",
  "_next",
  "sitemap.xml",
  "robots.txt",
  "favicon.ico",
  "icon",
  "projets",
  "nos-actions",
]);
