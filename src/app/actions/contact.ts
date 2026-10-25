"use server";

import { z } from "zod";
import { getDb, schema } from "@/db";
import { getSettings } from "@/lib/settings";
import { clientIp } from "@/lib/request";
import { hitRateLimit } from "@/lib/auth/throttle";
import { sendMail } from "@/lib/mail";

export type ContactState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Partial<Record<"name" | "email" | "organisation" | "topic" | "message" | "consent", string>>;
  values?: Record<string, string>;
};

const contactSchema = z.object({
  name: z.string().trim().min(2, "Indiquez votre nom (2 caractères minimum).").max(120, "120 caractères maximum."),
  email: z.string().trim().max(254).pipe(z.email("Indiquez une adresse e-mail valide, par exemple nom@domaine.fr.")),
  organisation: z.string().trim().max(160, "160 caractères maximum.").default(""),
  topic: z.string().trim().max(80).default(""),
  message: z.string().trim().min(10, "Votre message doit contenir au moins 10 caractères.").max(5000, "5 000 caractères maximum."),
  consent: z.literal("on", { error: "Merci de cocher cette case pour que nous puissions vous répondre." }),
});

/**
 * Traitement du formulaire de contact :
 * validation serveur, pièges anti-robots (champ caché + délai minimal),
 * limitation de débit par adresse IP, enregistrement puis notification e-mail.
 * Seules les données strictement nécessaires sont conservées (pas d'IP).
 */
export async function submitContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const raw = Object.fromEntries(["name", "email", "organisation", "topic", "message", "consent"].map((k) => [k, String(formData.get(k) ?? "")]));
  const values = { ...raw, consent: "" };
  delete (values as Record<string, string>).consent;

  // 1. Pièges anti-spam : réponse « réussie » silencieuse pour ne pas renseigner les robots.
  const honeypot = String(formData.get("website") ?? "");
  const startedAt = Number(formData.get("started_at") ?? 0);
  if (honeypot || !startedAt || Date.now() - startedAt < 2500) {
    return { status: "success" };
  }

  const settings = await getSettings();
  if (!settings.contactForm.enabled) {
    return { status: "error", message: "Le formulaire est momentanément désactivé.", values };
  }

  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: ContactState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0] as keyof NonNullable<ContactState["errors"]>;
      if (k && !errors[k]) errors[k] = issue.message;
    }
    return { status: "error", message: "Certains champs sont à corriger.", errors, values };
  }
  const data = parsed.data;
  if (data.topic && !settings.contactForm.topics.includes(data.topic)) data.topic = "";

  // 2. Limitation : 5 messages par heure et par adresse IP.
  const ip = await clientIp();
  const allowed = await hitRateLimit("contact", ip, 5, 60 * 60 * 1000);
  if (!allowed) {
    return { status: "error", message: "Vous avez envoyé plusieurs messages en peu de temps. Réessayez dans une heure ou écrivez-nous directement par e-mail.", values };
  }

  try {
    const db = getDb();
    const [row] = await db
      .insert(schema.contactMessages)
      .values({ name: data.name, email: data.email, organisation: data.organisation, topic: data.topic, message: data.message })
      .returning({ id: schema.contactMessages.id });

    const sent = await sendMail({
      to: settings.contact.notificationEmail,
      replyTo: data.email,
      subject: `[Site] ${data.topic || "Nouveau message"} — ${data.name}`,
      text: `Nouveau message reçu depuis le formulaire de contact du site.\n\nNom : ${data.name}\nE-mail : ${data.email}\nStructure : ${data.organisation || "—"}\nSujet : ${data.topic || "—"}\n\n${data.message}\n\n— Consultez et gérez les demandes dans l'administration : ${process.env.SITE_URL ?? ""}/admin/messages`,
    });
    if (sent && row) {
      const { eq } = await import("drizzle-orm");
      await db.update(schema.contactMessages).set({ emailSent: true }).where(eq(schema.contactMessages.id, row.id));
    }
  } catch (err) {
    console.error("[contact] enregistrement impossible", err instanceof Error ? err.message : err);
    return { status: "error", message: "Votre message n'a pas pu être envoyé pour une raison technique. Réessayez dans quelques minutes ou écrivez-nous par e-mail.", values };
  }

  return { status: "success", message: settings.contactForm.successMessage };
}
