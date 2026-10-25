import { z } from "zod";

/**
 * Paramètres globaux du site, modifiables dans Administration › Paramètres.
 * Les valeurs par défaut proviennent de la recherche (docs/RESEARCH.md) ;
 * les champs marqués « à compléter » doivent être fournis par l'association.
 */

const str = (max: number) => z.string().trim().max(max);
const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^https:\/\/[^\s<>"]+$/i.test(v), "L'adresse doit commencer par https://");
const hex = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Couleur au format #RRGGBB");
const email = z.union([z.literal(""), z.string().trim().max(254).pipe(z.email("Adresse e-mail invalide"))]);

export const identitySchema = z.object({
  siteName: str(80).min(1, "Nom requis"),
  legalName: str(160),
  tagline: str(160),
  shortDescription: str(400),
  logoId: z.number().int().positive().nullable(),
  logoAlt: str(160),
});

export const PALETTES = {
  foret: { label: "Forêt (couleurs du logo)", primary: "#2F7A34", accent: "#C4783A", soft: "#EEF6E6" },
  sous_bois: { label: "Sous-bois", primary: "#2E6B4F", accent: "#B8862F", soft: "#EDF4EE" },
  riviere: { label: "Rivière", primary: "#22686E", accent: "#C46A3A", soft: "#E8F3F2" },
} as const;

export const themeSchema = z.object({
  palette: z.enum(["foret", "sous_bois", "riviere", "personnalisee"]),
  primary: hex,
  accent: hex,
  soft: hex,
});

export const contactSchema = z.object({
  email: email,
  phone: str(40),
  address: str(300),
  hours: str(200),
  notificationEmail: email,
});

export const socialSchema = z.object({
  facebook: optionalUrl,
  instagram: optionalUrl,
  linkedin: optionalUrl,
  youtube: optionalUrl,
  x: optionalUrl,
  mastodon: optionalUrl,
});

export const footerSchema = z.object({
  text: str(400),
  ctaTitle: str(120),
  ctaText: str(300),
  copyright: str(160),
});

export const seoSchema = z.object({
  defaultTitle: str(70).min(1),
  titleTemplate: str(80),
  defaultDescription: str(170),
  ogImageId: z.number().int().positive().nullable(),
  preproduction: z.boolean(),
});

export const legalSchema = z.object({
  publisherName: str(160),
  publisherStatus: str(160),
  publisherAddress: str(300),
  registration: str(160),
  publicationDirector: str(160),
  hostName: str(160),
  hostAddress: str(300),
  hostContact: str(160),
  lastUpdated: str(40),
});

export const privacySchema = z.object({
  controller: str(200),
  dpoContact: str(200),
  messageRetentionMonths: z.number().int().min(1).max(36),
  lastUpdated: str(40),
});

export const consentServiceSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9-]{2,30}$/, "Identifiant : minuscules, chiffres, tirets"),
  name: str(80).min(1),
  category: z.enum(["statistiques", "medias", "autre"]),
  purpose: str(300),
  provider: str(160),
  cookies: str(300),
  duration: str(80),
  scriptUrl: optionalUrl,
  enabled: z.boolean(),
});

export const cookiesSchema = z.object({
  bannerTitle: str(120),
  bannerText: str(500),
  policyVersion: str(20),
  services: z.array(consentServiceSchema).max(10),
});

export const contactFormSchema = z.object({
  enabled: z.boolean(),
  topics: z.array(str(80).min(1)).max(10),
  successMessage: str(300),
  consentText: str(400),
});

export const siteSettingsSchema = z.object({
  identity: identitySchema,
  theme: themeSchema,
  contact: contactSchema,
  social: socialSchema,
  footer: footerSchema,
  seo: seoSchema,
  legal: legalSchema,
  privacy: privacySchema,
  cookies: cookiesSchema,
  contactForm: contactFormSchema,
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;
export type SettingsSection = keyof SiteSettings;
export type ConsentService = z.infer<typeof consentServiceSchema>;

export const sectionSchemas: { [K in SettingsSection]: z.ZodType<SiteSettings[K]> } = {
  identity: identitySchema,
  theme: themeSchema,
  contact: contactSchema,
  social: socialSchema,
  footer: footerSchema,
  seo: seoSchema,
  legal: legalSchema,
  privacy: privacySchema,
  cookies: cookiesSchema,
  contactForm: contactFormSchema,
};

export const TO_COMPLETE = "";

export const DEFAULT_SETTINGS: SiteSettings = {
  identity: {
    siteName: "Avenir Durable",
    legalName: "L'Avenir Durable",
    tagline: "Sensibiliser, mobiliser, agir pour un quotidien écoresponsable",
    shortDescription:
      "L'Avenir Durable est un projet qui sensibilise et mobilise le public aux enjeux environnementaux et de développement durable, à travers des ateliers, des activités et des actions concrètes.",
    logoId: null,
    logoAlt: "Avenir Durable",
  },
  theme: { palette: "foret", ...pick(PALETTES.foret) },
  contact: {
    email: "avenirdurable@ecomail.fr",
    phone: TO_COMPLETE,
    address: TO_COMPLETE,
    hours: TO_COMPLETE,
    notificationEmail: "avenirdurable@ecomail.fr",
  },
  social: { facebook: "", instagram: "", linkedin: "", youtube: "", x: "", mastodon: "" },
  footer: {
    text: "Ateliers, activités et actions concrètes pour adopter, ensemble, des gestes écoresponsables au quotidien.",
    ctaTitle: "Un projet, une question, une envie d'agir ?",
    ctaText: "Écrivez-nous : nous revenons vers vous rapidement.",
    copyright: "L'Avenir Durable",
  },
  seo: {
    defaultTitle: "Avenir Durable — Sensibiliser et agir pour un quotidien écoresponsable",
    titleTemplate: "%s · Avenir Durable",
    defaultDescription:
      "Ateliers, activités et actions concrètes pour sensibiliser et mobiliser le public aux enjeux environnementaux et adopter des gestes écoresponsables au quotidien.",
    ogImageId: null,
    preproduction: true,
  },
  legal: {
    publisherName: "L'Avenir Durable",
    publisherStatus: TO_COMPLETE,
    publisherAddress: TO_COMPLETE,
    registration: TO_COMPLETE,
    publicationDirector: TO_COMPLETE,
    hostName: TO_COMPLETE,
    hostAddress: TO_COMPLETE,
    hostContact: TO_COMPLETE,
    lastUpdated: TO_COMPLETE,
  },
  privacy: {
    controller: "L'Avenir Durable",
    dpoContact: "avenirdurable@ecomail.fr",
    messageRetentionMonths: 12,
    lastUpdated: TO_COMPLETE,
  },
  cookies: {
    bannerTitle: "Vos choix concernant les cookies",
    bannerText:
      "Nous utilisons uniquement les cookies nécessaires au fonctionnement du site. Certains services facultatifs ne sont activés qu'avec votre accord ; vous pouvez changer d'avis à tout moment.",
    policyVersion: "1",
    services: [],
  },
  contactForm: {
    enabled: true,
    topics: ["Participer à un atelier", "Proposer un partenariat", "Devenir bénévole", "Demande d'information", "Autre"],
    successMessage: "Merci ! Votre message a bien été envoyé. Nous vous répondrons dans les meilleurs délais.",
    consentText:
      "J'accepte que les informations saisies soient utilisées pour répondre à ma demande, conformément à la politique de confidentialité.",
  },
};

function pick(p: { primary: string; accent: string; soft: string }) {
  return { primary: p.primary, accent: p.accent, soft: p.soft };
}
