import { describe, expect, it } from "vitest";
import { blankSection, mediaIdsInSections, sectionSchema, sectionsSchema, SECTION_LABELS, type SectionType } from "@/lib/sections";
import { slugify, SLUG_RE } from "@/lib/slug";
import { contrastRatio } from "@/lib/color";
import { DEFAULT_SETTINGS, PALETTES, sectionSchemas, siteSettingsSchema } from "@/lib/settings-schema";

describe("sections de page", () => {
  it("chaque type de section a une valeur initiale valide", () => {
    for (const t of Object.keys(SECTION_LABELS) as SectionType[]) {
      const res = sectionSchema.safeParse(blankSection(t));
      expect(res.success, t).toBe(true);
    }
  });

  it("refuse les liens dangereux dans les boutons", () => {
    const s = { ...blankSection("cta"), button: { label: "Clic", href: "javascript:alert(1)" } };
    expect(sectionSchema.safeParse(s).success).toBe(false);
    const s2 = { ...blankSection("cta"), button: { label: "Clic", href: "//evil.example" } };
    expect(sectionSchema.safeParse(s2).success).toBe(false);
    for (const ok of ["/contact", "https://exemple.fr/page", "mailto:contact@exemple.fr", "tel:+33123456789", "#formulaire"]) {
      expect(sectionSchema.safeParse({ ...blankSection("cta"), button: { label: "Ok", href: ok } }).success, ok).toBe(true);
    }
  });

  it("refuse un type inconnu et les textes trop longs", () => {
    expect(sectionSchema.safeParse({ id: "abcdef12", type: "script" }).success).toBe(false);
    expect(sectionSchema.safeParse({ ...blankSection("statement"), title: "x".repeat(301) }).success).toBe(false);
  });

  it("limite le nombre de sections d'une page", () => {
    expect(sectionsSchema.safeParse(Array.from({ length: 41 }, () => blankSection("text"))).success).toBe(false);
  });

  it("recense les images utilisées", () => {
    const hero = { ...blankSection("hero"), imageId: 12 };
    expect(mediaIdsInSections([hero, blankSection("text")])).toEqual([12]);
  });
});

describe("adresses (slugs)", () => {
  it("produit des adresses lisibles", () => {
    expect(slugify("Atelier jardin & potager à l'école")).toBe("atelier-jardin-potager-a-l-ecole");
    expect(slugify("  Écogestes   au quotidien ")).toBe("ecogestes-au-quotidien");
    expect(SLUG_RE.test(slugify("Énergie : 2026 !"))).toBe(true);
    expect(SLUG_RE.test("../etc/passwd")).toBe(false);
  });
});

describe("paramètres et couleurs", () => {
  it("les paramètres par défaut sont valides", () => {
    expect(siteSettingsSchema.safeParse(DEFAULT_SETTINGS).success).toBe(true);
  });

  it("les palettes proposées respectent le contraste AA (4,5:1)", () => {
    for (const p of Object.values(PALETTES)) {
      expect(contrastRatio(p.primary, "#ffffff")).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.primary, "#f7f9f2")).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.soft, "#2f3b40")).toBeGreaterThanOrEqual(7);
    }
    // Le vert d'origine du logo n'atteint pas le seuil pour du texte : d'où la teinte assombrie.
    expect(contrastRatio("#449848", "#ffffff")).toBeLessThan(4.5);
  });

  it("refuse les réseaux sociaux non https et les e-mails invalides", () => {
    expect(sectionSchemas.social.safeParse({ ...DEFAULT_SETTINGS.social, facebook: "http://facebook.com/x" }).success).toBe(false);
    expect(sectionSchemas.social.safeParse({ ...DEFAULT_SETTINGS.social, facebook: "javascript:alert(1)" }).success).toBe(false);
    expect(sectionSchemas.contact.safeParse({ ...DEFAULT_SETTINGS.contact, email: "pas-un-email" }).success).toBe(false);
  });

  it("valide les services soumis au consentement", () => {
    const svc = { id: "stats", name: "Statistiques", category: "statistiques", purpose: "", provider: "", cookies: "", duration: "", scriptUrl: "http://insecure.example/x.js", enabled: true };
    expect(sectionSchemas.cookies.safeParse({ ...DEFAULT_SETTINGS.cookies, services: [svc] }).success).toBe(false);
    expect(sectionSchemas.cookies.safeParse({ ...DEFAULT_SETTINGS.cookies, services: [{ ...svc, scriptUrl: "https://stats.example/x.js" }] }).success).toBe(true);
  });
});
