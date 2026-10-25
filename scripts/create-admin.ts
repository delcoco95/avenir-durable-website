/**
 * Création (ou réinitialisation) d'un compte d'administration.
 *
 *   npm run admin:create -- --email prenom.nom@exemple.fr --name "Prénom Nom"
 *   npm run admin:create -- --email prenom.nom@exemple.fr --reset   (nouveau mot de passe temporaire)
 *
 * Un mot de passe temporaire aléatoire est généré et affiché UNE SEULE FOIS
 * dans le terminal. Il n'est jamais écrit sur disque ni dans le dépôt.
 * Son changement est obligatoire à la première connexion.
 */
import { loadEnv } from "./load-env";

loadEnv();

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const { getDb, closeDb, schema } = await import("../src/db");
  const { hashPassword } = await import("../src/lib/auth/password");
  const { generatePassword } = await import("../src/lib/security/crypto");
  const { eq } = await import("drizzle-orm");

  const email = (arg("email") ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const name = (arg("name") ?? process.env.ADMIN_NAME ?? "").trim();
  const role = arg("role") === "editor" ? "editor" : "admin";
  const reset = process.argv.includes("--reset");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error("✖ Indiquez une adresse e-mail valide : --email prenom.nom@exemple.fr");
    process.exit(1);
  }

  const db = getDb();
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  const password = generatePassword(20);
  const passwordHash = await hashPassword(password);

  if (existing) {
    if (!reset) {
      console.error("✖ Ce compte existe déjà. Ajoutez --reset pour générer un nouveau mot de passe temporaire.");
      process.exit(1);
    }
    await db.update(schema.users).set({ passwordHash, mustChangePassword: true, active: true }).where(eq(schema.users.id, existing.id));
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, existing.id));
    await db.insert(schema.auditLog).values({ userId: null, userLabel: "ligne de commande", action: "password.reset", entity: "user", entityId: String(existing.id), summary: email });
  } else {
    if (!name) {
      console.error('✖ Indiquez le nom de la personne : --name "Prénom Nom"');
      process.exit(1);
    }
    const [row] = await db.insert(schema.users).values({ email, name, role, passwordHash, mustChangePassword: true }).returning({ id: schema.users.id });
    await db.insert(schema.auditLog).values({ userId: null, userLabel: "ligne de commande", action: "user.create", entity: "user", entityId: String(row!.id), summary: `${email} (${role})` });
  }

  console.log("\n✔ Compte prêt :", email, `(${existing ? existing.role : role})`);
  console.log("  Mot de passe temporaire (affiché une seule fois) :\n");
  console.log("    " + password + "\n");
  console.log("  Il devra être remplacé à la première connexion sur /admin/connexion.\n");
  await closeDb();
}

main().catch((err) => {
  console.error("✖", err instanceof Error ? err.message : err);
  process.exit(1);
});
