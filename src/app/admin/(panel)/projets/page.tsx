import Link from "next/link";
import { asc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { PageHead, Flash, StatusPill } from "@/components/admin/PageHead";
import { OrderButtons } from "@/components/admin/OrderButtons";

export const metadata = { title: "Projets" };

export default async function ProjectsList({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const db = getDb();
  const [projects, domains] = await Promise.all([
    db.select().from(schema.projects).orderBy(asc(schema.projects.sortOrder), asc(schema.projects.id)),
    db.select({ id: schema.domains.id, title: schema.domains.title }).from(schema.domains),
  ]);
  const dname = new Map(domains.map((d) => [d.id, d.title]));
  return (
    <>
      <PageHead
        title="Projets et initiatives"
        intro="Les projets publiés apparaissent sur la page Projets et, s'ils sont mis en avant, sur l'accueil."
        actions={
          <Link className="btn" href="/admin/projets/nouveau">
            Ajouter un projet
          </Link>
        }
      />
      <Flash params={sp} map={{ supprime: { tone: "ok", text: "Projet supprimé." } }} />
      {projects.some((p) => p.isPlaceholder) && (
        <p className="notice notice--warn">
          Les projets marqués « Exemple » sont des contenus de démonstration : ils s'affichent avec la mention « Exemple à valider ». Remplacez-les par de vrais projets ou dépubliez-les avant la
          mise en ligne.
        </p>
      )}
      <div className="panel table-wrap">
        {projects.length === 0 ? (
          <p className="empty">Aucun projet pour le moment.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Ordre</th>
                <th scope="col">Projet</th>
                <th scope="col">Statut</th>
                <th scope="col" className="hide-sm">
                  Domaine
                </th>
                <th scope="col" className="actions">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p, i) => (
                <tr key={p.id}>
                  <td>
                    <OrderButtons kind="project" id={p.id} first={i === 0} last={i === projects.length - 1} label={p.title} />
                  </td>
                  <td>
                    <Link href={`/admin/projets/${p.id}`}>{p.title}</Link>
                    <span className="cell-sub">/projets/{p.slug}</span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                      <StatusPill status={p.status} />
                      {p.featured && <span className="pill pill--published">Mis en avant</span>}
                      {p.isPlaceholder && <span className="pill pill--demo">Exemple</span>}
                    </div>
                  </td>
                  <td className="hide-sm">{p.domainId ? dname.get(p.domainId) : "—"}</td>
                  <td className="actions">
                    <Link className="btn btn--secondary btn--small" href={`/admin/projets/${p.id}`}>
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
