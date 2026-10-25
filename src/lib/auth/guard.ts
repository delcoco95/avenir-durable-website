import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "./session";

export class AuthError extends Error {
  constructor(message = "Accès non autorisé.") {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Pour les pages d'administration : redirige vers la connexion si nécessaire,
 * et impose le changement du mot de passe temporaire.
 */
export async function requirePageUser(opts: { role?: "admin"; allowPasswordChange?: boolean } = {}): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/admin/connexion");
  if (user.mustChangePassword && !opts.allowPasswordChange) redirect("/admin/mot-de-passe?obligatoire=1");
  if (opts.role === "admin" && user.role !== "admin") redirect("/admin?refus=1");
  return user;
}

/**
 * Pour les actions serveur : chaque opération d'écriture vérifie la session
 * côté serveur, indépendamment de l'interface (pas de sécurité par masquage).
 */
export async function requireActionUser(opts: { role?: "admin" } = {}): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError("Votre session a expiré. Veuillez vous reconnecter.");
  if (user.mustChangePassword) throw new AuthError("Vous devez d'abord changer votre mot de passe temporaire.");
  if (opts.role === "admin" && user.role !== "admin") throw new AuthError("Cette action est réservée aux administrateurs.");
  return user;
}
