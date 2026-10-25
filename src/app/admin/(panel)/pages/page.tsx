import Link from "next/link";
import { asc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { PageHead, Flash, fmtDate } from "@/components/admin/PageHead";
import { ActionForm, Field, SubmitButton } from "@/components/admin/forms";
import { createPage } from "@/app/admin/actions/pages";

export const metadata = { title: "Pages" };

export default async function PagesList({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  let pages = await getDb().select().from(schema.pages).orderBy(asc(schema.pages.navOrder), asc(schema.pages.id));
  if (sp.filtre === "a-valider") pages = pages.filter((p) => p.needsReview);
  return (
    <>
      <PageHead title="Pages" intro="Chaque page est composée de sections que vous pouvez modifier, réorganiser, prévisualiser puis publier." />
      <Flash params={sp} map={{ supprime: { tone: "ok", text: "Page supprimée." } }} />
      <div className="tabs" role="navigation" aria-label="Filtres">
        <Link href="/admin/pages" aria-current={!sp.filtre ? "page" : undefined}>
          Toutes
        </Link>
        <Link href="/admin/pages?filtre=a-valider" aria-current={sp.filtre === "a-valider" ? "page" : undefined}>
          À valider
        </Link>
      </div>
      <div className="panel table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Page</th>
              <th scope="col">Statut</th>
              <th scope="col" className="hide-sm">
                Menu
              </th>
              <th scope="col" className="hide-sm">
                Modifiée le
              </th>
              <th scope="col" className="actions">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/admin/pages/${p.id}`}>{p.draft.title}</Link>
                  <span className="cell-sub">{p.slug === "accueil" ? "/" : `/${p.slug}`}</span>
                </td>
                <td>
                  <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                    {p.published ? (
                      p.hasUnpublishedChanges ? (
                        <span className="pill pill--changes">Modifications non publiées</span>
                      ) : (
                        <span className="pill pill--published">Publiée</span>
                      )
                    ) : (
                      <span className="pill pill--draft">Non publiée</span>
                    )}
                    {p.needsReview && <span className="pill pill--review">À valider</span>}
                  </div>
                </td>
                <td className="hide-sm">{p.showInNav ? p.navLabel || p.draft.title : "—"}</td>
                <td className="hide-sm">{fmtDate(p.updatedAt)}</td>
                <td className="actions">
                  <Link className="btn btn--secondary btn--small" href={`/admin/pages/${p.id}`}>
                    Modifier
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="panel" style={{ maxWidth: 640 }}>
        <h2>Créer une page</h2>
        <ActionForm action={createPage}>
          <Field name="title" label="Titre" required maxLength={160} />
          <Field name="slug" label="Adresse (facultatif)" maxLength={100} hint="Générée à partir du titre si vide. Exemple : nos-ateliers → /nos-ateliers" />
          <SubmitButton pendingLabel="Création…">Créer la page</SubmitButton>
        </ActionForm>
      </section>
    </>
  );
}
