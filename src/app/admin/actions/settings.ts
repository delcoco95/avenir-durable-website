"use server";

import { requireActionUser } from "@/lib/auth/guard";
import { audit } from "@/lib/audit";
import { contrastRatio } from "@/lib/color";
import { getSettings, saveSettingsSection } from "@/lib/settings";
import { PALETTES, sectionSchemas, type SettingsSection } from "@/lib/settings-schema";
import { fail, handleError, ok, zodErrors } from "./helpers";
import type { FormState } from "./types";

const LABELS: Record<SettingsSection, string> = {
  identity: "Identité",
  theme: "Couleurs",
  contact: "Coordonnées",
  social: "Réseaux sociaux",
  footer: "Pied de page",
  seo: "Référencement",
  legal: "Informations légales",
  privacy: "Données personnelles",
  cookies: "Cookies",
  contactForm: "Formulaire de contact",
};

/** Lecture d'une section de paramètres depuis le formulaire (champs nommés section.champ). */
function readSection(section: SettingsSection, fd: FormData, current: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(current)) {
    const field = `${section}.${key}`;
    if (typeof value === "boolean") out[key] = fd.get(field) === "on";
    else if (typeof value === "number" || (value === null && key.endsWith("Id"))) {
      const raw = String(fd.get(field) ?? "");
      out[key] = raw === "" ? null : Number(raw);
    } else if (Array.isArray(value)) {
      const raw = String(fd.get(field) ?? "");
      if (key === "services") {
        try {
          out[key] = JSON.parse(raw || "[]");
        } catch {
          out[key] = value;
        }
      } else out[key] = raw.split("\n").map((s) => s.trim()).filter(Boolean);
    } else out[key] = fd.has(field) ? String(fd.get(field) ?? "") : value;
  }
  return out;
}

export async function saveSettings(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const section = String(fd.get("section") ?? "") as SettingsSection;
    if (!(section in sectionSchemas)) return fail("Section inconnue.");
    // Les informations légales et les cookies engagent l'association : réservé aux administrateurs.
    const user = await requireActionUser(["legal", "privacy", "cookies"].includes(section) ? { role: "admin" } : {});
    const current = (await getSettings())[section] as Record<string, unknown>;
    const raw = readSection(section, fd, current);

    if (section === "theme" && raw.palette !== "personnalisee") {
      const p = PALETTES[raw.palette as keyof typeof PALETTES];
      if (p) Object.assign(raw, { primary: p.primary, accent: p.accent, soft: p.soft });
    }
    const parsed = sectionSchemas[section].safeParse(raw);
    if (!parsed.success) {
      const errors = Object.fromEntries(Object.entries(zodErrors(parsed.error)).map(([k, v]) => [`${section}.${k}`, v]));
      return fail("Certains champs sont à corriger.", errors);
    }
    if (section === "theme") {
      const t = parsed.data as { primary: string; soft: string };
      // La couleur principale sert au texte des liens et aux boutons : contraste AA exigé.
      if (contrastRatio(t.primary, "#ffffff") < 4.5 || contrastRatio(t.primary, "#f7f9f2") < 4.5) {
        return fail("La couleur principale est trop claire : le texte ne serait pas lisible (contraste minimal 4,5:1). Choisissez une teinte plus foncée.", {
          "theme.primary": "Contraste insuffisant",
        });
      }
      if (contrastRatio(t.soft, "#2f3b40") < 7) {
        return fail("La couleur de fond est trop foncée pour le texte. Choisissez une teinte plus claire.", { "theme.soft": "Trop foncée" });
      }
    }
    await saveSettingsSection(section, parsed.data as never);
    await audit(user, "settings.save", "settings", section, LABELS[section]);
    return ok(`${LABELS[section]} : modifications enregistrées et appliquées au site.`);
  } catch (err) {
    return handleError(err, "saveSettings");
  }
}
