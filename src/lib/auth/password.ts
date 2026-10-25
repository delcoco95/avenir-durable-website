import { hash, verify } from "@node-rs/argon2";

// Argon2id — paramètres conformes aux recommandations OWASP (m=19 Mio, t=2, p=1).
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1, algorithm: 2 as const };

export async function hashPassword(password: string) {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string) {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/** Empreinte factice : sert à égaliser le temps de réponse quand le compte n'existe pas. */
let dummyHash: Promise<string> | null = null;
export async function burnVerifyTime(password: string) {
  dummyHash ??= hashPassword("compte-inexistant-" + Math.random());
  await verifyPassword(await dummyHash, password);
}

export type PasswordCheck = { ok: true } | { ok: false; reason: string };

/** Politique de mot de passe : longueur avant tout (recommandations ANSSI / CNIL). */
export function checkPasswordPolicy(password: string, context: { email?: string; name?: string } = {}): PasswordCheck {
  if (password.length < 12) return { ok: false, reason: "Le mot de passe doit contenir au moins 12 caractères." };
  if (password.length > 200) return { ok: false, reason: "Le mot de passe est trop long (200 caractères maximum)." };
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  if (password.length < 16 && classes < 3) {
    return { ok: false, reason: "Utilisez au moins 3 types de caractères (minuscules, majuscules, chiffres, symboles) ou une phrase de passe de 16 caractères et plus." };
  }
  const lower = password.toLowerCase();
  const local = context.email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && lower.includes(local)) return { ok: false, reason: "Le mot de passe ne doit pas contenir votre identifiant." };
  if (/^(.)\1+$/.test(password)) return { ok: false, reason: "Le mot de passe est trop simple." };
  const common = ["motdepasse", "password", "azerty", "qwerty", "123456", "avenirdurable", "admin"];
  if (common.some((c) => lower.includes(c))) return { ok: false, reason: "Le mot de passe contient une suite trop courante." };
  return { ok: true };
}
