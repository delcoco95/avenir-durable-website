import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { pickerMedia } from "@/lib/admin-data";
import { PageHead, Flash } from "@/components/admin/PageHead";
import { ActionForm, ConfirmForm, Field, SubmitButton, Toggle } from "@/components/admin/forms";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { IconChoice } from "@/components/admin/IconChoice";
import { deleteDomain, saveDomain } from "@/app/admin/actions/content";

export const metadata = { title: "Domaine d'intervention" };

export default async function EditDomain({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id: raw } = await params;
  const sp = await searchParams;
  const isNew = raw === "nouveau";
  const id = isNew ? 0 : Number(raw);
  if (!isNew && !Number.isInteger(id)) notFound();
  const [d] = isNew ? [null] : await getDb().select().from(schema.domains).where(eq(schema.domains.id, id));
  if (!isNew && !d) notFound();
  const media = await pickerMedia();
  return (
    <>
      <PageHead
        title={d ? d.title : "Nouveau domaine"}
        crumbs={[{ href: "/admin/domaines", label: "Domaines d'intervention" }]}
        actions={
          d && (
            <>
              <a className="btn btn--secondary" href={`/apercu/domaine/${d.id}`} target="_blank" rel="noopener">
                Prévisualiser
              </a>
              <ConfirmForm action={deleteDomain} fields={{ id: d.id }} label="Supprimer" confirmText={`Supprimer le domaine « ${d.title} » ? Les projets liés seront conservés.`} />
            </>
          )
        }
      />
      <Flash params={sp} map={{ cree: { tone: "ok", text: "Domaine créé." } }} />
      <ActionForm action={saveDomain}>
        <input type="hidden" name="id" value={id} />
        <div className="layout-editor">
          <div className="panel">
            <Field name="title" label="Titre" required maxLength={160} defaultValue={d?.title} />
            <Field name="summary" label="Résumé" multiline rows={3} maxLength={400} defaultValue={d?.summary} hint="Une ou deux phrases, affichées dans les listes." />
            <Field name="body" label="Présentation détaillée" multiline tall rows={14} maxLength={30000} defaultValue={d?.body} hint="Mise en forme : **gras**, *italique*, listes avec « - », liens [texte](https://…)." />
            <IconChoice name="icon" value={d?.icon ?? "leaf"} />
          </div>
          <aside className="layout-editor__side">
            <div className="panel">
              <h2>Publication</h2>
              <Field
                name="status"
                label="Statut"
                defaultValue={d?.status ?? "draft"}
                options={[
                  { value: "draft", label: "Brouillon (non visible)" },
                  { value: "published", label: "Publié" },
                ]}
              />
              <Toggle name="needsReview" label="Contenu à valider" defaultChecked={d?.needsReview} />
              <SubmitButton>{isNew ? "Créer le domaine" : "Enregistrer"}</SubmitButton>
            </div>
            <div className="panel">
              <MediaPicker name="imageId" label="Image (facultatif)" value={d?.imageId ?? null} media={media} />
              <Field name="slug" label="Adresse" maxLength={100} defaultValue={d?.slug} hint="/nos-actions/… — générée à partir du titre si vide." />
              <Field name="sortOrder" label="Ordre d'affichage" type="number" defaultValue={d?.sortOrder ?? 100} />
            </div>
          </aside>
        </div>
      </ActionForm>
    </>
  );
}
