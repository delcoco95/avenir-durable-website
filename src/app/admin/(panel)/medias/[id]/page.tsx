import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { mediaUrl } from "@/lib/content";
import { PageHead, Flash, fmtDate } from "@/components/admin/PageHead";
import { ActionForm, ConfirmForm, Field, SubmitButton } from "@/components/admin/forms";
import { MediaReplace } from "@/components/admin/MediaUpload";
import { deleteMedia, mediaUsages, updateMedia } from "@/app/admin/actions/media";

export const metadata = { title: "Image" };

export default async function MediaDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id: raw } = await params;
  const sp = await searchParams;
  const id = Number(raw);
  if (!Number.isInteger(id)) notFound();
  const [m] = await getDb().select().from(schema.media).where(eq(schema.media.id, id));
  if (!m) notFound();
  const usages = await mediaUsages(id);
  return (
    <>
      <PageHead title={m.title || m.originalName} crumbs={[{ href: "/admin/medias", label: "Médiathèque" }]} />
      <Flash params={sp} map={{ erreur: { tone: "error", text: "Cette image est encore utilisée : retirez-la des contenus listés avant de la supprimer." } }} />
      <div className="layout-editor">
        <div>
          <div className="panel">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="media-preview-large" src={mediaUrl(m, "md")} alt={m.alt} />
          </div>
          <ActionForm action={updateMedia}>
            <input type="hidden" name="id" value={m.id} />
            <div className="panel">
              <Field
                name="alt"
                label="Texte alternatif"
                multiline
                rows={2}
                maxLength={300}
                defaultValue={m.alt}
                hint="Décrivez ce que montre l'image, comme à quelqu'un qui ne la voit pas. Laissez vide uniquement pour une image purement décorative."
              />
              <Field name="title" label="Titre (interne)" maxLength={200} defaultValue={m.title} />
              <Field name="credit" label="Crédit photo" maxLength={200} defaultValue={m.credit} hint="Affiché sous l'image lorsque c'est pertinent." />
              <Field name="description" label="Description / notes (interne)" multiline rows={3} maxLength={2000} defaultValue={m.description} hint="Ex. : droits d'utilisation, contexte, date." />
              <SubmitButton>Enregistrer</SubmitButton>
            </div>
          </ActionForm>
        </div>
        <aside className="layout-editor__side">
          <div className="panel">
            <h2>Fichier</h2>
            <dl className="meta">
              <dt>Nom d'origine</dt>
              <dd>{m.originalName}</dd>
              <dt>Dimensions</dt>
              <dd>
                {m.width} × {m.height} px
              </dd>
              <dt>Poids</dt>
              <dd>{(m.size / 1024).toFixed(0)} Ko (WebP)</dd>
              <dt>Ajoutée le</dt>
              <dd>{fmtDate(m.createdAt)}</dd>
            </dl>
            <div style={{ marginTop: "1rem" }}>
              <MediaReplace id={m.id} />
            </div>
          </div>
          <div className="panel">
            <h2>Utilisations</h2>
            {usages.length ? (
              <ul style={{ paddingLeft: "1.1rem", margin: "0 0 1rem" }}>
                {usages.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            ) : (
              <p className="help" style={{ margin: "0 0 1rem" }}>
                Cette image n'est utilisée nulle part : elle peut être supprimée.
              </p>
            )}
            {usages.length === 0 ? (
              <ConfirmForm action={deleteMedia} fields={{ id: m.id }} label="Supprimer l'image" confirmText="Supprimer définitivement cette image ?" />
            ) : (
              <button className="btn btn--danger" type="button" disabled title="Image utilisée">
                Suppression impossible (image utilisée)
              </button>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
