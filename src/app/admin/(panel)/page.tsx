import Link from "next/link";
import { count, desc, eq, isNotNull, isNull, and, or } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requirePageUser } from "@/lib/auth/guard";
import { getSettings } from "@/lib/settings";
import { isMailConfigured } from "@/lib/mail";
import { PageHead, fmtDate } from "@/components/admin/PageHead";

export const metadata = { title: "Tableau de bord" };

const ENTITY_LINK: Record<string, (id: string) => string> = {
  page: (id) => `/admin/pages/${id}`,
  project: (id) => `/admin/projets/${id}`,
  domain: (id) => `/admin/domaines/${id}`,
  faq: (id) => `/admin/faq/${id}`,
  partner: (id) => `/admin/partenaires/${id}`,
  media: (id) => `/admin/medias/${id}`,
  message: (id) => `/admin/messages/${id}`,
  settings: (id) => `/admin/parametres?onglet=${id}`,
};
const ACTION_LABEL: Record<string, string> = {
  "page.save": "Brouillon enregistré",
  "page.publish": "Page publiée",
  "page.unpublish": "Page dépubliée",
  "page.create": "Page créée",
  "page.delete": "Page supprimée",
  "page.revert": "Brouillon réinitialisé",
  "project.save": "Projet modifié",
  "project.publish": "Projet publié",
  "project.create": "Projet créé",
  "project.delete": "Projet supprimé",
  "domain.save": "Domaine modifié",
  "domain.create": "Domaine créé",
  "domain.delete": "Domaine supprimé",
  "faq.save": "Question modifiée",
  "faq.create": "Question ajoutée",
  "faq.delete": "Question supprimée",
  "partner.save": "Partenaire modifié",
  "partner.create": "Partenaire ajouté",
  "partner.delete": "Partenaire supprimé",
  "media.upload": "Image importée",
  "media.update": "Image modifiée",
  "media.replace": "Image remplacée",
  "media.delete": "Image supprimée",
  "settings.save": "Paramètres modifiés",
};

