import { asc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requirePageUser } from "@/lib/auth/guard";
import { PageHead, Flash, fmtDate } from "@/components/admin/PageHead";
import { CreateUserForm, ResetPasswordButton } from "@/components/admin/UserForms";
import { updateUser } from "@/app/admin/actions/users";

export const metadata = { title: "Comptes" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requirePageUser({ role: "admin" });
  const sp = await searchParams;
  const users = await getDb().select().from(schema.users).orderBy(asc(schema.users.name));
  return (
    <>
      <PageHead title="Comptes" intro="Chaque personne dispose de son propre compte nominatif : n'utilisez pas de compte partagé. Les actions sont tracées dans le journal." />
      <Flash
        params={sp}
        map={{
          maj: { tone: "ok", text: "Compte mis à jour." },
          erreur: { tone: "error", text: sp.erreur === "dernier" ? "Impossible : il doit rester au moins un administrateur actif." : "Vous ne pouvez pas modifier votre propre rôle ou statut." },
        }}
      />
      <div className="panel table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Personne</th>
              <th scope="col">Rôle</th>
              <th scope="col" className="hide-sm">
                Dernière connexion
              </th>
              <th scope="col">Statut</th>
              <th scope="col" className="actions">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <strong>{u.name}</strong>
                  {u.id === me.id && " (vous)"}
                  <span className="cell-sub">{u.email}</span>
                </td>
                <td>{u.role === "admin" ? "Administrateur" : "Éditeur"}</td>
                <td className="hide-sm">{fmtDate(u.lastLoginAt)}</td>
                <td>
                  {u.active ? <span className="pill pill--published">Actif</span> : <span className="pill pill--draft">Désactivé</span>}
                  {u.mustChangePassword && u.active && (
                    <span className="pill pill--review" style={{ marginLeft: 4 }}>
                      Mot de passe temporaire
                    </span>
                  )}
                </td>
                <td className="actions">
                  {u.id !== me.id && (
                    <div style={{ display: "flex", gap: "0.35rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
                      <ResetPasswordButton id={u.id} />
                      <form action={updateUser}>
                        <input type="hidden" name="id" value={u.id} />
                        <input type="hidden" name="do" value="role" />
                        <button className="btn btn--secondary btn--small" type="submit">
                          {u.role === "admin" ? "Passer éditeur" : "Passer administrateur"}
                        </button>
                      </form>
                      <form action={updateUser}>
                        <input type="hidden" name="id" value={u.id} />
                        <input type="hidden" name="do" value={u.active ? "deactivate" : "activate"} />
                        <button className={`btn btn--small ${u.active ? "btn--danger" : "btn--secondary"}`} type="submit">
                          {u.active ? "Désactiver" : "Réactiver"}
                        </button>
                      </form>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="panel">
        <h2>Ajouter un compte</h2>
        <CreateUserForm />
      </section>
    </>
  );
}
