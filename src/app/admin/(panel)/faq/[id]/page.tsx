import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { PageHead, Flash } from "@/components/admin/PageHead";
import { ActionForm, ConfirmForm, Field, SubmitButton, Toggle } from "@/components/admin/forms";
import { deleteFaq, saveFaq } from "@/app/admin/actions/content";

export const metadata = { title: "Question" };

export default async function EditFaq({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id: raw } = await params;
  const sp = await searchParams;
  const isNew = raw === "nouveau";
  const id = isNew ? 0 : Number(raw);
  if (!isNew && !Number.isInteger(id)) notFound();
  const db = getDb();
  const [f] = isNew ? [null] : await db.select().from(schema.faqItems).where(eq(schema.faqItems.id, id));
  if (!isNew && !f) notFound();
  const cats = [...new Set((await db.select({ c: schema.faqItems.category }).from(schema.faqItems)).map((r) => r.c))];
  return (
    <>
      <PageHead
        title={f ? "Modifier la question" : "Nouvelle question"}
        crumbs={[{ href: "/admin/faq", label: "FAQ" }]}
        actions={f && <ConfirmForm action={deleteFaq} fields={{ id: f.id }} label="Supprimer" confirmText="Supprimer définitivement cette question ?" />}
      />
      <Flash params={sp} map={{ cree: { tone: "ok", text: "Question ajoutée." } }} />
      <ActionForm action={saveFaq}>
        <input type="hidden" name="id" value={id} />
        <div className="panel" style={{ maxWidth: 820 }}>
          <Field name="question" label="Question" required maxLength={300} defaultValue={f?.question} />
          <Field name="answer" label="Réponse" required multiline tall rows={8} maxLength={10000} defaultValue={f?.answer} hint="Mise en forme : **gras**, listes avec « - », liens [texte](/contact) ou [texte](https://…)." />
          <div className="grid-2">
            <div>
              <Field name="category" label="Thème" required maxLength={80} defaultValue={f?.category ?? cats[0] ?? "Général"} hint={`Thèmes existants : ${cats.join(", ") || "aucun"}.`} />
            </div>
            <Field name="sortOrder" label="Ordre d'affichage" type="number" defaultValue={f?.sortOrder ?? 100} />
          </div>
          <Field
            name="status"
            label="Statut"
            defaultValue={f?.status ?? "draft"}
            options={[
              { value: "draft", label: "Brouillon (non visible)" },
              { value: "published", label: "Publiée" },
            ]}
          />
          <Toggle name="needsReview" label="Réponse à valider par l'association" defaultChecked={f?.needsReview} />
          <SubmitButton>{isNew ? "Ajouter la question" : "Enregistrer"}</SubmitButton>
        </div>
      </ActionForm>
    </>
  );
}
