import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { PageHead, Flash, StatusPill } from "@/components/admin/PageHead";
import { OrderButtons } from "@/components/admin/OrderButtons";

export const metadata = { title: "Partenaires" };

export default async function PartnersList({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const db = getDb();
  const rows = await db.select().from(schema.partners).orderBy(asc(schema.partners.sortOrder), asc(schema.partners.name));
  const [page] = await db.select({ id: schema.pages.id, published: schema.pages.published }).from(schema.pages).where(eq(schema.pages.slug, "partenaires"));
  return (
    <>
      <PageHead
        title="Partenaires"
        intro="Seuls les partenaires publiés ET dont le partenariat est confirmé apparaissent sur le site."
        actions={
          <Link className="btn" href="/admin/partenaires/nouveau">
            Ajouter un partenaire
          </Link>
        }
      />
      <Flash params={sp} map={{ supprime: { tone: "ok", text: "Partenaire supprimé." } }} />
      {page && !page.published && (
        <p className="notice notice--info">
          La page <strong>Partenaires</strong> existe mais n'est pas publiée, faute de partenariat confirmé à ce jour. <Link href={`/admin/pages/${page.id}`}>Ouvrir la page</Link>
        </p>
      )}
      <div className="panel table-wrap">
        {rows.length === 0 ? (
          <p className="empty">Aucun partenaire enregistré. Ajoutez uniquement des partenariats confirmés par l'association.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Ordre</th>
                <th scope="col">Partenaire</th>
                <th scope="col">Statut</th>
                <th scope="col" className="actions">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => (
                <tr key={p.id}>
                  <td>
                    <OrderButtons kind="partner" id={p.id} first={i === 0} last={i === rows.length - 1} label={p.name} />
                  </td>
                  <td>
                    <Link href={`/admin/partenaires/${p.id}`}>{p.name}</Link>
                    <span className="cell-sub">{p.url || "Sans site web"}</span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                      <StatusPill status={p.status} />
                      {p.verified ? <span className="pill pill--published">Confirmé</span> : <span className="pill pill--review">Non confirmé</span>}
                    </div>
                  </td>
                  <td className="actions">
                    <Link className="btn btn--secondary btn--small" href={`/admin/partenaires/${p.id}`}>
                      Modifier
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
