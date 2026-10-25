import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requirePageUser } from "@/lib/auth/guard";
import { PageHead, Flash, fmtDate } from "@/components/admin/PageHead";
import { ConfirmForm } from "@/components/admin/forms";
import { deleteMessage, setMessageStatus } from "@/app/admin/actions/messages";

export const metadata = { title: "Demande de contact" };

const LABEL: Record<string, string> = { new: "Nouveau", handled: "Traité", archived: "Archivé" };

export default async function MessageDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requirePageUser();
  const { id: raw } = await params;
  const sp = await searchParams;
  const id = Number(raw);
  if (!Number.isInteger(id)) notFound();
  const [m] = await getDb().select().from(schema.contactMessages).where(eq(schema.contactMessages.id, id));
  if (!m) notFound();
  const subject = encodeURIComponent(`Re: ${m.topic || "votre message"}`);
  return (
    <>
      <PageHead
        title={`Message de ${m.name}`}
        crumbs={[{ href: "/admin/messages", label: "Demandes de contact" }]}
        actions={
          <a className="btn" href={`mailto:${m.email}?subject=${subject}`}>
            Répondre par e-mail
          </a>
        }
      />
      <Flash params={sp} map={{ maj: { tone: "ok", text: "Statut mis à jour." } }} />
      <div className="layout-editor">
        <div className="panel">
          <h2>{m.topic || "Sans objet"}</h2>
          <div className="message-body">{m.message}</div>
        </div>
        <aside className="layout-editor__side">
          <div className="panel">
            <dl className="meta">
              <dt>Nom</dt>
              <dd>{m.name}</dd>
              <dt>E-mail</dt>
              <dd>
                <a href={`mailto:${m.email}`}>{m.email}</a>
              </dd>
              <dt>Structure</dt>
              <dd>{m.organisation || "—"}</dd>
              <dt>Reçue le</dt>
              <dd>{fmtDate(m.createdAt)}</dd>
              <dt>Notification</dt>
              <dd>{m.emailSent ? "E-mail envoyé" : "Non envoyée"}</dd>
              <dt>Statut</dt>
              <dd>
                <span className={`pill pill--${m.status}`}>{LABEL[m.status]}</span>
              </dd>
            </dl>
          </div>
          <div className="panel">
            <h2>Changer le statut</h2>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {(["new", "handled", "archived"] as const)
                .filter((s) => s !== m.status)
                .map((s) => (
                  <form action={setMessageStatus} key={s}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="status" value={s} />
                    <button className="btn btn--secondary btn--small" type="submit">
                      Marquer comme {LABEL[s]!.toLowerCase()}
                    </button>
                  </form>
                ))}
            </div>
            {user.role === "admin" && (
              <div style={{ marginTop: "1rem" }}>
                <ConfirmForm action={deleteMessage} fields={{ id: m.id }} label="Supprimer définitivement" confirmText="Supprimer définitivement cette demande et les données personnelles associées ?" />
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
