import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requirePageUser } from "@/lib/auth/guard";
import { getSettings } from "@/lib/settings";
import { isMailConfigured } from "@/lib/mail";
import { PageHead, Flash, fmtDate } from "@/components/admin/PageHead";
import { ConfirmForm } from "@/components/admin/forms";
import { purgeMessages } from "@/app/admin/actions/messages";

export const metadata = { title: "Demandes de contact" };

const LABEL: Record<string, string> = { new: "Nouveau", handled: "Traité", archived: "Archivé" };

export default async function MessagesList({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requirePageUser();
  const sp = await searchParams;
  const filter = ["new", "handled", "archived"].includes(sp.statut ?? "") ? sp.statut! : null;
  const db = getDb();
  const base = db.select().from(schema.contactMessages);
  const rows = await (filter ? base.where(eq(schema.contactMessages.status, filter)) : base).orderBy(desc(schema.contactMessages.createdAt)).limit(200);
  const s = await getSettings();
  return (
    <>
      <PageHead
        title="Demandes de contact"
        intro={`Messages envoyés depuis le formulaire du site. Conservation : ${s.privacy.messageRetentionMonths} mois (voir Paramètres › Données personnelles).`}
        actions={
          user.role === "admin" && (
            <ConfirmForm
              action={purgeMessages}
              fields={{}}
              label={`Purger les demandes de plus de ${s.privacy.messageRetentionMonths} mois`}
              className="btn btn--secondary"
              confirmText={`Supprimer définitivement toutes les demandes reçues il y a plus de ${s.privacy.messageRetentionMonths} mois ?`}
            />
          )
        }
      />
      <Flash
        params={sp}
        map={{
          supprime: { tone: "ok", text: "Demande supprimée." },
          purge: { tone: "ok", text: `Purge effectuée : ${sp.purge ?? 0} demande(s) supprimée(s).` },
        }}
      />
      {!isMailConfigured() && (
        <p className="notice notice--info">La messagerie n'est pas configurée : les demandes sont uniquement consultables ici (aucune notification e-mail). Voir « Aide et sauvegardes ».</p>
      )}
      <div className="tabs" role="navigation" aria-label="Filtrer par statut">
        {[
          [null, "Toutes"],
          ["new", "Nouvelles"],
          ["handled", "Traitées"],
          ["archived", "Archivées"],
        ].map(([v, l]) => (
          <Link key={l} href={v ? `/admin/messages?statut=${v}` : "/admin/messages"} aria-current={filter === v ? "page" : undefined}>
            {l}
          </Link>
        ))}
      </div>
      <div className="panel table-wrap">
        {rows.length === 0 ? (
          <p className="empty">Aucune demande{filter ? " dans cette catégorie" : ""}.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Expéditeur</th>
                <th scope="col" className="hide-sm">
                  Objet
                </th>
                <th scope="col">Reçue le</th>
                <th scope="col">Statut</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className={m.status === "new" ? "unread" : undefined}>
                  <td>
                    <Link href={`/admin/messages/${m.id}`}>{m.name}</Link>
                    <span className="cell-sub">{m.organisation || m.email}</span>
                  </td>
                  <td className="hide-sm">{m.topic || "—"}</td>
                  <td>{fmtDate(m.createdAt)}</td>
                  <td>
                    <span className={`pill pill--${m.status}`}>{LABEL[m.status]}</span>
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
