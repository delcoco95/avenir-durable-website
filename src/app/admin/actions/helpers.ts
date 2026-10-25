import "server-only";
import type { z } from "zod";
import { AuthError } from "@/lib/auth/guard";
import type { FormState } from "./types";

export function ok(message: string, data?: Record<string, unknown>): FormState {
  return { ok: true, message, stamp: Date.now(), data };
}

export function fail(message: string, errors?: Record<string, string>): FormState {
  return { ok: false, message, errors, stamp: Date.now() };
}

export function zodErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Erreurs connues → message lisible ; erreurs inattendues → message générique (détails dans les journaux serveur uniquement). */
export function handleError(err: unknown, context: string): FormState {
  if (err instanceof AuthError) return fail(err.message);
  if (err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw err;
  const code = (err as { code?: string; cause?: { code?: string } })?.code ?? (err as { cause?: { code?: string } })?.cause?.code;
  if (code === "23505") return fail("Cette adresse (identifiant d'URL) est déjà utilisée. Choisissez-en une autre.", { slug: "Déjà utilisée" });
  console.error(`[admin:${context}]`, err);
  return fail("L'opération n'a pas pu aboutir. Réessayez ; si le problème persiste, contactez la personne en charge du site.");
}

export const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
export const bool = (fd: FormData, key: string) => fd.get(key) === "on" || fd.get(key) === "true";
export const int = (fd: FormData, key: string, fallback = 0) => {
  const n = Number(fd.get(key));
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};
export const optId = (fd: FormData, key: string) => {
  const n = Number(fd.get(key));
  return Number.isInteger(n) && n > 0 ? n : null;
};
