import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { pickerMedia } from "@/lib/admin-data";
import { PageHead, Flash } from "@/components/admin/PageHead";
import { ActionForm, ConfirmForm, Field, SubmitButton, Toggle } from "@/components/admin/forms";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { deleteProject, saveProject } from "@/app/admin/actions/content";

export const metadata = { title: "Projet" };

const MD_HINT = "Mise en forme : **gras**, *italique*, listes avec « - », liens [texte](https://…), intertitres avec « ## ».";

export default async function EditProject({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id: raw } = await params;
  const sp = await searchParams;
  const isNew = raw === "nouveau";
  const id = isNew ? 0 : Number(raw);
  if (!isNew && !Number.isInteger(id)) notFound();
  const db = getDb();
  const [p] = isNew ? [null] : await db.select().from(schema.projects).where(eq(schema.projects.id, id));
  if (!isNew && !p) notFound();
  const [domains, media] = await Promise.all([db.select().from(schema.domains).orderBy(asc(schema.domains.sortOrder)), pickerMedia()]);

  return (
    <>
      <PageHead
        title={p ? p.title : "Nouveau projet"}
        crumbs={[{ href: "/admin/projets", label: "Projets" }]}
        actions={
          p && (
            <>
              <a className="btn btn--secondary" href={`/apercu/projet/${p.id}`} target="_blank" rel="noopener">
                Prévisualiser
              </a>
              {p.status === "published" && (
                <a className="btn btn--secondary" href={`/projets/${p.slug}`} target="_blank" rel="noopener">
                  Voir en ligne
                </a>
              )}
              <ConfirmForm action={deleteProject} fields={{ id: p.id }} label="Supprimer" confirmText={`Supprimer définitivement le projet « ${p.title} » ?`} />
            </>
          )
        }
      />
      <Flash params={sp} map={{ cree: { tone: "ok", text: "Projet créé." } }} />
      <ActionForm action={saveProject}>
        <input type="hidden" name="id" value={id} />
        <div className="layout-editor">
          <div>
            <div className="panel">
              <Field name="title" label="Titre" required maxLength={160} defaultValue={p?.title} />
              <Field name="summary" label="Résumé" multiline rows={3} maxLength={400} defaultValue={p?.summary} hint="Affiché sur les cartes de projet et sous le titre." />
              <Field name="body" label="Description détaillée" multiline tall rows={14} maxLength={30000} defaultValue={p?.body} hint={MD_HINT} />
            </div>
            <div className="panel">
              <h2>Informations pratiques</h2>
              <div className="grid-3">
                <Field name="location" label="Lieu" maxLength={160} defaultValue={p?.location} />
                <Field name="period" label="Période" maxLength={120} defaultValue={p?.period} placeholder="Ex. printemps 2026" />
                <Field name="audience" label="Public" maxLength={160} defaultValue={p?.audience} />
              </div>
              <p className="help">Les champs laissés vides ne sont pas affichés.</p>
            </div>
          </div>
          <aside className="layout-editor__side">
            <div className="panel">
              <h2>Publication</h2>
              <Field
                name="status"
                label="Statut"
                defaultValue={p?.status ?? "draft"}
                options={[
                  { value: "draft", label: "Brouillon (non visible)" },
                  { value: "published", label: "Publié" },
                ]}
              />
              <Toggle name="featured" label="Mettre en avant sur l'accueil" defaultChecked={p?.featured} />
              <Toggle name="isPlaceholder" label="Contenu d'exemple à valider" hint="Affiche la mention « Exemple à valider » sur le site." defaultChecked={p?.isPlaceholder} />
              <div className="form-actions">
                <SubmitButton>{isNew ? "Créer le projet" : "Enregistrer"}</SubmitButton>
              </div>
            </div>
            <div className="panel">
              <MediaPicker name="coverId" label="Image principale" value={p?.coverId ?? null} media={media} />
              <Field
                name="domainId"
                label="Domaine d'intervention"
                defaultValue={p?.domainId ? String(p.domainId) : ""}
                options={[{ value: "", label: "Aucun" }, ...domains.map((d) => ({ value: String(d.id), label: d.title }))]}
              />
              <Field name="slug" label="Adresse" maxLength={100} defaultValue={p?.slug} hint="/projets/… — générée à partir du titre si vide." />
              <Field name="seoDescription" label="Description pour les moteurs de recherche" multiline rows={3} maxLength={300} defaultValue={p?.seoDescription} hint="Vide = résumé." />
              <Field name="sortOrder" label="Ordre d'affichage" type="number" defaultValue={p?.sortOrder ?? 100} />
            </div>
          </aside>
        </div>
      </ActionForm>
    </>
  );
}
