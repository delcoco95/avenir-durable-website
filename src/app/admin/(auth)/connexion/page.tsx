import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { LoginForm } from "@/components/admin/AuthForms";
import { Rings } from "@/components/site/Rings";

export const metadata = { title: "Connexion" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  if (await getSessionUser()) redirect("/admin");
  const next = sp.suivant && sp.suivant.startsWith("/admin") && !sp.suivant.startsWith("//") ? sp.suivant : "/admin";
  return (
    <main className="auth-page">
      <Rings className="auth-page__rings" count={9} start={60} step={26} />
      <div className="auth-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-avenir-durable.webp" alt="Avenir Durable" width={389} height={179} />
        <h1>Espace d'administration</h1>
        <p className="field__hint" style={{ marginBottom: "1.25rem" }}>
          Réservé aux membres de l'association disposant d'un compte.
        </p>
        {sp.deconnecte !== undefined && (
          <p className="alert alert--ok" role="status">
            Vous êtes déconnecté.
          </p>
        )}
        {sp.expire !== undefined && (
          <p className="alert alert--error" role="status">
            Votre session a expiré, veuillez vous reconnecter.
          </p>
        )}
        <LoginForm next={next} />
        <p className="field__hint" style={{ marginTop: "1.25rem" }}>
          Mot de passe oublié ? Demandez à un administrateur de l'association de le réinitialiser.
        </p>
      </div>
    </main>
  );
}