export default async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requirePageUser();
  const sp = await searchParams;
  const db = getDb();
  const n = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;

  const [pagesPub, pagesAll, projPub, projAll, projDemo, msgNew, msgAll, faqPub, mediaAll, mediaNoAlt, reviewPages, reviewDomains, reviewFaq, partnersVisible] = await Promise.all([
    n(db.select({ n: count() }).from(schema.pages).where(isNotNull(schema.pages.published))),
    n(db.select({ n: count() }).from(schema.pages)),
    n(db.select({ n: count() }).from(schema.projects).where(eq(schema.projects.status, "published"))),
    n(db.select({ n: count() }).from(schema.projects)),
    n(db.select({ n: count() }).from(schema.projects).where(eq(schema.projects.isPlaceholder, true))),
    n(db.select({ n: count() }).from(schema.contactMessages).where(eq(schema.contactMessages.status, "new"))),
    n(db.select({ n: count() }).from(schema.contactMessages)),
    n(db.select({ n: count() }).from(schema.faqItems).where(eq(schema.faqItems.status, "published"))),
    n(db.select({ n: count() }).from(schema.media)),
    n(db.select({ n: count() }).from(schema.media).where(eq(schema.media.alt, ""))),
    n(db.select({ n: count() }).from(schema.pages).where(eq(schema.pages.needsReview, true))),
    n(db.select({ n: count() }).from(schema.domains).where(eq(schema.domains.needsReview, true))),
    n(db.select({ n: count() }).from(schema.faqItems).where(eq(schema.faqItems.needsReview, true))),
    n(db.select({ n: count() }).from(schema.partners).where(and(eq(schema.partners.verified, true), eq(schema.partners.status, "published")))),
  ]);
  const drafts = await db
    .select({ id: schema.pages.id, title: schema.pages.draft })
    .from(schema.pages)
    .where(or(isNull(schema.pages.published), eq(schema.pages.hasUnpublishedChanges, true)));
  const recent = await db.select().from(schema.auditLog).where(or(...Object.keys(ACTION_LABEL).map((a) => eq(schema.auditLog.action, a)))).orderBy(desc(schema.auditLog.createdAt)).limit(8);
  const lastMessages = await db.select().from(schema.contactMessages).orderBy(desc(schema.contactMessages.createdAt)).limit(4);
  const settings = await getSettings();
  const [home] = await db.select({ id: schema.pages.id }).from(schema.pages).where(eq(schema.pages.slug, "accueil"));
  const legalMissing = Object.entries(settings.legal).filter(([k, v]) => k !== "lastUpdated" && !v).length;
  const toReview = reviewPages + reviewDomains + reviewFaq + projDemo;

  return (
    <>
      <PageHead title={`Bonjour ${user.name.split(" ")[0]}`} intro="Vue d'ensemble du site et des points qui demandent votre attention." actions={<a className="btn btn--secondary" href="/" target="_blank" rel="noopener">Voir le site</a>} />
      {sp.bienvenue !== undefined && <p className="notice notice--ok">Mot de passe enregistré. Bienvenue dans l'espace d'administration !</p>}
      {sp.refus !== undefined && <p className="notice notice--error">Cette section est réservée aux administrateurs.</p>}

      <div className="stats">
        <Link className="stat" href="/admin/pages">
          <div className="stat__value">{pagesAll}</div>
          <div className="stat__label">Pages</div>
          <div className="stat__detail">
            {pagesPub} publiées · {drafts.length} avec brouillon en attente
          </div>
        </Link>
        <Link className="stat" href="/admin/projets">
          <div className="stat__value">{projAll}</div>
          <div className="stat__label">Projets</div>
          <div className="stat__detail">
            {projPub} publiés · {projAll - projPub} brouillons
          </div>
        </Link>
        <Link className={`stat${msgNew ? " stat--alert" : ""}`} href="/admin/messages">
          <div className="stat__value">{msgNew}</div>
          <div className="stat__label">Nouvelles demandes</div>
          <div className="stat__detail">{msgAll} demandes au total</div>
        </Link>
        <Link className={`stat${toReview ? " stat--alert" : ""}`} href="#a-valider">
          <div className="stat__value">{toReview}</div>
          <div className="stat__label">Contenus à valider</div>
          <div className="stat__detail">Exemples et textes provisoires</div>
        </Link>
      </div>

      <div className="grid-2">
        <section className="panel" id="a-valider">
          <h2>À faire avant la mise en ligne</h2>
          <ul style={{ paddingLeft: "1.1rem", margin: 0, display: "grid", gap: "0.45rem" }}>
            {settings.seo.preproduction && (
              <li>
                Le site est en <strong>mode présentation</strong> (non indexé). <Link href="/admin/parametres?onglet=seo">Désactiver lors de la mise en ligne</Link>
              </li>
            )}
            {legalMissing > 0 && (
              <li>
                {legalMissing} information(s) légale(s) à compléter. <Link href="/admin/parametres?onglet=legal">Compléter</Link>
              </li>
            )}
            {projDemo > 0 && (
              <li>
                {projDemo} projet(s) d'exemple à remplacer par des projets réels. <Link href="/admin/projets">Voir les projets</Link>
              </li>
            )}
            {reviewPages + reviewDomains + reviewFaq > 0 && (
              <li>
                Textes provisoires : {reviewPages} page(s), {reviewDomains} domaine(s), {reviewFaq} question(s).{" "}
                <Link href="/admin/pages?filtre=a-valider">Relire</Link>
              </li>
            )}
            {partnersVisible === 0 && <li>Aucun partenaire confirmé : la section Partenaires reste masquée.</li>}
            {mediaNoAlt > 0 && (
              <li>
                {mediaNoAlt} image(s) sans texte alternatif. <Link href="/admin/medias">Compléter</Link>
              </li>
            )}
            {!isMailConfigured() && <li>Messagerie non configurée : les demandes sont enregistrées ici mais aucun e-mail de notification n'est envoyé (voir l'aide).</li>}
          </ul>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2>Dernières demandes</h2>
            <Link href="/admin/messages">Tout voir</Link>
          </div>
          {lastMessages.length === 0 ? (
            <p className="empty">Aucune demande reçue pour le moment.</p>
          ) : (
            <table className="table">
              <tbody>
                {lastMessages.map((m) => (
                  <tr key={m.id} className={m.status === "new" ? "unread" : undefined}>
                    <td>
                      <Link href={`/admin/messages/${m.id}`}>{m.name}</Link>
                      <span className="cell-sub">{m.topic || "Sans objet"}</span>
                    </td>
                    <td className="hide-sm">{fmtDate(m.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <div className="grid-2">
        <section className="panel">
          <h2>Modifications récentes</h2>
          {recent.length === 0 ? (
            <p className="empty">Aucune modification pour le moment.</p>
          ) : (
            <table className="table">
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.entityId && ENTITY_LINK[r.entity] && !r.action.endsWith(".delete") ? <Link href={ENTITY_LINK[r.entity]!(r.entityId)}>{r.summary || r.entity}</Link> : (r.summary ?? r.entity)}
                      <span className="cell-sub">
                        {ACTION_LABEL[r.action] ?? r.action} · {r.userLabel}
                      </span>
                    </td>
                    <td className="hide-sm" style={{ whiteSpace: "nowrap" }}>
                      {fmtDate(r.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section className="panel">
          <h2>Raccourcis</h2>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <Link className="btn btn--secondary" href={home ? `/admin/pages/${home.id}` : "/admin/pages"}>
              Modifier la page d'accueil
            </Link>
            <Link className="btn btn--secondary" href="/admin/projets/nouveau">
              Ajouter un projet
            </Link>
            <Link className="btn btn--secondary" href="/admin/faq/nouveau">
              Ajouter une question à la FAQ
            </Link>
            <Link className="btn btn--secondary" href="/admin/medias">
              Importer des images
            </Link>
            <Link className="btn btn--secondary" href="/admin/parametres">
              Coordonnées et réseaux sociaux
            </Link>
          </div>
          <p className="help" style={{ marginTop: "1rem" }}>
            {faqPub} question(s) publiée(s) · {mediaAll} image(s) dans la médiathèque.
          </p>
        </section>
      </div>
    </>
  );
}
