import Link from "next/link";
import { asc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { PageHead, Flash, StatusPill } from "@/components/admin/PageHead";
import { OrderButtons } from "@/components/admin/OrderButtons";

export const metadata = { title: "Domaines d'intervention" };

export default async function DomainsList({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const rows = await getDb().select().from(schema.domains).orderBy(asc(schema.domains.sortOrder), asc(schema.domains.id));
  return (
    <>
      <PageHead
        title="Domaines d'intervention"
        intro="Présentés sur l'accueil et la page Nos actions ; chaque domaine dispose de sa propre page de détail."
        actions={
          <Link className="btn" href="/admin/domaines/nouveau">
            Ajouter un domaine
          </Link>
        }
      />
      <Flash params={sp} map={{ supprime: { tone: "ok", text: "Domaine supprimé. Les projets qui y étaient rattachés sont conservés." } }} />
      <div className="panel table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Ordre</th>
              <th scope="col">Domaine</th>
              <th scope="col">Statut</th>
              <th scope="col" className="actions">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d, i) => (
              <tr key={d.id}>
                <td>
                  <OrderButtons kind="domain" id={d.id} first={i === 0} last={i === rows.length - 1} label={d.title} />
                </td>
                <td>
                  <Link href={`/admin/domaines/${d.id}`}>{d.title}</Link>
                  <span className="cell-sub">{d.summary}</span>
                </td>
                <td>
                  <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                    <StatusPill status={d.status} />
                    {d.needsReview && <span className="pill pill--review">À valider</span>}
                  </div>
                </td>
                <td className="actions">
                  <Link className="btn btn--secondary btn--small" href={`/admin/domaines/${d.id}`}>
                    Modifier
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="empty">Aucun domaine.</p>}
      </div>
    </>
  );
}
