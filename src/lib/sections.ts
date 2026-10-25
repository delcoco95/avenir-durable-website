import { z } from "zod";

/**
 * Sections (blocs) composant une page. Chaque page est une liste ordonnée de
 * sections, éditables et réorganisables depuis l'administration.
 * Toute donnée est validée côté serveur avant enregistrement.
 */

const s = (max: number) => z.string().trim().max(max).default("");
/** Lien sûr : chemin interne, https://, mailto: ou tel: (jamais javascript:) */
export const safeHref = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^(\/(?!\/)[^\s]*|https:\/\/[^\s<>"]+|mailto:[^\s<>"]+|tel:[+0-9 ().-]+|#[a-z0-9-]+)$/i.test(v), "Lien invalide (utilisez /page, https://…, mailto: ou tel:)")
  .default("");
const link = z.object({ label: s(60), href: safeHref }).default({ label: "", href: "" });
const mediaId = z.number().int().positive().nullable().default(null);
const id = z.string().regex(/^[a-z0-9]{6,24}$/);

export const heroSection = z.object({
  id,
  type: z.literal("hero"),
  variant: z.enum(["home", "page"]).default("page"),
  eyebrow: s(80),
  title: s(160).pipe(z.string().min(1, "Titre requis")),
  text: s(500),
  primaryCta: link,
  secondaryCta: link,
  imageId: mediaId,
});

export const statementSection = z.object({
  id,
  type: z.literal("statement"),
  eyebrow: s(80),
  title: s(300),
  text: s(1200),
  link,
});

export const textSection = z.object({
  id,
  type: z.literal("text"),
  eyebrow: s(80),
  title: s(160),
  body: s(20000),
});

export const imageTextSection = z.object({
  id,
  type: z.literal("imageText"),
  eyebrow: s(80),
  title: s(160),
  body: s(6000),
  imageId: mediaId,
  imageSide: z.enum(["left", "right"]).default("right"),
  link,
});

const item = z.object({ title: s(100), text: s(500) });

export const valuesSection = z.object({
  id,
  type: z.literal("values"),
  eyebrow: s(80),
  title: s(160),
  intro: s(600),
  items: z.array(item).max(8).default([]),
});

export const cycleSection = z.object({
  id,
  type: z.literal("cycle"),
  eyebrow: s(80),
  title: s(160),
  intro: s(600),
  steps: z.array(item).min(0).max(6).default([]),
});

export const domainsSection = z.object({
  id,
  type: z.literal("domains"),
  eyebrow: s(80),
  title: s(160),
  intro: s(600),
  layout: z.enum(["grid", "list"]).default("grid"),
});

export const projectsSection = z.object({
  id,
  type: z.literal("projects"),
  eyebrow: s(80),
  title: s(160),
  intro: s(600),
  mode: z.enum(["featured", "all"]).default("featured"),
  limit: z.number().int().min(1).max(24).default(3),
  link,
});

export const partnersSection = z.object({
  id,
  type: z.literal("partners"),
  eyebrow: s(80),
  title: s(160),
  intro: s(600),
});

export const faqSection = z.object({
  id,
  type: z.literal("faq"),
  eyebrow: s(80),
  title: s(160),
  intro: s(600),
  category: s(80),
  limit: z.number().int().min(0).max(50).default(0),
  link,
});

export const ctaSection = z.object({
  id,
  type: z.literal("cta"),
  title: s(160),
  text: s(500),
  button: link,
  tone: z.enum(["forest", "soft"]).default("forest"),
});

export const contactSection = z.object({
  id,
  type: z.literal("contact"),
  title: s(160),
  intro: s(800),
});

export const legalSection = z.object({
  id,
  type: z.literal("legal"),
  kind: z.enum(["mentions", "confidentialite", "cookies"]),
  extra: s(20000),
});

export const sectionSchema = z.discriminatedUnion("type", [
  heroSection,
  statementSection,
  textSection,
  imageTextSection,
  valuesSection,
  cycleSection,
  domainsSection,
  projectsSection,
  partnersSection,
  faqSection,
  ctaSection,
  contactSection,
  legalSection,
]);

export type Section = z.infer<typeof sectionSchema>;
export type SectionType = Section["type"];
export type SectionOf<T extends SectionType> = Extract<Section, { type: T }>;

export const sectionsSchema = z.array(sectionSchema).max(40);

export const SECTION_LABELS: Record<SectionType, { label: string; help: string }> = {
  hero: { label: "Bandeau d'en-tête", help: "Grand titre, message et boutons en haut de page." },
  statement: { label: "Message fort", help: "Une phrase éditoriale mise en avant." },
  text: { label: "Texte libre", help: "Paragraphes, listes et liens (mise en forme simple)." },
  imageText: { label: "Image et texte", help: "Une image accompagnée d'un texte." },
  values: { label: "Valeurs / points clés", help: "Liste de valeurs ou d'engagements." },
  cycle: { label: "Démarche en étapes", help: "Schéma animé d'une démarche (3 à 6 étapes)." },
  domains: { label: "Domaines d'intervention", help: "Affiche les domaines gérés dans « Domaines »." },
  projects: { label: "Projets", help: "Affiche les projets publiés." },
  partners: { label: "Partenaires", help: "Affiche les partenaires confirmés uniquement." },
  faq: { label: "Questions fréquentes", help: "Affiche les questions de la FAQ." },
  cta: { label: "Appel à l'action", help: "Encart incitant à agir, avec un bouton." },
  contact: { label: "Formulaire de contact", help: "Coordonnées et formulaire." },
  legal: { label: "Contenu légal", help: "Mentions légales, confidentialité ou cookies (générés depuis les paramètres)." },
};

export function newSectionId() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

/** Valeurs initiales d'une nouvelle section ajoutée dans l'éditeur. */
export function blankSection(type: SectionType): Section {
  const base = { id: newSectionId() };
  switch (type) {
    case "hero":
      return { ...base, type, variant: "page", eyebrow: "", title: "Nouveau titre", text: "", primaryCta: { label: "", href: "" }, secondaryCta: { label: "", href: "" }, imageId: null };
    case "statement":
      return { ...base, type, eyebrow: "", title: "Votre message", text: "", link: { label: "", href: "" } };
    case "text":
      return { ...base, type, eyebrow: "", title: "", body: "" };
    case "imageText":
      return { ...base, type, eyebrow: "", title: "", body: "", imageId: null, imageSide: "right", link: { label: "", href: "" } };
    case "values":
      return { ...base, type, eyebrow: "", title: "Nos valeurs", intro: "", items: [{ title: "", text: "" }] };
    case "cycle":
      return { ...base, type, eyebrow: "", title: "Notre démarche", intro: "", steps: [{ title: "", text: "" }, { title: "", text: "" }, { title: "", text: "" }] };
    case "domains":
      return { ...base, type, eyebrow: "", title: "Nos domaines d'intervention", intro: "", layout: "grid" };
    case "projects":
      return { ...base, type, eyebrow: "", title: "Projets et initiatives", intro: "", mode: "featured", limit: 3, link: { label: "", href: "" } };
    case "partners":
      return { ...base, type, eyebrow: "", title: "Ils agissent avec nous", intro: "" };
    case "faq":
      return { ...base, type, eyebrow: "", title: "Questions fréquentes", intro: "", category: "", limit: 0, link: { label: "", href: "" } };
    case "cta":
      return { ...base, type, title: "Envie d'agir avec nous ?", text: "", button: { label: "Nous contacter", href: "/contact" }, tone: "forest" };
    case "contact":
      return { ...base, type, title: "Écrivez-nous", intro: "" };
    case "legal":
      return { ...base, type, kind: "mentions", extra: "" };
  }
}

/** Identifiants des médias référencés par des sections (contrôle avant suppression). */
export function mediaIdsInSections(sections: unknown[]): number[] {
  const ids: number[] = [];
  for (const sec of sections as Record<string, unknown>[]) {
    for (const k of ["imageId"]) {
      const v = sec?.[k];
      if (typeof v === "number") ids.push(v);
    }
  }
  return ids;
}
