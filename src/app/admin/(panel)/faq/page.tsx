import Link from "next/link";
import { asc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { PageHead, Flash, StatusPill } from "@/components/admin/PageHead";
import { OrderButtons } from "@/components/admin/OrderButtons";

export const metadata = { title: "FAQ" };

export default async function FaqList({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const rows = await getDb().select().from(schema.faqItems).orderBy(asc(schema.faqItems.sortOrder), asc(schema.faqItems.id));
  return (
    <>
      <PageHead
        title="Questions fréquentes"
        intro="Les questions publiées sont regroupées par thème sur la page FAQ ; les premières apparaissent aussi sur l'accueil."
        actions={
          <Link className="btn" href="/admin/faq/nouveau">
            Ajouter une question
          </Link>
        }
      />
      <Flash params={sp} map={{ supprime: { tone: "ok", text: "Question supprimée." } }} />
      <div className="panel table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Ordre</th>
              <th scope="col">Question</th>
              <th scope="col" className="hide-sm">
                Thème
              </th>
              <th scope="col">Statut</th>
              <th scope="col" className="actions">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f, i) => (
              <tr key={f.id}>
                <td>
                  <OrderButtons kind="faq" id={f.id} first={i === 0} last={i === rows.length - 1} label={f.question} />
                </td>
                <td>
                  <Link href={`/admin/faq/${f.id}`}>{f.question}</Link>
                </td>
                <td className="hide-sm">{f.category}</td>
                <td>
                  <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                    <StatusPill status={f.status} />
                    {f.needsReview && <span className="pill pill--review">À valider</span>}
                  </div>
                </td>
                <td className="actions">
                  <Link className="btn btn--secondary btn--small" href={`/admin/faq/${f.id}`}>
                    Modifier
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="empty">Aucune question.</p>}
      </div>
    </>
  );
}
