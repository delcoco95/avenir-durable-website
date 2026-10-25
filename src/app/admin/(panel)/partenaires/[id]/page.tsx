import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { pickerMedia } from "@/lib/admin-data";
import { PageHead, Flash } from "@/components/admin/PageHead";
import { ActionForm, ConfirmForm, Field, SubmitButton, Toggle } from "@/components/admin/forms";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { deletePartner, savePartner } from "@/app/admin/actions/content";

export const metadata = { title: "Partenaire" };

export default async function EditPartner({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id: raw } = await params;
  const sp = await searchParams;
  const isNew = raw === "nouveau";
  const id = isNew ? 0 : Number(raw);
  if (!isNew && !Number.isInteger(id)) notFound();
  const [p] = isNew ? [null] : await getDb().select().from(schema.partners).where(eq(schema.partners.id, id));
  if (!isNew && !p) notFound();
  const media = await pickerMedia();
  return (
    <>
      <PageHead
        title={p ? p.name : "Nouveau partenaire"}
        crumbs={[{ href: "/admin/partenaires", label: "Partenaires" }]}
        actions={p && <ConfirmForm action={deletePartner} fields={{ id: p.id }} label="Supprimer" confirmText={`Supprimer le partenaire « ${p.name} » ?`} />}
      />
      <Flash params={sp} map={{ cree: { tone: "ok", text: "Partenaire ajouté." } }} />
      <ActionForm action={savePartner}>
        <input type="hidden" name="id" value={id} />
        <div className="panel" style={{ maxWidth: 820 }}>
          <Field name="name" label="Nom" required maxLength={160} defaultValue={p?.name} />
          <Field name="url" label="Site web" maxLength={300} defaultValue={p?.url} placeholder="https://…" />
          <Field name="description" label="Nature du partenariat" multiline rows={3} maxLength={400} defaultValue={p?.description} />
          <MediaPicker name="logoId" label="Logo" value={p?.logoId ?? null} media={media} hint="N'utilisez un logo qu'avec l'accord du partenaire." />
          <div className="grid-2">
            <Field
              name="status"
              label="Statut"
              defaultValue={p?.status ?? "draft"}
              options={[
                { value: "draft", label: "Brouillon (non visible)" },
                { value: "published", label: "Publié" },
              ]}
            />
            <Field name="sortOrder" label="Ordre d'affichage" type="number" defaultValue={p?.sortOrder ?? 100} />
          </div>
          <Toggle name="verified" label="Partenariat confirmé par l'association" hint="Obligatoire pour l'affichage public : aucun partenariat non vérifié n'est montré." defaultChecked={p?.verified} />
          <SubmitButton>{isNew ? "Ajouter le partenaire" : "Enregistrer"}</SubmitButton>
        </div>
      </ActionForm>
    </>
  );
}
