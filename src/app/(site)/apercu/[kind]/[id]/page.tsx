import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requirePageUser } from "@/lib/auth/guard";
import { Sections } from "@/components/site/Sections";
import { ProjectView } from "@/components/site/ProjectView";
import { DomainView } from "@/components/site/DomainView";

export const metadata = { title: "Aperçu", robots: { index: false, follow: false } };

type Props = { params: Promise<{ kind: string; id: string }> };

/**
 * Aperçu d'un brouillon, réservé aux comptes connectés : permet de vérifier
 * le rendu avant publication. Jamais indexé, jamais mis en cache.
 */
export default async function PreviewPage({ params }: Props) {
  await requirePageUser();
  const { kind, id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const db = getDb();

  let body: React.ReactNode = null;
  let back = "/admin";
  if (kind === "page") {
    const [page] = await db.select().from(schema.pages).where(eq(schema.pages.id, id));
    if (!page) notFound();
    back = `/admin/pages/${id}`;
    body = <Sections sections={page.draft.sections} pageTitle={page.draft.title} />;
  } else if (kind === "projet") {
    const [p] = await db.select().from(schema.projects).where(eq(schema.projects.id, id));
    if (!p) notFound();
    back = `/admin/projets/${id}`;
    body = <ProjectView project={p} />;
  } else if (kind === "domaine") {
    const [d] = await db.select().from(schema.domains).where(eq(schema.domains.id, id));
    if (!d) notFound();
    back = `/admin/domaines/${id}`;
    body = <DomainView domain={d} />;
  } else notFound();

  return (
    <>
      <div className="preview-bar" role="note">
        <span>Aperçu du brouillon — cette version n'est visible que par les membres connectés.</span>
        <Link href={back}>Retour à l'édition</Link>
      </div>
      {body}
    </>
  );
}
