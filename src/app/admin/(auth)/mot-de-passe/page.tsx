import Link from "next/link";
import { requirePageUser } from "@/lib/auth/guard";
import { ChangePasswordForm } from "@/components/admin/AuthForms";
import { Rings } from "@/components/site/Rings";

export const metadata = { title: "Mot de passe" };
export const dynamic = "force-dynamic";

export default async function PasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requirePageUser({ allowPasswordChange: true });
  const sp = await searchParams;
  const forced = user.mustChangePassword || sp.obligatoire !== undefined;
  return (
    <main className="auth-page">
      <Rings className="auth-page__rings" count={9} start={60} step={26} />
      <div className="auth-card">
        <h1>{forced ? "Choisissez votre mot de passe" : "Changer mon mot de passe"}</h1>
        <p className="field__hint" style={{ marginBottom: "1.25rem" }}>
          {forced
            ? `Bonjour ${user.name}. Pour sécuriser votre compte, remplacez le mot de passe temporaire par un mot de passe personnel que vous seul connaissez.`
            : "Après le changement, vos autres sessions ouvertes seront déconnectées."}
        </p>
        <ChangePasswordForm />
        {!user.mustChangePassword && (
          <p style={{ marginTop: "1.25rem" }}>
            <Link href="/admin">← Retour au tableau de bord</Link>
          </p>
        )}
      </div>
    </main>
  );
}
